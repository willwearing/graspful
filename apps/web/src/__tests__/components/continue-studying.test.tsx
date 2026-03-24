import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { ContinueStudying } from "@/components/app/continue-studying";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children?: ReactNode;
    href: string;
  } & Omit<React.JSX.IntrinsicElements["a"], "href" | "children">) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("ContinueStudying", () => {
  it("renders a link to the academy study page when academy context exists", () => {
    render(
      <ContinueStudying
        academyId="academy-1"
        courseId="course-1"
        courseName="NFPA 1001"
      />,
    );
    const link = screen.getByText(/continue studying/i).closest("a");
    expect(link?.getAttribute("href")).toBe("/academy/academy-1/study");
    expect(link?.querySelector("button")).toBeNull();
  });

  it("renders a link to the study page for the course", () => {
    render(<ContinueStudying courseId="course-1" courseName="NFPA 1001" />);
    const link = screen.getByText(/continue studying/i).closest("a");
    expect(link).toBeTruthy();
    expect(link?.getAttribute("href")).toBe("/study/course-1");
    expect(link?.querySelector("button")).toBeNull();
  });

  it("shows the course name", () => {
    render(<ContinueStudying courseId="course-1" courseName="NFPA 1001" />);
    expect(screen.getByText("NFPA 1001")).toBeTruthy();
  });
});
