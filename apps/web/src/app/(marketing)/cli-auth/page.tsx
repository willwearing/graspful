"use client";

import { useCallback, useEffect, useState } from "react";
import { cliAuthConfirmationCode } from "@graspful/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { apiClientFetch } from "@/lib/api-client";
import { resetPostHog } from "@/lib/posthog/events";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";

type CliAuthState = "checking" | "redirecting" | "confirm" | "authorizing" | "done" | "error";
const CLI_SIGN_UP_COMPLETE_PARAM = "cli-sign-up-complete";

function getHashToken(): string | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  return new URLSearchParams(hash).get("token");
}

function buildRedirectTarget(currentUrl: URL, mode: "sign-in" | "sign-up") {
  const redirectUrl = new URL(currentUrl.toString());
  if (mode === "sign-up") {
    redirectUrl.searchParams.set(CLI_SIGN_UP_COMPLETE_PARAM, "1");
  }
  return `${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`;
}

export default function CliAuthPage() {
  const router = useRouter();
  const [state, setState] = useState<CliAuthState>("checking");
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [pending, setPending] = useState<{ token: string; accessToken: string; code: string } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function completeCliAuth() {
      if (typeof window === "undefined") return;

      const currentUrl = new URL(window.location.href);
      const nextMode = currentUrl.searchParams.get("mode") === "sign-up" ? "sign-up" : "sign-in";
      const nextEmail = currentUrl.searchParams.get("email") ?? "";
      const redirectTarget = buildRedirectTarget(currentUrl, nextMode);
      const signUpComplete = currentUrl.searchParams.get(CLI_SIGN_UP_COMPLETE_PARAM) === "1";

      if (!cancelled) {
        setMode(nextMode);
      }

      const token = getHashToken();
      if (!token) {
        setState("error");
        setError("Missing CLI auth token. Start the flow again from your terminal.");
        return;
      }

      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;

      if (!accessToken || (nextMode === "sign-up" && !signUpComplete)) {
        if (cancelled) return;
        setState("redirecting");
        if (accessToken && nextMode === "sign-up") {
          try {
            await supabase.auth.signOut();
            resetPostHog();
          } catch {
            // Fall through to sign-up even if sign-out fails.
          }
        }
        const authPath = nextMode === "sign-up" ? "/sign-up" : "/sign-in";
        const redirectParams = new URLSearchParams();
        redirectParams.set("redirect", redirectTarget);
        if (nextEmail) {
          redirectParams.set("email", nextEmail);
        }
        router.replace(`${authPath}?${redirectParams.toString()}`);
        return;
      }

      // Never authorize on page load: a link from someone else would hand
      // them an API key for this account. The user must approve explicitly.
      const code = await cliAuthConfirmationCode(token);
      if (cancelled) return;
      setPending({ token, accessToken, code });
      setState("confirm");
    }

    completeCliAuth();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const approve = useCallback(async () => {
    if (!pending) return;
    setState("authorizing");
    try {
      await apiClientFetch<{ authorized: true; orgSlug: string }>(
        "/auth/cli/sessions/authorize",
        pending.accessToken,
        {
          method: "POST",
          body: JSON.stringify({ token: pending.token }),
        }
      );
      setState("done");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Could not complete CLI authentication.");
    }
  }, [pending]);

  const title = state === "done"
    ? "CLI authentication complete"
    : mode === "sign-up"
      ? "Finish sign-up"
      : "Finish sign-in";

  const description = (() => {
    switch (state) {
      case "checking":
        return "Checking your browser session.";
      case "redirecting":
        return "Redirecting you to the right auth screen.";
      case "confirm":
        return "Approve this terminal to issue it an API key for your account.";
      case "authorizing":
        return "Issuing your CLI API key.";
      case "done":
        return "Return to your terminal. The CLI will finish automatically.";
      case "error":
        return error ?? "This auth handoff could not be completed.";
    }
  })();

  return (
    <div className="flex min-h-[calc(100vh-73px)] items-center justify-center px-4 py-12">
        <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <h1 className="text-2xl font-medium tracking-tight text-foreground">{title}</h1>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            This browser step is where email verification and any future MFA
            challenge happen. The terminal only receives an API key after this
            session is fully authenticated.
          </p>

          {state === "confirm" && pending ? (
            <div className="space-y-3 rounded-lg border border-border px-4 py-3">
              <p>
                Only approve if you just ran{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                  graspful {mode === "sign-up" ? "register" : "login"}
                </code>{" "}
                yourself and your terminal shows this code:
              </p>
              <p className="text-center font-mono text-2xl tracking-widest text-foreground">
                {pending.code}
              </p>
              <p>If you did not start this, close the tab. Nothing is issued until you approve.</p>
              <Button className="w-full" onClick={approve}>
                Approve terminal
              </Button>
            </div>
          ) : null}

          {state === "done" ? (
            <p className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-foreground">
              You can close this tab now.
            </p>
          ) : null}

          {state === "error" ? (
            <div className="space-y-3 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
              <p className="text-destructive">{error}</p>
              <p>
                Restart the flow from your terminal with{" "}
                <code className="rounded bg-background px-1.5 py-0.5 font-mono text-xs">
                  graspful {mode === "sign-up" ? "register" : "login"}
                </code>
                .
              </p>
            </div>
          ) : null}

          <p>
            Prefer the web UI instead? Visit{" "}
            <Link href="/creator/api-keys" className="text-primary hover:underline">
              Creator API Keys
            </Link>{" "}
            after signing in.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
