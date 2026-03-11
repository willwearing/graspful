import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { WeeklyXPChart } from "@/components/app/weekly-xp-chart";

// Mock recharts to avoid canvas issues in tests
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="chart-container">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
}));

describe("WeeklyXPChart", () => {
  const sampleData = [
    { date: "2026-03-04", xp: 30 },
    { date: "2026-03-05", xp: 45 },
    { date: "2026-03-06", xp: 0 },
    { date: "2026-03-07", xp: 40 },
    { date: "2026-03-08", xp: 55 },
    { date: "2026-03-09", xp: 20 },
    { date: "2026-03-10", xp: 35 },
  ];

  it("renders the chart container", () => {
    render(<WeeklyXPChart data={sampleData} />);
    expect(screen.getByTestId("chart-container")).toBeTruthy();
  });

  it("renders weekly total in header", () => {
    render(<WeeklyXPChart data={sampleData} />);
    // Total: 30+45+0+40+55+20+35 = 225
    expect(screen.getByText("225")).toBeTruthy();
    expect(screen.getByText(/weekly xp/i)).toBeTruthy();
  });

  it("handles empty data", () => {
    render(<WeeklyXPChart data={[]} />);
    expect(screen.getByText("0")).toBeTruthy();
  });
});
