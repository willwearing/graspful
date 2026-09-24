import { IsString, IsNotEmpty } from 'class-validator';
import { SubmitAnswerDto } from './submit-answer.dto';

export class SubmitReviewAnswerDto extends SubmitAnswerDto {
  @IsString()
  @IsNotEmpty()
  sessionId!: string;
}
