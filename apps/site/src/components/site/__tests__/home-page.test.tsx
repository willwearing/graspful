import { render, screen } from "@testing-library/react";
import { HomePage } from "../home-page";

describe("HomePage", () => {
  it("renders the GOV.UK-style hero and primary sections", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", {
        name: /the best place to run adaptive learning products and guidance/i,
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: /popular on graspful/i }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: /services and information/i }),
    ).toBeVisible();
  });

  it("renders the site search form", () => {
    render(<HomePage />);

    expect(screen.getByRole("searchbox", { name: /search/i })).toBeVisible();
    expect(
      screen.getByRole("button", { name: /search graspful/i }),
    ).toBeVisible();
  });
});
