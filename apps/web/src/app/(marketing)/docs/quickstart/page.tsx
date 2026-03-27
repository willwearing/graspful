import type { Metadata } from "next";
import Link from "next/link";
import { CodeBlock } from "@/components/docs/code-block";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Quickstart — Graspful Docs",
  description:
    "Create and publish your first adaptive learning course in 5 minutes. Register, import a course, and go live.",
  keywords: [
    "graspful quickstart",
    "graspful tutorial",
    "create course",
    "adaptive learning",
    "CLI quickstart",
    "graspful register",
  ],
};

export default function QuickstartPage() {
  return (
    <div>
      <h1 className="text-4xl font-bold tracking-[-0.04em] text-foreground">
        Quickstart
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
        Create and publish your first adaptive learning course in under 5
        minutes.
      </p>

      {/* Step 1 */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="register">
          1. Register
        </h2>
        <p className="mt-2 text-muted-foreground">
          Create an account and get an API key. You can register via the API or
          the CLI.
        </p>
        <CodeBlock language="bash">
          {`# Via the API
curl -X POST https://api.graspful.ai/api/v1/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{"email":"you@example.com","password":"..."}'
# → { "apiKey": "gsk_...", "orgSlug": "you-example" }

# Or via the CLI
graspful register --email you@example.com --password "..."`}
        </CodeBlock>
        <p className="mt-3 text-sm text-muted-foreground">
          The CLI saves your credentials automatically so you can skip the login
          step.
        </p>
      </section>

      {/* Step 2 */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="import">
          2. Import a course
        </h2>
        <p className="mt-2 text-muted-foreground">
          Import a course YAML into your org. Use the API directly or the CLI.
        </p>
        <CodeBlock language="bash">
          {`# Via the API
curl -X POST https://api.graspful.ai/api/v1/orgs/you-example/courses/import \\
  -H "Authorization: Bearer gsk_..." \\
  -H "Content-Type: application/json" \\
  -d '{"yaml": "..."}'

# Or via the CLI
graspful import course.yaml --org you-example`}
        </CodeBlock>
      </section>

      {/* Step 3 */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="live">
          3. Your course is live!
        </h2>
        <p className="mt-2 text-muted-foreground">
          Visit your org subdomain to see it in action.
        </p>
        <CodeBlock language="bash">
          {`# Your course is live at:
https://you-example.graspful.ai`}
        </CodeBlock>
      </section>

      {/* Web UI alternative */}
      <section className="mt-12 rounded-xl border border-border/50 bg-card p-6">
        <h2 className="text-lg font-bold text-foreground mb-2">
          Prefer a web UI?
        </h2>
        <p className="text-sm text-muted-foreground">
          Sign up at{" "}
          <Link
            href="https://graspful.ai"
            className="text-primary hover:underline"
          >
            graspful.ai
          </Link>{" "}
          and manage courses from the Creator Dashboard. Everything available via
          the API and CLI is also available in the UI.
        </p>
      </section>

      {/* Authoring workflow */}
      <section className="mt-16">
        <h2 className="text-2xl font-bold text-foreground" id="authoring">
          Full authoring workflow
        </h2>
        <p className="mt-2 text-muted-foreground max-w-2xl">
          If you want to create a course from scratch, the CLI provides the full
          scaffold-fill-review-import pipeline.
        </p>
      </section>

      {/* Step A */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="install">
          A. Install the CLI
        </h2>
        <p className="mt-2 text-muted-foreground">
          Install globally with bun or use npx to run without installing.
        </p>
        <CodeBlock language="bash">
          {`# Install globally
bun add -g @graspful/cli

# Or run without installing
npx @graspful/cli`}
        </CodeBlock>
      </section>

      {/* Step B */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="scaffold">
          B. Scaffold a course
        </h2>
        <p className="mt-2 text-muted-foreground">
          Generate the knowledge graph skeleton — sections, concepts, and
          prerequisite edges. No learning content yet, just the structure.
        </p>
        <CodeBlock language="bash">
          {`graspful create course \\
  --scaffold-only \\
  --topic "AWS Solutions Architect" \\
  --source "AWS SAA-C03 Exam Guide" \\
  --hours 40 \\
  -o aws-saa-c03.yaml`}
        </CodeBlock>
        <p className="mt-3 text-sm text-muted-foreground">
          Edit the generated YAML to add more concepts, adjust prerequisites,
          set difficulty levels (1-10), and group concepts into sections.
        </p>
      </section>

      {/* Step C */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="fill">
          C. Fill concepts
        </h2>
        <p className="mt-2 text-muted-foreground">
          Add knowledge points and practice problems to each concept. The CLI
          generates stubs with TODO placeholders that you replace with real
          content.
        </p>
        <CodeBlock language="bash">
          {`# Fill one concept at a time
graspful fill concept aws-saa-c03.yaml aws-saa-c03-intro

# Customize stub count
graspful fill concept aws-saa-c03.yaml vpc-basics --kps 3 --problems 4`}
        </CodeBlock>
        <p className="mt-3 text-sm text-muted-foreground">
          Each knowledge point stub includes instruction text, a worked example,
          and multiple-choice problems with a difficulty staircase. Replace the
          TODO placeholders with real content before reviewing.
        </p>
      </section>

      {/* Step D */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="review">
          D. Review
        </h2>
        <p className="mt-2 text-muted-foreground">
          Run all 10 mechanical quality checks. Fix any failures before
          publishing.
        </p>
        <CodeBlock language="bash">
          {`graspful review aws-saa-c03.yaml`}
        </CodeBlock>
        <p className="mt-3 text-sm text-muted-foreground">
          The review gate checks for duplicate questions, difficulty staircase
          violations, missing worked examples, invalid prerequisites, and more.
          A score of 10/10 is required to publish. See the{" "}
          <Link
            href="/docs/review-gate"
            className="text-primary hover:underline"
          >
            Review Gate
          </Link>{" "}
          docs for details on each check.
        </p>
      </section>

      {/* Step E */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="publish">
          E. Import and publish
        </h2>
        <p className="mt-2 text-muted-foreground">
          Import the course YAML to the platform. Use{" "}
          <code className="rounded-md bg-muted px-1.5 py-0.5 text-sm font-mono">
            --publish
          </code>{" "}
          to publish immediately (runs the review gate server-side).
        </p>
        <CodeBlock language="bash">
          {`# Import as draft
graspful import aws-saa-c03.yaml --org my-org

# Import and publish in one step
graspful import aws-saa-c03.yaml --org my-org --publish`}
        </CodeBlock>
      </section>

      {/* Step F */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="brand">
          F. Create a brand
        </h2>
        <p className="mt-2 text-muted-foreground">
          Generate a brand YAML to configure the landing page, theme, pricing,
          and SEO. Then import it to launch a white-label product.
        </p>
        <CodeBlock language="bash">
          {`# Scaffold a brand
graspful create brand \\
  --niche tech \\
  --name "AWS Prep Academy" \\
  --domain aws-prep.graspful.ai \\
  --org my-org \\
  -o aws-prep-brand.yaml

# Import the brand
graspful import aws-prep-brand.yaml`}
        </CodeBlock>
      </section>

      {/* Next steps */}
      <section className="mt-16 rounded-xl border border-border/50 bg-card p-8">
        <h2 className="text-xl font-bold text-foreground mb-4">Next steps</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/docs/cli"
            className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowRight className="h-3.5 w-3.5 text-primary" />
            <span>Full CLI reference</span>
          </Link>
          <Link
            href="/docs/mcp"
            className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowRight className="h-3.5 w-3.5 text-primary" />
            <span>Set up MCP for your AI agent</span>
          </Link>
          <Link
            href="/docs/course-schema"
            className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowRight className="h-3.5 w-3.5 text-primary" />
            <span>Course YAML schema reference</span>
          </Link>
          <Link
            href="/docs/brand-schema"
            className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowRight className="h-3.5 w-3.5 text-primary" />
            <span>Brand YAML schema reference</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
