import { randomUUID } from 'node:crypto';
import { PrismaService } from '@/prisma/prisma.service';
import { EnrollmentService } from '../enrollment.service';
import { StudentStateService } from '../student-state.service';
import { MemoryDecayService } from '@/spaced-repetition/memory-decay.service';
import { FireUpdateService } from '@/spaced-repetition/fire-update.service';
import { EncompassingQueryService } from '@/knowledge-graph/encompassing-query.service';
import { calculateNextInterval } from '@/spaced-repetition/fire-equations';

const enabled = process.env.RUN_STUDENT_STATE_DB_TESTS === '1';
if (enabled && (!process.env.DATABASE_URL ||
  !['localhost', '127.0.0.1', '[::1]'].includes(new URL(process.env.DATABASE_URL).hostname))) {
  throw new Error('Student state database tests require a local DATABASE_URL');
}

(enabled ? describe : describe.skip)('bulk learner state persistence', () => {
  const prisma = new PrismaService();
  const studentState = new StudentStateService(prisma, new EnrollmentService(prisma));
  const decay = new MemoryDecayService(new EnrollmentService(prisma), studentState);
  const fire = new FireUpdateService(prisma, studentState, new EncompassingQueryService(prisma));
  const orgId = randomUUID();
  const userId = randomUUID();
  const otherUserId = randomUUID();
  const academyId = randomUUID();
  const outsideAcademyId = randomUUID();
  const courseIds = [randomUUID(), randomUUID(), randomUUID()];
  const practicedId = randomUUID();
  const outsideConceptId = randomUUID();
  const conceptIds = Array.from({ length: 1001 }, () => randomUUID());
  const practicedAt = new Date('2026-03-03T12:00:00Z');
  const now = new Date('2026-03-10T12:00:00Z');
  let recordWrites = false;
  let rawWrites = 0;
  let pending = Promise.resolve();
  let failRawWrite = 0;

  beforeAll(async () => {
    await prisma.$connect();
    prisma.$use(async (params, next) => {
      if (!recordWrites || params.action !== 'executeRaw') return next(params);
      const position = ++rawWrites;
      const previous = pending;
      let release!: () => void;
      pending = new Promise<void>((resolve) => { release = resolve; });
      await previous;
      try {
        await new Promise((resolve) => setTimeout(resolve, 50));
        if (failRawWrite === position) throw new Error('Later batch failed');
        return await next(params);
      } finally {
        release();
      }
    });
    await prisma.user.createMany({ data: [userId, otherUserId].map((id) => ({ id, email: `bulk-state-${id}@example.test` })) });
    await prisma.organization.create({ data: { id: orgId, slug: `bulk-state-${orgId}`, name: 'Bulk state regression', niche: 'education' } });
    await prisma.academy.createMany({ data: [academyId, outsideAcademyId].map((id) => ({ id, orgId, slug: id, name: 'State regression' })) });
    await prisma.course.createMany({ data: courseIds.map((id, index) => ({ id, orgId, academyId: index === 2 ? outsideAcademyId : academyId, slug: id, name: 'Regression course', isPublished: true })) });
    await prisma.concept.createMany({ data: [
      ...conceptIds.map((id, index) => ({ id, orgId, courseId: courseIds[index % 2], slug: id, name: 'Related concept' })),
      { id: practicedId, orgId, courseId: courseIds[0], slug: practicedId, name: 'Practiced concept' },
      { id: outsideConceptId, orgId, courseId: courseIds[2], slug: outsideConceptId, name: 'Other academy concept' },
    ] });
    await prisma.encompassingEdge.createMany({ data: conceptIds.map((sourceConceptId) => ({ sourceConceptId, targetConceptId: practicedId, weight: 0.5 })) });
    await prisma.studentConceptState.createMany({ data: [
      ...[...conceptIds, practicedId, outsideConceptId].map((conceptId) => ({ userId, conceptId, repNum: 1, memory: 0.8, interval: 7, speed: 1, masteryState: 'mastered' as const, lastPracticedAt: practicedAt })),
      { userId: otherUserId, conceptId: conceptIds[0], memory: 0.77 },
    ] });
  });

  beforeEach(async () => {
    recordWrites = false;
    await pending;
    rawWrites = 0;
    failRawWrite = 0;
    await prisma.studentConceptState.updateMany({ where: { userId }, data: { memory: 0.8, repNum: 1, interval: 7, speed: 1, masteryState: 'mastered', lastPracticedAt: practicedAt } });
  });

  afterEach(() => {
    recordWrites = false;
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    recordWrites = false;
    await pending;
    await prisma.organization.deleteMany({ where: { id: orgId } });
    await prisma.user.deleteMany({ where: { id: { in: [userId, otherUserId] } } });
    await prisma.$disconnect();
  });

  const state = (conceptId: string, learnerId = userId) => prisma.studentConceptState.findUniqueOrThrow({
    where: { userId_conceptId: { userId: learnerId, conceptId } },
  });

  it.each([1, 140, 1000])('persists %i repetition updates in one round trip with query latency', async (size) => {
    recordWrites = true;
    await prisma.$transaction((tx) => studentState.applyRepetitionUpdates(userId,
      conceptIds.slice(0, size).map((conceptId) => ({ conceptId, memory: 0.6, repNum: 2.5, interval: 7 })), tx));
    expect(rawWrites).toBe(1);
    expect(await prisma.studentConceptState.count({ where: { userId, memory: 0.6 } })).toBe(size);
    expect(await state(conceptIds[size - 1])).toMatchObject({ memory: 0.6, repNum: 2.5, interval: 7, lastPracticedAt: practicedAt });
    expect(await state(conceptIds[0], otherUserId)).toMatchObject({ memory: 0.77 });
  });

  it('decays only eligible academy concepts in bounded batches', async () => {
    recordWrites = true;
    await decay.decayAllMemory(userId, academyId, now);
    expect(rawWrites).toBe(2);
    expect(await prisma.studentConceptState.count({ where: { userId, memory: 0.4 } })).toBe(1002);
    expect(await state(outsideConceptId)).toMatchObject({ memory: 0.8 });
    expect(await state(conceptIds[0], otherUserId)).toMatchObject({ memory: 0.77 });
  });

  it('rolls back earlier decay batches when a later write fails', async () => {
    recordWrites = true;
    failRawWrite = 2;
    await expect(decay.decayAllMemory(userId, academyId, now)).rejects.toThrow('Later batch failed');
    expect(await prisma.studentConceptState.count({ where: { userId, memory: 0.8 } })).toBe(1003);
  });

  it('preserves newer practice and mastery changes during decay', async () => {
    const originalWrite = studentState.batchDecayMemory.bind(studentState);
    jest.spyOn(studentState, 'batchDecayMemory').mockImplementationOnce(async (learnerId, updates) => {
      await prisma.studentConceptState.update({ where: { userId_conceptId: { userId, conceptId: conceptIds[0] } }, data: { memory: 0.95, repNum: 4, interval: 30, lastPracticedAt: now } });
      // A change to only memory must also invalidate the old snapshot.
      await prisma.studentConceptState.update({ where: { userId_conceptId: { userId, conceptId: conceptIds[1] } }, data: { memory: 0.9 } });
      await prisma.studentConceptState.update({ where: { userId_conceptId: { userId, conceptId: conceptIds[2] } }, data: { masteryState: 'unstarted' } });
      await originalWrite(learnerId, updates);
    });
    await decay.decayAllMemory(userId, academyId, now);
    expect(await state(conceptIds[0])).toMatchObject({ memory: 0.95, repNum: 4, interval: 30, lastPracticedAt: now });
    expect(await state(conceptIds[1])).toMatchObject({ memory: 0.9 });
    expect(await state(conceptIds[2])).toMatchObject({ memory: 0.8, masteryState: 'unstarted' });
    expect(await state(conceptIds[3])).toMatchObject({ memory: 0.4 });
  });

  it('keeps direct practice and cross-course propagated credit atomic and bounded', async () => {
    recordWrites = true;
    await fire.updateAfterReview(userId, practicedId, true, 1, academyId);
    expect(rawWrites).toBe(2);
    expect((await state(practicedId)).repNum).toBeCloseTo(1.2);
    for (const conceptId of [conceptIds[0], conceptIds[1], conceptIds[1000]]) {
      const row = await state(conceptId);
      expect(row.repNum).toBeCloseTo(1.1);
      expect(row.memory).toBeCloseTo(0.9);
      expect(row.interval).toBe(calculateNextInterval(1.1));
      expect(row.lastPracticedAt).toEqual(practicedAt);
    }
    expect(await state(outsideConceptId)).toMatchObject({ repNum: 1, memory: 0.8 });
    expect(await state(conceptIds[0], otherUserId)).toMatchObject({ memory: 0.77 });
  });

  it('rolls back direct practice and earlier batches when a later batch fails', async () => {
    recordWrites = true;
    failRawWrite = 2;
    await expect(fire.updateAfterReview(userId, practicedId, true, 1, academyId)).rejects.toThrow('Later batch failed');
    expect(await state(practicedId)).toMatchObject({ memory: 0.8, repNum: 1, lastPracticedAt: practicedAt });
    expect(await state(conceptIds[0])).toMatchObject({ memory: 0.8, repNum: 1 });
    expect(await state(conceptIds[1000])).toMatchObject({ memory: 0.8, repNum: 1 });
  });

  it('rolls back earlier batches when a required learner record is missing', async () => {
    const updates = [...conceptIds.slice(0, 1000), randomUUID()].map((conceptId) => ({ conceptId, memory: 0.3, repNum: 5, interval: 60 }));
    await expect(prisma.$transaction((tx) => studentState.applyRepetitionUpdates(userId, updates, tx)))
      .rejects.toThrow('Repetition learner state is no longer available');
    expect(await state(conceptIds[0])).toMatchObject({ memory: 0.8, repNum: 1 });
  });

  it('rolls back standalone diagnostic batches when a required learner state is missing', async () => {
    const updates = [...conceptIds.slice(0, 1000), randomUUID()].map((conceptId) => ({
      conceptId, diagnosticState: 'unknown' as const, pL: 0.1, speed: 2,
    }));
    await expect(studentState.updateDiagnosticStates(userId, updates, 1.5, 250))
      .rejects.toThrow('Diagnostic learner state is no longer available');
    expect(await state(conceptIds[0])).toMatchObject({ memory: 0.8, speed: 1, speedRD: 350 });
  });

  it('retries concurrent credit from fresh learner state without losing either update', async () => {
    const outcomes = await Promise.allSettled([
      fire.propagateImplicitRepetition(userId, practicedId, 0.2, academyId),
      fire.propagateImplicitRepetition(userId, practicedId, 0.2, academyId),
    ]);
    expect(outcomes.map((outcome) => outcome.status)).toEqual(['fulfilled', 'fulfilled']);
    for (const conceptId of [conceptIds[0], conceptIds[1000]]) {
      const row = await state(conceptId);
      expect(row.repNum).toBeCloseTo(1.2);
      expect(row.memory).toBeCloseTo(1);
    }
  });
});
