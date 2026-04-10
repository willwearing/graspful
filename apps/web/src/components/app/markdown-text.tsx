"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownTextProps {
  children: string;
  className?: string;
}

/**
 * Renders markdown text with Tailwind-friendly styling.
 * Used for lesson instruction and worked example fields, which
 * support markdown per the course schema.
 */
export function MarkdownText({ children, className }: MarkdownTextProps) {
  return (
    <div
      className={
        className ??
        "text-foreground leading-relaxed space-y-3 [&_strong]:font-semibold [&_em]:italic [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-sm [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1 [&_a]:text-primary [&_a]:underline"
      }
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
