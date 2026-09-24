import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { createSessionCookieAdapter } from "@graspful/creator-ui/session-cookies";

export async function middleware(request: NextRequest) {
  const sessionCookies = createSessionCookieAdapter(request);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: sessionCookies.cookies }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const redirectUrl = new URL("/sign-in", request.url);
    redirectUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return sessionCookies.redirect(redirectUrl);
  }

  return sessionCookies.response;
}

export const config = {
  matcher: ["/creator", "/creator/:path*"],
};
