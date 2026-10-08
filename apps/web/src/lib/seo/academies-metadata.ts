import type { Metadata } from "next";

interface CatalogBrandLike {
  academies: { name: string; courses: unknown[] }[];
}

const CANONICAL = "https://graspful.ai/academies";
const FALLBACK_TITLE = "Academies | Graspful";
const FALLBACK_DESCRIPTION =
  "Browse public academies and their course tracks across the Graspful network.";
const MAX_TITLE_LENGTH = 70;

/** Name the live academies in the title so searchers for them see a match. */
export function buildAcademiesMetadata(brands: CatalogBrandLike[]): Metadata {
  const academies = brands.flatMap((brand) => brand.academies);
  const names = [...new Set(academies.map((academy) => academy.name.trim()).filter(Boolean))];
  const courseCount = academies.reduce((count, academy) => count + academy.courses.length, 0);

  if (names.length === 0) {
    return {
      title: { absolute: FALLBACK_TITLE },
      description: FALLBACK_DESCRIPTION,
      alternates: { canonical: CANONICAL },
    };
  }

  const titleNames: string[] = [];
  for (const name of names) {
    const candidate = `Academies: ${[...titleNames, name].join(", ")} | Graspful`;
    if (titleNames.length > 0 && candidate.length > MAX_TITLE_LENGTH) break;
    titleNames.push(name);
  }

  const courses = `${courseCount} ${courseCount === 1 ? "course" : "courses"}`;

  return {
    title: { absolute: `Academies: ${titleNames.join(", ")} | Graspful` },
    description: `Live adaptive academies on Graspful: ${names.join(", ")}. ${courses} with diagnostics, mastery checks, and spaced review.`,
    alternates: { canonical: CANONICAL },
  };
}
