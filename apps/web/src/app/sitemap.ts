import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { resolveBrand } from "@/lib/brand/resolve";
import { getHostSurface, getRequestHost, isLocalHost } from "@/lib/hosts";
import { buildSitemapEntries } from "@/lib/seo/surface-indexing";

async function getBaseUrlAndSurface(): Promise<{ baseUrl: string; surface: ReturnType<typeof getHostSurface> }> {
  try {
    const headersList = await headers();
    const hostname = getRequestHost(headersList);
    const surface = getHostSurface(hostname);
    if (hostname && !isLocalHost(hostname)) {
      const brand = await resolveBrand(hostname);
      if (surface === "app") {
        return { baseUrl: `https://${hostname}`, surface };
      }
      return { baseUrl: `https://${brand.domain}`, surface };
    }
  } catch {
    // static export or build time — fall back to env
  }
  return {
    baseUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://graspful.ai",
    surface: "platform",
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { baseUrl, surface } = await getBaseUrlAndSurface();
  return buildSitemapEntries(baseUrl, surface);
}
