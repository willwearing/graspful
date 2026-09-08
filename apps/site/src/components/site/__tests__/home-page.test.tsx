import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HomePage } from "../home-page";

describe("HomePage", () => {
  it("explains authoring, draft import, and explicit publication", () => {
    render(<HomePage />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Turn your source material into lessons and practice.");
    expect(screen.getByRole("heading", { name: "Author, review, then publish" })).toBeVisible();
    expect(screen.getByText(/Importing without --publish saves a draft/)).toBeVisible();
    expect(screen.getByText(/Confirm that the response contains published: true/)).toBeVisible();
    expect(screen.getByRole("heading", { name: "Paid subscriptions are not available yet" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Create free account" })).toHaveAttribute("href", "/sign-up");
  });

  it("labels the lesson as an example and explains an incorrect answer before retry", () => {
    render(<HomePage />);

    expect(screen.getByRole("complementary", { name: "Illustrative lesson" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "2/9" }));
    expect(screen.getByText(/Convert 1\/3 to 2\/6 first/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "1/2" }));
    expect(screen.getByText(/Correct\. 1\/3 equals 2\/6/)).toBeVisible();
  });

  it("reports a clipboard failure without claiming the command was copied", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    render(<HomePage />);
    fireEvent.click(screen.getByRole("button", { name: "Copy install command" }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Copy failed. Select and copy the command."));
    expect(screen.getByRole("button", { name: "Copy install command" })).toHaveTextContent("Copy");
    expect(screen.queryByText("Copied", { exact: true })).not.toBeInTheDocument();
  });
});
