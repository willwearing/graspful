export type HostSurface = "local" | "platform" | "app" | "academy";

const DEFAULT_PLATFORM_HOST = "graspful.ai";
const DEFAULT_APP_HOST = "app.graspful.ai";

const PLATFORM_HOSTS = new Set([
  DEFAULT_PLATFORM_HOST,
  "www.graspful.ai",
  "graspful.vercel.app",
]);

const APP_HOSTS = new Set([
  DEFAULT_APP_HOST,
  "app.graspful.vercel.app",
]);

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

const LOCAL_PUBLIC_ROUTES = [
  "/",
  "/sign-in",
  "/sign-up",
  "/cli-auth",
  "/auth/callback",
  "/auth/confirm",
  "/forgot-password",
  "/reset-password",
  "/pricing",
  "/agents",
  "/academies",
  "/docs",
  "/sentry-example-page",
];

const PLATFORM_PUBLIC_ROUTES = [
  "/",
  "/sign-in",
  "/sign-up",
  "/cli-auth",
  "/auth/callback",
  "/auth/confirm",
  "/forgot-password",
  "/reset-password",
  "/pricing",
  "/agents",
  "/academies",
  "/docs",
  "/sentry-example-page",
];

const APP_PUBLIC_ROUTES = [
  "/",
  "/sign-in",
  "/sign-up",
  "/auth/callback",
  "/auth/confirm",
  "/forgot-password",
  "/reset-password",
];

const ACADEMY_PUBLIC_ROUTES = [
  "/",
  "/sign-in",
  "/sign-up",
  "/auth/callback",
  "/auth/confirm",
  "/forgot-password",
  "/reset-password",
];

const AUTH_PAGES = ["/sign-in", "/sign-up"] as const;
const MARKETING_ROUTES = ["/", "/pricing", "/agents", "/academies", "/docs", "/cli-auth"];
const CREATOR_ROUTES = ["/creator"];
const LEARNER_ROUTES = ["/dashboard", "/browse", "/study", "/diagnostic", "/academy"];
const PLATFORM_LEARNER_ROUTES = ["/learn"];

export interface RoutingContext {
  brandId?: string;
  currentUrl?: URL;
  surface?: HostSurface;
}

export type RoutingDecision =
  | { action: "redirect"; to: string }
  | { action: "next" };

function routeMatches(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function normalizeHost(rawHost: string | null | undefined): string {
  if (!rawHost) {
    return "localhost";
  }

  const firstHost = rawHost.split(",")[0]?.trim().toLowerCase() ?? "localhost";
  return firstHost.replace(/:\d+$/, "");
}

export function isLocalHost(hostname: string): boolean {
  return LOCAL_HOSTS.has(normalizeHost(hostname));
}

export function getPlatformHost(): string {
  return process.env.NEXT_PUBLIC_PLATFORM_HOST || DEFAULT_PLATFORM_HOST;
}

export function getAppHost(): string {
  return process.env.NEXT_PUBLIC_APP_HOST || DEFAULT_APP_HOST;
}

export function getHostSurface(hostname: string): HostSurface {
  const host = normalizeHost(hostname);

  if (isLocalHost(host)) {
    return "local";
  }

  if (APP_HOSTS.has(host) || host === getAppHost()) {
    return "app";
  }

  if (PLATFORM_HOSTS.has(host) || host === getPlatformHost()) {
    return "platform";
  }

  return "academy";
}

export function getRequestHost(
  headersLike: Pick<Headers, "get">,
  fallback = "localhost",
): string {
  return normalizeHost(
    headersLike.get("x-forwarded-host") || headersLike.get("host") || fallback,
  );
}

export function getDefaultAuthRedirectPath(surface: HostSurface): string {
  switch (surface) {
    case "platform":
    case "app":
      return "/creator";
    case "academy":
    case "local":
    default:
      return "/dashboard";
  }
}

export function isMarketingRoute(pathname: string): boolean {
  return MARKETING_ROUTES.some((route) => routeMatches(pathname, route));
}

export function isCreatorRoute(pathname: string): boolean {
  return CREATOR_ROUTES.some((route) => routeMatches(pathname, route));
}

export function isLearnerRoute(pathname: string): boolean {
  return LEARNER_ROUTES.some((route) => routeMatches(pathname, route));
}

export function isPlatformLearnerRoute(pathname: string): boolean {
  return PLATFORM_LEARNER_ROUTES.some((route) => routeMatches(pathname, route));
}

export function isAuthPage(pathname: string): boolean {
  return AUTH_PAGES.some((route) => routeMatches(pathname, route));
}

export function isPublicRoute(
  pathname: string,
  surface: HostSurface = "local",
): boolean {
  const routes =
    surface === "platform"
      ? PLATFORM_PUBLIC_ROUTES
      : surface === "app"
        ? APP_PUBLIC_ROUTES
        : surface === "academy"
          ? ACADEMY_PUBLIC_ROUTES
          : LOCAL_PUBLIC_ROUTES;

  return routes.some((route) => routeMatches(pathname, route));
}

function buildHostUrl(currentUrl: URL, targetHost: string, destination: string): string {
  const target = new URL(currentUrl.toString());
  const next = new URL(destination, currentUrl);
  target.hostname = normalizeHost(targetHost);
  target.port = currentUrl.port;
  target.pathname = next.pathname;
  target.search = next.search;
  return target.toString();
}

function redirectToHost(
  currentUrl: URL | undefined,
  targetHost: string,
  destination: string,
): string {
  if (!currentUrl) {
    return destination;
  }

  return buildHostUrl(currentUrl, targetHost, destination);
}

export function decideRoute(
  pathname: string,
  user: boolean,
  context: RoutingContext = {},
): RoutingDecision {
  const surface = context.surface ?? "local";
  const brandId = context.brandId ?? "student-brand";
  const currentUrl = context.currentUrl;
  const appHost = getAppHost();
  const platformHost = getPlatformHost();
  const signInPath = `/sign-in?redirect=${encodeURIComponent(pathname)}`;

  if (surface === "local") {
    if (!user && !isPublicRoute(pathname, surface)) {
      return { action: "redirect", to: signInPath };
    }

    if (user && (pathname === "/" || isAuthPage(pathname))) {
      return {
        action: "redirect",
        to: brandId === "graspful" ? "/creator" : "/dashboard",
      };
    }

    if (user) {
      const isGraspful = brandId === "graspful";
      if (isGraspful && pathname === "/dashboard") {
        return { action: "redirect", to: "/creator" };
      }
      if (!isGraspful && isCreatorRoute(pathname)) {
        return { action: "redirect", to: "/dashboard" };
      }
    }

    return { action: "next" };
  }

  if (surface === "platform") {
    if (isPlatformLearnerRoute(pathname)) {
      if (!user) {
        return { action: "redirect", to: signInPath };
      }
      return { action: "next" };
    }

    if (user && isAuthPage(pathname)) {
      return {
        action: "redirect",
        to: redirectToHost(currentUrl, appHost, "/creator"),
      };
    }

    if (isPublicRoute(pathname, surface)) {
      return { action: "next" };
    }

    return {
      action: "redirect",
      to: redirectToHost(currentUrl, appHost, user ? "/creator" : signInPath),
    };
  }

  if (surface === "app") {
    if (isPlatformLearnerRoute(pathname)) {
      return {
        action: "redirect",
        to: redirectToHost(currentUrl, platformHost, pathname),
      };
    }

    if (isMarketingRoute(pathname) && pathname !== "/") {
      return {
        action: "redirect",
        to: redirectToHost(currentUrl, platformHost, pathname),
      };
    }

    if (pathname === "/") {
      return { action: "redirect", to: user ? "/creator" : "/sign-in" };
    }

    if (!user && !isPublicRoute(pathname, surface)) {
      return { action: "redirect", to: signInPath };
    }

    if (user && isAuthPage(pathname)) {
      return { action: "redirect", to: "/creator" };
    }

    if (pathname === "/dashboard") {
      return { action: "redirect", to: "/creator" };
    }

    if (user && isLearnerRoute(pathname)) {
      return { action: "redirect", to: "/creator" };
    }

    return { action: "next" };
  }

  if (isMarketingRoute(pathname) && pathname !== "/") {
    return {
      action: "redirect",
      to: redirectToHost(currentUrl, platformHost, pathname),
    };
  }

  if (isPlatformLearnerRoute(pathname)) {
    return {
      action: "redirect",
      to: redirectToHost(currentUrl, platformHost, user ? pathname : signInPath),
    };
  }

  if (isCreatorRoute(pathname)) {
    return {
      action: "redirect",
      to: redirectToHost(currentUrl, appHost, user ? pathname : signInPath),
    };
  }

  if (!user && !isPublicRoute(pathname, surface)) {
    return { action: "redirect", to: signInPath };
  }

  if (user && isAuthPage(pathname)) {
    return { action: "redirect", to: "/dashboard" };
  }

  return { action: "next" };
}
