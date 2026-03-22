import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { resolveBrand } from "@/lib/brand/resolve";

async function getBaseUrl(): Promise<string> {
  try {
    const headersList = await headers();
    const hostname = headersList.get("host") || "";
    if (hostname && hostname !== "localhost") {
      const cookieHeader = headersList.get("cookie");
      const brand = await resolveBrand(hostname, cookieHeader);
      return `https://${brand.domain}`;
    }
  } catch {
    // static export or build time
  }
  return process.env.NEXT_PUBLIC_SITE_URL || "https://firefighterprep.audio";
}

export default async function robots(): Promise<MetadataRoute.Robots> {
  const BASE_URL = await getBaseUrl();
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/dashboard", "/study", "/browse", "/settings", "/diagnostic", "/auth"] },
      { userAgent: "ChatGPT-User", allow: "/" },
      { userAgent: "Applebot", allow: "/" },
      { userAgent: "GPTBot", disallow: "/" },
      { userAgent: "Google-Extended", disallow: "/" },
      { userAgent: "CCBot", disallow: "/" },
      { userAgent: "anthropic-ai", disallow: "/" },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
