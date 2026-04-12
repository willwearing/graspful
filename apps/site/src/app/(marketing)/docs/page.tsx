import Link from "next/link";

const sections = [
  {
    title: "Authoring",
    items: [
      "Define course structure with concepts, sections, and dependencies.",
      "Review generated content before it reaches learners.",
      "Publish changes without rebuilding your own delivery platform.",
    ],
  },
  {
    title: "Operations",
    items: [
      "Manage brands, API keys, and learner billing from the creator app.",
      "Use one platform runtime for learner delivery and revenue operations.",
      "Keep the flagship site separate from the white-label learner surfaces.",
    ],
  },
];

const docLinks = [
  { title: "CLI Reference", href: "https://graspful.ai/docs/cli", description: "Install, authenticate, and run course commands from your terminal." },
  { title: "Course Schema", href: "https://graspful.ai/docs/course-schema", description: "YAML structure for courses, concepts, knowledge points, and problems." },
  { title: "Brand Schema", href: "https://graspful.ai/docs/brand-schema", description: "Configure your academy theme, domain, and landing page." },
  { title: "Glossary", href: "https://graspful.ai/docs/glossary", description: "Key terms: concepts, knowledge points, mastery, diagnostics, and more." },
];

export default function DocsPage() {
  return (
    <main id="main-content" className="pt-24">
      <section className="py-16 bg-muted/50">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Documentation
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-4">
            Getting started
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Everything you need to build and publish adaptive courses with
            Graspful.
          </p>
        </div>
      </section>
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-5 sm:grid-cols-2 mb-12">
            {sections.map((section) => (
              <div
                key={section.title}
                className="rounded-2xl border border-border/50 bg-card p-10 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <h2 className="text-lg font-semibold text-foreground mb-4">
                  {section.title}
                </h2>
                <ul className="space-y-2 text-muted-foreground text-sm leading-relaxed list-none p-0 m-0">
                  {section.items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="text-primary shrink-0">&#10003;</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground mb-6">
            Reference
          </h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {docLinks.map((doc) => (
              <Link
                key={doc.href}
                href={doc.href}
                className="rounded-2xl border border-border/50 bg-card p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg no-underline group"
              >
                <h3 className="text-base font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                  {doc.title} &rarr;
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {doc.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
