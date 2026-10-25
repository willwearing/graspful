# Infrastructure & Deployment

## What's Deployed and Working

| Service  | URL                                                | Status                     |
|----------|----------------------------------------------------|----------------------------|
| Frontend | https://graspful.vercel.app                        | Live (platform landing)    |
| Backend  | https://graspful-backend-production.up.railway.app | Live, health check passing |
| Database | Supabase `tzftjqpnisalltnkrykg`                    | Migrations applied         |

### Regions

Keep all three services in Virginia. Every server-rendered page calls the backend, and every backend request queries Postgres, so a cross-country hop gets paid on each step.

| Service | Region | Where it's set |
|---------|--------|----------------|
| Vercel functions | `iad1` (Washington, D.C.) | Vercel default |
| Railway backend | `us-east4-eqdc4a` (Virginia) | `railway.json` `deploy.multiRegionConfig` |
| Supabase Postgres | `us-east-1` (N. Virginia) | Supabase project |

### Edge caching

Pages read the request host to pick a brand, so Next.js renders them on every request. Shared marketing pages (`/pricing`, `/agents`, `/ai-course-builder`, `/academies/*`, `/docs/*`) get a `Vercel-CDN-Cache-Control` header from `apps/web/src/lib/cdn-cache.ts`. Vercel serves them from the edge for 5 minutes, then refreshes them in the background. The cache key includes the host and the deployment, so brands never share entries and each deploy starts fresh.

Vercel won't cache a response that sets a cookie. The proxy skips the Supabase session check on marketing routes whose routing doesn't depend on sign-in (`routeNeedsSession` in `apps/web/src/lib/hosts.ts`), so those responses carry no `Set-Cookie`.

The homepage stays uncached. It evaluates the homepage experiment flag per visitor on the server and bootstraps posthog-js with the result.

Check a deploy with `curl -sI https://graspful.ai/pricing | grep x-vercel-cache`. A second request should return `HIT`.

### Brand URLs (Vercel aliases)

| Brand            | URL                                      |
|------------------|------------------------------------------|
| Graspful         | https://graspful.vercel.app              |
| FirefighterPrep  | https://firefighterprep.vercel.app       |
| ElectricianPrep  | https://electricianprep.vercel.app       |
| JavaScriptPrep   | https://javascriptprep.vercel.app        |
| PostHog TAM      | https://posthog-tam.vercel.app           |

All brands are served from the same Vercel deployment. The middleware resolves the brand from the `Host` header and injects the correct theme, copy, and content scope. Custom domains can be added later when purchased — just update the brand config and add the domain in Vercel.

### Custom Domains

| Domain | Points to | Status |
|--------|-----------|--------|
| `graspful.ai` | Vercel (frontend) | Live |
| `api.graspful.ai` | Railway (backend) | Railway custom domain added — **DNS CNAME pending** |
| `docs.graspful.com` | N/A | No separate docs site — docs are at `graspful.ai/docs/*` |

#### api.graspful.ai DNS Setup

Railway custom domain created 2026-03-25. Add this DNS record on the `graspful.ai` domain (managed via Cloudflare):

| Type | Host | Value |
|------|------|-------|
| CNAME | `api` | `nm7hvpld.up.railway.app` |

Once the CNAME propagates, Railway will auto-provision an SSL certificate. The CLI, MCP server, and all public docs reference `api.graspful.ai`.

## CI/CD Flow

```
PR → GitHub Actions (type check + tests) → must pass
Merge to main → GitHub Actions (type check + tests) → Deploy:
  ├── railway up → backend deploys (via GitHub Actions)
  └── Vercel git integration → frontend auto-deploys (no webhook needed)
```

## Files

- `.github/workflows/ci-deploy.yml` — CI + backend deploy pipeline
- `railway.json` — Railway build/deploy config (Nixpacks)
- `.node-version` — pins Node 22 for Railway

## GitHub Secrets

| Secret / Variable      | Purpose                                  |
|------------------------|------------------------------------------|
| `RAILWAY_TOKEN`        | Project-scoped deploy token              |
| `RAILWAY_SERVICE_NAME` | Variable, set to `graspful-backend`      |

## Note on Vercel API Token

The `VERCEL_API_TOKEN` on Railway (used by the white-label domain provisioning service) is a short-lived OAuth token. Create a long-lived token at [vercel.com/account/tokens](https://vercel.com/account/tokens) and update it in Railway's env vars when it expires.
