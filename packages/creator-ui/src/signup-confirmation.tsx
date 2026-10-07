"use client";

import { useEffect, useState } from "react";
import { Button } from "./ui/button";

interface SignupConfirmationProps {
  email: string;
  signInHref: string;
  resetPasswordHref: string;
  onResend: () => Promise<void>;
}

/** Supabase also returns success for existing accounts, without sending email. */
export function SignupConfirmation({ email, signInHref, resetPasswordHref, onResend }: SignupConfirmationProps) {
  const [sending, setSending] = useState(false);
  const [retryAt, setRetryAt] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!retryAt) return;
    const timeout = window.setTimeout(() => setRetryAt(0), Math.max(0, retryAt - Date.now()));
    return () => window.clearTimeout(timeout);
  }, [retryAt]);

  async function resend() {
    if (sending || retryAt > Date.now()) return;
    setSending(true);
    setError(null);
    setStatus(null);
    try {
      await onResend();
      setStatus("If your account needs confirmation, a new link has been requested. Check your inbox and spam folder.");
      setRetryAt(Date.now() + 60_000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not request a new link. Try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4 text-center">
      <p className="text-sm text-muted-foreground">
        If your account needs confirmation, check <strong>{email}</strong> for a link. Check your spam folder too.
      </p>
      <p className="text-sm text-muted-foreground">
        Already signed up? Sign in with your existing password, or reset it below.
      </p>
      <div className="flex flex-col gap-3">
        <a href={signInHref} className="text-sm font-medium text-primary hover:underline">Back to sign in</a>
        <a href={resetPasswordHref} className="text-sm font-medium text-primary hover:underline">Reset password</a>
        <Button type="button" variant="outline" disabled={sending || retryAt > 0} onClick={resend}>
          {sending ? "Requesting..." : retryAt > 0 ? "Wait 60 seconds before requesting again" : "Resend confirmation link"}
        </Button>
      </div>
      {status && <p role="status" className="text-sm text-muted-foreground">{status}</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
