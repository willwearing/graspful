# Multi-Brand Architecture

How the white-label system works in development and production.

## Core Concept

One Next.js app serves all brands. One NestJS backend serves all orgs. No separate deployments per brand.

## Production

```
firefighterprep.audio ─┐
electricianprep.audio ──┼── Same Vercel deployment ── Same Next.js app
jsprep.audio ───────────┘
```

1. Custom domains all point to the same Vercel project
2. Next.js middleware reads the `Host` header on every request
3. `resolveBrand(hostname)` maps domain to brand config
4. Brand config drives: theme (CSS variables), landing page copy, SEO metadata, org ID for API calls
5. The backend is org-scoped — `brand.orgId` maps to the right data

### Adding a new production brand

1. Add brand config to `apps/web/src/lib/brand/defaults.ts`
2. Register domain in `apps/web/src/lib/brand/resolve.ts`
3. Create course YAML in `content/courses/`
4. Run seed script to create org + import course
5. Add custom domain in Vercel dashboard (Settings > Domains)
6. Push to main — Vercel builds once, all brands update

No new deployments, no new infrastructure.

## Development

In dev, `localhost` doesn't have different hostnames, so brands are selected differently.

### Dev Brand Switcher (recommended)

A floating widget in the bottom-right corner lets you switch brands without restarting the server. It:

1. Sets a `dev-brand-override` cookie
2. Reloads the page
3. Middleware and layout read the cookie and resolve to that brand

Just run `bun dev` and click the brand pill to switch. The switcher only renders when `NODE_ENV !== "production"`.

To reset to the default: click "Reset to DEV_BRAND_ID default" in the switcher menu.

### DEV_BRAND_ID env var (fallback)

If no cookie override is set, the brand resolves from the `DEV_BRAND_ID` environment variable:

```bash
DEV_BRAND_ID=javascript bun dev    # defaults to JSPrep
DEV_BRAND_ID=firefighter bun dev   # defaults to FirefighterPrep
```

If neither cookie nor env var is set, defaults to `firefighter`.

### Priority order in dev

1. `dev-brand-override` cookie (set by switcher widget)
2. `DEV_BRAND_ID` env var
3. `firefighter` (hardcoded default)

## How Brand Resolution Works

```
Request
  │
  ├── Middleware (middleware.ts)
  │     reads Host header + cookie
  │     calls resolveBrand(hostname, cookieHeader)
  │     sets x-brand-id header + brand-id cookie on response
  │
  ├── Root Layout (app/layout.tsx)
  │     reads Host header + cookie
  │     calls resolveBrand(hostname, cookieHeader)
  │     passes brand to BrandThemeStyle (CSS vars in <head>)
  │     wraps app in BrandProvider (React Context)
  │
  └── Any Component
        calls useBrand() hook
        gets current brand config (theme, copy, orgId, etc.)
```

## Security: Org Membership & Tenant Isolation

Each brand maps to a backend org. Users can only access content for orgs they're a member of.

### How enrollment works

1. User signs up or signs in on a brand's domain (e.g., `jsprep.audio`)
2. The auth flow calls `POST /orgs/{brand.orgId}/join` to auto-enroll the user as a `member`
3. Backend `OrgMembershipGuard` checks membership on every API call — returns 403 if not a member
4. The join endpoint is idempotent — safe to call on every login

### Production isolation

In production, Supabase session cookies are domain-scoped. A session on `firefighterprep.audio` does NOT carry to `jsprep.audio`. Users must sign in separately on each brand, which triggers auto-enrollment for that brand's org.

This means: even though it's one Supabase project and one backend, users only see content for brands they've explicitly signed into.

### Dev behavior

In dev, all brands share `localhost`, so session cookies carry across brand switches. The dev brand switcher auto-calls the join endpoint when switching brands, so you have access to test all brands without re-signing in.

### Defense in depth

- **Backend**: `OrgMembershipGuard` rejects all API calls for non-members (403)
- **Frontend**: API errors surface as empty states or error messages (not leaked data)
- **Auth flow**: Auto-join on sign-up and sign-in ensures the normal path always works

## Key Files

| File | Purpose |
|------|---------|
| `apps/web/src/lib/brand/config.ts` | BrandConfig TypeScript interface |
| `apps/web/src/lib/brand/defaults.ts` | All brand definitions (theme, copy, SEO, pricing) |
| `apps/web/src/lib/brand/resolve.ts` | Hostname/cookie → brand resolution |
| `apps/web/src/lib/brand/context.tsx` | React Context + `useBrand()` hook |
| `apps/web/src/lib/brand/theme-style.tsx` | Injects CSS variables from brand theme |
| `apps/web/src/middleware.ts` | Sets brand headers/cookies per request |
| `apps/web/src/app/layout.tsx` | Server-side brand resolution + provider setup |
| `apps/web/src/components/dev/brand-switcher.tsx` | Dev-only floating brand switcher |
| `apps/web/src/components/auth/auth-form.tsx` | Sign-up/sign-in with auto-join |
| `apps/web/src/app/auth/callback/route.ts` | OAuth callback with auto-join |
| `backend/src/auth/org-join.controller.ts` | `POST /orgs/:orgSlug/join` endpoint |
| `backend/src/auth/guards/org-membership.guard.ts` | Enforces org membership on all API calls |
