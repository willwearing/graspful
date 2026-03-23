import type { Metadata } from "next";
import Link from "next/link";
import { CodeBlock } from "@/components/docs/code-block";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Adaptive Diagnostics — Graspful Docs",
  description:
    "How Graspful's adaptive diagnostic uses MEPE question selection and evidence propagation to efficiently map a student's existing knowledge in 20-60 questions.",
  keywords: [
    "adaptive diagnostic",
    "MEPE",
    "maximum expected posterior entropy",
    "evidence propagation",
    "placement test",
    "bayesian knowledge tracing",
    "graspful diagnostic",
  ],
};

export default function AdaptiveDiagnosticsPage() {
  return (
    <div>
      <h1 className="text-4xl font-bold tracking-[-0.04em] text-foreground">
        Adaptive Diagnostics
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
        When a student starts a course, Graspful doesn&apos;t make them begin at
        the beginning. The adaptive diagnostic efficiently maps what they
        already know — typically in 20 to 60 questions — so they can skip ahead
        to where they actually need to learn.
      </p>

      {/* Purpose */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="purpose">
          Why run a diagnostic?
        </h2>
        <p className="mt-2 text-muted-foreground">
          A 40-hour course might have 80+ concepts. A student who already knows
          half the material shouldn&apos;t have to prove it by grinding through
          40 hours of basics. The diagnostic solves this by asking a small
          number of strategically chosen questions and using the knowledge graph
          to infer mastery across related concepts.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          The result is a personalized starting point. After the diagnostic, the
          student&apos;s{" "}
          <Link
            href="/docs/concepts/knowledge-graph#frontier"
            className="text-primary hover:underline"
          >
            knowledge frontier
          </Link>{" "}
          reflects what they actually know, not an assumption that they know
          nothing.
        </p>
      </section>

      {/* BKT Engine */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="bkt-engine">
          The BKT engine
        </h2>
        <p className="mt-2 text-muted-foreground">
          The diagnostic uses the same{" "}
          <Link
            href="/docs/concepts/mastery-learning#bkt"
            className="text-primary hover:underline"
          >
            Bayesian Knowledge Tracing
          </Link>{" "}
          model as the learning engine. Each concept starts with a prior
          P(Learned) and is updated after every response using Bayes&apos; rule
          with slip and guess parameters.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          The key difference from normal learning sessions: the diagnostic
          doesn&apos;t teach. There are no instructions, worked examples, or
          feedback. It&apos;s purely assessment — the goal is to gather
          information as efficiently as possible.
        </p>

        <h3 className="text-lg font-semibold text-foreground mt-6" id="update-mechanics">
          Update mechanics
        </h3>
        <p className="mt-2 text-muted-foreground">
          For each question answered, the engine:
        </p>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>
            - Computes the posterior P(Learned | response) using Bayes&apos;
            rule with the concept&apos;s slip and guess parameters
          </li>
          <li>
            - Applies the learning transition P(T) — even in a diagnostic,
            the student might learn from the question itself
          </li>
          <li>
            - Propagates evidence to related concepts through the graph
            (see below)
          </li>
          <li>
            - Recalculates uncertainty across all concepts to inform the next
            question selection
          </li>
        </ul>
      </section>

      {/* MEPE Selector */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="mepe">
          MEPE: Maximum Expected Posterior Entropy reduction
        </h2>
        <p className="mt-2 text-muted-foreground">
          The MEPE selector picks the next question by asking: &quot;Which
          question would reduce my overall uncertainty about this student the
          most?&quot; It&apos;s a greedy information-gain strategy.
        </p>

        <h3 className="text-lg font-semibold text-foreground mt-6" id="how-mepe-works">
          How it works
        </h3>
        <p className="mt-2 text-muted-foreground">
          For each candidate question, MEPE simulates two outcomes — correct and
          incorrect — and computes the expected reduction in total entropy
          (uncertainty) across all concepts. The question with the highest
          expected entropy reduction wins.
        </p>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>
            - <strong>High-uncertainty concepts get priority:</strong> If
            P(Learned) is near 0.5, the system is maximally uncertain. A
            question about that concept is highly informative.
          </li>
          <li>
            - <strong>Hub concepts are extra valuable:</strong> A concept with
            many dependents or encompassing edges propagates more information
            through the graph when answered, making it a high-value target.
          </li>
          <li>
            - <strong>Already-certain concepts are skipped:</strong> If
            P(Learned) is near 0 or 1, asking about that concept won&apos;t
            change much. MEPE naturally avoids wasting questions on them.
          </li>
        </ul>

        <CodeBlock language="yaml" title="mepe-selection-example.yaml">
          {`# Diagnostic session state (simplified)
#
# After 5 questions, the engine has:
diagnostic_session:
  questions_answered: 5
  concept_states:
    - concept: voltage
      p_learned: 0.92        # high confidence — mastered
      entropy: 0.12
    - concept: current
      p_learned: 0.88        # high confidence — mastered
      entropy: 0.18
    - concept: ohms-law
      p_learned: 0.51        # maximum uncertainty!
      entropy: 0.69
    - concept: circuit-analysis
      p_learned: 0.35        # uncertain
      entropy: 0.63
    - concept: kirchhoffs-laws
      p_learned: 0.40        # uncertain
      entropy: 0.67

# MEPE picks ohms-law next because:
# 1. It has the highest entropy (0.69)
# 2. It has encompassing edges to voltage and current
#    (propagates evidence downward)
# 3. circuit-analysis depends on it
#    (the answer will shift circuit-analysis too)`}
        </CodeBlock>
      </section>

      {/* Evidence Propagation */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="evidence-propagation">
          Evidence propagation
        </h2>
        <p className="mt-2 text-muted-foreground">
          When a student answers a question, the information doesn&apos;t just
          update one concept — it ripples through the knowledge graph. This is
          what makes the diagnostic efficient: one question can update many
          concepts simultaneously.
        </p>

        <h3 className="text-lg font-semibold text-foreground mt-6" id="downward-propagation">
          Downward propagation (correct answers)
        </h3>
        <p className="mt-2 text-muted-foreground">
          If a student answers a question about Circuit Analysis correctly, that
          is evidence they also know its prerequisites. The system propagates a
          positive update to Ohm&apos;s Law, Voltage, and Current — weighted by
          the encompassing edges.
        </p>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>
            - A correct answer on Circuit Analysis with an encompassing weight
            of 0.8 to Ohm&apos;s Law applies 80% of the normal positive update
            to Ohm&apos;s Law
          </li>
          <li>
            - If no encompassing edge exists but a prerequisite edge does, a
            smaller default credit (0.3) is applied
          </li>
          <li>
            - Propagation is recursive through the graph, with diminishing
            weight at each hop
          </li>
        </ul>

        <h3 className="text-lg font-semibold text-foreground mt-6" id="upward-propagation">
          Upward propagation (incorrect answers)
        </h3>
        <p className="mt-2 text-muted-foreground">
          If a student gets a question wrong, that is evidence they may also
          struggle with dependent concepts. The system propagates a negative
          signal upward to concepts that list the failed concept as a
          prerequisite.
        </p>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>
            - If a student fails an Ohm&apos;s Law question, Circuit Analysis
            (which requires Ohm&apos;s Law) receives a negative update
          </li>
          <li>
            - The reasoning: if you don&apos;t know the prerequisite, you
            probably don&apos;t know the dependent concept either
          </li>
          <li>
            - The negative update is smaller than the direct update — it&apos;s
            evidence, not proof
          </li>
        </ul>
      </section>

      {/* Stopping Criteria */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="stopping-criteria">
          Stopping criteria
        </h2>
        <p className="mt-2 text-muted-foreground">
          The diagnostic doesn&apos;t always ask the same number of questions.
          It stops when one of these conditions is met:
        </p>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>
            - <strong>Hard cap (60 questions):</strong> The diagnostic never
            exceeds 60 questions regardless of remaining uncertainty. This
            prevents fatigue.
          </li>
          <li>
            - <strong>Diminishing returns (after 20 questions):</strong> After
            the 20th question, the engine checks whether fewer than 5 concepts
            remain uncertain (entropy &gt; 0.5). If so, it stops — the
            remaining uncertainty isn&apos;t worth more questions.
          </li>
          <li>
            - <strong>Full convergence:</strong> If every concept has entropy
            below 0.3 (high confidence in either mastered or unmastered), the
            diagnostic stops immediately.
          </li>
        </ul>
        <p className="mt-3 text-sm text-muted-foreground">
          In practice, most diagnostics converge in 25-40 questions for a
          course with 80 concepts. Students who know everything finish faster
          (correct answers propagate broadly). Students who know nothing also
          finish faster (a few wrong answers quickly establish the baseline).
          Students with patchy knowledge take the longest because the graph
          boundaries are harder to map.
        </p>
      </section>

      {/* Speed Bootstrapping */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="speed-bootstrapping">
          Speed bootstrapping with IRT
        </h2>
        <p className="mt-2 text-muted-foreground">
          The diagnostic also estimates how fast each student learns, not just
          what they already know. It uses Item Response Theory (IRT) parameters
          — specifically response time and accuracy patterns — to initialize a
          per-concept learning velocity.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          A student who answers quickly and correctly on foundational concepts
          gets a higher initial P(T) (learning rate) for related advanced
          concepts. This means the learning engine will require fewer practice
          problems before declaring mastery — the system adapts its pacing to
          the student&apos;s speed.
        </p>

        <CodeBlock language="yaml" title="diagnostic-output.yaml">
          {`# What the diagnostic produces for the learning engine:
diagnostic_result:
  student_id: "stu_abc123"
  course_id: "electrical-fundamentals"
  questions_asked: 32
  duration_seconds: 840

  concept_states:
    - concept: voltage
      p_learned: 0.95
      mastery_state: mastered
      learning_velocity: 1.2     # learns 20% faster than average

    - concept: current
      p_learned: 0.91
      mastery_state: mastered
      learning_velocity: 1.1

    - concept: ohms-law
      p_learned: 0.78
      mastery_state: in_progress  # close but not mastered
      learning_velocity: 1.0

    - concept: circuit-analysis
      p_learned: 0.15
      mastery_state: unstarted
      learning_velocity: 0.9

    - concept: kirchhoffs-laws
      p_learned: 0.08
      mastery_state: unstarted
      learning_velocity: 0.85    # harder topic, slower expected pace

  # The student's frontier after diagnostic:
  # [ohms-law] — prerequisites mastered, not yet mastered itself
  # voltage and current are already mastered
  # circuit-analysis and kirchhoffs-laws are blocked by ohms-law`}
        </CodeBlock>
      </section>

      {/* Diagnostic in course YAML */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="diagnostic-config">
          Diagnostic configuration
        </h2>
        <p className="mt-2 text-muted-foreground">
          Diagnostics are enabled by default for all courses. You can customize
          the behavior in the course YAML:
        </p>
        <CodeBlock language="yaml" title="diagnostic-config.yaml">
          {`course:
  id: electrical-fundamentals
  name: Electrical Fundamentals
  estimatedHours: 12
  version: "2026.1"
  diagnostic:
    enabled: true           # default: true
    minQuestions: 15         # default: 20
    maxQuestions: 45         # default: 60
    convergenceThreshold: 5 # stop after min if < N uncertain concepts
    skipForBeginners: false  # if true, skip diagnostic for brand-new topics`}
        </CodeBlock>
        <p className="mt-3 text-sm text-muted-foreground">
          For courses targeting complete beginners (e.g., &quot;Introduction to
          Programming&quot;), consider setting{" "}
          <code className="rounded-md bg-muted px-1.5 py-0.5 text-sm font-mono">
            skipForBeginners: true
          </code>{" "}
          to skip the diagnostic entirely and start everyone at the root
          concepts.
        </p>
      </section>

      {/* Next steps */}
      <section className="mt-16 rounded-xl border border-border/50 bg-card p-8">
        <h2 className="text-xl font-bold text-foreground mb-4">Next steps</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/docs/concepts/mastery-learning"
            className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowRight className="h-3.5 w-3.5 text-primary" />
            <span>Mastery Learning and BKT deep dive</span>
          </Link>
          <Link
            href="/docs/concepts/knowledge-graph"
            className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowRight className="h-3.5 w-3.5 text-primary" />
            <span>Knowledge Graph and prerequisite edges</span>
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
