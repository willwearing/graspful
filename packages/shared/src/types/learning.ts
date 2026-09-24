import type { Problem, RichContentBlock } from './api';

/** Response from a course lesson start endpoint. */
export interface LessonStart {
  conceptId: string;
  conceptName: string;
  knowledgePoints: Array<{
    id: string;
    slug: string;
    instructionText: string;
    instructionAudioUrl?: string | null;
    instructionAudioDurationSeconds?: number | null;
    instructionContent?: RichContentBlock[];
    workedExampleText: string;
    workedExampleContent?: RichContentBlock[];
    problems?: Problem[];
  }>;
}

/** Response shared by course and academy diagnostic endpoints. */
export interface DiagnosticStart {
  sessionId: string;
  courseId: string;
  questionNumber: number;
  totalEstimated: number;
  isComplete: boolean;
  question: Problem | null;
}
