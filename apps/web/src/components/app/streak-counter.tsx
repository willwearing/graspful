import { Card, CardContent } from "@/components/ui/card";
import { Flame } from "lucide-react";

interface StreakCounterProps {
  streakDays: number;
}

export function StreakCounter({ streakDays }: StreakCounterProps) {
  return (
    <Card className="border-border">
      <CardContent className="flex items-center gap-4 p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Flame className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{streakDays}</p>
          <p className="text-sm text-muted-foreground">Day Streak</p>
        </div>
      </CardContent>
    </Card>
  );
}
