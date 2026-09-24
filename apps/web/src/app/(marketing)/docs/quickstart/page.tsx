import { Callout } from "@/components/docs/callout";
import { DocSection } from "@/components/docs/doc-section";
import { DocPage } from "@/components/docs/doc-page";
import type { Metadata } from "next";
import Link from "next/link";
import { CodeBlock } from "@/components/docs/code-block";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Quickstart | Graspful Docs",
  description:
    "Install the CLI, author and review a course locally, then import a draft and confirm publication.",
  keywords: ["graspful quickstart", "graspful tutorial", "create course", "CLI quickstart"],
  alternates: { canonical: "https://graspful.ai/docs/quickstart" },
};

export default function QuickstartPage() {
  return (
    <DocPage
      title="Quickstart"
      description="Author and review a course on your computer. When the content is ready, sign in, import a draft, and publish it. Authoring time depends on the source material and the size of the course."
    >

      <DocSection title="1. Install the CLI" headingId="install">
        <p className="mt-2 text-muted-foreground">
          Install with Bun, then check that the command is available.
          Local scaffolding, validation, and review work without an account.
        </p>
        <CodeBlock language="bash">
          {`bun add -g @graspful/cli
graspful --help`}
        </CodeBlock>
        <p className="mt-3 text-sm text-muted-foreground">
          To configure tools in your AI agent, follow the{" "}
          <Link href="/docs/mcp" className="text-primary hover:underline">MCP setup guide</Link>.
          Give PDFs, notes, and official references to that external agent. It
          reads your source and writes the YAML on your computer.
        </p>
      </DocSection>

      <DocSection title="2. Plan and author the course" headingId="authoring">
        <p className="mt-2 text-muted-foreground">
          Start with an official syllabus, handbook, or other source you can
          verify. Record its version and the intended learner. Follow the{" "}
          <Link href="/docs/course-creation-guide" className="text-primary hover:underline">
            course creation guide
          </Link>{" "}
          to plan the academy, course boundaries, and prerequisite graph before
          you write lessons.
        </p>
        <h3 className="mt-6 text-lg font-semibold text-foreground" id="scaffold">
          Create a local draft
        </h3>
        <CodeBlock language="bash">
          {`# Replace the topic and source with your course details.
graspful create academy --topic "Your Topic" -o academy.yaml
graspful create course \\
  --topic "Your Topic" \\
  --source "Official source title, edition, and year" \\
  --hours 10 \\
  -o course.yaml`}
        </CodeBlock>
        <p className="mt-3 text-sm text-muted-foreground">
          The scaffold is an unfinished draft. It contains a starting graph
          with empty concepts and cannot pass the publication review. Edit the
          academy manifest to reference the course files you plan to include.
        </p>
        <h3 className="mt-6 text-lg font-semibold text-foreground" id="fill">
          Write the learning content
        </h3>
        <CodeBlock language="bash">
          {`# "Your Topic" creates the initial concept ID "your-topic-intro".
# Use an ID from your own YAML after editing the graph.
graspful fill concept course.yaml your-topic-intro --kps 3 --problems 4
graspful describe course.yaml`}
        </CodeBlock>
        <p className="mt-3 text-sm text-muted-foreground">
          The fill command adds TODO stubs. You or your external AI agent must
          replace each stub with a lesson, a worked example, and distinct
          practice problems with correct answers and explanations. Repeat for
          each concept. Compare the completed content with your source.
        </p>
      </DocSection>

      <DocSection title="3. Validate and review" headingId="review">
        <CodeBlock language="bash">
          {`graspful validate course.yaml
graspful review course.yaml`}
        </CodeBlock>
        <p className="mt-3 text-muted-foreground">
          Fix each failure and run both commands again. A score of 10/10 means
          the automated checks passed. You still need to review source accuracy,
          answer keys, teaching quality, and course coverage before publishing.
          Read the{" "}
          <Link href="/docs/review-gate" className="text-primary hover:underline">
            review gate reference
          </Link>{" "}
          for the checks and their limits.
        </p>
      </DocSection>

      <DocSection title="4. Register before importing" headingId="register">
        <CodeBlock language="bash">
          {`graspful register --email you@example.com`}
        </CodeBlock>
        <p className="mt-3 text-muted-foreground">
          The CLI opens browser authentication and saves an API key locally
          when you finish. Use the organization slug returned by registration
          in place of <code>my-org</code> below. Keep your API key private.
        </p>
      </DocSection>

      <DocSection title="5. Import as a draft" headingId="import">
        <CodeBlock language="bash">
          {`graspful import course.yaml --org my-org --format json`}
        </CodeBlock>
        <p className="mt-3 text-muted-foreground">
          The default import creates a draft. Save the returned courseId and
          URL. The response should report <code>published: false</code> for a
          new draft. You can also import the academy manifest and its course
          files with the command below.
        </p>
        <CodeBlock language="bash">
          {`# Use this for an academy after reviewing all referenced course files.
graspful import academy.yaml --org my-org --course-dir . --format json`}
        </CodeBlock>
      </DocSection>

      <DocSection title="6. Publish and confirm the result" headingId="publish">
        <CodeBlock language="bash">
          {`# Replace <course-id> with the courseId returned by import.
graspful publish <course-id> --org my-org --format json`}
        </CodeBlock>
        <p className="mt-3 text-muted-foreground">
          The server runs the review gate again. Confirm that the response
          reports <code>published: true</code> before you share the course.
          If publication fails, read the reported failures, correct the YAML,
          run validation and review, and replace the draft before retrying.
        </p>
        <CodeBlock language="bash">
          {`# After correcting and reviewing the local file:
graspful import course.yaml --org my-org --replace --format json
graspful publish <course-id> --org my-org --format json`}
        </CodeBlock>
        <p className="mt-3 text-sm text-muted-foreground">
          Open the URL returned by import and test a lesson and an incorrect
          answer as a learner. For an academy, confirm publication for every
          course you intend to offer. The optional <code>--publish</code> import
          flag requests publication during import; check its returned state too.
        </p>
      </DocSection>

      <DocSection title="Add a branded landing page" id="brand">
        <p className="mt-2 text-muted-foreground">
          Use a brand YAML to configure the landing page, theme, and domain.
          Write copy that describes the actual lessons and learner. Confirm
          domain verification after import. Paid access also requires completed
          billing setup. See the{" "}
          <Link href="/docs/brand-schema" className="text-primary hover:underline">brand schema</Link>{" "}
          and <Link href="/docs/billing" className="text-primary hover:underline">billing guide</Link>.
        </p>
      </DocSection>

      <Callout as="section" className="mt-16 p-8" title="Next steps">
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { href: "/docs/cli", label: "Full CLI reference" },
            { href: "/docs/mcp", label: "Set up MCP for your AI agent" },
            { href: "/docs/course-schema", label: "Course YAML schema reference" },
            { href: "/docs/course-creation-guide", label: "Plan and author an academy" },
          ].map(({ href, label }) => (
            <Link key={href} href={href} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowRight className="h-3.5 w-3.5 text-primary" />
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </Callout>
    </DocPage>
  );
}
