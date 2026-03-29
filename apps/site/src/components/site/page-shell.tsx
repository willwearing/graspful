import type { ReactNode } from "react";

interface PageShellProps {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
}

export function PageShell({ eyebrow, title, intro, children }: PageShellProps) {
  return (
    <main id="main-content" className="pt-24">
      <section className="py-16 bg-muted/50">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {eyebrow}
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-4">{title}</h1>
          <p className="text-lg text-muted-foreground max-w-2xl">{intro}</p>
        </div>
      </section>
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-6 grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-12">
          {children}
        </div>
      </section>
    </main>
  );
}
