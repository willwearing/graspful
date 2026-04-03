import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { resolveBrand } from "@/lib/brand/resolve";
import { decideRoute, getHostSurface, getRequestHost, isPublicRoute } from "@/lib/hosts";

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

export async function proxy(request: NextRequest) {
  try {
    const hostname = getRequestHost(request.headers);
    const surface = getHostSurface(hostname);
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

    const decision = decideRoute(request.nextUrl.pathname, !!user, {
      brandId: brand.id,
      currentUrl: request.nextUrl,
      surface,
    });
    if (decision.action === "redirect") {
      return NextResponse.redirect(new URL(decision.to, request.url));
    }

    return response;
  } catch (error) {
    console.error("[proxy] Error:", error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|images|icon|api|ingest|sitemap\\.xml|robots\\.txt|llms\\.txt|llms-full\\.txt|agents\\.md|BingSiteAuth\\.xml).*)",
  ],
};
