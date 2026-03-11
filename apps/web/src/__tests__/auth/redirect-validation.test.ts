import { describe, it, expect } from "vitest";

/**
 * Tests for the redirect validation logic used in the auth callback route.
 * Extracted from apps/web/src/app/auth/callback/route.ts to test in isolation.
 */

function validateRedirect(rawRedirect: string | null): string {
  const fallback = "/dashboard";
  const redirect = rawRedirect || fallback;
  return redirect.startsWith("/") && !redirect.startsWith("//")
    ? redirect
    : fallback;
}

describe("auth callback redirect validation", () => {
  it("allows valid relative path /dashboard", () => {
    expect(validateRedirect("/dashboard")).toBe("/dashboard");
  });

  it("allows valid relative path /browse/some-course", () => {
    expect(validateRedirect("/browse/some-course")).toBe("/browse/some-course");
  });

  it("allows root path /", () => {
    expect(validateRedirect("/")).toBe("/");
  });

  it("defaults null redirect to /dashboard", () => {
    expect(validateRedirect(null)).toBe("/dashboard");
  });

  it("rejects absolute URL (https://evil.com)", () => {
    expect(validateRedirect("https://evil.com")).toBe("/dashboard");
  });

  it("rejects absolute URL (http://evil.com)", () => {
    expect(validateRedirect("http://evil.com")).toBe("/dashboard");
  });

  it("rejects protocol-relative URL (//evil.com)", () => {
    expect(validateRedirect("//evil.com")).toBe("/dashboard");
  });

  it("rejects bare domain string", () => {
    expect(validateRedirect("evil.com")).toBe("/dashboard");
  });

  it("allows deep nested relative path", () => {
    expect(validateRedirect("/browse/course/lesson/123")).toBe(
      "/browse/course/lesson/123"
    );
  });

  it("allows path with query params", () => {
    expect(validateRedirect("/settings?tab=profile")).toBe(
      "/settings?tab=profile"
    );
  });
});
