import { NotFoundException } from '@nestjs/common';
import { AcademyLearningEngineController } from './academy-learning-engine.controller';
import type { LearningEngineService } from './learning-engine.service';
import type { StudentStateService } from '@/student-model/student-state.service';
import type { OrgContext } from '@/auth/guards/org-membership.guard';

describe('AcademyLearningEngineController access', () => {
  const org = { orgId: 'org-1', userId: 'learner', role: 'member' } as OrgContext;
  let engine: { getNextTask: jest.Mock; getStudySession: jest.Mock };
  let studentState: { assertAcademyAccess: jest.Mock };
  let controller: AcademyLearningEngineController;

  beforeEach(() => {
    engine = { getNextTask: jest.fn().mockResolvedValue({ taskType: 'lesson' }), getStudySession: jest.fn().mockResolvedValue({ tasks: [] }) };
    studentState = { assertAcademyAccess: jest.fn().mockResolvedValue({ id: 'academy-1', orgId: 'org-1' }) };
    controller = new AcademyLearningEngineController(
      engine as unknown as LearningEngineService,
      studentState as unknown as StudentStateService,
    );
  });

  it.each(['getNextTask', 'getStudySession'] as const)('passes authorized academy %s to the engine', async (method) => {
    await controller[method]('academy-1', org);
    expect(studentState.assertAcademyAccess).toHaveBeenCalledWith('learner', 'org-1', 'academy-1');
    expect(engine[method]).toHaveBeenCalledWith('learner', 'academy-1');
  });

  it.each(['getNextTask', 'getStudySession'] as const)('rejects unauthorized academy %s before any study work', async (method) => {
    studentState.assertAcademyAccess.mockRejectedValue(new NotFoundException('Academy or enrollment not found'));
    await expect(controller[method]('foreign-academy', org)).rejects.toThrow(NotFoundException);
    expect(studentState.assertAcademyAccess).toHaveBeenCalledWith('learner', 'org-1', 'foreign-academy');
    expect(engine.getNextTask).not.toHaveBeenCalled();
    expect(engine.getStudySession).not.toHaveBeenCalled();
  });
});
