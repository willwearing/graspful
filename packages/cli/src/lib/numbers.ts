import { InvalidArgumentError } from 'commander';

export function positiveInteger(value: string): number {
  const parsed = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(parsed) || parsed < 1) {
    throw new InvalidArgumentError('Expected a positive integer.');
  }
  return parsed;
}
