import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { DiagnosticState, MasteryState } from '@prisma/client';
import { getLogger, SeverityNumber } from '../telemetry/otel-logger';

const logger = getLogger('student-model');

@Injectable()
export class StudentStateService {
  constructor(private prisma: PrismaService) {}

  async getConceptStates(userId: string, courseId: string) {
    await this.ensureConceptStates(userId, courseId);

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
    await this.ensureConceptStates(userId, courseId);

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

    logger.emit({
      severityNumber: SeverityNumber.INFO,
      severityText: 'INFO',
      body: `Mastery updated`,
      attributes: { 'user.id': userId, 'concept.id': conceptId, 'mastery.state': masteryState, 'mastery.pL': pL },
    });

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

  async isDiagnosticCompleted(userId: string, courseId: string): Promise<boolean> {
    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { diagnosticCompleted: true },
    });
    return enrollment?.diagnosticCompleted ?? false;
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

  /**
   * Course content can change after a learner enrolls.
   * Keep concept-state rows in sync so diagnostics and graph coloring
   * always operate on the full current course graph.
   */
  private async ensureConceptStates(userId: string, courseId: string) {
    const [concepts, existingStates] = await Promise.all([
      this.prisma.concept.findMany({
        where: { courseId },
        select: { id: true },
      }),
      this.prisma.studentConceptState.findMany({
        where: {
          userId,
          concept: { courseId },
        },
        select: { conceptId: true },
      }),
    ]);

    const existingConceptIds = new Set(existingStates.map((state) => state.conceptId));
    const missingConceptIds = concepts
      .map((concept) => concept.id)
      .filter((conceptId) => !existingConceptIds.has(conceptId));

    if (missingConceptIds.length === 0) {
      return;
    }

    await this.prisma.studentConceptState.createMany({
      data: missingConceptIds.map((conceptId) => ({
        userId,
        conceptId,
      })),
      skipDuplicates: true,
    });
  }
}
