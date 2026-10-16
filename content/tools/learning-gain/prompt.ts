import type { ExamItem } from './exam';
import { MIN_QUOTE_WORDS } from './grade';
import type { Mode } from './lesson';

const LETTERS = ['A', 'B', 'C', 'D'];

function renderItems(items: ExamItem[]): string {
  return items
    .map((item) => [`[${item.id}] ${item.question}`, ...item.options.map((o, i) => `${LETTERS[i]}. ${o}`)].join('\n'))
    .join('\n\n');
}

/**
 * The simulated student's instructions. `answerPath` set means a subagent writes the JSON to a file;
 * null means an API call that replies with the JSON.
 */
export function studentPrompt(mode: Mode, reading: string | null, items: ExamItem[], answerPath: string | null): string {
  const grounded = mode !== 'guess';
  const rules = grounded
    ? [
        'You are a new hire taking a quiz on your company\'s sales methodology.',
        'You know nothing about this methodology except what is in the READING below. Ignore anything you think you know from elsewhere.',
        'For each question, pick the option the READING supports and copy one supporting quote from the READING.',
        `The quote must be one exact, contiguous passage copied character for character, at least ${MIN_QUOTE_WORDS} words, no ellipses, no edits.`,
        'If the READING does not support any option, set "choice" to null and "quote" to "". Do not guess.',
      ]
    : [
        'You are taking a quiz with no study material. Answer each question with your best guess.',
        'Always pick one option. Set "quote" to "".',
      ];
  const output = '{"answers":[{"id":"<question id>","choice":"A|B|C|D|null","quote":"..."}]}';
  const deliver = answerPath
    ? `Write ONLY this JSON (no prose, no code fences) to the file ${answerPath}: ${output}. Answer every question. Do not read any other files. Then reply with only the word "done". Never repeat questions, choices, or quotes in your reply.`
    : `Reply with ONLY this JSON (no prose, no code fences): ${output}. Answer every question.`;
  return [
    ...rules,
    deliver,
    grounded ? `\n=== READING START ===\n${reading ?? ''}\n=== READING END ===` : '',
    `\n=== QUESTIONS ===\n${renderItems(items)}`,
  ].join('\n');
}
