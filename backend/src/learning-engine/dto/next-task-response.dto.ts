export class NextTaskResponseDto {
  taskType!: 'lesson' | 'review' | 'quiz' | 'remediation' | 'section_exam';
  conceptId?: string;
  sectionId?: string;
  reason!: string;
}
