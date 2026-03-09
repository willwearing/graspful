export class StartLessonResponseDto {
  conceptId: string;
  conceptName: string;
  knowledgePoints: Array<{
    id: string;
    slug: string;
    instructionText: string | null;
    workedExampleText: string | null;
    instructionAudioUrl: string | null;
    workedExampleAudioUrl: string | null;
  }>;
}
