# Graspful CLI: Agent-First Course Creation

## The Thesis

Andrew Chen's observation: AI distribution isn't about bolting chat panels onto existing products. It's about being **the default callable primitive** in your domain. The products that win in an agent world are composable, callable, reliable capabilities — not destinations.

Graspful is accidentally well-positioned for this. Courses are already YAML files with a validated schema. No code required to create one. The import pipeline already works via API. The gap is: **there's no clean CLI that an agent can invoke to go from "I need a course on X" to "here's a live adaptive course with a knowledge graph, spaced repetition, and section exams."**

That's a unique capability. No other learning platform exposes course creation as a callable primitive. They all require you to click through a UI. An agent can't do that. An agent *can* run `graspful create course --topic "Kubernetes networking" --depth intermediate --hours 8`.

## What Exists Today

- **Course YAML schema** — Zod-validated, well-documented, battle-tested across real estate law and firefighter certification
- **Import API** — `POST /api/v1/orgs/:orgId/courses/import` accepts YAML, validates the knowledge graph (DAG check, concept refs, exam blueprints), and upserts everything in a Prisma transaction
- **Academy import** — multi-course manifests with cross-course prerequisites
- **One import script** — `import-tam-academy.ts`, hardcoded to PostHog TAM content
- **Content guide** — `content/README.md` with detailed authoring rules

What's missing: a general-purpose CLI that any agent (or human) can use.

## The CLI

### Package

`@graspful/cli` — standalone npm package, installable globally or via npx.

```bash
npx @graspful/cli create course \
  --topic "AWS Solutions Architect Associate" \
  --source-document "AWS SAA-C03 Exam Guide" \
  --estimated-hours 40 \
  --org posthog-tam \
  --output ./content/courses/aws-saa.yaml
```

### Core Commands

```
graspful create course     Create a new course YAML from a topic/spec
graspful create academy    Create a multi-course academy manifest
graspful validate          Validate a course/academy YAML against the schema
graspful import            Import YAML into a running Graspful instance
graspful list courses      List courses in an org
graspful describe course   Show course stats (concepts, KPs, problems, graph shape)
graspful diff              Compare two versions of a course YAML (structural diff)
```

### What Agents Actually Need

An agent calling `graspful create course` doesn't want to write 2000 lines of YAML from scratch. It wants:

1. **Scaffold** — generate the skeleton: course metadata, sections, concept stubs with prerequisites
2. **Fill** — flesh out knowledge points, instructions, worked examples, problems for each concept
3. **Validate** — confirm the YAML is schema-valid and the graph is acyclic
4. **Import** — push it to a Graspful instance

These should be separable because agents work iteratively. Generate the scaffold, review it, fill section by section, validate as you go.

```
graspful create course --scaffold-only   # Just the graph structure, no KP content
graspful fill concept <course.yaml> <concept-id>   # Fill one concept's KPs
graspful validate <course.yaml>          # Schema + graph validation
graspful import <course.yaml> --org <org>  # Push to instance
```

### Auth

Two modes:

1. **API key** — `GRASPFUL_API_KEY` env var. New model: org-scoped API keys stored in `api_keys` table. Agents use this.
2. **Interactive** — `graspful login` opens browser for Supabase OAuth. Stores JWT in `~/.graspful/credentials.json`. Humans use this.

For the agent use case, API keys are non-negotiable. Agents can't do browser OAuth.

### Structured Output

Every command supports `--format json` for machine-readable output. This is critical for agent composability.

```bash
graspful validate course.yaml --format json
# { "valid": true, "warnings": [], "stats": { "concepts": 42, "kps": 89, "problems": 267 } }

graspful import course.yaml --org my-org --format json
# { "courseId": "uuid", "url": "https://my-org.graspful.com/courses/aws-saa", ... }
```

Default output is human-readable. `--format json` is the agent interface.

## Architecture

### Where It Lives

```
packages/cli/
  src/
    index.ts              # Entry point, commander setup
    commands/
      create-course.ts    # Scaffold generation
      create-academy.ts   # Academy manifest generation
      fill-concept.ts     # KP/problem content for one concept
      validate.ts         # Schema + graph validation (offline, no API needed)
      import.ts           # API call to import YAML
      list.ts             # List courses/academies
      describe.ts         # Course stats
      diff.ts             # Structural diff
      login.ts            # Interactive auth
    lib/
      schema.ts           # Re-export Zod schemas from backend (shared package)
      api-client.ts       # HTTP client for Graspful API
      auth.ts             # Credential storage + API key resolution
      yaml.ts             # YAML parsing/serialization
      graph.ts            # DAG validation, topological sort (for offline validate)
    templates/
      course-scaffold.ts  # Default course structure generator
      concept-stub.ts     # Concept with placeholder KPs
```

### Shared Schema

The Zod schemas (`CourseYamlSchema`, `AcademyManifestSchema`) currently live in `backend/src/knowledge-graph/schemas/`. Move them to `packages/shared/` so both the backend and CLI can import them. This is already the pattern — `packages/shared/` exists for shared TypeScript types.

### Validation is Offline

`graspful validate` should work without a running backend. It imports the Zod schema and runs validation locally. This matters because agents will validate repeatedly during generation — hitting an API for every check is slow and fragile.

### Import Hits the API

`graspful import` calls `POST /api/v1/orgs/:orgId/courses/import` with the YAML content. The backend does the real work (Prisma transaction, UUID generation, edge creation). The CLI is a thin client.

## Billing: 70/30 Revenue Share (Apple Model)

### The Model

Graspful is a marketplace. Course creators (clients) build courses for their customers. Graspful collects the subscription fees from learners and pays out to creators minus a 30% platform cut.

- **No upfront cost** to create or publish courses
- **Learners pay** via the landing page pricing (set in brand YAML)
- **Graspful collects** 100% of learner payments via Graspful's Stripe account
- **Graspful keeps 30%**, pays out 70% to the course creator
- Course creation via CLI/MCP is free — the platform earns when learners pay

This is the Apple App Store model applied to adaptive learning. Creators bring the content, Graspful brings the platform (adaptive engine, spaced repetition, diagnostic, hosting, billing, auth). The 30% covers infrastructure + platform value.

### How Money Flows

```
Learner visits k8sprep.graspful.com (landing page from brand YAML)
  → Signs up (Supabase Auth — Graspful controls)
  → Free tier: starts learning immediately
  → Hits paywall or wants full access
  → Clicks pricing → Stripe Checkout → pays $29/mo
  → Payment lands in Graspful's Stripe account
  → Graspful keeps $8.70 (30%)
  → Creator receives $20.30 (70%) via Stripe Connect payout
```

**Graspful controls the entire billing surface.** The landing page, signup, auth, Stripe checkout — all Graspful infrastructure. The creator sets the price in `brand.yaml` (`pricing.monthly: 29`), but the payment flows through Graspful. Creators can't route around the platform.

### The Brand YAML Pricing Field

The `pricing` section in brand YAML is what learners see on the landing page:

```yaml
pricing:
  monthly: 29
  yearly: 199
  currency: usd
  trialDays: 7
```

This is the creator's price to their customers. Graspful takes 30% of whatever the creator sets. The creator decides what their course is worth — Graspful doesn't dictate pricing.

### Stripe Connect Implementation

Stripe Connect is built for exactly this: marketplace billing where the platform collects payment and splits revenue with sellers.

**What exists today:**
- `Subscription` model with `stripeCustomerId`, `stripeSubscriptionId`, plan tiers
- Stripe checkout, portal, and webhook handlers in `backend/src/billing/`
- Learner enrollment and payment already flows through Graspful's Stripe

**What needs to change:**

1. **Stripe Connect accounts for creators.** Each course creator (org owner) needs a Stripe Connect account. When a creator first publishes a course, they onboard via Stripe Connect Express (Stripe hosts the onboarding form — tax info, bank details, identity verification). Graspful stores the `stripeConnectAccountId` on the `Organization` model.

   ```prisma
   model Organization {
     // ... existing fields
     stripeConnectAccountId  String?  @unique @map("stripe_connect_account_id")
     connectOnboardingComplete Boolean @default(false) @map("connect_onboarding_complete")
   }
   ```

2. **Payment splits via Stripe Connect.** When a learner subscribes, the Stripe subscription is created with an `application_fee_percent: 30` on Graspful's platform account. Stripe automatically:
   - Charges the learner $29/mo
   - Sends $20.30 to the creator's Connect account
   - Keeps $8.70 in Graspful's platform account
   - Handles all tax reporting (1099s for US creators, etc.)

   ```typescript
   // In billing.service.ts — updated checkout session creation
   const session = await stripe.checkout.sessions.create({
     mode: 'subscription',
     line_items: [{ price: priceId, quantity: 1 }],
     subscription_data: {
       application_fee_percent: 30,
     },
     // Payment goes to creator's Connect account
     // Graspful keeps 30% as application fee
   }, {
     stripeAccount: org.stripeConnectAccountId,  // Connect destination
   });
   ```

3. **Connect onboarding flow.** New endpoint and frontend page:
   ```
   POST /orgs/:orgId/billing/connect-onboarding
   ```
   Creates a Stripe Connect Account Link (Express), returns the onboarding URL. The creator fills in their info on Stripe's hosted form. Webhook `account.updated` fires when onboarding completes → set `connectOnboardingComplete: true`.

   **Gate:** A creator cannot publish a course with pricing > $0 until Connect onboarding is complete. Free courses (no pricing / `pricing.monthly: 0`) can publish without Connect.

4. **Creator payout dashboard.** New endpoints:
   ```
   GET /orgs/:orgId/billing/payouts        → list of Stripe payouts
   GET /orgs/:orgId/billing/revenue         → total revenue, Graspful cut, creator earnings
   GET /orgs/:orgId/billing/active-learners → current subscriber count
   ```
   Frontend dashboard showing: monthly revenue, Graspful's 30%, creator's 70%, payout history, active subscriber count.

5. **Webhook updates:**
   - `invoice.paid` → record revenue event, calculate split
   - `customer.subscription.created` → increment active learner count
   - `customer.subscription.deleted` → decrement active learner count
   - `account.updated` → track Connect onboarding status
   - `payout.paid` → record payout to creator

6. **Revenue tracking table:**
   ```prisma
   model RevenueEvent {
     id                String   @id @default(uuid()) @db.Uuid
     orgId             String   @map("org_id") @db.Uuid
     stripeInvoiceId   String   @unique @map("stripe_invoice_id")
     grossAmount       Int      @map("gross_amount")     // cents
     platformFee       Int      @map("platform_fee")     // 30% in cents
     creatorPayout     Int      @map("creator_payout")   // 70% in cents
     currency          String   @default("usd")
     learnerId         String   @map("learner_id") @db.Uuid
     createdAt         DateTime @default(now()) @map("created_at") @db.Timestamptz

     org Organization @relation(fields: [orgId], references: [id])
     @@map("revenue_events")
   }
   ```

### Free Tier

Courses can be free (no pricing in brand YAML, or `pricing.monthly: 0`). No Connect account needed. No revenue split. This is useful for:
- Internal training (company creates course for their own team)
- Lead gen (free course drives learners to paid courses)
- Testing (agent creates course to iterate before adding pricing)

### CLI Integration

The CLI doesn't handle billing directly. But it surfaces billing state:

```bash
graspful import brand.yaml
# Brand created: k8sprep.graspful.com
# Pricing: $29/mo, $199/yr
# ⚠ Stripe Connect not set up. Complete onboarding to receive payouts:
#   https://k8sprep.graspful.com/settings/billing/connect

graspful import course.yaml --org k8s-cert --publish
# Course published: "CKA Exam Prep"
# Live at: https://k8sprep.graspful.com
# Revenue split: 70% creator / 30% Graspful
```

### Why This Works for the Agent Flywheel

1. **Zero friction to create.** No upfront cost. Agent creates course + brand → live product. The creator only pays (gives up 30%) when learners actually pay.
2. **Aligned incentives.** Graspful earns when creators earn. Graspful is incentivized to make the platform better (better adaptive engine, better landing pages, better SEO) because that drives more learner subscriptions.
3. **Creator lock-in via platform value.** The 30% cut is justified by: adaptive learning engine, spaced repetition, diagnostics, knowledge graph, audio TTS, hosting, auth, billing, landing pages. A creator can't easily replicate this stack. The platform earns its cut.
4. **Agents as content factories.** An agent can create 10 courses in a day. Each one is a new revenue stream. The more courses on the platform, the more learners, the more revenue. Graspful's 30% of a large volume beats 100% of nothing.

## Quality Gate & Review Architecture

### The Core Principle: Review Is Built Into Publish, Not a Separate Gate

Agents iterate. They create, tweak, improve, re-run. A review token that invalidates on every change fights this workflow. The better pattern: **`--publish` runs the review gate inline.** If it passes, it publishes. If it fails, it returns the failures and imports as draft.

This is `cargo clippy` not `terraform plan`. The linter exists as a standalone tool for iteration, and also runs automatically at the point of commitment.

```
graspful review course.yaml           → lint tool, returns pass/fail + details (for iteration)
graspful import course.yaml           → always succeeds, imports as draft
graspful import course.yaml --publish → runs review gate automatically, publishes if it passes,
                                        returns errors + imports as draft if it fails
```

**No tokens. No separate gating step.** The review is embedded in the publish action. Agents can:
- Run `graspful review` as many times as they want during iteration
- Make changes after review without penalty
- Import as draft anytime without review
- Publish only when the gate passes — enforced server-side, not via tokens

### What Exists in `docs/adding-a-course.md`

The review system is already well-specified across two layers:

**Structural review (Step 8)** — 12 graph-level checks (are roots foundational, prerequisites correct, cross-branch edges present, etc.)

**Content review (Step 11)** — 13 lesson-quality checks (KP completeness, deduplication, difficulty staircase, worked example coverage, etc.)

**Mechanical quality gate (autoresearch loop)** — 10 automated checks:
1. YAML parses
2. Unique problem IDs
3. Prerequisites valid
4. Question deduplication (cross-concept, same-fact-same-level)
5. Difficulty staircase (2+ cognitive levels per concept)
6. Cross-concept fact coverage (no fact tested >3 times)
7. Problem variant depth (≥3 per KP)
8. Instruction formatting (no wall-of-text >100 words)
9. Worked example coverage (≥50% of concepts)
10. Import dry-run succeeds (DAG validation)

### What to Build

#### `graspful review` — Standalone Lint Tool

Automates the 10 mechanical checks. Runs offline against YAML. Returns pass/fail with details.

```bash
graspful review course.yaml --format json
# {
#   "passed": false,
#   "score": "8/10",
#   "failures": [
#     { "check": "question_deduplication", "details": "2 duplicate pairs: [ph-events-p1, ph-events-p3]" },
#     { "check": "difficulty_staircase", "details": "concept 'pod-basics' has all recognition-level problems" }
#   ],
#   "stats": { "concepts": 42, "kps": 89, "problems": 267 }
# }
```

Agents call this in a loop: review → fix → review → fix → review passes → import --publish.

| Check | Implementation |
|-------|---------------|
| YAML parses | `yaml.load()` + Zod schema validation |
| Unique problem IDs | Set size vs. array length comparison |
| Prerequisites valid | Cross-reference against concept ID set |
| Question dedup | Normalize question text, hash, flag collisions at same cognitive level |
| Difficulty staircase | Classify problems per concept by difficulty field, require 2+ levels |
| Cross-concept coverage | Extract question stems, count fact occurrences, flag >3 |
| Problem variant depth | Count problems per KP, fail if any authored KP has <3 |
| Instruction formatting | Word count per instruction, flag >100 without content blocks |
| Worked example coverage | Count concepts with `workedExample`, require ≥50% |
| Import dry-run | Parse + validate without writing to DB (DAG check) |

#### `--publish` on import — Inline Gate

When `graspful import course.yaml --publish` is called:
1. Run all 10 mechanical checks server-side
2. If all pass → import with `isPublished: true` → return success
3. If any fail → import with `isPublished: false` → return failures + draft URL

The agent gets actionable feedback. It can fix the issues, re-import with `--publish`, and the updated course goes live. No tokens to manage, no invalidation to worry about.

#### `graspful publish` — Post-Hoc Publish

For courses already imported as draft:
```bash
graspful publish <course-id> --org my-org
# Runs review gate on current course content
# If passes → flips isPublished to true
# If fails → returns failures, stays draft
```

### Agent Doc Split

Split `docs/adding-a-course.md` into focused docs:

```
docs/adding-a-course.md          # Creation workflow only (Steps 0-7, 9-10)
                                 # References review as: "run graspful review during iteration"
                                 # Ends with: "import --publish to go live"

docs/course-review-gate.md      # Review agent doc (Steps 8, 11 moved here)
                                 # All check definitions (structural + content + mechanical)
                                 # Autoresearch loop integration
                                 # Review outcomes (approved / adjustments / rewrite)
```

**Why split:** Creator and reviewer are adversarial by design. Step 8 says "assume the first draft is under-split or under-connected." They should not share instruction sets. The review doc also becomes the reference for what `graspful review` checks — agents can read it to understand failures.

### MCP Review Tool Contract

The tool descriptions make the workflow obvious without tokens:

```typescript
{
  name: "graspful_review_course",
  description: "Lint a course YAML against 10 quality checks (structure, deduplication, difficulty staircase, etc). Use during iteration to find and fix issues before publishing. Does NOT import — use graspful_import_course for that."
},
{
  name: "graspful_import_course",
  description: "Import a course YAML. Default: creates draft. With publish=true: runs quality checks automatically and publishes only if all pass. If checks fail, imports as draft and returns failures."
}
```

Claude sees "runs quality checks automatically" and understands it doesn't need to call review first — but it *can* for faster iteration.

## Brand & Landing Page YAML

### The Problem

Agents need to create two things to launch a course:
1. **Course YAML** — the knowledge graph, KPs, problems (learning content)
2. **Brand YAML** — the landing page, theme, SEO, pricing (marketing content)

Currently, brands are created via API with raw JSON. There's no YAML schema, no CLI command, no way for an agent to go from "I want to launch a Kubernetes certification course" to a live product with a landing page.

### What Exists

The `Brand` model stores everything for a white-label landing page:

```typescript
interface BrandConfig {
  id: string;              // "k8s-cert"
  name: string;            // "KubernetesPrep"
  domain: string;          // "k8sprep.graspful.com"
  tagline: string;
  logoUrl: string;
  orgSlug: string;         // maps to backend org

  theme: {
    light: BrandThemeColors;   // 18 CSS color variables
    dark: BrandThemeColors;
    radius: string;
  };

  landing: {
    hero: { headline, subheadline, ctaText };
    features: { heading, subheading, items: [{ title, description, icon, wide? }] };
    howItWorks: { heading, items: [{ title, description }] };
    faq: [{ question, answer }];
    bottomCta: { headline, subheadline };
  };

  seo: { title, description, keywords[] };
  pricing: { monthly, yearly, currency, trialDays };
  contentScope: { courseIds[] };
}
```

The frontend renders this through marketing components: `<Hero>`, `<Features>`, `<HowItWorks>`, `<FAQ>`, `<PricingSection>`, `<CTA>`. Brand resolution happens via hostname → database lookup.

Backend API: `POST /brands` (create), `PATCH /brands/:slug` (update), `GET /brands/by-domain/:domain`.

### Brand YAML Schema

Define a YAML format for brands, mirroring the existing `BrandConfig` interface:

```yaml
brand:
  id: k8s-cert
  name: KubernetesPrep
  domain: k8sprep.graspful.com
  tagline: "Master Kubernetes. Pass the CKA."
  orgSlug: k8s-cert

theme:
  radius: "0.5rem"
  light:
    primary: "220 90% 50%"
    # ... (or use a preset: "preset: blue")
  dark:
    primary: "220 90% 60%"
    # ...

landing:
  hero:
    headline: "Master Kubernetes. Pass the CKA."
    subheadline: "Adaptive learning with spaced repetition. Study anywhere."
    ctaText: "Start Learning Free"

  features:
    heading: "Why KubernetesPrep"
    subheading: "The fastest path to CKA certification."
    items:
      - title: "Adaptive Engine"
        description: "Focus on what you don't know. Skip what you've mastered."
        icon: Brain
      - title: "Real Scenarios"
        description: "Practice with production-like cluster problems."
        icon: Server
        wide: true
      - title: "Spaced Repetition"
        description: "Scientifically-timed reviews for long-term retention."
        icon: Timer

  howItWorks:
    heading: "How It Works"
    items:
      - title: "Take a Diagnostic"
        description: "We assess what you already know in 10 minutes."
      - title: "Study Adaptively"
        description: "The engine builds your personal learning path."
      - title: "Pass the Exam"
        description: "Arrive on exam day confident and prepared."

  faq:
    - question: "How long does it take?"
      answer: "Most learners are exam-ready in 4-6 weeks studying 30 min/day."
    - question: "Is there a free tier?"
      answer: "Yes. 5 active learners per month, no credit card required."

  bottomCta:
    headline: "Ready to pass?"
    subheadline: "Start your free diagnostic now."

seo:
  title: "KubernetesPrep - CKA Exam Prep with Adaptive Learning"
  description: "Pass the CKA exam with adaptive learning and spaced repetition."
  keywords: [kubernetes, cka, certification, exam prep, adaptive learning]

pricing:
  monthly: 29
  yearly: 199
  currency: usd
  trialDays: 7

contentScope:
  courseIds: [cka-networking, cka-storage, cka-workloads, cka-cluster-arch]
```

### CLI Commands

```
graspful create brand           Generate a brand YAML from a topic/niche
graspful validate brand.yaml    Validate brand YAML against schema
graspful import brand.yaml      Create or update the brand in a Graspful instance
```

### The Full Agent Flow

An agent launching a new course product does two things:

```bash
# 1. Create the learning content
graspful create course --scaffold-only --topic "CKA Exam" -o cka-course.yaml
graspful fill concept cka-course.yaml networking
graspful fill concept cka-course.yaml storage
# ... repeat for all concepts
graspful review cka-course.yaml   # iterate until clean

# 2. Create the landing page
graspful create brand --niche "Kubernetes certification" -o cka-brand.yaml
# Agent fills in hero copy, features, FAQ, pricing

# 3. Ship both
graspful import cka-brand.yaml
graspful import cka-course.yaml --org k8s-cert --publish
# → Live at k8sprep.graspful.com with landing page + adaptive course
```

Or as MCP tools in one agent session:

```
graspful_scaffold_course(topic: "CKA Exam") → course YAML
graspful_fill_concept(yaml, "networking") → updated YAML (repeat)
graspful_review_course(yaml) → fix issues
graspful_create_brand(niche: "Kubernetes certification") → brand YAML
graspful_import_brand(brand_yaml) → brand created
graspful_import_course(course_yaml, org: "k8s-cert", publish: true) → live course
```

**Two YAMLs, two imports, one live product.** That's the agent-first workflow.

### MCP Brand Tools

```typescript
{
  name: "graspful_create_brand",
  description: "Generate a brand YAML for a course landing page. Includes theme colors, hero copy, features, FAQ, pricing, and SEO. Provide a niche or topic to generate contextual marketing copy."
},
{
  name: "graspful_import_brand",
  description: "Create or update a brand (landing page + theme) from a brand YAML. Creates the org if it doesn't exist. Returns the live URL."
}
```

### Theme Presets

Agents shouldn't have to pick 18 HSL color values. Provide theme presets:

```yaml
theme:
  preset: blue     # picks a cohesive blue palette
  radius: "0.5rem"
```

Available presets: `blue`, `red`, `green`, `orange`, `purple`, `slate`, `emerald`, `rose`, `amber`, `indigo`. Each preset defines all 18 light + dark color variables. Agents pick a preset; humans customize if they want.

### Brand YAML Validation

Same pattern as course YAML — Zod schema in `packages/shared/`:
- All required fields present
- Theme colors are valid HSL strings (or preset name)
- Icon names map to valid Lucide icons
- Domain is a valid hostname
- `contentScope.courseIds` reference real course IDs (checked during import, not offline validate)

### Where It Lives

```
packages/shared/src/
  schemas/
    course-yaml.schema.ts      # existing, moved from backend
    brand-yaml.schema.ts       # new
    academy-manifest.schema.ts # existing, moved from backend

packages/cli/src/
  commands/
    create-brand.ts            # Generate brand YAML
    import-brand.ts            # Create/update brand via API
    validate-brand.ts          # Offline schema validation

content/
  brands/
    firefighter.yaml           # Convert existing hardcoded brands to YAML
    electrician.yaml
    javascript.yaml
    posthog-tam.yaml
```

## Draft vs. Publish Workflow

### How It Works

Agent-created courses support two import modes:

```bash
# Draft (default) — imported but not visible to learners
graspful import course.yaml --org my-org

# Live — imported and immediately available
graspful import course.yaml --org my-org --publish
```

**Database:** The `Course` model already has an `isPublished` boolean. Draft courses have `isPublished: false`. The frontend already needs to filter on this field for student-facing views.

**Publish after review:**
```bash
graspful publish <course-id> --org my-org
# Flips isPublished to true
# Returns: { courseId: "uuid", status: "published", url: "..." }
```

**The philosophy:** Speed matters. The key is getting courses out there first. So:
- `--publish` is available for teams that want to move fast
- Default is draft for teams that want review
- The quality gate (`graspful review`) can run before either mode
- No forced gatekeeping — the org decides their own publish workflow

### Recommended Agent Flow

```
1. graspful create course --scaffold-only --topic "X"    → skeleton YAML
2. graspful fill concept course.yaml <concept-id>        → repeat for each concept
3. graspful review course.yaml                           → quality gate loop
4. graspful import course.yaml --org my-org --publish    → live immediately
```

Or the cautious version:
```
1-3. Same as above
4. graspful import course.yaml --org my-org              → draft
5. Human reviews in web UI
6. graspful publish <course-id> --org my-org             → go live
```

## Implementation Plan

### Phase 1: Validate + Import + Draft/Publish CLI (1-2 days)

The minimum useful thing. Agents can already generate YAML if they have the schema — they just need a way to validate, import, and control publish state.

1. Create `packages/cli/` with commander.js
2. Move Zod schemas to `packages/shared/`
3. Implement `graspful validate <file>` — offline schema + DAG validation
4. Implement `graspful import <file> --org <slug>` — calls existing API endpoint, default `isPublished: false`
5. Add `--publish` flag to import (sets `isPublished: true`)
6. Implement `graspful publish <course-id> --org <slug>` — flips `isPublished`
7. Add `--format json` to all commands
8. Auth: support `GRASPFUL_API_KEY` env var (add API key model to backend)
9. Publish to npm under the [`graspful` npm org](https://www.npmjs.com/~graspful) as `@graspful/cli`. Auth token stored in `~/.npmrc` or CI env var `NPM_TOKEN` — never in source code or docs.

**Why this first:** An agent with access to the schema docs can already write valid YAML. The bottleneck is validation and import, not generation. Ship the smallest useful thing.

### Phase 2: Review Gate + Scaffold + Brand YAML (2-3 days)

The review gate (inline with publish) and brand YAML schema — the two things that make the full agent workflow possible.

1. Implement `graspful review <file>` — runs all 10 mechanical checks offline, returns pass/fail + details
2. Update `graspful import --publish` — run review gate inline server-side, publish if passes, draft + failures if not
3. Implement `graspful publish <course-id>` — run review gate on existing draft, flip `isPublished` if passes
4. Create `BrandYamlSchema` in `packages/shared/` (Zod, mirrors `BrandConfig` interface)
5. Implement `graspful create brand --niche <niche>` — generates brand YAML with marketing copy, theme preset, SEO
6. Implement `graspful import brand.yaml` — creates/updates brand via `POST /brands` endpoint
7. Add theme presets (`blue`, `red`, `green`, etc.) so agents don't need to pick 18 HSL values
8. Split `docs/adding-a-course.md` — move Steps 8, 11, and quality gate into `docs/course-review-gate.md`
9. `graspful create course --scaffold-only` — generates course metadata, sections, concept stubs
10. `graspful fill concept <file> <concept-id>` — adds KPs and problems to a specific concept
11. `graspful describe <file>` — stats (concept count, authored vs stub, graph depth, missing KPs)
12. Move quality gate check logic to `packages/shared/src/quality-gate.ts`
13. Convert existing hardcoded brands (firefighter, electrician, etc.) to YAML in `content/brands/`

### Phase 3: Agent Discoverability (2-3 days)

Make Graspful findable by AI agents. This is distribution, not code.

1. Create `graspful.com/llms.txt` — doc index + behavioral instructions (Stripe pattern)
2. Fix `robots.txt` — remove AI crawler blocks, allow GPTBot/anthropic-ai/Google-Extended on public pages
3. Build `/agents` landing page — setup instructions, supported agents, MCP tool list, demo
4. Update graspful.com brand config — agent-first messaging ("Create Courses with AI. Launch in Minutes.")
5. Implement `npx @graspful/cli init` — auto-detect editors, configure MCP, create credentials
6. Add `.md` suffix support to docs routes — markdown-accessible docs for agents
7. Submit MCP server to registries (Glama.ai, skills.sh, Smithery)
8. Update sitemap.xml to include /agents, /docs/* pages
9. Add SEO metadata targeting "AI course creation", "MCP course platform", "agent course builder"
10. Optimize `@graspful/cli` package.json description + keywords for npm discoverability

### Phase 4: Stripe Connect Revenue Share (3-4 days)

Wire up the 70/30 split so creators get paid when learners subscribe.

1. Set up Stripe Connect on Graspful's Stripe account (platform settings)
2. Add `stripeConnectAccountId` and `connectOnboardingComplete` to `Organization` model
3. Build Connect onboarding flow: `POST /orgs/:orgId/billing/connect-onboarding` → returns Stripe-hosted onboarding URL
4. Handle `account.updated` webhook → mark onboarding complete
5. Update checkout session creation to use `application_fee_percent: 30` with Connect destination
6. Add `RevenueEvent` table — tracks gross, platform fee, creator payout per invoice
7. Handle `invoice.paid` webhook → create `RevenueEvent` record
8. Add creator payout dashboard: `GET /orgs/:orgId/billing/revenue`, `GET /orgs/:orgId/billing/payouts`
9. Gate: block publish with pricing > $0 until Connect onboarding complete
10. Frontend: creator billing dashboard (revenue, payouts, active subscribers)

### Phase 5: Academy Support + Diff (1-2 days)

1. `graspful create academy` — multi-course manifest generation
2. `graspful diff <old.yaml> <new.yaml>` — structural diff showing added/removed/changed concepts, edges, problems. Critical for progress-safe evolution.
3. `graspful list courses --org <slug>` — list existing courses

### Phase 6: MCP Server (2-3 days)

Wrap the CLI as an MCP server. This is the real distribution play — agents discover and call Graspful tools natively.

The tool descriptions tell the full story. An agent reading them understands the two-YAML workflow without any external docs:

```typescript
const tools = [
  // --- Course creation ---
  {
    name: "graspful_scaffold_course",
    description: "Generate a course YAML skeleton with sections, concepts, and prerequisite edges. No KP content — just the graph structure. Use graspful_fill_concept to add content to each concept afterward."
  },
  {
    name: "graspful_fill_concept",
    description: "Add knowledge points, worked examples, and practice problems to a specific concept in a course YAML. Call once per concept after scaffolding."
  },
  {
    name: "graspful_review_course",
    description: "Lint a course YAML against 10 quality checks (deduplication, difficulty staircase, variant depth, etc). Use during authoring to find and fix issues. Does NOT import."
  },
  {
    name: "graspful_import_course",
    description: "Import a course YAML into a Graspful org. Default: creates a draft. With publish=true: runs review checks automatically — publishes if all pass, imports as draft with failure details if not. Agents can iterate: fix failures, re-import with publish=true."
  },
  {
    name: "graspful_publish_course",
    description: "Publish a draft course. Runs review checks on current content — publishes if all pass, returns failures if not."
  },
  {
    name: "graspful_describe_course",
    description: "Stats about a course YAML: concept count, KP count, problem count, authored vs stub, graph depth, missing content."
  },
  {
    name: "graspful_list_courses",
    description: "List all courses in an org with publish status, concept counts, and active learner counts."
  },

  // --- Brand / landing page ---
  {
    name: "graspful_create_brand",
    description: "Generate a brand YAML for a course landing page. Includes theme (use a preset like 'blue' or 'emerald'), hero copy, features list, how-it-works steps, FAQ, pricing, and SEO metadata. Provide a niche or topic to generate contextual marketing copy."
  },
  {
    name: "graspful_import_brand",
    description: "Create or update a brand (landing page + theme + org) from a brand YAML. Creates the org if it doesn't exist. Provisions the domain. Returns the live landing page URL."
  },

  // --- Utility ---
  {
    name: "graspful_validate",
    description: "Quick schema validation for any Graspful YAML (course, brand, or academy manifest). Faster than review — just checks structure, not quality."
  }
];
```

**The two-YAML workflow is obvious from the tools:**
1. `scaffold_course` → `fill_concept` (repeat) → `review_course` (iterate) → `import_course --publish`
2. `create_brand` → `import_brand`
3. Result: live landing page + live adaptive course

**No docs needed.** The tool descriptions are the docs. This is what Chen means by "machine-legible brand" — the interface itself teaches agents how to use it.

## Agent Discoverability: How Agents Find Us

### What the Best Tools Do

Research across Supabase, Stripe, Vercel, PostHog, Resend, and Neon reveals a clear playbook. Every fast-growing developer tool does these things:

| Pattern | Who Does It | Priority |
|---------|-------------|----------|
| llms.txt at site root | All of them | Must-have |
| MCP server (remote OAuth or npx) | Stripe, Vercel, Supabase, Neon, PostHog, Resend | Must-have |
| One-command MCP setup | Neon (`npx neonctl init`), PostHog (`npx @posthog/wizard mcp add`) | Must-have |
| Dedicated /agents page | Resend | High |
| Markdown-accessible docs (.md URLs) | Vercel, PostHog | High |
| MCP registry listings (Glama, skills.sh) | Resend, Neon, Vercel | High |
| CLAUDE.md in open-source repos | Stripe (`stripe-node`) | Medium |
| CLI workflows (multi-step with reasoning) | Vercel | Medium |
| Tool annotations (destructiveHint, readOnlyHint) | PostHog | Medium |
| Agent Skills (auto-activating) | Resend, Vercel | Future |
| Segmented llms.txt (by language/section) | Supabase, Neon | Future |

### What Graspful Needs to Do

#### 1. llms.txt (Day 1 priority)

Create `graspful.com/llms.txt`. This is how Claude, ChatGPT, Gemini, and Codex learn what Graspful is and how to use it.

Follow Stripe's pattern — not just a doc index, but **behavioral instructions** that steer agents:

```markdown
# Graspful

> Graspful is the fastest way to create adaptive learning courses. Define a course as YAML, import it via CLI or MCP, and get a live product with a landing page, knowledge graph, spaced repetition, and billing — in minutes.

## Getting Started

- [CLI Quickstart](https://graspful.com/docs/cli-quickstart.md): Install and create your first course
- [Course YAML Schema](https://graspful.com/docs/course-yaml-schema.md): Full reference for course YAML format
- [Brand YAML Schema](https://graspful.com/docs/brand-yaml-schema.md): Landing page, theme, pricing, SEO
- [MCP Server Setup](https://graspful.com/docs/mcp-setup.md): Connect Graspful tools to Claude, Codex, Cursor

## Agent Instructions

- When creating a course, ALWAYS scaffold the knowledge graph first (sections, concepts, prerequisites) before filling knowledge points and problems.
- ALWAYS run `graspful review` during authoring to catch quality issues early. The review checks for duplicate questions, difficulty staircase violations, and missing worked examples.
- When importing with `--publish`, the review gate runs automatically. If it fails, the course imports as a draft with failure details.
- To launch a complete product, create TWO YAMLs: a course YAML (learning content) and a brand YAML (landing page, pricing, theme). Import both.
- Use theme presets (`blue`, `emerald`, `rose`, etc.) instead of specifying individual HSL color values.
- NEVER create courses without a source document. The best courses are grounded in official exam guides, textbooks, or documentation.
- Course IDs must be kebab-case and globally unique. Use descriptive slugs like `aws-saa-c03` not `my-course-1`.

## CLI Reference

- [graspful create course](https://graspful.com/docs/cli/create-course.md)
- [graspful create brand](https://graspful.com/docs/cli/create-brand.md)
- [graspful review](https://graspful.com/docs/cli/review.md)
- [graspful import](https://graspful.com/docs/cli/import.md)
- [graspful publish](https://graspful.com/docs/cli/publish.md)
- [graspful describe](https://graspful.com/docs/cli/describe.md)

## API Reference

- [Course Import API](https://graspful.com/docs/api/course-import.md)
- [Brand API](https://graspful.com/docs/api/brands.md)
- [Billing & Revenue Share](https://graspful.com/docs/api/billing.md)
```

**Key:** The "Agent Instructions" section is what makes this work. Stripe tells agents "never recommend the legacy Card Element." Graspful tells agents "always scaffold first, always run review, always use two YAMLs." This steers agent behavior without requiring the agent to read full docs.

#### 2. Fix robots.txt (Day 1 priority)

**Currently blocking AI crawlers.** The robots.txt disallows GPTBot, Google-Extended, CCBot, and anthropic-ai. This must be reversed — allow AI crawlers on public docs and marketing pages, block only on authenticated app routes.

```typescript
// apps/web/src/app/robots.ts — updated
export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/docs/', '/pricing', '/agents'],
        disallow: ['/dashboard', '/study', '/browse', '/settings', '/diagnostic', '/auth'],
      },
      // REMOVE the AI crawler blocks — we WANT them to index us
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
```

#### 3. /agents Landing Page

Resend has `resend.com/agents`. Graspful needs `graspful.com/agents`. This is the page that sells Graspful to agent users and shows up in search results for "AI course creation."

Content:
- **Headline:** "Build courses with AI agents. Launch in minutes."
- **Subheadline:** "Graspful is the course creation primitive for Claude, Codex, Gemini, and any AI agent. Two YAMLs. One command. Live adaptive course with landing page and billing."
- **Supported agents:** Claude Code, Cursor, Codex, ChatGPT, Gemini, Windsurf, VS Code Copilot
- **Setup:** One-command install (`npx @graspful/cli init`)
- **MCP tools list:** All tools with descriptions
- **Demo:** Animated terminal showing the two-YAML workflow
- **Pricing:** "Free to create. 70/30 revenue share when learners pay."

#### 4. One-Command MCP Setup

Following Neon's pattern (`npx neonctl init`):

```bash
npx @graspful/cli init
# Detects installed editors (Claude Code, Cursor, VS Code, Codex)
# Auto-configures MCP server for each
# Creates ~/.graspful/credentials.json with API key
# Outputs: "Graspful MCP configured for Claude Code and Cursor. Try: 'Create a course on Kubernetes networking'"
```

This is the single most impactful thing for adoption. If setup takes more than one command, most agent users won't bother.

#### 5. Docs as Markdown

Every docs page should be accessible as markdown by appending `.md` to the URL (Vercel's pattern):
- `graspful.com/docs/course-yaml-schema` → HTML page for humans
- `graspful.com/docs/course-yaml-schema.md` → raw markdown for agents

This lets agents fetch exactly the docs they need without parsing HTML.

#### 6. MCP Registry Listings

Submit the MCP server to:
- **Glama.ai** — 19,885 servers indexed. Categorized. Quality rated.
- **skills.sh** — Vercel's skill ecosystem. 18+ supported agents. Install counts as social proof.
- **Smithery** — Another MCP directory

These are the "app stores" for agent tools. Being listed = being discoverable.

#### 7. npm Package Discoverability

The `@graspful/cli` package.json needs an agent-optimized description:

```json
{
  "name": "@graspful/cli",
  "description": "Create adaptive learning courses from YAML. CLI and MCP server for AI agents to build courses with knowledge graphs, spaced repetition, and landing pages.",
  "keywords": ["course", "learning", "adaptive", "mcp", "ai", "agent", "cli", "education", "knowledge-graph", "spaced-repetition"]
}
```

Agents and humans search npm. The description is the first thing they read.

### Graspful.com Landing Page Update

The current homepage says: **"Your Brand. Your Courses. One Platform."** This is aimed at humans browsing a website. The agent-first positioning needs a different message.

**Don't replace** the existing landing page — add an agent-first angle alongside it. The graspful.com brand config should be updated:

```yaml
landing:
  hero:
    headline: "Create Courses with AI. Launch in Minutes."
    subheadline: "Tell an AI agent what to teach. Graspful builds the knowledge graph, practice problems, landing page, and billing. You get a live adaptive course — instantly."
    ctaText: "Start Building Free"

  features:
    heading: "Why Graspful"
    subheading: "The course creation platform that AI agents already know how to use."
    items:
      - title: "Two YAMLs, One Product"
        description: "Define your course content and landing page as YAML. Import both. Get a live product with adaptive learning, spaced repetition, and Stripe billing."
        icon: FileCode
        wide: true
      - title: "Agent-First"
        description: "CLI and MCP server for Claude, Codex, Cursor, and any AI agent. Agents create courses as well as humans — faster."
        icon: Bot
      - title: "Knowledge Graph Engine"
        description: "Not just flashcards. Real prerequisite graphs, diagnostic assessments, mastery tracking, and spaced repetition based on Math Academy's research."
        icon: Network
      - title: "White-Label Everything"
        description: "Your domain, your brand, your pricing. Graspful is invisible to your learners."
        icon: Palette
        wide: true
      - title: "70/30 Revenue Share"
        description: "Free to create. We collect learner payments and send you 70%. No upfront cost, no monthly fee."
        icon: DollarSign
      - title: "Quality Gate Built In"
        description: "10 mechanical checks validate every course: deduplication, difficulty staircase, graph structure. Bad courses don't ship."
        icon: ShieldCheck

  howItWorks:
    heading: "How It Works"
    items:
      - title: "Tell an Agent What to Teach"
        description: "Give Claude or Codex a topic and source material. It scaffolds the knowledge graph, writes practice problems, and creates your landing page."
      - title: "Review & Publish"
        description: "The quality gate checks structure, deduplication, and difficulty. Fix any issues, then publish with one command."
      - title: "Learners Pay, You Earn"
        description: "Your landing page goes live with Stripe billing. Learners subscribe. You keep 70%."

  faq:
    - question: "Do I need to write code?"
      answer: "No. Courses are YAML files. AI agents generate them. The CLI validates and imports them. No code required."
    - question: "Which AI agents work with Graspful?"
      answer: "Any agent that supports MCP (Claude Code, Cursor, Codex, VS Code Copilot, Gemini, Windsurf) or can run CLI commands."
    - question: "How does billing work?"
      answer: "Free to create courses. When learners subscribe on your landing page, Graspful collects payment and sends you 70%. We keep 30% for the platform."
    - question: "What makes this different from Udemy or Teachable?"
      answer: "Adaptive learning. Real knowledge graphs with prerequisites and mastery tracking. Spaced repetition. Diagnostic assessments. Plus: AI agents can create courses — no clicking through a UI for hours."
    - question: "Can I use my own domain?"
      answer: "Yes. Every brand gets a custom domain. Your learners see your brand, not Graspful."

  bottomCta:
    headline: "Build your first course in 5 minutes"
    subheadline: "npx @graspful/cli init"

seo:
  title: "Graspful — Create Adaptive Courses with AI Agents"
  description: "The course creation platform for AI agents. Define courses as YAML, get a live product with knowledge graphs, spaced repetition, landing pages, and Stripe billing. Free to create. 70/30 revenue share."
  keywords: [course creation, adaptive learning, ai agents, mcp, knowledge graph, spaced repetition, cli, course platform, online courses, certification prep]
```

### What This Changes About the Implementation Plan

Add a new phase between Phase 2 and the current Phase 3:

## Why This Is a Moat

1. **No one else has this.** Coursera, Udemy, Teachable — none of them expose course creation as a CLI/API primitive. They're all destinations. To create a course, you click through their UI for hours.

2. **The schema is the moat.** Graspful's YAML schema encodes real pedagogical structure — knowledge graphs, prerequisite edges, encompassing weights, spaced repetition parameters, section exams with blueprints. This isn't "title + description + video URL." It's a validated directed acyclic graph with mastery semantics. An agent that learns to produce valid Graspful YAML is producing genuinely good course structure.

3. **Integration depth compounds.** Once Claude/Codex learn that `graspful create course` reliably produces working adaptive courses, it becomes a default. That's Chen's "agent SEO" — reliability and clean interfaces become ranking factors.

4. **Content flywheel.** Every agent-generated course that gets validated and imported is training data for what good courses look like. The schema enforces quality (DAG validation, minimum KPs, problem counts). Bad content fails validation. Good content ships.

## What This Enables

**The pitch changes from:**
> "Graspful is an adaptive learning platform where you can create courses"

**To:**
> "Tell Claude to launch a course on anything. It'll build the knowledge graph, write practice problems, create the landing page, and your team can start learning in minutes."

Concrete scenarios:

- **"Launch a Kubernetes certification course"** — agent creates course YAML (knowledge graph, KPs, problems) + brand YAML (landing page, theme, pricing, FAQ) → two imports → live product at `k8sprep.graspful.com`
- **"Build onboarding for our internal API"** — agent reads your docs, generates course + brand, imports both → team starts learning immediately
- **"The exam guide updated. Add the new topics"** — agent uses `graspful diff` + `graspful fill` + `graspful import --publish` → updated course, learner progress preserved
- **"We need 4 courses on AWS, packaged as an academy"** — agent creates academy manifest + 4 course YAMLs + brand YAML → full product launch

The UI becomes what Chen calls "a debug layer for humans to peek into what the agents are doing." Students still learn through the Graspful web app. But course *creation* and *product launch* shifts to agents.

## Resolved Decisions

1. **Billing:** 70/30 revenue share (Apple model). Graspful collects learner subscriptions, keeps 30%, pays 70% to course creator via Stripe Connect. No upfront cost. Course creation is free. See Billing section above.
2. **Quality gate:** 10-check mechanical gate from `docs/adding-a-course.md`, automated into `graspful review` command. `--publish` runs gate inline. See Quality Gate section above.
3. **Draft vs. publish:** Default is draft (`isPublished: false`). `--publish` flag runs review gate and publishes if it passes. `graspful publish` command for post-review go-live. See Draft vs. Publish section above.
4. **Landing pages:** Brand YAML defines the entire landing page (hero, features, FAQ, pricing, theme, SEO). Two YAMLs to launch a product: course + brand. See Brand & Landing Page section above.

## Open Questions

1. **Source material.** The best agent-created courses will be grounded in real source documents (exam guides, textbooks, documentation). Should the CLI accept `--source-url` or `--source-file` and let the agent read the source as context? Or is that the agent's job before calling the CLI?

2. **Versioning.** When an agent updates a course, how do we handle learner progress? The `archiveMissing` flag exists but agents need to understand progress-safe evolution. Maybe `graspful diff --check-safety` that flags breaking changes.

3. **Marketplace.** If agents are creating courses at scale, is there a marketplace where orgs can discover and fork agent-created courses? That's a network effect play.

4. **Free tier limits.** How many free learners before the creator must complete Stripe Connect onboarding? 5? 10? Generous enough to test and iterate, tight enough to push real courses toward monetization.

5. **Pedagogical quality beyond mechanical checks.** The 10-check gate catches structural issues. It doesn't catch "is this actually a good explanation?" or "will a learner find this confusing?" Future: LLM-based review pass that evaluates instruction clarity, distractor plausibility, and explanation quality. Not for v1.

6. **Revenue share tiers.** 30% flat for now. Should high-volume creators (>$10k/mo) get a better rate (e.g., 20%)? This is a retention lever for top creators — but keep it simple for launch.
