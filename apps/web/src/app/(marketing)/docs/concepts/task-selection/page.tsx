import type { Metadata } from "next";
import Link from "next/link";
import { CodeBlock, InlineCode } from "@/components/docs/code-block";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Task Selection — Graspful Docs",
  description:
    "How Graspful decides what to show a student next. Priority-based task selection with remediation, spaced review, and plateau detection.",
  keywords: [
    "task selection",
    "adaptive learning",
    "remediation",
    "plateau detection",
    "priority queue",
    "interleaving",
    "spaced repetition",
  ],
};

const priorities = [
  {
    level: "P1",
    name: "Remediation",
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    description:
      "The student is stuck. They've failed a concept twice or more, and the system has identified a weak prerequisite causing the block. P1 tasks target that specific prerequisite with focused practice.",
    trigger: "failCount >= 2 on any active concept",
  },
  {
    level: "P2",
    name: "Urgent Review",
    color:
      "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    description:
      "A previously mastered concept has decayed below 0.3 memory strength. If the student doesn't review soon, they'll effectively forget it. P2 prevents hard-won knowledge from disappearing.",
    trigger: "memory strength < 0.3",
  },
  {
    level: "P3",
    name: "Section Exams",
    color:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    description:
      "All concepts in a section have been mastered and the section has an exam configured. Time for the cumulative assessment that certifies the student's knowledge across the section.",
    trigger: "all section concepts mastered + exam enabled",
  },
  {
    level: "P4",
    name: "New Lessons",
    color:
      "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    description:
      "The knowledge frontier — the highest-value concept the student is ready to learn next. Prerequisites are met, and this concept unlocks the most downstream knowledge in the graph.",
    trigger: "prerequisites mastered, concept not yet started",
  },
  {
    level: "P5",
    name: "Standard Reviews",
    color:
      "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
    description:
      "Memory strength is between 0.3 and 0.5 — the concept is due for reinforcement but not yet at risk of being lost. These fill gaps between higher-priority work.",
    trigger: "memory strength 0.3 - 0.5",
  },
];

export default function TaskSelectionPage() {
  return (
    <div>
      <h1 className="text-4xl font-bold tracking-[-0.04em] text-foreground">
        Task Selection
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
        Graspful doesn&apos;t show problems randomly or in a fixed sequence. It
        maintains a priority queue for every student, re-evaluated on each
        interaction, to surface the single highest-value task at any moment.
      </p>

      {/* Why order matters */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="why-order-matters">
          Why order matters
        </h2>
        <p className="mt-2 text-muted-foreground">
          Two students with identical knowledge can have wildly different
          optimal next steps. One might be forgetting a critical prerequisite.
          The other might be ready for a section exam. Showing both the same
          problem wastes time for at least one of them.
        </p>
        <p className="mt-2 text-muted-foreground">
          The task selector solves this by ranking every possible task into five
          priority tiers, then picking the highest-priority item. Within a tier,
          tasks are ordered by urgency (e.g., lowest memory strength first for
          reviews, highest graph value first for new lessons).
        </p>
      </section>

      {/* Priority system */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="priority-system">
          The priority system
        </h2>
        <p className="mt-2 text-muted-foreground">
          Every task falls into exactly one priority tier. P1 always beats P2,
          P2 always beats P3, and so on. The system never skips a higher
          priority to serve a lower one.
        </p>
        <div className="mt-6 space-y-4">
          {priorities.map((p) => (
            <div
              key={p.level}
              className="rounded-xl border border-border/50 bg-card overflow-hidden"
              id={`priority-${p.level.toLowerCase()}`}
            >
              <div className="flex items-center gap-3 border-b border-border/30 bg-muted/30 px-5 py-3">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${p.color}`}
                >
                  {p.level}
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {p.name}
                </span>
              </div>
              <div className="px-5 py-4 space-y-2">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {p.description}
                </p>
                <p className="text-xs text-muted-foreground/70">
                  <strong className="text-foreground">Trigger:</strong>{" "}
                  {p.trigger}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Plateau detection */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="plateau-detection">
          Plateau detection and remediation
        </h2>
        <p className="mt-2 text-muted-foreground">
          When a student fails the same concept twice (<InlineCode>failCount
          &gt;= 2</InlineCode>), the system declares a plateau. Instead of
          hammering the same concept again, it runs a backward search through
          the prerequisite graph using BFS to find the weakest upstream concept.
        </p>
        <h3 className="text-lg font-semibold text-foreground mt-6">
          How the diagnosis works
        </h3>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <span className="shrink-0 font-semibold text-foreground">1.</span>
            The student fails a concept for the second time (e.g., &quot;Subnet
            Design&quot;).
          </li>
          <li className="flex gap-2">
            <span className="shrink-0 font-semibold text-foreground">2.</span>
            The system walks backward through the prerequisite graph via BFS,
            inspecting each ancestor&apos;s mastery level.
          </li>
          <li className="flex gap-2">
            <span className="shrink-0 font-semibold text-foreground">3.</span>
            It finds the weakest prerequisite (e.g., &quot;CIDR Notation&quot;
            at 40% mastery).
          </li>
          <li className="flex gap-2">
            <span className="shrink-0 font-semibold text-foreground">4.</span>
            That prerequisite becomes a P1 remediation task. The student
            practices it until mastery is restored.
          </li>
          <li className="flex gap-2">
            <span className="shrink-0 font-semibold text-foreground">5.</span>
            Once the prerequisite is solid, the original concept is retried
            automatically.
          </li>
        </ul>
        <p className="mt-4 text-muted-foreground">
          This is the key insight: when a student is stuck, the problem usually
          isn&apos;t the current concept. It&apos;s a gap in something they were
          supposed to already know. Remediation targets the root cause, not the
          symptom.
        </p>
      </section>

      {/* Interleaving */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="interleaving">
          Interleaving
        </h2>
        <p className="mt-2 text-muted-foreground">
          Research shows that mixing different concept types within a study
          session (interleaving) produces stronger long-term retention than
          blocking (studying one topic at a time). Graspful&apos;s priority
          system creates natural interleaving: a session might alternate between
          a new lesson (P4), a review (P5), remediation on a different concept
          (P1), and then back to new material.
        </p>
        <p className="mt-2 text-muted-foreground">
          The priority queue doesn&apos;t force interleaving artificially. It
          emerges from the fact that different concepts are at different stages
          of the learning lifecycle. The result is a varied, engaging session
          that also happens to optimize retention.
        </p>
      </section>

      {/* Example session */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="example-session">
          Example session
        </h2>
        <p className="mt-2 text-muted-foreground">
          Here&apos;s what a typical 15-minute session might look like. The task
          selector re-evaluates after every answer.
        </p>
        <CodeBlock language="yaml" title="example-session-flow.yaml">
          {`# Student: studying AWS SAA-C03, 15-minute session
# The task selector picks these in order:

- task: 1
  priority: P2  # Urgent Review
  concept: vpc-basics
  reason: "memory strength 0.22 — below 0.3 threshold"
  action: review problem on VPC CIDR ranges

- task: 2
  priority: P4  # New Lesson
  concept: nacl-vs-security-groups
  reason: "prerequisites met, highest graph value on frontier"
  action: instruction + KP1 practice (recognition)

- task: 3
  priority: P5  # Standard Review
  concept: shared-responsibility
  reason: "memory strength 0.41 — due for reinforcement"
  action: review problem on customer vs. AWS duties

- task: 4
  priority: P4  # New Lesson
  concept: nacl-vs-security-groups
  reason: "KP1 passed, advancing to KP2"
  action: KP2 practice (guided application)

- task: 5
  priority: P1  # Remediation
  concept: cidr-notation       # prerequisite of subnet-design
  reason: "subnet-design failCount=2, BFS found cidr-notation at 0.38 mastery"
  action: targeted practice on CIDR notation`}
        </CodeBlock>
      </section>

      {/* How it connects */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="how-it-connects">
          How task selection connects to other systems
        </h2>
        <p className="mt-2 text-muted-foreground">
          Task selection sits at the center of the adaptive engine. It reads
          from the student model, knowledge graph, and spaced repetition
          schedule, then outputs a single decision: what to show next.
        </p>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>
            <strong className="text-foreground">Knowledge graph</strong> — provides
            the prerequisite structure used for frontier calculation and BFS
            remediation diagnosis.
          </li>
          <li>
            <strong className="text-foreground">Student model</strong> — provides
            mastery levels, fail counts, and concept states that determine
            priority tier assignment.
          </li>
          <li>
            <strong className="text-foreground">Spaced repetition</strong> — provides
            memory strength scores that trigger P2 and P5 reviews at the right
            moment.
          </li>
          <li>
            <strong className="text-foreground">Gamification</strong> — awards XP
            based on the task type completed, with harder tasks earning more.
          </li>
        </ul>
      </section>

      {/* Next steps */}
      <section className="mt-16 rounded-xl border border-border/50 bg-card p-8">
        <h2 className="text-xl font-bold text-foreground mb-4">Next steps</h2>
        <div className="space-y-3">
          <Link
            href="/docs/concepts/mastery-learning"
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <ArrowRight className="h-4 w-4" />
            Mastery Learning — how the system decides when a concept is
            &quot;learned&quot;
          </Link>
          <Link
            href="/docs/concepts/spaced-repetition"
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <ArrowRight className="h-4 w-4" />
            Spaced Repetition — the FIRe algorithm that schedules reviews
          </Link>
          <Link
            href="/docs/concepts/adaptive-diagnostics"
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <ArrowRight className="h-4 w-4" />
            Adaptive Diagnostics — how placement tests map prior knowledge
          </Link>
        </div>
      </section>
    </div>
  );
}
