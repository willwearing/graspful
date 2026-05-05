import { createServerClient } from "@supabase/ssr";
import { type EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { emitServerLog, flushServerLogsAfterResponse } from "@/lib/posthog/server-logs";
import { getDefaultAuthRedirectPath, getHostSurface, getRequestHost } from "@/lib/hosts";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const surface = getHostSurface(getRequestHost(request.headers));
  const fallbackPath = getDefaultAuthRedirectPath(surface);
  const rawNext = searchParams.get("next") ?? fallbackPath;
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//")
      ? rawNext
      : fallbackPath;
  const cookiesToSet: Array<{
    name: string;
    value: string;
    options?: Parameters<NextResponse["cookies"]["set"]>[2];
  }> = [];

  if (tokenHash && type) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(nextCookies) {
            cookiesToSet.push(...nextCookies);
          },
        },
      },
    );
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (!error) {
      const response = NextResponse.redirect(new URL(next, origin));
      for (const cookie of cookiesToSet) {
        response.cookies.set(cookie.name, cookie.value, cookie.options);
      }
      return response;
    }

    emitServerLog("auth", "WARN", "Auth confirmation token verification failed", {
      "error.message": error.message,
      "auth.next": next,
      "auth.otp_type": type,
    });
    flushServerLogsAfterResponse();
  } else {
    emitServerLog("auth", "WARN", "Auth confirmation missing token parameters", {
      "auth.next": next,
      "auth.has_token_hash": Boolean(tokenHash),
      "auth.has_type": Boolean(type),
    });
    flushServerLogsAfterResponse();
  }

  // Verification failed — redirect to sign-in with error context
  const response = NextResponse.redirect(
    new URL("/sign-in?reason=invalid_reset_link", origin)
  );
  for (const cookie of cookiesToSet) {
    response.cookies.set(cookie.name, cookie.value, cookie.options);
  }
  return response;
}
