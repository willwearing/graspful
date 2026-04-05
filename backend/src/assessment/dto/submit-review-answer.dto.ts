import { IsString, IsNotEmpty, IsInt, Min } from 'class-validator';

export class SubmitReviewAnswerDto {
  @IsString()
  @IsNotEmpty()
  sessionId!: string;

  @IsString()
  @IsNotEmpty()
  problemId!: string;

  @IsNotEmpty()
  answer!: unknown;

  @IsInt()
  @Min(0)
  responseTimeMs!: number;
}
