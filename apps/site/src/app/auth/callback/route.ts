import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const rawRedirect = searchParams.get("redirect") || "/creator";
  const redirect =
    rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
      ? rawRedirect
      : "/creator";

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
            } catch {}
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const token = data?.session?.access_token;
      if (token) {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000/api/v1";
        try {
          await fetch(`${backendUrl}/auth/provision`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch {}
        try {
          await fetch(`${backendUrl}/orgs/graspful/join`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch {}
      }

      return NextResponse.redirect(new URL(redirect, origin));
    }
  }

  return NextResponse.redirect(new URL("/sign-in", origin));
}
