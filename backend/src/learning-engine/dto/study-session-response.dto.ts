import { NextTaskResponseDto } from './next-task-response.dto';

export class StudySessionResponseDto {
  tasks!: NextTaskResponseDto[];
  estimatedXP!: number;
}
