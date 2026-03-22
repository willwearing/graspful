# Backend Logging Plan

## Goal

Make backend logs consistently useful for debugging and operations without turning request logging into a privacy risk or a noise source.

The target state is:

- consistent structured logs across Nest, app code, and OpenTelemetry
- request-scoped correlation IDs so one interaction can be traced end-to-end
- selective request body capture, not blanket body logging
- better domain logs around diagnostics, assessment, billing, audio generation, auth, and content import
- explicit redaction and field allowlists for anything sensitive

## Current-State Review

### What exists now

- Global request logging via [`backend/src/telemetry/logging.interceptor.ts`](/Users/will/github/graspful/backend/src/telemetry/logging.interceptor.ts#L11)
- Global 5xx exception logging via [`backend/src/telemetry/exception.filter.ts`](/Users/will/github/graspful/backend/src/telemetry/exception.filter.ts#L11)
- OpenTelemetry export to PostHog via [`backend/src/telemetry/otel-logger.ts`](/Users/will/github/graspful/backend/src/telemetry/otel-logger.ts#L9)
- A few domain logs in assessment, diagnostic, learning-engine, student-model, Stripe webhook, TTS, and audio generation

### Main gaps

1. Request logs are too thin.
Current request logs only capture method, URL, status, duration, and optional user ID in [`backend/src/telemetry/logging.interceptor.ts`](/Users/will/github/graspful/backend/src/telemetry/logging.interceptor.ts#L14). They do not include request ID, route template, org ID, course ID, body size, client address, user agent, or a body policy.

2. Logging is inconsistent across the codebase.
You currently mix `console.log`, Nest `Logger`, and OTel `logger.emit()` in different places, for example [`backend/src/main.ts`](/Users/will/github/graspful/backend/src/main.ts#L44), [`backend/src/audio-generation/audio-generation.service.ts`](/Users/will/github/graspful/backend/src/audio-generation/audio-generation.service.ts#L18), and [`backend/src/assessment/problem-submission.service.ts`](/Users/will/github/graspful/backend/src/assessment/problem-submission.service.ts#L150). That makes querying and filtering harder.

3. Exception logs lack request context.
The exception filter logs 5xx errors, but it does not attach route, request ID, org ID, user ID, or sanitized request metadata in [`backend/src/telemetry/exception.filter.ts`](/Users/will/github/graspful/backend/src/telemetry/exception.filter.ts#L14).

4. There is no explicit policy for bodies.
Bodies are not logged now, which is safer, but there is no mechanism to capture them selectively on routes where they would materially help debugging.

5. Important workflows are under-instrumented.
Several high-value flows do real work with little or no structured logging:
- billing lifecycle in [`backend/src/billing/billing.service.ts`](/Users/will/github/graspful/backend/src/billing/billing.service.ts#L28)
- org join in [`backend/src/auth/org-join.controller.ts`](/Users/will/github/graspful/backend/src/auth/org-join.controller.ts#L22)
- course import in [`backend/src/knowledge-graph/course-importer.service.ts`](/Users/will/github/graspful/backend/src/knowledge-graph/course-importer.service.ts#L30)
- audio batch lifecycle in [`backend/src/audio-generation/audio-generation.service.ts`](/Users/will/github/graspful/backend/src/audio-generation/audio-generation.service.ts#L147)
- diagnostic resume/abandon/finish branches in [`backend/src/diagnostic/diagnostic-session.service.ts`](/Users/will/github/graspful/backend/src/diagnostic/diagnostic-session.service.ts#L57)
- study-session generation path in [`backend/src/learning-engine/learning-engine.service.ts`](/Users/will/github/graspful/backend/src/learning-engine/learning-engine.service.ts#L66)

### Specific review notes

- [`backend/src/telemetry/logging.interceptor.ts`](/Users/will/github/graspful/backend/src/telemetry/logging.interceptor.ts#L17) logs `url` instead of low-cardinality route templates, which will fragment queries.
- [`backend/src/telemetry/logging.interceptor.ts`](/Users/will/github/graspful/backend/src/telemetry/logging.interceptor.ts#L29) writes directly to console in addition to emitting OTel records, which creates duplicated pathways and inconsistent formatting.
- [`backend/src/telemetry/exception.filter.ts`](/Users/will/github/graspful/backend/src/telemetry/exception.filter.ts#L26) intentionally ignores 4xx. That is reasonable for noisy generic 4xx, but you still want selected 4xx events logged when they indicate business or integration issues.
- [`backend/src/billing/stripe-webhook.controller.ts`](/Users/will/github/graspful/backend/src/billing/stripe-webhook.controller.ts#L23) logs event type, but not event ID, org ID, request ID, signature verification result, or processing outcome.
- [`backend/src/assessment/assessment.controller.ts`](/Users/will/github/graspful/backend/src/assessment/assessment.controller.ts#L25) and [`backend/src/diagnostic/diagnostic.controller.ts`](/Users/will/github/graspful/backend/src/diagnostic/diagnostic.controller.ts#L26) are good candidates for selective body summaries because answer payloads sometimes matter during evaluator debugging, but full bodies should not be globally logged.
- [`backend/src/knowledge-graph/knowledge-graph.controller.ts`](/Users/will/github/graspful/backend/src/knowledge-graph/knowledge-graph.controller.ts#L110) accepts large YAML bodies with no request-level import logging. This is exactly the kind of route where body size, hash, and top-level summary are useful, while the full payload should stay out of normal logs.

## Research Summary

### Practical guidance to follow

- OWASP says logging should be proportional to risk and avoid "alarm fog", and that logs should record enough context for "when, where, who and what." It also recommends an interaction identifier and explicitly says sensitive values should be removed, masked, sanitized, hashed, or encrypted rather than logged directly. Source: OWASP Logging Cheat Sheet  
  https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html

- OWASP also calls out the kinds of events that should be logged, including input validation failures, auth outcomes, access-control failures, application errors, startup/shutdown, higher-risk functionality, data import/export, and suspicious business logic activity. Source: OWASP Logging Cheat Sheet  
  https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html

- OpenTelemetry HTTP semantic conventions recommend stable HTTP attributes like method, route, status code, client address, server address, user agent, and make request/response body size and headers opt-in rather than default. That aligns well with selective body logging instead of blanket capture. Source: OpenTelemetry HTTP semantic conventions  
  https://opentelemetry.io/docs/specs/semconv/http/http-spans/

- Nest’s logger docs recommend consistent application logging through Nest’s logger abstraction and support JSON output plus a custom logger wired with `app.useLogger(...)` so framework logs and application logs share the same pipeline. Source: NestJS Logger docs  
  https://docs.nestjs.com/techniques/logger

- NIST SP 800-92 emphasizes that log management should be deliberate and organization-wide, not ad hoc, and should cover development, implementation, and maintenance of effective log practices. Source: NIST SP 800-92  
  https://csrc.nist.gov/pubs/sp/800/92/final

### Inference from sources

Based on OWASP and OpenTelemetry guidance, the right policy for this backend is:

- do not log request bodies by default
- log route metadata and body size by default
- only log sanitized body extracts on routes that are explicitly marked as useful for debugging
- keep full payload logging behind a short-lived debug mode and still redact secrets

## Proposed Logging Strategy

### 1. Standardize on one structured logging path

Use a single app logger abstraction that:

- writes structured JSON locally in development and production
- forwards structured records to OTel/PostHog when configured
- can be injected everywhere Nest currently uses `Logger`
- carries a consistent field schema

Practical direction:

- add a small `AppLogger` service/module
- wire it into Nest bootstrap with `bufferLogs: true` and `app.useLogger(app.get(AppLogger))`
- have `AppLogger` bridge to console and OTel instead of calling `console.log` in interceptors/services

### 2. Add request-scoped context

Every request log should include:

- `request.id`
- `http.method`
- `http.route`
- `http.status_code`
- `http.duration_ms`
- `user.id` when authenticated
- `org.id` when available
- `course.id` when available
- `client.address`
- `user_agent.original`

The `request.id` should come from `x-request-id` if present, otherwise generated on ingress.

### 3. Separate body policy from request logging

Default request logging should capture:

- route template
- query keys only, not full query values unless allowlisted
- request body size
- content type
- selected route params

Optional body handling modes:

- `none`: no body content, only metadata
- `summary`: log a safe summary such as keys present, array lengths, hash, answer type, YAML hash, truncated preview
- `sanitized`: log allowlisted fields after redaction
- `debug_full`: temporary local-only mode for explicit routes, still redacting known secret patterns

### 4. Introduce route-level metadata for body logging

Add a decorator such as `@LogBody({ mode: 'summary', fields: [...] })` and have the interceptor read it via Nest metadata.

Suggested default modes:

- general CRUD / list / read routes: `none`
- answer submission routes: `summary`
- admin import / generation routes: `summary` or `sanitized`
- Stripe webhook: `none`

### 5. Distinguish request logs from domain event logs

Request logs tell you what hit the server.
Domain logs tell you what the system decided and changed.

You want both.

Examples:

- request log: `POST /diagnostic/answer 200 42ms`
- domain log: `diagnostic.answer.processed` with correctness, concept ID, pL delta, stop decision, next concept

### 6. Log outcomes at state transition points

Add domain logs where durable state changes happen:

- session created/resumed/abandoned/completed
- enrollment or membership created
- billing subscription state changed
- audio generation job queued/started/progress/completed/failed
- course import validated/started/completed/failed
- mastery state or remediation state changed

### 7. Keep severity meaningful

- `INFO`: normal state transitions and successful control points
- `WARN`: validation anomalies, retries, partial failures, suspicious business situations, important 4xx cases
- `ERROR`: failed workflows, integration failures, 5xx, data consistency problems
- `DEBUG`: temporary high-detail payload logging and diagnostic internals

## Request Body Policy

### Default policy

Do not log full request bodies by default.

Always log instead:

- `http.request.body.size`
- `http.request.content_type`
- `request.body_keys`

### Routes where body summaries are useful

1. Assessment answer submission
Files:
- [`backend/src/assessment/assessment.controller.ts`](/Users/will/github/graspful/backend/src/assessment/assessment.controller.ts#L25)
- [`backend/src/assessment/problem-submission.service.ts`](/Users/will/github/graspful/backend/src/assessment/problem-submission.service.ts#L42)

Recommended logged summary:

- `problem.id`
- `activity.type`
- `response_time_ms`
- `answer.kind`
- `answer.choice_count` or `answer.scalar_length`
- optional hashed answer value for correlation during debugging

Do not log:

- the exact answer by default

2. Diagnostic answer submission
Files:
- [`backend/src/diagnostic/diagnostic.controller.ts`](/Users/will/github/graspful/backend/src/diagnostic/diagnostic.controller.ts#L26)
- [`backend/src/diagnostic/diagnostic-session.service.ts`](/Users/will/github/graspful/backend/src/diagnostic/diagnostic-session.service.ts#L190)

Recommended logged summary:

- `session.id`
- `response_time_ms`
- `answer.kind`
- `answer.is_i_dont_know`

3. Course import
Files:
- [`backend/src/knowledge-graph/knowledge-graph.controller.ts`](/Users/will/github/graspful/backend/src/knowledge-graph/knowledge-graph.controller.ts#L110)
- [`backend/src/knowledge-graph/course-importer.service.ts`](/Users/will/github/graspful/backend/src/knowledge-graph/course-importer.service.ts#L30)

Recommended logged summary:

- YAML byte length
- YAML hash
- top-level counts after parse: sections, concepts, knowledge points, problems
- `replace` mode

Do not log:

- the raw YAML body in standard logs

4. Audio generation kickoff
Files:
- [`backend/src/audio-generation/audio-generation.controller.ts`](/Users/will/github/graspful/backend/src/audio-generation/audio-generation.controller.ts#L17)
- [`backend/src/audio-generation/audio-generation.service.ts`](/Users/will/github/graspful/backend/src/audio-generation/audio-generation.service.ts#L147)

Recommended logged summary:

- voice list
- exam ID
- concurrency
- job ID

5. Stripe webhook
File:
- [`backend/src/billing/stripe-webhook.controller.ts`](/Users/will/github/graspful/backend/src/billing/stripe-webhook.controller.ts#L11)

Recommended policy:

- no request body logging
- log event ID, event type, signature verification success/failure, and resulting subscription transition

## Specific Places To Add Logs

### Telemetry foundation

- [`backend/src/main.ts`](/Users/will/github/graspful/backend/src/main.ts#L15)
  Add buffered custom logger bootstrap, request ID middleware, and shutdown logging.

- [`backend/src/telemetry/logging.interceptor.ts`](/Users/will/github/graspful/backend/src/telemetry/logging.interceptor.ts#L14)
  Expand request context, body policy support, route template capture, body size, user agent, org ID, and request ID.

- [`backend/src/telemetry/exception.filter.ts`](/Users/will/github/graspful/backend/src/telemetry/exception.filter.ts#L14)
  Attach request context and selected request metadata to 5xx logs. Add optional logging for selected 4xx categories.

- [`backend/src/telemetry/otel-logger.ts`](/Users/will/github/graspful/backend/src/telemetry/otel-logger.ts#L9)
  Add environment/service metadata, log level control, and a stable attribute schema.

### Assessment

- [`backend/src/assessment/assessment.controller.ts`](/Users/will/github/graspful/backend/src/assessment/assessment.controller.ts#L25)
  Mark answer endpoints with route-level body summary metadata.

- [`backend/src/assessment/problem-submission.service.ts`](/Users/will/github/graspful/backend/src/assessment/problem-submission.service.ts#L42)
  Add logs for invalid response times, missing problems, anti-gaming triggers, XP clamp behavior, and mastery transitions.

### Diagnostic

- [`backend/src/diagnostic/diagnostic-session.service.ts`](/Users/will/github/graspful/backend/src/diagnostic/diagnostic-session.service.ts#L63)
  Log session resume, stale-abandon, first concept selected, and no-problem edge cases.

- [`backend/src/diagnostic/diagnostic-session.service.ts`](/Users/will/github/graspful/backend/src/diagnostic/diagnostic-session.service.ts#L190)
  Add logs for answer processed, pL delta, propagated concept count, stop-decision reason, completion, and rejected session states.

### Learning engine and student model

- [`backend/src/learning-engine/learning-engine.service.ts`](/Users/will/github/graspful/backend/src/learning-engine/learning-engine.service.ts#L30)
  Log context sizes, blocked frontier count, remediation count, and why a specific task type was chosen.

- [`backend/src/learning-engine/learning-engine.service.ts`](/Users/will/github/graspful/backend/src/learning-engine/learning-engine.service.ts#L66)
  Add a corresponding study-session generation log; it is currently silent.

- [`backend/src/student-model/student-state.service.ts`](/Users/will/github/graspful/backend/src/student-model/student-state.service.ts#L70)
  Log bulk mastery and speed updates with counts and summary statistics instead of one record per concept.

### Billing

- [`backend/src/billing/stripe-webhook.controller.ts`](/Users/will/github/graspful/backend/src/billing/stripe-webhook.controller.ts#L23)
  Log webhook reception with request ID, Stripe event ID, type, and outcome.

- [`backend/src/billing/billing.service.ts`](/Users/will/github/graspful/backend/src/billing/billing.service.ts#L28)
  Add logs for customer creation, checkout creation, portal session creation, ignored webhook events, and subscription status transitions.

### Content and admin flows

- [`backend/src/knowledge-graph/course-importer.service.ts`](/Users/will/github/graspful/backend/src/knowledge-graph/course-importer.service.ts#L30)
  Log import validation summary, import start, replace delete, created counts, warnings, and import completion/failure.

- [`backend/src/audio-generation/audio-generation.service.ts`](/Users/will/github/graspful/backend/src/audio-generation/audio-generation.service.ts#L147)
  Add job queued, job start, pending count, periodic progress, completion summary, and failure classification logs.

- [`backend/src/auth/org-join.controller.ts`](/Users/will/github/graspful/backend/src/auth/org-join.controller.ts#L22)
  Log org join success, org-not-found attempts, and idempotent rejoin cases.

## Proposed Implementation Plan

### Phase 1: Logging foundation

1. Add a `LoggerModule` and `AppLogger` abstraction.
2. Make Nest use the same logger for framework and app logs.
3. Add request ID middleware and request context attachment.
4. Update the global interceptor to emit stable structured request records.
5. Update the exception filter to attach request context.

### Phase 2: Body policy and redaction

1. Add a route-level metadata decorator for logging body policy.
2. Add a redaction utility with:
   - key-based redaction for known sensitive fields
   - token/secret pattern redaction
   - truncation limits
   - object depth limits
3. Log body size everywhere.
4. Enable body summaries only for allowlisted routes.

### Phase 3: Domain workflow logging

1. Add structured domain logs to assessment and diagnostic workflows.
2. Add billing lifecycle logs.
3. Add audio generation lifecycle logs.
4. Add course import logs.
5. Add auth/org join logs.
6. Add learning-engine decision logs.

### Phase 4: Verification and tuning

1. Add tests for redaction and body-policy behavior.
2. Add tests for request ID propagation.
3. Review local log volume in dev.
4. Review PostHog log volume and cardinality.
5. Tune severity levels and sampling.

## TDD Task Breakdown

1. Create an `AppLogger` service and swap bootstrap to `app.useLogger(...)`.
2. Add request ID middleware and request context typing.
3. Refactor the global interceptor to structured JSON output plus OTel attributes.
4. Add `@LogBody()` metadata support and a safe body summarizer.
5. Add redaction utilities with unit tests.
6. Add exception-filter request context enrichment.
7. Instrument assessment endpoints and service transitions.
8. Instrument diagnostic controller/service transitions.
9. Instrument billing controller/service transitions.
10. Instrument audio-generation job lifecycle.
11. Instrument course import validation and execution.
12. Instrument org-join and selected learning-engine flows.
13. Add docs for supported log fields, redaction, and temporary debug mode.

## Open Decisions For Your Feedback

1. For answer submission routes, do you want the exact submitted answer to ever appear in logs, or only a hash/summary by default?
2. Do you want a temporary `LOG_DEBUG_BODIES=true` mode for local debugging only?
3. For query strings, should we default to logging only parameter names unless a route explicitly allowlists values?
4. Do you want billing and auth events to include user email when available, or should logs stay on internal IDs only?
5. Do you want all logs to remain in PostHog via OTel, or should the long-term plan also support a dedicated JSON logger sink locally?

## Recommended Initial Default

If I were setting the defaults now, I would choose:

- no full request bodies in normal logs
- request ID everywhere
- body size and body keys everywhere
- body summaries only for assessment, diagnostic, course import, and audio-generation kickoff
- no webhook body logging
- IDs over emails by default
- consistent structured JSON logs through one logger abstraction

