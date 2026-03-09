export class NextTaskResponseDto {
  taskType!: 'lesson' | 'review' | 'quiz' | 'remediation';
  conceptId?: string;
  reason!: string;
}
