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
  try {
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000/api/v1";
    const res = await fetch(`${backendUrl}/brands/catalog/academies`, {
      cache: "no-store",
    });

    if (!res.ok) {
      return [];
    }

    return (await res.json()) as PublicCatalogBrand[];
  } catch {
    return [];
  }
}
