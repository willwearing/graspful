import { SectionMasteryState } from '@prisma/client';
import { SectionExamService } from './section-exam.service';

describe('SectionExamService', () => {
  it('resolves blueprint concept references by slug when starting an exam', async () => {
    const prisma = {
      courseSection: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'section-1',
          sectionExamConfig: {
            enabled: true,
            questionCount: 2,
            blueprint: [{ conceptId: 'entities', minQuestions: 1 }],
          },
          concepts: [
            {
              id: 'concept-1',
              slug: 'entities',
              name: 'Entities',
              knowledgePoints: [
                {
                  problems: [
                    {
                      id: 'problem-1',
                      type: 'multiple_choice',
                      questionText: 'Q1',
                      options: ['A', 'B'],
                      correctAnswer: 'A',
                      explanation: null,
                      isReviewVariant: true,
                      difficulty: 1,
                    },
                  ],
                },
              ],
            },
            {
              id: 'concept-2',
              slug: 'attributes',
              name: 'Attributes',
              knowledgePoints: [
                {
                  problems: [
                    {
                      id: 'problem-2',
                      type: 'multiple_choice',
                      questionText: 'Q2',
                      options: ['A', 'B'],
                      correctAnswer: 'B',
                      explanation: null,
                      isReviewVariant: false,
                      difficulty: 1,
                    },
                  ],
                },
              ],
            },
          ],
        }),
      },
      studentSectionState: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'state-1',
          status: SectionMasteryState.exam_ready,
          attempts: 0,
        }),
      },
      sectionExamSession: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      $transaction: jest.fn(),
    };

    const tx = {
      sectionExamSession: {
        create: jest.fn().mockResolvedValue({ id: 'session-1' }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'session-1',
          sectionId: 'section-1',
          startedAt: new Date(),
          timeLimitMs: 12 * 60 * 1000,
          questions: [
            {
              id: 'question-1',
              problemId: 'problem-1',
              conceptId: 'concept-1',
              problem: {
                id: 'problem-1',
                type: 'multiple_choice',
                questionText: 'Q1',
                options: ['A', 'B'],
                correctAnswer: 'A',
                explanation: null,
              },
            },
            {
              id: 'question-2',
              problemId: 'problem-2',
              conceptId: 'concept-2',
              problem: {
                id: 'problem-2',
                type: 'multiple_choice',
                questionText: 'Q2',
                options: ['A', 'B'],
                correctAnswer: 'B',
                explanation: null,
              },
            },
          ],
        }),
      },
      sectionExamQuestion: {
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      studentSectionState: {
        update: jest.fn().mockResolvedValue({}),
      },
    };

    prisma.$transaction.mockImplementation((callback: any) => callback(tx));

    const xpService = {
      recordXPEvent: jest.fn(),
    };

    const mockStudentState = {
      getConceptMasteryForIds: jest.fn().mockResolvedValue(new Map()),
      markConceptsNeedsReview: jest.fn().mockResolvedValue(undefined),
    };
    const service = new SectionExamService(prisma as any, xpService as any, mockStudentState as any);
    jest.spyOn(service, 'syncSectionStates').mockResolvedValue([] as any);

    const result = await service.startExam('user-1', 'course-1', 'section-1');

    expect(tx.sectionExamQuestion.createMany).toHaveBeenCalledWith({
      data: [
        {
          sessionId: 'session-1',
          problemId: 'problem-1',
          conceptId: 'concept-1',
          sortOrder: 0,
        },
        {
          sessionId: 'session-1',
          problemId: 'problem-2',
          conceptId: 'concept-2',
          sortOrder: 1,
        },
      ],
    });
    expect(result.sessionId).toBe('session-1');
  });
});
