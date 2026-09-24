import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Callout } from "../callout";
import { DocPage } from "../doc-page";
import { DocSection } from "../doc-section";

afterEach(cleanup);

describe("Documentation components", () => {
  it("renders rich descriptions and nested content with a single page heading", () => {
    render(
      <DocPage title="Course schema" description={<>Use <code>course.yaml</code> to define a course.</>}>
        <DocSection title="Course fields" headingId="course-fields">
          <a href="/docs/quickstart">Start a course</a>
        </DocSection>
      </DocPage>,
    );

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByText("course.yaml").tagName).toBe("CODE");
    expect(screen.getByText("course.yaml").closest("p")).toHaveTextContent("Use course.yaml to define a course.");
    expect(screen.getByRole("heading", { name: "Course fields" })).toHaveAttribute("id", "course-fields");
    expect(screen.getByRole("link", { name: "Start a course" })).toHaveAttribute("href", "/docs/quickstart");
  });

  it("preserves section anchors separately from heading anchors", () => {
    render(
      <DocSection title={<>The <code>import</code> command</>} id="import-command" headingId="import-heading" className="mt-16 scroll-mt-24" aria-labelledby="import-heading">
        <p>Import a reviewed draft.</p>
      </DocSection>,
    );

    const section = screen.getByRole("region", { name: "The import command" });
    expect(section).toHaveAttribute("id", "import-command");
    expect(section).toHaveClass("mt-16", "scroll-mt-24");
    expect(section).not.toHaveClass("mt-12");
    expect(within(section).getByRole("heading", { level: 2 })).toHaveAttribute("id", "import-heading");
  });

  it("preserves callout section semantics and custom presentation", () => {
    render(
      <Callout as="section" title="Next steps" headingId="next-steps" aria-labelledby="next-steps" className="mt-16 p-8">
        <a href="/docs/cli">CLI reference</a>
      </Callout>,
    );

    const section = screen.getByRole("region", { name: "Next steps" });
    expect(section).toHaveClass("mt-16", "p-8", "rounded-xl", "bg-card");
    expect(section).not.toHaveClass("p-6");
    expect(within(section).getByRole("heading", { level: 2 })).toHaveAttribute("id", "next-steps");
    expect(within(section).getByRole("link")).toHaveAttribute("href", "/docs/cli");
  });

  it("supports callouts without an extra heading", () => {
    render(<Callout><p>Global options apply to every command.</p></Callout>);
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(screen.getByText("Global options apply to every command.").parentElement).toHaveClass("p-6");
  });

  it("allows existing page and callout typography to remain unchanged", () => {
    render(
      <DocPage title="Billing" description="Paid subscriptions are not available yet." titleClassName="tracking-tight">
        <Callout title="Start authoring" titleClassName="text-lg font-bold text-foreground">
          Read the quickstart.
        </Callout>
      </DocPage>,
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveClass("tracking-tight");
    expect(screen.getByRole("heading", { level: 1 })).not.toHaveClass("tracking-[-0.04em]");
    expect(screen.getByRole("heading", { level: 2 })).toHaveClass("text-lg");
  });
});
