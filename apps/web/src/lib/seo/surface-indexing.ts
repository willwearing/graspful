import type { Metadata, MetadataRoute } from "next";
import type { HostSurface } from "@/lib/hosts";

export const privatePageRobots = {
  index: false,
  follow: false,
  googleBot: {
    index: false,
    follow: false,
  },
} satisfies NonNullable<Metadata["robots"]>;

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
      url: `${baseUrl}/ai-course-builder`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/academies`,
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
      url: `${baseUrl}/docs/how-it-works`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/docs/course-creation-guide`,
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
      url: `${baseUrl}/docs/design-guide`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/docs/glossary`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/docs/concepts/knowledge-graph`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/docs/concepts/mastery-learning`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/docs/concepts/adaptive-diagnostics`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/docs/concepts/spaced-repetition`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/docs/concepts/task-selection`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/docs/concepts/gamification`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/docs/concepts/learning-staircase`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
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
        allow: "/",
      },
    };
  }

  if (surface === "academy") {
    return {
      rules: [
        {
          userAgent: "*",
          allow: "/",
        },
      ],
      sitemap: `${baseUrl}/sitemap.xml`,
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
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
