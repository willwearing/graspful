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
  return process.env.NEXT_PUBLIC_SITE_URL || "https://electricianprep.audio";
}

export default async function robots(): Promise<MetadataRoute.Robots> {
  const BASE_URL = await getBaseUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/study",
          "/browse",
          "/settings",
          "/diagnostic",
          "/auth",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
