/**
 * Audit stored published courses against the same exporter and gate as publication.
 * Run from backend with Bun. No application modules, telemetry, or implicit DB URL.
 */
import 'reflect-metadata';
import { createHash } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import { load } from 'js-yaml';
import { QUALITY_CHECK_METADATA, runQualityGate, type QualityGateResult } from '@graspful/shared';
import { CourseYamlExportService } from '../src/knowledge-graph/course-yaml-export.service';
import type { PrismaService } from '../src/prisma/prisma.service';

export const USAGE = `Usage (from backend):
  bun scripts/audit-published-courses.ts \\
    --database-url-env <EXPLICIT_ENV_NAME> \\
    --expect-target '<user>@<host>:<port>/<database>?schema=<schema>' \\
    [--org-id <uuid>] [--apply --confirm-report <sha256>]

Dry-run is the default. The selected environment variable must contain a PostgreSQL
URL. Neither DATABASE_URL nor a production target is selected automatically.
A dry-run report includes the confirmation hash needed for --apply. Apply reruns
the full audit and requires the same target, course revisions, content, and findings.
Only failed, currently published courses are changed to drafts. Course content,
learner progress, and passing courses are preserved. JSON is written to stdout.
Exit codes: 0 = clean dry-run or confirmed apply; 2 = dry-run found failures;
1 = invalid arguments, audit errors, stale confirmation, or unconfirmed completion.
`;

class CommandError extends Error {}

export interface AuditOptions {
  databaseUrl: string;
  target: string;
  database: string;
  schema: string;
  apply: boolean;
  confirmReport?: string;
  orgId?: string;
}

function safeTarget(databaseUrl: string): { target: string; database: string; schema: string } {
  let url: URL;
  try { url = new URL(databaseUrl); } catch { throw new CommandError('The selected database URL is invalid.'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.username) {
    throw new CommandError('Supply a PostgreSQL URL with an explicit host, user, and database.');
  }
  let database: string;
  let username: string;
  try {
    database = decodeURIComponent(url.pathname.slice(1));
    username = decodeURIComponent(url.username);
  } catch { throw new CommandError('The selected database URL has invalid escaping.'); }
  if (!database || database.includes('/') || url.hash) {
    throw new CommandError('Supply one explicit database name and no URL fragment.');
  }
  // Reject alternate connection targets hidden in query parameters.
  const allowedParams = new Set([
    'schema', 'sslmode', 'sslaccept', 'connection_limit', 'connect_timeout',
    'pool_timeout', 'pgbouncer', 'statement_cache_size', 'socket_timeout', 'application_name',
  ]);
  const seen = new Set<string>();
  for (const key of url.searchParams.keys()) {
    if (!allowedParams.has(key) || seen.has(key)) {
      throw new CommandError('The database URL has an unsupported or repeated query parameter. Use an explicit PostgreSQL connection URL.');
    }
    seen.add(key);
  }
  const schema = url.searchParams.get('schema') || 'public';
  return {
    target: `${encodeURIComponent(username)}@${url.hostname}:${url.port || '5432'}/${encodeURIComponent(database)}?schema=${encodeURIComponent(schema)}`,
    database,
    schema,
  };
}

export function parseAuditOptions(args: string[], env: NodeJS.ProcessEnv): AuditOptions {
  const values: Record<string, string> = {};
  let apply = false;
  const supported = new Set(['--database-url-env', '--expect-target', '--org-id', '--confirm-report']);
  for (let index = 0; index < args.length; index++) {
    const key = args[index];
    if (key === '--apply') {
      if (apply) throw new CommandError('Duplicate --apply argument.');
      apply = true;
      continue;
    }
    if (!supported.has(key) || key in values) throw new CommandError('Unknown or duplicate argument. Use --help for the supported options.');
    const value = args[++index];
    if (!value || value.startsWith('--')) throw new CommandError(`Missing value for ${key}.`);
    values[key] = value;
  }
  const envName = values['--database-url-env'];
  if (!envName || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(envName) || !values['--expect-target']) {
    throw new CommandError('Both --database-url-env and --expect-target are required.');
  }
  const databaseUrl = env[envName];
  if (!databaseUrl) throw new CommandError('The explicitly selected database environment variable is empty.');
  const identity = safeTarget(databaseUrl);
  if (identity.target !== values['--expect-target']) {
    throw new CommandError('Database target does not match --expect-target. Check the user, host, port, database, and schema.');
  }
  const orgId = values['--org-id'];
  if (orgId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orgId)) {
    throw new CommandError('--org-id must be a UUID.');
  }
  const confirmReport = values['--confirm-report'];
  if (apply && !/^[0-9a-f]{64}$/.test(confirmReport || '')) {
    throw new CommandError('--apply requires --confirm-report with the SHA-256 value from the reviewed dry-run.');
  }
  if (!apply && confirmReport) throw new CommandError('--confirm-report is only accepted with --apply.');
  return { databaseUrl, ...identity, apply, confirmReport, orgId };
}

interface CourseAudit {
  courseId: string;
  orgId: string;
  slug: string;
  name: string;
  updatedAt: string;
  updatedAtExact: string;
  exportSha256?: string;
  status: 'passed' | 'failed' | 'error';
  proposedAction: 'keep_published' | 'set_draft' | 'inspect_error';
  review?: QualityGateResult;
  error?: string;
}

export interface AuditReport {
  mode: 'dry-run' | 'apply';
  target: string;
  orgId: string | null;
  generatedAt: string;
  reportSha256: string;
  summary: { scanned: number; passed: number; failed: number; errors: number; unpublished: number };
  courses: CourseAudit[];
  outcome: 'clean' | 'failures_found' | 'applied' | 'blocked';
  reason?: string;
}

const sha256 = (text: string): string => createHash('sha256').update(text).digest('hex');

export async function auditPublishedCourses(prisma: PrismaClient, options: AuditOptions): Promise<AuditReport> {
  // One consistent snapshot for exports and findings. Apply is all-or-nothing.
  // This also prevents a late conflict from leaving a partially changed catalog.
  return prisma.$transaction(async (tx) => {
    if (!options.apply) await tx.$executeRaw`SET TRANSACTION READ ONLY`;
    const identity = await tx.$queryRaw<Array<{ database: string; schema: string | null }>>`
      SELECT current_database() AS database, current_schema() AS schema
    `;
    if (identity[0]?.database !== options.database) throw new CommandError('Connected database identity did not match the expected database.');
    if (identity[0]?.schema !== options.schema) throw new CommandError('Connected schema did not match the expected schema.');

    // PostgreSQL stores microseconds, while Prisma Date values retain only
    // milliseconds. Keep the exact database revision in the confirmation hash
    // and the conditional update; the shorter timestamp is display-only.
    const candidates = await tx.$queryRaw<Array<{
      id: string; orgId: string; slug: string; name: string; updatedAtExact: string;
    }>>`
      SELECT id, org_id AS "orgId", slug, name,
        to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "updatedAtExact"
      FROM courses
      WHERE is_published = true AND archived_at IS NULL
        ${options.orgId ? Prisma.sql`AND org_id = ${options.orgId}::uuid` : Prisma.empty}
      ORDER BY id ASC
    `;
    // The canonical service uses query methods only. Bind it to this transaction
    // rather than starting AppModule or opening a second database connection.
    const exporter = new CourseYamlExportService(tx as unknown as PrismaService);
    const courses: CourseAudit[] = [];
    for (const course of candidates) {
      const entry: CourseAudit = {
        courseId: course.id, orgId: course.orgId, slug: course.slug,
        name: course.name, updatedAt: new Date(course.updatedAtExact).toISOString(),
        updatedAtExact: course.updatedAtExact,
        status: 'error', proposedAction: 'inspect_error',
      };
      try {
        const exported = await exporter.exportCourse(course.orgId, course.id);
        entry.exportSha256 = sha256(exported);
        entry.review = runQualityGate(load(exported));
        entry.status = entry.review.passed ? 'passed' : 'failed';
        entry.proposedAction = entry.review.passed ? 'keep_published' : 'set_draft';
      } catch {
        // Connection errors can contain credentials. Never serialize raw errors.
        entry.error = 'The stored course could not be exported or reviewed. Inspect it before applying changes.';
      }
      courses.push(entry);
    }
    const summary = {
      scanned: courses.length,
      passed: courses.filter((course) => course.status === 'passed').length,
      failed: courses.filter((course) => course.status === 'failed').length,
      errors: courses.filter((course) => course.status === 'error').length,
      unpublished: 0,
    };
    const report: AuditReport = {
      mode: options.apply ? 'apply' : 'dry-run', target: options.target,
      orgId: options.orgId ?? null, generatedAt: new Date().toISOString(),
      // Exclude generatedAt and mode so an unchanged audit has the same hash.
      reportSha256: sha256(JSON.stringify({ target: options.target, orgId: options.orgId ?? null, checks: QUALITY_CHECK_METADATA, courses })),
      summary, courses,
      outcome: summary.errors ? 'blocked' : summary.failed ? 'failures_found' : 'clean',
    };
    if (summary.errors) {
      report.reason = 'At least one course could not be audited. No changes were applied.';
      return report;
    }
    if (!options.apply) return report;
    if (options.confirmReport !== report.reportSha256) {
      report.outcome = 'blocked';
      report.reason = 'The audit differs from the confirmed report. Review this new dry-run result before applying.';
      return report;
    }

    for (const course of courses.filter((entry) => entry.status === 'failed')) {
      const updated = await tx.$executeRaw`
        UPDATE courses
        SET is_published = false, updated_at = date_trunc('milliseconds', clock_timestamp())
        WHERE id = ${course.courseId}::uuid AND org_id = ${course.orgId}::uuid
          AND archived_at IS NULL AND is_published = true
          AND updated_at = ${course.updatedAtExact}::timestamptz
      `;
      if (updated !== 1) {
        throw new CommandError('A course changed during the audit. The apply transaction was rolled back. Run a new dry-run.');
      }
      summary.unpublished += updated;
    }
    report.outcome = 'applied';
    return report;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10_000, timeout: 120_000 });
}

export function reportExitCode(report: AuditReport): number {
  return report.outcome === 'blocked' ? 1 : report.outcome === 'failures_found' ? 2 : 0;
}

async function main(): Promise<void> {
  if (process.argv.slice(2).length === 1 && process.argv[2] === '--help') {
    console.log(USAGE);
    return;
  }
  const options = parseAuditOptions(process.argv.slice(2), process.env);
  const prisma = new PrismaClient({ datasources: { db: { url: options.databaseUrl } }, log: [] });
  try {
    const report = await auditPublishedCourses(prisma, options);
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = reportExitCode(report);
  } finally {
    await prisma.$disconnect();
  }
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    const message = error instanceof CommandError
      ? error.message
      : 'The database audit did not confirm completion. Inspect the database with a fresh dry-run before retrying. Raw connection errors are omitted to protect credentials.';
    console.error(JSON.stringify({ outcome: 'error', message }));
    process.exitCode = 1;
  });
}
