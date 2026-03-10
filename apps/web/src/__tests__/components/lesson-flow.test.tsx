import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LessonFlow } from "@/components/app/lesson-flow";

const mockApiClientFetch = vi.fn();
vi.mock("@/lib/api", () => ({
  apiClientFetch: (...args: any[]) => mockApiClientFetch(...args),
}));

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const lessonData = {
  conceptId: "c1",
  conceptName: "Fire Behavior",
  knowledgePoints: [
    {
      id: "kp1",
      slug: "fire-triangle",
      instructionText: "Fire requires heat, fuel, and oxygen.",
      workedExampleText: "Example: A candle flame needs all three elements.",
    },
    {
      id: "kp2",
      slug: "flashover",
      instructionText: "Flashover occurs when all surfaces in a room ignite simultaneously.",
      workedExampleText: "Example: Room temperature reaches 500-600C.",
    },
  ],
};

describe("LessonFlow", () => {
  beforeEach(() => {
    mockApiClientFetch.mockReset();
    mockPush.mockReset();
  });

  it("renders the first knowledge point instruction", () => {
    render(
      <LessonFlow
        orgId="org-1"
        courseId="course-1"
        token="test-token"
        lesson={lessonData}
      />
    );
    expect(screen.getByText("Fire Behavior")).toBeTruthy();
    expect(screen.getByText("Fire requires heat, fuel, and oxygen.")).toBeTruthy();
    expect(screen.getByText(/1 of 2/)).toBeTruthy();
  });

  it("shows worked example", () => {
    render(
      <LessonFlow
        orgId="org-1"
        courseId="course-1"
        token="test-token"
        lesson={lessonData}
      />
    );
    expect(screen.getByText(/candle flame/)).toBeTruthy();
  });

  it("navigates to next KP when Continue is clicked", () => {
    render(
      <LessonFlow
        orgId="org-1"
        courseId="course-1"
        token="test-token"
        lesson={lessonData}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(screen.getByText("Flashover occurs when all surfaces in a room ignite simultaneously.")).toBeTruthy();
    expect(screen.getByText(/2 of 2/)).toBeTruthy();
  });

  it("shows Complete Lesson button on last KP", () => {
    render(
      <LessonFlow
        orgId="org-1"
        courseId="course-1"
        token="test-token"
        lesson={lessonData}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(screen.getByRole("button", { name: /complete lesson/i })).toBeTruthy();
  });

  it("calls complete API and redirects on completion", async () => {
    mockApiClientFetch.mockResolvedValueOnce({ conceptId: "c1", status: "lesson_complete" });

    render(
      <LessonFlow
        orgId="org-1"
        courseId="course-1"
        token="test-token"
        lesson={lessonData}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    fireEvent.click(screen.getByRole("button", { name: /complete lesson/i }));

    await waitFor(() => {
      expect(mockApiClientFetch).toHaveBeenCalledWith(
        "/orgs/org-1/courses/course-1/lessons/c1/complete",
        "test-token",
        expect.objectContaining({ method: "POST" })
      );
    });
  });
});
