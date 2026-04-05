import type { Metadata } from "next";
import Link from "next/link";
import { CodeBlock } from "@/components/docs/code-block";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "How Graspful Works — Graspful Docs",
  description:
    "Conceptual overview of the Graspful adaptive learning engine. Knowledge graphs, adaptive diagnostics, mastery-based progression, spaced repetition, and the two-YAML workflow.",
  keywords: [
    "graspful overview",
    "adaptive learning engine",
    "knowledge graph",
    "spaced repetition",
    "mastery-based learning",
    "how graspful works",
  ],
};

export default function HowItWorksPage() {
  return (
    <div>
      <h1 className="text-4xl font-bold tracking-[-0.04em] text-foreground">
        How Graspful Works
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
        Graspful is an adaptive learning engine. You define content as YAML. The
        engine handles diagnostics, mastery tracking, spaced repetition, task
        selection, and gamification. This page is the one-page overview of the
        entire system.
      </p>
      <div className="mt-6 max-w-2xl rounded-lg border border-border/50 bg-muted/30 px-5 py-4">
        <p className="text-sm text-muted-foreground">
          Graspful&apos;s approach to adaptive learning is heavily inspired by{" "}
          <a
            href="https://www.justinmath.com/the-math-academy-way/"
            className="text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            <em>The Math Academy Way</em>
          </a>{" "}
          by Justin Skycak — a free, open book that lays out the principles
          behind knowledge graphs, mastery-based progression, Bayesian
          diagnostics, and spaced repetition in rigorous detail. We&apos;re trying
          to take those ideas and build an engine that anyone can use, for any
          subject, with AI agents doing the heavy lifting. The core algorithms
          draw from established research: BKT from{" "}
          <a
            href="https://doi.org/10.1007/BF01099821"
            className="text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Corbett &amp; Anderson (1994)
          </a>
          , information-theoretic question selection from standard{" "}
          <a
            href="https://en.wikipedia.org/wiki/Bayesian_experimental_design"
            className="text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Bayesian experimental design
          </a>
          , and spaced repetition from decades of memory research.
        </p>
      </div>

      {/* 1. Knowledge Graph */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="knowledge-graph">
          1. Knowledge Graph
        </h2>
        <p className="mt-2 text-muted-foreground">
          Every course is a directed acyclic graph (DAG) of concepts. Each
          concept represents one teachable idea that can be tested
          independently. Concepts are connected by two types of edges:{" "}
          <strong className="text-foreground">prerequisite edges</strong> (&quot;you must
          master A before starting B&quot;) and{" "}
          <strong className="text-foreground">encompassing edges</strong> (&quot;practicing
          B implicitly exercises A&quot;). Prerequisite edges enforce ordering.
          Encompassing edges let the spaced repetition engine give implicit
          review credit when a student practices advanced material that exercises
          foundational skills. Together, these edges turn a flat list of topics
          into a structured learning path.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          <Link
            href="/docs/glossary#knowledge-graph"
            className="text-primary hover:underline"
          >
            Glossary: Knowledge Graph
          </Link>{" "}
          &middot;{" "}
          <Link
            href="/docs/course-schema#concepts"
            className="text-primary hover:underline"
          >
            Course Schema: concepts
          </Link>
        </p>
      </section>

      {/* 2. Adaptive Diagnostics */}
      <section className="mt-12">
        <h2
          className="text-2xl font-bold text-foreground"
          id="adaptive-diagnostics"
        >
          2. Adaptive Diagnostics
        </h2>
        <p className="mt-2 text-muted-foreground">
          When a student starts a course, a diagnostic session maps what they
          already know in 20-60 questions. The engine uses{" "}
          <strong className="text-foreground">
            Bayesian Knowledge Tracing (BKT)
          </strong>{" "}
          to maintain a probability estimate of mastery for every concept. It
          selects questions using{" "}
          <strong className="text-foreground">MEPE</strong> (Maximum Expected
          Posterior Entropy) — always asking the question whose answer would
          reduce uncertainty the most. The session stops when the information
          gain per question drops below a threshold, so strong students finish
          fast and weaker students get a more thorough assessment. The result is
          a complete mastery map: every concept is marked as mastered, in
          progress, or unstarted. The diagnostic also propagates evidence
          through the graph — a correct answer on an advanced concept gives
          partial credit to its prerequisites (with a decay factor per hop),
          and an incorrect answer propagates doubt to dependents. This means
          the diagnostic learns more per question than a flat quiz would.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          <Link
            href="/docs/glossary#diagnostic-session"
            className="text-primary hover:underline"
          >
            Glossary: Diagnostic Session
          </Link>{" "}
          &middot;{" "}
          <Link
            href="/docs/glossary#bayesian-knowledge-tracing-bkt"
            className="text-primary hover:underline"
          >
            Glossary: BKT
          </Link>{" "}
          &middot;{" "}
          <Link
            href="/docs/glossary#mepe"
            className="text-primary hover:underline"
          >
            Glossary: MEPE
          </Link>
        </p>
      </section>

      {/* 3. Mastery-Based Progression */}
      <section className="mt-12">
        <h2
          className="text-2xl font-bold text-foreground"
          id="mastery-based-progression"
        >
          3. Mastery-Based Progression
        </h2>
        <p className="mt-2 text-muted-foreground">
          Graspful never advances a student to a new concept until all its
          prerequisites are mastered. The set of concepts a student can work on
          at any moment is called the{" "}
          <strong className="text-foreground">knowledge frontier</strong>: the
          unmastered concepts whose prerequisites are all mastered. This
          guarantees students always have the foundation they need. If a student
          gets stuck (two or more consecutive failures), the engine detects a{" "}
          <strong className="text-foreground">plateau</strong> and automatically
          identifies the weak prerequisite causing the block. It then assigns{" "}
          <strong className="text-foreground">remediation</strong> — targeted
          practice on that prerequisite — before returning the student to the
          original concept.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          <Link
            href="/docs/glossary#knowledge-frontier"
            className="text-primary hover:underline"
          >
            Glossary: Knowledge Frontier
          </Link>{" "}
          &middot;{" "}
          <Link
            href="/docs/glossary#plateau-detection"
            className="text-primary hover:underline"
          >
            Glossary: Plateau Detection
          </Link>{" "}
          &middot;{" "}
          <Link
            href="/docs/glossary#remediation"
            className="text-primary hover:underline"
          >
            Glossary: Remediation
          </Link>
        </p>
      </section>

      {/* 4. The Learning Staircase */}
      <section className="mt-12">
        <h2
          className="text-2xl font-bold text-foreground"
          id="learning-staircase"
        >
          4. The Learning Staircase
        </h2>
        <p className="mt-2 text-muted-foreground">
          Each concept is broken into 2-4{" "}
          <strong className="text-foreground">knowledge points (KPs)</strong>{" "}
          that form a progressive staircase. The recommended pattern is
          recognition (can you identify the concept?), guided application (can
          you use it with support?), then transfer (can you apply it to a novel
          scenario?) — though this is a content authoring guideline, not
          something the engine enforces. Each KP has its own instruction text,
          worked example, and practice problems. Students climb one step at a
          time, and the engine only
          advances to the next KP after mastery of the current one (two
          consecutive correct answers). This staircase structure prevents the
          common problem of presenting complex material before the student is
          ready for it.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          <Link
            href="/docs/glossary#knowledge-point-kp"
            className="text-primary hover:underline"
          >
            Glossary: Knowledge Point
          </Link>{" "}
          &middot;{" "}
          <Link
            href="/docs/course-schema#knowledge-points"
            className="text-primary hover:underline"
          >
            Course Schema: knowledgePoints
          </Link>
        </p>
      </section>

      {/* 5. Spaced Repetition */}
      <section className="mt-12">
        <h2
          className="text-2xl font-bold text-foreground"
          id="spaced-repetition"
        >
          5. Spaced Repetition
        </h2>
        <p className="mt-2 text-muted-foreground">
          Once a concept is mastered, the engine schedules reviews using the{" "}
          <strong className="text-foreground">FIRe algorithm</strong>{" "}
          (Fractional Implicit Repetition). FIRe is a spaced repetition system
          with a twist: it grants implicit review credit through encompassing
          edges. If a student practices &quot;closures&quot; and
          &quot;closures&quot; has an encompassing edge to &quot;variables&quot;
          with weight 0.7, then &quot;variables&quot; gets 70% of a repetition
          credited automatically. This means students review foundational
          concepts for free while working on advanced ones, reducing the total
          review burden. Each concept tracks a{" "}
          <strong className="text-foreground">memory</strong> value (P(Learned),
          0-1) that decays over time, and a{" "}
          <strong className="text-foreground">repetition number</strong> that
          determines the next review interval.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          <Link
            href="/docs/glossary#fire"
            className="text-primary hover:underline"
          >
            Glossary: FIRe
          </Link>{" "}
          &middot;{" "}
          <Link
            href="/docs/glossary#encompassing-edge"
            className="text-primary hover:underline"
          >
            Glossary: Encompassing Edge
          </Link>{" "}
          &middot;{" "}
          <Link
            href="/docs/glossary#memory"
            className="text-primary hover:underline"
          >
            Glossary: Memory
          </Link>
        </p>
      </section>

      {/* 6. Intelligent Task Selection */}
      <section className="mt-12">
        <h2
          className="text-2xl font-bold text-foreground"
          id="task-selection"
        >
          6. Intelligent Task Selection
        </h2>
        <p className="mt-2 text-muted-foreground">
          Every time a student opens a session, the engine decides what to do
          next. It uses a priority-based system: (1) remediation tasks for
          blocked students come first, (2) overdue spaced repetition reviews
          come second, (3) new learning on the knowledge frontier comes third.
          Within each category, tasks are ranked by urgency — the most overdue
          review or the highest-priority frontier concept wins. The student
          never has to decide what to study. They just press &quot;next&quot;
          and the engine serves the optimal task.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          <Link
            href="/docs/glossary#mastery-state"
            className="text-primary hover:underline"
          >
            Glossary: Mastery State
          </Link>{" "}
          &middot;{" "}
          <Link
            href="/docs/glossary#student-concept-state"
            className="text-primary hover:underline"
          >
            Glossary: Student Concept State
          </Link>
        </p>
      </section>

      {/* 7. Gamification */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="gamification">
          7. Gamification
        </h2>
        <p className="mt-2 text-muted-foreground">
          Consistent engagement is what separates students who finish from those
          who drop off. Graspful drives engagement with three mechanics:{" "}
          <strong className="text-foreground">XP</strong> (experience points
          that scale with difficulty and time spent),{" "}
          <strong className="text-foreground">streaks</strong> (consecutive days
          of practice), and{" "}
          <strong className="text-foreground">leaderboards</strong> (weekly
          rankings per course). XP is earned for completing practice
          problems, finishing KPs, passing section exams, and completing reviews.
          A daily cap of 500 XP and a minimum response time gate prevent
          gaming.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          <Link
            href="/docs/glossary#xp"
            className="text-primary hover:underline"
          >
            Glossary: XP
          </Link>
        </p>
      </section>

      {/* The Two-YAML Workflow */}
      <section className="mt-12">
        <h2
          className="text-2xl font-bold text-foreground"
          id="two-yaml-workflow"
        >
          The Two-YAML Workflow
        </h2>
        <p className="mt-2 text-muted-foreground">
          Every Graspful product is defined by two files. A{" "}
          <strong className="text-foreground">course YAML</strong> defines the
          knowledge graph, concepts, knowledge points, and practice problems. A{" "}
          <strong className="text-foreground">brand YAML</strong> configures the
          product: theme, landing page copy, pricing, SEO, and custom domain.
          Import both, and you have a live white-label learning product with
          adaptive diagnostics, spaced repetition, and Stripe billing. No code
          required.
        </p>
        <CodeBlock language="bash">
          {`# 1. Create and import the course
graspful create course --topic "JavaScript Fundamentals" -o js-course.yaml
graspful import js-course.yaml --org my-org --publish

# 2. Create and import the brand
graspful create brand --name "JS Mastery" --domain js.graspful.ai -o js-brand.yaml
graspful import js-brand.yaml`}
        </CodeBlock>
        <p className="mt-2 text-sm text-muted-foreground">
          See the full schemas:{" "}
          <Link
            href="/docs/course-schema"
            className="text-primary hover:underline"
          >
            Course Schema
          </Link>{" "}
          &middot;{" "}
          <Link
            href="/docs/brand-schema"
            className="text-primary hover:underline"
          >
            Brand Schema
          </Link>
        </p>
      </section>

      {/* Architecture */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="architecture">
          Architecture
        </h2>
        <p className="mt-2 text-muted-foreground">
          The backend is built with NestJS and follows Domain-Driven Design with
          seven bounded contexts: Knowledge Graph, Student Model, Diagnostic,
          Learning Engine, Assessment, Spaced Repetition, and Gamification. Each
          context owns its domain logic and database queries. The frontend is
          Next.js with Tailwind CSS and shadcn/ui. Authentication is handled by
          Supabase Auth. The monorepo is managed with Turborepo and bun.
        </p>
        <div className="mt-4 rounded-xl border border-border/50 bg-muted/30 p-5">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">For AI agents:</strong> The
            system exposes two integration surfaces — a CLI (
            <code className="rounded-md bg-muted px-1.5 py-0.5 text-sm font-mono">
              @graspful/cli
            </code>
            ) and an MCP server. Both accept YAML as input and return structured
            JSON. The fastest path to creating a course is:{" "}
            <code className="rounded-md bg-muted px-1.5 py-0.5 text-sm font-mono">
              create &rarr; fill &rarr; review &rarr; import
            </code>
            .
          </p>
        </div>
      </section>

      {/* Next steps */}
      <section className="mt-16 rounded-xl border border-border/50 bg-card p-8">
        <h2 className="text-xl font-bold text-foreground mb-4">Next steps</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/docs/quickstart"
            className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowRight className="h-3.5 w-3.5 text-primary" />
            <span>Quickstart — create your first course in 5 minutes</span>
          </Link>
          <Link
            href="/docs/course-creation-guide"
            className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowRight className="h-3.5 w-3.5 text-primary" />
            <span>Course Creation Guide — in-depth authoring walkthrough</span>
          </Link>
          <Link
            href="/docs/glossary"
            className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowRight className="h-3.5 w-3.5 text-primary" />
            <span>Glossary — every term defined</span>
          </Link>
          <Link
            href="/docs/course-schema"
            className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowRight className="h-3.5 w-3.5 text-primary" />
            <span>Course Schema — full YAML reference</span>
          </Link>
          <Link
            href="/docs/brand-schema"
            className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowRight className="h-3.5 w-3.5 text-primary" />
            <span>Brand Schema — theme, pricing, and landing pages</span>
          </Link>
          <Link
            href="/docs/cli"
            className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowRight className="h-3.5 w-3.5 text-primary" />
            <span>CLI Reference — every command documented</span>
          </Link>
          <Link
            href="/docs/review-gate"
            className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowRight className="h-3.5 w-3.5 text-primary" />
            <span>Review Gate — the 10 quality checks</span>
          </Link>
          <Link
            href="/docs/mcp"
            className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowRight className="h-3.5 w-3.5 text-primary" />
            <span>MCP Server — AI agent integration</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
