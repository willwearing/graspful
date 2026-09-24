import { describe, it, expect } from "vitest";
import { safeRedirectPath } from "@graspful/shared";

/** The auth callback, confirm route and auth form all use this helper. */
function validateRedirect(rawRedirect: string | null): string {
  return safeRedirectPath(rawRedirect, "/dashboard");
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

  it("rejects backslash tricks that browsers treat as //", () => {
    expect(validateRedirect("/\\evil.com")).toBe("/dashboard");
    expect(validateRedirect("/\t/evil.com")).toBe("/dashboard");
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
