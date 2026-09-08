import Link from "next/link";

const steps = [
  { title: "Install", description: "Run npx @graspful/cli init to configure CLI and MCP tools for your coding agent." },
  { title: "Author", description: "Give Claude Code, Codex, or another MCP agent reliable source material and learning goals. Have it write lessons, worked examples, questions, and prerequisites in course YAML." },
  { title: "Review", description: "Run graspful validate course.yaml and graspful review course.yaml. Correct failures and inspect the content and answer keys yourself. A scaffold contains structure that still needs authored content." },
  { title: "Import a draft", description: "Run graspful register to sign in and save CLI credentials. Then run graspful import course.yaml --org your-org. An import without --publish saves a draft for review." },
  { title: "Publish", description: "After reviewing the draft, run graspful publish <course-id> --org your-org --format json. Confirm published: true in the response before you share the course." },
];

const docLinks = [
  { title: "CLI reference", href: "https://graspful.ai/docs/cli", description: "Install, authenticate, and run course commands from your terminal." },
  { title: "Course schema", href: "https://graspful.ai/docs/course-schema", description: "YAML structure for courses, concepts, knowledge points, and problems." },
  { title: "Brand schema", href: "https://graspful.ai/docs/brand-schema", description: "Configure your academy theme and landing page." },
  { title: "Glossary", href: "https://graspful.ai/docs/glossary", description: "Concepts, knowledge points, mastery estimates, and diagnostics." },
];

export default function DocsPage() {
  return (
    <main id="main-content" className="pt-24">
      <section className="bg-muted/30 py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Getting started</h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">Author courses with your coding agent and the Graspful CLI or MCP tools. Use the creator app to inspect drafts before you publish.</p>
        </div>
      </section>
      <section className="mx-auto max-w-4xl px-6 py-16">
        <h2 className="text-2xl font-semibold tracking-tight">Authoring</h2>
        <ol className="mt-8 divide-y divide-border">
          {steps.map((step, i) => (
            <li key={step.title} className="grid gap-3 py-5 first:pt-0 sm:grid-cols-[2rem_1fr]">
              <span aria-hidden="true" className="text-sm text-muted-foreground">0{i + 1}</span>
              <div>
                <h3 className="font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
        <h2 className="mt-12 text-2xl font-semibold tracking-tight">Operations</h2>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">Keep the YAML source in your own repository. Make course and brand changes through the CLI or MCP tools, then review the imported result. Paid subscriptions are not available yet.</p>
        <h2 className="mt-12 text-2xl font-semibold tracking-tight">Reference</h2>
        <div className="mt-6 divide-y divide-border">
          {docLinks.map((doc) => (
            <Link key={doc.href} href={doc.href} className="block py-5 no-underline first:pt-0">
              <h3 className="text-base font-medium underline underline-offset-4">{doc.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{doc.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
