import { IsString, IsNotEmpty, IsInt, Min } from 'class-validator';

export class SubmitDiagnosticAnswerDto {
  @IsString()
  @IsNotEmpty()
  sessionId!: string;

  @IsNotEmpty()
  answer!: unknown;

  @IsInt()
  @Min(0)
  responseTimeMs!: number;
}
