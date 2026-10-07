import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LessonRichContent } from "../lesson-rich-content";

describe("LessonRichContent", () => {
  it("renders the identity trace as a table with code and source links", () => {
    render(
      <LessonRichContent
        blocks={[{
          type: "callout",
          title: "Trace the captured identity",
          body: "| Step | Actor |\n| --- | --- |\n| Capture | `anonymous-a` |\n| Identify | `user-42` |\n\nCheck the [identity guide](https://posthog.com/docs/data/identifying-users).",
        }]}
      />,
    );
    const table = screen.getByRole("table");
    expect(within(table).getByRole("columnheader", { name: "Actor" })).toBeInTheDocument();
    expect(within(table).getByRole("cell", { name: "user-42" })).toBeInTheDocument();
    expect(within(table).getByText("anonymous-a").tagName).toBe("CODE");
    expect(screen.getByRole("link", { name: "identity guide" })).toHaveAttribute(
      "href", "https://posthog.com/docs/data/identifying-users",
    );
  });

  it("keeps plain callout text readable", () => {
    render(<LessonRichContent blocks={[{
      type: "callout", title: "Check the payload", body: "Capture the event once.",
    }]} />);
    expect(screen.getByText("Capture the event once.")).toBeInTheDocument();
  });
});
