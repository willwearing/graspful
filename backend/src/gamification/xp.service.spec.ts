import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { XPService, RecordXPInput } from './xp.service';
import { PrismaService } from '@/prisma/prisma.service';

const mockPrisma = {
  $transaction: jest.fn(),
  xPEvent: {
    findUnique: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    aggregate: jest.fn(),
  },
  academyEnrollment: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  courseEnrollment: {
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  userStreak: {
    upsert: jest.fn(),
  },
};

describe('XPService', () => {
  let service: XPService;

  beforeEach(async () => {
    jest.resetAllMocks();
    mockPrisma.$transaction.mockImplementation((work) => work(mockPrisma));
    mockPrisma.xPEvent.findUnique.mockResolvedValue(null);
    mockPrisma.xPEvent.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
    mockPrisma.academyEnrollment.findUnique.mockResolvedValue({
      academy: { orgId: 'org-1' },
    });
    const module = await Test.createTestingModule({
      providers: [
        XPService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(XPService);
  });

  describe('recordXPEvent', () => {
    it('should create an XP event and increment enrollment totalXPEarned', async () => {
      mockPrisma.academyEnrollment.findUnique.mockResolvedValue({
        id: 'enroll-1',
        totalXPEarned: 100,
        dailyXPTarget: 40,
        academy: { orgId: 'org-1' },
      });
      mockPrisma.xPEvent.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
      mockPrisma.xPEvent.create.mockResolvedValue({ id: 'xp-1', amount: 15 });
      mockPrisma.academyEnrollment.update.mockResolvedValue({});
      mockPrisma.courseEnrollment.update.mockResolvedValue({});
      mockPrisma.userStreak.upsert.mockResolvedValue({});

      const result = await service.recordXPEvent({
        userId: 'user-1',
        academyId: 'academy-1',
        courseId: 'course-1',
        source: 'lesson',
        amount: 15,
        conceptId: 'concept-1',
      });

      expect(result.amount).toBe(15);
      expect(mockPrisma.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        { isolationLevel: 'Serializable' },
      );
      expect(mockPrisma.xPEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          academyId: 'academy-1',
          courseId: 'course-1',
          source: 'lesson',
          amount: 15,
          conceptId: 'concept-1',
        }),
      });
      expect(mockPrisma.courseEnrollment.updateMany).toHaveBeenCalled();
    });

    it('should skip recording when amount is 0', async () => {
      const result = await service.recordXPEvent({
        userId: 'user-1',
        courseId: 'course-1',
        source: 'lesson',
        amount: 0,
      });

      expect(result.amount).toBe(0);
      expect(mockPrisma.xPEvent.create).not.toHaveBeenCalled();
    });

    it('should cap daily XP at 500', async () => {
      mockPrisma.academyEnrollment.findUnique.mockResolvedValue({
        id: 'enroll-1',
        totalXPEarned: 100,
        dailyXPTarget: 40,
        academy: { orgId: 'org-1' },
      });
      // Simulate 490 XP already earned today
      mockPrisma.xPEvent.aggregate.mockResolvedValue({ _sum: { amount: 490 } });
      mockPrisma.xPEvent.create.mockResolvedValue({ id: 'xp-2', amount: 10 });
      mockPrisma.academyEnrollment.update.mockResolvedValue({});
      mockPrisma.courseEnrollment.update.mockResolvedValue({});
      mockPrisma.userStreak.upsert.mockResolvedValue({});

      const result = await service.recordXPEvent({
        userId: 'user-1',
        academyId: 'academy-1',
        courseId: 'course-1',
        source: 'lesson',
        amount: 20,
      });

      // Should clamp to 10 (500 - 490)
      expect(result.amount).toBe(10);
    });
  });

  describe('retry protection', () => {
    const input: RecordXPInput = {
      userId: 'user-1',
      academyId: 'academy-1',
      courseId: 'course-1',
      source: 'quiz',
      amount: 20,
      idempotencyKey: 'quiz:session-1',
    };

    function rememberEvents() {
      const events = new Map<string, { amount: number }>();
      mockPrisma.xPEvent.findUnique.mockImplementation(async ({ where }) =>
        events.get(where.id) ?? null,
      );
      mockPrisma.xPEvent.create.mockImplementation(async ({ data }) => {
        events.set(data.id, { amount: data.amount });
        return data;
      });
      return events;
    }

    it('returns the original award when a completion is retried', async () => {
      rememberEvents();
      mockPrisma.xPEvent.aggregate.mockResolvedValue({ _sum: { amount: 490 } });

      expect(await service.recordXPEvent(input)).toEqual({ amount: 10 });
      expect(await service.recordXPEvent(input)).toEqual({ amount: 10 });

      expect(mockPrisma.xPEvent.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.academyEnrollment.update).toHaveBeenCalledTimes(1);
      expect(mockPrisma.courseEnrollment.updateMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.userStreak.upsert).toHaveBeenCalledTimes(1);
    });

    it('awards XP once for direct course enrollment without academy enrollment', async () => {
      rememberEvents();
      mockPrisma.academyEnrollment.findUnique.mockResolvedValue(null);
      mockPrisma.courseEnrollment.updateMany.mockResolvedValue({ count: 1 });

      expect(await service.recordXPEvent(input)).toEqual({ amount: 20 });
      expect(await service.recordXPEvent(input)).toEqual({ amount: 20 });

      expect(mockPrisma.xPEvent.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.academyEnrollment.update).not.toHaveBeenCalled();
      expect(mockPrisma.courseEnrollment.updateMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.courseEnrollment.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', courseId: 'course-1' },
        data: { totalXPEarned: { increment: 20 } },
      });
    });

    it('keeps a capped zero award at zero when it is retried after the cap resets', async () => {
      rememberEvents();
      mockPrisma.xPEvent.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 500 } })
        .mockResolvedValue({ _sum: { amount: 0 } });

      expect(await service.recordXPEvent(input)).toEqual({ amount: 0 });
      expect(await service.recordXPEvent(input)).toEqual({ amount: 0 });

      expect(mockPrisma.xPEvent.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.xPEvent.aggregate).toHaveBeenCalledTimes(1);
      expect(mockPrisma.academyEnrollment.update).not.toHaveBeenCalled();
      expect(mockPrisma.userStreak.upsert).not.toHaveBeenCalled();
    });

    it('scopes a key to its learner, academy, course, and source', async () => {
      const events = rememberEvents();
      for (const award of [
        input,
        { ...input, userId: 'user-2' },
        { ...input, academyId: 'academy-2' },
        { ...input, courseId: 'course-2' },
        { ...input, source: 'review' as const },
      ]) {
        expect(await service.recordXPEvent(award)).toEqual({ amount: 20 });
      }

      expect(events.size).toBe(5);
      for (const id of events.keys()) {
        expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      }
    });

    it('rolls back the event and totals if the final streak write fails', async () => {
      let committed = { events: new Map<string, { amount: number }>(), academyXP: 0, courseXP: 0, streakXP: 0 };
      let failStreak = true;
      mockPrisma.$transaction.mockImplementation(async (work) => {
        const pending = { ...committed, events: new Map(committed.events) };
        const result = await work({
          xPEvent: {
            findUnique: async ({ where }: any) => pending.events.get(where.id) ?? null,
            aggregate: async () => ({ _sum: { amount: pending.academyXP } }),
            create: async ({ data }: any) => pending.events.set(data.id, { amount: data.amount }),
          },
          academyEnrollment: {
            findUnique: async () => ({ academy: { orgId: 'org-1' } }),
            update: async ({ data }: any) => { pending.academyXP += data.totalXPEarned.increment; },
          },
          courseEnrollment: {
            updateMany: async ({ data }: any) => { pending.courseXP += data.totalXPEarned.increment; },
          },
          userStreak: {
            upsert: async ({ create }: any) => {
              if (failStreak) throw new Error('streak unavailable');
              pending.streakXP += create.xpEarned;
            },
          },
        });
        committed = pending;
        return result;
      });

      await expect(service.recordXPEvent(input)).rejects.toThrow('streak unavailable');
      expect(committed.events.size).toBe(0);
      expect(committed.academyXP).toBe(0);
      expect(committed.courseXP).toBe(0);

      failStreak = false;
      expect(await service.recordXPEvent(input)).toEqual({ amount: 20 });
      expect(await service.recordXPEvent(input)).toEqual({ amount: 20 });
      expect(committed.events.size).toBe(1);
      expect(committed.academyXP).toBe(20);
      expect(committed.courseXP).toBe(20);
      expect(committed.streakXP).toBe(20);
      expect(mockPrisma.xPEvent.create).not.toHaveBeenCalled();
    });

    it('retries a serialization conflict using a fresh transaction', async () => {
      mockPrisma.$transaction.mockRejectedValueOnce({ code: 'P2034' });

      expect(await service.recordXPEvent(input)).toEqual({ amount: 20 });
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(2);
      expect(mockPrisma.academyEnrollment.update).toHaveBeenCalledTimes(1);
    });

    it('returns a concurrently recorded keyed award after a unique key conflict', async () => {
      mockPrisma.xPEvent.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ amount: 10 });
      mockPrisma.xPEvent.create.mockRejectedValueOnce({ code: 'P2002' });

      expect(await service.recordXPEvent(input)).toEqual({ amount: 10 });
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(2);
      expect(mockPrisma.academyEnrollment.update).not.toHaveBeenCalled();
    });

    it('stops after three transaction conflicts and permits a later caller retry', async () => {
      const conflict = { code: 'P2034' };
      mockPrisma.$transaction.mockRejectedValue(conflict);

      await expect(service.recordXPEvent(input)).rejects.toBe(conflict);
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(3);
      expect(mockPrisma.xPEvent.create).not.toHaveBeenCalled();
    });
  });

  describe('caller transaction', () => {
    const input: RecordXPInput = {
      userId: 'user-1',
      courseId: 'course-1',
      source: 'lesson',
      amount: 20,
      idempotencyKey: 'lesson:submission-1',
    };

    function transactionClient() {
      return {
        course: {
          findUnique: jest.fn().mockResolvedValue({ academyId: 'academy-1' }),
        },
        xPEvent: {
          findUnique: jest.fn().mockResolvedValue(null),
          aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 490 } }),
          create: jest.fn().mockResolvedValue({}),
        },
        academyEnrollment: {
          findUnique: jest.fn().mockResolvedValue({ academy: { orgId: 'org-1' } }),
          update: jest.fn().mockResolvedValue({}),
        },
        courseEnrollment: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        userStreak: {
          upsert: jest.fn().mockResolvedValue({}),
        },
      };
    }

    it('uses the caller transaction for scope, the cap, and every award write', async () => {
      const tx = transactionClient();

      expect(await service.recordXPEvent(
        input,
        tx as unknown as Prisma.TransactionClient,
      )).toEqual({ amount: 10 });

      expect(tx.course.findUnique).toHaveBeenCalledWith({
        where: { id: 'course-1' },
        select: { academyId: true },
      });
      expect(tx.xPEvent.findUnique).toHaveBeenCalledTimes(1);
      expect(tx.xPEvent.aggregate).toHaveBeenCalledTimes(1);
      expect(tx.xPEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          academyId: 'academy-1',
          courseId: 'course-1',
          amount: 10,
        }),
      });
      expect(tx.academyEnrollment.update).toHaveBeenCalledTimes(1);
      expect(tx.courseEnrollment.updateMany).toHaveBeenCalledTimes(1);
      expect(tx.userStreak.upsert).toHaveBeenCalledTimes(1);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockPrisma.xPEvent.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.xPEvent.aggregate).not.toHaveBeenCalled();
      expect(mockPrisma.xPEvent.create).not.toHaveBeenCalled();
      expect(mockPrisma.academyEnrollment.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.academyEnrollment.update).not.toHaveBeenCalled();
      expect(mockPrisma.courseEnrollment.updateMany).not.toHaveBeenCalled();
      expect(mockPrisma.userStreak.upsert).not.toHaveBeenCalled();
    });

    it.each([
      { code: 'P2034' },
      { code: 'P2002' },
      new Error('streak unavailable'),
    ])('propagates transaction failures for the caller to roll back and retry: %p', async (error) => {
      const tx = transactionClient();
      tx.userStreak.upsert.mockRejectedValue(error);

      await expect(service.recordXPEvent(
        input,
        tx as unknown as Prisma.TransactionClient,
      )).rejects.toBe(error);

      expect(tx.userStreak.upsert).toHaveBeenCalledTimes(1);
      expect(tx.xPEvent.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('getXPSummary', () => {
    it('should return today, week, and total XP', async () => {
      mockPrisma.courseEnrollment.findUnique.mockResolvedValue({
        totalXPEarned: 250,
        dailyXPTarget: 40,
      });
      // today's XP
      mockPrisma.xPEvent.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 25 } })  // today
        .mockResolvedValueOnce({ _sum: { amount: 120 } }); // this week

      const summary = await service.getXPSummary('user-1', 'course-1');

      expect(summary).toEqual({
        today: 25,
        thisWeek: 120,
        total: 250,
        dailyTarget: 40,
        dailyCap: 500,
      });
    });
  });

  describe('getWeeklyXPBreakdown', () => {
    it('should return XP for each of the last 7 days', async () => {
      // Mock 7 days of events grouped by date
      const events = [
        { createdAt: new Date('2026-03-10'), amount: 30 },
        { createdAt: new Date('2026-03-09'), amount: 45 },
      ];
      mockPrisma.xPEvent.findMany.mockResolvedValue(events);

      const breakdown = await service.getWeeklyXPBreakdown('user-1', 'course-1');

      expect(breakdown).toHaveLength(7);
      // Each day should have { date: string, xp: number }
      expect(breakdown[0]).toHaveProperty('date');
      expect(breakdown[0]).toHaveProperty('xp');
    });
  });
});
