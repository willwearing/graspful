import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { AcademyScopeGuard, OrgMembershipGuard, SupabaseAuthGuard } from '@/auth';
import { REQUIRE_ENROLLMENT_KEY } from '@/auth/decorators/require-enrollment.decorator';
import type { OrgContext } from '@/auth/org-context';
import { PostHogService } from '@/shared/application/posthog.service';
import { AcademyStudentModelController } from './academy-student-model.controller';
import { EnrollmentService } from './enrollment.service';
import { AcademyProgressQueryService } from './queries/academy-progress.query';
import { StudentStateService } from './student-state.service';

describe('AcademyStudentModelController', () => {
  const academyId = 'academy-1';
  const org: OrgContext = {
    userId: 'student-1',
    orgId: 'org-1',
    email: 'student@example.com',
    role: 'member',
  };
  let controller: AcademyStudentModelController;
  let studentState: { getConceptStatesForAcademy: jest.Mock };
  let academyProgress: { getCourseMasterySummary: jest.Mock; getProfileSummary: jest.Mock };
  let enrollment: { enrollInAcademy: jest.Mock };
  let posthog: { capture: jest.Mock };

  beforeEach(() => {
    studentState = { getConceptStatesForAcademy: jest.fn() };
    academyProgress = { getCourseMasterySummary: jest.fn(), getProfileSummary: jest.fn() };
    enrollment = { enrollInAcademy: jest.fn() };
    posthog = { capture: jest.fn() };
    controller = new AcademyStudentModelController(
      enrollment as unknown as EnrollmentService,
      studentState as unknown as StudentStateService,
      academyProgress as unknown as AcademyProgressQueryService,
      posthog as unknown as PostHogService,
    );
  });

  it('checks authentication, membership, and academy scope in order', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, AcademyStudentModelController)).toEqual([
      SupabaseAuthGuard, OrgMembershipGuard, AcademyScopeGuard,
    ]);
  });

  it.each([
    ['getMastery', true],
    ['getCourseMastery', true],
    ['getProfile', true],
    ['enroll', false],
  ] as const)('requires enrollment for %s: %s', (method, expected) => {
    expect(new Reflector().getAllAndOverride(REQUIRE_ENROLLMENT_KEY, [
      AcademyStudentModelController.prototype[method], AcademyStudentModelController,
    ])).toBe(expected);
  });

  it.each([
    ['getMastery', 'getConceptStatesForAcademy'],
    ['getCourseMastery', 'getCourseMasterySummary'],
    ['getProfile', 'getProfileSummary'],
  ] as const)('%s reads the current student and academy data', async (method, queryMethod) => {
    const response = { academyId, userId: org.userId };
    const query = queryMethod === 'getConceptStatesForAcademy'
      ? studentState[queryMethod]
      : academyProgress[queryMethod];
    query.mockResolvedValue(response);

    await expect(controller[method](academyId, org)).resolves.toBe(response);

    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith(org.userId, academyId);
  });

  it('enrolls the current student and reports the completed enrollment', async () => {
    const result = { id: 'enrollment-1', academyId, userId: org.userId };
    enrollment.enrollInAcademy.mockResolvedValue(result);

    await expect(controller.enroll(academyId, org)).resolves.toEqual(result);

    expect(enrollment.enrollInAcademy).toHaveBeenCalledWith(org.orgId, org.userId, academyId);
    expect(posthog.capture).toHaveBeenCalledWith(
      { distinctId: org.userId }, 'student enrolled', { academy_id: academyId, org_id: org.orgId },
    );
  });

  it('does not report enrollment when the enrollment service rejects it', async () => {
    enrollment.enrollInAcademy.mockRejectedValue(new Error('Enrollment unavailable'));

    await expect(controller.enroll(academyId, org)).rejects.toThrow('Enrollment unavailable');

    expect(posthog.capture).not.toHaveBeenCalled();
  });
});
