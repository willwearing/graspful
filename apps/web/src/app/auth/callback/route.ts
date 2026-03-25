import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { getServerPostHog } from "@/lib/posthog/server";
import { resolveBrand } from "@/lib/brand/resolve";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const rawRedirect = searchParams.get("redirect") || "/dashboard";
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
      // Provision personal org + join the brand's org
      const token = data?.session?.access_token;
      if (token) {
        const hostname = request.headers.get("host") || "localhost";
        const cookieHeader = request.headers.get("cookie");
        const brand = await resolveBrand(hostname, cookieHeader);
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000/api/v1";
        // Create personal org if first time (idempotent)
        try {
          await fetch(`${backendUrl}/auth/provision`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch {
          // Non-fatal
        }
        // Join the brand's org for content access
        try {
          await fetch(`${backendUrl}/orgs/${brand.orgSlug}/join`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch {
          // Non-fatal: membership may already exist or backend may be down
        }
      }

      return NextResponse.redirect(new URL(redirect, origin));
    }
  }

  // Auth error -- redirect to sign-in
  return NextResponse.redirect(new URL("/sign-in", origin));
}
