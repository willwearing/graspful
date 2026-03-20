import type { Problem } from "@/lib/types";

type RawOption = string | { id?: string; text?: string };

function normalizeOptions(
  options: RawOption[] | undefined,
): Array<{ id: string; text: string }> | undefined {
  if (!Array.isArray(options)) {
    return undefined;
  }

  return options.map((option, index) => {
    if (typeof option === "string") {
      return {
        id: String(index),
        text: option,
      };
    }

    return {
      id: option.id ?? String(index),
      text: option.text ?? "",
    };
  });
}

export function normalizeProblem(problem: Problem): Problem {
  const rawOptions = problem.options as RawOption[] | undefined;
  const options = normalizeOptions(rawOptions);

  if (problem.type === "matching" && (!problem.pairs || problem.pairs.length === 0) && options) {
    return {
      ...problem,
      options: undefined,
      pairs: options.map(({ text }) => {
        const [left, right] = text.split("|");
        return {
          left: left?.trim() ?? text,
          right: right?.trim() ?? "",
        };
      }),
    };
  }

  if (problem.type === "ordering" && (!problem.items || problem.items.length === 0) && options) {
    return {
      ...problem,
      options: undefined,
      items: options.map(({ text }) => text.trim()),
    };
  }

  if (options) {
    return {
      ...problem,
      options,
    };
  }

  return problem;
}
