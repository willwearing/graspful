# Infrastructure & Deployment

## What's Deployed and Working

| Service  | URL                                                | Status                     |
|----------|----------------------------------------------------|----------------------------|
| Frontend | https://web-seven-nu-27.vercel.app                 | Live                       |
| Backend  | https://graspful-backend-production.up.railway.app | Live, health check passing |
| Database | Supabase `tzftjqpnisalltnkrykg`                    | Migrations applied         |

## CI/CD Flow

```
PR → GitHub Actions (type check + tests) → must pass
Merge to main → GitHub Actions (type check + tests) → Deploy job:
  ├── railway up → backend deploys
  └── curl deploy hook → Vercel rebuilds frontend
```

## Files

- `.github/workflows/ci-deploy.yml` — CI + deploy pipeline
- `railway.json` — Railway build/deploy config (Nixpacks)
- `.node-version` — pins Node 22 for Railway

## GitHub Secrets

| Secret / Variable      | Purpose                                  |
|------------------------|------------------------------------------|
| `RAILWAY_TOKEN`        | Project-scoped deploy token              |
| `VERCEL_DEPLOY_HOOK`   | Webhook URL to trigger Vercel deploys    |
| `RAILWAY_SERVICE_NAME` | Variable, set to `graspful-backend`      |

## Note on Vercel API Token

The `VERCEL_API_TOKEN` on Railway (used by the white-label domain provisioning service) is a short-lived OAuth token. Create a long-lived token at [vercel.com/account/tokens](https://vercel.com/account/tokens) and update it in Railway's env vars when it expires.
