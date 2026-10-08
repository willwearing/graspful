import { describe, expect, it } from "vitest";
import { buildAcademiesMetadata } from "../academies-metadata";

const academy = (name: string, courses = 1) => ({ name, courses: Array.from({ length: courses }) });

describe("buildAcademiesMetadata", () => {
  it("names live academies in the title and counts courses", () => {
    const metadata = buildAcademiesMetadata([
      { academies: [academy("PostHog TAM Academy", 8)] },
      { academies: [academy("PostHog Use Case Selling", 2)] },
    ]);

    expect(metadata.title).toEqual({
      absolute: "Academies: PostHog TAM Academy, PostHog Use Case Selling | Graspful",
    });
    expect(metadata.description).toContain("PostHog TAM Academy, PostHog Use Case Selling");
    expect(metadata.description).toContain("10 courses");
    expect(metadata.alternates).toEqual({ canonical: "https://graspful.ai/academies" });
  });

  it("keeps long titles short by dropping later names", () => {
    const metadata = buildAcademiesMetadata([
      { academies: [academy("A very long academy name number one"), academy("Another long academy name two")] },
    ]);

    expect(metadata.title).toEqual({ absolute: "Academies: A very long academy name number one | Graspful" });
    expect(metadata.description).toContain("Another long academy name two");
    expect(metadata.description).toContain("2 courses");
  });

  it("falls back to the generic title when the catalog is empty", () => {
    expect(buildAcademiesMetadata([]).title).toEqual({ absolute: "Academies | Graspful" });
  });
});
