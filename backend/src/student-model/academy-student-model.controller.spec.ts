import { NotFoundException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { OrgMembershipGuard, SupabaseAuthGuard } from '@/auth';
import type { OrgContext } from '@/auth/guards/org-membership.guard';
import { PostHogService } from '@/shared/application/posthog.service';
import { AcademyStudentModelController } from './academy-student-model.controller';
import { EnrollmentService } from './enrollment.service';
import { AcademyProgressQueryService } from './queries/academy-progress.query';
import { StudentStateService } from './student-state.service';

describe('AcademyStudentModelController access control', () => {
  const academyId = 'academy-1';
  const org: OrgContext = {
    userId: 'student-1',
    orgId: 'org-1',
    email: 'student@example.com',
    role: 'member',
  };
  let controller: AcademyStudentModelController;
  let studentState: {
    assertAcademyAccess: jest.Mock;
    getConceptStatesForAcademy: jest.Mock;
  };
  let academyProgress: {
    getCourseMasterySummary: jest.Mock;
    getProfileSummary: jest.Mock;
  };

  beforeEach(() => {
    studentState = {
      assertAcademyAccess: jest.fn(),
      getConceptStatesForAcademy: jest.fn(),
    };
    academyProgress = {
      getCourseMasterySummary: jest.fn(),
      getProfileSummary: jest.fn(),
    };
    controller = new AcademyStudentModelController(
      { enrollInAcademy: jest.fn() } as unknown as EnrollmentService,
      studentState as unknown as StudentStateService,
      academyProgress as unknown as AcademyProgressQueryService,
      { capture: jest.fn() } as unknown as PostHogService,
    );
  });

  function expectNoQueries() {
    expect(studentState.getConceptStatesForAcademy).not.toHaveBeenCalled();
    expect(academyProgress.getCourseMasterySummary).not.toHaveBeenCalled();
    expect(academyProgress.getProfileSummary).not.toHaveBeenCalled();
  }

  it('requires authentication and organization membership', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, AcademyStudentModelController),
    ).toEqual(expect.arrayContaining([SupabaseAuthGuard, OrgMembershipGuard]));
  });

  describe.each([
    ['getMastery', 'getConceptStatesForAcademy'],
    ['getCourseMastery', 'getCourseMasterySummary'],
    ['getProfile', 'getProfileSummary'],
  ] as const)('%s', (method, queryMethod) => {
    it('waits for academy access approval before reading the current student data', async () => {
      let allowAccess!: () => void;
      studentState.assertAcademyAccess.mockReturnValue(
        new Promise<void>((resolve) => {
          allowAccess = resolve;
        }),
      );
      const response = { academyId, userId: org.userId };
      const query = queryMethod === 'getConceptStatesForAcademy'
        ? studentState[queryMethod]
        : academyProgress[queryMethod];
      query.mockResolvedValue(response);

      const result = controller[method](academyId, org);

      expect(studentState.assertAcademyAccess).toHaveBeenCalledTimes(1);
      expect(studentState.assertAcademyAccess).toHaveBeenCalledWith(
        org.userId,
        org.orgId,
        academyId,
      );
      expectNoQueries();

      allowAccess();

      await expect(result).resolves.toBe(response);
      expect(query).toHaveBeenCalledTimes(1);
      expect(query).toHaveBeenCalledWith(org.userId, academyId);
    });

    it('returns the access error without reading or creating student data', async () => {
      const denied = new NotFoundException('Academy not found');
      studentState.assertAcademyAccess.mockRejectedValue(denied);

      await expect(controller[method](academyId, org)).rejects.toBe(denied);

      expect(studentState.assertAcademyAccess).toHaveBeenCalledTimes(1);
      expect(studentState.assertAcademyAccess).toHaveBeenCalledWith(
        org.userId,
        org.orgId,
        academyId,
      );
      expectNoQueries();
    });
  });
});
