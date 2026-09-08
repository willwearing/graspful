import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StudyRouter } from "@/components/app/study-router";

const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

describe("StudyRouter", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockRefresh.mockClear();
  });

  it("uses task.courseId when rendered from academy study entry", () => {
    render(
      <StudyRouter
        academyId="academy-1"
        task={{
          academyId: "academy-1",
          courseId: "c1",
          taskType: "lesson",
          conceptId: "concept-1",
          reason: "Next in sequence",
        }}
      />,
    );
    expect(mockPush).toHaveBeenCalledWith("/study/c1/lesson/concept-1");
  });

  it("redirects to lesson page for lesson task", () => {
    render(
      <StudyRouter
        courseId="c1"
        task={{ taskType: "lesson", conceptId: "concept-1", reason: "Next in sequence" }}
      />
    );
    expect(mockPush).toHaveBeenCalledWith("/study/c1/lesson/concept-1");
  });

  it("redirects to review page for review task", () => {
    render(
      <StudyRouter
        courseId="c1"
        task={{ taskType: "review", conceptId: "concept-2", reason: "Due for review" }}
      />
    );
    expect(mockPush).toHaveBeenCalledWith("/study/c1/review/concept-2");
  });

  it("redirects to quiz page for quiz task", () => {
    render(
      <StudyRouter
        courseId="c1"
        task={{ taskType: "quiz", reason: "Quiz time" }}
      />
    );
    expect(mockPush).toHaveBeenCalledWith("/study/c1/quiz");
  });

  it("redirects to section exam page for section exam task", () => {
    render(
      <StudyRouter
        courseId="c1"
        task={{ taskType: "section_exam", sectionId: "section-1", reason: "Ready to certify" }}
      />
    );
    expect(mockPush).toHaveBeenCalledWith("/study/c1/sections/section-1/exam");
  });

  it("shows session complete when task is null", () => {
    render(<StudyRouter courseId="c1" task={null} />);
    expect(screen.getByText(/session complete/i)).toBeTruthy();
  });

  it("uses a serializable task href for a platform learner", () => {
    render(<StudyRouter courseId="c1"
      task={{ taskType: "lesson", conceptId: "concept-1", reason: "Next" }}
      taskHref="/learn/acme/courses/basics/study/lesson/concept-1" />);
    expect(mockPush).toHaveBeenCalledWith("/learn/acme/courses/basics/study/lesson/concept-1");
  });

  it("shows a retryable error after a failed load instead of completion", () => {
    render(<StudyRouter courseId="c1" task={null} loadFailed />);
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load your next activity");
    expect(screen.queryByText(/session complete/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(mockRefresh).toHaveBeenCalledOnce();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("shows an error if a returned task has no valid destination", () => {
    render(<StudyRouter courseId="c1" task={{ taskType: "lesson", reason: "Next" }} taskHref={null} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText(/loading next activity/i)).not.toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
