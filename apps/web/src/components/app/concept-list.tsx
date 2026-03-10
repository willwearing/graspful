import { Card, CardContent } from "@/components/ui/card";
import { MasteryBadge } from "@/components/app/mastery-badge";
import { ChevronRight } from "lucide-react";

type MasteryState = "unstarted" | "in_progress" | "mastered" | "needs_review";

interface Concept {
  id: string;
  name: string;
  description: string | null;
  difficulty: number;
  sortOrder: number;
}

interface ConceptWithMastery extends Concept {
  masteryState: MasteryState;
}

interface ConceptListProps {
  concepts: ConceptWithMastery[];
  courseId: string;
}

export function ConceptList({ concepts }: ConceptListProps) {
  if (concepts.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center">
        <p className="text-muted-foreground">No concepts in this course yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {concepts.map((concept) => (
        <Card
          key={concept.id}
          className="border-border hover:border-primary/30 transition-colors cursor-pointer"
        >
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
                {concept.sortOrder + 1}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-medium text-foreground truncate">
                  {concept.name}
                </h3>
                {concept.description && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {concept.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-4">
              <MasteryBadge state={concept.masteryState} />
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
