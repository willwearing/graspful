"use client";

import { useEffect } from "react";
import { captureError } from "@/lib/posthog/events";
import { initPostHog } from "@/lib/posthog/client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    initPostHog();
    captureError(error, "nextjs-global-error", { digest: error.digest });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className="flex min-h-screen items-center justify-center px-6 py-16">
          <section className="max-w-md space-y-4 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">
              Something went wrong.
            </h2>
            <p>
              We logged the error. Try again in a moment.
            </p>
            <button
              type="button"
              onClick={reset}
              className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            >
              Try again
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
