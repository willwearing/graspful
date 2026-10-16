import type { ExamItem, Split } from './exam';
import type { Mode } from './lesson';

export type Outcome = 'correct' | 'wrong' | 'abstain' | 'unsupported';

export interface Answer {
  id: string;
  choice: string | number | null;
  quote?: string;
}

export interface ItemResult {
  id: string;
  conceptId: string;
  split: Split;
  objective: string;
  outcomes: Outcome[];
}

export interface ConceptScore {
  correct: number;
  total: number;
  failed: { objective: string; outcome: Outcome }[];
}

/** Aggregate scores only. It never carries question text or answers, so the improving agent can read it. */
export interface Report {
  mode: Mode;
  samples: number;
  dev: { correct: number; total: number; score: number };
  test: { correct: number; total: number; score: number };
  concepts: Record<string, ConceptScore>;
}

// Shortest quote that still has to come from the lesson. Shorter quotes match by accident.
export const MIN_QUOTE_WORDS = 6;

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[*_`#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseChoice(choice: Answer['choice']): number | null {
  if (typeof choice === 'number') return Number.isInteger(choice) && choice >= 0 && choice <= 3 ? choice : null;
  if (typeof choice !== 'string') return null;
  const letter = choice.trim().toUpperCase().replace(/[^A-D]/g, '');
  return letter.length === 1 ? letter.charCodeAt(0) - 65 : null;
}

/**
 * Taught and oracle answers only count when backed by a verbatim quote from the reading.
 * That keeps the model's own knowledge of the topic from passing as learning.
 */
export function gradeItem(mode: Mode, item: ExamItem, answer: Answer | undefined, reading: string | null): Outcome {
  const choice = parseChoice(answer?.choice ?? null);
  if (choice === null) return 'abstain';
  if (mode !== 'guess') {
    const quote = normalize(answer?.quote ?? '').replace(/^["']|["']$/g, '');
    const supported = quote.split(' ').length >= MIN_QUOTE_WORDS && normalize(reading ?? '').includes(quote);
    if (!supported) return 'unsupported';
  }
  return choice === item.correct ? 'correct' : 'wrong';
}

function majorityCorrect(outcomes: Outcome[]): boolean {
  return outcomes.filter((o) => o === 'correct').length * 2 > outcomes.length;
}

function mostCommonMiss(outcomes: Outcome[]): Outcome {
  const misses = outcomes.filter((o) => o !== 'correct');
  const counts = new Map<Outcome, number>();
  for (const miss of misses) counts.set(miss, (counts.get(miss) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'wrong';
}

export function summarize(mode: Mode, samples: number, results: ItemResult[]): Report {
  const report: Report = {
    mode,
    samples,
    dev: { correct: 0, total: 0, score: 0 },
    test: { correct: 0, total: 0, score: 0 },
    concepts: {},
  };
  for (const result of results) {
    const passed = majorityCorrect(result.outcomes);
    const split = report[result.split];
    split.total += 1;
    if (passed) split.correct += 1;
    // Per-concept detail is dev only. Test items stay aggregate so the loop can't tune toward them.
    if (result.split !== 'dev') continue;
    const concept = (report.concepts[result.conceptId] ??= { correct: 0, total: 0, failed: [] });
    concept.total += 1;
    if (passed) concept.correct += 1;
    else concept.failed.push({ objective: result.objective, outcome: mostCommonMiss(result.outcomes) });
  }
  for (const split of [report.dev, report.test]) split.score = split.total ? split.correct / split.total : 0;
  return report;
}

export interface Decision {
  keep: boolean;
  reason: string;
}

/** Keep only when the target concept gains and nothing else that was re-scored loses. */
export function decide(before: Report, after: Report, target: string): Decision {
  const was = before.concepts[target];
  const now = after.concepts[target];
  if (!was || !now) return { keep: false, reason: `${target} missing from a report` };
  const regressions = Object.keys(after.concepts).filter(
    (id) => before.concepts[id] && after.concepts[id].correct < before.concepts[id].correct,
  );
  if (regressions.length) return { keep: false, reason: `regressed: ${regressions.join(', ')}` };
  if (now.correct <= was.correct) return { keep: false, reason: `${target} did not improve (${was.correct} -> ${now.correct})` };
  return { keep: true, reason: `${target} ${was.correct}/${was.total} -> ${now.correct}/${now.total}` };
}
