import { createApiFetcher } from "@/lib/api";

export interface PublicCatalogCourse {
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isPublished: boolean;
}

export interface PublicCatalogAcademy {
  slug: string;
  name: string;
  description: string | null;
  courseCount: number;
  publishedCourseCount: number;
  courses: PublicCatalogCourse[];
}

export interface PublicCatalogBrand {
  slug: string;
  name: string;
  domain: string;
  orgSlug: string;
  academies: PublicCatalogAcademy[];
}

export async function getPublicAcademyCatalog(): Promise<PublicCatalogBrand[]> {
  const apiFetch = createApiFetcher();
  try {
    return await apiFetch<PublicCatalogBrand[]>("/brands/catalog/academies");
  } catch {
    return [];
  }
}
