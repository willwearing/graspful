import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target } from "lucide-react";

interface CompletionEstimateProps {
  completionPercent: number;
  estimatedWeeksRemaining: number | null;
  averageDailyXP: number;
  masteredConcepts: number;
  totalConcepts: number;
}

export function CompletionEstimate({
  completionPercent,
  estimatedWeeksRemaining,
  averageDailyXP,
  masteredConcepts,
  totalConcepts,
}: CompletionEstimateProps) {
  return (
    <Card className="border-border">
      <CardContent className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Target className="h-6 w-6 text-primary" />
          </div>
          <div>
            {completionPercent >= 100 ? (
              <p className="text-lg font-bold text-foreground">
                Course Complete!
              </p>
            ) : estimatedWeeksRemaining === null ? (
              <p className="text-lg font-bold text-foreground">
                Start studying to see your estimate
              </p>
            ) : (
              <>
                <p className="text-lg font-bold text-foreground">
                  ~{estimatedWeeksRemaining} weeks remaining
                </p>
                <p className="text-sm text-muted-foreground">
                  At your current pace ({averageDailyXP} XP/day)
                </p>
              </>
            )}
          </div>
        </div>

        <Progress value={completionPercent} className="h-2 mb-2" />
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{masteredConcepts}</span>{" "}
          of {totalConcepts} concepts mastered ({completionPercent}%)
        </p>
      </CardContent>
    </Card>
  );
}
