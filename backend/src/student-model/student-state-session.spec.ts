import { Prisma, StudentConceptState } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { EnrollmentService } from './enrollment.service';
import { StudentStateService } from './student-state.service';

describe('Student state UTC session rollover', () => {
  const newDay = new Date('2026-09-25T00:01:00Z');
  const previousDay = new Date('2026-09-24T23:59:00Z');
  let state: Pick<StudentConceptState, 'lastPracticedAt' | 'sessionFailedKPAttempts' | 'pausedAtSessionId'>;
  let tx: { studentConceptState: { updateMany: jest.Mock; update: jest.Mock } };
  let service: StudentStateService;

  beforeEach(() => {
    state = { lastPracticedAt: previousDay, sessionFailedKPAttempts: 5, pausedAtSessionId: null };
    tx = {
      studentConceptState: {
        updateMany: jest.fn().mockImplementation(({ where, data }) => {
          const cutoff = where.OR[1].lastPracticedAt.lt;
          if ((state.lastPracticedAt === null && state.pausedAtSessionId !== '2026-09-25') || (state.lastPracticedAt !== null && state.lastPracticedAt < cutoff)) {
            Object.assign(state, data);
            return Promise.resolve({ count: 1 });
          }
          return Promise.resolve({ count: 0 });
        }),
        update: jest.fn().mockImplementation(({ data }) => {
          Object.assign(state, data);
          return Promise.resolve({ ...state });
        }),
      },
    };
    const prisma = {} as PrismaService;
    service = new StudentStateService(prisma, new EnrollmentService(prisma));
  });

  const writers = [
    ['practice', (service: StudentStateService, tx: Prisma.TransactionClient, lastPracticedAt?: Date) =>
      service.updateConceptAfterPractice('user-1', 'concept-1', { lastPracticedAt }, tx)],
    ['FIRe', (service: StudentStateService, tx: Prisma.TransactionClient, lastPracticedAt?: Date) =>
      service.updateConceptFIRe('user-1', 'concept-1', { repNum: 2, memory: 0.8, interval: 4, lastPracticedAt }, tx)],
  ] as const;

  it.each(writers)('%s clears previous-day failures before setting a new practice date', async (_, write) => {
    await write(service, tx as unknown as Prisma.TransactionClient, newDay);
    expect(state.sessionFailedKPAttempts).toBe(0);
    expect(state.lastPracticedAt).toBe(newDay);
    expect(tx.studentConceptState.updateMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1', conceptId: 'concept-1',
        OR: [{ lastPracticedAt: null, OR: [{ pausedAtSessionId: null }, { pausedAtSessionId: { not: '2026-09-25' } }] }, { lastPracticedAt: { lt: new Date('2026-09-25T00:00:00Z') } }],
      },
      data: { sessionFailedKPAttempts: 0 },
    });
  });

  it.each(writers)('%s preserves failures accumulated in the current UTC session', async (_, write) => {
    state.lastPracticedAt = new Date('2026-09-25T00:00:30Z');
    await write(service, tx as unknown as Prisma.TransactionClient, newDay);
    expect(state.sessionFailedKPAttempts).toBe(5);
  });

  it.each(writers)('%s leaves counts alone when no practice date advances', async (_, write) => {
    await write(service, tx as unknown as Prisma.TransactionClient);
    expect(tx.studentConceptState.updateMany).not.toHaveBeenCalled();
    expect(state.sessionFailedKPAttempts).toBe(5);
  });

  it('preserves the explicit count computed by the answer workflow', async () => {
    await service.updateConceptAfterPractice('user-1', 'concept-1', {
      lastPracticedAt: newDay, sessionFailedKPAttempts: 1,
    }, tx as unknown as Prisma.TransactionClient);
    expect(state.sessionFailedKPAttempts).toBe(1);
    expect(tx.studentConceptState.updateMany).not.toHaveBeenCalled();
  });

  it('preserves the current pause marker when no previous practice timestamp exists', async () => {
    state.lastPracticedAt = null;
    state.pausedAtSessionId = '2026-09-25';
    await service.updateConceptAfterPractice('user-1', 'concept-1', {
      lastPracticedAt: newDay,
    }, tx as unknown as Prisma.TransactionClient);
    expect(state.sessionFailedKPAttempts).toBe(5);
  });

  it('clears stale failures with no previous practice timestamp', async () => {
    state.lastPracticedAt = null;
    await service.updateConceptAfterPractice('user-1', 'concept-1', {
      lastPracticedAt: newDay,
    }, tx as unknown as Prisma.TransactionClient);
    expect(state.sessionFailedKPAttempts).toBe(0);
  });
});
