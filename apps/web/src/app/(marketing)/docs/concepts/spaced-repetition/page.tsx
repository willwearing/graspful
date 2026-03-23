import type { Metadata } from "next";
import Link from "next/link";
import { CodeBlock } from "@/components/docs/code-block";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Spaced Repetition — Graspful Docs",
  description:
    "How Graspful's FIRe algorithm schedules reviews using exponential forgetting, early-repetition discounting, and implicit repetition through encompassing edges.",
  keywords: [
    "spaced repetition",
    "FIRe algorithm",
    "fractional implicit repetition",
    "spacing effect",
    "memory decay",
    "forgetting curve",
    "encompassing edges",
    "graspful review",
  ],
};

export default function SpacedRepetitionPage() {
  return (
    <div>
      <h1 className="text-4xl font-bold tracking-[-0.04em] text-foreground">
        Spaced Repetition
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
        Graspful uses the FIRe (Fractional Implicit Repetition) algorithm to
        schedule reviews. FIRe is built for knowledge graphs — it gives credit
        for implicit practice through encompassing edges, so students spend less
        time drilling basics they already exercise through advanced work.
      </p>

      {/* The spacing effect */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="spacing-effect">
          The spacing effect
        </h2>
        <p className="mt-2 text-muted-foreground">
          The spacing effect is one of the most robust findings in cognitive
          science: distributing practice over time produces stronger, longer-lasting
          memory than massing practice into one session. Reviewing something once
          a day for five days beats reviewing it five times in one day.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          The optimal spacing increases as memory strengthens. First review
          after 1 day. Then 3 days. Then 7, 14, 30. Each successful review
          extends the interval. This is the core principle behind systems like
          Anki, SuperMemo, and Graspful&apos;s review scheduling.
        </p>
      </section>

      {/* Exponential forgetting */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="forgetting">
          Exponential forgetting
        </h2>
        <p className="mt-2 text-muted-foreground">
          Graspful models memory as an exponential decay function. After mastering
          a concept, the estimated retention drops over time:
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          <code className="rounded-md bg-muted px-1.5 py-0.5 text-sm font-mono">
            retention = 0.5 ^ (days_since_review / interval)
          </code>
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          When{" "}
          <code className="rounded-md bg-muted px-1.5 py-0.5 text-sm font-mono">
            days_since_review
          </code>{" "}
          equals the interval, retention is exactly 0.5 — a coin flip. When
          days is zero (just reviewed), retention is 1.0. When days exceeds the
          interval, retention drops below 0.5 and continues toward zero.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          The memory decay service runs this calculation before every task
          selection session. Any concept whose retention drops below 0.6
          transitions from{" "}
          <code className="rounded-md bg-muted px-1.5 py-0.5 text-sm font-mono">
            mastered
          </code>{" "}
          to{" "}
          <code className="rounded-md bg-muted px-1.5 py-0.5 text-sm font-mono">
            needs_review
          </code>{" "}
          and re-enters the{" "}
          <Link
            href="/docs/concepts/knowledge-graph#frontier"
            className="text-primary hover:underline"
          >
            frontier
          </Link>
          .
        </p>
      </section>

      {/* FIRe Algorithm */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="fire">
          The FIRe algorithm
        </h2>
        <p className="mt-2 text-muted-foreground">
          FIRe — Fractional Implicit Repetition — is Graspful&apos;s spaced
          repetition algorithm. It extends standard spaced repetition with two
          key innovations: early-repetition discounting and implicit repetition
          through the knowledge graph.
        </p>

        <h3 className="text-lg font-semibold text-foreground mt-6" id="interval-schedule">
          Interval schedule
        </h3>
        <p className="mt-2 text-muted-foreground">
          FIRe uses a fixed interval ladder. Each successful review advances the
          concept to the next rung. Each failure drops it back one rung (minimum
          rung 0).
        </p>
        <CodeBlock language="yaml" title="interval-schedule.yaml">
          {`# FIRe interval ladder (in days)
interval_schedule:
  - 1      # rung 0: review tomorrow
  - 3      # rung 1: review in 3 days
  - 7      # rung 2: review in 1 week
  - 14     # rung 3: review in 2 weeks
  - 30     # rung 4: review in 1 month
  - 60     # rung 5: review in 2 months
  - 120    # rung 6: review in 4 months
  - 240    # rung 7: review in 8 months (max)

# Example concept review state:
concept_review:
  concept_id: ohms-law
  current_rung: 3           # interval = 14 days
  last_reviewed: "2026-03-10"
  next_review: "2026-03-24"  # 14 days later
  retention: 0.52            # getting close to threshold`}
        </CodeBlock>

        <h3 className="text-lg font-semibold text-foreground mt-6" id="early-repetition">
          Early-repetition discounting
        </h3>
        <p className="mt-2 text-muted-foreground">
          Not all reviews are equally valuable. Reviewing a concept when
          retention is still high (say, 0.95) provides less memory benefit than
          reviewing when retention has dropped to 0.6. FIRe accounts for this.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          When a concept is reviewed before its scheduled date, FIRe applies a
          discount based on current retention. The higher the retention at review
          time, the less credit the review gets toward advancing the interval
          rung.
        </p>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>
            - <strong>Retention &gt; 0.9:</strong> Review earns 0.25x credit —
            the student remembers fine, this review barely helped
          </li>
          <li>
            - <strong>Retention 0.7 - 0.9:</strong> Review earns 0.5x credit —
            some benefit, but the timing wasn&apos;t ideal
          </li>
          <li>
            - <strong>Retention 0.5 - 0.7:</strong> Review earns 1.0x credit —
            optimal spacing, full benefit
          </li>
          <li>
            - <strong>Retention &lt; 0.5:</strong> Review still earns 1.0x
            credit, but the interval rung may drop because the student waited
            too long
          </li>
        </ul>

        <h3 className="text-lg font-semibold text-foreground mt-6" id="decay-penalty">
          Decay penalty on failure
        </h3>
        <p className="mt-2 text-muted-foreground">
          When a student fails a review (answers incorrectly), FIRe applies a
          decay penalty proportional to how much they&apos;ve forgotten. The
          lower the retention at failure time, the bigger the penalty.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Failing at retention 0.3 (waited way too long) drops the interval rung
          by 2. Failing at retention 0.6 (close to schedule) drops it by 1. This
          prevents a single bad day from destroying months of progress while
          still penalizing genuine forgetting.
        </p>
      </section>

      {/* Implicit repetition */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="implicit-repetition">
          Implicit repetition via encompassing edges
        </h2>
        <p className="mt-2 text-muted-foreground">
          This is FIRe&apos;s key innovation. In a traditional spaced repetition
          system, every concept must be reviewed independently. In Graspful,
          practicing an advanced concept automatically counts as partial review
          of its foundations — through{" "}
          <Link
            href="/docs/concepts/knowledge-graph#encompassing-edges"
            className="text-primary hover:underline"
          >
            encompassing edges
          </Link>
          .
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          When a student correctly answers a Circuit Analysis problem, FIRe
          traces the encompassing edges and credits each ancestor concept
          proportionally. This means foundational concepts get reviewed
          implicitly as the student practices advanced material — no separate
          flashcard drill required.
        </p>

        <h3 className="text-lg font-semibold text-foreground mt-6" id="weight-product">
          Weight product calculation
        </h3>
        <p className="mt-2 text-muted-foreground">
          Implicit repetition credit is the product of encompassing weights
          along the path. Multi-hop credit diminishes multiplicatively:
        </p>
        <CodeBlock language="yaml" title="implicit-repetition-example.yaml">
          {`# Knowledge graph edges:
#
#   Circuit Analysis
#     ├── encompassing: Ohm's Law (weight: 0.8)
#     └── encompassing: Voltage   (weight: 0.6)
#
#   Ohm's Law
#     └── encompassing: Voltage   (weight: 0.6)

# When the student practices Circuit Analysis:

implicit_credit:
  # Direct encompassing edges:
  - target: ohms-law
    weight: 0.8              # direct edge from circuit-analysis
    credit: "0.8× review"

  - target: voltage
    weight: 0.6              # direct edge from circuit-analysis
    credit: "0.6× review"

  # Multi-hop credit (circuit-analysis → ohms-law → voltage):
  # The direct path (0.6) already exceeds the multi-hop path (0.8 × 0.6 = 0.48)
  # FIRe uses the MAXIMUM credit across all paths, so voltage gets 0.6×

  # Final credit applied:
  final:
    - concept: ohms-law
      credit: 0.8            # 80% of a full review
    - concept: voltage
      credit: 0.6            # 60% of a full review (max of direct 0.6 vs hop 0.48)`}
        </CodeBlock>
        <p className="mt-3 text-sm text-muted-foreground">
          Implicit credit is combined with early-repetition discounting. If
          Ohm&apos;s Law has retention 0.95, the 0.8x implicit credit is
          further discounted to 0.8 x 0.25 = 0.2x — the student barely
          benefits because they already remember it well.
        </p>
      </section>

      {/* Memory decay service */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="decay-service">
          Memory decay service
        </h2>
        <p className="mt-2 text-muted-foreground">
          The memory decay service runs before every task selection call. It
          recalculates retention for all mastered concepts and transitions any
          that fall below the threshold to{" "}
          <code className="rounded-md bg-muted px-1.5 py-0.5 text-sm font-mono">
            needs_review
          </code>
          .
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          The service checks three things:
        </p>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>
            - <strong>Retention calculation:</strong> For each mastered concept,
            compute{" "}
            <code className="rounded-md bg-muted px-1.5 py-0.5 text-sm font-mono">
              0.5 ^ (days / interval)
            </code>{" "}
            using the current interval rung
          </li>
          <li>
            - <strong>Implicit credit offset:</strong> If the concept received
            implicit repetition credit from recent advanced practice, that
            credit is subtracted from the elapsed days before computing decay
          </li>
          <li>
            - <strong>Threshold check:</strong> If retention &lt; 0.6, the
            concept moves to{" "}
            <code className="rounded-md bg-muted px-1.5 py-0.5 text-sm font-mono">
              needs_review
            </code>{" "}
            and enters the frontier with high priority
          </li>
        </ul>
        <p className="mt-3 text-sm text-muted-foreground">
          Review tasks are prioritized over new learning in the task selection
          queue. A student won&apos;t advance to new material if there are
          overdue reviews on prerequisite concepts.
        </p>
      </section>

      {/* Practical impact */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="practical-impact">
          Practical impact
        </h2>
        <p className="mt-2 text-muted-foreground">
          The combination of implicit repetition and the interval ladder means
          students spend significantly less time on explicit review than in
          traditional spaced repetition systems.
        </p>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>
            - <strong>Foundational concepts rarely need explicit review</strong>{" "}
            — they get constantly exercised through advanced practice via
            encompassing edges
          </li>
          <li>
            - <strong>Leaf concepts (no dependents) need the most review</strong>{" "}
            — nothing exercises them implicitly, so they follow the standard
            interval schedule
          </li>
          <li>
            - <strong>Mid-graph concepts get partial credit</strong> — some
            implicit review from above, but may still need occasional explicit
            review depending on edge weights
          </li>
        </ul>
        <p className="mt-3 text-sm text-muted-foreground">
          For course authors, this means encompassing edges directly affect the
          student experience. Well-connected graphs with accurate weights
          produce less review burden. Disconnected graphs with no encompassing
          edges behave like traditional flashcard systems — every concept needs
          independent review.
        </p>
      </section>

      {/* Configuring spaced repetition */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="configuration">
          Configuration
        </h2>
        <p className="mt-2 text-muted-foreground">
          FIRe parameters are tuned at the platform level and generally
          don&apos;t need per-course adjustment. The main lever for course
          authors is the quality of encompassing edges — accurate weights
          produce better implicit repetition.
        </p>
        <CodeBlock language="yaml" title="encompassing-weights-guide.yaml">
          {`# Encompassing weight guide for course authors:
#
# Ask: "When a student solves a problem for concept B,
#        how much does that exercise concept A?"
#
# Examples:
concepts:
  - id: multi-step-equations
    name: Multi-step Equations
    difficulty: 5
    estimatedMinutes: 25
    prerequisites: [linear-equations, distributive-property]
    encompassing:
      # Solving multi-step equations heavily exercises
      # basic linear equation skills
      - concept: linear-equations
        weight: 0.8

      # It also exercises the distributive property,
      # but only when the problem includes parentheses
      - concept: distributive-property
        weight: 0.5

      # It exercises basic arithmetic, but only slightly —
      # the cognitive load is on the algebraic structure
      - concept: arithmetic-operations
        weight: 0.3`}
        </CodeBlock>
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
            <span>Knowledge Graph and encompassing edges</span>
          </Link>
          <Link
            href="/docs/concepts/mastery-learning"
            className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowRight className="h-3.5 w-3.5 text-primary" />
            <span>Mastery Learning and BKT</span>
          </Link>
          <Link
            href="/docs/concepts/adaptive-diagnostics"
            className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowRight className="h-3.5 w-3.5 text-primary" />
            <span>Adaptive Diagnostics and MEPE</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
