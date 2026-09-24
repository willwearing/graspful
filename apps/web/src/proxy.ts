import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { resolveBrand } from "@/lib/brand/resolve";
import { decideRoute, getHostSurface, getRequestHost } from "@/lib/hosts";

export async function proxy(request: NextRequest) {
  try {
    const hostname = getRequestHost(request.headers);
    const surface = getHostSurface(hostname);
    const cookieHeader = request.headers.get("cookie");

    const brandId = surface === "local" ? (await resolveBrand(hostname, cookieHeader)).id : undefined;
    let response = NextResponse.next({ request });

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
          response = NextResponse.next({ request });
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
      brandId,
      currentUrl: request.nextUrl,
      surface,
    });
    if (decision.action === "redirect") {
      const redirectResponse = NextResponse.redirect(new URL(decision.to, request.url));
      response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
      return redirectResponse;
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
