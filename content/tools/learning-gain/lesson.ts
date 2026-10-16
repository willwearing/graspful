import { createHash } from 'node:crypto';
import { readYamlFile } from '../../../packages/client/src/yaml';
import { type Exam, readSource } from './exam';

export type Mode = 'taught' | 'guess' | 'oracle';

export function loadCourse(file: string): any {
  return readYamlFile(file).raw;
}

export function hashText(text: string): string {
  return createHash('sha256').update(text).digest('hex').slice(0, 16);
}

function renderAnswer(problem: any): string {
  if (Array.isArray(problem.options) && /^\d+$/.test(String(problem.correct))) {
    return problem.options[Number(problem.correct)] ?? String(problem.correct);
  }
  return typeof problem.correct === 'object' ? JSON.stringify(problem.correct) : String(problem.correct);
}

/** Everything a learner sees for one concept: instruction, callouts, worked examples, practice and feedback. */
export function renderConcept(concept: any): string {
  const parts = [`## ${concept.name}`];
  for (const kp of concept.knowledgePoints ?? []) {
    if (kp.instruction) parts.push(kp.instruction);
    for (const block of [...(kp.instructionContent ?? []), ...(kp.workedExampleContent ?? [])]) {
      if (block.type === 'callout' && block.body) parts.push(block.title ? `${block.title}: ${block.body}` : block.body);
    }
    if (kp.workedExample) parts.push(`Worked example:\n${kp.workedExample}`);
    // Section exam problems are assessment, not teaching, so they stay out of the lesson.
    for (const problem of (kp.problems ?? []).filter((p: any) => p.purpose !== 'exam')) {
      const lines = [`Practice question: ${problem.question}`];
      for (const option of problem.options ?? []) lines.push(`- ${option}`);
      lines.push(`Answer: ${renderAnswer(problem)}`);
      if (problem.explanation) lines.push(`Explanation: ${problem.explanation}`);
      parts.push(lines.join('\n'));
    }
  }
  return parts.join('\n\n');
}

/** Lesson text per concept: direct prerequisites first (the learner has already done them), then the concept. */
export function buildLessons(course: any): Map<string, string> {
  const byId = new Map<string, any>(course.concepts.map((c: any) => [c.id, c]));
  const lessons = new Map<string, string>();
  for (const concept of course.concepts) {
    const chain = [...(concept.prerequisites ?? []).map((id: string) => byId.get(id)).filter(Boolean), concept];
    lessons.set(concept.id, chain.map(renderConcept).join('\n\n---\n\n'));
  }
  return lessons;
}

/** Concepts whose lesson text includes this concept, so a change to it can move their scores too. */
export function affectedConcepts(course: any, conceptId: string): string[] {
  return course.concepts
    .filter((c: any) => c.id === conceptId || (c.prerequisites ?? []).includes(conceptId))
    .map((c: any) => c.id);
}

/** The reading a student gets for one concept in each mode. Null means no reading at all. */
export function readingFor(mode: Mode, conceptId: string, course: any, exam: Exam): string | null {
  if (mode === 'guess') return null;
  if (mode === 'taught') return buildLessons(course).get(conceptId) ?? '';
  const files = [...new Set(exam.items.filter((i) => i.conceptId === conceptId).map((i) => i.sourceFile))];
  return files.map((file) => readSource(exam, file)).join('\n\n---\n\n');
}
