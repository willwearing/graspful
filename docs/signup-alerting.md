# Signup alerting

## Current state

The September 8, 2026 audit found no configured signup notifications in the Graspful PostHog project, ID `345138` (legacy project name `niche-audio-app`). There were no insight alerts, subscriptions, actions, workflows, log alerts, or event destinations. Railway and Vercel had no signup notification configuration. Supabase dashboard hooks were outside this inspection.

An email alert was enabled on September 8, 2026 for `willwearing@gmail.com`, using the verified PostHog user ID `351726`. The backend event must still be deployed before new signups can trigger it.

## Event contract

Use the backend `account_created` event for signup alerts:

- It is queued after the database transaction creates the user's first personal organization and owner membership.
- Browser signup, confirmation callbacks, and CLI browser authentication reach `POST /auth/provision`. A repeated call that finds an owned organization emits no new event.
- The development registration endpoint emits the same event after its transaction commits.
- A submitted signup form with pending email confirmation does not emit the event. An older account that has never been provisioned emits it on first successful provisioning.
- Properties include `email`, `org_id`, `org_slug`, `source`, and `environment`. The distinct ID and stable event UUID use the Supabase user ID.
- Filter alerts to `environment = production`. Do not alert on browser `sign_up` or `user provisioned`: those legacy events can include repeated sign-ins or provisioning calls.

The event uses the backend's existing `POSTHOG_API_KEY` and `POSTHOG_HOST`. Before deployment, confirm that the key belongs to project `345138` and that `NODE_ENV=production` is set on the backend. It is queued with the existing five-second flush interval. An analytics failure does not prevent account creation. This is best-effort analytics delivery; it has no database outbox or guaranteed notification delivery.

## Configured email delivery

- Recipient: `willwearing@gmail.com` (verified PostHog user `351726`).
- [Alert: New Graspful signup emails](https://us.posthog.com/project/345138/alerts?alert_type=insights&alert_id=01a0818e-9454-0000-4a3c-e9e395a41bb3), enabled.
- [Insight: New Graspful accounts by hour](https://us.posthog.com/project/345138/insights/4quIsf7z), numeric ID `11707345`.
- Event: `account_created`, with event property `environment = production`.
- Condition: count greater than zero in the preceding complete hourly bucket.
- Check cadence: hourly, including weekends, without a schedule restriction or snooze.
- Alert config: `TrendsAlertConfig`, series index `0`, `check_ongoing_interval = false`.

Emails batch the accounts in a completed hour. Checks retain their scheduled minute, so delivery can approach two hours after signup, plus processing delays. This setup does not guarantee one email per account or recovery after missed checks or late ingestion. Repeated sign-ins do not emit the source event.

The query was validated successfully with all-zero results, as expected before backend event deployment. Alert configuration and the exact subscribed email were read back after creation. Its first scheduled check at `2026-09-08T15:07:01Z` succeeded with value `0`, no error, and no notification. End-to-end inbox delivery remains to be verified after deployment; no synthetic production signup event or test email was sent.

PostHog configuration: [Alerts](https://us.posthog.com/project/345138/alerts), [Workflows](https://us.posthog.com/project/345138/workflows), [Integrations](https://us.posthog.com/project/345138/settings/environment-integrations).

PostHog documentation: [Alert notifications](https://posthog.com/docs/alerts#notifications), [Workflow channels](https://posthog.com/docs/workflows/configure-channels).

After activation, create one designated test account, confirm one event and the expected notification, then sign in again and verify no second account alert. Run this delivery test only with the intended recipient's agreement.
