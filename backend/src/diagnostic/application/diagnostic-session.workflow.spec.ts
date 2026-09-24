import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { EnrollmentService } from '@/student-model/enrollment.service';
import { StudentStateService } from '@/student-model/student-state.service';
import type { DiagnosticProblemRecord } from '../domain/diagnostic-session.types';
import * as queries from '../queries/diagnostic-session.queries';
import {
  getDiagnosticResult,
  startDiagnosticForCourse,
  startDiagnosticSession,
  submitDiagnosticAnswer,
} from './diagnostic-session.workflow';

jest.mock('../queries/diagnostic-session.queries');
const query = jest.mocked(queries);

type Session = NonNullable<Awaited<ReturnType<typeof queries.loadDiagnosticSessionById>>>;

const orgId = 'org-1';
const userId = 'user-1';
const academyId = 'academy-1';
const sessionId = 'session-1';
const courseId = 'course-1';
const concepts = [
  { id: 'concept-1', difficultyTheta: 0, courseId },
  { id: 'concept-2', difficultyTheta: 1, courseId: 'course-2' },
];

function problem(conceptId = 'concept-1', overrides: Partial<DiagnosticProblemRecord> = {}): DiagnosticProblemRecord {
  return {
    id: `problem-${conceptId}`,
    knowledgePointId: `kp-${conceptId}`,
    type: 'multiple_choice',
    questionText: 'Which answer is correct?',
    options: ['A', 'B'],
    correctAnswer: 'A',
    knowledgePoint: { conceptId },
    ...overrides,
  } as DiagnosticProblemRecord;
}

function snapshot(conceptId: string, pL = 0.5, tested = false): Session['masterySnapshots'][number] {
  return { conceptId, pL, tested } as Session['masterySnapshots'][number];
}

function session(overrides: Partial<Session> = {}): Session {
  const currentProblem = problem();
  return {
    id: sessionId,
    userId,
    orgId,
    academyId,
    courseId,
    status: 'in_progress',
    questionCount: 0,
    currentProblemId: currentProblem.id,
    currentConceptId: 'concept-1',
    currentProblem,
    responses: [],
    updatedAt: new Date(),
    masterySnapshots: [
      { conceptId: 'concept-1', pL: 0.5, tested: false },
      { conceptId: 'concept-2', pL: 0.5, tested: false },
    ],
    ...overrides,
  } as Session;
}

function writes() {
  return {
    diagnosticSession: {
      create: jest.fn().mockResolvedValue({ id: sessionId }),
      update: jest.fn().mockResolvedValue({ id: sessionId }),
    },
    diagnosticMasterySnapshot: {
      createMany: jest.fn().mockResolvedValue({ count: 2 }),
      upsert: jest.fn().mockResolvedValue({}),
    },
    problemAttempt: { create: jest.fn().mockResolvedValue({ id: 'attempt-1' }) },
  };
}

describe('diagnostic session workflow', () => {
  let prisma: ReturnType<typeof writes> & { $transaction: jest.Mock };
  let tx: ReturnType<typeof writes>;
  let studentState: {
    getMasteryMapForAcademy: jest.Mock;
    updateConceptDiagnosticState: jest.Mock;
    updateSpeedParameters: jest.Mock;
    markDiagnosticComplete: jest.Mock;
  };
  let enrollment: { requireAcademyEnrollment: jest.Mock; getAcademyIdForCourse: jest.Mock };

  const start = () => startDiagnosticSession(
    prisma as unknown as PrismaService,
    studentState as unknown as StudentStateService,
    enrollment as unknown as EnrollmentService,
    orgId,
    userId,
    academyId,
  );
  const submit = (answer: unknown = 'A', responseTimeMs = 5000) => submitDiagnosticAnswer(
    prisma as unknown as PrismaService,
    studentState as unknown as StudentStateService,
    sessionId,
    userId,
    { answer, responseTimeMs },
  );

  beforeEach(() => {
    jest.resetAllMocks();
    tx = writes();
    prisma = { ...writes(), $transaction: jest.fn() };
    prisma.$transaction.mockImplementation(async (work) => (
      typeof work === 'function' ? work(tx) : Promise.all(work)
    ));
    studentState = {
      getMasteryMapForAcademy: jest.fn().mockResolvedValue(new Map([
        ['concept-1', 0.5], ['concept-2', 0.5],
      ])),
      updateConceptDiagnosticState: jest.fn().mockResolvedValue({}),
      updateSpeedParameters: jest.fn().mockResolvedValue([]),
      markDiagnosticComplete: jest.fn().mockResolvedValue({}),
    };
    enrollment = {
      requireAcademyEnrollment: jest.fn().mockResolvedValue({ diagnosticCompleted: false }),
      getAcademyIdForCourse: jest.fn().mockResolvedValue(academyId),
    };
    query.loadInProgressDiagnosticSession.mockResolvedValue(null);
    query.loadDiagnosticSessionById.mockResolvedValue(session());
    query.loadAcademyDiagnosticConcepts.mockResolvedValue(concepts);
    query.loadAcademyDiagnosticEdges.mockResolvedValue([]);
    query.loadDiagnosticProblemsForConcept.mockImplementation(async (_prisma, conceptId) => [problem(conceptId)]);
    query.loadDiagnosticCourseNames.mockResolvedValue(new Map([
      [courseId, { id: courseId, name: 'First course' }],
      ['course-2', { id: 'course-2', name: 'Second course' }],
    ]));
    query.loadDiagnosticConceptCourseMap.mockResolvedValue(new Map());
  });

  it.each(['updateConceptDiagnosticState', 'updateSpeedParameters', 'markDiagnosticComplete'] as const)(
    'rolls back completion when %s fails', async (method) => {
    query.loadDiagnosticSessionById.mockResolvedValue(session({ questionCount: 59 }));
    let savedStatus = 'in_progress';
    let pendingStatus = savedStatus;
    prisma.diagnosticSession.update.mockImplementation(async ({ data }) => {
      savedStatus = data.status;
      return { id: sessionId };
    });
    tx.diagnosticSession.update.mockImplementation(async ({ data }) => {
      pendingStatus = data.status;
      return { id: sessionId };
    });
    prisma.$transaction.mockImplementation(async (work) => {
      if (typeof work !== 'function') return Promise.all(work);
      pendingStatus = savedStatus;
      const result = await work(tx);
      savedStatus = pendingStatus;
      return result;
    });
    studentState[method].mockRejectedValue(new Error('State write failed'));

    await expect(submit()).rejects.toThrow('State write failed');

    expect(savedStatus).toBe('in_progress');
    if (method !== 'markDiagnosticComplete') {
      expect(studentState.markDiagnosticComplete).not.toHaveBeenCalled();
    }
    expect(query.loadDiagnosticCourseNames).not.toHaveBeenCalled();
  });


  describe('starting a diagnostic', () => {
    it('creates the question and initial mastery snapshots in one transaction', async () => {
      const result = await start();

      expect(enrollment.requireAcademyEnrollment).toHaveBeenCalledWith(userId, academyId);
      expect(result).toMatchObject({
        sessionId, questionNumber: 1, totalEstimated: 2, isComplete: false,
        question: { id: 'problem-concept-1', questionText: 'Which answer is correct?' },
      });
      expect(result.question).not.toHaveProperty('correctAnswer');
      expect(tx.diagnosticSession.create).toHaveBeenCalledWith({
        data: {
          userId, courseId, academyId, orgId, status: 'in_progress', questionCount: 0,
          currentProblemId: 'problem-concept-1', currentConceptId: 'concept-1', responses: [],
        },
      });
      expect(tx.diagnosticMasterySnapshot.createMany).toHaveBeenCalledWith({ data: [
        { diagnosticSessionId: sessionId, conceptId: 'concept-1', pL: 0.5, tested: false },
        { diagnosticSessionId: sessionId, conceptId: 'concept-2', pL: 0.5, tested: false },
      ] });
      expect(prisma.diagnosticSession.create).not.toHaveBeenCalled();
      expect(prisma.diagnosticMasterySnapshot.createMany).not.toHaveBeenCalled();
    });

    it('uses the shared course resolver and academy enrollment requirement', async () => {
      await startDiagnosticForCourse(
        prisma as unknown as PrismaService,
        studentState as unknown as StudentStateService,
        enrollment as unknown as EnrollmentService,
        orgId, userId, courseId,
      );

      expect(enrollment.getAcademyIdForCourse).toHaveBeenCalledWith(courseId);
      expect(enrollment.requireAcademyEnrollment).toHaveBeenCalledWith(userId, academyId);
      expect(tx.diagnosticSession.create).toHaveBeenCalledTimes(1);
    });

    it('propagates a missing course without creating a session', async () => {
      enrollment.getAcademyIdForCourse.mockRejectedValue(new NotFoundException('Course not found'));

      await expect(startDiagnosticForCourse(
        prisma as unknown as PrismaService,
        studentState as unknown as StudentStateService,
        enrollment as unknown as EnrollmentService,
        orgId, userId, courseId,
      )).rejects.toThrow(NotFoundException);

      expect(enrollment.requireAcademyEnrollment).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects unenrolled students before reading diagnostic content', async () => {
      enrollment.requireAcademyEnrollment.mockRejectedValue(new NotFoundException('Not enrolled'));

      await expect(start()).rejects.toThrow(NotFoundException);

      expect(query.loadInProgressDiagnosticSession).not.toHaveBeenCalled();
      expect(query.loadAcademyDiagnosticConcepts).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects students who already completed their diagnostic', async () => {
      enrollment.requireAcademyEnrollment.mockResolvedValue({ diagnosticCompleted: true });

      await expect(start()).rejects.toThrow('Diagnostic already completed');

      expect(query.loadInProgressDiagnosticSession).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects an empty mastery map before choosing a problem', async () => {
      studentState.getMasteryMapForAcademy.mockResolvedValue(new Map());
      query.loadAcademyDiagnosticConcepts.mockResolvedValue([]);

      await expect(start()).rejects.toThrow('No concepts available for diagnostic');

      expect(query.loadDiagnosticProblemsForConcept).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects content with no available diagnostic problems', async () => {
      query.loadDiagnosticProblemsForConcept.mockResolvedValue([]);

      await expect(start()).rejects.toThrow('No problems available for diagnostic');

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('does not return a session if creating its snapshots fails', async () => {
      tx.diagnosticMasterySnapshot.createMany.mockRejectedValue(new Error('Snapshot failed'));

      await expect(start()).rejects.toThrow('Snapshot failed');

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('resumes the winning session when a concurrent start creates it first', async () => {
      tx.diagnosticSession.create.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError(
        'Duplicate session', { code: 'P2002', clientVersion: 'test' },
      ));
      query.loadInProgressDiagnosticSession
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(session({ id: 'winning-session', questionCount: 4 }));

      await expect(start()).resolves.toMatchObject({ sessionId: 'winning-session', questionNumber: 5 });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(enrollment.requireAcademyEnrollment).toHaveBeenCalledTimes(2);
    });

    it('bounds retries when the unique session constraint keeps failing', async () => {
      tx.diagnosticSession.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError(
        'Duplicate session', { code: 'P2002', clientVersion: 'test' },
      ));

      await expect(start()).rejects.toThrow('Failed to create diagnostic session after retries');

      expect(prisma.$transaction).toHaveBeenCalledTimes(4);
    });

    it('does not retry unrelated database failures', async () => {
      tx.diagnosticSession.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError(
        'Missing relation', { code: 'P2003', clientVersion: 'test' },
      ));

      await expect(start()).rejects.toThrow('Missing relation');

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('caps the question estimate at 60 for large academies', async () => {
      query.loadAcademyDiagnosticConcepts.mockResolvedValue([
        ...concepts,
        ...Array.from({ length: 70 }, (_, index) => ({
          id: `extra-${index}`, difficultyTheta: 0, courseId,
        })),
      ]);

      await expect(start()).resolves.toMatchObject({ totalEstimated: 60 });
    });
  });

  describe('resuming a diagnostic', () => {
    it('returns the stored question without creating another session or snapshots', async () => {
      query.loadInProgressDiagnosticSession.mockResolvedValue(session({ questionCount: 3 }));

      await expect(start()).resolves.toMatchObject({
        sessionId, questionNumber: 4, question: { id: 'problem-concept-1' },
      });

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(studentState.getMasteryMapForAcademy).not.toHaveBeenCalled();
      expect(prisma.diagnosticSession.update).not.toHaveBeenCalled();
    });

    it('saves a replacement question so the next answer can use it', async () => {
      query.loadInProgressDiagnosticSession.mockResolvedValue(session({
        currentProblem: null, currentProblemId: null,
      }));
      query.loadDiagnosticProblemsForConcept.mockResolvedValue([problem('concept-1', { id: 'replacement' })]);

      await expect(start()).resolves.toMatchObject({ question: { id: 'replacement' } });

      expect(prisma.diagnosticSession.update).toHaveBeenCalledWith({
        where: { id: sessionId }, data: { currentProblemId: 'replacement' },
      });
    });

    it('rejects a missing stored question if no replacement is available', async () => {
      query.loadInProgressDiagnosticSession.mockResolvedValue(session({ currentProblem: null }));
      query.loadDiagnosticProblemsForConcept.mockResolvedValue([]);

      await expect(start()).rejects.toThrow('Diagnostic content is no longer available');

      expect(prisma.diagnosticSession.update).not.toHaveBeenCalled();
    });

    it.each([
      { currentConceptId: 'hidden-concept' },
      { currentProblem: problem('another-concept') },
    ])('rejects unavailable stored content without changing the session: %j', async (overrides) => {
      query.loadInProgressDiagnosticSession.mockResolvedValue(session(overrides));

      await expect(start()).rejects.toThrow('Diagnostic content is no longer available');

      expect(query.loadDiagnosticProblemsForConcept).not.toHaveBeenCalled();
      expect(prisma.diagnosticSession.update).not.toHaveBeenCalled();
    });

    it('abandons a session at the 24 hour boundary and starts a new diagnostic', async () => {
      const now = new Date('2026-09-24T12:00:00Z');
      const clock = jest.spyOn(Date, 'now').mockReturnValue(now.getTime());
      query.loadInProgressDiagnosticSession.mockResolvedValue(session({
        id: 'old-session', updatedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      }));
      try {
        await expect(start()).resolves.toMatchObject({ sessionId, questionNumber: 1 });
        expect(prisma.diagnosticSession.update).toHaveBeenCalledWith({
          where: { id: 'old-session' }, data: { status: 'abandoned' },
        });
        expect(tx.diagnosticSession.create).toHaveBeenCalledTimes(1);
      } finally {
        clock.mockRestore();
      }
    });
  });

  describe('submitting an answer', () => {
    it('rejects a session from another academy even when the user owns it', async () => {
      await expect(submitDiagnosticAnswer(
        prisma as unknown as PrismaService,
        studentState as unknown as StudentStateService,
        sessionId, userId, { answer: 'A', responseTimeMs: 5000 }, 'another-academy',
      )).rejects.toThrow(NotFoundException);

      expect(query.loadAcademyDiagnosticConcepts).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('accepts a session from the requested academy', async () => {
      await expect(submitDiagnosticAnswer(
        prisma as unknown as PrismaService,
        studentState as unknown as StudentStateService,
        sessionId, userId, { answer: 'A', responseTimeMs: 5000 }, academyId,
      )).resolves.toMatchObject({ isComplete: false });
    });

    it('saves the next question, all mastery snapshots, and the attempt in one transaction', async () => {
      const result = await submit();

      expect(result).toMatchObject({
        sessionId, questionNumber: 2, totalEstimated: 2, isComplete: false, wasCorrect: true,
        question: { id: 'problem-concept-2' },
      });
      expect(result).not.toHaveProperty('question.correctAnswer');
      expect(tx.diagnosticMasterySnapshot.upsert).toHaveBeenCalledTimes(2);
      expect(tx.diagnosticMasterySnapshot.upsert).toHaveBeenCalledWith(expect.objectContaining({
        create: { diagnosticSessionId: sessionId, conceptId: 'concept-1', pL: 0.45 / 0.55, tested: true },
      }));
      expect(tx.diagnosticSession.update).toHaveBeenCalledWith({
        where: { id: sessionId },
        data: {
          questionCount: 1, currentProblemId: 'problem-concept-2', currentConceptId: 'concept-2',
          responses: [{ conceptId: 'concept-1', correct: true, difficultyTheta: 0 }],
        },
      });
      expect(tx.problemAttempt.create).toHaveBeenCalledWith({
        data: { userId, problemId: 'problem-concept-1', answer: 'A', correct: true, responseTimeMs: 5000 },
      });
      expect(prisma.diagnosticMasterySnapshot.upsert).not.toHaveBeenCalled();
      expect(prisma.diagnosticSession.update).not.toHaveBeenCalled();
      expect(prisma.problemAttempt.create).not.toHaveBeenCalled();
      expect(studentState.updateConceptDiagnosticState).not.toHaveBeenCalled();
      expect(studentState.markDiagnosticComplete).not.toHaveBeenCalled();
    });

    it.each([
      { answer: 'B', correct: false, mastery: 0.05 / 0.45 },
      { answer: '__I_DONT_KNOW__', correct: false, mastery: (0.05 / 0.45) * 0.8 },
    ])('records $answer as incorrect with the right mastery penalty', async ({ answer, correct, mastery }) => {
      await expect(submit(answer)).resolves.toMatchObject({ isComplete: false, wasCorrect: correct });

      expect(tx.diagnosticMasterySnapshot.upsert.mock.calls[0][0].create.pL).toBeCloseTo(mastery);
      expect(tx.problemAttempt.create).toHaveBeenCalledWith({
        data: { userId, problemId: 'problem-concept-1', answer, correct, responseTimeMs: 5000 },
      });
    });

    it('uses the fill-in answer guess rate', async () => {
      query.loadDiagnosticSessionById.mockResolvedValue(session({
        currentProblem: problem('concept-1', { type: 'fill_blank' }),
      }));

      await submit();

      expect(tx.diagnosticMasterySnapshot.upsert.mock.calls[0][0].create.pL).toBeCloseTo(0.45 / 0.475);
    });

    it('discounts correct answers that take more than twice the expected time', async () => {
      await submit('A', 30000);

      expect(tx.diagnosticMasterySnapshot.upsert.mock.calls[0][0].create.pL)
        .toBeCloseTo(0.5 + 0.8 * (0.45 / 0.55 - 0.5));
    });

    it('stores absent answers as JSON null', async () => {
      await submitDiagnosticAnswer(
        prisma as unknown as PrismaService,
        studentState as unknown as StudentStateService,
        sessionId, userId, { answer: undefined, responseTimeMs: 5000 },
      );

      expect(tx.problemAttempt.create.mock.calls[0][0].data.answer).toBe(Prisma.JsonNull);
    });

    it('keeps prior responses when processing the next answer', async () => {
      const prior = { conceptId: 'concept-2', correct: false, difficultyTheta: 1 };
      query.loadDiagnosticSessionById.mockResolvedValue(session({ responses: [prior] }));

      await submit();

      expect(tx.diagnosticSession.update.mock.calls[0][0].data.responses).toEqual([
        prior, { conceptId: 'concept-1', correct: true, difficultyTheta: 0 },
      ]);
    });

    it('treats an invalid stored response document as empty', async () => {
      query.loadDiagnosticSessionById.mockResolvedValue(session({ responses: { legacy: true } }));

      await submit();

      expect(tx.diagnosticSession.update.mock.calls[0][0].data.responses).toEqual([
        { conceptId: 'concept-1', correct: true, difficultyTheta: 0 },
      ]);
    });

    it('does not change learner state if persisting the attempt fails', async () => {
      query.loadDiagnosticSessionById.mockResolvedValue(session({ questionCount: 59 }));
      tx.problemAttempt.create.mockRejectedValue(new Error('Attempt failed'));

      await expect(submit()).rejects.toThrow('Attempt failed');

      expect(studentState.updateConceptDiagnosticState).not.toHaveBeenCalled();
      expect(studentState.updateSpeedParameters).not.toHaveBeenCalled();
      expect(studentState.markDiagnosticComplete).not.toHaveBeenCalled();
    });

    it.each([
      { name: 'missing session', value: null, error: NotFoundException },
      { name: 'other user', value: session({ userId: 'other-user' }), error: ForbiddenException },
      { name: 'completed session', value: session({ status: 'completed' }), error: BadRequestException },
      { name: 'abandoned session', value: session({ status: 'abandoned' }), error: BadRequestException },
      { name: 'missing problem', value: session({ currentProblem: null }), error: BadRequestException },
      { name: 'missing concept', value: session({ currentConceptId: null }), error: BadRequestException },
    ])('rejects $name before accessing content or writing state', async ({ value, error }) => {
      query.loadDiagnosticSessionById.mockResolvedValue(value);

      await expect(submit()).rejects.toThrow(error);

      expect(query.loadAcademyDiagnosticConcepts).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(studentState.updateConceptDiagnosticState).not.toHaveBeenCalled();
    });

    it.each([
      { currentConceptId: 'hidden-concept' },
      { currentProblem: problem('another-concept') },
    ])('rejects stored content outside the published concept set: %j', async (overrides) => {
      query.loadDiagnosticSessionById.mockResolvedValue(session(overrides));

      await expect(submit()).rejects.toThrow('Diagnostic content is no longer available');

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(studentState.updateConceptDiagnosticState).not.toHaveBeenCalled();
    });
  });

  describe('completing a diagnostic', () => {
    it('finishes at the hard cap with all learner updates inside the transaction', async () => {
      query.loadDiagnosticSessionById.mockResolvedValue(session({ questionCount: 59 }));

      const result = await submit();

      expect(result).toMatchObject({
        sessionId, isComplete: true, questionsAnswered: 60,
        result: {
          totalConcepts: 2, questionsAnswered: 60,
          courseBreakdown: [
            { courseId, courseName: 'First course', totalConcepts: 1, mastered: 1 },
            { courseId: 'course-2', courseName: 'Second course', totalConcepts: 1, partiallyKnown: 1 },
          ],
        },
      });
      expect(query.loadDiagnosticProblemsForConcept).not.toHaveBeenCalled();
      expect(tx.diagnosticSession.update).toHaveBeenCalledWith({
        where: { id: sessionId },
        data: expect.objectContaining({
          status: 'completed', completedAt: expect.any(Date), questionCount: 60,
          currentConceptId: null, currentProblemId: null,
        }),
      });
      expect(studentState.updateConceptDiagnosticState).toHaveBeenCalledWith(
        userId, 'concept-1', 'mastered', 0.45 / 0.55, tx,
      );
      expect(studentState.updateConceptDiagnosticState).toHaveBeenCalledWith(
        userId, 'concept-2', 'conditionally_mastered', 0.5, tx,
      );
      expect(studentState.updateSpeedParameters).toHaveBeenCalledWith(
        userId, expect.any(Number), 250, expect.any(Map), tx,
      );
      expect(studentState.markDiagnosticComplete).toHaveBeenCalledWith(userId, academyId, tx);
      expect(prisma.diagnosticSession.update).not.toHaveBeenCalled();
      expect(prisma.problemAttempt.create).not.toHaveBeenCalled();
    });

    it('finishes when every concept was tested even if some mastery remains uncertain', async () => {
      query.loadDiagnosticSessionById.mockResolvedValue(session({
        masterySnapshots: [snapshot('concept-1'), snapshot('concept-2', 0.5, true)],
      }));

      await expect(submit()).resolves.toMatchObject({ isComplete: true, questionsAnswered: 1 });

      expect(query.loadDiagnosticProblemsForConcept).not.toHaveBeenCalled();
    });

    it('finishes when the remaining concept has no available problem', async () => {
      query.loadDiagnosticProblemsForConcept.mockResolvedValue([]);

      await expect(submit()).resolves.toMatchObject({ isComplete: true, questionsAnswered: 1 });

      expect(studentState.markDiagnosticComplete).toHaveBeenCalledWith(userId, academyId, tx);
    });

    it('does not project hidden snapshots into the learner model or result', async () => {
      query.loadDiagnosticSessionById.mockResolvedValue(session({
        masterySnapshots: [snapshot('concept-1'), snapshot('hidden-concept')],
      }));
      query.loadAcademyDiagnosticConcepts.mockResolvedValue([concepts[0]]);

      await expect(submit()).resolves.toMatchObject({
        isComplete: true, result: { totalConcepts: 1 },
      });

      expect(tx.diagnosticMasterySnapshot.upsert).toHaveBeenCalledTimes(1);
      expect(studentState.updateConceptDiagnosticState).toHaveBeenCalledTimes(1);
      expect(studentState.updateConceptDiagnosticState.mock.calls[0][1]).toBe('concept-1');
      expect(studentState.updateSpeedParameters.mock.calls[0][3].has('hidden-concept')).toBe(false);
    });
  });

  describe('reading results', () => {
    it('rejects results from another academy even when the user owns the session', async () => {
      await expect(getDiagnosticResult(
        prisma as unknown as PrismaService, sessionId, userId, 'another-academy',
      )).rejects.toThrow(NotFoundException);

      expect(query.loadDiagnosticConceptCourseMap).not.toHaveBeenCalled();
    });

    it('accepts results from the requested academy', async () => {
      await expect(getDiagnosticResult(
        prisma as unknown as PrismaService, sessionId, userId, academyId,
      )).resolves.toMatchObject({ totalConcepts: 2 });
    });

    it('returns rounded masteries and course breakdowns without changing state', async () => {
      query.loadDiagnosticSessionById.mockResolvedValue(session({
        questionCount: 5,
        masterySnapshots: [snapshot('concept-1', 0.92349, true), snapshot('concept-2', 0.12, true)],
      }));
      query.loadDiagnosticConceptCourseMap.mockResolvedValue(new Map([
        ['concept-1', { courseId, courseName: 'First course' }],
        ['concept-2', { courseId, courseName: 'First course' }],
      ]));

      const result = await getDiagnosticResult(prisma as unknown as PrismaService, sessionId, userId);

      expect(result).toMatchObject({
        questionsAnswered: 5, totalConcepts: 2,
        breakdown: { mastered: 1, unknown: 1 },
        conceptDetails: [
          { conceptId: 'concept-1', pL: 0.923, classification: 'mastered' },
          { conceptId: 'concept-2', pL: 0.12, classification: 'unknown' },
        ],
        courseBreakdown: [{ courseId, courseName: 'First course', totalConcepts: 2, mastered: 1, unknown: 1 }],
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it.each([
      { value: null, error: NotFoundException },
      { value: session({ userId: 'someone-else' }), error: ForbiddenException },
    ])('requires a session owned by the user', async ({ value, error }) => {
      query.loadDiagnosticSessionById.mockResolvedValue(value);

      await expect(getDiagnosticResult(prisma as unknown as PrismaService, sessionId, userId))
        .rejects.toThrow(error);

      expect(query.loadDiagnosticConceptCourseMap).not.toHaveBeenCalled();
    });
  });
});
