"use client";

import { ExternalLink, ImageIcon, Lightbulb, PlayCircle } from "lucide-react";
import type { RichContentBlock } from "@/lib/types";

interface LessonRichContentProps {
  blocks: RichContentBlock[];
}

function getBlockKey(block: RichContentBlock): string {
  switch (block.type) {
    case "image":
      return `image-${block.url}`;
    case "video":
      return `video-${block.url}`;
    case "link":
      return `link-${block.url}`;
    case "callout":
      return `callout-${block.title}-${block.body}`;
  }
}

export function LessonRichContent({ blocks }: LessonRichContentProps) {
  if (blocks.length === 0) return null;

  const keyCounts = new Map<string, number>();

  return (
    <div className="space-y-4">
      {blocks.map((block) => {
        const baseKey = getBlockKey(block);
        const seenCount = keyCounts.get(baseKey) ?? 0;
        keyCounts.set(baseKey, seenCount + 1);
        const blockKey = seenCount === 0 ? baseKey : `${baseKey}-${seenCount}`;

        if (block.type === "image") {
          return (
            <figure key={blockKey} className="rounded-xl border border-border bg-muted/20 p-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <ImageIcon className="size-4" />
                Visual
              </div>
              <img
                src={block.url}
                alt={block.alt}
                className="w-full rounded-lg border border-border bg-background object-contain"
                style={block.width ? { maxWidth: `${block.width}px` } : undefined}
              />
              {block.caption ? (
                <figcaption className="mt-3 text-sm text-muted-foreground">{block.caption}</figcaption>
              ) : null}
            </figure>
          );
        }

        if (block.type === "video") {
          return (
            <div key={blockKey} className="rounded-xl border border-border bg-muted/20 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <PlayCircle className="size-4" />
                Video
              </div>
              <a
                href={block.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                {block.title}
                <ExternalLink className="size-4" />
              </a>
              {block.caption ? (
                <p className="mt-2 text-sm text-muted-foreground">{block.caption}</p>
              ) : null}
            </div>
          );
        }

        if (block.type === "link") {
          return (
            <div key={blockKey} className="rounded-xl border border-border bg-background p-4">
              <a
                href={block.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                {block.title}
                <ExternalLink className="size-4" />
              </a>
              {block.description ? (
                <p className="mt-2 text-sm text-muted-foreground">{block.description}</p>
              ) : null}
            </div>
          );
        }

        return (
          <div key={blockKey} className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-300">
              <Lightbulb className="size-4" />
              Callout
            </div>
            <p className="text-sm font-medium text-foreground">{block.title}</p>
            <p className="mt-2 text-sm text-muted-foreground">{block.body}</p>
          </div>
        );
      })}
    </div>
  );
}
