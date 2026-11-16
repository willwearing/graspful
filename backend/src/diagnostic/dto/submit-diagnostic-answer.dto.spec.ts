import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SubmitDiagnosticAnswerDto } from './submit-diagnostic-answer.dto';

describe('diagnostic answer validation', () => {
  const base = { sessionId: 'session-1', answer: '0', responseTimeMs: 1000 };
  const check = (input: object) => validate(plainToInstance(SubmitDiagnosticAnswerDto, input), { whitelist: true, forbidNonWhitelisted: true });

  it('accepts question identity without losing it in the API validation pipe', async () => {
    expect(await check({ ...base, expectedProblemId: 'problem-1', questionNumber: 1 })).toEqual([]);
  });

  it.each(['0', 0, false, ['first', 'second'], { first: 'second' }])('accepts legacy clients and answer representation %j', async (answer) => {
    expect(await check({ ...base, answer })).toEqual([]);
  });

  it.each([
    { expectedProblemId: '' }, { expectedProblemId: 1 },
    { questionNumber: 0 }, { questionNumber: 1.5 }, { questionNumber: '1' },
  ])('rejects invalid question identity %j', async (identity) => {
    expect((await check({ ...base, ...identity })).length).toBeGreaterThan(0);
  });
});
