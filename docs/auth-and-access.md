# Authentication, roles, and website creation

This describes the current implementation after PR #139 and the architecture cleanup. The API enforces organization and course access. Browser route checks determine which shell and login page the user sees.

## Browser sign-up and sign-in

1. The app authenticates with Supabase. A signup that requires email confirmation stays on the confirmation screen until the callback creates a session.
2. The app calls `POST /api/v1/auth/provision` with the Supabase bearer token. The endpoint creates the database user and a private organization with an `owner` membership if the user has no owned organization. Repeated calls reuse the organization.
3. On a branded academy site, the request can include `brandOrgSlug`. Provisioning adds a `member` membership only when the organization and its public brand are active. Existing roles stay unchanged.
4. The app routes the user to an allowed local destination. Redirect parameters are validated before use.

Provisioning creates no public brand or domain. Learners still receive a private owner workspace under the current product behavior. This gives them a creator workspace as well as any academy memberships.

`POST /api/v1/orgs/:orgSlug/join` allows direct self-enrollment only into the `graspful` platform organization. Branded academy membership uses the provision flow above.

## CLI and MCP credentials

`graspful register` and browser-based login create a short-lived CLI authorization request. The user signs in through the browser. The CLI polls the exchange endpoint, receives an API key once, and saves it to `~/.graspful/credentials.json`. The terminal displays a masked key.

The CLI and MCP accept `GRASPFUL_API_KEY` and `GRASPFUL_API_URL`. `GRASPFUL_CONFIG_DIR` changes the credential directory from its default, `~/.graspful`. MCP also reads saved CLI credentials when it performs an authenticated operation. Offline scaffold, fill, validate, review, describe, and brand-generation tools require no account.

An API key belongs to one organization. The backend also checks that the key's user still has the required membership and role. A user who belongs to two organizations cannot use a key from one organization to access the other.

The direct password registration and login API endpoints are development fixtures. Production disables them; use browser authentication for customer accounts.

## Roles and learner access

| Role | Current access |
|------|----------------|
| `owner` | Organization administration and creator operations; satisfies admin checks |
| `admin` | Creator operations such as imports, publication, branding, billing, and API-key management |
| `member` | Learner operations for published content with the required course or academy entitlement |
| Anonymous | Public pages and catalog metadata permitted by the endpoint |

Owner and admin currently have the same creator capabilities. There is no public invitation or role-change endpoint. Membership alone does not grant access to arbitrary draft or cross-organization course content. The API verifies resource ownership, publication state, and entitlements for the requested operation. Frontend visibility does not grant API access.

Paid plan enforcement remains a product decision. The existing subscription fields and UI do not establish a complete feature-gating contract.

## Public website creation

A course import can create the default public brand and landing page for an organization, including when the course remains a draft. Publication controls whether learners can see and study the course. It does not control whether the brand's landing page exists.

A brand YAML import creates or updates the organization's brand record, including copy, theme, domain, and content scope. The authenticated caller must have creator access to that organization. Domain provisioning uses the configured Vercel integration. A custom domain also needs the corresponding DNS and hosting configuration.

Default organization slugs use the email local part and domain name. Automatically generated academy subdomains can include that slug. Changing when learner workspaces or draft websites are created, or how those names are generated, requires a separate product decision.

## Implementation and regression coverage

- [Provisioning](../backend/src/auth/provision.service.ts) and [provision endpoint](../backend/src/auth/auth-provision.controller.ts)
- [CLI browser authorization](../backend/src/auth/cli-auth.service.ts)
- [Organization checks](../backend/src/auth/guards/org-membership.guard.ts)
- [Brand records](../backend/src/brands/brands.service.ts)
- [Local browser tests](local-e2e.md)

For changes to auth, routing, or entitlements, verify anonymous, signed-in non-entitled, and entitled access. Test the shell shown by the affected route as well as the API result.
