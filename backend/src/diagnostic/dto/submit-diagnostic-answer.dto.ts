import { IsString, IsNotEmpty, IsInt, IsOptional, Min } from 'class-validator';

export class SubmitDiagnosticAnswerDto {
  @IsString()
  @IsNotEmpty()
  sessionId!: string;

  @IsNotEmpty()
  answer!: unknown;

  @IsInt()
  @Min(0)
  responseTimeMs!: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  expectedProblemId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  questionNumber?: number;
}
