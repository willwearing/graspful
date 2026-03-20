/**
 * Pure functions for evaluating answers to each problem type.
 * No external dependencies — pure math/string comparison.
 */

export interface EvaluationResult {
  correct: boolean;
  feedback: string;
}

/**
 * Multiple choice: compare selected option ID to correct answer.
 * correctAnswer: string (the option ID)
 * answer: string (the selected option ID)
 */
export function evaluateMultipleChoice(
  answer: unknown,
  correctAnswer: unknown,
  explanation?: string,
): EvaluationResult {
  const correct = String(answer) === String(correctAnswer);
  return {
    correct,
    feedback: correct
      ? 'Correct!'
      : `Incorrect. The correct answer is ${correctAnswer}.${explanation ? ' ' + explanation : ''}`,
  };
}

/**
 * True/false: compare boolean.
 * correctAnswer: boolean
 * answer: boolean
 */
export function evaluateTrueFalse(
  answer: unknown,
  correctAnswer: unknown,
  explanation?: string,
): EvaluationResult {
  const answerBool = toBoolean(answer);
  const correctBool = toBoolean(correctAnswer);
  const correct = answerBool === correctBool;
  return {
    correct,
    feedback: correct
      ? 'Correct!'
      : `Incorrect. The answer is ${correctBool}.${explanation ? ' ' + explanation : ''}`,
  };
}

/**
 * Fill in the blank: case-insensitive string match with optional alternatives.
 * correctAnswer: string | { answer: string; alternatives?: string[] }
 * answer: string
 */
export function evaluateFillBlank(
  answer: unknown,
  correctAnswer: unknown,
  explanation?: string,
): EvaluationResult {
  const studentAnswer = normalizeString(String(answer));

  let acceptedAnswers: string[];
  let primaryAnswer: string;

  if (typeof correctAnswer === 'object' && correctAnswer !== null) {
    const ca = correctAnswer as { answer: string; alternatives?: string[] };
    primaryAnswer = ca.answer;
    acceptedAnswers = [ca.answer, ...(ca.alternatives || [])].map(normalizeString);
  } else {
    primaryAnswer = String(correctAnswer);
    acceptedAnswers = [normalizeString(primaryAnswer)];
  }

  const correct = acceptedAnswers.includes(studentAnswer);
  return {
    correct,
    feedback: correct
      ? 'Correct!'
      : `Incorrect. The correct answer is "${primaryAnswer}".${explanation ? ' ' + explanation : ''}`,
  };
}

/**
 * Ordering: compare ordered array of items.
 *
 * The student answer is always string[] (the option texts in the order they chose).
 *
 * correctAnswer may be:
 *   - string[] (the option texts in correct order) — direct comparison
 *   - string   (comma-separated indices like "1,3,4,0,2") — resolve indices
 *               against the options array to build the correct text order
 *
 * When correctAnswer is index-based, `options` must be provided so the
 * indices can be mapped back to text for comparison.
 */
export function evaluateOrdering(
  answer: unknown,
  correctAnswer: unknown,
  explanation?: string,
  options?: unknown[] | null,
): EvaluationResult {
  const studentOrder = Array.isArray(answer) ? (answer as string[]) : null;
  if (!studentOrder) {
    return { correct: false, feedback: 'Invalid answer format.' };
  }

  let resolvedCorrectOrder: string[];

  if (Array.isArray(correctAnswer)) {
    resolvedCorrectOrder = correctAnswer.map(String);
  } else if (typeof correctAnswer === 'string') {
    // Index-based format: "1,3,4,0,2"
    const indices = correctAnswer.split(',').map((s) => parseInt(s.trim(), 10));
    const optionTexts = Array.isArray(options)
      ? options.map(String)
      : [];

    if (optionTexts.length === 0 || indices.some(isNaN)) {
      return { correct: false, feedback: 'Invalid answer format.' };
    }

    resolvedCorrectOrder = indices.map((idx) => optionTexts[idx] ?? '');
  } else {
    return { correct: false, feedback: 'Invalid answer format.' };
  }

  const correct =
    studentOrder.length === resolvedCorrectOrder.length &&
    studentOrder.every((text, i) => text === resolvedCorrectOrder[i]);

  return {
    correct,
    feedback: correct
      ? 'Correct!'
      : `Incorrect. The items are not in the right order.${explanation ? ' ' + explanation : ''}`,
  };
}

/**
 * Matching: compare pairs.
 * correctAnswer: Array<[string, string]> or Record<string, string>
 * answer: Array<[string, string]> or Record<string, string>
 */
export function evaluateMatching(
  answer: unknown,
  correctAnswer: unknown,
  explanation?: string,
): EvaluationResult {
  const studentPairs = toPairMap(answer);
  const correctPairs = toPairMap(correctAnswer);

  if (!studentPairs || !correctPairs) {
    return { correct: false, feedback: 'Invalid answer format.' };
  }

  const correct =
    studentPairs.size === correctPairs.size &&
    Array.from(correctPairs.entries()).every(
      ([key, val]) => studentPairs.get(key) === val,
    );

  return {
    correct,
    feedback: correct
      ? 'Correct!'
      : `Incorrect. Some matches are wrong.${explanation ? ' ' + explanation : ''}`,
  };
}

/**
 * Scenario: evaluate based on correctAnswer structure.
 * Delegates to the appropriate evaluator based on the inner type.
 * correctAnswer: { type: ProblemType, answer: any } or just a value
 */
export function evaluateScenario(
  answer: unknown,
  correctAnswer: unknown,
  explanation?: string,
): EvaluationResult {
  // Scenarios typically use MC for their questions
  return evaluateMultipleChoice(answer, correctAnswer, explanation);
}

/**
 * Main evaluator dispatcher.
 * @param options - The problem's options array. Required for ordering problems
 *                  where correctAnswer is stored as comma-separated indices.
 */
export function evaluateAnswer(
  type: string,
  answer: unknown,
  correctAnswer: unknown,
  explanation?: string,
  options?: unknown[] | null,
): EvaluationResult {
  switch (type) {
    case 'multiple_choice':
      return evaluateMultipleChoice(answer, correctAnswer, explanation);
    case 'true_false':
      return evaluateTrueFalse(answer, correctAnswer, explanation);
    case 'fill_blank':
      return evaluateFillBlank(answer, correctAnswer, explanation);
    case 'ordering':
      return evaluateOrdering(answer, correctAnswer, explanation, options);
    case 'matching':
      return evaluateMatching(answer, correctAnswer, explanation);
    case 'scenario':
      return evaluateScenario(answer, correctAnswer, explanation);
    default:
      return { correct: false, feedback: `Unknown problem type: ${type}` };
  }
}

// --- Helpers ---

function normalizeString(s: string): string {
  return s.trim().toLowerCase();
}

function toBoolean(val: unknown): boolean {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') return val.toLowerCase() === 'true';
  return Boolean(val);
}

function toPairMap(val: unknown): Map<string, string> | null {
  if (!val) return null;

  if (Array.isArray(val)) {
    const map = new Map<string, string>();
    for (const pair of val) {
      if (Array.isArray(pair) && pair.length === 2) {
        map.set(String(pair[0]), String(pair[1]));
      } else {
        return null;
      }
    }
    return map;
  }

  if (typeof val === 'object') {
    const map = new Map<string, string>();
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      map.set(k, String(v));
    }
    return map;
  }

  return null;
}
