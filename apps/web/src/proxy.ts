import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { resolveBrand } from "@/lib/brand/resolve";

export const PUBLIC_ROUTES = [
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
  "/docs",
];

export const AUTH_PAGES = ["/", "/sign-in", "/sign-up"] as const;

export type RoutingDecision =
  | { action: "redirect"; to: string }
  | { action: "next" };

function createBrandResponse(request: NextRequest, brandId: string) {
  const response = NextResponse.next({ request });
  response.headers.set("x-brand-id", brandId);
  response.cookies.set("brand-id", brandId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
  return response;
}

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function decideRoute(
  pathname: string,
  user: boolean,
  brandId = "student-brand",
): RoutingDecision {
  if (!user && !isPublicRoute(pathname)) {
    return { action: "redirect", to: "/sign-in" };
  }

  if (user && AUTH_PAGES.includes(pathname as (typeof AUTH_PAGES)[number])) {
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
    if (!isGraspful && pathname.startsWith("/creator")) {
      return { action: "redirect", to: "/dashboard" };
    }
  }

  return { action: "next" };
}

export async function proxy(request: NextRequest) {
  try {
    const hostname = request.headers.get("host") || "localhost";
    const cookieHeader = request.headers.get("cookie");

    const brand = await resolveBrand(hostname, cookieHeader);
    let response = createBrandResponse(request, brand.id);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return response;
    }

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = createBrandResponse(request, brand.id);
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const decision = decideRoute(request.nextUrl.pathname, !!user, brand.id);
    if (decision.action === "redirect") {
      const url = request.nextUrl.clone();
      url.pathname = decision.to;
      if (!user && !isPublicRoute(request.nextUrl.pathname)) {
        url.searchParams.set("redirect", request.nextUrl.pathname);
      }
      return NextResponse.redirect(url);
    }

    return response;
  } catch (error) {
    console.error("[proxy] Error:", error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|images|icon|api|sitemap\\.xml|robots\\.txt|llms\\.txt|llms-full\\.txt|agents\\.md|BingSiteAuth\\.xml).*)",
  ],
};
