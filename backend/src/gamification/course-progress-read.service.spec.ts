import { CourseProgressReadService } from './course-progress-read.service';
import {
  activeConceptWhere,
  activePrerequisiteEdgeWhere,
  activePrerequisiteEdgeWhereAcademy,
} from '@/knowledge-graph/active-course-content';

describe('CourseProgressReadService', () => {
  let service: CourseProgressReadService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      concept: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'concept-1', name: 'Grounding' },
          { id: 'concept-2', name: 'Bonding' },
        ]),
      },
      prerequisiteEdge: {
        findMany: jest.fn().mockResolvedValue([
          { sourceConceptId: 'concept-1', targetConceptId: 'concept-2' },
        ]),
      },
      studentConceptState: {
        findMany: jest.fn().mockResolvedValue([
          { conceptId: 'concept-1', masteryState: 'mastered' },
        ]),
      },
    };

    service = new CourseProgressReadService(mockPrisma);
  });

  it('returns graph data with learner mastery overlay', async () => {
    await expect(service.getGraph('user-1', 'course-1')).resolves.toEqual({
      concepts: [
        { id: 'concept-1', name: 'Grounding', masteryState: 'mastered' },
        { id: 'concept-2', name: 'Bonding', masteryState: 'unstarted' },
      ],
      edges: [
        { sourceConceptId: 'concept-1', targetConceptId: 'concept-2' },
      ],
    });

    expect(mockPrisma.concept.findMany).toHaveBeenCalledWith({
      where: activeConceptWhere({ courseId: 'course-1' }),
      select: { id: true, name: true },
      orderBy: { sortOrder: 'asc' },
    });
    expect(mockPrisma.prerequisiteEdge.findMany).toHaveBeenCalledWith({
      where: activePrerequisiteEdgeWhere('course-1'),
      select: { sourceConceptId: true, targetConceptId: true },
    });
  });

  it('returns academy graph with courseId attribution', async () => {
    mockPrisma.concept.findMany.mockResolvedValue([
      { id: 'concept-1', name: 'Grounding', courseId: 'course-a' },
      { id: 'concept-2', name: 'Bonding', courseId: 'course-a' },
      { id: 'concept-3', name: 'Wiring', courseId: 'course-b' },
    ]);
    mockPrisma.prerequisiteEdge.findMany.mockResolvedValue([
      { sourceConceptId: 'concept-1', targetConceptId: 'concept-3' },
    ]);
    mockPrisma.studentConceptState.findMany.mockResolvedValue([
      { conceptId: 'concept-1', masteryState: 'mastered' },
    ]);

    const result = await service.getAcademyGraph('user-1', 'academy-1');

    expect(result.concepts).toHaveLength(3);
    expect(result.concepts[0]).toEqual({
      id: 'concept-1',
      name: 'Grounding',
      courseId: 'course-a',
      masteryState: 'mastered',
    });
    expect(result.concepts[2]).toEqual({
      id: 'concept-3',
      name: 'Wiring',
      courseId: 'course-b',
      masteryState: 'unstarted',
    });
    expect(result.edges).toHaveLength(1);

    expect(mockPrisma.concept.findMany).toHaveBeenCalledWith({
      where: activeConceptWhere({ course: { academyId: 'academy-1' } }),
      select: { id: true, name: true, courseId: true },
      orderBy: { sortOrder: 'asc' },
    });
    expect(mockPrisma.prerequisiteEdge.findMany).toHaveBeenCalledWith({
      where: activePrerequisiteEdgeWhereAcademy('academy-1'),
      select: { sourceConceptId: true, targetConceptId: true },
    });
  });
});
