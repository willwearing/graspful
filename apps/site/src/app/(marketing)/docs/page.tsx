import Link from "next/link";
import { PageShell } from "@/components/site/page-shell";

export default function DocsPage() {
  return (
    <PageShell
      eyebrow="Documentation"
      title="Guidance for creator teams"
      intro="Use Graspful with structured course definitions, source material, and AI-assisted authoring workflows."
    >
      <div>
        <h2 className="section-heading">Authoring</h2>
        <ul className="plain-list">
          <li>Define course structure with concepts, sections, and dependencies.</li>
          <li>Review generated content before it reaches learners.</li>
          <li>Publish changes without rebuilding your own delivery platform.</li>
        </ul>
      </div>
      <div>
        <h2 className="section-heading">Operations</h2>
        <ul className="plain-list">
          <li>Manage brands, API keys, and learner billing from the creator app.</li>
          <li>Use one platform runtime for learner delivery and revenue operations.</li>
          <li>Keep the flagship site separate from the white-label learner surfaces.</li>
        </ul>
        <Link href="/docs" className="button">
          Open product docs
        </Link>
      </div>
    </PageShell>
  );
}
