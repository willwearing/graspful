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

  const segments = [
    { label: "Mastered", count: mastered, colorClass: "bg-green-500" },
    { label: "In Progress", count: inProgress, colorClass: "bg-primary" },
    { label: "Needs Review", count: needsReview, colorClass: "bg-amber-500" },
    { label: "Not Started", count: unstarted, colorClass: "bg-muted" },
  ];

  return (
    <div className="rounded-lg border border-border p-6 space-y-4">
      <h3 className="text-sm font-medium text-foreground">Knowledge Profile</h3>

      {/* Stacked bar */}
      <div className="flex h-4 w-full overflow-hidden rounded-full bg-muted">
        {segments.map((seg) => {
          const pct = (seg.count / totalConcepts) * 100;
          if (pct === 0) return <div key={seg.label} data-segment className="h-full" style={{ width: 0 }} />;
          return (
            <div
              key={seg.label}
              data-segment
              className={`h-full ${seg.colorClass} transition-all`}
              style={{ width: `${pct}%` }}
              title={`${seg.label}: ${seg.count}`}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${seg.colorClass}`} />
            <div>
              <p className="text-lg font-bold text-foreground">{seg.count}</p>
              <p className="text-xs text-muted-foreground">{seg.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
