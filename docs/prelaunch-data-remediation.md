# Prelaunch stored-data review

Deploying the fixed code does not recheck courses that are already published. Production brand resolution also prefers stored brand records over the updated local defaults. Complete this data review before directing customers to the app.

This runbook has two separate actions:

1. Audit published courses. An explicit apply can return courses that fail the current checks to draft status.
2. Review and reimport the corrected brand copy through the CLI.

The course tool does not write lessons, repair answers, republish courses, delete content, or change learner progress. Follow [the authoring runbook](adding-a-course.md) if course content needs repair. Payment setup remains a separate task in [billing setup](billing-setup.md).

## Prepare the reviewed code

Run from the repository root:

```sh
bun install
bun run --cwd packages/shared build
cd backend
bun test ./scripts/__tests__/audit-published-courses.test.ts
bun scripts/audit-published-courses.ts --help
```

Use the same reviewed checkout for the audit and apply. Stop other course imports while applying the changes. Take a database snapshot or verify an available recovery point before applying to production. Retain the audit reports with the deployment record.

## Select a known database

Have your secret manager supply a PostgreSQL URL in an explicitly named environment variable, for example `GRASPFUL_PRELAUNCH_DATABASE_URL`. Do not put the URL in command arguments or print the environment. The script never selects `DATABASE_URL` automatically.

The required `--expect-target` argument includes the user, host, port, database, and schema, with the password omitted:

```text
<user>@<host>:<port>/<database>?schema=<schema>
```

The user matters for shared database pool hosts. For example, Supabase projects can share a pool hostname and database name while their connection usernames identify different projects. Percent-encode reserved characters in the username, database, or schema. The default port is `5432`; the default schema is `public`.

Compare these values with the intended database connection in your deployment configuration. The script rejects mismatches and unexpected connection-routing parameters before it connects. It then checks the connected database name.

The examples below use an isolated local database. Replace the target deliberately for another environment. No production database address is supplied by this runbook.

## Audit without writing

Run from `backend`. Supply the selected environment variable through your secret manager first.

```sh
umask 077
mkdir -p /tmp/graspful-prelaunch-review
bun scripts/audit-published-courses.ts \
  --database-url-env GRASPFUL_PRELAUNCH_DATABASE_URL \
  --expect-target 'postgres@127.0.0.1:54322/postgres?schema=public' \
  > /tmp/graspful-prelaunch-review/course-audit.json
```

The default scope is every currently published course with `archivedAt: null`. Add `--org-id <organization-uuid>` to audit one organization. Existing drafts and archived courses are excluded.

The dry-run uses a read-only, serializable database transaction. It calls the canonical `CourseYamlExportService`, parses the exported YAML, and runs the shared quality gate used by publication. It does not start the application, telemetry, notification workers, or billing services.

Read the JSON report. It includes:

- `target` and `orgId`: the connection identity and organization scope.
- `summary`: courses scanned, passed, failed, export errors, and courses actually unpublished.
- `courses`: each course ID, slug, organization, revision, quality score, failures, warnings, content counts, and proposed action.
- `reportSha256`: a confirmation hash of the target, scope, current gate metadata, course revisions, exported content, and findings.

A failed check proposes `set_draft`. Warnings alone do not propose a change. Export or review exceptions propose `inspect_error` and block the entire apply. Raw connection errors and database passwords are omitted from the output.

Exit codes are `0` for a clean dry-run, `2` when a dry-run finds failing courses, and `1` for invalid arguments, audit errors, or blocked/unconfirmed execution. A nonzero result is not permission to skip the report. Inspect it before continuing.

## Apply the reviewed course withdrawals

Use `--apply` only after reviewing each failed course and confirming that those courses should be removed from the published catalog. Copy the exact `reportSha256` value from that reviewed dry-run into `--confirm-report`.

```sh
bun scripts/audit-published-courses.ts \
  --database-url-env GRASPFUL_PRELAUNCH_DATABASE_URL \
  --expect-target 'postgres@127.0.0.1:54322/postgres?schema=public' \
  --apply \
  --confirm-report '<reviewed-report-sha256>' \
  > /tmp/graspful-prelaunch-review/course-apply.json
```

Keep any `--org-id` scope identical to the dry-run. The apply reruns the audit. A different catalog, revision, exported course, or finding changes the hash and blocks all writes. Review a fresh dry-run if that happens. The current exporter does not fully order every graph collection; a changed row order can also change the hash and safely block apply. Do not bypass a hash mismatch.

The only update is `isPublished: false` for a course with an explicit failed gate result. Each update also matches its organization, original `updatedAt`, `isPublished: true`, and `archivedAt: null`. All updates share one serializable transaction. A conditional-update conflict rolls back the transaction. Passing courses receive no update.

The transaction has a two-minute timeout. If the catalog is too large, review and apply one organization at a time. On any unconfirmed database error, run a fresh dry-run before retrying. A lost connection can prevent the client from confirming the transaction result.

After a confirmed apply, repeat the dry-run and verify that the remaining published courses pass. Repair withdrawn courses through the normal authoring workflow, review the sources, and request publication explicitly. Do not reset publication flags directly to restore them.

### Limits of this audit

This audits the course export used by publication. The exporter includes course-local prerequisite and encompassing edges. It does not establish that the complete academy graph or every cross-course dependency is valid. Current export also omits key-prerequisite links, so those may appear as warnings. A passing automated score does not establish factual accuracy, exam coverage, or learner outcomes.

Normal course imports update the parent course revision in the same transaction as the content. Direct writes to child tables can bypass that revision contract. Keep direct database editing and course imports stopped during this prelaunch operation.

## Review stored brand records

Run the following preparation from the repository root. The five reviewed files are:

| File | Brand slug | Organization in the file | Domain in the file |
|------|------------|-------------------------|--------------------|
| `content/brands/graspful.yaml` | `graspful` | `graspful` | `graspful.vercel.app` |
| `content/brands/firefighter.yaml` | `firefighter` | `firefighter-prep` | `firefighterprep.vercel.app` |
| `content/brands/electrician.yaml` | `electrician` | `electrician-prep` | `electricianprep.vercel.app` |
| `content/brands/javascript.yaml` | `javascript` | `javascript-prep` | `javascriptprep.vercel.app` |
| `content/brands/posthog.yaml` | `posthog` | `posthog-tam` | `posthog-tam.vercel.app` |

These are the repository values. A deployed brand can have a newer domain, theme, course scope, or other configuration. In particular, check whether the stored Graspful brand uses `graspful.ai` before importing the repository's `graspful.vercel.app` value.

1. Set `GRASPFUL_API_URL` to the intended API origin, with no `/api/v1` suffix. Verify the environment before using a write command.
2. Save the existing records from `GET /api/v1/brands/<brand-slug>` or the creator settings. Keep them with the review record.
3. Make working copies of the reviewed YAMLs. Merge the corrected `tagline`, landing copy, and SEO copy with the verified current configuration.
4. Review `brand.id`, `brand.orgSlug`, `brand.domain`, theme, asset paths, pricing settings, and `contentScope` in every working copy. Preserve intentional deployed changes.
5. Authenticate with CLI credentials permitted to manage the target organizations. Brand imports use `brand.orgSlug` inside the YAML. The CLI's `--org` option does not override it.

```sh
mkdir -p /tmp/graspful-prelaunch-review/brands
cp content/brands/graspful.yaml /tmp/graspful-prelaunch-review/brands/
cp content/brands/firefighter.yaml /tmp/graspful-prelaunch-review/brands/
cp content/brands/electrician.yaml /tmp/graspful-prelaunch-review/brands/
cp content/brands/javascript.yaml /tmp/graspful-prelaunch-review/brands/
cp content/brands/posthog.yaml /tmp/graspful-prelaunch-review/brands/
```

Finish the configuration review in those working files, then validate them:

```sh
graspful validate /tmp/graspful-prelaunch-review/brands/graspful.yaml
graspful validate /tmp/graspful-prelaunch-review/brands/firefighter.yaml
graspful validate /tmp/graspful-prelaunch-review/brands/electrician.yaml
graspful validate /tmp/graspful-prelaunch-review/brands/javascript.yaml
graspful validate /tmp/graspful-prelaunch-review/brands/posthog.yaml
```

## Reimport the reviewed brand copy

The following are write commands. Run them only after the API target, working files, and organization access have been reviewed. The brand import upserts the stored configuration and attempts domain provisioning on Vercel. Domain setup failure can occur after the brand record has already been saved. Inspect both the saved brand and domain result before retrying.

```sh
graspful import /tmp/graspful-prelaunch-review/brands/graspful.yaml --format json
graspful import /tmp/graspful-prelaunch-review/brands/firefighter.yaml --format json
graspful import /tmp/graspful-prelaunch-review/brands/electrician.yaml --format json
graspful import /tmp/graspful-prelaunch-review/brands/javascript.yaml --format json
graspful import /tmp/graspful-prelaunch-review/brands/posthog.yaml --format json
```

Verify each saved record through the read API and open its actual domain. Check the corrected claims, course links, theme, and current billing status. These commands do not activate Stripe payments. Keep payment and signup-alert setup checks in their separate runbooks.

## Validation of the tool

The script has unit tests that use the real exporter and shared gate with a mocked database. They cover no-write dry runs, malformed stored answers, empty courses, explicit database identity, stale confirmations, export errors, conditional-update conflicts, and repeat execution. These tests do not establish real PostgreSQL read-only or rollback behavior. Run the dry-run on an isolated database before the production data review. Test apply only on disposable fixtures until deployment approval includes the production cleanup.
