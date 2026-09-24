import { NotFoundException } from '@nestjs/common';
import { AcademyDiagnosticController } from './academy-diagnostic.controller';
import { DiagnosticSessionService } from './diagnostic-session.service';
import { PostHogService } from '@/shared/application/posthog.service';
import type { OrgContext } from '@/auth/org-context';

const org: OrgContext = { orgId: 'org-1', userId: 'learner', email: 'learner@example.test', role: 'member' };

describe('AcademyDiagnosticController session route scope', () => {
  const diagnostic = { startDiagnostic: jest.fn(), submitAnswer: jest.fn(), getResult: jest.fn() };
  const posthog = { capture: jest.fn() };
  let controller: AcademyDiagnosticController;

  beforeEach(() => {
    jest.resetAllMocks();
    controller = new AcademyDiagnosticController(
      diagnostic as unknown as DiagnosticSessionService,
      posthog as unknown as PostHogService,
    );
  });

  it('passes the route academy when submitting an answer', async () => {
    const input = { sessionId: 'session-1', answer: 'A', responseTimeMs: 1000 };
    const result = { sessionId: 'session-1', isComplete: true };
    diagnostic.submitAnswer.mockResolvedValue(result);
    await expect(controller.submitAnswer('academy-1', input, org)).resolves.toEqual(result);
    expect(diagnostic.submitAnswer).toHaveBeenCalledWith('session-1', 'learner', {
      answer: 'A', responseTimeMs: 1000,
    }, 'academy-1');
  });

  it('passes the route academy when reading a result', async () => {
    const result = { sessionId: 'session-1' };
    diagnostic.getResult.mockResolvedValue(result);
    await expect(controller.getResult('academy-1', 'session-1', org)).resolves.toEqual(result);
    expect(diagnostic.getResult).toHaveBeenCalledWith('session-1', 'learner', 'academy-1');
    expect(posthog.capture).toHaveBeenCalledWith({ distinctId: 'learner' }, 'diagnostic completed', {
      session_id: 'session-1', org_id: 'org-1',
    });
  });

  it('does not record completion when the session belongs to another academy', async () => {
    diagnostic.getResult.mockRejectedValue(new NotFoundException('Diagnostic session not found'));
    await expect(controller.getResult('academy-1', 'foreign-session', org)).rejects.toThrow(NotFoundException);
    expect(posthog.capture).not.toHaveBeenCalled();
  });
});
