import { IsString, IsNotEmpty, IsInt, Min } from 'class-validator';

export class SubmitAnswerDto {
  @IsString()
  @IsNotEmpty()
  problemId!: string;

  @IsNotEmpty()
  answer!: unknown;

  @IsInt()
  @Min(0)
  responseTimeMs!: number;
}
