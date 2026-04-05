import { IsString, IsNotEmpty } from 'class-validator';

export class CompleteReviewDto {
  @IsString()
  @IsNotEmpty()
  sessionId!: string;
}
