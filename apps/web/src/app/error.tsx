"use client";

import { useEffect } from "react";
import { captureError } from "@/lib/posthog/events";
import { initPostHog } from "@/lib/posthog/client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    initPostHog();
    captureError(error, "nextjs-app-error", { digest: error.digest });
  }, [error]);

  return (
    <main className="flex min-h-[60vh] items-center justify-center px-6 py-16">
      <section className="max-w-md space-y-4 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">
          Something went wrong.
        </h2>
        <p className="text-muted-foreground">
          We logged the error. Try again in a moment.
        </p>
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
