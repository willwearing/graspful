jest.mock('./student-state.service', () => ({
  StudentStateService: class StudentStateService {},
}));

jest.mock('@/assessment/section-exam.service', () => ({
  SectionExamService: class SectionExamService {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { StudentModelController } from './student-model.controller';
import { EnrollmentService } from './enrollment.service';
import { StudentStateService } from './student-state.service';
import { SectionExamService } from '@/assessment/section-exam.service';
import { SupabaseAuthGuard, OrgMembershipGuard } from '@/auth';

const mockGuard = { canActivate: () => true };

describe('StudentModelController', () => {
  let controller: StudentModelController;
  let mockEnrollment: any;
  let mockStudentState: any;
  let mockSectionExam: any;

  beforeEach(async () => {
    mockEnrollment = {
      enrollStudent: jest.fn(),
    };

    mockStudentState = {
      getAcademyIdForCourse: jest.fn(),
      getConceptStates: jest.fn(),
      getMasteryMap: jest.fn(),
      isDiagnosticCompleted: jest.fn(),
      getProfileSummary: jest.fn(),
    };

    mockSectionExam = {
      getSectionStates: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudentModelController],
      providers: [
        { provide: EnrollmentService, useValue: mockEnrollment },
        { provide: StudentStateService, useValue: mockStudentState },
        { provide: SectionExamService, useValue: mockSectionExam },
      ],
    })
      .overrideGuard(SupabaseAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(OrgMembershipGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get(StudentModelController);
  });

  describe('enroll', () => {
    it('should enroll the current user in a course', async () => {
      const enrollment = { id: 'e1', userId: 'u1', courseId: 'c1' };
      mockEnrollment.enrollStudent.mockResolvedValue(enrollment);

      const orgCtx = { orgId: 'org-1', userId: 'u1', email: 'a@b.com', role: 'member' };
      const result = await controller.enroll('c1', orgCtx as any);

      expect(result).toEqual(enrollment);
      expect(mockEnrollment.enrollStudent).toHaveBeenCalledWith('org-1', 'u1', 'c1');
    });
  });

  describe('getMastery', () => {
    it('should return concept states for the current user', async () => {
      const states = [
        { conceptId: 'c1', masteryState: 'mastered', concept: { name: 'Concept 1' } },
      ];
      mockStudentState.getConceptStates.mockResolvedValue(states);

      const orgCtx = { orgId: 'org-1', userId: 'u1', email: 'a@b.com', role: 'member' };
      const result = await controller.getMastery('course-1', orgCtx as any);

      expect(result).toEqual(states);
      expect(mockStudentState.getConceptStates).toHaveBeenCalledWith('u1', 'course-1');
    });
  });

  describe('getProfile', () => {
    it('should return mastery breakdown with counts', async () => {
      const states = [
        { conceptId: 'c1', masteryState: 'mastered' },
        { conceptId: 'c2', masteryState: 'mastered' },
        { conceptId: 'c3', masteryState: 'unstarted' },
        { conceptId: 'c4', masteryState: 'in_progress' },
      ];
      mockStudentState.getProfileSummary.mockResolvedValue({
        totalConcepts: 4,
        mastered: 2,
        inProgress: 1,
        needsReview: 0,
        unstarted: 1,
        completionPercent: 50,
        diagnosticCompleted: true,
      });
      mockSectionExam.getSectionStates.mockResolvedValue([
        { status: 'certified' },
        { status: 'exam_ready' },
      ]);

      const orgCtx = { orgId: 'org-1', userId: 'u1', email: 'a@b.com', role: 'member' };
      const result = await controller.getProfile('course-1', orgCtx as any);

      expect(result.totalConcepts).toBe(4);
      expect(result.mastered).toBe(2);
      expect(result.inProgress).toBe(1);
      expect(result.unstarted).toBe(1);
      expect(result.completionPercent).toBeCloseTo(50);
      expect(result.diagnosticCompleted).toBe(true);
      expect(result.certifiedSections).toBe(1);
      expect(result.examReadySections).toBe(1);
      expect(mockStudentState.getProfileSummary).toHaveBeenCalledWith('u1', 'course-1');
    });
  });
});
