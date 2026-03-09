export interface Exam {
  id: string;
  orgId: string;
  title: string;
  slug: string;
  description: string | null;
  sourceDocument: string | null;
  editionYear: number | null;
  isPublished: boolean;
  isArchived: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Topic {
  id: string;
  examId: string;
  title: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Section {
  id: string;
  topicId: string;
  title: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StudyItem {
  id: string;
  sectionId: string;
  title: string | null;
  textContent: string;
  textHash: string;
  charCount: number;
  difficulty: string | null;
  importance: string | null;
  tags: string[];
  sourceReference: string | null;
  sortOrder: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AudioFile {
  id: string;
  studyItemId: string;
  voice: string;
  model: string;
  textHash: string;
  storagePath: string;
  storageBucket: string;
  fileSizeBytes: number;
  durationSeconds: number | null;
  format: string;
  isCurrent: boolean;
  generatedAt: string;
  createdAt: string;
}
