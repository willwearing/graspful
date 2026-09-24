import { LessonRichContent } from "@/components/app/lesson-rich-content";
import { MarkdownText } from "@/components/app/markdown-text";
import type { KnowledgePoint } from "./types";

export function WorkedExampleContent({ kp }: { kp: KnowledgePoint }) {
  return <><MarkdownText>{kp.workedExampleText}</MarkdownText><LessonRichContent blocks={kp.workedExampleContent ?? []} /></>;
}

export function WorkedExample({ kp }: { kp: KnowledgePoint }) {
  if (!kp.workedExampleText) return null;
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-6 space-y-2">
      <p className="text-sm font-medium text-muted-foreground">Worked Example</p>
      <WorkedExampleContent kp={kp} />
    </div>
  );
}
