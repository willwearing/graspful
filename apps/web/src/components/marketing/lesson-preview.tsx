"use client";

import { useState } from "react";

const choices = ["WHERE", "SELECT", "FROM", "LIMIT"];

/** A local excerpt from content/courses/examples/sql-fundamentals.yaml. */
export function LessonPreview() {
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const correct = selected === 1;

  return (
    <aside id="lesson-preview" aria-label="Example SQL lesson" className="scroll-mt-24 rounded-xl border border-border bg-card p-5 text-left sm:p-7">
      <p className="text-xs font-medium text-primary">Example lesson · SQL fundamentals</p>
      <h2 className="mt-2 text-xl font-semibold text-foreground">Choose the columns you need</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        SELECT chooses the columns in a query result. WHERE filters rows.
        For example, <code className="text-foreground">SELECT name FROM users</code> returns
        the name column from the users table.
      </p>
      <fieldset className="mt-5">
        <legend className="text-sm font-semibold text-foreground">Which clause limits the columns returned by a query?</legend>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {choices.map((choice, index) => (
            <label key={choice} className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm ${selected === index ? "border-primary bg-primary/5" : "border-border"}`}>
              <input
                type="radio"
                name="lesson-preview-answer"
                value={choice}
                checked={selected === index}
                disabled={submitted}
                onChange={() => setSelected(index)}
                className="accent-primary"
              />
              <code>{choice}</code>
            </label>
          ))}
        </div>
      </fieldset>
      {!submitted ? (
        <button type="button" disabled={selected === null} onClick={() => setSubmitted(true)} className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50">
          Check answer
        </button>
      ) : (
        <div role="status" className="mt-4 rounded-lg border border-border bg-muted/40 p-4">
          <p className="text-sm font-semibold text-foreground">{correct ? "Correct. SELECT chooses the columns." : "Review the distinction, then try again."}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {correct
              ? "WHERE filters rows, FROM names the table, and LIMIT restricts the number of rows."
              : `${choices[selected!]} ${selected === 0 ? "filters rows" : selected === 2 ? "names the table" : "restricts the number of rows"}. SELECT chooses which columns appear. In SELECT name FROM users, name is the column.`}
          </p>
          <button type="button" onClick={() => { setSelected(null); setSubmitted(false); }} className="mt-3 text-sm font-semibold text-primary underline underline-offset-4">
            {correct ? "Reset example" : "Try again"}
          </button>
        </div>
      )}
      <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
        A question from our <a className="underline underline-offset-2" href="https://github.com/willwearing/graspful/blob/main/content/courses/examples/sql-fundamentals.yaml">SQL example</a>.
        This preview does not save progress. A course uses several questions to estimate mastery.
      </p>
    </aside>
  );
}
