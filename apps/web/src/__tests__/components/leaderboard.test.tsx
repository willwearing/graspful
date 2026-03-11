import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Leaderboard } from "@/components/app/leaderboard";

describe("Leaderboard", () => {
  const entries = [
    { rank: 1, userId: "u1", displayName: "Alice", avatarUrl: null, weeklyXP: 300 },
    { rank: 2, userId: "u2", displayName: "Bob", avatarUrl: null, weeklyXP: 200 },
    { rank: 3, userId: "u3", displayName: "Carol", avatarUrl: null, weeklyXP: 150 },
  ];

  it("renders all leaderboard entries", () => {
    render(<Leaderboard entries={entries} currentUserId="u2" />);
    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText("Bob")).toBeTruthy();
    expect(screen.getByText("Carol")).toBeTruthy();
  });

  it("highlights current user row", () => {
    const { container } = render(
      <Leaderboard entries={entries} currentUserId="u2" />
    );
    const highlightedRow = container.querySelector("[data-current-user]");
    expect(highlightedRow).toBeTruthy();
    expect(highlightedRow?.textContent).toContain("Bob");
  });

  it("displays rank and XP for each entry", () => {
    render(<Leaderboard entries={entries} currentUserId="u1" />);
    expect(screen.getByText("300")).toBeTruthy();
    expect(screen.getByText("200")).toBeTruthy();
    expect(screen.getByText("150")).toBeTruthy();
  });

  it("shows empty state when no entries", () => {
    render(<Leaderboard entries={[]} currentUserId="u1" />);
    expect(screen.getByText(/no activity/i)).toBeTruthy();
  });

  it("handles tied ranks", () => {
    const tiedEntries = [
      { rank: 1, userId: "u1", displayName: "Alice", avatarUrl: null, weeklyXP: 200 },
      { rank: 1, userId: "u2", displayName: "Bob", avatarUrl: null, weeklyXP: 200 },
      { rank: 3, userId: "u3", displayName: "Carol", avatarUrl: null, weeklyXP: 100 },
    ];
    render(<Leaderboard entries={tiedEntries} currentUserId="u3" />);
    const rankOnes = screen.getAllByText("1");
    expect(rankOnes.length).toBeGreaterThanOrEqual(2);
  });
});
