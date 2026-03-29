import { fireEvent, render, screen } from "@testing-library/react";
import { SiteHeader } from "../header";
import { ThemeProvider } from "@/lib/theme";

describe("SiteHeader", () => {
  it("toggles dark mode", () => {
    render(
      <ThemeProvider>
        <SiteHeader />
      </ThemeProvider>,
    );

    const toggle = screen.getByRole("button", { name: /switch to dark mode/i });
    fireEvent.click(toggle);

    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});
