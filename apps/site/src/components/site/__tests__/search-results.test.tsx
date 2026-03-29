import { render, screen } from "@testing-library/react";
import { SearchResults } from "../search-results";

describe("SearchResults", () => {
  it("shows matching results for a query", () => {
    render(<SearchResults query="pricing" />);

    expect(screen.getByRole("heading", { name: /search graspful/i })).toBeVisible();
    expect(screen.getByRole("link", { name: /pricing/i })).toBeVisible();
  });

  it("shows an empty state when there are no results", () => {
    render(<SearchResults query="not-a-real-result" />);

    expect(screen.getByText(/no results matched that search/i)).toBeVisible();
  });
});
