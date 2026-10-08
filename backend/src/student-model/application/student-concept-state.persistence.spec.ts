import { Prisma } from '@prisma/client';
import {
  persistDiagnosticStates,
  persistMemoryDecay,
  persistRepetitionStates,
} from './student-concept-state.persistence';

const decayRow = (conceptId: string) => ({
  conceptId, memory: 0.4, expectedMemory: 0.8, expectedInterval: 7,
  expectedLastPracticedAt: new Date('2026-03-03T12:00:00Z'),
  expectedMasteryState: 'mastered' as const,
});

const writers = [
  ['diagnostic', (tx: any, ids: string[]) => persistDiagnosticStates(tx, 'user-id', ids.map((conceptId) => ({
    conceptId, diagnosticState: 'unknown' as const, masteryState: 'unstarted' as const, pL: 0.1, speed: 1,
  })), 1.25, 250)],
  ['repetition', (tx: any, ids: string[]) => persistRepetitionStates(tx, 'user-id', ids.map((conceptId) => ({
    conceptId, repNum: 2, memory: 0.7, interval: 7,
  })))],
  ['decay', (tx: any, ids: string[]) => persistMemoryDecay(tx, 'user-id', ids.map(decayRow))],
] as const;

describe.each(writers)('%s bulk persistence', (_name, write) => {
  it.each([1, 140, 1000, 1001])('bounds database requests for %i concepts', async (size) => {
    const tx = { $executeRaw: jest.fn().mockResolvedValue(1) };
    await write(tx, Array.from({ length: size }, (_, index) => `concept-${index}`));
    expect(tx.$executeRaw).toHaveBeenCalledTimes(Math.ceil(size / 1000));
    const savedRows = tx.$executeRaw.mock.calls.flatMap((call) => {
      const [sql, ...values] = call;
      expect(sql.join('?')).toContain('state.user_id = ?::uuid');
      expect(sql.join('?')).not.toContain('user-id');
      expect(values).toContain('user-id');
      const rows = JSON.parse(values.find((value: unknown) => typeof value === 'string' && value.startsWith('['))!);
      expect(rows.length).toBeLessThanOrEqual(1000);
      return rows;
    });
    expect(savedRows).toHaveLength(size);
    expect(savedRows.at(-1).conceptId).toBe(`concept-${size - 1}`);
  });

  it.each(['40001', '40P01'])('normalizes PostgreSQL conflict %s for transaction retry', async (code) => {
    const error = new Prisma.PrismaClientKnownRequestError('Raw query failed', {
      code: 'P2010', clientVersion: '5.22.0', meta: { code },
    });
    const tx = { $executeRaw: jest.fn().mockRejectedValue(error) };
    await expect(write(tx, ['concept-id'])).rejects.toMatchObject({ code: 'P2034', meta: { code } });
  });

  it('preserves unrelated SQL errors for the caller', async () => {
    const error = new Prisma.PrismaClientKnownRequestError('Foreign key failure', {
      code: 'P2010', clientVersion: '5.22.0', meta: { code: '23503' },
    });
    const tx = { $executeRaw: jest.fn().mockRejectedValue(error) };
    await expect(write(tx, ['concept-id'])).rejects.toBe(error);
  });

  it('skips empty inputs', async () => {
    const tx = { $executeRaw: jest.fn() };
    await expect(write(tx, [])).resolves.toBe(0);
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });

  it('rejects duplicate concepts before writing any batch', async () => {
    const tx = { $executeRaw: jest.fn() };
    const ids = Array.from({ length: 1001 }, (_, index) => `concept-${index}`);
    ids.push(ids[0]);
    await expect(write(tx, ids)).rejects.toThrow('Duplicate concept state updates');
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });
});
