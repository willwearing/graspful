import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Zap } from "lucide-react";

interface XPProgressProps {
  earnedToday: number;
  dailyTarget: number;
}

export function XPProgress({ earnedToday, dailyTarget }: XPProgressProps) {
  const percent = Math.min((earnedToday / dailyTarget) * 100, 100);

  return (
    <Card className="border-border">
      <CardContent className="p-6">
        <div className="flex items-center gap-4 mb-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
            <Zap className="h-6 w-6 text-accent" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">
              {earnedToday} / {dailyTarget}
            </p>
            <p className="text-sm text-muted-foreground">Daily XP</p>
          </div>
        </div>
        <Progress value={percent} className="h-2" />
      </CardContent>
    </Card>
  );
}
