import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { StudentStateService } from '@/student-model/student-state.service';
import {
  activeConceptWhere,
  activePrerequisiteEdgeWhere,
  activePrerequisiteEdgeWhereAcademy,
} from '@/knowledge-graph/active-course-content';

@Injectable()
export class CourseProgressReadService {
  constructor(
    private prisma: PrismaService,
    private studentState: StudentStateService,
  ) {}

  async getAcademyGraph(userId: string, academyId: string) {
    const [concepts, edges, sectionStates] = await Promise.all([
      this.prisma.concept.findMany({
        where: activeConceptWhere({ course: { academyId } }),
        select: { id: true, name: true, courseId: true, sectionId: true },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.prerequisiteEdge.findMany({
        where: activePrerequisiteEdgeWhereAcademy(academyId),
        select: { sourceConceptId: true, targetConceptId: true },
      }),
      this.studentState.getSectionStatesForAcademy(userId, academyId),
    ]);

    const lockedSectionIds = new Set(
      sectionStates
        .filter((s) => s.status === 'locked')
        .map((s) => s.sectionId),
    );

    const stateMap = await this.studentState.getConceptMasteryForIds(
      userId,
      concepts.map((concept) => concept.id),
    );

    return {
      concepts: concepts.map((concept) => ({
        id: concept.id,
        name: concept.name,
        courseId: concept.courseId,
        masteryState:
          concept.sectionId && lockedSectionIds.has(concept.sectionId)
            ? 'unstarted'
            : (stateMap.get(concept.id) ?? 'unstarted'),
      })),
      edges: edges.map((edge) => ({
        sourceConceptId: edge.sourceConceptId,
        targetConceptId: edge.targetConceptId,
      })),
    };
  }

  async getGraph(userId: string, courseId: string) {
    const [concepts, edges, sectionStates] = await Promise.all([
      this.prisma.concept.findMany({
        where: activeConceptWhere({ courseId }),
        select: { id: true, name: true, sectionId: true },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.prerequisiteEdge.findMany({
        where: activePrerequisiteEdgeWhere(courseId),
        select: { sourceConceptId: true, targetConceptId: true },
      }),
      this.studentState.getSectionStatesForCourse(userId, courseId),
    ]);

    const lockedSectionIds = new Set(
      sectionStates
        .filter((s) => s.status === 'locked')
        .map((s) => s.sectionId),
    );

    const stateMap = await this.studentState.getConceptMasteryForIds(
      userId,
      concepts.map((concept) => concept.id),
    );

    return {
      concepts: concepts.map((concept) => ({
        id: concept.id,
        name: concept.name,
        masteryState:
          concept.sectionId && lockedSectionIds.has(concept.sectionId)
            ? 'unstarted'
            : (stateMap.get(concept.id) ?? 'unstarted'),
      })),
      edges: edges.map((edge) => ({
        sourceConceptId: edge.sourceConceptId,
        targetConceptId: edge.targetConceptId,
      })),
    };
  }
}
