import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class CourseProgressReadService {
  constructor(private prisma: PrismaService) {}

  async getGraph(userId: string, courseId: string) {
    const [concepts, edges] = await Promise.all([
      this.prisma.concept.findMany({
        where: { courseId },
        select: { id: true, name: true },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.prerequisiteEdge.findMany({
        where: {
          sourceConcept: { courseId },
        },
        select: { sourceConceptId: true, targetConceptId: true },
      }),
    ]);

    const states = await this.prisma.studentConceptState.findMany({
      where: { userId, conceptId: { in: concepts.map((concept) => concept.id) } },
      select: { conceptId: true, masteryState: true },
    });

    const stateMap = new Map(
      states.map((state) => [state.conceptId, state.masteryState]),
    );

    return {
      concepts: concepts.map((concept) => ({
        id: concept.id,
        name: concept.name,
        masteryState: stateMap.get(concept.id) ?? 'unstarted',
      })),
      edges: edges.map((edge) => ({
        sourceConceptId: edge.sourceConceptId,
        targetConceptId: edge.targetConceptId,
      })),
    };
  }
}
