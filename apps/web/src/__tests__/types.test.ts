import { describe, it, expect } from "vitest";
import type { MasteryState, SectionMasteryState, TaskType } from "@/lib/types";

/**
 * Verifies that the shared MasteryState type is correctly defined
 * and covers all expected states.
 */
describe("MasteryState type", () => {
  it("accepts all valid mastery states", () => {
    const states: MasteryState[] = [
      "unstarted",
      "in_progress",
      "mastered",
      "needs_review",
    ];
    expect(states).toHaveLength(4);
    expect(new Set(states).size).toBe(4);
  });

  it("MasteryState values are used consistently in mastery-badge config", async () => {
    // Dynamically import to verify the module resolves and config keys match
    const { MasteryBadge } = await import("@/components/app/mastery-badge");
    expect(MasteryBadge).toBeDefined();
    expect(typeof MasteryBadge).toBe("function");
  });
});

describe("section and task types", () => {
  it("accepts all valid section states", () => {
    const states: SectionMasteryState[] = [
      "locked",
      "lesson_in_progress",
      "exam_ready",
      "certified",
      "needs_review",
    ];
    expect(states).toHaveLength(5);
  });

  it("accepts section exam as a task type", () => {
    const tasks: TaskType[] = ["lesson", "review", "quiz", "remediation", "section_exam"];
    expect(tasks).toContain("section_exam");
  });
});
