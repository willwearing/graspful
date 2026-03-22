import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { resolveBrand } from "@/lib/brand/resolve";

const PUBLIC_ROUTES = ["/", "/sign-in", "/sign-up", "/auth/callback", "/auth/confirm", "/forgot-password", "/reset-password", "/pricing"];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "localhost";
  const cookieHeader = request.headers.get("cookie");

  // 1. Resolve brand (passes cookies for dev-brand-override support)
  const brand = await resolveBrand(hostname, cookieHeader);

  // 2. Create response with brand headers
  let response = NextResponse.next({ request });
  response.headers.set("x-brand-id", brand.id);
  response.cookies.set("brand-id", brand.id, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  // 3. Supabase auth session refresh
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
            httpOnly: false,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

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

  // 5. Redirect authenticated users from landing and auth pages to dashboard
  const AUTH_PAGES = ["/", "/sign-in", "/sign-up"];
  if (user && AUTH_PAGES.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|images|icon|api|sitemap\\.xml|robots\\.txt|llms\\.txt).*)",
  ],
};
