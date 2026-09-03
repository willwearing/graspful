import { describe, expect, it } from "vitest";
import { decideRoute, isPlatformLearnerRoute, isPublicRoute } from "@/lib/hosts";

describe("isPublicRoute", () => {
  it("marks / as public", () => {
    expect(isPublicRoute("/")).toBe(true);
  });

  it("marks auth and marketing routes as public on local/platform hosts", () => {
    expect(isPublicRoute("/sign-in")).toBe(true);
    expect(isPublicRoute("/sign-up")).toBe(true);
    expect(isPublicRoute("/cli-auth")).toBe(true);
    expect(isPublicRoute("/auth/callback")).toBe(true);
    expect(isPublicRoute("/pricing")).toBe(true);
    expect(isPublicRoute("/agents")).toBe(true);
    expect(isPublicRoute("/ai-course-builder")).toBe(true);
    expect(isPublicRoute("/academies")).toBe(true);
    expect(isPublicRoute("/docs")).toBe(true);
  });

  it("treats academy hosts as learner-only public surfaces", () => {
    expect(isPublicRoute("/pricing", "academy")).toBe(false);
    expect(isPublicRoute("/ai-course-builder", "academy")).toBe(false);
    expect(isPublicRoute("/docs", "academy")).toBe(false);
    expect(isPublicRoute("/sign-in", "academy")).toBe(true);
  });

  it("marks protected routes as non-public", () => {
    expect(isPublicRoute("/dashboard")).toBe(false);
    expect(isPublicRoute("/settings")).toBe(false);
  });

  it("treats /learn as a protected platform learner route", () => {
    expect(isPlatformLearnerRoute("/learn/posthog-tam")).toBe(true);
    expect(isPublicRoute("/learn/posthog-tam", "platform")).toBe(false);
  });

  it("marks sub-routes of public routes as public", () => {
    expect(isPublicRoute("/auth/callback/extra")).toBe(true);
  });
});

describe("routing decisions", () => {
  it("redirects unauthenticated local users on protected routes to sign-in with a return url", () => {
    expect(decideRoute("/dashboard", false)).toEqual({
      action: "redirect",
      to: "/sign-in?redirect=%2Fdashboard",
    });
    expect(decideRoute("/settings", false)).toEqual({
      action: "redirect",
      to: "/sign-in?redirect=%2Fsettings",
    });
  });

  it("preserves the existing local behavior for learner vs creator brands", () => {
    expect(decideRoute("/", true)).toEqual({ action: "redirect", to: "/dashboard" });
    expect(decideRoute("/sign-in", true, { brandId: "student-brand" })).toEqual({
      action: "redirect",
      to: "/dashboard",
    });
    expect(decideRoute("/dashboard", true, { brandId: "graspful" })).toEqual({
      action: "redirect",
      to: "/creator",
    });
    expect(decideRoute("/creator", true, { brandId: "student-brand" })).toEqual({
      action: "redirect",
      to: "/dashboard",
    });
  });

  it("keeps signed-in users on platform marketing home", () => {
    expect(
      decideRoute("/", true, {
        surface: "platform",
        currentUrl: new URL("https://graspful.ai/"),
      }),
    ).toEqual({ action: "next" });
  });

  it("sends platform product routes to the app host", () => {
    expect(
      decideRoute("/dashboard", false, {
        surface: "platform",
        currentUrl: new URL("https://graspful.ai/dashboard"),
      }),
    ).toEqual({
      action: "redirect",
      to: "https://app.graspful.ai/sign-in?redirect=%2Fdashboard",
    });
  });

  it("keeps platform learner routes on graspful.ai and requires auth there", () => {
    expect(
      decideRoute("/learn/posthog-tam", false, {
        surface: "platform",
        currentUrl: new URL("https://graspful.ai/learn/posthog-tam"),
      }),
    ).toEqual({
      action: "redirect",
      to: "/sign-in?redirect=%2Flearn%2Fposthog-tam",
    });

    expect(
      decideRoute("/learn/posthog-tam", true, {
        surface: "platform",
        currentUrl: new URL("https://graspful.ai/learn/posthog-tam"),
      }),
    ).toEqual({ action: "next" });
  });

  it("uses app.graspful.ai as a control-plane-only surface", () => {
    expect(
      decideRoute("/", false, {
        surface: "app",
        currentUrl: new URL("https://app.graspful.ai/"),
      }),
    ).toEqual({ action: "redirect", to: "/sign-in" });

    expect(
      decideRoute("/pricing", false, {
        surface: "app",
        currentUrl: new URL("https://app.graspful.ai/pricing"),
      }),
    ).toEqual({
      action: "redirect",
      to: "https://graspful.ai/pricing",
    });

    expect(
      decideRoute("/academies", false, {
        surface: "app",
        currentUrl: new URL("https://app.graspful.ai/academies"),
      }),
    ).toEqual({
      action: "redirect",
      to: "https://graspful.ai/academies",
    });

    expect(
      decideRoute("/ai-course-builder", false, {
        surface: "app",
        currentUrl: new URL("https://app.graspful.ai/ai-course-builder"),
      }),
    ).toEqual({
      action: "redirect",
      to: "https://graspful.ai/ai-course-builder",
    });
  });

  it("keeps the AI course builder public on the platform host", () => {
    expect(
      decideRoute("/ai-course-builder", false, {
        brandId: "graspful",
        surface: "platform",
        currentUrl: new URL("https://graspful.ai/ai-course-builder"),
      }),
    ).toEqual({ action: "next" });
  });

  it("keeps academy hosts learner-only and bounces creator routes to the app host", () => {
    expect(
      decideRoute("/creator", false, {
        surface: "academy",
        currentUrl: new URL("https://firefighterprep.vercel.app/creator"),
      }),
    ).toEqual({
      action: "redirect",
      to: "https://app.graspful.ai/sign-in?redirect=%2Fcreator",
    });

    expect(
      decideRoute("/pricing", false, {
        surface: "academy",
        currentUrl: new URL("https://firefighterprep.vercel.app/pricing"),
      }),
    ).toEqual({
      action: "redirect",
      to: "https://graspful.ai/pricing",
    });
  });
});
