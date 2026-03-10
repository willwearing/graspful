import { Badge } from "@/components/ui/badge";

type MasteryState = "unstarted" | "in_progress" | "mastered" | "needs_review";

const config: Record<MasteryState, { label: string; className: string }> = {
  unstarted: {
    label: "Not Started",
    className: "bg-muted text-muted-foreground",
  },
  in_progress: {
    label: "In Progress",
    className: "bg-primary/10 text-primary",
  },
  mastered: {
    label: "Mastered",
    className: "bg-green-500/10 text-green-600 dark:text-green-400",
  },
  needs_review: {
    label: "Review",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
};

interface MasteryBadgeProps {
  state: MasteryState;
}

export function MasteryBadge({ state }: MasteryBadgeProps) {
  const { label, className } = config[state];
  return (
    <Badge variant="secondary" className={className}>
      {label}
    </Badge>
  );
}
