import type { Metadata } from "next";
import Link from "next/link";
import { CodeBlock } from "@/components/docs/code-block";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Knowledge Graph — Graspful Docs",
  description:
    "How Graspful models domain knowledge as a directed graph of concepts connected by prerequisite and encompassing edges, and how the frontier drives task selection.",
  keywords: [
    "knowledge graph",
    "prerequisite edges",
    "encompassing edges",
    "knowledge frontier",
    "adaptive learning",
    "course graph",
    "graspful concepts",
  ],
};

export default function KnowledgeGraphPage() {
  return (
    <div>
      <h1 className="text-4xl font-bold tracking-[-0.04em] text-foreground">
        Knowledge Graph
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
        Every Graspful course is a directed acyclic graph. Concepts are nodes.
        Edges encode two kinds of relationships: prerequisites and encompassing
        links. The graph drives everything — task selection, diagnostics, spaced
        repetition, and mastery enforcement.
      </p>

      {/* What is a knowledge graph */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="what-is-it">
          What is a knowledge graph?
        </h2>
        <p className="mt-2 text-muted-foreground">
          A knowledge graph is a directed acyclic graph (DAG) where each node
          represents one teachable concept — a single idea that can be tested
          independently. Edges between nodes express how concepts relate to each
          other. The graph must be acyclic: you cannot have circular
          dependencies where A requires B and B requires A.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          The right granularity matters. A concept should be small enough to
          master in one sitting (10-30 minutes) but large enough to test
          meaningfully. &quot;Ohm&apos;s Law&quot; is a good concept.
          &quot;All of circuit analysis&quot; is too broad.
          &quot;The letter V in V=IR&quot; is too narrow.
        </p>
      </section>

      {/* Prerequisite edges */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="prerequisite-edges">
          Prerequisite edges
        </h2>
        <p className="mt-2 text-muted-foreground">
          A prerequisite edge from concept A to concept B means &quot;you must
          understand A before you can learn B.&quot; The adaptive engine enforces
          this: a student will never be assigned tasks for B until A is mastered.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Prerequisites are transitive. If A is a prerequisite of B, and B is a
          prerequisite of C, then A is implicitly a prerequisite of C. You
          should only declare direct prerequisites — the engine infers the rest.
          Keep it to 3-4 direct prerequisites per concept to match working
          memory limits.
        </p>
        <CodeBlock language="yaml" title="prerequisite-example.yaml">
          {`concepts:
  - id: voltage
    name: Voltage
    difficulty: 2
    estimatedMinutes: 15
    prerequisites: []   # foundational — no prerequisites

  - id: ohms-law
    name: Ohm's Law
    difficulty: 3
    estimatedMinutes: 20
    prerequisites:
      - voltage          # must master Voltage first

  - id: circuit-analysis
    name: Circuit Analysis
    difficulty: 5
    estimatedMinutes: 30
    prerequisites:
      - ohms-law         # only list the direct prerequisite
                          # voltage is inferred transitively`}
        </CodeBlock>
      </section>

      {/* Encompassing edges */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="encompassing-edges">
          Encompassing edges
        </h2>
        <p className="mt-2 text-muted-foreground">
          An encompassing edge says &quot;practicing concept B automatically
          exercises concept A.&quot; Each edge carries a weight between 0.0 and
          1.0 that controls how much credit flows backward.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          This is the mechanism behind implicit repetition. When a student
          correctly solves a circuit analysis problem, they are also exercising
          Ohm&apos;s Law and voltage concepts. The encompassing weight determines
          how much spaced-repetition credit each ancestor receives.
        </p>

        <h3 className="text-lg font-semibold text-foreground mt-6" id="weight-guidelines">
          Weight guidelines
        </h3>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>- <strong>1.0:</strong> Fully exercises the target as a subskill (rare — the child is essentially a superset)</li>
          <li>- <strong>0.5 - 0.7:</strong> Substantially exercises the target (e.g., circuit analysis exercises Ohm&apos;s Law)</li>
          <li>- <strong>0.2 - 0.4:</strong> Partially exercises the target (e.g., a word problem partially exercises arithmetic)</li>
          <li>- <strong>&lt; 0.2:</strong> Probably not worth listing — the connection is too weak to matter</li>
        </ul>

        <CodeBlock language="yaml" title="encompassing-example.yaml">
          {`concepts:
  - id: circuit-analysis
    name: Circuit Analysis
    difficulty: 5
    estimatedMinutes: 30
    prerequisites:
      - ohms-law
    encompassing:
      - concept: ohms-law
        weight: 0.8        # heavily exercises Ohm's Law
      - concept: voltage
        weight: 0.6        # substantially exercises Voltage

  # When a student practices Circuit Analysis:
  # - Ohm's Law gets 0.8× spaced-repetition credit
  # - Voltage gets 0.6× spaced-repetition credit
  # This means advanced students don't need to go back
  # and drill basics separately — the graph handles it.`}
        </CodeBlock>
      </section>

      {/* The frontier */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="frontier">
          The knowledge frontier
        </h2>
        <p className="mt-2 text-muted-foreground">
          The frontier is the set of concepts a student is ready to learn right
          now. A concept is on the frontier when all of its prerequisites are
          mastered but the concept itself is not yet mastered.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          The frontier is the core input to task selection. The learning engine
          picks from frontier concepts, weighted by priority (due reviews first,
          then new material). A student with no mastered concepts has a frontier
          containing only root nodes — concepts with zero prerequisites.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          As the student masters concepts, the frontier expands. As they master
          everything, it shrinks. A fully mastered course has an empty frontier
          (until spaced repetition flags something for review).
        </p>
      </section>

      {/* Course graph structure */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="course-graph">
          Course graph: sections and concepts
        </h2>
        <p className="mt-2 text-muted-foreground">
          The underlying knowledge graph is a flat DAG — no hierarchy. But
          humans need structure. Courses add two organizational layers on top of
          the graph: <strong>sections</strong> group related concepts for
          display, and <strong>courses</strong> bundle everything with metadata.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Sections are purely for human navigation. They do not affect the
          adaptive engine, task selection, or prerequisite enforcement. A
          concept&apos;s prerequisites can span sections freely — the graph
          doesn&apos;t care about section boundaries.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Sections can optionally include a{" "}
          <code className="rounded-md bg-muted px-1.5 py-0.5 text-sm font-mono">
            sectionExam
          </code>{" "}
          — a checkpoint exam that gates progression. See the{" "}
          <Link
            href="/docs/course-schema#section-exam"
            className="text-primary hover:underline"
          >
            Course Schema
          </Link>{" "}
          docs for details.
        </p>

        <CodeBlock language="yaml" title="course-with-sections.yaml">
          {`course:
  id: electrical-fundamentals
  name: Electrical Fundamentals
  estimatedHours: 12
  version: "2026.1"

sections:
  - id: dc-circuits
    name: DC Circuits
    description: Voltage, current, resistance, and basic analysis
  - id: ac-circuits
    name: AC Circuits
    description: Alternating current, impedance, and phasors

concepts:
  # DC section — root concepts
  - id: voltage
    name: Voltage
    section: dc-circuits
    difficulty: 2
    estimatedMinutes: 15
    prerequisites: []

  - id: current
    name: Current
    section: dc-circuits
    difficulty: 2
    estimatedMinutes: 15
    prerequisites: []

  # DC section — depends on roots
  - id: ohms-law
    name: Ohm's Law
    section: dc-circuits
    difficulty: 3
    estimatedMinutes: 20
    prerequisites: [voltage, current]
    encompassing:
      - concept: voltage
        weight: 0.6
      - concept: current
        weight: 0.6

  # AC section — cross-section prerequisite
  - id: impedance
    name: Impedance
    section: ac-circuits
    difficulty: 5
    estimatedMinutes: 25
    prerequisites: [ohms-law]    # crosses section boundary — that's fine
    encompassing:
      - concept: ohms-law
        weight: 0.7`}
        </CodeBlock>
      </section>

      {/* Graph validation */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="validation">
          Graph validation
        </h2>
        <p className="mt-2 text-muted-foreground">
          The importer validates several graph properties at import time.
          Violations are rejected before any data is written.
        </p>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>- <strong>No cycles:</strong> The prerequisite graph must be a DAG. Cycles make mastery enforcement impossible.</li>
          <li>- <strong>All references resolve:</strong> Every concept ID in a prerequisites or encompassing array must exist in the course.</li>
          <li>- <strong>Weights in range:</strong> Encompassing weights must be between 0.0 and 1.0 inclusive.</li>
          <li>- <strong>Reachability:</strong> Every concept must be reachable from at least one root node (a concept with no prerequisites).</li>
        </ul>
        <p className="mt-3 text-sm text-muted-foreground">
          Run{" "}
          <code className="rounded-md bg-muted px-1.5 py-0.5 text-sm font-mono">
            graspful validate course.yaml
          </code>{" "}
          locally to catch graph errors before importing.
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
            <span>Mastery Learning and Bayesian Knowledge Tracing</span>
          </Link>
          <Link
            href="/docs/concepts/adaptive-diagnostics"
            className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowRight className="h-3.5 w-3.5 text-primary" />
            <span>Adaptive Diagnostics and evidence propagation</span>
          </Link>
          <Link
            href="/docs/course-schema"
            className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowRight className="h-3.5 w-3.5 text-primary" />
            <span>Course YAML schema reference</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
