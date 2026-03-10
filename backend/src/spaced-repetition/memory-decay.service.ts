import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { decayMemory } from './fire-equations';

const DECAY_EPSILON = 0.001; // skip updates smaller than this

@Injectable()
export class MemoryDecayService {
  constructor(private prisma: PrismaService) {}

  /**
   * Recalculate memory for all of a student's concept states in a course,
   * applying exponential forgetting based on time since last practice.
   *
   * Should be called before task selection to ensure memory values are current.
   *
   * @param userId - The student
   * @param courseId - The course
   * @param now - Current time (injectable for testing)
   */
  async decayAllMemory(
    userId: string,
    courseId: string,
    now: Date = new Date(),
  ): Promise<void> {
    const states = await this.prisma.studentConceptState.findMany({
      where: {
        userId,
        concept: { courseId },
        masteryState: { not: 'unstarted' },
        lastPracticedAt: { not: null },
      },
      select: {
        userId: true,
        conceptId: true,
        memory: true,
        interval: true,
        lastPracticedAt: true,
        masteryState: true,
      },
    });

    const updates = states
      .filter((state) => state.lastPracticedAt != null && state.masteryState !== 'unstarted')
      .map((state) => {
        const daysSince =
          (now.getTime() - state.lastPracticedAt!.getTime()) / (1000 * 60 * 60 * 24);
        const decayed = decayMemory(state.memory, daysSince, state.interval);
        return { state, decayed };
      })
      .filter(({ state, decayed }) => Math.abs(state.memory - decayed) > DECAY_EPSILON);

    await Promise.all(
      updates.map(({ state, decayed }) =>
        this.prisma.studentConceptState.update({
          where: {
            userId_conceptId: { userId: state.userId, conceptId: state.conceptId },
          },
          data: { memory: decayed },
        }),
      ),
    );
  }
}
