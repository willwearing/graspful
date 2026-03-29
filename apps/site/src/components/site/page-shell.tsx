import type { ReactNode } from "react";

interface PageShellProps {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
}

export function PageShell({ eyebrow, title, intro, children }: PageShellProps) {
  return (
    <main id="main-content">
      <section className="page-hero">
        <div className="site-width">
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="page-intro">{intro}</p>
        </div>
      </section>
      <section className="section-shell">
        <div className="site-width prose-grid">{children}</div>
      </section>
    </main>
  );
}
