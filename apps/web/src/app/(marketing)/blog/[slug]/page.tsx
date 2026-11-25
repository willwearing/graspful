import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { BLOG_POST_CONTENT } from "@/components/marketing/blog/post-content";
import { TrackedMarketingLink } from "@/components/marketing/tracked-marketing-link";
import { BLOG_POSTS, formatBlogDate, getBlogPost } from "@/lib/blog/posts";
import { safeJsonLd } from "@/lib/sanitize-json-ld";

const SITE_URL = "https://graspful.ai";

type BlogPostPageProps = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};
  const url = `${SITE_URL}/blog/${post.slug}`;

  return {
    title: { absolute: post.title },
    description: post.description,
    keywords: post.keywords,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      url,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      images: [{ url: "/images/og-graspful.png", width: 1200, height: 630, alt: post.heading }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: ["/images/og-graspful.png"],
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  const Content = post ? BLOG_POST_CONTENT[post.slug] : undefined;
  if (!post || !Content) notFound();

  const url = `${SITE_URL}/blog/${post.slug}`;
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.heading,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    mainEntityOfPage: url,
    url,
    image: `${SITE_URL}/images/og-graspful.png`,
    author: { "@type": "Organization", name: "Graspful", url: SITE_URL },
    publisher: { "@type": "Organization", name: "Graspful", url: SITE_URL },
  };

  return (
    <article className="mx-auto max-w-3xl px-6 py-16 md:py-24">
      <Link href="/blog" className="text-sm font-medium text-muted-foreground hover:text-foreground">
        Blog
      </Link>
      <h1 className="mt-4 text-4xl font-bold tracking-[-0.04em] sm:text-5xl">{post.heading}</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        Published <time dateTime={post.publishedAt}>{formatBlogDate(post.publishedAt)}</time>
        {post.updatedAt !== post.publishedAt ? (
          <>
            {" "}· Updated <time dateTime={post.updatedAt}>{formatBlogDate(post.updatedAt)}</time>
          </>
        ) : null}
      </p>

      <div className="mt-8">
        <Content />
      </div>

      <aside className="mt-16 rounded-2xl border border-border/60 bg-muted/35 p-8">
        <h2 className="text-2xl font-bold tracking-[-0.03em]">Build your first course</h2>
        <p className="mt-3 leading-7 text-muted-foreground">
          Install the CLI, scaffold a course and run the review on your machine.
          You only need an account to publish.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <TrackedMarketingLink
            href="/docs/quickstart"
            location="blog_post_primary"
            className="btn-gradient inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold"
          >
            Start with the quickstart
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </TrackedMarketingLink>
          <TrackedMarketingLink
            href="/docs/mcp"
            location="blog_post_secondary"
            className="inline-flex items-center justify-center rounded-full border border-border bg-background px-6 py-3 text-sm font-semibold transition-colors hover:bg-muted"
          >
            Set up the MCP server
          </TrackedMarketingLink>
        </div>
      </aside>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(articleJsonLd) }}
      />
    </article>
  );
}
