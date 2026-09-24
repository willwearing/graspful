# Multi-brand architecture

`apps/web` serves the platform website and branded learner academies. `apps/site` provides a separate creator dashboard and login surface. Both use the same NestJS API and Supabase authentication. Shared creator components and API helpers live in `packages/creator-ui`.

## Production brand resolution

The web app reads the request hostname and resolves an active brand from the backend. The brand supplies its theme, landing-page copy, SEO settings, organization slug, and course scope. Static defaults remain available for platform and development fallback behavior.

Custom academy domains point to the web app's Vercel project. Creating a brand record does not by itself establish DNS ownership. Configure the domain and DNS with the hosting provider. With Vercel credentials configured, the backend can request domain provisioning.

The backend scopes requests to organizations and checks the requested resource. Hostnames, brand cookies, and visible navigation do not grant API authorization.

## Create or update an academy site

1. Authenticate with `graspful register` to create a private organization workspace and save CLI credentials.
2. Author, validate, and review the course and academy YAML files.
3. Import the files through the CLI or MCP. A course import can create a default public brand even when the course is a draft.
4. Author and import brand YAML to set the landing-page promise, theme, domain, and course scope.
5. Publish reviewed courses and verify the public catalog and learner flow.
6. For a custom domain, finish DNS and hosting configuration.

Brand configuration is stored in the database. See [the course authoring runbook](adding-a-course.md) and [auth and access](auth-and-access.md).

## Development

Run `apps/web` on port 3001 and `apps/site` on port 3002. On loopback hosts, the web app uses the `dev-brand-override` cookie, then `DEV_BRAND_ID`, then the `graspful` default. The development brand switcher updates the cookie and reloads the page. It is hidden in production.

Brand preview affects presentation. A signed-in learner still needs a permitted membership and entitlement to load protected course content.

Supabase cookies are scoped to the host that issued them. Independent custom domains require separate sign-in. The apps authenticate against the same Supabase project, and the backend checks the bearer token on each protected request.

## Membership and creator access

Browser sign-up and sign-in call `POST /api/v1/auth/provision`. The API creates a private owner workspace if needed. A `brandOrgSlug` adds a learner membership only to an active organization with an active public brand. The direct join endpoint accepts only the platform organization, `graspful`.

Members can use permitted learner operations. Owners and admins can use creator operations. API keys are restricted to their issuing organization. See [auth and access](auth-and-access.md) for the full flow and current product decisions.

## Key files

| File | Purpose |
|------|---------|
| `apps/web/src/lib/brand/config.ts` | Brand configuration type |
| `apps/web/src/lib/brand/defaults.ts` | Platform and development defaults |
| `apps/web/src/lib/brand/resolve.ts` | Host and development override resolution |
| `apps/web/src/lib/brand/resolve-db.ts` | Backend brand lookup |
| `apps/web/src/lib/brand/context.tsx` | Brand React context |
| `apps/web/src/proxy.ts` | Request auth and host routing |
| `apps/web/src/lib/hosts.ts` | Platform, creator, and academy route policy |
| `backend/src/brands/brands.service.ts` | Persistent brands and public catalog |
| `backend/src/auth/provision.service.ts` | Private workspaces and learner memberships |
