import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { resolveBrand } from "@/lib/brand/resolve";

async function getBaseUrl(): Promise<string> {
  try {
    const headersList = await headers();
    const hostname = headersList.get("host") || "";
    if (hostname && hostname !== "localhost") {
      const brand = await resolveBrand(hostname);
      return `https://${brand.domain}`;
    }
  } catch {
    // static export or build time — fall back to env
  }
  return process.env.NEXT_PUBLIC_SITE_URL || "https://electricianprep.vercel.app";
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const BASE_URL = await getBaseUrl();
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/pricing`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/sign-up`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/agents`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];

  return staticPages;
}
