import type { MetadataRoute } from "next";
import type { HostSurface } from "@/lib/hosts";

export function buildSitemapEntries(
  baseUrl: string,
  surface: HostSurface,
): MetadataRoute.Sitemap {
  const now = new Date();

  if (surface === "app") {
    return [];
  }

  if (surface === "academy") {
    return [
      {
        url: baseUrl,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 1.0,
      },
      {
        url: `${baseUrl}/sign-up`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.6,
      },
      {
        url: `${baseUrl}/sign-in`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.3,
      },
    ];
  }

  return [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/agents`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/docs`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/docs/quickstart`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/docs/cli`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/docs/mcp`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/docs/course-schema`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/docs/brand-schema`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/docs/billing`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/docs/review-gate`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/sign-up`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/sign-in`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];
}

export function buildRobotsConfig(
  baseUrl: string,
  surface: HostSurface,
): MetadataRoute.Robots {
  if (surface === "app") {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
      sitemap: `${baseUrl}/sitemap.xml`,
    };
  }

  if (surface === "academy") {
    return {
      rules: [
        {
          userAgent: "*",
          allow: ["/", "/sign-up", "/sign-in"],
          disallow: [
            "/creator",
            "/settings",
            "/browse",
            "/study",
            "/diagnostic",
            "/academy",
            "/pricing",
            "/docs",
            "/agents",
            "/cli-auth",
            "/auth",
          ],
        },
      ],
      sitemap: `${baseUrl}/sitemap.xml`,
    };
  }

  return {
    rules: [
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
          "/creator",
        ],
      },
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
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
