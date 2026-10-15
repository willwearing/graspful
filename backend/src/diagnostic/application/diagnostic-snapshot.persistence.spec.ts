import { Prisma } from '@prisma/client';
import { persistDiagnosticSnapshots } from './diagnostic-snapshot.persistence';

describe('diagnostic snapshot persistence', () => {
  it('writes a large academy in one parameterized query', async () => {
    const tx = { $executeRaw: jest.fn().mockResolvedValue(1000) };
    const updates = Array.from({ length: 1000 }, (_, index) => ({
      conceptId: `concept-${index}`, pL: index / 1000, tested: index % 2 === 0,
    }));
    await persistDiagnosticSnapshots(tx as unknown as Prisma.TransactionClient, 'session-1', updates);
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    const [sql, sessionId, rows] = tx.$executeRaw.mock.calls[0];
    expect(sql.join('?')).toContain('ON CONFLICT (diagnostic_session_id, concept_id) DO UPDATE');
    expect(sql.join('?')).not.toContain('concept-999');
    expect(sessionId).toBe('session-1');
    expect(JSON.parse(rows)).toEqual(updates);
  });

  it('does not query when no snapshots need saving', async () => {
    const tx = { $executeRaw: jest.fn() };
    await persistDiagnosticSnapshots(tx as unknown as Prisma.TransactionClient, 'session-1', []);
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });
});
