import { CourseProgressReadService } from './course-progress-read.service';

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
  });
});
