/**
 * Blog posts on graspful.ai. Each post's body lives in
 * src/components/marketing/blog/posts and is keyed by slug.
 *
 * Dates are ISO dates (YYYY-MM-DD). Change `updatedAt` only when the content
 * changes in a way a reader would notice.
 */
export interface BlogPost {
  slug: string;
  /** Page <title>, under 60 characters, with the main search phrase. */
  title: string;
  /** Visible H1. */
  heading: string;
  /** Meta description. Answers the question in one or two sentences. */
  description: string;
  /** One-line summary for the blog index card. */
  summary: string;
  publishedAt: string;
  updatedAt: string;
  keywords: string[];
}

export const BLOG_POSTS: readonly BlogPost[] = [
  {
    slug: "turn-docs-into-a-course-with-claude-code",
    title: "How to Turn Your Docs Into a Course With Claude Code",
    heading: "How to turn your docs into a course with Claude Code",
    description:
      "Have Claude Code map your docs into a prerequisite graph, write lessons and practice questions in course YAML, then pass 10 automated checks before you publish an adaptive course.",
    summary:
      "A step-by-step walkthrough with real commands and output: from a folder of docs to a reviewed, adaptive course.",
    publishedAt: "2026-11-24",
    updatedAt: "2026-11-24",
    keywords: [
      "turn documentation into a course",
      "claude code course",
      "create a course with claude code",
      "docs to course",
      "onboarding docs to training course",
    ],
  },
  {
    slug: "ai-generated-course-quality-checklist",
    title: "AI-Generated Course Quality Checklist: 15 Checks",
    heading: "AI-generated course quality checklist: what to check before you publish",
    description:
      "Check an AI-generated course in two passes: 10 automated checks for structure, duplicates, practice depth and prerequisites, then 5 human checks of facts and answer keys against your source.",
    summary:
      "A 15-point checklist with real review output, and the one error a 10/10 automated score can't catch.",
    publishedAt: "2026-11-27",
    updatedAt: "2026-11-27",
    keywords: [
      "ai generated course quality checklist",
      "check ai generated course",
      "review ai generated course before publishing",
      "ai course quality",
      "ai generated training content review",
    ],
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}

/** Newest first. */
export function listBlogPosts(): BlogPost[] {
  return [...BLOG_POSTS].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function formatBlogDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
