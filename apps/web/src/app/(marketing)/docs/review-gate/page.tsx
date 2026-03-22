import type { Metadata } from "next";
import Link from "next/link";
import { CodeBlock, InlineCode } from "@/components/docs/code-block";

export const metadata: Metadata = {
  title: "Review Gate — Graspful Docs",
  description:
    "The 10 mechanical quality checks every Graspful course must pass before publishing. Check descriptions, failure remediation, and how review works.",
  keywords: [
    "graspful review",
    "quality gate",
    "course quality",
    "publishing checks",
    "course review",
  ],
};

const checks = [
  {
    num: 1,
    name: "yaml_parses",
    title: "YAML parses",
    description:
      "The course YAML is valid and conforms to the Zod schema. All required fields are present, types are correct, and enum values are valid.",
    remediation:
      "Run graspful validate to see specific schema errors. Fix the reported field paths.",
    severity: "blocker" as const,
  },
  {
    num: 2,
    name: "unique_problem_ids",
    title: "Unique problem IDs",
    description:
      "Every problem ID across the entire course is unique. Duplicate IDs cause conflicts in the adaptive engine's state tracking.",
    remediation:
      "Search for the duplicated problem IDs and rename them. Use a consistent naming convention: {concept-id}-kp{n}-p{n}.",
    severity: "blocker" as const,
  },
  {
    num: 3,
    name: "prerequisites_valid",
    title: "Prerequisites valid",
    description:
      "Every prerequisite reference in every concept points to a concept ID that exists in the course.",
    remediation:
      "Check for typos in prerequisite arrays. Ensure the referenced concept exists. Only list direct prerequisites — transitive ones are inferred.",
    severity: "blocker" as const,
  },
  {
    num: 4,
    name: "question_deduplication",
    title: "Question deduplication",
    description:
      "No two problems have the same question text at the same difficulty level (compared via normalized text + MD5 hash). Near-duplicate questions reduce the adaptive engine's effectiveness.",
    remediation:
      "Rewrite one of the colliding questions to test a different angle of the same concept. Vary the scenario, change the distractor set, or adjust difficulty.",
    severity: "blocker" as const,
  },
  {
    num: 5,
    name: "difficulty_staircase",
    title: "Difficulty staircase",
    description:
      "Each authored concept has problems at 2 or more distinct difficulty levels. A single difficulty level means there's no progression — the adaptive engine can't create a learning path.",
    remediation:
      "Add problems at different difficulty levels (1-5). Start with recognition (1-2), then application (3), then analysis (4-5).",
    severity: "blocker" as const,
  },
  {
    num: 6,
    name: "cross_concept_coverage",
    title: "Cross-concept coverage",
    description:
      "Checks that no single meaningful term dominates too many concepts (appearing in more than 3 concepts' problem text). High overlap suggests concepts aren't distinct enough.",
    remediation:
      "Review concepts that share heavy vocabulary overlap. They may need to be merged or their problems need to be more specific to each concept's unique content.",
    severity: "warning" as const,
  },
  {
    num: 7,
    name: "problem_variant_depth",
    title: "Problem variant depth",
    description:
      "Every knowledge point in authored concepts has at least 3 problems. Fewer than 3 problems means the adaptive engine can't do meaningful selection and retry.",
    remediation:
      "Add more problems to the flagged KPs. Each problem should test the same idea from a different angle — different scenario, different distractors, different phrasing.",
    severity: "blocker" as const,
  },
  {
    num: 8,
    name: "instruction_formatting",
    title: "Instruction formatting",
    description:
      "Instruction text longer than 100 words must include structured content blocks (images, callouts, etc.). Walls of text without visual breaks hurt comprehension.",
    remediation:
      "Add instructionContent blocks to long instructions. Use callouts for key rules, images for diagrams, or links for reference material.",
    severity: "blocker" as const,
  },
  {
    num: 9,
    name: "worked_example_coverage",
    title: "Worked example coverage",
    description:
      "At least 50% of authored concepts have at least one knowledge point with a worked example. Worked examples are critical for transfer — they show the concept applied step by step.",
    remediation:
      "Add workedExample text to KPs in the flagged concepts. Focus on applied or high-transfer KPs first.",
    severity: "blocker" as const,
  },
  {
    num: 10,
    name: "import_dry_run",
    title: "Import dry run",
    description:
      "Validates the prerequisite DAG: no unknown references, no cycles. This is the same validation the import endpoint runs — passing this check means the import will succeed.",
    remediation:
      "Fix any cycle or broken reference reported in the details. Use graspful validate for the full error list.",
    severity: "blocker" as const,
  },
];

export default function ReviewGatePage() {
  return (
    <div>
      <h1 className="text-4xl font-bold tracking-[-0.04em] text-foreground">
        Review Gate
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
        Every course must pass 10 mechanical quality checks before it can be
        published. The review gate runs locally via{" "}
        <InlineCode>graspful review</InlineCode> and automatically on the server
        when you import with <InlineCode>--publish</InlineCode>.
      </p>

      {/* How it works */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="how-it-works">
          How review works
        </h2>
        <div className="mt-4 space-y-4">
          <div className="rounded-lg border border-border/30 bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground">
              CLI review (local)
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Run <InlineCode>graspful review course.yaml</InlineCode> to check
              your course locally. Returns a score (e.g., &quot;8/10&quot;) with
              details on each failure. Fix failures and re-run until you hit
              10/10.
            </p>
            <CodeBlock language="bash">
              {`graspful review my-course.yaml

# JSON output for CI
graspful review my-course.yaml --format json`}
            </CodeBlock>
          </div>

          <div className="rounded-lg border border-border/30 bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground">
              Server-side review (on publish)
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              When you import with <InlineCode>--publish</InlineCode> or call{" "}
              <InlineCode>graspful publish</InlineCode>, the server runs the
              same 10 checks. If any check fails, the course is imported as a
              draft (not published) and the failure details are returned.
            </p>
          </div>

          <div className="rounded-lg border border-border/30 bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground">
              MCP review
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              The <InlineCode>graspful_review_course</InlineCode> MCP tool runs
              the same checks. Agents should review before importing and fix
              failures iteratively.
            </p>
          </div>
        </div>
      </section>

      {/* Scoring */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="scoring">
          Scoring
        </h2>
        <p className="mt-2 text-muted-foreground">
          The score is the number of checks passed out of 10. A score of{" "}
          <strong className="text-foreground">10/10</strong> is required to
          publish.
        </p>
        <div className="mt-4 rounded-xl border border-border/50 bg-muted/30 p-5">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Stub concepts are ignored.</strong>{" "}
            Concepts with no knowledge points (stubs) are treated as graph
            structure only and are excluded from content quality checks. This
            lets you publish a course with a scaffolded graph and gradually fill
            in content.
          </p>
        </div>
      </section>

      {/* The 10 checks */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="checks">
          The 10 checks
        </h2>
        <div className="mt-6 space-y-6">
          {checks.map((check) => (
            <div
              key={check.name}
              className="rounded-xl border border-border/50 bg-card overflow-hidden"
              id={check.name}
            >
              <div className="flex items-center gap-3 border-b border-border/30 bg-muted/30 px-5 py-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {check.num}
                </span>
                <code className="text-sm font-mono font-semibold text-primary">
                  {check.name}
                </code>
                <span
                  className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${
                    check.severity === "blocker"
                      ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                      : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                  }`}
                >
                  {check.severity}
                </span>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-foreground mb-1">
                    What it checks
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {check.description}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-foreground mb-1">
                    How to fix
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {check.remediation}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Output format */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="output">
          Output format
        </h2>
        <p className="mt-2 text-muted-foreground">
          With <InlineCode>--format json</InlineCode>, the review command
          returns structured output for CI integration:
        </p>
        <CodeBlock language="json">
          {`{
  "passed": false,
  "score": "8/10",
  "failures": [
    {
      "check": "difficulty_staircase",
      "passed": false,
      "details": "\\"vpc-basics\\" has problems at only 1 difficulty level(s) — need 2+"
    },
    {
      "check": "worked_example_coverage",
      "passed": false,
      "details": "1/5 authored concepts have worked examples (20%) — need 50%+"
    }
  ],
  "warnings": [],
  "stats": {
    "concepts": 42,
    "kps": 10,
    "problems": 30,
    "authoredConcepts": 5,
    "stubConcepts": 37
  }
}`}
        </CodeBlock>
      </section>

      {/* Tips */}
      <section className="mt-12 rounded-xl border border-border/50 bg-card p-6">
        <h2 className="text-lg font-bold text-foreground">Tips</h2>
        <ul className="mt-3 text-sm text-muted-foreground space-y-2 list-disc list-inside">
          <li>
            Run <InlineCode>graspful review</InlineCode> early and often during
            authoring — don&apos;t wait until the course is complete.
          </li>
          <li>
            Fix blocker checks first. The cross_concept_coverage check is a
            warning and passes unless overlap is severe.
          </li>
          <li>
            Use <InlineCode>graspful describe</InlineCode> to check how many
            concepts still need KPs and how many KPs still need problems.
          </li>
          <li>
            The review gate is intentionally strict. Every check exists because
            its absence degrades the adaptive learning experience.
          </li>
        </ul>
      </section>
    </div>
  );
}
