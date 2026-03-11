import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";

interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  weeklyXP: number;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentUserId: string;
}

export function Leaderboard({ entries, currentUserId }: LeaderboardProps) {
  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-accent" />
          <CardTitle className="text-base font-medium">
            Weekly Leaderboard
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No activity this week yet.
          </p>
        ) : (
          <div className="space-y-1">
            {entries.map((entry) => {
              const isCurrentUser = entry.userId === currentUserId;
              return (
                <div
                  key={entry.userId}
                  data-current-user={isCurrentUser || undefined}
                  className={`flex items-center justify-between rounded-md px-3 py-2 ${
                    isCurrentUser
                      ? "bg-accent/10 border border-accent/20"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center font-bold text-muted-foreground">
                      {entry.rank}
                    </span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
                      {entry.displayName.charAt(0).toUpperCase()}
                    </div>
                    <span
                      className={`text-sm ${
                        isCurrentUser
                          ? "font-semibold text-foreground"
                          : "text-foreground"
                      }`}
                    >
                      {entry.displayName}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">
                    {entry.weeklyXP}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
