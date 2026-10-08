import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { EnrollmentService } from './enrollment.service';
import { StudentStateService } from './student-state.service';

describe('Diagnostic student state transaction boundaries', () => {
  const createClient = () => ({
    $executeRaw: jest.fn().mockResolvedValue(1),
    studentConceptState: { update: jest.fn().mockResolvedValue({}) },
    academyEnrollment: { update: jest.fn().mockResolvedValue({}) },
    studentKPState: { findMany: jest.fn().mockResolvedValue([]) },
  });

  it('writes mastery, speed, and completion through the supplied transaction only', async () => {
    const prisma = createClient();
    const tx = createClient();
    const client = prisma as unknown as PrismaService;
    const service = new StudentStateService(client, new EnrollmentService(client));
    const transaction = tx as unknown as Prisma.TransactionClient;

    await service.updateDiagnosticStates('user-1', [
      { conceptId: 'concept-1', diagnosticState: 'partially_known', pL: 0.6, speed: 1.4 },
    ], 0.9, 0.2, transaction);
    await service.applyRepetitionUpdates('user-1', [
      { conceptId: 'concept-1', repNum: 2, memory: 0.7, interval: 7 },
    ], transaction);
    await service.markDiagnosticComplete('user-1', 'academy-1', transaction);

    expect(tx.$executeRaw).toHaveBeenCalledTimes(2);
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
    expect(tx.academyEnrollment.update).toHaveBeenCalledWith({
      where: { userId_academyId: { userId: 'user-1', academyId: 'academy-1' } },
      data: { diagnosticCompleted: true, diagnosticCompletedAt: expect.any(Date) },
    });
    expect(prisma.studentConceptState.update).not.toHaveBeenCalled();
    expect(prisma.academyEnrollment.update).not.toHaveBeenCalled();
  });

  it('exposes KP progress through the owning service within the caller transaction', async () => {
    const prisma = createClient();
    const tx = createClient();
    const states = [{ knowledgePointId: 'kp-1', passed: true, consecutiveCorrect: 2, attempts: 3 }];
    tx.studentKPState.findMany.mockResolvedValue(states);
    const client = prisma as unknown as PrismaService;
    const service = new StudentStateService(client, new EnrollmentService(client));

    expect(await service.getKPStatesForIds('user-1', ['kp-1'], tx as unknown as Prisma.TransactionClient)).toBe(states);
    expect(tx.studentKPState.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', knowledgePointId: { in: ['kp-1'] } },
      select: { knowledgePointId: true, passed: true, consecutiveCorrect: true, attempts: true },
    });
    expect(prisma.studentKPState.findMany).not.toHaveBeenCalled();
  });
});
