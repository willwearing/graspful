import { render, screen } from "@testing-library/react";
import { SiteHeader } from "../header";

// Mock the theme hook
vi.mock("@/lib/theme", () => ({
  useTheme: () => ({ theme: "light", toggleTheme: () => {} }),
}));

describe("SiteHeader", () => {
  it("renders the primary navigation with theme toggle", () => {
    render(<SiteHeader />);

    expect(screen.getByText("Pricing")).toBeVisible();
    expect(screen.getByText("Docs")).toBeVisible();
    expect(screen.getByRole("button", { name: /switch to dark mode/i })).toBeVisible();
  });
});
