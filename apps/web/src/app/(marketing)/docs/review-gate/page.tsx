import { Callout } from "@/components/docs/callout";
import { DocSection } from "@/components/docs/doc-section";
import { DocPage } from "@/components/docs/doc-page";
import type { Metadata } from "next";
import { QUALITY_CHECK_METADATA } from "@graspful/shared";
import { CodeBlock, InlineCode } from "@/components/docs/code-block";

export const metadata: Metadata = {
  title: "Review gate | Graspful docs",
  description: "The automated checks required to publish a Graspful course, their limits, and how to resolve failures.",
  alternates: { canonical: "https://graspful.ai/docs/review-gate" },
};

export default function ReviewGatePage() {
  const checkCount = QUALITY_CHECK_METADATA.length;
  return (
    <DocPage
      title="Review gate"
      titleClassName="tracking-tight"
      description={<>
        A course must pass {checkCount} automated checks before publication.
        A score of {checkCount}/{checkCount} means these checks passed. Review
        the teaching, answers, and factual accuracy against your sources before
        you publish.
      </>}
    >
      <DocSection title="How review works" headingId="how-it-works" className="mt-10">
        <p className="mt-3 text-muted-foreground">Run the review locally with the CLI or the <InlineCode>graspful_review_course</InlineCode> MCP tool. The server runs the same checks when you request publication.</p>
        <CodeBlock language="bash">{`graspful validate course.yaml
graspful review course.yaml

# Inspect the result and failures in automation
graspful review course.yaml --format json`}</CodeBlock>
        <p className="mt-3 text-muted-foreground">A draft may contain empty concepts while you author it. Publication requires teaching content, answerable questions, and completed concepts. Replace scaffold placeholders before you request publication.</p>
        <p className="mt-3 text-muted-foreground">If publication fails, inspect the returned failures and keep working on the draft. Confirm <InlineCode>published: true</InlineCode> in the server response before sharing a course as published.</p>
      </DocSection>
      <DocSection title={<>The {checkCount} checks</>} headingId="checks" className="mt-10">
        <p className="mt-3 text-sm text-muted-foreground">This list comes from the same shared registry as the course reviewer.</p>
        <ol className="mt-6 space-y-4">
          {QUALITY_CHECK_METADATA.map((check, index) => (
            <li key={check.name} id={check.name} className="scroll-mt-24 rounded-xl border border-border bg-card p-5">
              <h3 className="flex items-start gap-3 text-sm font-semibold text-foreground">
                <span aria-hidden="true">{index + 1}.</span>
                <code className="break-all">{check.name}</code>
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{check.description}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground"><strong className="text-foreground">How to fix:</strong> {check.fix}</p>
            </li>
          ))}
        </ol>
      </DocSection>
      <Callout as="section" className="mt-10 border-border bg-muted/30" title="What the score means" headingId="scoring" titleClassName="text-xl font-bold text-foreground">
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">The score counts automated checks that passed. It does not measure a learner&apos;s mastery or establish that every fact and explanation is correct. Vocabulary alignment is a heuristic. It can miss ambiguous, misleading, or poorly taught questions.</p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Read warnings as well as failures. Warnings, such as missing key-prerequisite links, can identify improvements even when the publication checks pass. Import can also fail for account permissions, conflicting course IDs, or service errors.</p>
      </Callout>
    </DocPage>
  );
}
