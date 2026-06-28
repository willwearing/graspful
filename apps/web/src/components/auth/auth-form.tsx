"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useBrand } from "@/lib/brand/context";
import { useHostSurface } from "@/lib/host-context";
import { getDefaultAuthRedirectPath } from "@/lib/hosts";
import { trackSignUp, trackSignIn } from "@/lib/posthog/events";
import { apiClientFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AuthFormProps {
  mode: "sign-in" | "sign-up";
}

function buildAuthHref(path: "/sign-in" | "/sign-up", redirectTo: string, email: string) {
  const params = new URLSearchParams({ redirect: redirectTo });
  const trimmedEmail = email.trim();

  if (trimmedEmail) {
    params.set("email", trimmedEmail);
  }

  return `${path}?${params.toString()}`;
}

function getFormValidationError(email: string, password: string, isSignIn: boolean) {
  const trimmedEmail = email.trim();

  if (!trimmedEmail || !password) {
    return isSignIn
      ? "Enter your email and password to sign in, or create an account if you're new."
      : "Enter your email and a password to create your account.";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return "Enter a valid email address.";
  }

  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }

  return null;
}

export function AuthForm({ mode }: AuthFormProps) {
  const brand = useBrand();
  const hostSurface = useHostSurface();
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");
  const presetEmail = searchParams.get("email") || "";
  const rawRedirect =
    searchParams.get("redirect") || getDefaultAuthRedirectPath(hostSurface);
  // Prevent open redirect: must be a relative path, not protocol-relative
  const redirectTo =
    rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
      ? rawRedirect
      : "/dashboard";
  const [email, setEmail] = useState(presetEmail);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    setEmail(presetEmail);
  }, [presetEmail]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const isSignIn = mode === "sign-in";
    const validationError = getFormValidationError(email, password, isSignIn);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      if (mode === "sign-up") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`,
          },
        });
        if (error) throw error;
        if (data.session) {
          // Auto-confirm is on (dev) — redirect immediately
          trackSignUp(data.session.user.id);
          // Provision the user's personal org and join the current brand's org
          try {
            await apiClientFetch(`/auth/provision`, data.session.access_token, {
              method: "POST",
              body: JSON.stringify({ brandOrgSlug: brand.orgSlug }),
            });
          } catch {
            // Non-fatal
          }
          router.push(redirectTo);
          router.refresh();
        } else {
          // Email confirmation required (production)
          setSubmittedEmail(email.trim());
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        if (data.session) {
          trackSignIn(data.session.user.id);
        }
        // Provision the user's personal org and join the current brand's org
        if (data.session) {
          try {
            await apiClientFetch(`/auth/provision`, data.session.access_token, {
              method: "POST",
              body: JSON.stringify({ brandOrgSlug: brand.orgSlug }),
            });
          } catch {
            // Non-fatal
          }
        }
        router.push(redirectTo);
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const isSignIn = mode === "sign-in";
  const isConfirmationPending = !isSignIn && submittedEmail !== null;
  const title = isSignIn
    ? "Welcome back"
    : isConfirmationPending
      ? "Check your email"
      : "Create your account";
  const description = isSignIn
    ? `Sign in to continue studying with ${brand.name}`
    : isConfirmationPending
      ? "Check your email for a confirmation link."
      : `Start your free trial with ${brand.name}`;
  const submitText = isSignIn ? "Sign In" : "Create Account";
  const switchText = isSignIn ? "Don't have an account?" : "Already have an account?";
  const switchHref = isSignIn
    ? buildAuthHref("/sign-up", redirectTo, email)
    : buildAuthHref("/sign-in", redirectTo, email);
  const switchLabel = isSignIn ? "Sign up" : "Sign in";
  const switchButtonText = isSignIn ? "Create account instead" : "Sign in instead";

  return (
    <div className="flex min-h-[calc(100vh-73px)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          {isConfirmationPending ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                We sent a confirmation link to <strong>{submittedEmail}</strong>.
              </p>
              <Link
                href={buildAuthHref("/sign-in", redirectTo, submittedEmail)}
                className="inline-block text-sm font-medium text-primary hover:underline"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              {reason === "session_expired" && (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                  Your session expired. Sign in to pick up where you left off.
                </div>
              )}

              {reason === "invalid_reset_link" && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200">
                  That reset link is invalid or expired.{" "}
                  <Link href="/forgot-password" className="font-medium underline">
                    Request a new one
                  </Link>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-foreground mb-1.5"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-foreground mb-1.5"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="At least 8 characters"
                  />
                </div>

                {isSignIn && (
                  <div className="text-right">
                    <Link
                      href="/forgot-password"
                      className="text-sm text-muted-foreground hover:text-primary hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                )}

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}

                <div className="space-y-3">
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Loading..." : submitText}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    render={<Link href={switchHref} prefetch={false} />}
                  >
                    {switchButtonText}
                  </Button>
                </div>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                {switchText}{" "}
                <Link
                  href={switchHref}
                  className="font-medium text-primary hover:underline"
                >
                  {switchLabel}
                </Link>
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
