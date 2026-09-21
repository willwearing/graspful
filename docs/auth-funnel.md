# Auth funnel measurement

Both auth modes emit `sign_in_*` or `sign_up_*` events with `method: email` and `brand_id`:

- `viewed`: one event per form mount, deduplicated across React StrictMode effects.
- `started`: the first email or password edit.
- `submitted`: a locally valid submission sent to Supabase, including retries.
- `failed`: a failed attempt, with `failure_stage` set to `validation` or `authentication`.

Existing `sign_in` and `sign_up` events record successful authentication. Email-confirmation signups complete later through the auth callback. Submitted signup forms without a session remain on the confirmation screen.

To measure drop-off, build a session funnel from `sign_in_viewed` to `sign_in_submitted` to `sign_in`, filtered to the academy hostname. Use the same sequence for signup with an appropriate confirmation window. Break failures down by `failure_stage`. A missing completion is a funnel observation, not proof that authentication is broken. Compare replays and failures before diagnosing a cause.

The custom event properties contain no typed email, password, access token, or raw provider error. Browser exit events are not used to infer abandonment because tab switches, reloads, and delayed email confirmation can produce false positives.

The branded enrollment CTA and redirect-preserving switch to signup shipped in commit `378d1d1`. This change completes the measurement gap in [the branded sign-in report](https://us.posthog.com/project/345138/inbox/reports/019ebaca-add8-730e-b1c3-222754a5eb6a).
