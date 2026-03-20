export class NextTaskResponseDto {
  academyId?: string;
  courseId?: string;
  taskType!: 'lesson' | 'review' | 'quiz' | 'remediation' | 'section_exam';
  conceptId?: string;
  sectionId?: string;
  reason!: string;
}
