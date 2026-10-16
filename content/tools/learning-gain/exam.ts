import fs from 'node:fs';
import path from 'node:path';

export type Split = 'dev' | 'test';

export interface ExamItem {
  id: string;
  conceptId: string;
  split: Split;
  objective: string;
  question: string;
  options: string[];
  correct: number;
  sourceFile: string;
  sourceQuote: string;
}

export interface Exam {
  courseId: string;
  version: number;
  createdAt: string;
  sourceDir: string;
  items: ExamItem[];
  // Written by `calibrate`: items the source-taught student misses are broken and stop counting.
  excluded?: string[];
  // Also from `calibrate`: dev items a student with no reading gets right anyway.
  guessable?: string[];
  guessRate?: number;
}

export function loadExam(file: string): Exam {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function scoredItems(exam: Exam): ExamItem[] {
  const excluded = new Set(exam.excluded ?? []);
  return exam.items.filter((item) => !excluded.has(item.id));
}

export function readSource(exam: Exam, file: string): string {
  return fs.readFileSync(path.join(exam.sourceDir, file), 'utf8');
}

/** Structural problems with the exam. An empty list means it is safe to score with. */
export function checkExam(exam: Exam, course: any): string[] {
  const errors: string[] = [];
  const conceptIds = new Set<string>(course.concepts.map((c: any) => c.id));
  const seen = new Set<string>();
  if (exam.courseId !== course.course.id) errors.push(`exam is for ${exam.courseId}, course is ${course.course.id}`);
  for (const item of exam.items) {
    if (seen.has(item.id)) errors.push(`${item.id}: duplicate id`);
    seen.add(item.id);
    if (!conceptIds.has(item.conceptId)) errors.push(`${item.id}: unknown concept ${item.conceptId}`);
    if (item.split !== 'dev' && item.split !== 'test') errors.push(`${item.id}: split must be dev or test`);
    if (item.options?.length !== 4) errors.push(`${item.id}: needs exactly 4 options`);
    if (!Number.isInteger(item.correct) || item.correct < 0 || item.correct > 3) errors.push(`${item.id}: correct must be 0-3`);
    if (!item.objective?.trim()) errors.push(`${item.id}: missing objective`);
    let source = '';
    try {
      source = readSource(exam, item.sourceFile);
    } catch {
      errors.push(`${item.id}: source file not found: ${item.sourceFile}`);
    }
    if (source && !source.includes(item.sourceQuote)) errors.push(`${item.id}: sourceQuote not found verbatim in ${item.sourceFile}`);
  }
  return errors;
}
