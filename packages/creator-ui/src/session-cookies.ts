import "server-only";
import type { CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

interface CookieWrite {
  name: string;
  value: string;
  options?: CookieOptions;
}

/** Keep server-render credentials and browser cookies in sync across auth refreshes. */
export function createSessionCookieAdapter(request: NextRequest) {
  let response = NextResponse.next({ request });

  return {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieWrite[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        const previousCookies = response.cookies.getAll();
        response = NextResponse.next({ request });
        previousCookies.forEach((cookie) => response.cookies.set(cookie));
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
    get response() {
      return response;
    },
    redirect(url: URL) {
      const redirectResponse = NextResponse.redirect(url);
      response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
      return redirectResponse;
    },
  };
}
