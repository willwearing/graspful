import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UnavailableState } from "./unavailable-state";

describe("UnavailableState", () => {
  it("keeps the caller's return route and reason visible", () => {
    render(<UnavailableState backHref="/learn/tenant/academies/academy" backLabel="Back to academy" title="Diagnostic unavailable" message="This academy has no diagnostic content yet." />);
    expect(screen.getByRole("link", { name: "Back to academy" })).toHaveAttribute("href", "/learn/tenant/academies/academy");
    expect(screen.getByRole("heading", { name: "Diagnostic unavailable" })).toBeVisible();
    expect(screen.getByText("This academy has no diagnostic content yet.")).toBeVisible();
  });
});
