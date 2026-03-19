import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { StudyRouter } from "@/components/app/study-router";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe("StudyRouter", () => {
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
});
