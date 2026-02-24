# White-Label Architecture Research: Audio Exam Prep SaaS

## The Problem

One codebase. Same features (audio quizzes, progress tracking, spaced repetition). Multiple branded deployments: FirefighterPrep.com, PilotExamAudio.com, ElectricianStudy.com, etc. Each has different colors, logos, copy, content libraries, and domain.

How do you architect this?

---

## Approach 1: Runtime Config/Theme-Driven (Single Deployment)

### How It Works

One Next.js app deployed once. Middleware inspects the incoming request's `Host` header, looks up the tenant config (from DB or config file), and injects the brand's theme, copy, and content references into the app via React Context or server-side props.

```
Request → firefighterprep.com
  → Middleware reads hostname
  → Loads tenant config: { brand: "FirefighterPrep", primaryColor: "#FF4500", logo: "/brands/ff/logo.svg", contentDB: "firefighter" }
  → App renders with that config
```

### Branding Swap

- **Colors/fonts**: CSS custom properties set at the `<html>` level based on tenant config. shadcn/ui and Tailwind both support this natively via `hsl()` CSS variable tokens.
- **Logos/images**: Stored per-tenant in object storage (S3/R2) or a `/public/brands/{tenant}/` directory. Loaded dynamically.
- **Copy**: Tenant config includes marketing copy, taglines, meta descriptions. Stored in DB or JSON config.
- **Content**: Database-level separation. Each tenant has content tagged/scoped by `tenant_id`. Audio files, questions, categories all filtered at query time.

### Pros

- **One deployment**. Simplest ops. One CI/CD pipeline. One Vercel project.
- **Instant new brands**. Adding a new niche = adding a config record + content + domain mapping. No rebuild.
- **Shared infrastructure costs**. One database, one CDN, one monitoring setup.
- **Vercel supports this natively**. The [Platforms Starter Kit](https://vercel.com/templates/next.js/platforms-starter-kit) is built exactly for this pattern, including custom domain management via the Vercel Domains API.

### Cons

- **Blast radius**. A bug or bad deploy affects every brand simultaneously.
- **Performance ceiling**. All tenants share compute. A traffic spike on one brand can affect others (mitigated by edge/serverless but still a concern at scale).
- **Complexity in the codebase**. Lots of conditional logic: `if (tenant === 'firefighter') { ... }`. Gets messy without discipline.
- **SEO limitations**. Slightly harder to do niche-specific static generation at build time since you don't know all tenants' content upfront (solvable with ISR/on-demand revalidation).

### Cost

- **Low**. Single Vercel Pro plan ($20/mo). Custom domains are free on Vercel. Database costs scale with total usage, not per-tenant.
- Estimated: $20-50/mo at early stage across all brands.

### Real-World Examples

- **[Dub.co](https://dub.co)** - Open-source link management. ~900 custom domains, single deployment, built on the Vercel Platforms Starter Kit.
- **[Hashnode](https://hashnode.com)** - Blog platform. Custom domains per user, single codebase.
- **[Cal.com](https://cal.com)** - Scheduling. White-label mode with custom domains.

---

## Approach 2: Build-Time Generation (Separate Builds Per Brand)

### How It Works

Single codebase, but you run `next build` once per brand with different environment variables. Each build produces a standalone deployment optimized for that specific brand.

```
NEXT_PUBLIC_BRAND=firefighter next build → deploy to firefighterprep.com
NEXT_PUBLIC_BRAND=pilot next build → deploy to pilotexamaudio.com
NEXT_PUBLIC_BRAND=electrician next build → deploy to electricianstudy.com
```

### Branding Swap

- **Colors/fonts**: Resolved at build time. Tailwind config reads `NEXT_PUBLIC_BRAND` and applies the right color palette. Or a `brands/{name}/theme.ts` file is imported conditionally.
- **Logos/images**: Copied from `brands/{name}/assets/` into the build.
- **Copy**: JSON files per brand (`brands/firefighter/copy.json`) imported at build time.
- **Content**: Same DB, but the build can pre-render niche-specific landing pages and static content.

### Pros

- **Fully optimized per brand**. Dead code elimination removes other brands' assets. Smaller bundles.
- **Independent deployments**. Deploy firefighter without touching pilot. Reduced blast radius.
- **Better static generation**. Full SSG/ISR for each niche's content since you know the brand at build time.
- **Simple mental model**. Each deployment is "just a Next.js app" with no multi-tenant logic.

### Cons

- **N builds, N deployments**. CI/CD pipeline runs N times. Vercel charges per-project (though Pro allows unlimited projects).
- **Adding a new brand requires a deployment pipeline change**. Not just "add a config row."
- **Drift risk**. If builds get out of sync, users on different brands might experience different versions.
- **More ops overhead**. Monitoring N deployments. N sets of logs. N domains to manage manually.

### Cost

- **Medium**. One Vercel Pro team ($20/mo) supports unlimited projects. But build minutes scale linearly: 10 brands = 10x build minutes. At early stage: $20-100/mo depending on brand count.

### Real-World Examples

- **Many WordPress theme shops** use this model (same theme, different content/config per site).
- **React Native white-label apps** commonly use this (separate binaries per brand from shared code).
- Common in agencies building branded apps for clients from a shared template.

---

## Approach 3: Multi-Tenant SaaS (Single Deployment, Subdomain-Based)

### How It Works

Similar to Approach 1, but tenancy is determined by subdomain rather than fully custom domains. Structure: `firefighter.examaudio.com`, `pilot.examaudio.com`.

```
Request → firefighter.examaudio.com
  → Middleware extracts subdomain "firefighter"
  → Loads tenant config
  → Renders branded experience
```

Later, you can add custom domain mapping on top (firefighterprep.com → CNAME → firefighter.examaudio.com).

### Branding Swap

Same as Approach 1. The only difference is the domain resolution mechanism.

### Pros

- **Simplest DNS setup**. One wildcard DNS record (`*.examaudio.com`) covers all tenants. No per-tenant domain configuration needed to start.
- **Single SSL certificate**. Wildcard cert covers all subdomains.
- **Easiest to start with**. Can upgrade to custom domains later.
- **Shared domain authority** (debatable - see SEO section).

### Cons

- **Less professional branding**. `firefighter.examaudio.com` doesn't look as good as `firefighterprep.com`. For a white-label product, this undermines the "this is YOUR product" illusion.
- **SEO: subdomains are treated as separate sites** by Google. You build no shared domain authority. Each subdomain starts from zero.
- **Customer perception**. B2C exam prep users expect a standalone branded site, not a subdomain of a platform they've never heard of.

### Cost

- **Lowest**. Same as Approach 1. Wildcard domains are free.

### Real-World Examples

- **Shopify** (yourstore.myshopify.com, upgradeable to custom domain)
- **Notion** (team.notion.site)
- **Webflow** (project.webflow.io)

---

## Approach 4: Monorepo with Shared Packages

### How It Works

Turborepo or Nx monorepo with:
- `packages/ui` - Shared component library (buttons, cards, audio player, quiz components)
- `packages/core` - Shared business logic (auth, progress tracking, spaced repetition)
- `packages/config` - Shared configuration utilities
- `apps/firefighter` - Next.js app for FirefighterPrep
- `apps/pilot` - Next.js app for PilotExamAudio
- `apps/electrician` - Next.js app for ElectricianStudy

Each app imports from shared packages but has its own `tailwind.config.ts`, layout, landing page, and content configuration.

```
monorepo/
├── apps/
│   ├── firefighter/    # Full Next.js app
│   ├── pilot/          # Full Next.js app
│   └── electrician/    # Full Next.js app
├── packages/
│   ├── ui/             # Shared React components
│   ├── core/           # Business logic
│   ├── db/             # Database schema + queries
│   └── config/         # Shared types + utilities
└── turbo.json
```

### Branding Swap

- **Colors/fonts**: Each app has its own `tailwind.config.ts` extending a base config from `packages/config`. Full control per brand.
- **Logos/images**: Each app has its own `/public` directory.
- **Copy**: Each app has its own copy/content files or fetches from a shared CMS.
- **Content**: Shared database, but each app's queries are scoped to its niche.

### Pros

- **Maximum flexibility per brand**. Each app can diverge significantly if needed - different landing pages, different features, different layouts.
- **Independent deployments**. Deploy firefighter without touching pilot.
- **Clean architecture**. Shared code is explicitly packaged. No conditional tenant logic polluting components.
- **Turborepo caching**. If `packages/ui` hasn't changed, only the changed app rebuilds. Fast CI.
- **Scales to truly different products**. If "pilot" eventually needs a flight simulator feature that no other brand has, it's trivial to add.

### Cons

- **Highest initial setup cost**. Turborepo + shared packages + TypeScript project references + per-app configs. Non-trivial boilerplate.
- **N deployments to manage**. Same ops overhead as Approach 2.
- **Package versioning complexity**. Internal packages need to stay compatible. Breaking changes in `packages/ui` affect all apps.
- **Overkill for early stage**. If all brands truly share 95%+ of their UI and features, maintaining N separate apps is unnecessary overhead.
- **Developer experience**. Need to understand monorepo tooling. Slower IDE performance with large monorepos.

### Cost

- **Medium-High**. Same Vercel Pro pricing, but more build minutes. Turborepo remote caching ($50/mo on Vercel) becomes worthwhile with 5+ apps. Estimated: $50-150/mo at early stage.

### Real-World Examples

- **Vercel itself** uses a Turborepo monorepo
- **Large design systems** (Shopify Polaris, Adobe Spectrum) use monorepos to share components across apps
- Common pattern at companies like Uber, Airbnb for managing multiple frontend apps

---

## Comparison Matrix

| Factor | Runtime Config | Build-Time Gen | Subdomain Multi-Tenant | Monorepo |
|---|---|---|---|---|
| **Setup complexity** | Low | Low-Medium | Low | High |
| **Ops complexity** | Low (1 deploy) | Medium (N deploys) | Low (1 deploy) | Medium-High (N deploys) |
| **Adding new brand** | Config + content only | New build pipeline | Config + content only | New app package |
| **Brand isolation** | None (shared deploy) | Full | None (shared deploy) | Full |
| **Per-brand flexibility** | Limited | Moderate | Limited | Maximum |
| **SEO per niche** | Great (custom domains) | Great (custom domains) | Weak (subdomains) | Great (custom domains) |
| **Blast radius** | All brands | Single brand | All brands | Single brand |
| **Cost at 5 brands** | ~$30/mo | ~$50/mo | ~$30/mo | ~$80/mo |
| **Cost at 20 brands** | ~$50/mo | ~$150/mo | ~$50/mo | ~$250/mo |
| **Best for** | 90%+ identical brands | Moderate divergence | MVP/prototype | Highly divergent brands |

---

## Component Library: shadcn/ui vs Chakra UI vs Others

### shadcn/ui (Recommended)

**Why it wins for white-labeling:**

1. **You own the code**. Components are copied into your project, not imported from `node_modules`. You can modify any component without forking a library.
2. **CSS variable-based theming**. Uses `hsl()` CSS custom properties out of the box. Swapping a brand's colors = changing ~10 CSS variables.
3. **Tailwind-native**. No CSS-in-JS runtime. Themes resolve at build time (for build-time approach) or via CSS variables (for runtime approach). No flash of unstyled content.
4. **Radix UI primitives underneath**. Accessible, composable, headless. The styling layer is fully yours.
5. **Massive ecosystem**. Most Next.js SaaS starters (Taxonomy, Taxonomy, next-saas-stripe-starter) use shadcn/ui.

**Theming example:**
```css
/* brands/firefighter/theme.css */
:root {
  --primary: 16 100% 50%;        /* fire orange */
  --primary-foreground: 0 0% 100%;
  --secondary: 0 72% 51%;         /* fire red */
  --background: 0 0% 100%;
  --foreground: 222 47% 11%;
  --radius: 0.5rem;
}

/* brands/pilot/theme.css */
:root {
  --primary: 217 91% 60%;         /* sky blue */
  --primary-foreground: 0 0% 100%;
  --secondary: 200 98% 39%;       /* aviation blue */
  --background: 0 0% 100%;
  --foreground: 222 47% 11%;
  --radius: 0.375rem;
}
```

### Chakra UI

- Strong theming system with `extendTheme()`. Good for white-labeling.
- Uses Emotion (CSS-in-JS). Adds runtime overhead. Can cause flash of unstyled content with SSR.
- More opinionated. Harder to make components look "not like Chakra."
- v3 rewrote everything. Migration pain. Ecosystem still catching up.
- Better for teams who want a complete design system out of the box and won't customize deeply.

### MUI (Material UI)

- Powerful theming. `createTheme()` with deep customization.
- But everything looks like Material Design by default. Hard to escape that aesthetic.
- Heaviest bundle. Not ideal for a lightweight audio app.
- Best for enterprise dashboards, not consumer-facing niche products.

### Recommendation: **shadcn/ui + Tailwind CSS**

For a white-label product where each brand needs to feel distinct, shadcn/ui gives you maximum control with minimum overhead. The CSS variable theming is purpose-built for this exact use case.

---

## SEO Strategy: Domains vs Subdomains vs Paths

### Separate Custom Domains (Recommended)

`firefighterprep.com`, `pilotexamaudio.com`, `electricianstudy.com`

**Pros:**
- Each domain can rank independently for niche keywords ("firefighter exam prep", "pilot ground school audio")
- Professional branding. Users trust standalone domains.
- No association between brands (good if one brand gets negative reviews)
- Full control over per-domain SEO: unique title tags, meta descriptions, structured data, sitemaps

**Cons:**
- No shared domain authority. Each domain starts from zero.
- Separate Google Search Console properties per domain.
- More domains to purchase and manage.

**Verdict:** Best for B2C niche products. Each niche is a different market with different keywords. You WANT them to be separate in Google's eyes.

### Subdomains

`firefighter.examaudio.com`, `pilot.examaudio.com`

- Google treats these as separate sites (confirmed by Google).
- No SEO advantage over separate domains.
- Looks less professional to end users.
- Only advantage: easier DNS management.
- **Not recommended** for this use case.

### Path-Based

`examaudio.com/firefighter`, `examaudio.com/pilot`

- Consolidates domain authority under one root domain.
- Good if you want "ExamAudio" to be a known platform brand.
- Bad if you want each niche to feel like its own product.
- **Not recommended** for white-label. Breaks the illusion of independent brands.

### Recommendation: **Separate custom domains**

For niche exam prep products, you want each brand to own its niche in search. `firefighterprep.com` ranking for "firefighter exam prep" is the goal. The domains are cheap ($10-15/year each). The SEO benefit of niche-specific domains is significant.

---

## Landing Page Strategy

### Structure

Each brand needs a landing page that speaks directly to its niche audience. The layout stays the same; the content changes.

**Shared layout (components from `packages/ui` or shared components):**
```
Hero → Features → How It Works → Testimonials → Pricing → FAQ → CTA
```

**Per-brand customization:**
- Hero: Headline, subheadline, hero image (firefighter in gear vs pilot in cockpit)
- Features: Same features, but examples reference the niche ("Master fire behavior questions" vs "Nail your instrument rating oral")
- Testimonials: Real quotes from that niche's users
- FAQ: Niche-specific questions ("Is this aligned to NFPA 1001?" vs "Does this cover FAA written exam topics?")
- Pricing: Same plans, but can be adjusted per niche if needed

### Implementation

```typescript
// lib/brand-config.ts
export const brands = {
  firefighter: {
    name: "FirefighterPrep",
    tagline: "Audio exam prep for firefighter candidates",
    hero: {
      headline: "Pass Your Firefighter Exam. Eyes-Free.",
      subheadline: "Audio-first study system aligned to NFPA standards. Study while you work out, commute, or cook.",
      image: "/brands/firefighter/hero.webp",
    },
    features: [
      { title: "Fire Behavior Deep Dives", description: "..." },
      { title: "NFPA-Aligned Content", description: "..." },
    ],
    testimonials: [...],
    faq: [...],
    seo: {
      title: "FirefighterPrep - Audio Exam Prep for Firefighters",
      description: "Pass your firefighter certification exam with audio-based study...",
    },
  },
  pilot: { ... },
  electrician: { ... },
};
```

This config drives the entire landing page. The React components are generic; the data makes them niche-specific.

---

## Next.js vs Remix for This Use Case

### Next.js (Recommended)

**Why:**

1. **Vercel Platforms Starter Kit**. Purpose-built for multi-tenant/white-label. Middleware, custom domains, edge routing - all first-party supported.
2. **App Router + Server Components**. Tenant config can be loaded server-side with zero client JS. No flash of wrong branding.
3. **ISR (Incremental Static Regeneration)**. Pre-render niche landing pages statically, revalidate on-demand when content changes. Best of static + dynamic.
4. **Ecosystem**. shadcn/ui, next-auth, Prisma, tRPC, Stripe integrations - all battle-tested with Next.js.
5. **Vercel deployment**. Custom domains, edge middleware, analytics, speed insights - all integrated. The platform is built for this exact use case.
6. **Market share**. Hiring, community support, Stack Overflow answers - Next.js dominates React frameworks.

### Remix

- Better mental model for data loading (loaders/actions). Cleaner than Next.js's mixed data-fetching patterns.
- Smaller JS bundles (35% reduction reported by Basecamp).
- But: No equivalent of the Vercel Platforms Starter Kit. Multi-tenant custom domains = DIY.
- No ISR equivalent. Full SSR or nothing.
- Smaller ecosystem. Fewer SaaS-specific libraries and templates.
- Remix is now part of React Router v7. The framework's identity is in flux.

### Verdict: **Next.js**

The Vercel multi-tenant platform support alone is decisive. You'd spend weeks building what Vercel gives you for free. And for a small team building a SaaS, ecosystem maturity matters more than architectural elegance.

---

## Final Recommendation

### For your use case: **Approach 1 (Runtime Config) → Approach 4 (Monorepo) as you scale**

### Phase 1: Launch (0-5 brands)

**Use: Runtime Config/Theme-Driven, Single Deployment**

- Start with the [Vercel Platforms Starter Kit](https://vercel.com/templates/next.js/platforms-starter-kit)
- Next.js App Router + shadcn/ui + Tailwind CSS
- CSS variable theming per brand
- Brand config in database (Postgres via Prisma or Drizzle)
- Content (questions, audio files) scoped by `tenant_id` in the DB
- Custom domains via Vercel Domains API
- One deployment, one CI/CD pipeline, one monitoring setup

**Why:** You're validating product-market fit. You need to move fast. Adding a new niche should take hours (write content, create config, point domain), not days (set up new build pipeline). The Vercel Platforms Starter Kit is literally built for this.

**Tech stack:**
- Next.js 15 (App Router)
- shadcn/ui + Tailwind CSS (theming via CSS variables)
- Postgres (Neon or Supabase) + Prisma/Drizzle
- Vercel (hosting, domains, edge middleware)
- S3/R2 (audio file storage)
- Stripe (payments, per-brand pricing if needed)

**Estimated cost:** $20-50/mo (Vercel Pro + database + storage)

### Phase 2: Scale (5-20+ brands, if brands diverge)

**Migrate to: Monorepo with Shared Packages (only if needed)**

If you find that brands start needing significantly different features, layouts, or content structures, extract shared code into packages and give each brand its own Next.js app in a Turborepo monorepo.

**Triggers to migrate:**
- Brand A needs a feature Brand B doesn't (e.g., flashcards for firefighters, flight sim integration for pilots)
- Landing pages diverge beyond what config can handle
- You want to deploy brands independently (different release cadences)
- A single deployment's blast radius becomes unacceptable

**Most likely outcome:** You won't need Phase 2. Audio exam prep is a focused product. The brands differ in content and branding, not in features. Runtime config will handle 20+ brands without breaking a sweat.

### What NOT to do

- **Don't start with a monorepo**. It's premature optimization. You'll spend weeks on tooling instead of building the product.
- **Don't use subdomains**. For B2C niche products, custom domains are non-negotiable for branding and SEO.
- **Don't use Chakra UI or MUI**. shadcn/ui's CSS variable theming is purpose-built for white-labeling with lower overhead.
- **Don't use Remix**. Next.js + Vercel's multi-tenant platform support is too good to ignore.
- **Don't build separate codebases per brand**. That's a maintenance nightmare from day one.

---

## Sources

- [Next.js Multi-Tenant Guide](https://nextjs.org/docs/app/guides/multi-tenant)
- [Vercel Platforms Starter Kit](https://vercel.com/templates/next.js/platforms-starter-kit)
- [Vercel Multi-Tenant SaaS Documentation](https://vercel.com/docs/multi-tenant)
- [Vercel Domain Management for Multi-Tenant](https://vercel.com/docs/multi-tenant/domain-management)
- [Building Multi-Tenant Applications with Next.js](https://johnkavanagh.co.uk/articles/building-a-multi-tenant-application-with-next-js/)
- [Multi-Tenant Architecture in Next.js: Complete Guide](https://medium.com/@itsamanyadav/multi-tenant-architecture-in-next-js-a-complete-guide-25590c052de0)
- [We Built One Platform That Powers 30+ Brands](https://dev.to/jos_gonalves_fac39f3437/we-built-one-platform-that-powers-30-brands-the-white-label-saas-playbook-445d)
- [White Label Web App With ReactJS](https://medium.com/swlh/white-label-web-app-with-reactjs-and-webpack-bb3a94a83fe6)
- [White-labeling with React](https://www.thereactshow.com/articles/whitelabeling-with-react)
- [shadcn/ui Theming Documentation](https://ui.shadcn.com/docs/theming)
- [shadcn/ui vs Chakra UI vs Material-UI: 2025](https://asepalazhari.com/blog/shadcn-ui-vs-chakra-ui-vs-material-ui-component-battle-2025)
- [React UI Libraries in 2025 Comparison](https://makersden.io/blog/react-ui-libs-2025-comparing-shadcn-radix-mantine-mui-chakra)
- [CSS Variables for React](https://www.joshwcomeau.com/css/css-variables-for-react-devs/)
- [Themes Engine Using CSS Variables and React Context](https://www.freecodecamp.org/news/themes-using-css-variables-and-react-context/)
- [Subdomain vs Subdirectory SEO](https://www.semrush.com/blog/subdomain-vs-subdirectory/)
- [SEO Best Practices: Subdomains vs. Subdirectories](https://blog.cloudflare.com/subdomains-vs-subdirectories-best-practices-workers-part-1/)
- [Next.js vs Remix 2025 Comparison](https://merge.rocks/blog/remix-vs-nextjs-2025-comparison)
- [Next.js vs Remix Developer Guide](https://strapi.io/blog/next-js-vs-remix-2025-developer-framework-comparison-guide)
- [Vercel Pricing Breakdown 2025](https://flexprice.io/blog/vercel-pricing-breakdown)
- [Turborepo Next.js Guide](https://turborepo.dev/docs/guides/frameworks/nextjs)
- [Next.js 15 Build Once, Deploy Many](https://www.learnwithgurpreet.com/posts/nextjs-15-build-once-deploy-many-achieving-environment-agnostic-builds-with-the-app-router)
