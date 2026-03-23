import type { Metadata } from "next";
import Link from "next/link";
import { CodeBlock, InlineCode } from "@/components/docs/code-block";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Course Creation Guide — Graspful Docs",
  description:
    "Step-by-step guide to building an adaptive learning course on Graspful. Design knowledge graphs, author knowledge points, write problems, configure exams, and publish.",
  keywords: [
    "graspful course creation",
    "create adaptive course",
    "knowledge graph design",
    "course authoring guide",
    "YAML course",
    "learning design",
  ],
};

export default function CourseCreationGuidePage() {
  return (
    <div>
      <h1 className="text-4xl font-bold tracking-[-0.04em] text-foreground">
        How to Create a Course
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
        A complete guide to building an adaptive learning course on Graspful.
        Every section explains the concept first, then shows a worked example
        using a JavaScript Fundamentals course as illustration. The principles
        apply to any subject — firefighting, real estate, AWS, or anything
        else that can be broken into learnable concepts.
      </p>

      {/* Table of contents */}
      <nav className="mt-8 rounded-xl border border-border/50 bg-muted/30 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground mb-3">
          On this page
        </h2>
        <ol className="space-y-1.5 text-sm text-muted-foreground list-decimal list-inside">
          <li>
            <a href="#choose-your-subject" className="text-primary hover:underline">
              Choose Your Subject
            </a>
          </li>
          <li>
            <a href="#design-the-knowledge-graph" className="text-primary hover:underline">
              Design the Knowledge Graph
            </a>
          </li>
          <li>
            <a href="#author-knowledge-points" className="text-primary hover:underline">
              Author Knowledge Points
            </a>
          </li>
          <li>
            <a href="#write-problems" className="text-primary hover:underline">
              Write Problems
            </a>
          </li>
          <li>
            <a href="#add-section-exams" className="text-primary hover:underline">
              Add Section Exams
            </a>
          </li>
          <li>
            <a href="#set-difficulty-and-metadata" className="text-primary hover:underline">
              Set Difficulty and Metadata
            </a>
          </li>
          <li>
            <a href="#validate-and-import" className="text-primary hover:underline">
              Validate and Import
            </a>
          </li>
          <li>
            <a href="#create-your-brand" className="text-primary hover:underline">
              Create Your Brand
            </a>
          </li>
        </ol>
      </nav>

      {/* ================================================================ */}
      {/* 1. Choose Your Subject */}
      {/* ================================================================ */}
      <section className="mt-16">
        <h2
          className="text-2xl font-bold text-foreground"
          id="choose-your-subject"
        >
          1. Choose Your Subject
        </h2>
        <p className="mt-2 text-muted-foreground">
          Graspful works best for skill-based subjects that can be broken into
          discrete, testable concepts. Good candidates have a natural
          prerequisite structure — some topics must be understood before others
          make sense.
        </p>

        <h3 className="text-lg font-semibold text-foreground mt-6">
          What makes a good Graspful course
        </h3>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>
            <strong className="text-foreground">Skill-based:</strong> Students
            need to apply knowledge, not just recall it. Certification exams,
            professional skills, and technical subjects are ideal.
          </li>
          <li>
            <strong className="text-foreground">Decomposable:</strong> The
            subject can be split into 20-200 concepts, each independently
            testable. If you can write 3+ practice problems for an idea, it is
            probably a concept.
          </li>
          <li>
            <strong className="text-foreground">Prerequisite-rich:</strong>{" "}
            Some topics depend on others. &quot;Closures&quot; requires
            &quot;functions&quot; which requires &quot;variables.&quot; This
            structure is what makes adaptive learning powerful — without it, you
            just have a quiz bank.
          </li>
        </ul>

        <h3 className="text-lg font-semibold text-foreground mt-6">
          Single course vs. academy
        </h3>
        <p className="mt-2 text-muted-foreground">
          Use a <strong className="text-foreground">single course</strong> when
          the subject has one clear learning path (e.g., &quot;JavaScript
          Fundamentals&quot;). Use an{" "}
          <strong className="text-foreground">academy</strong> when you have
          multiple related courses that share foundational concepts (e.g., a
          &quot;Web Development Academy&quot; containing JavaScript, TypeScript,
          and React courses). Academies let prerequisites span course
          boundaries.
        </p>
      </section>

      {/* ================================================================ */}
      {/* 2. Design the Knowledge Graph */}
      {/* ================================================================ */}
      <section className="mt-16">
        <h2
          className="text-2xl font-bold text-foreground"
          id="design-the-knowledge-graph"
        >
          2. Design the Knowledge Graph
        </h2>
        <p className="mt-2 text-muted-foreground">
          The knowledge graph is the skeleton of your course. Get this right and
          everything else follows. Get it wrong and no amount of great content
          will save the learning experience.
        </p>

        <h3 className="text-lg font-semibold text-foreground mt-6">
          Start with the tree, not the prose
        </h3>
        <p className="mt-2 text-muted-foreground">
          Do not start by writing lessons. Start by listing every concept in
          your subject and drawing the prerequisite arrows between them. Think
          of it as a dependency graph: what does a student need to know before
          they can understand this idea? Write the graph structure first, then
          fill in the content.
        </p>

        <h3 className="text-lg font-semibold text-foreground mt-6">
          Identify atomic concepts
        </h3>
        <p className="mt-2 text-muted-foreground">
          A concept is one teachable idea that can be tested independently. The
          test: can you write 3 distinct practice problems for this concept
          that do not require knowledge from any other concept? If yes, it is a
          good concept. If you need to explain two unrelated things to write the
          problems, the concept is too broad — split it. If you cannot write 3
          distinct problems, it is too narrow — merge it into a parent concept
          as a knowledge point.
        </p>

        <h3 className="text-lg font-semibold text-foreground mt-6">
          Map prerequisites
        </h3>
        <p className="mt-2 text-muted-foreground">
          For each concept, ask: &quot;What must the student already know?&quot;
          List only <strong className="text-foreground">direct</strong>{" "}
          prerequisites — max 3-4 per concept. Transitive prerequisites are
          inferred automatically. If A requires B and B requires C, do not list
          C as a prerequisite of A. The prerequisite graph must be a DAG (no
          cycles).
        </p>

        <h3 className="text-lg font-semibold text-foreground mt-6">
          Add encompassing edges
        </h3>
        <p className="mt-2 text-muted-foreground">
          Encompassing edges answer: &quot;When a student practices this
          advanced concept, which foundational concepts get exercised?&quot; For
          example, every closure problem exercises the student&apos;s
          understanding of functions and variables. Adding encompassing edges
          with appropriate weights (0.2-1.0) lets the spaced repetition engine
          grant implicit review credit, reducing the total review burden.
        </p>

        <h3 className="text-lg font-semibold text-foreground mt-6">
          Example: JavaScript course graph skeleton
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          This is the structure only — no content yet. Notice how the prerequisite
          arrows form a DAG, and encompassing edges capture implicit practice
          relationships.
        </p>
        <CodeBlock language="yaml" title="js-fundamentals.yaml (graph skeleton)">
          {`course:
  id: js-fundamentals
  name: JavaScript Fundamentals
  description: Core JavaScript for web developers
  estimatedHours: 25
  version: "2026.1"
  sourceDocument: "MDN Web Docs"

sections:
  - id: basics
    name: Language Basics
    description: Variables, types, and operators
  - id: functions
    name: Functions
    description: Declarations, scope, and closures
  - id: async
    name: Asynchronous JavaScript
    description: Callbacks, promises, and the event loop

concepts:
  # --- Basics ---
  - id: variables
    name: Variables and Declarations
    section: basics
    difficulty: 2
    estimatedMinutes: 15
    prerequisites: []
    knowledgePoints: []   # stub — fill later

  - id: data-types
    name: Primitive Data Types
    section: basics
    difficulty: 2
    estimatedMinutes: 20
    prerequisites: [variables]
    knowledgePoints: []

  - id: operators
    name: Operators and Expressions
    section: basics
    difficulty: 3
    estimatedMinutes: 20
    prerequisites: [variables, data-types]
    knowledgePoints: []

  # --- Functions ---
  - id: function-declarations
    name: Function Declarations and Expressions
    section: functions
    difficulty: 3
    estimatedMinutes: 25
    prerequisites: [variables, operators]
    knowledgePoints: []

  - id: scope
    name: Scope and Hoisting
    section: functions
    difficulty: 4
    estimatedMinutes: 25
    prerequisites: [function-declarations]
    encompassing:
      - concept: variables
        weight: 0.5
    knowledgePoints: []

  - id: closures
    name: Closures
    section: functions
    difficulty: 6
    estimatedMinutes: 30
    prerequisites: [scope]
    encompassing:
      - concept: function-declarations
        weight: 0.7
      - concept: scope
        weight: 0.8
      - concept: variables
        weight: 0.4
    knowledgePoints: []

  # --- Async ---
  - id: callbacks
    name: Callbacks
    section: async
    difficulty: 5
    estimatedMinutes: 20
    prerequisites: [function-declarations]
    encompassing:
      - concept: function-declarations
        weight: 0.6
    knowledgePoints: []

  - id: promises
    name: Promises
    section: async
    difficulty: 6
    estimatedMinutes: 30
    prerequisites: [callbacks]
    encompassing:
      - concept: callbacks
        weight: 0.5
    knowledgePoints: []

  - id: event-loop
    name: The Event Loop
    section: async
    difficulty: 7
    estimatedMinutes: 35
    prerequisites: [promises, closures]
    encompassing:
      - concept: promises
        weight: 0.6
      - concept: callbacks
        weight: 0.4
      - concept: closures
        weight: 0.3
    knowledgePoints: []`}
        </CodeBlock>
      </section>

      {/* ================================================================ */}
      {/* 3. Author Knowledge Points */}
      {/* ================================================================ */}
      <section className="mt-16">
        <h2
          className="text-2xl font-bold text-foreground"
          id="author-knowledge-points"
        >
          3. Author Knowledge Points
        </h2>
        <p className="mt-2 text-muted-foreground">
          Knowledge points (KPs) are the progressive steps within each concept.
          They form the{" "}
          <strong className="text-foreground">learning staircase</strong> — each
          step builds on the last, and students climb one step at a time.
        </p>

        <h3 className="text-lg font-semibold text-foreground mt-6">
          The staircase: recognition, guided application, transfer
        </h3>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>
            <strong className="text-foreground">KP1 — Recognition:</strong> Can
            the student identify the concept? Define terms, recognize examples,
            distinguish it from similar ideas.
          </li>
          <li>
            <strong className="text-foreground">KP2 — Guided application:</strong>{" "}
            Can the student use it with support? Apply a formula, follow a
            procedure, work a standard problem.
          </li>
          <li>
            <strong className="text-foreground">KP3 — Transfer:</strong> Can
            the student apply it to a novel scenario? Debug unfamiliar code,
            choose the right approach for a new situation, combine with other
            concepts.
          </li>
        </ul>
        <p className="mt-3 text-sm text-muted-foreground">
          Not every concept needs exactly 3 KPs. Simple concepts (difficulty
          1-3) might have 2. Complex concepts (difficulty 7+) might have 4.
          The key is that each KP teaches one distinct thing and the difficulty
          increases monotonically.
        </p>

        <h3 className="text-lg font-semibold text-foreground mt-6">
          Writing instruction text
        </h3>
        <p className="mt-2 text-muted-foreground">
          Instruction text is what the student sees before practicing. Write it
          for audio — Graspful generates TTS from instruction text. This means:
          short sentences, no walls of text, no markdown tables (they do not
          work in audio). If instruction exceeds 100 words, you must add
          structured{" "}
          <InlineCode>instructionContent</InlineCode> blocks (images, callouts)
          to break it up. The{" "}
          <Link
            href="/docs/review-gate#instruction_formatting"
            className="text-primary hover:underline"
          >
            review gate
          </Link>{" "}
          enforces this.
        </p>

        <h3 className="text-lg font-semibold text-foreground mt-6">
          Writing worked examples
        </h3>
        <p className="mt-2 text-muted-foreground">
          A worked example shows the concept applied step by step. It bridges
          instruction and practice — the student sees how to think through the
          problem before attempting one themselves. At least 50% of authored
          concepts should have at least one KP with a worked example. Focus
          worked examples on the higher-difficulty KPs where students are most
          likely to get stuck.
        </p>

        <h3 className="text-lg font-semibold text-foreground mt-6">
          Example: closures concept with 3 KPs
        </h3>
        <CodeBlock language="yaml" title="closures concept — knowledge points">
          {`  - id: closures
    name: Closures
    section: functions
    difficulty: 6
    estimatedMinutes: 30
    prerequisites: [scope]
    encompassing:
      - concept: function-declarations
        weight: 0.7
      - concept: scope
        weight: 0.8
      - concept: variables
        weight: 0.4
    knowledgePoints:
      - id: closures-kp1
        instruction: |
          A closure is a function that remembers the variables from the
          scope where it was created, even after that scope has closed.
          Every function in JavaScript is a closure. When you write a
          function inside another function, the inner function can access
          the outer function's variables — even after the outer function
          has returned.
        problems: []  # filled in step 4

      - id: closures-kp2
        instruction: |
          Closures are commonly used to create private state. You write a
          function that declares a variable, then returns an inner function
          that reads or modifies that variable. The variable is invisible
          to the outside world — only the returned function can access it.
        workedExample: |
          Problem: Create a counter that starts at 0 and increments by 1
          each time it is called.

          Step 1: Write an outer function that declares a count variable.
            function makeCounter() { let count = 0; }

          Step 2: Return an inner function that increments and returns count.
            function makeCounter() {
              let count = 0;
              return function() { count += 1; return count; };
            }

          Step 3: Call the outer function to get a counter.
            const counter = makeCounter();
            counter(); // 1
            counter(); // 2

          The inner function closes over count. Each call to makeCounter
          creates a new, independent count variable.
        problems: []

      - id: closures-kp3
        instruction: |
          A common closure bug happens in loops. When you create functions
          inside a loop using var, all functions share the same variable
          and see its final value. The fix: use let (which creates a new
          binding per iteration) or wrap the body in an IIFE.
        workedExample: |
          Bug: This code logs "3" three times instead of "0, 1, 2":
            for (var i = 0; i < 3; i++) {
              setTimeout(function() { console.log(i); }, 100);
            }
          Why: All three functions close over the same i, which is 3
          when the timeouts fire.

          Fix: Change var to let:
            for (let i = 0; i < 3; i++) {
              setTimeout(function() { console.log(i); }, 100);
            }
          Now each iteration creates a new i binding, so each function
          closes over its own copy.
        problems: []`}
        </CodeBlock>
      </section>

      {/* ================================================================ */}
      {/* 4. Write Problems */}
      {/* ================================================================ */}
      <section className="mt-16">
        <h2
          className="text-2xl font-bold text-foreground"
          id="write-problems"
        >
          4. Write Problems
        </h2>
        <p className="mt-2 text-muted-foreground">
          Problems are how the engine tests and tracks mastery. The quality of
          your problems directly determines the quality of the adaptive
          experience.
        </p>

        <h3 className="text-lg font-semibold text-foreground mt-6">
          Problem types
        </h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {[
            {
              type: "multiple_choice",
              desc: "4 options, 1 correct. The workhorse. Use for most problems.",
            },
            {
              type: "true_false",
              desc: "Binary choice. Good for testing precise definitions and common misconceptions.",
            },
            {
              type: "fill_blank",
              desc: "Free-text answer. The system normalizes input. Good for recall.",
            },
            {
              type: "ordering",
              desc: "Arrange 4-6 steps in sequence. Good for procedures and algorithms.",
            },
            {
              type: "matching",
              desc: "Match items from two columns. Good for terminology and associations.",
            },
            {
              type: "scenario",
              desc: "Rich context followed by a question. Best for complex application.",
            },
          ].map((p) => (
            <div
              key={p.type}
              className="rounded-lg border border-border/30 bg-card p-4"
            >
              <code className="text-xs font-mono font-semibold text-primary">
                {p.type}
              </code>
              <p className="mt-1 text-xs text-muted-foreground">{p.desc}</p>
            </div>
          ))}
        </div>

        <h3 className="text-lg font-semibold text-foreground mt-6">
          The deduplication rule
        </h3>
        <p className="mt-2 text-muted-foreground">
          No two problems should test the same fact at the same cognitive level.
          The{" "}
          <Link
            href="/docs/review-gate#question_deduplication"
            className="text-primary hover:underline"
          >
            review gate
          </Link>{" "}
          checks for near-duplicate questions via normalized text hashing. To
          create distinct variants, change the scenario, vary the distractors,
          adjust the difficulty, or test the concept from a different angle.
        </p>

        <h3 className="text-lg font-semibold text-foreground mt-6">
          Variant depth: 3-4 minimum per KP
        </h3>
        <p className="mt-2 text-muted-foreground">
          Every knowledge point needs at least 3 problems. This gives the
          adaptive engine enough material to (a) verify mastery with two
          consecutive correct answers and (b) retry with a different problem if
          the student fails. Four or more is better. The{" "}
          <Link
            href="/docs/review-gate#problem_variant_depth"
            className="text-primary hover:underline"
          >
            review gate
          </Link>{" "}
          blocks publishing if any KP has fewer than 3.
        </p>

        <h3 className="text-lg font-semibold text-foreground mt-6">
          Writing explanations that diagnose misconceptions
        </h3>
        <p className="mt-2 text-muted-foreground">
          An explanation should not just reveal the answer. It should name the
          likely misconception that led to the wrong answer. Instead of
          &quot;The answer is B,&quot; write &quot;If you chose A, you may be
          confusing closures with callbacks. The key difference is...&quot; Good
          explanations turn wrong answers into learning moments.
        </p>

        <h3 className="text-lg font-semibold text-foreground mt-6">
          Example: closures problems at three difficulty levels
        </h3>
        <CodeBlock language="yaml" title="closures-kp1 problems">
          {`        problems:
          # Difficulty 1 — recognition
          - id: closures-kp1-p1
            type: multiple_choice
            question: "What is a closure in JavaScript?"
            options:
              - "A function that remembers variables from its creation scope"
              - "A function that runs immediately when defined"
              - "A function that cannot access outer variables"
              - "A function that is only callable once"
            correct: 0
            explanation: >
              A closure is a function bundled with references to its surrounding
              scope. If you chose B, you may be thinking of an IIFE (Immediately
              Invoked Function Expression), which is a separate concept.
            difficulty: 1

          # Difficulty 2 — recognition with nuance
          - id: closures-kp1-p2
            type: true_false
            question: >
              True or false: Every function in JavaScript is technically a closure.
            options: ["True", "False"]
            correct: 0
            explanation: >
              True. In JavaScript, every function closes over the scope in which
              it was defined. We typically use the term "closure" for cases where
              this behavior is deliberate and observable — but technically, all
              functions are closures.
            difficulty: 2

          # Difficulty 3 — identify a closure in code
          - id: closures-kp1-p3
            type: multiple_choice
            question: >
              Which line creates a closure?
              function greet(name) {
                return function() { console.log("Hi " + name); };
              }
            options:
              - "Line 1: function greet(name)"
              - "Line 2: return function()"
              - "Line 2: the returned function closes over 'name'"
              - "No closure is created in this code"
            correct: 2
            explanation: >
              The anonymous function returned on line 2 closes over the 'name'
              parameter from greet's scope. When greet finishes executing, the
              returned function still has access to 'name'. If you chose A, note
              that greet itself does not close over anything unusual — it is the
              inner function that forms the closure.
            difficulty: 3

          # Difficulty 4 — predict output
          - id: closures-kp1-p4
            type: multiple_choice
            question: >
              What does this code output?
              function outer() {
                let x = 10;
                function inner() { console.log(x); }
                x = 20;
                return inner;
              }
              outer()();
            options:
              - "10"
              - "20"
              - "undefined"
              - "ReferenceError"
            correct: 1
            explanation: >
              The inner function closes over the variable x, not its value at
              the time of creation. When inner executes, x has been reassigned
              to 20. If you chose A, remember: closures capture variables by
              reference, not by value.
            difficulty: 4`}
        </CodeBlock>
      </section>

      {/* ================================================================ */}
      {/* 5. Add Section Exams */}
      {/* ================================================================ */}
      <section className="mt-16">
        <h2
          className="text-2xl font-bold text-foreground"
          id="add-section-exams"
        >
          5. Add Section Exams
        </h2>
        <p className="mt-2 text-muted-foreground">
          Section exams are optional cumulative assessments at the end of a
          section. They gate progression: a student must pass the exam before
          moving to concepts in the next section. Use section exams when your
          course has natural groupings where you want to verify broad
          understanding before advancing.
        </p>

        <h3 className="text-lg font-semibold text-foreground mt-6">
          When to use sections vs. flat concept lists
        </h3>
        <p className="mt-2 text-muted-foreground">
          Use sections when your course has 15+ concepts and natural groupings.
          A flat concept list (no sections) works fine for smaller courses where
          the prerequisite graph alone provides enough structure. You do not
          need to add a section exam to every section — only add them where
          cumulative verification adds value.
        </p>

        <h3 className="text-lg font-semibold text-foreground mt-6">
          Blueprint design
        </h3>
        <p className="mt-2 text-muted-foreground">
          The exam blueprint specifies minimum questions per concept, ensuring
          broad coverage. The total{" "}
          <InlineCode>questionCount</InlineCode> must be greater than or equal
          to the sum of all <InlineCode>minQuestions</InlineCode> in the
          blueprint. The engine fills remaining slots by sampling from all
          section concepts. Design for unaided reasoning — no hints, no
          instruction text.
        </p>

        <h3 className="text-lg font-semibold text-foreground mt-6">
          Passing score and time limits
        </h3>
        <p className="mt-2 text-muted-foreground">
          The default passing score is 75%. You can adjust it per section. Time
          limits are optional — if set, the exam auto-submits when time runs
          out. A good heuristic: allow 1-2 minutes per question.
        </p>

        <h3 className="text-lg font-semibold text-foreground mt-6">
          Example: Functions section exam
        </h3>
        <CodeBlock language="yaml" title="section exam blueprint">
          {`sections:
  - id: functions
    name: Functions
    description: Declarations, scope, and closures
    sectionExam:
      enabled: true
      passingScore: 0.75
      timeLimitMinutes: 20
      questionCount: 12
      blueprint:
        - conceptId: function-declarations
          minQuestions: 3
        - conceptId: scope
          minQuestions: 3
        - conceptId: closures
          minQuestions: 4
      instructions: >
        This exam covers all concepts in the Functions section.
        You have 20 minutes to complete 12 questions. No notes
        or references are allowed. You need 75% to pass.`}
        </CodeBlock>
      </section>

      {/* ================================================================ */}
      {/* 6. Set Difficulty and Metadata */}
      {/* ================================================================ */}
      <section className="mt-16">
        <h2
          className="text-2xl font-bold text-foreground"
          id="set-difficulty-and-metadata"
        >
          6. Set Difficulty and Metadata
        </h2>
        <p className="mt-2 text-muted-foreground">
          Each concept has metadata that calibrates the adaptive engine and
          helps with course organization.
        </p>

        <h3 className="text-lg font-semibold text-foreground mt-6">
          Difficulty scale (1-10)
        </h3>
        <p className="mt-2 text-muted-foreground">
          Difficulty is a concept-level rating that tells the engine how hard
          this idea is relative to other concepts in the course. The scale:
        </p>
        <div className="mt-3 rounded-xl border border-border/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30 bg-muted/30">
                <th className="px-4 py-2 text-left text-xs font-semibold text-foreground">
                  Level
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-foreground">
                  Description
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-foreground">
                  Example
                </th>
              </tr>
            </thead>
            <tbody className="text-sm text-muted-foreground">
              <tr className="border-b border-border/20">
                <td className="px-4 py-2 font-mono text-xs text-primary">1-2</td>
                <td className="px-4 py-2">Recognition and basic recall</td>
                <td className="px-4 py-2">Variables, primitive data types</td>
              </tr>
              <tr className="border-b border-border/20">
                <td className="px-4 py-2 font-mono text-xs text-primary">3-4</td>
                <td className="px-4 py-2">Comprehension and guided application</td>
                <td className="px-4 py-2">Operators, function declarations</td>
              </tr>
              <tr className="border-b border-border/20">
                <td className="px-4 py-2 font-mono text-xs text-primary">5-6</td>
                <td className="px-4 py-2">Application and analysis</td>
                <td className="px-4 py-2">Closures, callbacks, promises</td>
              </tr>
              <tr className="border-b border-border/20">
                <td className="px-4 py-2 font-mono text-xs text-primary">7-8</td>
                <td className="px-4 py-2">Complex analysis and synthesis</td>
                <td className="px-4 py-2">Event loop, async patterns</td>
              </tr>
              <tr className="border-b border-border/20 last:border-0">
                <td className="px-4 py-2 font-mono text-xs text-primary">9-10</td>
                <td className="px-4 py-2">Multi-step transfer, novel problem solving</td>
                <td className="px-4 py-2">Designing async architectures</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-lg font-semibold text-foreground mt-6">
          Estimated minutes
        </h3>
        <p className="mt-2 text-muted-foreground">
          How long you expect a typical student to spend mastering this concept,
          including instruction, worked examples, and practice. This calibrates
          course-level time estimates and XP awards. A good heuristic:
          difficulty 1-3 takes 10-20 minutes, difficulty 4-6 takes 20-35
          minutes, difficulty 7+ takes 30-45 minutes.
        </p>

        <h3 className="text-lg font-semibold text-foreground mt-6">
          Tags
        </h3>
        <p className="mt-2 text-muted-foreground">
          Tags are free-form labels for cross-cutting concerns. Use them for
          filtering and analytics — for example,{" "}
          <InlineCode>foundational</InlineCode>,{" "}
          <InlineCode>calculation</InlineCode>,{" "}
          <InlineCode>hands-on</InlineCode>. Tags have no effect on the
          adaptive engine.
        </p>

        <h3 className="text-lg font-semibold text-foreground mt-6">
          Source references
        </h3>
        <p className="mt-2 text-muted-foreground">
          The <InlineCode>sourceRef</InlineCode> field traces a concept back to
          the authoritative source material. For certification courses, this is
          the exam guide section. For academic courses, the textbook chapter.
          Source references help with auditing and content updates.
        </p>
      </section>

      {/* ================================================================ */}
      {/* 7. Validate and Import */}
      {/* ================================================================ */}
      <section className="mt-16">
        <h2
          className="text-2xl font-bold text-foreground"
          id="validate-and-import"
        >
          7. Validate and Import
        </h2>
        <p className="mt-2 text-muted-foreground">
          Before publishing, your course must pass schema validation and the
          10-check review gate.
        </p>

        <h3 className="text-lg font-semibold text-foreground mt-6">
          Schema validation
        </h3>
        <p className="mt-2 text-muted-foreground">
          Run{" "}
          <InlineCode>graspful validate</InlineCode> to check that your YAML
          conforms to the schema — correct field types, required fields present,
          no cycles in the prerequisite graph.
        </p>
        <CodeBlock language="bash">
          {`graspful validate js-fundamentals.yaml`}
        </CodeBlock>

        <h3 className="text-lg font-semibold text-foreground mt-6">
          Review gate
        </h3>
        <p className="mt-2 text-muted-foreground">
          The review gate runs 10 mechanical quality checks: YAML parsing,
          unique problem IDs, valid prerequisites, question deduplication,
          difficulty staircase, cross-concept coverage, variant depth,
          instruction formatting, worked example coverage, and import dry run.
          A score of 10/10 is required to publish.
        </p>
        <CodeBlock language="bash">
          {`# Run all 10 checks
graspful review js-fundamentals.yaml

# JSON output for CI pipelines
graspful review js-fundamentals.yaml --format json`}
        </CodeBlock>
        <p className="mt-2 text-sm text-muted-foreground">
          See{" "}
          <Link
            href="/docs/review-gate"
            className="text-primary hover:underline"
          >
            Review Gate
          </Link>{" "}
          for details on each check and how to fix failures.
        </p>

        <h3 className="text-lg font-semibold text-foreground mt-6">
          Import and publish
        </h3>
        <p className="mt-2 text-muted-foreground">
          Once you pass 10/10, import the course. Use{" "}
          <InlineCode>--publish</InlineCode> to go live immediately (the
          server re-runs the review gate before publishing).
        </p>
        <CodeBlock language="bash">
          {`# Import as draft
graspful import js-fundamentals.yaml --org my-org

# Import and publish in one step
graspful import js-fundamentals.yaml --org my-org --publish`}
        </CodeBlock>
      </section>

      {/* ================================================================ */}
      {/* 8. Create Your Brand */}
      {/* ================================================================ */}
      <section className="mt-16">
        <h2
          className="text-2xl font-bold text-foreground"
          id="create-your-brand"
        >
          8. Create Your Brand
        </h2>
        <p className="mt-2 text-muted-foreground">
          A brand YAML configures the white-label product that students see:
          theme, landing page, pricing, SEO, and domain. Students never see
          Graspful — they see your brand.
        </p>

        <h3 className="text-lg font-semibold text-foreground mt-6">
          Brand YAML
        </h3>
        <p className="mt-2 text-muted-foreground">
          The brand YAML defines the product identity, theme preset, landing
          page copy, FAQ, pricing, and SEO metadata. See the{" "}
          <Link
            href="/docs/brand-schema"
            className="text-primary hover:underline"
          >
            Brand Schema
          </Link>{" "}
          for the full reference.
        </p>
        <CodeBlock language="yaml" title="js-mastery-brand.yaml">
          {`brand:
  id: js-mastery
  name: JS Mastery
  domain: js-mastery.graspful.com
  tagline: "Master JavaScript from zero to async."
  orgSlug: my-org

theme:
  preset: amber
  radius: "0.5rem"

landing:
  hero:
    headline: "Learn JavaScript the Smart Way"
    subheadline: "Adaptive learning that focuses on what you don't know yet."
    ctaText: "Start Learning"
  features:
    heading: "Why JS Mastery?"
    items:
      - title: "Adaptive Engine"
        description: "Skips what you know. Focuses on your gaps."
        icon: Brain
      - title: "Spaced Repetition"
        description: "Never forget what you've learned."
        icon: Clock
      - title: "Real Problems"
        description: "Practice with code, not flashcards."
        icon: Code
  howItWorks:
    heading: "How It Works"
    items:
      - title: "Take a diagnostic"
        description: "20 questions to map what you already know."
      - title: "Learn adaptively"
        description: "The engine builds your personal learning path."
      - title: "Master JavaScript"
        description: "Prove mastery through progressive challenges."
  faq:
    - question: "How long does it take?"
      answer: "Most learners finish in 4-6 weeks studying 30 min/day."
    - question: "Do I need prior experience?"
      answer: "No. The course starts from variables and builds up."
  bottomCta:
    headline: "Ready to master JavaScript?"

seo:
  title: "JS Mastery — Adaptive JavaScript Learning"
  description: "Learn JavaScript with adaptive diagnostics and spaced repetition."
  keywords: [javascript, learn javascript, javascript course]

pricing:
  monthly: 19
  yearly: 149
  currency: usd
  trialDays: 7

contentScope:
  courseIds: [js-fundamentals]`}
        </CodeBlock>

        <h3 className="text-lg font-semibold text-foreground mt-6">
          Custom domain setup
        </h3>
        <p className="mt-2 text-muted-foreground">
          By default, brands are served at{" "}
          <InlineCode>your-brand.graspful.com</InlineCode>. For a custom domain
          (e.g., <InlineCode>learn.yourdomain.com</InlineCode>), add a CNAME
          record pointing to{" "}
          <InlineCode>brands.graspful.com</InlineCode> and update the{" "}
          <InlineCode>domain</InlineCode> field in your brand YAML. SSL is
          provisioned automatically.
        </p>

        <h3 className="text-lg font-semibold text-foreground mt-6">
          Launch checklist
        </h3>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>
            <strong className="text-foreground">Course:</strong> Imported and
            published (review gate 10/10)
          </li>
          <li>
            <strong className="text-foreground">Brand:</strong> Imported with
            landing page copy, theme, and pricing configured
          </li>
          <li>
            <strong className="text-foreground">Domain:</strong> CNAME record
            set (if using custom domain)
          </li>
          <li>
            <strong className="text-foreground">Stripe:</strong> Connect account
            linked for paid courses (see{" "}
            <Link
              href="/docs/billing"
              className="text-primary hover:underline"
            >
              Billing
            </Link>
            )
          </li>
          <li>
            <strong className="text-foreground">Test:</strong> Go through the
            diagnostic as a student to verify the experience
          </li>
        </ul>

        <CodeBlock language="bash">
          {`# Import the brand
graspful import js-mastery-brand.yaml

# Verify everything is live
graspful describe --org my-org`}
        </CodeBlock>
      </section>

      {/* Next steps */}
      <section className="mt-16 rounded-xl border border-border/50 bg-card p-8">
        <h2 className="text-xl font-bold text-foreground mb-4">Next steps</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/docs/course-schema"
            className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowRight className="h-3.5 w-3.5 text-primary" />
            <span>Course Schema — full YAML field reference</span>
          </Link>
          <Link
            href="/docs/brand-schema"
            className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowRight className="h-3.5 w-3.5 text-primary" />
            <span>Brand Schema — theme, pricing, and SEO reference</span>
          </Link>
          <Link
            href="/docs/review-gate"
            className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowRight className="h-3.5 w-3.5 text-primary" />
            <span>Review Gate — the 10 quality checks explained</span>
          </Link>
          <Link
            href="/docs/cli"
            className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowRight className="h-3.5 w-3.5 text-primary" />
            <span>CLI Reference — every command documented</span>
          </Link>
          <Link
            href="/docs/how-it-works"
            className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowRight className="h-3.5 w-3.5 text-primary" />
            <span>How Graspful Works — system overview</span>
          </Link>
          <Link
            href="/docs/glossary"
            className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowRight className="h-3.5 w-3.5 text-primary" />
            <span>Glossary — every term defined</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
