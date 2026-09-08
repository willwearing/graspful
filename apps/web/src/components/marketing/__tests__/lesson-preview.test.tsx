import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LessonPreview } from "../lesson-preview";

describe("LessonPreview", () => {
  it("labels the example and waits for an answer", () => {
    render(<LessonPreview />);
    expect(screen.getByRole("complementary", { name: "Example SQL lesson" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check answer" })).toBeDisabled();
    expect(screen.getByText(/does not save progress/)).toBeInTheDocument();
    expect(screen.queryByText("82%")).not.toBeInTheDocument();
  });
  it("explains a wrong answer and allows a successful retry", () => {
    render(<LessonPreview />);
    fireEvent.click(screen.getByRole("radio", { name: "WHERE" }));
    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));
    expect(screen.getByRole("status")).toHaveTextContent("WHERE filters rows");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "SELECT" }));
    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));
    expect(screen.getByRole("status")).toHaveTextContent("Correct. SELECT chooses the columns.");
    fireEvent.click(screen.getByRole("button", { name: "Reset example" }));
    expect(screen.getByRole("button", { name: "Check answer" })).toBeDisabled();
  });
});
