import type { Metadata } from "next";
import Link from "next/link";
import { formatBlogDate, listBlogPosts } from "@/lib/blog/posts";

export const metadata: Metadata = {
  title: { absolute: "Graspful Blog: Building Adaptive Courses With AI Agents" },
  description:
    "Guides for building adaptive courses with Claude Code, Cursor and other AI agents: real commands, real output, and how to check a course before you publish it.",
  alternates: { canonical: "https://graspful.ai/blog" },
  openGraph: {
    title: "Graspful Blog",
    description:
      "Guides for building adaptive courses with Claude Code, Cursor and other AI agents.",
    url: "https://graspful.ai/blog",
    images: [{ url: "/images/og-graspful.png", width: 1200, height: 630, alt: "Graspful blog" }],
  },
};

export default function BlogIndexPage() {
  const posts = listBlogPosts();

  return (
    <div className="mx-auto max-w-3xl px-6 py-16 md:py-24">
      <h1 className="text-4xl font-bold tracking-[-0.04em] sm:text-5xl">Graspful blog</h1>
      <p className="mt-4 leading-7 text-muted-foreground">
        Graspful is an adaptive learning platform for courses built by AI
        agents. These guides show how to build, check and publish them, with
        real commands and real output.
      </p>
      <ul className="mt-12 divide-y divide-border/60 border-y border-border/60">
        {posts.map((post) => (
          <li key={post.slug} className="py-8">
            <time dateTime={post.publishedAt} className="text-xs font-medium text-muted-foreground">
              {formatBlogDate(post.publishedAt)}
            </time>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em]">
              <Link href={`/blog/${post.slug}`} className="hover:text-primary">
                {post.heading}
              </Link>
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{post.summary}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
