import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { StudentStateService } from '@/student-model/student-state.service';
import { GraphQueryService } from '@/knowledge-graph/graph-query.service';
import { RemediationService } from './remediation.service';
import { selectNextTask } from './task-selector';
import { generateStudySession } from './session-generator';
import { detectPlateau, findWeakPrerequisites } from './plateau-detector';
import {
  ConceptSnapshot,
  SimpleEdge,
  TaskRecommendation,
  StudySession,
} from './types';

@Injectable()
export class LearningEngineService {
  constructor(
    private prisma: PrismaService,
    private studentState: StudentStateService,
    private graphQuery: GraphQueryService,
    private remediationService: RemediationService,
  ) {}

  async getNextTask(
    userId: string,
    courseId: string,
  ): Promise<TaskRecommendation> {
    const { snapshots, edges, frontier } = await this.buildContext(
      userId,
      courseId,
    );

    // Detect plateaus and create remediations proactively
    await this.syncRemediations(userId, courseId, snapshots, edges);

    // Filter frontier to exclude blocked concepts
    const blockedIds = await this.remediationService.getBlockedConceptIds(
      userId,
      courseId,
    );
    const availableFrontier = frontier.filter((id) => !blockedIds.has(id));

    // TODO: Track XP since last quiz properly. For now, use 0.
    const xpSinceLastQuiz = 0;

    const task = selectNextTask(snapshots, edges, availableFrontier, xpSinceLastQuiz);

    return task;
  }

  async getStudySession(
    userId: string,
    courseId: string,
    dailyXPTarget: number,
  ): Promise<StudySession> {
    const { snapshots, edges, frontier } = await this.buildContext(
      userId,
      courseId,
    );

    const blockedIds = await this.remediationService.getBlockedConceptIds(
      userId,
      courseId,
    );
    const availableFrontier = frontier.filter((id) => !blockedIds.has(id));

    // TODO: Track XP since last quiz properly. For now, use 0.
    const xpSinceLastQuiz = 0;

    return generateStudySession(
      snapshots,
      edges,
      availableFrontier,
      dailyXPTarget,
      xpSinceLastQuiz,
    );
  }

  /**
   * Build the context needed by pure functions: snapshots, edges, frontier.
   */
  private async buildContext(userId: string, courseId: string) {
    // Fetch concept states and edges in parallel
    const [conceptStates, concepts, prereqEdges] = await Promise.all([
      this.studentState.getConceptStates(userId, courseId),
      this.prisma.concept.findMany({
        where: { courseId },
        select: { id: true },
      }),
      this.prisma.prerequisiteEdge.findMany({
        where: {
          sourceConcept: { courseId },
        },
        select: { sourceConceptId: true, targetConceptId: true },
      }),
    ]);

    const snapshots: ConceptSnapshot[] = conceptStates.map((s) => ({
      conceptId: s.conceptId,
      masteryState: s.masteryState as ConceptSnapshot['masteryState'],
      memory: s.memory,
      failCount: s.failCount,
    }));

    const edges: SimpleEdge[] = prereqEdges.map((e) => ({
      source: e.sourceConceptId,
      target: e.targetConceptId,
    }));

    const conceptIds = concepts.map((c) => c.id);
    const masteredIds = new Set(
      snapshots
        .filter((s) => s.masteryState === 'mastered')
        .map((s) => s.conceptId),
    );

    const frontier = this.graphQuery.knowledgeFrontier(
      conceptIds,
      edges,
      masteredIds,
    );

    return { snapshots, edges, frontier };
  }

  /**
   * Detect plateaued concepts and create remediation records
   * for any weak prerequisites found.
   */
  private async syncRemediations(
    userId: string,
    courseId: string,
    snapshots: ConceptSnapshot[],
    edges: SimpleEdge[],
  ) {
    for (const snap of snapshots) {
      if (detectPlateau(snap)) {
        const weakPrereqs = findWeakPrerequisites(
          snap.conceptId,
          edges,
          snapshots,
        );
        for (const prereqId of weakPrereqs) {
          await this.remediationService.createRemediation(
            userId,
            courseId,
            snap.conceptId,
            prereqId,
          );
        }
      }
    }
  }
}
