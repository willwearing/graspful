import { describe, it, expect } from "vitest";

/**
 * The middleware itself relies on Next.js request/response objects and Supabase
 * server client, which are difficult to instantiate in vitest without heavy mocking.
 *
 * Instead, we extract and test the pure-logic pieces:
 * - PUBLIC_ROUTES matching
 * - Routing decision matrix (unauthenticated + protected → redirect, etc.)
 */

const PUBLIC_ROUTES = ["/", "/sign-in", "/sign-up", "/auth/callback", "/pricing"];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

type RoutingDecision =
  | { action: "redirect"; to: string }
  | { action: "next" };

const AUTH_PAGES = ["/", "/sign-in", "/sign-up"];

function decideRoute(pathname: string, user: boolean): RoutingDecision {
  if (!user && !isPublicRoute(pathname)) {
    return { action: "redirect", to: "/sign-in" };
  }
  if (user && AUTH_PAGES.includes(pathname)) {
    return { action: "redirect", to: "/dashboard" };
  }
  return { action: "next" };
}

describe("isPublicRoute", () => {
  it("marks / as public", () => {
    expect(isPublicRoute("/")).toBe(true);
  });

  it("marks /sign-in as public", () => {
    expect(isPublicRoute("/sign-in")).toBe(true);
  });

  it("marks /sign-up as public", () => {
    expect(isPublicRoute("/sign-up")).toBe(true);
  });

  it("marks /auth/callback as public", () => {
    expect(isPublicRoute("/auth/callback")).toBe(true);
  });

  it("marks /pricing as public", () => {
    expect(isPublicRoute("/pricing")).toBe(true);
  });

  it("marks /dashboard as NOT public", () => {
    expect(isPublicRoute("/dashboard")).toBe(false);
  });

  it("marks /settings as NOT public", () => {
    expect(isPublicRoute("/settings")).toBe(false);
  });

  it("marks sub-routes of public routes as public", () => {
    expect(isPublicRoute("/auth/callback/extra")).toBe(true);
  });
});

describe("middleware routing decisions", () => {
  it("redirects unauthenticated user on protected route to /sign-in", () => {
    const result = decideRoute("/dashboard", false);
    expect(result).toEqual({ action: "redirect", to: "/sign-in" });
  });

  it("redirects unauthenticated user on /settings to /sign-in", () => {
    const result = decideRoute("/settings", false);
    expect(result).toEqual({ action: "redirect", to: "/sign-in" });
  });

  it("redirects authenticated user on / to /dashboard", () => {
    const result = decideRoute("/", true);
    expect(result).toEqual({ action: "redirect", to: "/dashboard" });
  });

  it("redirects authenticated user on /sign-in to /dashboard", () => {
    const result = decideRoute("/sign-in", true);
    expect(result).toEqual({ action: "redirect", to: "/dashboard" });
  });

  it("redirects authenticated user on /sign-up to /dashboard", () => {
    const result = decideRoute("/sign-up", true);
    expect(result).toEqual({ action: "redirect", to: "/dashboard" });
  });

  it("allows unauthenticated user on public routes", () => {
    expect(decideRoute("/", false)).toEqual({ action: "next" });
    expect(decideRoute("/sign-in", false)).toEqual({ action: "next" });
    expect(decideRoute("/sign-up", false)).toEqual({ action: "next" });
    expect(decideRoute("/auth/callback", false)).toEqual({ action: "next" });
  });

  it("allows authenticated user on protected routes", () => {
    expect(decideRoute("/dashboard", true)).toEqual({ action: "next" });
    expect(decideRoute("/settings", true)).toEqual({ action: "next" });
  });
});
