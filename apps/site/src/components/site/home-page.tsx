"use client";

import Link from "next/link";
import { useState } from "react";
import { faqItems, serviceAreas } from "@/lib/site-config";

const howSteps = [
  {
    title: "Install the tools",
    command: "npx @graspful/cli init",
    description: "Configure the CLI and MCP tools for your coding agent, such as Claude Code or Codex.",
  },
  {
    title: "Author a draft with your agent",
    command: "Ask your agent to write course.yaml",
    description: "Give your agent source material and learning goals. It writes the lessons, examples, questions, and prerequisite graph in YAML. A scaffold only provides the structure.",
  },
  {
    title: "Review the content",
    command: "graspful validate course.yaml\ngraspful review course.yaml",
    description: "Run the checks, correct failures, and read each lesson and answer yourself. Automated checks cannot establish factual accuracy or teaching quality.",
  },
  {
    title: "Import a draft",
    command: "graspful register\ngraspful import course.yaml --org your-org",
    description: "Sign in to create CLI credentials, then import the course. Importing without --publish saves a draft. Review it in the creator app.",
  },
  {
    title: "Publish when ready",
    command: "graspful publish <course-id> --org your-org --format json",
    description: "Publish the reviewed draft. Confirm that the response contains published: true before sharing the course with learners.",
  },
];

function CopyButton({ text }: { text: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  return (
    <div className="shrink-0">
      <button
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setStatus("copied");
          } catch {
            setStatus("failed");
          }
        }}
        className="rounded border border-border px-2 py-1 text-xs text-foreground hover:bg-muted"
        aria-label="Copy install command"
      >
        {status === "copied" ? "Copied" : "Copy"}
      </button>
      <span role="status" className="sr-only">
        {status === "copied" ? "Install command copied." : status === "failed" ? "Copy failed. Select and copy the command." : ""}
      </span>
    </div>
  );
}

function LessonExample() {
  const [answer, setAnswer] = useState<string | null>(null);
  return (
    <aside aria-label="Illustrative lesson" className="rounded-xl border border-border bg-card p-6 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Illustrative lesson</p>
      <h2 className="mt-3 text-xl font-semibold">Add fractions with different denominators</h2>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">Use a common denominator. One half is two quarters, so 1/2 + 1/4 = 2/4 + 1/4 = 3/4.</p>
      <fieldset className="mt-6">
        <legend className="text-sm font-medium">Try it: What is 1/3 + 1/6?</legend>
        <div className="mt-3 flex gap-3">
          {["2/9", "1/2"].map((choice) => (
            <button key={choice} type="button" onClick={() => setAnswer(choice)} aria-pressed={answer === choice} className="min-h-11 flex-1 rounded-md border border-border px-4 py-2 text-sm hover:bg-muted aria-pressed:border-primary aria-pressed:bg-muted">
              {choice}
            </button>
          ))}
        </div>
      </fieldset>
      <div aria-live="polite" className="mt-4 min-h-20 text-sm leading-relaxed">
        {answer === "2/9" && <p>Adding both denominators changes the size of the parts. Convert 1/3 to 2/6 first. Then 2/6 + 1/6 = 3/6 = 1/2. Try again.</p>}
        {answer === "1/2" && <p>Correct. 1/3 equals 2/6. Add one more sixth to get 3/6, which simplifies to 1/2.</p>}
        {!answer && <p className="text-muted-foreground">Choose an answer to see its explanation. This preview stays on this page.</p>}
      </div>
    </aside>
  );
}

export function HomePage() {
  return (
    <main id="main-content">
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 pb-16 pt-32 md:grid-cols-2 md:gap-16 md:pb-24 md:pt-40">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Course authoring with your AI agent</p>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">Turn your source material into lessons and practice.</h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">Use Claude Code, Codex, or another MCP agent to write a course. Review it in Graspful, then publish lessons with diagnostics, practice questions, and scheduled review.</p>
          <div className="mt-6 flex max-w-full items-center gap-3 rounded-lg border border-border bg-muted/50 p-3">
            <code className="min-w-0 flex-1 break-words text-sm">npx @graspful/cli init</code>
            <CopyButton text="npx @graspful/cli init" />
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-5">
            <Link href="/sign-up" className="rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground no-underline hover:opacity-90">Create free account</Link>
            <Link href="/docs" className="text-sm font-medium text-foreground underline underline-offset-4">Read the setup guide</Link>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Local authoring and checks work before you sign up.</p>
        </div>
        <LessonExample />
      </section>

      <section className="border-y border-border bg-muted/30 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">From course files to learner practice</h2>
          <div className="mt-8 grid gap-8 md:grid-cols-3">
            {serviceAreas.map((feature) => (
              <div key={feature.title}>
                <h3 className="text-base font-semibold">{feature.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-16 md:py-24">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Author, review, then publish</h2>
        <p className="mt-4 text-muted-foreground">You control the source content and the decision to publish.</p>
        <ol className="mt-10 divide-y divide-border">
          {howSteps.map((step, i) => (
            <li key={step.title} className="grid gap-4 py-6 first:pt-0 sm:grid-cols-[2rem_1fr]">
              <span className="text-sm text-muted-foreground" aria-hidden="true">0{i + 1}</span>
              <div>
                <h3 className="font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                <pre className="mt-4 whitespace-pre-wrap break-words rounded-md bg-muted/60 p-3 text-xs leading-relaxed"><code>{step.command}</code></pre>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section id="pricing" className="border-y border-border bg-muted/30 py-16">
        <div className="mx-auto grid max-w-4xl gap-8 px-6 sm:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold">Start with a free account</h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">Create course files, run local checks, and review imported drafts. Use the CLI or MCP tools to make course changes.</p>
            <Link href="/sign-up" className="mt-6 inline-block rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground no-underline hover:opacity-90">Start building free</Link>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Paid subscriptions are not available yet</h3>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">Payment setup is still in progress. Pricing and payment terms will be available before paid subscriptions open.</p>
            <Link href="/pricing" className="mt-6 inline-block text-sm font-medium underline underline-offset-4">View pricing status</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Common questions</h2>
        <div className="mt-8 divide-y divide-border">
          {faqItems.map((faq) => (
            <details key={faq.question} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold">
                {faq.question}
                <span aria-hidden="true" className="text-lg text-muted-foreground group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
            </details>
          ))}
        </div>
        <div className="mt-10 border-t border-border pt-8">
          <Link href="/docs" className="text-sm font-medium underline underline-offset-4">Set up your first course</Link>
        </div>
      </section>
    </main>
  );
}
