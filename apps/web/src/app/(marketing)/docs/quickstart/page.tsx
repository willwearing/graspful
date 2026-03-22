import type { Metadata } from "next";
import Link from "next/link";
import { CodeBlock } from "@/components/docs/code-block";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Quickstart — Graspful Docs",
  description:
    "Create and publish your first adaptive learning course in 5 minutes. Install the CLI, scaffold, fill, review, and import.",
  keywords: [
    "graspful quickstart",
    "graspful tutorial",
    "create course",
    "adaptive learning",
    "CLI quickstart",
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
        <h2 className="text-2xl font-bold text-foreground" id="install">
          1. Install the CLI
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

      {/* Step 2 */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="login">
          2. Log in
        </h2>
        <p className="mt-2 text-muted-foreground">
          Authenticate with your Graspful account. You can pass an API key
          directly or use the interactive prompt.
        </p>
        <CodeBlock language="bash">
          {`graspful login

# Or pass a token directly
graspful login --token <your-api-key>`}
        </CodeBlock>
      </section>

      {/* Step 3 */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="scaffold">
          3. Scaffold a course
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

      {/* Step 4 */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="fill">
          4. Fill concepts
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

      {/* Step 5 */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="review">
          5. Review
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

      {/* Step 6 */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="import">
          6. Import and publish
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

      {/* Step 7 */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="brand">
          7. Create a brand
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
  --domain aws-prep.graspful.com \\
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
