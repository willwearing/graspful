import { Injectable } from '@nestjs/common';
import { EnrollmentService } from '@/student-model/enrollment.service';
import { StudentStateService } from '@/student-model/student-state.service';
import { decayMemory } from './fire-equations';

const DECAY_EPSILON = 0.001; // skip updates smaller than this

@Injectable()
export class MemoryDecayService {
  constructor(
    private enrollmentService: EnrollmentService,
    private studentState: StudentStateService,
  ) {}

  /**
   * Recalculate memory for all of a student's concept states in an academy,
   * applying exponential forgetting based on time since last practice.
   *
   * Should be called before task selection to ensure memory values are current.
   *
   * @param userId - The student
   * @param academyId - The academy
   * @param now - Current time (injectable for testing)
   */
  async decayAllMemory(
    userId: string,
    academyId: string,
    now: Date = new Date(),
  ): Promise<void> {
    const states = await this.studentState.getConceptStatesForDecay(userId, academyId);

    const updates = states
      .map((state) => {
        const daysSince =
          (now.getTime() - state.lastPracticedAt!.getTime()) / (1000 * 60 * 60 * 24);
        const decayed = decayMemory(state.memory, daysSince, state.interval);
        return { state, decayed };
      })
      .filter(({ state, decayed }) => Math.abs(state.memory - decayed) > DECAY_EPSILON);

    if (updates.length === 0) return;

    await this.studentState.batchDecayMemory(
      updates.map(({ state, decayed }) => ({
        userId: state.userId,
        conceptId: state.conceptId,
        memory: decayed,
      })),
    );
  }

  async decayCourseMemory(
    userId: string,
    courseId: string,
    now: Date = new Date(),
  ): Promise<void> {
    const academyId = await this.enrollmentService.getAcademyIdForCourse(courseId);
    await this.decayAllMemory(userId, academyId, now);
  }
}
