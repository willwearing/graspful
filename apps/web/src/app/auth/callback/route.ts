import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { getServerPostHog } from "@/lib/posthog/server";
import { emitServerLog, flushServerLogsAfterResponse } from "@/lib/posthog/server-logs";
import { getDefaultAuthRedirectPath, getHostSurface, getRequestHost } from "@/lib/hosts";
import { resolveBrand } from "@/lib/brand/resolve";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const hostname = getRequestHost(request.headers);
  const surface = getHostSurface(hostname);
  const rawRedirect =
    searchParams.get("redirect") || getDefaultAuthRedirectPath(surface);
  // Prevent open redirect: must be a relative path, not protocol-relative
  const redirect =
    rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
      ? rawRedirect
      : "/dashboard";

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignored in route handler
            }
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Fire sign_up event for email-confirmation flow
      const user = data?.session?.user;
      if (user) {
        const ph = getServerPostHog();
        if (ph) {
          ph.capture({
            distinctId: user.id,
            event: "sign_up",
            properties: { method: "email" },
          });
          await ph.shutdown();
        }
      }
      // Provision the user's personal org and auto-join the brand's org
      // so the learner can browse academies on this branded site.
      const token = data?.session?.access_token;
      if (token) {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000/api/v1";
        try {
          const brand = await resolveBrand(hostname, request.headers.get("cookie"));
          const provisionResponse = await fetch(`${backendUrl}/auth/provision`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ brandOrgSlug: brand.orgSlug }),
          });
          if (!provisionResponse.ok) {
            emitServerLog(
              "auth",
              "WARN",
              "Auth callback provisioning request failed",
              {
                "http.status_code": provisionResponse.status,
                "brand.org_slug": brand.orgSlug,
                "auth.redirect": redirect,
              },
            );
            flushServerLogsAfterResponse();
          }
        } catch (provisionError) {
          emitServerLog(
            "auth",
            "ERROR",
            "Auth callback provisioning threw",
            {
              "error.message":
                provisionError instanceof Error
                  ? provisionError.message
                  : "Unknown provisioning error",
              "auth.redirect": redirect,
            },
          );
          flushServerLogsAfterResponse();
        }
      }

      return NextResponse.redirect(new URL(redirect, origin));
    }

    emitServerLog("auth", "WARN", "Auth callback code exchange failed", {
      "error.message": error.message,
      "auth.redirect": redirect,
    });
    flushServerLogsAfterResponse();
  }

  if (!code) {
    emitServerLog("auth", "WARN", "Auth callback missing code", {
      "auth.redirect": redirect,
    });
    flushServerLogsAfterResponse();
  }

  // Auth error -- redirect to sign-in
  return NextResponse.redirect(new URL("/sign-in", origin));
}
