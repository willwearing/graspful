import Link from "next/link";
import type { ReactNode } from "react";

/** Shared prose building blocks for blog post bodies. */
export function Code({ children }: { children: string }) {
  return (
    <pre className="my-6 overflow-x-auto rounded-xl border border-border/60 bg-[#07111f] p-5 text-sm leading-7 text-slate-200">
      <code>{children}</code>
    </pre>
  );
}

export function H2({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="mt-14 scroll-mt-24 text-2xl font-bold tracking-[-0.03em] sm:text-3xl">
      {children}
    </h2>
  );
}

export function P({ children }: { children: ReactNode }) {
  return <p className="mt-4 leading-7 text-foreground/85">{children}</p>;
}

export function A({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="font-medium text-primary underline underline-offset-4">
      {children}
    </Link>
  );
}
