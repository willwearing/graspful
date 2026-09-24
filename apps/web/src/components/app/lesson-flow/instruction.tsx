import { BookOpen, Pause, Play, Volume2 } from "lucide-react";
import { LessonRichContent } from "@/components/app/lesson-rich-content";
import { MarkdownText } from "@/components/app/markdown-text";
import type { KnowledgePoint } from "./types";

interface InstructionProps {
  kp: KnowledgePoint;
  audioAvailable: boolean;
  playing: boolean;
  onPlay: () => void;
}

export function Instruction({ kp, audioAvailable, playing, onPlay }: InstructionProps) {
  return (
    <div className="rounded-lg border border-border p-6 space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-primary">
        <BookOpen className="h-4 w-4" /> Instruction
      </div>
      <MarkdownText>{kp.instructionText}</MarkdownText>
      <LessonRichContent blocks={kp.instructionContent ?? []} />
      {audioAvailable ? (
        <button onClick={onPlay} className="flex items-center gap-2 rounded-lg bg-primary/10 p-3 text-sm text-primary hover:bg-primary/20 transition-colors w-full">
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {playing ? "Playing..." : "Listen to instruction"}
        </button>
      ) : (
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
          <Volume2 className="h-4 w-4" /> Audio not available
        </div>
      )}
    </div>
  );
}
