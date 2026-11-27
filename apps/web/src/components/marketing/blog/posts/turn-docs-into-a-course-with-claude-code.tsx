import { A, Code, H2, P } from "../prose";

const reviewChecks: [string, string][] = [
  ["yaml_parses", "Structure and answer keys match the course schema."],
  ["unique_problem_ids", "Every problem ID is unique across the course."],
  ["publication_readiness", "Every concept has teaching content and no placeholder text."],
  ["question_deduplication", "No two questions at the same difficulty say the same thing."],
  ["difficulty_staircase", "Each concept has problems at two or more difficulty levels."],
  ["problem_teaching_alignment", "Questions test material the lessons actually teach."],
  ["problem_variant_depth", "Each knowledge point has at least three practice problems."],
  ["instruction_formatting", "Lessons over 100 words are broken up with content blocks."],
  ["worked_example_coverage", "At least half of the concepts include a worked example."],
  ["import_dry_run", "IDs are unique and prerequisites exist with no cycles."],
];

export function TurnDocsIntoACourseWithClaudeCode() {
  return (
    <>
      <P>
        To turn your docs into a course with Claude Code, have it read the docs,
        map them into a graph of concepts and prerequisites, write a lesson,
        worked example and practice questions for each concept, then run an
        automated review before anyone sees the result. Graspful is an adaptive
        learning platform that gives Claude Code a CLI and an MCP server for
        exactly this: it defines the course file, checks it with 10 quality
        checks, and runs the published course with a diagnostic, mastery gating
        and spaced review.
      </P>
      <P>
        This guide uses real commands and real output from the Graspful CLI.
        You can draft and review the whole course on your machine without an
        account. You only sign in to import and publish.
      </P>

      <H2 id="why-not-just-ask">Why not just ask Claude Code for a course?</H2>
      <P>
        You can. Ask Claude Code to &quot;make a course from these docs&quot;
        and it will write pages of lessons and a quiz. The problem shows up a
        week later. A folder of HTML or a SCORM package doesn&apos;t know what
        each learner already knows, doesn&apos;t stop them from moving on
        before they get the basics, and doesn&apos;t bring a topic back when
        they start to forget it. Nothing checks that every lesson has enough
        practice, or that the questions test what the lessons teach.
      </P>
      <P>
        The fix is to give the agent a target with rules. In Graspful that
        target is a course YAML file: concepts, prerequisites, knowledge points,
        lessons and problems in a{" "}
        <A href="/docs/course-schema">fixed schema</A>. Claude Code is good at
        filling a schema. The CLI is good at telling it exactly what is
        missing.
      </P>

      <H2 id="setup">Step 1: Install the CLI and connect Claude Code</H2>
      <P>Install the CLI. You need it for every step below.</P>
      <Code>{`bun add -g @graspful/cli`}</Code>
      <P>
        To let Claude Code call Graspful tools directly, add the MCP server.{" "}
        <code>graspful init</code> does it for you: it opens a browser sign-up,
        saves an API key, and writes the server into Claude Code&apos;s config.
        If you prefer to wire it by hand, the{" "}
        <A href="/docs/mcp">MCP setup guide</A> has the one-line{" "}
        <code>claude mcp add</code> command. The MCP server gives Claude Code
        tools like <code>graspful_scaffold_course</code>,{" "}
        <code>graspful_fill_concept</code>, <code>graspful_validate</code> and{" "}
        <code>graspful_review_course</code>. The scaffold, fill, validate and
        review tools run offline.
      </P>

      <H2 id="sources">Step 2: Give Claude Code one source of truth</H2>
      <P>
        Put the docs in the project folder as Markdown, text or PDF. Pick the
        official version: your handbook, the product docs, the runbook your
        team really follows. Leave out marketing pages and old drafts. The
        course will only be as accurate as what you give it.
      </P>
      <P>Then tell Claude Code what you want, in plain words:</P>
      <Code>{`Read everything in ./docs. Build a Graspful course for new support
engineers. Start with the concept graph: list the concepts, what each one
depends on, and which doc each comes from. Don't write lessons yet.`}</Code>
      <P>
        Asking for the graph first matters. A course is a set of concepts in
        an order where each one only needs what came before it. Graspful uses
        that{" "}
        <A href="/docs/concepts/knowledge-graph">knowledge graph</A> to decide
        what each learner sees next, so a wrong prerequisite means learners get
        material they can&apos;t follow yet.
      </P>

      <H2 id="scaffold">Step 3: Scaffold the course file</H2>
      <P>
        The CLI creates a valid skeleton. The <code>--source</code> flag
        records where the content came from, so reviewers and future editors
        can check it.
      </P>
      <Code>{`$ graspful create course --topic "Acme onboarding handbook" --hours 3 \\
    --source "Acme employee handbook, 2026 edition" -o course.yaml
Scaffold written to course.yaml`}</Code>
      <P>This is the top of the file it writes:</P>
      <Code>{`course:
  id: acme-onboarding-handbook
  name: Acme onboarding handbook
  description: Adaptive course on Acme onboarding handbook
  estimatedHours: 3
  version: '2026.1'
  sourceDocument: Acme employee handbook, 2026 edition
sections:
  - id: foundations
    name: Foundations
  - id: application
    name: Application
concepts:
  - id: acme-onboarding-handbook-intro
    name: Introduction to Acme onboarding handbook
    section: foundations
    difficulty: 2
    prerequisites: []
    knowledgePoints: []`}</Code>
      <P>
        Now Claude Code replaces the placeholder concept with the graph from
        Step 2. Each concept gets an <code>id</code>, a section and a list of{" "}
        <code>prerequisites</code>.
      </P>

      <H2 id="fill">Step 4: Fill one concept at a time</H2>
      <P>
        Each concept splits into knowledge points: small steps a learner can
        take one at a time. Each knowledge point follows the same pattern: a
        short lesson, a worked example, then practice problems. Ask Claude
        Code to fill one concept, check it, then move to the next. Quality
        drops fast when an agent writes 40 concepts in one go.
      </P>
      <Code>{`graspful fill concept course.yaml <concept-id>`}</Code>
      <P>
        This adds stubs (three knowledge points with three problems each, by
        default) for Claude Code to write over. A good prompt for this step:
      </P>
      <Code>{`Fill the concept "refund-policy" from docs/refunds.md. Write a short
lesson for each knowledge point, one worked example, and at least three
practice problems per knowledge point at two difficulty levels. Every answer
must be checkable against the doc. Then run graspful validate.`}</Code>

      <H2 id="review">Step 5: Validate and review until it scores 10/10</H2>
      <P>
        <code>graspful validate</code> checks the file against the schema.{" "}
        <code>graspful review</code> runs the{" "}
        <A href="/docs/review-gate">review gate</A>: the same 10 checks that
        run when you publish. Here is the real output for the scaffold above,
        before any content is written:
      </P>
      <Code>{`$ graspful validate course.yaml
PASS  course validation
  fileType: course
  concepts: 1
  knowledgePoints: 0
  problems: 0

$ graspful review course.yaml
FAIL
Score: 9/10
Stats: 1 concepts (0 authored, 1 stubs), 0 KPs, 0 problems

Failures:
  [FAIL] publication_readiness: "acme-onboarding-handbook-intro" has no authored knowledge points`}</Code>
      <P>
        Each failure names the concept and what is missing, so Claude Code can
        fix it and run the review again without you. These are the 10 checks:
      </P>
      <div className="my-6 overflow-x-auto rounded-xl border border-border/60">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 font-semibold">Check</th>
              <th className="px-4 py-3 font-semibold">What it catches</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {reviewChecks.map(([name, description]) => (
              <tr key={name}>
                <td className="px-4 py-3 font-mono text-xs">{name}</td>
                <td className="px-4 py-3 text-muted-foreground">{description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <H2 id="facts">Step 6: Check the facts yourself</H2>
      <P>
        The review gate checks structure and coverage. It can&apos;t tell you
        whether a refund window is 14 days or 30. Before you publish, read the
        answer keys against your docs, or ask a second Claude Code session to
        check each answer against the source and list anything it can&apos;t
        find. This is the step that makes the course safe to put in front of
        new hires.
      </P>

      <H2 id="publish">Step 7: Import a draft, then publish</H2>
      <P>
        Sign in once with <code>graspful login</code> (or{" "}
        <code>graspful register</code> if you skipped <code>init</code>). Then
        import the course as a draft into your org:
      </P>
      <Code>{`graspful import course.yaml --org <your-org-slug>`}</Code>
      <P>
        When the draft looks right, publish it. Add <code>--publish</code> to
        the import, or run <code>graspful publish &lt;courseId&gt;</code>.
        Publishing runs the review gate again on the server, so a course that
        fails a check stays a draft.
      </P>

      <H2 id="example">A real example: PostHog&apos;s onboarding docs</H2>
      <P>
        The public Graspful repo includes a course built this way from
        PostHog&apos;s official documentation: technical onboarding for
        Technical Account Managers. Its source is recorded in the file, and
        anyone can run the same checks on it:
      </P>
      <Code>{`$ graspful describe content/courses/posthog-tam-onboarding.yaml
Course: "PostHog TAM Technical Onboarding" (v2026.2)
Concepts: 37 (37 authored, 0 stubs)
KPs: 79, Problems: 240
Graph depth: 11

$ graspful review content/courses/posthog-tam-onboarding.yaml
PASS
Score: 10/10
Stats: 37 concepts (37 authored, 0 stubs), 79 KPs, 240 problems`}</Code>
      <P>
        A graph depth of 11 means the longest chain of prerequisites is 11
        concepts long. A learner who already knows data modeling skips the
        early part of that chain after the diagnostic. A learner who
        doesn&apos;t starts at the bottom.
      </P>

      <H2 id="learners">What your learners get</H2>
      <P>
        Once published, the course runs like a tutor, not a reading list. Each
        learner starts with a{" "}
        <A href="/docs/concepts/adaptive-diagnostics">short diagnostic</A> that
        places them in the graph. They move to a new concept only after they
        show{" "}
        <A href="/docs/concepts/mastery-learning">mastery of its prerequisites</A>
        . Concepts they learned come back on a{" "}
        <A href="/docs/concepts/spaced-repetition">spaced review schedule</A>,
        so the onboarding sticks after the first week.
      </P>
      <div className="my-6 overflow-x-auto rounded-xl border border-border/60">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 font-semibold" />
              <th className="px-4 py-3 font-semibold">Claude Code alone</th>
              <th className="px-4 py-3 font-semibold">Claude Code with Graspful</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 text-muted-foreground">
            <tr>
              <td className="px-4 py-3 font-medium text-foreground">Output</td>
              <td className="px-4 py-3">Web pages, slides or a SCORM package</td>
              <td className="px-4 py-3">Course YAML in a fixed schema</td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-medium text-foreground">Quality check</td>
              <td className="px-4 py-3">You read it</td>
              <td className="px-4 py-3">10 automated checks, then you check facts</td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-medium text-foreground">Starting point</td>
              <td className="px-4 py-3">Same for everyone</td>
              <td className="px-4 py-3">Set by a diagnostic</td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-medium text-foreground">Moving on</td>
              <td className="px-4 py-3">Next page</td>
              <td className="px-4 py-3">After the prerequisites are mastered</td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-medium text-foreground">Review</td>
              <td className="px-4 py-3">None unless you build it</td>
              <td className="px-4 py-3">Scheduled spaced review</td>
            </tr>
          </tbody>
        </table>
      </div>
      <P>
        If you want a one-off reference page from your docs, Claude Code alone
        is enough. If people need to learn the material and keep it, give the
        agent a course format that can track what they know. The{" "}
        <A href="/ai-course-builder">AI course builder overview</A> covers the
        same workflow for Cursor and Codex.
      </P>
    </>
  );
}
