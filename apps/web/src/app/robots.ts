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
  return process.env.NEXT_PUBLIC_SITE_URL || "https://graspful.com";
}

export default async function robots(): Promise<MetadataRoute.Robots> {
  const BASE_URL = await getBaseUrl();
  return {
    rules: [
      // Default: allow all public marketing pages
      {
        userAgent: "*",
        allow: ["/", "/docs/", "/pricing", "/agents", "/sign-up"],
        disallow: [
          "/dashboard",
          "/study",
          "/browse",
          "/settings",
          "/diagnostic",
          "/auth",
          "/academy",
        ],
      },
      // Explicitly allow AI crawlers for discoverability
      {
        userAgent: "GPTBot",
        allow: ["/", "/docs/", "/pricing", "/agents", "/llms.txt"],
      },
      {
        userAgent: "ChatGPT-User",
        allow: ["/", "/docs/", "/pricing", "/agents", "/llms.txt"],
      },
      {
        userAgent: "Google-Extended",
        allow: ["/", "/docs/", "/pricing", "/agents"],
      },
      {
        userAgent: "anthropic-ai",
        allow: ["/", "/docs/", "/pricing", "/agents", "/llms.txt"],
      },
      {
        userAgent: "Claude-Web",
        allow: ["/", "/docs/", "/pricing", "/agents", "/llms.txt"],
      },
      {
        userAgent: "PerplexityBot",
        allow: ["/", "/docs/", "/pricing", "/agents"],
      },
      {
        userAgent: "Bytespider",
        allow: ["/", "/docs/", "/pricing", "/agents"],
      },
      {
        userAgent: "CCBot",
        allow: ["/", "/docs/", "/pricing", "/agents"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
