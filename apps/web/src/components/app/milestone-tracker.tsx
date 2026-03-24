"use client";

import { useEffect, useRef } from "react";
import { trackStreakMilestone, trackDailyXPCapReached } from "@/lib/posthog/events";

const STREAK_MILESTONES = [7, 14, 30, 60, 90, 180, 365];

interface MilestoneTrackerProps {
  currentStreak: number;
  todayXP: number;
  dailyCap: number;
}

export function MilestoneTracker({ currentStreak, todayXP, dailyCap }: MilestoneTrackerProps) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;

    // Check streak milestones
    if (STREAK_MILESTONES.includes(currentStreak)) {
      trackStreakMilestone(currentStreak);
    }

    // Check daily XP cap
    if (todayXP >= dailyCap && dailyCap > 0) {
      trackDailyXPCapReached(todayXP);
    }
  }, [currentStreak, todayXP, dailyCap]);

  return null;
}
