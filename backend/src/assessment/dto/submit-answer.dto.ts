import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class SubmitAnswerDto {
  @IsString()
  @IsNotEmpty()
  problemId!: string;

  @IsNotEmpty()
  answer!: unknown;

  @IsInt()
  @Min(0)
  responseTimeMs!: number;

  /**
   * Problem IDs the learner has seen so far in this lesson session.
   * Used by the KP-level remediation loop (Slice 1) to avoid repeating
   * problems and to apply anti-gaming retry delays.
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  seenProblemIds?: string[];

  /**
   * KPs for which the worked example has already been re-opened once in
   * this session. See Math Academy Way, FAQ p.416–417: we re-surface the
   * existing worked example verbatim; we do not author alternate examples.
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  workedExampleReopenedKPIds?: string[];
}
