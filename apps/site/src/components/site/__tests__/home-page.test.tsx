import { render, screen } from "@testing-library/react";
import { HomePage } from "../home-page";

describe("HomePage", () => {
  it("renders the product hero and primary sections", () => {
    render(<HomePage />);

    // Hero headline is split into word spans, check the h1 contains the text
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toBeVisible();
    expect(h1.textContent).toMatch(/build.*courses.*where.*students.*actually.*learn/i);

    expect(
      screen.getByRole("heading", { name: /what we do for you/i }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: /how it works/i }),
    ).toBeVisible();
  });

  it("renders hero calls to action", () => {
    render(<HomePage />);

    expect(
      screen.getAllByRole("link", { name: /start building free/i }).length,
    ).toBeGreaterThanOrEqual(1);
  });
});
