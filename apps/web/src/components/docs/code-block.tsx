"use client";

import { useState } from "react";

export function CodeBlock({
  children,
  language,
  title,
}: {
  children: string;
  language?: string;
  title?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group relative my-4 rounded-xl border border-border/50 bg-[#0A1628] text-sm">
      {title && (
        <div className="border-b border-white/10 px-4 py-2 text-xs text-slate-400 font-mono">
          {title}
        </div>
      )}
      <button
        onClick={copy}
        className="absolute right-3 top-3 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-white/10"
      >
        {copied ? "Copied" : "Copy"}
      </button>
      <pre className="overflow-x-auto p-4">
        <code className={`text-slate-300 ${language ? `language-${language}` : ""}`}>
          {children}
        </code>
      </pre>
    </div>
  );
}

export function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded-md bg-muted px-1.5 py-0.5 text-sm font-mono text-foreground">
      {children}
    </code>
  );
}
