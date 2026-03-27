# Infrastructure & Deployment

## What's Deployed and Working

| Service  | URL                                                | Status                     |
|----------|----------------------------------------------------|----------------------------|
| Frontend | https://graspful.vercel.app                        | Live (platform landing)    |
| Backend  | https://graspful-backend-production.up.railway.app | Live, health check passing |
| Database | Supabase `tzftjqpnisalltnkrykg`                    | Migrations applied         |

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
| `graspful.ai/docs/*` | Vercel (frontend) | Live docs routes on the main site |

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
