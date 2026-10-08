import { BadRequestException } from '@nestjs/common';
import { DiagnosticState, MasteryState, Prisma } from '@prisma/client';

const WRITE_BATCH_SIZE = 1000;

export interface DiagnosticStateRow {
  conceptId: string;
  diagnosticState: DiagnosticState;
  masteryState: MasteryState;
  pL: number;
  speed: number;
}

export interface RepetitionStateRow {
  conceptId: string;
  repNum: number;
  memory: number;
  interval: number;
}

export interface MemoryDecayRow {
  conceptId: string;
  memory: number;
  expectedMemory: number;
  expectedInterval: number;
  expectedLastPracticedAt: Date;
  expectedMasteryState: MasteryState;
}

/** Validate before the first write, then keep payloads bounded. */
function batches<T extends { conceptId: string }>(rows: T[]): T[][] {
  if (new Set(rows.map((row) => row.conceptId)).size !== rows.length) {
    throw new BadRequestException('Duplicate concept state updates');
  }
  const result: T[][] = [];
  for (let index = 0; index < rows.length; index += WRITE_BATCH_SIZE) {
    result.push(rows.slice(index, index + WRITE_BATCH_SIZE));
  }
  return result;
}

/** Match Prisma row-write conflicts so the owning transaction can retry. */
async function executeStateWrite(write: () => Promise<number>): Promise<number> {
  try {
    return await write();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2010' &&
        ['40001', '40P01'].includes(String(error.meta?.code))) {
      throw new Prisma.PrismaClientKnownRequestError('Concurrent learner state update', {
        code: 'P2034', clientVersion: error.clientVersion, meta: error.meta,
      });
    }
    throw error;
  }
}

export async function persistDiagnosticStates(
  tx: Prisma.TransactionClient,
  userId: string,
  rows: DiagnosticStateRow[],
  abilityTheta: number,
  speedRD: number,
): Promise<number> {
  let count = 0;
  for (const batch of batches(rows)) {
    count += await writeDiagnosticBatch(tx, userId, batch, abilityTheta, speedRD);
  }
  return count;
}

async function writeDiagnosticBatch(
  tx: Prisma.TransactionClient,
  userId: string,
  rows: DiagnosticStateRow[],
  abilityTheta: number,
  speedRD: number,
): Promise<number> {
  return executeStateWrite(() => tx.$executeRaw`
    UPDATE student_concept_states AS state
    SET diagnostic_state = row."diagnosticState"::diagnostic_state,
        mastery_state = row."masteryState"::mastery_state,
        memory = row."pL", speed = row.speed,
        ability_theta = ${abilityTheta}, speed_rd = ${speedRD}, updated_at = CURRENT_TIMESTAMP
    FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb)
      AS row("conceptId" uuid, "diagnosticState" text, "masteryState" text, "pL" double precision, speed double precision)
    WHERE state.user_id = ${userId}::uuid AND state.concept_id = row."conceptId"
  `);
}

/** The caller keeps direct practice and propagated credit in one transaction. */
export async function persistRepetitionStates(
  tx: Prisma.TransactionClient,
  userId: string,
  rows: RepetitionStateRow[],
): Promise<number> {
  let count = 0;
  for (const batch of batches(rows)) {
    count += await executeStateWrite(() => tx.$executeRaw`
      UPDATE student_concept_states AS state
      SET rep_num = row."repNum", memory = row.memory, interval = row.interval,
          updated_at = clock_timestamp()
      FROM jsonb_to_recordset(${JSON.stringify(batch)}::jsonb)
        AS row("conceptId" uuid, "repNum" double precision, memory double precision, interval double precision)
      WHERE state.user_id = ${userId}::uuid AND state.concept_id = row."conceptId"
    `);
  }
  return count;
}

/** Skip snapshots changed by practice while decay was being calculated. */
export async function persistMemoryDecay(
  tx: Prisma.TransactionClient,
  userId: string,
  rows: MemoryDecayRow[],
): Promise<number> {
  let count = 0;
  for (const batch of batches(rows)) {
    count += await executeStateWrite(() => tx.$executeRaw`
      UPDATE student_concept_states AS state
      SET memory = row.memory, updated_at = clock_timestamp()
      FROM jsonb_to_recordset(${JSON.stringify(batch)}::jsonb)
        AS row("conceptId" uuid, memory double precision, "expectedMemory" double precision,
          "expectedInterval" double precision, "expectedLastPracticedAt" timestamptz,
          "expectedMasteryState" text)
      WHERE state.user_id = ${userId}::uuid AND state.concept_id = row."conceptId"
        AND state.memory = row."expectedMemory" AND state.interval = row."expectedInterval"
        AND date_trunc('milliseconds', state.last_practiced_at) = row."expectedLastPracticedAt"
        AND state.mastery_state = row."expectedMasteryState"::mastery_state
    `);
  }
  return count;
}
