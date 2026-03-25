import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { resolveBrand } from "@/lib/brand/resolve";

const PUBLIC_ROUTES = ["/", "/sign-in", "/sign-up", "/auth/callback", "/auth/confirm", "/forgot-password", "/reset-password", "/pricing", "/agents", "/docs"];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export async function middleware(request: NextRequest) {
  try {
    const hostname = request.headers.get("host") || "localhost";
    const cookieHeader = request.headers.get("cookie");

    // 1. Resolve brand (passes cookies for dev-brand-override support)
    const brand = await resolveBrand(hostname, cookieHeader);

    // 2. Create response with brand headers
    let response = NextResponse.next({ request });
    response.headers.set("x-brand-id", brand.id);
    response.cookies.set("brand-id", brand.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    // 3. Supabase auth session refresh
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      // Supabase not configured — skip auth, serve public
      return response;
    }

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          response.headers.set("x-brand-id", brand.id);
          response.cookies.set("brand-id", brand.id, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const pathname = request.nextUrl.pathname;

    // 4. Redirect unauthenticated users away from protected routes
    if (!user && !isPublicRoute(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/sign-in";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    // 5. Redirect authenticated users from landing and auth pages.
    //    Only the "graspful" brand (graspful.com) gets the creator dashboard.
    //    Auto-created brands are student-facing and go to /dashboard.
    const AUTH_PAGES = ["/", "/sign-in", "/sign-up"];
    if (user && AUTH_PAGES.includes(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = brand.id === "graspful" ? "/creator" : "/dashboard";
      return NextResponse.redirect(url);
    }

    // 6. Redirect graspful brand away from student dashboard to creator dashboard,
    //    and non-graspful brands away from creator pages to student dashboard.
    if (user) {
      const isGraspful = brand.id === "graspful";
      if (isGraspful && pathname === "/dashboard") {
        const url = request.nextUrl.clone();
        url.pathname = "/creator";
        return NextResponse.redirect(url);
      }
      if (!isGraspful && pathname.startsWith("/creator")) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }
    }

    return response;
  } catch (error) {
    console.error("[middleware] Error:", error);
    // Don't crash — serve the page without auth/brand
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|images|icon|api|sitemap\\.xml|robots\\.txt|llms\\.txt|llms-full\\.txt|agents\\.md).*)",
  ],
};
