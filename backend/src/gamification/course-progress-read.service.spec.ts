import { CourseProgressReadService } from './course-progress-read.service';
import {
  activeConceptWhere,
  activePrerequisiteEdgeWhere,
  activePrerequisiteEdgeWhereAcademy,
} from '@/knowledge-graph/active-course-content';

describe('CourseProgressReadService', () => {
  let service: CourseProgressReadService;
  let mockPrisma: any;
  let mockStudentState: any;

  beforeEach(() => {
    mockPrisma = {
      concept: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'concept-1', name: 'Grounding', sectionId: null },
          { id: 'concept-2', name: 'Bonding', sectionId: null },
        ]),
      },
      prerequisiteEdge: {
        findMany: jest.fn().mockResolvedValue([
          { sourceConceptId: 'concept-1', targetConceptId: 'concept-2' },
        ]),
      },
    };

    mockStudentState = {
      getConceptMasteryForIds: jest.fn().mockResolvedValue(
        new Map([['concept-1', 'mastered']]),
      ),
      getSectionStatesForAcademy: jest.fn().mockResolvedValue([]),
      getSectionStatesForCourse: jest.fn().mockResolvedValue([]),
    };

    service = new CourseProgressReadService(mockPrisma, mockStudentState);
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
      select: { id: true, name: true, sectionId: true },
      orderBy: { sortOrder: 'asc' },
    });
    expect(mockPrisma.prerequisiteEdge.findMany).toHaveBeenCalledWith({
      where: activePrerequisiteEdgeWhere('course-1'),
      select: { sourceConceptId: true, targetConceptId: true },
    });
  });

  it('returns academy graph with courseId attribution', async () => {
    mockPrisma.concept.findMany.mockResolvedValue([
      { id: 'concept-1', name: 'Grounding', courseId: 'course-a', sectionId: null },
      { id: 'concept-2', name: 'Bonding', courseId: 'course-a', sectionId: null },
      { id: 'concept-3', name: 'Wiring', courseId: 'course-b', sectionId: null },
    ]);
    mockPrisma.prerequisiteEdge.findMany.mockResolvedValue([
      { sourceConceptId: 'concept-1', targetConceptId: 'concept-3' },
    ]);
    mockStudentState.getConceptMasteryForIds.mockResolvedValue(
      new Map([['concept-1', 'mastered']]),
    );

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
      select: { id: true, name: true, courseId: true, sectionId: true },
      orderBy: { sortOrder: 'asc' },
    });
    expect(mockPrisma.prerequisiteEdge.findMany).toHaveBeenCalledWith({
      where: activePrerequisiteEdgeWhereAcademy('academy-1'),
      select: { sourceConceptId: true, targetConceptId: true },
    });
  });

  describe('locked section mastery override', () => {
    it('getGraph returns "unstarted" for concepts in locked sections even when DB mastery is "in_progress"', async () => {
      mockPrisma.concept.findMany.mockResolvedValue([
        { id: 'c1', name: 'Locked Concept', sectionId: 'sec-locked' },
        { id: 'c2', name: 'Unlocked Concept', sectionId: 'sec-open' },
      ]);
      mockPrisma.prerequisiteEdge.findMany.mockResolvedValue([]);
      mockStudentState.getSectionStatesForCourse.mockResolvedValue([
        { sectionId: 'sec-locked', status: 'locked' },
        { sectionId: 'sec-open', status: 'lesson_in_progress' },
      ]);
      mockStudentState.getConceptMasteryForIds.mockResolvedValue(
        new Map([
          ['c1', 'in_progress'],
          ['c2', 'in_progress'],
        ]),
      );

      const result = await service.getGraph('user-1', 'course-1');

      expect(result.concepts).toEqual([
        { id: 'c1', name: 'Locked Concept', masteryState: 'unstarted' },
        { id: 'c2', name: 'Unlocked Concept', masteryState: 'in_progress' },
      ]);
    });

    it('getGraph returns true mastery for concepts in unlocked sections', async () => {
      mockPrisma.concept.findMany.mockResolvedValue([
        { id: 'c1', name: 'In Progress', sectionId: 'sec-1' },
        { id: 'c2', name: 'Exam Ready', sectionId: 'sec-2' },
        { id: 'c3', name: 'Certified', sectionId: 'sec-3' },
        { id: 'c4', name: 'Needs Review', sectionId: 'sec-4' },
      ]);
      mockPrisma.prerequisiteEdge.findMany.mockResolvedValue([]);
      mockStudentState.getSectionStatesForCourse.mockResolvedValue([
        { sectionId: 'sec-1', status: 'lesson_in_progress' },
        { sectionId: 'sec-2', status: 'exam_ready' },
        { sectionId: 'sec-3', status: 'certified' },
        { sectionId: 'sec-4', status: 'needs_review' },
      ]);
      mockStudentState.getConceptMasteryForIds.mockResolvedValue(
        new Map([
          ['c1', 'in_progress'],
          ['c2', 'in_progress'],
          ['c3', 'mastered'],
          ['c4', 'needs_review'],
        ]),
      );

      const result = await service.getGraph('user-1', 'course-1');

      expect(result.concepts).toEqual([
        { id: 'c1', name: 'In Progress', masteryState: 'in_progress' },
        { id: 'c2', name: 'Exam Ready', masteryState: 'in_progress' },
        { id: 'c3', name: 'Certified', masteryState: 'mastered' },
        { id: 'c4', name: 'Needs Review', masteryState: 'needs_review' },
      ]);
    });

    it('getGraph returns true mastery for concepts with no section (sectionId is null)', async () => {
      mockPrisma.concept.findMany.mockResolvedValue([
        { id: 'c1', name: 'No Section', sectionId: null },
      ]);
      mockPrisma.prerequisiteEdge.findMany.mockResolvedValue([]);
      mockStudentState.getSectionStatesForCourse.mockResolvedValue([
        { sectionId: 'sec-locked', status: 'locked' },
      ]);
      mockStudentState.getConceptMasteryForIds.mockResolvedValue(
        new Map([['c1', 'mastered']]),
      );

      const result = await service.getGraph('user-1', 'course-1');

      expect(result.concepts).toEqual([
        { id: 'c1', name: 'No Section', masteryState: 'mastered' },
      ]);
    });

    it('getAcademyGraph returns "unstarted" for concepts in locked sections', async () => {
      mockPrisma.concept.findMany.mockResolvedValue([
        { id: 'c1', name: 'Locked', courseId: 'course-1', sectionId: 'sec-locked' },
        { id: 'c2', name: 'Open', courseId: 'course-1', sectionId: 'sec-open' },
      ]);
      mockPrisma.prerequisiteEdge.findMany.mockResolvedValue([]);
      mockStudentState.getSectionStatesForAcademy.mockResolvedValue([
        { sectionId: 'sec-locked', status: 'locked', courseId: 'course-1', section: { sortOrder: 0 } },
        { sectionId: 'sec-open', status: 'lesson_in_progress', courseId: 'course-1', section: { sortOrder: 1 } },
      ]);
      mockStudentState.getConceptMasteryForIds.mockResolvedValue(
        new Map([
          ['c1', 'mastered'],
          ['c2', 'in_progress'],
        ]),
      );

      const result = await service.getAcademyGraph('user-1', 'academy-1');

      expect(result.concepts).toEqual([
        { id: 'c1', name: 'Locked', courseId: 'course-1', masteryState: 'unstarted' },
        { id: 'c2', name: 'Open', courseId: 'course-1', masteryState: 'in_progress' },
      ]);
    });

    it('getAcademyGraph returns true mastery for concepts with null sectionId', async () => {
      mockPrisma.concept.findMany.mockResolvedValue([
        { id: 'c1', name: 'No Section', courseId: 'course-1', sectionId: null },
      ]);
      mockPrisma.prerequisiteEdge.findMany.mockResolvedValue([]);
      mockStudentState.getSectionStatesForAcademy.mockResolvedValue([
        { sectionId: 'sec-locked', status: 'locked', courseId: 'course-1', section: { sortOrder: 0 } },
      ]);
      mockStudentState.getConceptMasteryForIds.mockResolvedValue(
        new Map([['c1', 'mastered']]),
      );

      const result = await service.getAcademyGraph('user-1', 'academy-1');

      expect(result.concepts).toEqual([
        { id: 'c1', name: 'No Section', courseId: 'course-1', masteryState: 'mastered' },
      ]);
    });
  });
});
