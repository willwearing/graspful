import 'reflect-metadata';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { SubmitAnswerDto } from './submit-answer.dto';
import { SubmitReviewAnswerDto } from './submit-review-answer.dto';

const pipe = new ValidationPipe({ transform: true, whitelist: true });
const body = { problemId: 'problem-1', answer: 'A', responseTimeMs: 1 };

describe.each([SubmitAnswerDto, SubmitReviewAnswerDto])('%s answer validation', (metatype) => {
  const validate = (overrides: Record<string, unknown>) => pipe.transform(
    { ...body, sessionId: 'session-1', ...overrides },
    { type: 'body', metatype },
  );

  it.each([undefined, null, ''])('rejects missing answers: %s', async (answer) => {
    await expect(validate({ answer })).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 2_147_483_648])(
    'rejects response time outside the database integer range: %s',
    async (responseTimeMs) => {
      await expect(validate({ responseTimeMs })).rejects.toBeInstanceOf(BadRequestException);
    },
  );

  it.each([1, 2_147_483_647])('accepts supported response time %s', async (responseTimeMs) => {
    await expect(validate({ responseTimeMs })).resolves.toMatchObject({ responseTimeMs });
  });

  it.each([0, false, ['A', 'B'], { left: 'right' }])('accepts supported answer shapes: %s', async (answer) => {
    await expect(validate({ answer })).resolves.toMatchObject({ answer });
  });
});
