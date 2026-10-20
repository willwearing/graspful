import { randomUUID } from 'node:crypto';
import { PrismaService } from '@/prisma/prisma.service';
import { EnrollmentService } from '@/student-model/enrollment.service';
import { StudentStateService } from '@/student-model/student-state.service';
import { getDiagnosticResult, startDiagnosticSession, submitDiagnosticAnswer } from './diagnostic-session.workflow';
import { persistDiagnosticSnapshots } from './diagnostic-snapshot.persistence';

// Opt in only against a disposable local database. Never use application .env files.
const enabled = process.env.RUN_DIAGNOSTIC_DB_TESTS === '1';
if (enabled && (!process.env.DATABASE_URL ||
  !['localhost', '127.0.0.1', '[::1]'].includes(new URL(process.env.DATABASE_URL).hostname))) {
  throw new Error('Diagnostic database tests require a local DATABASE_URL');
}

(enabled ? describe : describe.skip)('large academy diagnostic persistence', () => {
  const prisma = new PrismaService();
  const enrollment = new EnrollmentService(prisma);
  const studentState = new StudentStateService(prisma, enrollment);
  const orgId = randomUUID();
  const userId = randomUUID();
  const otherUserId = randomUUID();
  const academyId = randomUUID();
  const courseId = randomUUID();
  const conceptIds = Array.from({ length: 140 }, () => randomUUID());
  let simulateLatency = false;
  let writeCount = 0;
  let pendingWrite = Promise.resolve();
  let failEnrollmentWrite = false;

  beforeAll(async () => {
    await prisma.$connect();
    // An interactive transaction has one connection. Serialize a 50ms round trip
    // per write to expose the production failure that fast local databases hide.
    prisma.$use(async (params, next) => {
      if (failEnrollmentWrite && params.model === 'AcademyEnrollment' && params.action === 'update') {
        throw new Error('Enrollment write failed');
      }
      if (!simulateLatency || !['upsert', 'update', 'updateMany', 'create', 'executeRaw'].includes(params.action)) {
        return next(params);
      }
      writeCount += 1;
      const previous = pendingWrite;
      let release!: () => void;
      pendingWrite = new Promise<void>((resolve) => { release = resolve; });
      await previous;
      try {
        await new Promise((resolve) => setTimeout(resolve, 50));
        release();
        return await next(params);
      } finally {
        release();
      }
    });
    await prisma.user.create({ data: { id: userId, email: `diagnostic-${userId}@example.test` } });
    await prisma.user.create({ data: { id: otherUserId, email: `diagnostic-${otherUserId}@example.test` } });
    await prisma.organization.create({ data: { id: orgId, slug: `diagnostic-${orgId}`, name: 'Diagnostic regression', niche: 'education' } });
    await prisma.academy.create({ data: { id: academyId, orgId, slug: 'regression', name: 'Regression academy' } });
    await prisma.course.create({ data: { id: courseId, orgId, academyId, slug: 'regression', name: 'Regression course', isPublished: true } });
    await prisma.concept.createMany({ data: conceptIds.map((id, index) => ({ id, orgId, courseId, slug: `concept-${index}`, name: `Concept ${index}` })) });
    const kpIds = conceptIds.map(() => randomUUID());
    await prisma.knowledgePoint.createMany({ data: kpIds.map((id, index) => ({ id, conceptId: conceptIds[index], slug: 'test', instructionText: 'Choose the first answer.', workedExampleText: 'The first answer is correct.' })) });
    await prisma.problem.createMany({ data: kpIds.map((knowledgePointId, index) => ({ knowledgePointId, authoredId: `problem-${index}`, type: 'scenario', questionText: 'Which conclusion is correct?', options: ['Expected anonymous capture.', 'Failed ingestion.'], correctAnswer: '0' })) });
    await prisma.academyEnrollment.create({ data: { userId, academyId } });
    await prisma.studentConceptState.create({ data: { userId: otherUserId, conceptId: conceptIds[0], memory: 0.77, observationCount: 7 } });
  });

  afterAll(async () => {
    simulateLatency = false;
    await pendingWrite;
    failEnrollmentWrite = false;
    await prisma.organization.deleteMany({ where: { id: orgId } });
    await prisma.user.deleteMany({ where: { id: { in: [userId, otherUserId] } } });
    await prisma.$disconnect();
  });

  it('advances and completes within the default transaction budget despite per-query latency', async () => {
    const started = await startDiagnosticSession(prisma, studentState, enrollment, orgId, userId, academyId);
    expect(started.totalEstimated).toBe(60);
    simulateLatency = true;
    writeCount = 0;
    const input = { answer: '0', responseTimeMs: 5000, expectedProblemId: started.question!.id, questionNumber: 1 };
    const concurrent = await Promise.allSettled([
      submitDiagnosticAnswer(prisma, studentState, started.sessionId, userId, input),
      submitDiagnosticAnswer(prisma, studentState, started.sessionId, userId, input),
    ]);
    expect(concurrent.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = concurrent.find((result) => result.status === 'rejected') as PromiseRejectedResult;
    expect(rejected.reason.message).toBe('Diagnostic question changed. Reload the current question.');
    const answer = (concurrent.find((result) => result.status === 'fulfilled') as PromiseFulfilledResult<Awaited<ReturnType<typeof submitDiagnosticAnswer>>>).value;
    expect(answer).toMatchObject({ isComplete: false, questionNumber: 2, wasCorrect: true });
    expect(writeCount).toBeLessThanOrEqual(4);
    simulateLatency = false;
    await expect(submitDiagnosticAnswer(prisma, studentState, started.sessionId, userId, input))
      .rejects.toThrow('Diagnostic question changed. Reload the current question.');
    expect(await prisma.problemAttempt.count({ where: { userId } })).toBe(1);
    const snapshots = await prisma.diagnosticMasterySnapshot.findMany({ where: { diagnosticSessionId: started.sessionId } });
    const missing = snapshots[0];
    await prisma.diagnosticMasterySnapshot.delete({ where: { id: missing.id } });
    await prisma.$transaction((tx) => persistDiagnosticSnapshots(tx, started.sessionId, snapshots.map(({ conceptId, pL, tested }) => ({ conceptId, pL, tested }))));
    expect(await prisma.diagnosticMasterySnapshot.findMany({ where: { diagnosticSessionId: started.sessionId }, select: { conceptId: true, pL: true, tested: true } }))
      .toEqual(expect.arrayContaining(snapshots.map(({ conceptId, pL, tested }) => ({ conceptId, pL, tested }))));
    await prisma.diagnosticSession.update({ where: { id: started.sessionId }, data: { questionCount: 59 } });
    failEnrollmentWrite = true;
    await expect(submitDiagnosticAnswer(prisma, studentState, started.sessionId, userId, { answer: '__I_DONT_KNOW__', responseTimeMs: 5000 }))
      .rejects.toThrow('Enrollment write failed');
    failEnrollmentWrite = false;
    expect(await prisma.problemAttempt.count({ where: { userId } })).toBe(1);
    expect(await prisma.diagnosticSession.findUnique({ where: { id: started.sessionId } })).toMatchObject({ status: 'in_progress', questionCount: 59 });
    expect((await prisma.studentConceptState.findMany({ where: { userId } })).every((state) => state.memory === 1 && state.speedRD === 350)).toBe(true);
    simulateLatency = true;
    writeCount = 0;
    const complete = await submitDiagnosticAnswer(prisma, studentState, started.sessionId, userId, { answer: '__I_DONT_KNOW__', responseTimeMs: 5000 });
    expect(complete).toMatchObject({ isComplete: true, questionsAnswered: 60, wasCorrect: false });
    expect(writeCount).toBeLessThanOrEqual(6);
    simulateLatency = false;
    expect(await prisma.problemAttempt.count({ where: { userId } })).toBe(2);
    expect(await prisma.diagnosticMasterySnapshot.count({ where: { diagnosticSessionId: started.sessionId } })).toBe(140);
    const result = await getDiagnosticResult(prisma, started.sessionId, userId, academyId);
    expect(result.totalConcepts).toBe(140);
    expect(await enrollment.requireAcademyEnrollment(userId, academyId)).toMatchObject({ diagnosticCompleted: true });
    const states = await prisma.studentConceptState.findMany({ where: { userId } });
    expect(states).toHaveLength(140);
    expect(states.every((state) => state.speedRD === 250 && state.speed > 0)).toBe(true);
    expect(states.some((state) => state.diagnosticState === 'mastered' && state.masteryState === 'mastered')).toBe(true);
    expect(states.some((state) => state.diagnosticState === 'unknown' && state.masteryState === 'unstarted')).toBe(true);
    expect(await prisma.studentConceptState.findUnique({ where: { userId_conceptId: { userId: otherUserId, conceptId: conceptIds[0] } } }))
      .toMatchObject({ memory: 0.77, diagnosticState: 'unknown', masteryState: 'unstarted', speed: 1, speedRD: 350, observationCount: 7 });
    for (const state of states) {
      const detail = result.conceptDetails.find((candidate) => candidate.conceptId === state.conceptId)!;
      expect(state.memory).toBeCloseTo(detail.pL, 3);
      expect(state.diagnosticState).toBe(detail.classification);
    }
  }, 30_000);
});
