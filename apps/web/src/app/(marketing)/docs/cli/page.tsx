import type { Metadata } from "next";
import { CodeBlock, InlineCode } from "@/components/docs/code-block";

export const metadata: Metadata = {
  title: "CLI Reference — Graspful Docs",
  description:
    "Full CLI reference for @graspful/cli. All commands, options, and examples for creating adaptive learning courses.",
  keywords: [
    "graspful cli",
    "graspful commands",
    "course creation cli",
    "yaml import",
    "adaptive learning cli",
  ],
};

function CommandSection({
  name,
  synopsis,
  description,
  options,
  examples,
  jsonOutput,
}: {
  name: string;
  synopsis: string;
  description: string;
  options?: { flag: string; description: string }[];
  examples: { label: string; code: string }[];
  jsonOutput?: string;
}) {
  return (
    <section className="mt-12 scroll-mt-24" id={name.replace(/\s+/g, "-").toLowerCase()}>
      <h2 className="text-2xl font-bold text-foreground">{name}</h2>
      <p className="mt-2 text-muted-foreground">{description}</p>
      <CodeBlock language="bash">{synopsis}</CodeBlock>

      {options && options.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-foreground mb-2">
            Options
          </h3>
          <div className="rounded-xl border border-border/50 overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {options.map((opt) => (
                  <tr
                    key={opt.flag}
                    className="border-b border-border/30 last:border-0"
                  >
                    <td className="px-4 py-2.5 font-mono text-xs text-primary whitespace-nowrap">
                      {opt.flag}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {opt.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {examples.map((example) => (
        <div key={example.label} className="mt-4">
          <p className="text-sm font-medium text-foreground mb-1">
            {example.label}
          </p>
          <CodeBlock language="bash">{example.code}</CodeBlock>
        </div>
      ))}

      {jsonOutput && (
        <div className="mt-4">
          <p className="text-sm font-medium text-foreground mb-1">
            JSON output
          </p>
          <CodeBlock language="json">{jsonOutput}</CodeBlock>
        </div>
      )}
    </section>
  );
}

export default function CLIReferencePage() {
  return (
    <div>
      <h1 className="text-4xl font-bold tracking-[-0.04em] text-foreground">
        CLI Reference
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
        The <InlineCode>@graspful/cli</InlineCode> package provides a complete
        command-line interface for creating, validating, reviewing, and
        publishing adaptive learning courses.
      </p>

      <div className="mt-6 rounded-xl border border-border/50 bg-card p-4">
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Global option:</strong> All
          commands support{" "}
          <InlineCode>--format &lt;human|json&gt;</InlineCode> to control output
          format. Default is <InlineCode>human</InlineCode>. Use{" "}
          <InlineCode>--format json</InlineCode> for machine-readable output in
          automated workflows.
        </p>
      </div>

      <CommandSection
        name="graspful register"
        synopsis={`graspful register --email <email> --password <password>`}
        description="Create a new Graspful account and return an API key. Credentials are saved automatically to ~/.graspful/credentials.json so subsequent commands are authenticated without a separate login step."
        options={[
          { flag: "--email <email>", description: "Account email address (required)" },
          { flag: "--password <password>", description: "Account password (required)" },
        ]}
        examples={[
          {
            label: "Register a new account",
            code: "graspful register --email you@example.com --password \"s3cret\"",
          },
        ]}
        jsonOutput={`{
  "apiKey": "gsk_abc123...",
  "orgSlug": "you-example"
}`}
      />

      <CommandSection
        name="graspful login"
        synopsis={`graspful login [--api-url <url>] [--token <token>] [--email <email> --password <password>]`}
        description="Authenticate with a Graspful instance. Saves credentials locally for subsequent commands. Supports interactive prompts, API key auth, and email/password auth."
        options={[
          { flag: "--api-url <url>", description: "API base URL (defaults to https://api.graspful.ai)" },
          { flag: "--token <token>", description: "API key (skips interactive prompt)" },
          { flag: "--email <email>", description: "Account email for email/password auth" },
          { flag: "--password <password>", description: "Account password for email/password auth" },
        ]}
        examples={[
          {
            label: "Interactive login",
            code: "graspful login",
          },
          {
            label: "API key auth",
            code: "graspful login --token gsk_abc123",
          },
          {
            label: "Email/password auth",
            code: "graspful login --email you@example.com --password \"s3cret\"",
          },
          {
            label: "Pipe from a secret manager",
            code: "vault read -field=token secret/graspful | graspful login",
          },
        ]}
        jsonOutput={`{
  "authenticated": true,
  "baseUrl": "https://api.graspful.ai"
}`}
      />

      <CommandSection
        name="graspful validate"
        synopsis="graspful validate <file>"
        description="Validate a course, brand, or academy YAML file against its Zod schema. Auto-detects the file type from the top-level key (course, brand, or academy). For course files, also validates the prerequisite DAG — checking for missing references and cycles."
        examples={[
          {
            label: "Validate a course",
            code: "graspful validate my-course.yaml",
          },
          {
            label: "Validate a brand",
            code: "graspful validate my-brand.yaml",
          },
          {
            label: "JSON output for CI",
            code: "graspful validate my-course.yaml --format json",
          },
        ]}
        jsonOutput={`{
  "valid": true,
  "fileType": "course",
  "errors": [],
  "stats": {
    "fileType": "course",
    "concepts": 42,
    "knowledgePoints": 120,
    "problems": 360
  }
}`}
      />

      <CommandSection
        name="graspful create course"
        synopsis={`graspful create course \\
  --topic <topic> \\
  [--hours <hours>] \\
  [--source <source>] \\
  [-o, --output <file>] \\
  [--scaffold-only]`}
        description="Generate a course YAML scaffold with sections, concepts, and prerequisite edges. The scaffold contains no learning content — just the graph structure with TODO placeholders. Edit the output to add concepts, adjust prerequisites, and set difficulty levels before filling."
        options={[
          { flag: "--topic <topic>", description: "Course topic name (required)" },
          { flag: "--hours <hours>", description: "Estimated total course hours (default: 10)" },
          { flag: "--source <source>", description: "Source document reference (e.g., textbook, exam guide)" },
          { flag: "-o, --output <file>", description: "Output file path (defaults to stdout)" },
          { flag: "--scaffold-only", description: "Generate scaffold without AI enrichment (default: true)" },
        ]}
        examples={[
          {
            label: "Scaffold to stdout",
            code: `graspful create course --topic "Linear Algebra"`,
          },
          {
            label: "Scaffold to file with source",
            code: `graspful create course \\
  --scaffold-only \\
  --topic "AWS Solutions Architect" \\
  --source "AWS SAA-C03 Exam Guide" \\
  --hours 40 \\
  -o aws-saa-c03.yaml`,
          },
        ]}
      />

      <CommandSection
        name="graspful fill concept"
        synopsis={`graspful fill concept <file> <conceptId> \\
  [--kps <count>] \\
  [--problems <count>]`}
        description="Add knowledge point (KP) and problem stubs to a specific concept in a course YAML file. Each KP includes instruction text, a worked example, and multiple-choice problems with a difficulty staircase. Fails if the concept already has KPs to prevent accidental overwrites."
        options={[
          { flag: "<file>", description: "Path to the course YAML file" },
          { flag: "<conceptId>", description: "ID of the concept to fill (must have 0 KPs)" },
          { flag: "--kps <count>", description: "Number of KP stubs to add (default: 2)" },
          { flag: "--problems <count>", description: "Number of problem stubs per KP (default: 3)" },
        ]}
        examples={[
          {
            label: "Fill with defaults",
            code: "graspful fill concept aws-saa-c03.yaml vpc-basics",
          },
          {
            label: "Custom stub counts",
            code: "graspful fill concept aws-saa-c03.yaml iam-policies --kps 3 --problems 4",
          },
        ]}
        jsonOutput={`{
  "conceptId": "vpc-basics",
  "kpsAdded": 2,
  "problemsPerKp": 3,
  "file": "aws-saa-c03.yaml"
}`}
      />

      <CommandSection
        name="graspful review"
        synopsis="graspful review <file>"
        description="Run all 10 mechanical quality checks on a course YAML. Returns a score (e.g., 8/10) with details on each failure. A score of 10/10 is required for publishing. See the Review Gate docs for details on each check."
        examples={[
          {
            label: "Run review",
            code: "graspful review my-course.yaml",
          },
          {
            label: "JSON output",
            code: "graspful review my-course.yaml --format json",
          },
        ]}
        jsonOutput={`{
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
      />

      <CommandSection
        name="graspful import"
        synopsis={`graspful import <file> \\
  --org <slug> \\
  [--publish]`}
        description="Import a course or brand YAML into a Graspful organization. Auto-detects the file type. For courses, use --publish to publish immediately — this runs the review gate server-side. If review fails, the course is imported as a draft with failure details."
        options={[
          { flag: "<file>", description: "Path to the YAML file (course or brand)" },
          { flag: "--org <slug>", description: "Organization slug (required for courses)" },
          { flag: "--publish", description: "Publish immediately after import (runs review gate)" },
        ]}
        examples={[
          {
            label: "Import course as draft",
            code: "graspful import my-course.yaml --org my-org",
          },
          {
            label: "Import and publish",
            code: "graspful import my-course.yaml --org my-org --publish",
          },
          {
            label: "Import a brand",
            code: "graspful import my-brand.yaml",
          },
        ]}
        jsonOutput={`{
  "courseId": "abc-123",
  "url": "https://app.graspful.com/courses/abc-123",
  "published": true
}`}
      />

      <CommandSection
        name="graspful publish"
        synopsis="graspful publish <courseId> --org <slug>"
        description="Publish a draft course (sets isPublished = true). The server runs the review gate — the course must pass all 10 quality checks."
        options={[
          { flag: "<courseId>", description: "The course ID (UUID) to publish" },
          { flag: "--org <slug>", description: "Organization slug (required)" },
        ]}
        examples={[
          {
            label: "Publish a course",
            code: "graspful publish abc-123 --org my-org",
          },
        ]}
        jsonOutput={`{
  "courseId": "abc-123",
  "published": true
}`}
      />

      <CommandSection
        name="graspful describe"
        synopsis="graspful describe <file>"
        description="Show course statistics and structure summary. Useful for tracking progress during authoring — how many concepts are authored vs stubs, how deep the prerequisite graph is, and what still needs content."
        examples={[
          {
            label: "Describe a course",
            code: "graspful describe aws-saa-c03.yaml",
          },
        ]}
        jsonOutput={`{
  "courseName": "AWS Solutions Architect",
  "courseId": "aws-saa-c03",
  "version": "2026.1",
  "estimatedHours": 40,
  "concepts": 42,
  "authoredConcepts": 5,
  "stubConcepts": 37,
  "knowledgePoints": 10,
  "problems": 30,
  "graphDepth": 6,
  "conceptsWithoutKps": 37,
  "kpsWithoutProblems": 0,
  "sections": [
    {
      "section": "foundations",
      "concepts": 12,
      "kps": 4,
      "problems": 12
    }
  ]
}`}
      />

      <CommandSection
        name="graspful create brand"
        synopsis={`graspful create brand \\
  --niche <niche> \\
  [--name <name>] \\
  [--domain <domain>] \\
  [--org <slug>] \\
  [-o, --output <file>]`}
        description="Generate a brand YAML scaffold for a white-label learning site. Niche presets (education, healthcare, finance, tech, legal) set appropriate colors, taglines, and landing page copy."
        options={[
          { flag: "--niche <niche>", description: "Brand niche: education, healthcare, finance, tech, or legal (required)" },
          { flag: "--name <name>", description: 'Brand name (default: "{Niche} Academy")' },
          { flag: "--domain <domain>", description: 'Custom domain (default: "{slug}.graspful.com")' },
          { flag: "--org <slug>", description: "Organization slug to associate with" },
          { flag: "-o, --output <file>", description: "Output file path (defaults to stdout)" },
        ]}
        examples={[
          {
            label: "Generate a tech brand",
            code: `graspful create brand \\
  --niche tech \\
  --name "AWS Prep Academy" \\
  --domain aws-prep.graspful.com \\
  --org my-org \\
  -o aws-prep-brand.yaml`,
          },
        ]}
      />
    </div>
  );
}
