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
        slug: "deer-id-academy",
        name: "Deer ID Academy",
        domain: "deer-id-academy.graspful.com",
        orgSlug: "graspful-gmail",
        academies: [],
      },
      {
        slug: "firefighter-prep",
        name: "FirefighterPrep",
        domain: "firefighterprep.graspful.com",
        orgSlug: "firefighter-prep",
        academies: [],
      },
    ]);

    render(await SiteFooter());

    expect(screen.getByText("Academies")).toBeVisible();
    expect(screen.getByRole("link", { name: "Deer ID Academy" })).toHaveAttribute(
      "href",
      "https://deer-id-academy.graspful.com"
    );
    expect(screen.getByText("firefighterprep.graspful.com")).toBeVisible();
  });
});
