import { Progress } from "@/components/ui/progress";

interface MasteryChartProps {
  mastered: number;
  inProgress: number;
  needsReview: number;
  unstarted: number;
  totalConcepts: number;
}

export function MasteryChart({ mastered, inProgress, needsReview, unstarted, totalConcepts }: MasteryChartProps) {
  if (totalConcepts === 0) {
    return (
      <div className="rounded-lg border border-border p-6 text-center">
        <p className="text-muted-foreground">No concepts yet.</p>
      </div>
    );
  }

  const masteryPercent = Math.round((mastered / totalConcepts) * 100);

  const stats = [
    { label: "Mastered", count: mastered, dotClass: "bg-green-500", textClass: "text-green-600 dark:text-green-400" },
    { label: "In Progress", count: inProgress, dotClass: "bg-primary", textClass: "text-primary" },
    { label: "Needs Review", count: needsReview, dotClass: "bg-amber-500", textClass: "text-amber-600 dark:text-amber-400" },
    { label: "Not Started", count: unstarted, dotClass: "bg-muted-foreground/30", textClass: "text-muted-foreground" },
  ];

  return (
    <div className="rounded-lg border border-border p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Knowledge Profile</h3>
        <span className="text-xs text-muted-foreground">{masteryPercent}% mastered</span>
      </div>

      <Progress value={masteryPercent} className="h-2" />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${s.dotClass}`} />
            <div>
              <p className={`text-lg font-bold ${s.textClass}`}>{s.count}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
