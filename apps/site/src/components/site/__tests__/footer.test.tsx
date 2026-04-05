import { render, screen } from "@testing-library/react";
import { SiteFooter } from "../footer";

vi.mock("@/lib/public-academies", () => ({
  getPublicAcademyCatalog: vi.fn(),
}));

import { getPublicAcademyCatalog } from "@/lib/public-academies";

describe("SiteFooter", () => {
  it("renders the academies column with academy domains", async () => {
    vi.mocked(getPublicAcademyCatalog).mockResolvedValue([
      {
        slug: "deer-academy",
        name: "Deer Academy",
        domain: "deer-academy.graspful.ai",
        orgSlug: "graspful-gmail",
        academies: [],
      },
      {
        slug: "firefighter-prep",
        name: "FirefighterPrep",
        domain: "firefighterprep.graspful.ai",
        orgSlug: "firefighter-prep",
        academies: [],
      },
    ]);

    render(await SiteFooter());

    expect(screen.getByText("Academies")).toBeVisible();
    expect(screen.getByRole("link", { name: "Deer Academy" })).toHaveAttribute(
      "href",
      "https://deer-academy.graspful.ai"
    );
    expect(screen.getByText("firefighterprep.graspful.ai")).toBeVisible();
  });
});
