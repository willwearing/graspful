export class StartLessonResponseDto {
  conceptId!: string;
  conceptName!: string;
  knowledgePoints!: Array<{
    id: string;
    slug: string;
    instructionText: string | null;
    instructionContent: Array<Record<string, unknown>>;
    workedExampleText: string | null;
    workedExampleContent: Array<Record<string, unknown>>;
    instructionAudioUrl: string | null;
    workedExampleAudioUrl: string | null;
    problems: Array<{
      id: string;
      questionText: string;
      type: string;
      options?: Array<{ id: string; text: string }>;
      items?: string[];
      pairs?: Array<{ left: string; right: string }>;
      difficulty: number;
    }>;
  }>;
}
