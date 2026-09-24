import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaService } from '@/prisma/prisma.service';
import type { SubmitAnswerInput, SubmitAnswerResult } from './problem-submission-types';

interface SubmissionReceipt {
  kind: 'problem_answer';
  version: 1;
  requestHash: string;
  result: SubmitAnswerResult;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function submissionAttemptId(userId: string, requestId: string): string {
  const bytes = createHash('sha256').update(JSON.stringify([
    'graspful-problem-submission', userId, requestId,
  ])).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x80;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Apply scoring once, and keep its receipt in the same serializable transaction. */
export async function withProblemSubmissionReceipt(
  prisma: PrismaService,
  input: SubmitAnswerInput,
  applyAnswer: (attemptId: string, tx: Prisma.TransactionClient) => Promise<SubmitAnswerResult>,
): Promise<SubmitAnswerResult> {
  const requestId = input.requestId ?? randomUUID();
  const attemptId = submissionAttemptId(input.userId, requestId);
  const requestHash = createHash('sha256').update(canonicalJson({
    ...input,
    requestId,
    seenProblemIds: input.seenProblemIds ?? [],
    workedExampleReopenedKPIds: input.workedExampleReopenedKPIds ?? [],
  })).digest('hex');

  let result: SubmitAnswerResult;
  for (let attempt = 0; ; attempt++) {
    try {
      result = await prisma.$transaction(async (tx) => {
        const existing = await tx.problemAttempt.findUnique({ where: { id: attemptId } });
        if (existing) {
          const receipt = existing.submissionReceipt as unknown as SubmissionReceipt | null;
          if (existing.userId !== input.userId || existing.problemId !== input.problemId ||
              receipt?.kind !== 'problem_answer' || receipt.version !== 1 || receipt.requestHash !== requestHash) {
            throw new ConflictException('This request ID was already used for another answer');
          }
          return receipt.result;
        }

        const result = await applyAnswer(attemptId, tx);
        await tx.problemAttempt.update({
          where: { id: attemptId },
          data: {
            xpAwarded: result.xpAwarded,
            submissionReceipt: { kind: 'problem_answer', version: 1, requestHash, result } as unknown as Prisma.InputJsonValue,
          },
        });
        return result;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      break;
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (attempt >= 2 || (code !== 'P2034' && code !== 'P2002')) throw error;
    }
  }

  return result;
}
