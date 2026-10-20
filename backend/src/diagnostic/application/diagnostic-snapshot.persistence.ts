import { Prisma } from '@prisma/client';

export interface DiagnosticSnapshotUpdate {
  conceptId: string;
  pL: number;
  tested: boolean;
}

/** One database round trip, including snapshots added after the session started. */
export async function persistDiagnosticSnapshots(
  tx: Prisma.TransactionClient,
  sessionId: string,
  updates: DiagnosticSnapshotUpdate[],
): Promise<void> {
  if (updates.length === 0) return;
  await tx.$executeRaw`
    INSERT INTO diagnostic_mastery_snapshots
      (id, diagnostic_session_id, concept_id, p_l, tested, updated_at)
    SELECT gen_random_uuid(), ${sessionId}::uuid, row."conceptId", row."pL", row.tested, CURRENT_TIMESTAMP
    FROM jsonb_to_recordset(${JSON.stringify(updates)}::jsonb)
      AS row("conceptId" uuid, "pL" double precision, tested boolean)
    ON CONFLICT (diagnostic_session_id, concept_id) DO UPDATE
    SET p_l = EXCLUDED.p_l, tested = EXCLUDED.tested, updated_at = EXCLUDED.updated_at
  `;
}
