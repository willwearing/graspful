import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { SupabaseAuthGuard, OrgMembershipGuard, AcademyScopeGuard } from '@/auth';
import { REQUIRE_ENROLLMENT_KEY } from '@/auth/decorators/require-enrollment.decorator';
import { AcademyLearningEngineController } from './academy-learning-engine.controller';
import type { LearningEngineService } from './learning-engine.service';
import type { OrgContext } from '@/auth/org-context';

describe('AcademyLearningEngineController', () => {
  const org = { orgId: 'org-1', userId: 'learner', role: 'member' } as OrgContext;
  let engine: { getNextTask: jest.Mock; getStudySession: jest.Mock };
  let controller: AcademyLearningEngineController;

  beforeEach(() => {
    engine = {
      getNextTask: jest.fn().mockResolvedValue({ taskType: 'lesson' }),
      getStudySession: jest.fn().mockResolvedValue({ tasks: [] }),
    };
    controller = new AcademyLearningEngineController(engine as unknown as LearningEngineService);
  });

  it('checks authentication, membership, and academy scope in order', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, AcademyLearningEngineController)).toEqual([
      SupabaseAuthGuard, OrgMembershipGuard, AcademyScopeGuard,
    ]);
  });

  it.each(['getNextTask', 'getStudySession'] as const)('requires enrollment for %s', (method) => {
    expect(new Reflector().getAllAndOverride(REQUIRE_ENROLLMENT_KEY, [
      AcademyLearningEngineController.prototype[method], AcademyLearningEngineController,
    ])).toBe(true);
  });

  it.each(['getNextTask', 'getStudySession'] as const)(
    'passes the current learner and academy to %s',
    async (method) => {
      const response = { academyId: 'academy-1', taskType: 'lesson' };
      engine[method].mockResolvedValue(response);

      const result = await controller[method]('academy-1', org);

      expect(engine[method]).toHaveBeenCalledWith('learner', 'academy-1');
      expect(result).toEqual(response);
    },
  );
});
