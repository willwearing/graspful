import type { Metadata } from "next";
import Link from "next/link";
import { CodeBlock } from "@/components/docs/code-block";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Mastery Learning — Graspful Docs",
  description:
    "How Graspful implements mastery learning using Bayesian Knowledge Tracing to estimate student knowledge and enforce prerequisite mastery before advancement.",
  keywords: [
    "mastery learning",
    "bayesian knowledge tracing",
    "BKT",
    "bloom two sigma",
    "adaptive learning",
    "mastery states",
    "knowledge tracing",
    "graspful mastery",
  ],
};

export default function MasteryLearningPage() {
  return (
    <div>
      <h1 className="text-4xl font-bold tracking-[-0.04em] text-foreground">
        Mastery Learning
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
        Graspful enforces mastery at every step. Students don&apos;t advance to
        new concepts until their prerequisites are solid. The system uses
        Bayesian Knowledge Tracing to estimate what each student knows and
        decides when mastery is achieved.
      </p>

      {/* Bloom's Two-Sigma Problem */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="two-sigma">
          Bloom&apos;s Two-Sigma Problem
        </h2>
        <p className="mt-2 text-muted-foreground">
          In 1984, Benjamin Bloom published a finding that changed education
          research: students who received one-on-one tutoring with mastery
          learning performed two standard deviations better than students in
          conventional classrooms. That&apos;s the difference between an average
          student and the top 2%.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          The &quot;two-sigma problem&quot; is that one-on-one tutoring
          doesn&apos;t scale. You can&apos;t hire a personal tutor for every
          student. Graspful&apos;s approach is to approximate the two key
          ingredients computationally: <strong>mastery learning</strong> (don&apos;t
          move on until you&apos;ve got it) and <strong>adaptive pacing</strong>{" "}
          (adjust to each student&apos;s speed and knowledge gaps).
        </p>
      </section>

      {/* What is mastery learning */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="what-is-mastery">
          What is mastery learning?
        </h2>
        <p className="mt-2 text-muted-foreground">
          Mastery learning is simple: don&apos;t advance until the current
          material is solid. In a traditional classroom, everyone moves to
          Chapter 5 on the same day regardless of whether they understood
          Chapter 4. Mastery learning says: if you didn&apos;t get Chapter 4,
          you stay on Chapter 4.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          This matters because knowledge is cumulative. If you don&apos;t
          understand voltage, you can&apos;t understand Ohm&apos;s Law. If you
          don&apos;t understand Ohm&apos;s Law, circuit analysis is
          incomprehensible. Gaps compound. Mastery learning prevents the gaps
          from forming in the first place.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          In Graspful, mastery enforcement is structural. The{" "}
          <Link
            href="/docs/concepts/knowledge-graph"
            className="text-primary hover:underline"
          >
            knowledge graph
          </Link>{" "}
          defines prerequisite edges between concepts. The learning engine
          checks those edges before assigning any task. A concept only appears
          on the student&apos;s{" "}
          <Link
            href="/docs/concepts/knowledge-graph#frontier"
            className="text-primary hover:underline"
          >
            frontier
          </Link>{" "}
          when every prerequisite is mastered.
        </p>
      </section>

      {/* Bayesian Knowledge Tracing */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="bkt">
          Bayesian Knowledge Tracing (BKT)
        </h2>
        <p className="mt-2 text-muted-foreground">
          BKT is the probabilistic model that powers mastery estimation. For
          each concept, the system maintains a probability{" "}
          <code className="rounded-md bg-muted px-1.5 py-0.5 text-sm font-mono">
            P(Learned)
          </code>{" "}
          — the probability that the student has actually learned the concept.
          After every response, Bayes&apos; rule updates this estimate.
        </p>

        <h3 className="text-lg font-semibold text-foreground mt-6" id="bkt-parameters">
          BKT parameters
        </h3>
        <p className="mt-2 text-muted-foreground">
          The model uses four parameters per concept:
        </p>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>
            -{" "}
            <code className="rounded-md bg-muted px-1.5 py-0.5 text-sm font-mono">
              P(L0)
            </code>{" "}
            — Prior probability the student already knows the concept before any
            interaction. Default: 0.1
          </li>
          <li>
            -{" "}
            <code className="rounded-md bg-muted px-1.5 py-0.5 text-sm font-mono">
              P(T)
            </code>{" "}
            — Probability of learning the concept on each opportunity (each
            practice attempt). Default: 0.2
          </li>
          <li>
            -{" "}
            <code className="rounded-md bg-muted px-1.5 py-0.5 text-sm font-mono">
              P(S)
            </code>{" "}
            — Slip probability: the student knows it but answers incorrectly
            (careless error). Default: 0.1
          </li>
          <li>
            -{" "}
            <code className="rounded-md bg-muted px-1.5 py-0.5 text-sm font-mono">
              P(G)
            </code>{" "}
            — Guess probability: the student doesn&apos;t know it but answers
            correctly (lucky guess). Default: 0.25
          </li>
        </ul>

        <h3 className="text-lg font-semibold text-foreground mt-6" id="update-rule">
          The update rule
        </h3>
        <p className="mt-2 text-muted-foreground">
          After each student response, BKT runs a two-step update:
        </p>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>
            - <strong>Step 1 — Evidence update:</strong> Use Bayes&apos; rule
            to compute the posterior probability of mastery given the observed
            response. A correct answer increases P(Learned). An incorrect answer
            decreases it — but not to zero, because slips happen.
          </li>
          <li>
            - <strong>Step 2 — Learning update:</strong> Account for the
            possibility that the student learned from the attempt itself, using
            P(T). Even after an incorrect answer, there&apos;s some probability
            the student learned from the feedback.
          </li>
        </ul>
        <p className="mt-3 text-sm text-muted-foreground">
          The result is a continuously updated estimate of whether the student
          has learned each concept. This is more nuanced than a simple
          &quot;X out of Y correct&quot; — it accounts for guessing, slipping,
          and learning-in-progress.
        </p>
      </section>

      {/* Mastery states */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="mastery-states">
          Mastery states
        </h2>
        <p className="mt-2 text-muted-foreground">
          Each concept in a student&apos;s profile has one of four states:
        </p>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>
            - <strong>unstarted:</strong> The student has never attempted this
            concept. It may or may not be on the frontier.
          </li>
          <li>
            - <strong>in_progress:</strong> The student has attempted problems
            but hasn&apos;t demonstrated mastery yet. P(Learned) is below the
            mastery threshold.
          </li>
          <li>
            - <strong>mastered:</strong> The student has demonstrated mastery.
            P(Learned) has crossed the threshold and the consecutive-correct
            requirement is met.
          </li>
          <li>
            - <strong>needs_review:</strong> The concept was mastered, but
            memory decay (from the spaced repetition model) has dropped the
            estimated retention below the review threshold. The concept
            re-enters the frontier for review.
          </li>
        </ul>

        <CodeBlock language="yaml" title="mastery-state-transitions.yaml">
          {`# Mastery state machine
#
# unstarted ──[first attempt]──> in_progress
#
# in_progress ──[P(Learned) >= 0.85 AND
#                2+ consecutive correct]──> mastered
#
# mastered ──[memory decay drops
#             retention below 0.6]──> needs_review
#
# needs_review ──[correct review
#                 response]──> mastered

# Example concept state in the student model:
student_concept_state:
  concept_id: ohms-law
  mastery_state: in_progress
  p_learned: 0.72
  consecutive_correct: 1
  total_attempts: 4
  last_attempt_at: "2026-03-22T14:30:00Z"`}
        </CodeBlock>
      </section>

      {/* Consecutive correct threshold */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="consecutive-correct">
          Consecutive correct answers
        </h2>
        <p className="mt-2 text-muted-foreground">
          A high P(Learned) alone isn&apos;t enough for mastery. The system also
          requires a minimum number of consecutive correct answers — typically 2.
          This guards against a single lucky correct answer triggering a mastery
          transition when P(Learned) happens to be near the threshold.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Both conditions must be true simultaneously: P(Learned) &ge; 0.85 AND
          consecutive correct &ge; 2. An incorrect answer resets the consecutive
          counter to zero, even if P(Learned) remains above the threshold (since
          the Bayes update will likely lower it anyway).
        </p>
      </section>

      {/* How mastery enforcement prevents gaps */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="gap-prevention">
          How mastery enforcement prevents knowledge gaps
        </h2>
        <p className="mt-2 text-muted-foreground">
          Traditional courses produce a predictable pattern: students with shaky
          foundations accumulate gaps, those gaps compound, and eventually the
          material becomes incomprehensible. The student blames themselves. The
          real problem was structural.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Graspful&apos;s mastery enforcement breaks this pattern at three
          levels:
        </p>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>
            - <strong>Prerequisite gating:</strong> The learning engine
            literally will not serve problems for concept B until concept A is
            mastered. There is no &quot;skip ahead&quot; button.
          </li>
          <li>
            - <strong>Continuous estimation:</strong> BKT updates after every
            response. If a student starts getting things wrong, the system
            detects the slip immediately — not at the end of a chapter.
          </li>
          <li>
            - <strong>Decay-triggered review:</strong> The{" "}
            <Link
              href="/docs/concepts/spaced-repetition"
              className="text-primary hover:underline"
            >
              spaced repetition
            </Link>{" "}
            system monitors memory decay. If a prerequisite concept&apos;s
            estimated retention drops too low, it re-enters the frontier for
            review before the student encounters dependent concepts.
          </li>
        </ul>
      </section>

      {/* BKT in the course YAML */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="bkt-in-yaml">
          BKT parameters in course YAML
        </h2>
        <p className="mt-2 text-muted-foreground">
          Course authors don&apos;t need to set BKT parameters — sensible
          defaults work for most courses. But you can override them per concept
          if you have domain knowledge about difficulty or prior knowledge.
        </p>
        <CodeBlock language="yaml" title="bkt-overrides.yaml">
          {`concepts:
  - id: voltage
    name: Voltage
    difficulty: 2
    estimatedMinutes: 15
    prerequisites: []
    # Default BKT parameters apply:
    # pL0: 0.1, pT: 0.2, pS: 0.1, pG: 0.25

  - id: advanced-circuit-analysis
    name: Advanced Circuit Analysis
    difficulty: 8
    estimatedMinutes: 45
    prerequisites: [circuit-analysis, kirchhoffs-laws]
    bkt:
      pL0: 0.05    # very unlikely to already know this
      pT: 0.15     # harder to learn per attempt
      pS: 0.05     # fewer careless errors (it's hard to get right by accident)
      pG: 0.15     # harder to guess correctly`}
        </CodeBlock>
        <p className="mt-3 text-sm text-muted-foreground">
          The adaptive diagnostic can also initialize BKT parameters based on
          observed student behavior. See{" "}
          <Link
            href="/docs/concepts/adaptive-diagnostics"
            className="text-primary hover:underline"
          >
            Adaptive Diagnostics
          </Link>{" "}
          for details.
        </p>
      </section>

      {/* Next steps */}
      <section className="mt-16 rounded-xl border border-border/50 bg-card p-8">
        <h2 className="text-xl font-bold text-foreground mb-4">Next steps</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/docs/concepts/knowledge-graph"
            className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowRight className="h-3.5 w-3.5 text-primary" />
            <span>Knowledge Graph and the frontier</span>
          </Link>
          <Link
            href="/docs/concepts/adaptive-diagnostics"
            className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowRight className="h-3.5 w-3.5 text-primary" />
            <span>Adaptive Diagnostics and MEPE</span>
          </Link>
          <Link
            href="/docs/concepts/spaced-repetition"
            className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowRight className="h-3.5 w-3.5 text-primary" />
            <span>Spaced Repetition and the FIRe algorithm</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
