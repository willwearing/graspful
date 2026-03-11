import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";

interface ContinueStudyingProps {
  courseId: string;
  courseName: string;
}

export function ContinueStudying({ courseId, courseName }: ContinueStudyingProps) {
  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-6 flex items-center justify-between gap-4">
      <div>
        <p className="text-sm text-muted-foreground">Continue where you left off</p>
        <p className="text-lg font-semibold text-foreground">{courseName}</p>
      </div>
      <Button render={<Link href={`/study/${courseId}`} />} className="shrink-0 gap-2">
        <Play className="h-4 w-4" />
        Continue Studying
      </Button>
    </div>
  );
}
