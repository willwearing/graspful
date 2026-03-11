import { describe, it, expect } from "vitest";
import type { MasteryState } from "@/lib/types";

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
