# Local E2E tests

Playwright creates users, imports courses, and deletes fixtures. Run it against an isolated local Supabase instance. Both app configs reject hosted database, Supabase, and backend URLs before they start a server or collect tests. They do not load credentials from application `.env` files.

Use Supabase CLI 2.90.0 and Docker. The `Start isolated local Supabase` step in [the CI workflow](../.github/workflows/ci-deploy.yml) contains the complete setup. It creates a separate Supabase project, generates an ES256 signing key for the backend JWT verifier, and permits redirects to local ports 3001 and 3002. Keep the temporary project outside this repository so its keys and test auth settings cannot enter deployment config.

After starting that project, export its credentials in the shell that will run migrations, seeds, builds, and tests. Replace the directory below with your temporary Supabase project directory. This reads keys directly into environment variables without printing them.

```sh
export E2E_SUPABASE_DIR=/tmp/graspful-e2e-supabase
export SUPABASE_URL="$(supabase status --workdir "$E2E_SUPABASE_DIR" --output json | jq -er '.API_URL')"
export DATABASE_URL="$(supabase status --workdir "$E2E_SUPABASE_DIR" --output json | jq -er '.DB_URL')"
export DIRECT_URL="$DATABASE_URL"
export SUPABASE_SERVICE_ROLE_KEY="$(supabase status --workdir "$E2E_SUPABASE_DIR" --output json | jq -er '.SERVICE_ROLE_KEY')"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="$(supabase status --workdir "$E2E_SUPABASE_DIR" --output json | jq -er '.ANON_KEY')"
export NEXT_PUBLIC_SUPABASE_URL="$SUPABASE_URL"
export NEXT_PUBLIC_BACKEND_URL=http://localhost:3000/api/v1
export POSTHOG_PERSONAL_API_KEY=
export POSTHOG_PROJECT_ID=
export POSTHOG_API_KEY=
export NEXT_PUBLIC_POSTHOG_KEY=
```

The expected ports are Supabase API 54321, Postgres 54322, backend 3000, web 3001, and site 3002. The backend and browser Supabase URLs must have the same origin. `DIRECT_URL` defaults to `DATABASE_URL` when omitted.

From the repository root, build shared code, then apply the database schema before the auth triggers and RLS policies:

```sh
bun install --frozen-lockfile
(cd packages/shared && bun run build)
(cd backend && bun x prisma generate && bun x prisma migrate deploy)
for migration in supabase/migrations/*.sql; do
  psql "$DATABASE_URL" --set ON_ERROR_STOP=1 --file "$migration"
done
(cd backend && bun x prisma db seed)
(cd backend && bun x ts-node prisma/seeds/brands.ts)
(cd apps/web && bun x playwright install chromium)
```

Run either suite from the repository root:

```sh
(cd apps/web && bun run test:e2e)
(cd apps/site && bun run test:e2e)
```

The web config builds and starts the backend, then starts the web app. It does not apply database migrations. The site config starts the site app. Both configs pass the validated local environment to their servers and disable Stripe, PostHog, and Vercel domain writes for the test run. Account registration tests require the backend's development mode.

By default, tests refuse to reuse an existing app server. Set `E2E_REUSE_EXISTING_SERVER=1` only after starting your own servers with these same local credentials. This is required when you want to run both suites against one prestarted stack. A local HTTP address alone does not prove that an existing backend uses a local database.

When testing a production Next.js build, set the local public environment variables and empty PostHog keys above before `bun run build`. Public variables are embedded in the browser bundle. Empty source map credentials prevent uploads from local verification builds. Start the backend directly from `dist/main.js` with `NODE_ENV=development`, as CI does, and start the built Next.js apps with `NODE_ENV=production`.

`bun run test:e2e:list` in `apps/web` and `bun x playwright test --list` in `apps/site` use the same environment checks. `bun test scripts/e2e-env.test.ts` verifies missing configuration, hosted URL rejection, and integration isolation without starting services.
