import { createServerClient } from "@supabase/ssr";
import { createSessionCookieAdapter } from "@graspful/creator-ui/session-cookies";
import { NextResponse, type NextRequest } from "next/server";
import { resolveBrand } from "@/lib/brand/resolve";
import {
  decideRoute,
  getHostSurface,
  getRequestHost,
  routeNeedsSession,
  type RoutingContext,
} from "@/lib/hosts";

export async function proxy(request: NextRequest) {
  try {
    const hostname = getRequestHost(request.headers);
    const surface = getHostSurface(hostname);
    const cookieHeader = request.headers.get("cookie");
    const pathname = request.nextUrl.pathname;

    const brandId = surface === "local" ? (await resolveBrand(hostname, cookieHeader)).id : undefined;
    const routing: RoutingContext = { brandId, currentUrl: request.nextUrl, surface };

    if (!routeNeedsSession(pathname, routing)) {
      const decision = decideRoute(pathname, false, routing);
      return decision.action === "redirect"
        ? NextResponse.redirect(new URL(decision.to, request.url))
        : NextResponse.next();
    }

    const sessionCookies = createSessionCookieAdapter(request);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return sessionCookies.response;
    }

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: sessionCookies.cookies,
    });

    // getClaims verifies the JWT against the project's cached signing keys,
    // and refreshes an expired session, without a round trip to Supabase Auth.
    const { data } = await supabase.auth.getClaims();
    const signedIn = Boolean(data?.claims?.sub);

    const decision = decideRoute(pathname, signedIn, routing);
    if (decision.action === "redirect") {
      return sessionCookies.redirect(new URL(decision.to, request.url));
    }

    return sessionCookies.response;
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
