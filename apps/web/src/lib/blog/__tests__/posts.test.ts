import { describe, expect, it } from "vitest";
import { BLOG_POST_CONTENT } from "@/components/marketing/blog/post-content";
import { BLOG_POSTS, getBlogPost, listBlogPosts } from "@/lib/blog/posts";

describe("blog posts", () => {
  it("gives every post a body, a short title and valid dates", () => {
    for (const post of BLOG_POSTS) {
      expect(BLOG_POST_CONTENT[post.slug]).toBeDefined();
      expect(post.title.length).toBeLessThanOrEqual(60);
      expect(post.slug).toMatch(/^[a-z0-9-]+$/);
      expect(post.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(post.updatedAt >= post.publishedAt).toBe(true);
      expect(post.title).not.toContain("—");
      expect(post.description).not.toContain("—");
    }
  });

  it("uses unique slugs and lists newest first", () => {
    const slugs = BLOG_POSTS.map((post) => post.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    const listed = listBlogPosts();
    for (let i = 1; i < listed.length; i++) {
      expect(listed[i - 1].publishedAt >= listed[i].publishedAt).toBe(true);
    }
  });

  it("returns undefined for unknown slugs", () => {
    expect(getBlogPost("does-not-exist")).toBeUndefined();
  });
});
