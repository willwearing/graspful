import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { DiagnosticState, MasteryState } from '@prisma/client';

@Injectable()
export class StudentStateService {
  constructor(private prisma: PrismaService) {}

  async getConceptStates(userId: string, courseId: string) {
    return this.prisma.studentConceptState.findMany({
      where: {
        userId,
        concept: { courseId },
      },
      include: { concept: true },
    });
  }

  /**
   * Build a Map of conceptId -> P(L) for use by diagnostic algorithms.
   * Uses BKT prior (0.5) for unstarted concepts.
   */
  async getMasteryMap(userId: string, courseId: string): Promise<Map<string, number>> {
    const states = await this.prisma.studentConceptState.findMany({
      where: {
        userId,
        concept: { courseId },
      },
      select: { conceptId: true, masteryState: true, memory: true },
    });

    const map = new Map<string, number>();
    for (const state of states) {
      // memory field stores the running P(L) estimate
      // Default 1.0 from schema means "unobserved" -- map to prior 0.5
      const pL = state.memory === 1.0 && state.masteryState === 'unstarted' ? 0.5 : state.memory;
      map.set(state.conceptId, pL);
    }
    return map;
  }

  async updateConceptDiagnosticState(
    userId: string,
    conceptId: string,
    diagnosticState: DiagnosticState,
    pL: number,
  ) {
    const masteryState = this.diagnosticToMasteryState(diagnosticState);

    return this.prisma.studentConceptState.update({
      where: { userId_conceptId: { userId, conceptId } },
      data: {
        diagnosticState,
        masteryState,
        memory: pL,
      },
    });
  }

  async bulkUpdateMasteries(
    userId: string,
    updates: Map<string, number>,
  ) {
    const promises = Array.from(updates.entries()).map(([conceptId, pL]) =>
      this.prisma.studentConceptState.update({
        where: { userId_conceptId: { userId, conceptId } },
        data: { memory: pL },
      }),
    );
    return Promise.all(promises);
  }

  async updateSpeedParameters(
    userId: string,
    abilityTheta: number,
    speedRD: number,
    conceptSpeeds: Map<string, number>,
  ) {
    const promises = Array.from(conceptSpeeds.entries()).map(
      ([conceptId, speed]) =>
        this.prisma.studentConceptState.update({
          where: { userId_conceptId: { userId, conceptId } },
          data: { speed, abilityTheta, speedRD },
        }),
    );
    return Promise.all(promises);
  }

  async markDiagnosticComplete(userId: string, courseId: string) {
    return this.prisma.courseEnrollment.update({
      where: { userId_courseId: { userId, courseId } },
      data: {
        diagnosticCompleted: true,
        diagnosticCompletedAt: new Date(),
      },
    });
  }

  private diagnosticToMasteryState(ds: DiagnosticState): MasteryState {
    switch (ds) {
      case 'mastered':
        return 'mastered';
      case 'conditionally_mastered':
      case 'partially_known':
        return 'in_progress';
      case 'unknown':
      default:
        return 'unstarted';
    }
  }
}
