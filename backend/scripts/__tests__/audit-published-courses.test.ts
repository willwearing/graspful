import { describe, expect, test } from 'bun:test';
import type { PrismaClient } from '@prisma/client';
import { auditPublishedCourses, parseAuditOptions, reportExitCode } from '../audit-published-courses';

const target = 'postgres@127.0.0.1:54322/testdb?schema=public';
const env = { AUDIT_TEST_URL: 'postgresql://postgres:private-password@127.0.0.1:54322/testdb' };
const args = ['--database-url-env', 'AUDIT_TEST_URL', '--expect-target', target];
const options = () => parseAuditOptions(args, env);

function course(id: string) {
  return { id, orgId: '10000000-0000-4000-8000-000000000000', slug: `course-${id}`, name: `SQL course ${id}`,
    isPublished: true, archivedAt: null as Date | null, updatedAt: new Date('2026-09-08T00:00:00Z'),
    description: 'Learn SQL column selection.', estimatedHours: 1, version: '1.0' };
}
function concepts(courseId: string) {
  return [{ id: `${courseId}-concept`, slug: 'select-columns', name: 'Select columns', difficulty: 1,
    estimatedMinutes: 10, tags: ['sql'], sourceReference: null, sectionId: null,
    knowledgePoints: [{ id: `${courseId}-kp`, slug: 'select-clause',
      instructionText: 'SELECT chooses the columns returned by a SQL query. WHERE filters rows.',
      workedExampleText: 'SELECT name FROM users returns the name column from the users table.',
      instructionContent: null, workedExampleContent: null,
      problems: [
        { authoredId: 'select-p1', type: 'multiple_choice', questionText: 'Which SQL clause chooses the columns returned?', options: ['SELECT', 'WHERE', 'FROM'], correctAnswer: courseId === 'invalid' ? 999 : 0, explanation: 'SELECT chooses the columns.', difficulty: 1 },
        { authoredId: 'select-p2', type: 'true_false', questionText: 'SELECT names the output columns in a SQL query.', options: null, correctAnswer: 'true', explanation: 'SELECT determines the columns in the output.', difficulty: 2 },
        { authoredId: 'select-p3', type: 'fill_blank', questionText: 'Complete the SQL query to return the name column: ___ name FROM users.', options: null, correctAnswer: 'SELECT', explanation: 'SELECT chooses the name column.', difficulty: 2 },
      ] }],
  }];
}
function fakeDatabase(settings: { failExport?: string; conflict?: string } = {}) {
  const rows = [course('good'), course('empty'), course('invalid')];
  const writes: any[] = [];
  const readOnly: string[] = [];
  const tx = {
    $executeRaw: async () => { readOnly.push('READ ONLY'); return 0; },
    $queryRaw: async () => [{ database: 'testdb' }],
    course: {
      findMany: async ({ where }: any) => rows.filter((row) => row.isPublished && row.archivedAt === null && (!where.orgId || where.orgId === row.orgId)).sort((a, b) => a.id.localeCompare(b.id)),
      findFirst: async ({ where }: any) => {
        if (settings.failExport === where.id) throw new Error(`postgresql://postgres:private-password@127.0.0.1/testdb failed`);
        return rows.find((row) => row.id === where.id && row.orgId === where.orgId && row.archivedAt === null);
      },
      updateMany: async ({ where, data }: any) => {
        writes.push({ where, data });
        const row = rows.find((row) => row.id === where.id && row.orgId === where.orgId && row.isPublished && row.archivedAt === null && row.updatedAt.getTime() === where.updatedAt.getTime());
        if (!row || settings.conflict === where.id) return { count: 0 };
        row.isPublished = data.isPublished;
        return { count: 1 };
      },
    },
    courseSection: { findMany: async () => [] },
    concept: { findMany: async ({ where }: any) => where.AND[0].courseId === 'empty' ? [] : concepts(where.AND[0].courseId) },
    prerequisiteEdge: { findMany: async () => [] },
    encompassingEdge: { findMany: async () => [] },
  };
  const client = { $transaction: async (fn: (client: typeof tx) => Promise<unknown>, config: unknown) => {
    expect(config).toMatchObject({ isolationLevel: 'Serializable' });
    const published = rows.map((row) => row.isPublished);
    try { return await fn(tx); } catch (error) {
      rows.forEach((row, index) => { row.isPublished = published[index]; });
      throw error;
    }
  } } as unknown as PrismaClient;
  return { client, rows, writes, readOnly };
}

describe('prelaunch argument safety', () => {
  test('requires an explicit environment name and exact credential-free target', () => {
    expect(() => parseAuditOptions([], { DATABASE_URL: env.AUDIT_TEST_URL })).toThrow('Both');
    expect(() => parseAuditOptions([...args.slice(0, 3), 'wrong'], env)).toThrow('does not match');
    expect(options().apply).toBe(false);
    expect(options().target).not.toContain('private-password');
  });
  test('rejects ambiguous and unknown arguments before connecting', () => {
    expect(() => parseAuditOptions([...args, '--apply'], env)).toThrow('requires --confirm-report');
    expect(() => parseAuditOptions([...args, '--publish'], env)).toThrow('Unknown');
    expect(() => parseAuditOptions([...args, '--org-id', 'no'], env)).toThrow('UUID');
    expect(() => parseAuditOptions(args, { AUDIT_TEST_URL: `${env.AUDIT_TEST_URL}?host=elsewhere` })).toThrow('unsupported');
    expect(() => parseAuditOptions(args, { AUDIT_TEST_URL: `${env.AUDIT_TEST_URL}?schema=public&schema=other` })).toThrow('repeated');
  });
  test('keeps a shared-host project identity in the target', () => {
    const shared = 'postgresql://postgres.project-a:hidden@pool.example.com:6543/postgres';
    expect(() => parseAuditOptions(['--database-url-env', 'URL', '--expect-target', 'postgres.project-b@pool.example.com:6543/postgres?schema=public'], { URL: shared })).toThrow('does not match');
  });
});

describe('published course cleanup', () => {
  test('dry-run uses the real exporter and gate and performs no writes', async () => {
    const db = fakeDatabase();
    const report = await auditPublishedCourses(db.client, options());
    expect(report.summary).toEqual({ scanned: 3, passed: 1, failed: 2, errors: 0, unpublished: 0 });
    expect(report.courses.find((row) => row.courseId === 'empty')?.review?.failures.some((failure) => failure.check === 'publication_readiness')).toBe(true);
    expect(report.courses.find((row) => row.courseId === 'invalid')?.review?.failures[0].check).toBe('yaml_parses');
    expect(db.writes).toEqual([]);
    expect(db.readOnly).toEqual(['READ ONLY']);
    expect(reportExitCode(report)).toBe(2);
    expect(JSON.stringify(report)).not.toContain('private-password');
  });
  test('confirmed apply drafts only failures and is safe to rerun', async () => {
    const db = fakeDatabase();
    const before = await auditPublishedCourses(db.client, options());
    const report = await auditPublishedCourses(db.client, { ...options(), apply: true, confirmReport: before.reportSha256 });
    expect(report.summary.unpublished).toBe(2);
    expect(report.outcome).toBe('applied');
    expect(db.rows.find((row) => row.id === 'good')?.isPublished).toBe(true);
    for (const write of db.writes) {
      expect(write.data).toEqual({ isPublished: false });
      expect(write.where).toMatchObject({ isPublished: true, archivedAt: null, updatedAt: new Date('2026-09-08T00:00:00Z') });
    }
    const after = await auditPublishedCourses(db.client, options());
    expect(after.summary).toEqual({ scanned: 1, passed: 1, failed: 0, errors: 0, unpublished: 0 });
    expect(reportExitCode(after)).toBe(0);
  });
  test('revision changes invalidate the confirmed report without writes', async () => {
    const db = fakeDatabase();
    const before = await auditPublishedCourses(db.client, options());
    db.rows[0].updatedAt = new Date('2026-09-08T01:00:00Z');
    const report = await auditPublishedCourses(db.client, { ...options(), apply: true, confirmReport: before.reportSha256 });
    expect(report.outcome).toBe('blocked');
    expect(reportExitCode(report)).toBe(1);
    expect(db.writes).toEqual([]);
  });
  test('export errors block all changes and do not expose credentials', async () => {
    const db = fakeDatabase({ failExport: 'good' });
    const report = await auditPublishedCourses(db.client, { ...options(), apply: true, confirmReport: '0'.repeat(64) });
    expect(report.summary.errors).toBe(1);
    expect(report.outcome).toBe('blocked');
    expect(JSON.stringify(report)).not.toContain('private-password');
    expect(db.writes).toEqual([]);
  });
  test('a conditional update conflict rolls back earlier changes', async () => {
    const db = fakeDatabase({ conflict: 'invalid' });
    const before = await auditPublishedCourses(db.client, options());
    await expect(auditPublishedCourses(db.client, { ...options(), apply: true, confirmReport: before.reportSha256 })).rejects.toThrow('rolled back');
    expect(db.rows.every((row) => row.isPublished)).toBe(true);
  });
  test('archived courses and existing drafts are excluded', async () => {
    const db = fakeDatabase();
    db.rows.find((row) => row.id === 'empty')!.archivedAt = new Date();
    db.rows.find((row) => row.id === 'invalid')!.isPublished = false;
    const report = await auditPublishedCourses(db.client, options());
    expect(report.summary.scanned).toBe(1);
    expect(report.summary.failed).toBe(0);
    expect(db.writes).toEqual([]);
  });
});
