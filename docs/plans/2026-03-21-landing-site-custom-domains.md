# Graspful Landing Site + Custom Domain Architecture

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the marketing landing page to match Just Listen's premium design (gradient mesh, bento grid, dark section, animations), add full SEO/AEO infrastructure, and move brand configs from hardcoded files to a database so new brand domains can be provisioned without code deploys.

**Architecture:** The landing page is a single template consumed by all brands via `BrandConfig`. We extend `BrandConfig` with new fields for landing page customization (section headings, CTA copy for bottom section, gradient orb colors). SEO/AEO files (`llms.txt`, enhanced `robots.txt`, JSON-LD `EducationalOccupationalCredential`) are brand-aware route handlers. The domain provisioning system adds a `brands` table in Supabase, an API layer on the NestJS backend for CRUD + Vercel domain API integration, and modifies `resolveBrand()` to query the database with edge caching.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS 4, shadcn/ui, Vitest, Prisma, Supabase (PostgreSQL), Vercel API, PostHog

---

## Phase 1: Premium Landing Page Rebuild

### Task 1: Extend BrandConfig with landing page customization fields

**Files:**
- Modify: `apps/web/src/lib/brand/config.ts`
- Modify: `apps/web/src/lib/brand/defaults.ts`

The current `BrandConfig.landing` only has `hero`, `features`, `howItWorks`, and `faq`. The Just Listen design needs additional section-level copy: a features section heading/subheading, a bottom CTA section heading/subheading, and gradient customization. We also need to make the Features section heading and subheading brand-driven instead of hardcoded.

**Step 1: Update the BrandConfig interface**

In `apps/web/src/lib/brand/config.ts`, replace the `landing` block:

```typescript
  landing: {
    hero: {
      headline: string;
      subheadline: string;
      ctaText: string;
    };
    features: {
      heading: string;
      subheading: string;
      items: Array<{
        title: string;
        description: string;
        icon: string;
        /** Optional: span 2 columns in bento grid. Defaults false. */
        wide?: boolean;
      }>;
    };
    howItWorks: {
      heading: string;
      items: Array<{
        title: string;
        description: string;
      }>;
    };
    faq: Array<{
      question: string;
      answer: string;
    }>;
    bottomCta: {
      headline: string;
      subheadline: string;
    };
  };
```

**Step 2: Update all four brand defaults**

In `apps/web/src/lib/brand/defaults.ts`, update each brand config to match the new shape. For example, for `firefighterBrand`:

```typescript
  landing: {
    hero: {
      headline: "Pass Your Firefighter Exam. Eyes-Free.",
      subheadline:
        "Audio-first adaptive learning for NFPA 1001. Study while you work out, commute, or do chores.",
      ctaText: "Start Studying Free",
    },
    features: {
      heading: "Why Audio Learning Works",
      subheading: "Turn dead time into study time. Learn while your hands and eyes are busy.",
      items: [
        {
          title: "Audio-First Learning",
          description:
            "Listen to exam content anywhere -- at the gym, in the car, on a run. No screen required.",
          icon: "Headphones",
          wide: true,
        },
        {
          title: "Adaptive Engine",
          description:
            "Our AI focuses on what you don't know yet. No wasted time re-studying mastered material.",
          icon: "Brain",
        },
        {
          title: "Spaced Repetition",
          description:
            "Scientifically-timed reviews lock knowledge into long-term memory.",
          icon: "Timer",
        },
        {
          title: "NFPA 1001 Coverage",
          description:
            "Complete coverage of Firefighter I & II certification requirements.",
          icon: "Shield",
          wide: true,
        },
      ],
    },
    howItWorks: {
      heading: "How It Works",
      items: [
        {
          title: "Take a Diagnostic",
          description: "5-minute quiz identifies what you already know and where to focus.",
        },
        {
          title: "Study Adaptively",
          description: "Listen to personalized lessons that target your weak areas first.",
        },
        {
          title: "Pass Your Exam",
          description: "Spaced repetition ensures you retain everything on test day.",
        },
      ],
    },
    faq: [
      // ... same FAQ items as currently exist ...
    ],
    bottomCta: {
      headline: "Ready to Start Studying?",
      subheadline: "Join thousands of candidates who passed their exam with audio-first learning.",
    },
  },
```

Apply the same pattern to `electricianBrand`, `javascriptBrand`, and `posthogBrand` -- keep their existing copy, just restructure into the new shape. Make the first and last feature `wide: true` for visual variety.

**Step 3: Fix all consumers of the old shape**

The landing page (`apps/web/src/app/(marketing)/page.tsx`) passes `brand.landing.features` (was an array, now an object with `items`). Update all props:

```typescript
<Features
  heading={brand.landing.features.heading}
  subheading={brand.landing.features.subheading}
  features={brand.landing.features.items}
/>
<HowItWorks
  heading={brand.landing.howItWorks.heading}
  steps={brand.landing.howItWorks.items}
/>
<CTA
  ctaText={brand.landing.hero.ctaText}
  headline={brand.landing.bottomCta.headline}
  subheadline={brand.landing.bottomCta.subheadline}
/>
```

**Step 4: Run type checker to verify**

Run: `cd /Users/will/github/graspful/apps/web && npx tsc --noEmit`
Expected: No errors (or only pre-existing ones unrelated to brand config)

**Step 5: Ask me for feedback before commit**

**Step 6: Commit**

```bash
git add apps/web/src/lib/brand/config.ts apps/web/src/lib/brand/defaults.ts apps/web/src/app/\(marketing\)/page.tsx
git commit -m "feat(brand): extend BrandConfig landing section with headings, bento grid support, and bottom CTA"
```

---

### Task 2: Rebuild the Nav component to match Just Listen design

**Files:**
- Modify: `apps/web/src/components/marketing/nav.tsx`

The current nav is functional but plain. The Just Listen design uses: sticky top bar, brand name bold left, "Sign in" text link right, gradient pill CTA button right.

**Step 1: Write the failing test**

Create `apps/web/src/components/marketing/__tests__/nav.test.tsx`:

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MarketingNav } from "../nav";
import { BrandProvider } from "@/lib/brand/context";
import { firefighterBrand } from "@/lib/brand/defaults";

function renderNav() {
  return render(
    <BrandProvider brand={firefighterBrand}>
      <MarketingNav />
    </BrandProvider>,
  );
}

describe("MarketingNav", () => {
  it("renders brand name", () => {
    renderNav();
    expect(screen.getByText("FirefighterPrep")).toBeTruthy();
  });

  it("renders Sign In link", () => {
    renderNav();
    const signIn = screen.getByRole("link", { name: /sign in/i });
    expect(signIn).toBeTruthy();
    expect(signIn.getAttribute("href")).toBe("/sign-in");
  });

  it("renders Get Started CTA with gradient pill styling", () => {
    renderNav();
    const cta = screen.getByRole("link", { name: /get started/i });
    expect(cta).toBeTruthy();
    expect(cta.getAttribute("href")).toBe("/sign-up");
    expect(cta.className).toContain("btn-gradient");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/will/github/graspful/apps/web && bun test src/components/marketing/__tests__/nav.test.tsx`
Expected: FAIL -- the CTA currently uses `bg-primary` not `btn-gradient`

**Step 3: Update the Nav component**

Replace `apps/web/src/components/marketing/nav.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useBrand } from "@/lib/brand/context";

export function MarketingNav() {
  const brand = useBrand();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/30 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-foreground tracking-tight">
            {brand.name}
          </span>
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/sign-in"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="btn-gradient px-5 py-2 text-sm font-medium"
          >
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}
```

Key changes: `btn-gradient` on CTA (gradient pill), slightly more transparent backdrop, tighter tracking on brand name.

**Step 4: Run test to verify it passes**

Run: `cd /Users/will/github/graspful/apps/web && bun test src/components/marketing/__tests__/nav.test.tsx`
Expected: PASS

**Step 5: Ask me for feedback before commit**

**Step 6: Commit**

```bash
git add apps/web/src/components/marketing/nav.tsx apps/web/src/components/marketing/__tests__/nav.test.tsx
git commit -m "feat(marketing): rebuild nav with gradient pill CTA matching Just Listen design"
```

---

### Task 3: Rebuild the Hero component with massive typography and 4th orb

**Files:**
- Modify: `apps/web/src/components/marketing/hero.tsx`
- Modify: `apps/web/src/app/globals.css`

The Just Listen hero uses 9xl text on large screens, 4 gradient orbs (we have 3), and a glowing pulse on the CTA.

**Step 1: Write the failing test**

Create `apps/web/src/components/marketing/__tests__/hero.test.tsx`:

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Hero } from "../hero";

describe("Hero", () => {
  const props = {
    headline: "Pass Your Exam. Eyes-Free.",
    subheadline: "Audio-first adaptive learning.",
    ctaText: "Start Studying Free",
  };

  it("renders each word of headline as separate animated span", () => {
    render(<Hero {...props} />);
    const heading = screen.getByRole("heading", { level: 1 });
    const spans = heading.querySelectorAll("span.animate-word-enter");
    expect(spans.length).toBe(5); // "Pass", "Your", "Exam.", "Eyes-Free."
  });

  it("renders CTA with btn-gradient and glow-pulse classes", () => {
    render(<Hero {...props} />);
    const cta = screen.getByRole("link", { name: /start studying free/i });
    expect(cta.className).toContain("btn-gradient");
    expect(cta.className).toContain("glow-pulse");
  });

  it("renders 4 gradient orbs", () => {
    const { container } = render(<Hero {...props} />);
    const orbs = container.querySelectorAll("[class*='orb-']");
    expect(orbs.length).toBe(4);
  });

  it("uses 9xl font size on xl screens", () => {
    const { container } = render(<Hero {...props} />);
    const h1 = container.querySelector("h1");
    expect(h1?.className).toContain("xl:text-9xl");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/will/github/graspful/apps/web && bun test src/components/marketing/__tests__/hero.test.tsx`
Expected: FAIL -- no `glow-pulse` class, no 4th orb, no `xl:text-9xl`

**Step 3: Add orb-4 and glow-pulse CSS**

In `apps/web/src/app/globals.css`, add after the `.gradient-mesh .orb-3` block:

```css
.gradient-mesh .orb-4 {
  @apply absolute -bottom-1/4 -right-1/4 h-[350px] w-[350px] rounded-full opacity-25 blur-3xl;
  background: radial-gradient(circle, color-mix(in hsl, var(--primary), transparent 50%) 0%, transparent 60%);
  animation: float 14s ease-in-out infinite reverse;
}

.glow-pulse {
  box-shadow: 0 0 20px color-mix(in hsl, var(--primary), transparent 50%),
              0 0 60px color-mix(in hsl, var(--primary), transparent 70%);
  animation: glow 3s ease-in-out infinite;
}

@keyframes glow {
  0%, 100% { box-shadow: 0 0 20px color-mix(in hsl, var(--primary), transparent 50%), 0 0 60px color-mix(in hsl, var(--primary), transparent 70%); }
  50% { box-shadow: 0 0 30px color-mix(in hsl, var(--primary), transparent 30%), 0 0 80px color-mix(in hsl, var(--primary), transparent 50%); }
}
```

**Step 4: Update the Hero component**

Replace `apps/web/src/components/marketing/hero.tsx`:

```tsx
import Link from "next/link";

interface HeroProps {
  headline: string;
  subheadline: string;
  ctaText: string;
}

export function Hero({ headline, subheadline, ctaText }: HeroProps) {
  const words = headline.split(" ");

  return (
    <section className="relative min-h-[85vh] flex items-center">
      <div className="gradient-mesh overflow-hidden">
        <div className="orb-1" />
        <div className="orb-2" />
        <div className="orb-3" />
        <div className="orb-4" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-6 py-32 text-center md:py-44">
        <h1 className="text-5xl font-bold leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl xl:text-9xl">
          {words.map((word, i) => (
            <span
              key={`${word}-${i}`}
              className={`inline-block animate-word-enter ${
                i >= words.length - 1 ? "text-gradient" : "text-foreground"
              }`}
              style={{ animationDelay: `${0.15 + i * 0.12}s` }}
            >
              {word}
              {i < words.length - 1 ? <span>&nbsp;</span> : null}
            </span>
          ))}
        </h1>
        <p
          className="animate-fade-up mx-auto mt-8 max-w-xl text-lg leading-relaxed text-muted-foreground md:text-xl"
          style={{ animationDelay: "0.6s" }}
        >
          {subheadline}
        </p>
        <div className="animate-fade-up" style={{ animationDelay: "0.8s" }}>
          <Link
            href="/sign-up"
            className="btn-gradient glow-pulse mt-14 inline-block px-12 py-4 text-base font-medium"
          >
            {ctaText}
          </Link>
        </div>
      </div>
    </section>
  );
}
```

**Step 5: Run test to verify it passes**

Run: `cd /Users/will/github/graspful/apps/web && bun test src/components/marketing/__tests__/hero.test.tsx`
Expected: PASS

**Step 6: Ask me for feedback before commit**

**Step 7: Commit**

```bash
git add apps/web/src/components/marketing/hero.tsx apps/web/src/components/marketing/__tests__/hero.test.tsx apps/web/src/app/globals.css
git commit -m "feat(marketing): hero with 9xl typography, 4th gradient orb, glowing CTA pulse"
```

---

### Task 4: Rebuild Features section as bento grid with cool gray background

**Files:**
- Modify: `apps/web/src/components/marketing/features.tsx`

The Just Listen design uses: cool gray background (#F8FAFC), bento grid (3 columns, some cards span 2), gradient icon backgrounds, hover lift.

**Step 1: Write the failing test**

Create `apps/web/src/components/marketing/__tests__/features.test.tsx`:

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Features } from "../features";

const features = [
  { title: "Audio-First", description: "Listen anywhere.", icon: "Headphones", wide: true },
  { title: "Adaptive", description: "AI focuses on gaps.", icon: "Brain" },
  { title: "Spaced", description: "Timed reviews.", icon: "Timer" },
  { title: "Coverage", description: "Full exam scope.", icon: "Shield", wide: true },
];

describe("Features", () => {
  it("renders section heading and subheading from props", () => {
    render(
      <Features heading="Why It Works" subheading="Turn dead time into study time." features={features} />,
    );
    expect(screen.getByText("Why It Works")).toBeTruthy();
    expect(screen.getByText("Turn dead time into study time.")).toBeTruthy();
  });

  it("renders all feature cards", () => {
    render(
      <Features heading="Why" subheading="Sub" features={features} />,
    );
    expect(screen.getByText("Audio-First")).toBeTruthy();
    expect(screen.getByText("Coverage")).toBeTruthy();
  });

  it("applies wide class to features with wide=true", () => {
    const { container } = render(
      <Features heading="Why" subheading="Sub" features={features} />,
    );
    const wideCards = container.querySelectorAll("[data-wide='true']");
    expect(wideCards.length).toBe(2);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/will/github/graspful/apps/web && bun test src/components/marketing/__tests__/features.test.tsx`
Expected: FAIL -- Features component does not accept `heading`/`subheading` props, no `data-wide` attribute

**Step 3: Rebuild the Features component**

Replace `apps/web/src/components/marketing/features.tsx`:

```tsx
import {
  Headphones,
  Brain,
  Timer,
  Shield,
  BookOpen,
  Zap,
  Code,
  Database,
  Workflow,
  UserCheck,
  type LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  Headphones,
  Brain,
  Timer,
  Shield,
  BookOpen,
  Zap,
  Code,
  Database,
  Workflow,
  UserCheck,
};

interface FeaturesProps {
  heading: string;
  subheading: string;
  features: Array<{
    title: string;
    description: string;
    icon: string;
    wide?: boolean;
  }>;
}

export function Features({ heading, subheading, features }: FeaturesProps) {
  return (
    <section className="bg-[#F8FAFC] py-24 dark:bg-card/50">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-center text-3xl font-bold text-foreground sm:text-4xl mb-4">
          {heading}
        </h2>
        <p className="text-center text-muted-foreground mb-16 max-w-2xl mx-auto text-lg">
          {subheading}
        </p>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = iconMap[feature.icon] || Zap;
            return (
              <div
                key={`${feature.icon}-${feature.title}`}
                data-wide={feature.wide ? "true" : undefined}
                className={`group rounded-2xl border border-border/50 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:bg-card ${
                  feature.wide ? "sm:col-span-2 lg:col-span-2" : ""
                }`}
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `cd /Users/will/github/graspful/apps/web && bun test src/components/marketing/__tests__/features.test.tsx`
Expected: PASS

**Step 5: Ask me for feedback before commit**

**Step 6: Commit**

```bash
git add apps/web/src/components/marketing/features.tsx apps/web/src/components/marketing/__tests__/features.test.tsx
git commit -m "feat(marketing): bento grid features section with cool gray bg and hover lift"
```

---

### Task 5: Rebuild How It Works with dark navy background and animated connecting line

**Files:**
- Modify: `apps/web/src/components/marketing/how-it-works.tsx`
- Modify: `apps/web/src/app/globals.css`

The Just Listen design uses: dark navy background (#0A1628), numbered gradient circles, animated connecting line between steps, subtle gradient mesh overlay.

**Step 1: Write the failing test**

Create `apps/web/src/components/marketing/__tests__/how-it-works.test.tsx`:

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HowItWorks } from "../how-it-works";

const steps = [
  { title: "Take a Diagnostic", description: "Quick quiz." },
  { title: "Study Adaptively", description: "Personalized lessons." },
  { title: "Pass Your Exam", description: "Retain everything." },
];

describe("HowItWorks", () => {
  it("renders heading from props", () => {
    render(<HowItWorks heading="How It Works" steps={steps} />);
    expect(screen.getByText("How It Works")).toBeTruthy();
  });

  it("renders all step titles and descriptions", () => {
    render(<HowItWorks heading="How It Works" steps={steps} />);
    expect(screen.getByText("Take a Diagnostic")).toBeTruthy();
    expect(screen.getByText("Pass Your Exam")).toBeTruthy();
  });

  it("renders step numbers", () => {
    render(<HowItWorks heading="How It Works" steps={steps} />);
    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
  });

  it("uses dark navy background", () => {
    const { container } = render(<HowItWorks heading="How It Works" steps={steps} />);
    const section = container.querySelector("section");
    expect(section?.className).toContain("bg-[#0A1628]");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/will/github/graspful/apps/web && bun test src/components/marketing/__tests__/how-it-works.test.tsx`
Expected: FAIL -- component does not accept `heading` prop, uses `bg-muted/50` not `bg-[#0A1628]`

**Step 3: Add connecting-line animation to globals.css**

In `apps/web/src/app/globals.css`, add:

```css
@keyframes line-grow {
  from { height: 0; }
  to { height: 100%; }
}

.animate-line-grow {
  animation: line-grow 1.5s ease-out forwards;
}
```

**Step 4: Rebuild the HowItWorks component**

Replace `apps/web/src/components/marketing/how-it-works.tsx`:

```tsx
interface HowItWorksProps {
  heading: string;
  steps: Array<{
    title: string;
    description: string;
  }>;
}

export function HowItWorks({ heading, steps }: HowItWorksProps) {
  return (
    <section className="relative bg-[#0A1628] py-24 overflow-hidden">
      {/* Subtle gradient mesh overlay */}
      <div className="gradient-mesh opacity-30">
        <div className="orb-1" />
        <div className="orb-2" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-6">
        <h2 className="text-center text-3xl font-bold text-white sm:text-4xl mb-16">
          {heading}
        </h2>
        <div className="relative">
          {/* Animated connecting line */}
          <div className="absolute left-8 top-0 bottom-0 w-px hidden md:block overflow-hidden">
            <div className="w-full bg-gradient-to-b from-primary via-secondary to-primary animate-line-grow" />
          </div>

          <div className="space-y-12">
            {steps.map((step, i) => (
              <div
                key={`${step.title}-${step.description}`}
                className="flex gap-6 items-start"
              >
                <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-white text-xl font-bold shadow-lg shadow-primary/20">
                  {i + 1}
                </div>
                <div className="pt-2">
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {step.title}
                  </h3>
                  <p className="text-slate-400 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
```

**Step 5: Run test to verify it passes**

Run: `cd /Users/will/github/graspful/apps/web && bun test src/components/marketing/__tests__/how-it-works.test.tsx`
Expected: PASS

**Step 6: Ask me for feedback before commit**

**Step 7: Commit**

```bash
git add apps/web/src/components/marketing/how-it-works.tsx apps/web/src/components/marketing/__tests__/how-it-works.test.tsx apps/web/src/app/globals.css
git commit -m "feat(marketing): how-it-works with dark navy bg, gradient circles, animated line"
```

---

### Task 6: Rebuild Bottom CTA with brand-driven copy

**Files:**
- Modify: `apps/web/src/components/marketing/cta.tsx`

The CTA currently hardcodes "Ready to Start Studying?" and the subheadline. These should come from `BrandConfig.landing.bottomCta`.

**Step 1: Write the failing test**

Create `apps/web/src/components/marketing/__tests__/cta.test.tsx`:

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CTA } from "../cta";

describe("CTA", () => {
  it("renders headline and subheadline from props", () => {
    render(
      <CTA
        ctaText="Start Now"
        headline="Ready?"
        subheadline="Join thousands."
      />,
    );
    expect(screen.getByText("Ready?")).toBeTruthy();
    expect(screen.getByText("Join thousands.")).toBeTruthy();
  });

  it("renders CTA button with correct text", () => {
    render(
      <CTA
        ctaText="Get Started"
        headline="Go"
        subheadline="Sub"
      />,
    );
    const link = screen.getByRole("link", { name: /get started/i });
    expect(link).toBeTruthy();
    expect(link.getAttribute("href")).toBe("/sign-up");
  });

  it("renders free-to-use subtext", () => {
    render(
      <CTA ctaText="Go" headline="H" subheadline="S" />,
    );
    expect(screen.getByText(/free to start/i)).toBeTruthy();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/will/github/graspful/apps/web && bun test src/components/marketing/__tests__/cta.test.tsx`
Expected: FAIL -- CTA does not accept headline/subheadline props, no "free to start" text

**Step 3: Rebuild the CTA component**

Replace `apps/web/src/components/marketing/cta.tsx`:

```tsx
import Link from "next/link";

interface CTAProps {
  ctaText: string;
  headline: string;
  subheadline: string;
}

export function CTA({ ctaText, headline, subheadline }: CTAProps) {
  return (
    <section className="relative overflow-hidden py-24 bg-white dark:bg-background">
      <div className="relative z-10 mx-auto max-w-2xl px-6 text-center">
        <h2 className="text-3xl font-bold text-foreground sm:text-4xl mb-4">
          {headline}
        </h2>
        <p className="text-lg text-muted-foreground mb-2">
          {subheadline}
        </p>
        <p className="text-sm text-muted-foreground/70 mb-10">
          Free to start. No credit card required.
        </p>
        <Link
          href="/sign-up"
          className="btn-gradient glow-pulse inline-block px-12 py-4 text-base font-medium"
        >
          {ctaText}
        </Link>
      </div>
    </section>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `cd /Users/will/github/graspful/apps/web && bun test src/components/marketing/__tests__/cta.test.tsx`
Expected: PASS

**Step 5: Ask me for feedback before commit**

**Step 6: Commit**

```bash
git add apps/web/src/components/marketing/cta.tsx apps/web/src/components/marketing/__tests__/cta.test.tsx
git commit -m "feat(marketing): bottom CTA with brand-driven copy and glow-pulse button"
```

---

### Task 7: Rebuild Footer to match Just Listen minimal style

**Files:**
- Modify: `apps/web/src/components/marketing/footer.tsx`

Just Listen footer: brand name + simple copyright. Clean and minimal.

**Step 1: Write the failing test**

Create `apps/web/src/components/marketing/__tests__/footer.test.tsx`:

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MarketingFooter } from "../footer";
import { BrandProvider } from "@/lib/brand/context";
import { firefighterBrand } from "@/lib/brand/defaults";

describe("MarketingFooter", () => {
  it("renders brand name and tagline", () => {
    render(
      <BrandProvider brand={firefighterBrand}>
        <MarketingFooter />
      </BrandProvider>,
    );
    expect(screen.getByText("FirefighterPrep")).toBeTruthy();
    expect(screen.getByText(firefighterBrand.tagline)).toBeTruthy();
  });

  it("renders copyright with current year", () => {
    render(
      <BrandProvider brand={firefighterBrand}>
        <MarketingFooter />
      </BrandProvider>,
    );
    const year = new Date().getFullYear();
    expect(screen.getByText(new RegExp(`${year}`))).toBeTruthy();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/will/github/graspful/apps/web && bun test src/components/marketing/__tests__/footer.test.tsx`
Expected: May PASS already since footer already has brand name + tagline + year. If so, proceed to Step 3 anyway since we are updating styling.

**Step 3: Update footer styling**

The current footer is fine functionally. Simplify the styling to be more minimal like Just Listen. In `apps/web/src/components/marketing/footer.tsx`:

```tsx
"use client";

import { useBrand } from "@/lib/brand/context";

export function MarketingFooter() {
  const brand = useBrand();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/30 bg-background">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="text-lg font-bold text-foreground tracking-tight">
            {brand.name}
          </span>
          <p className="text-sm text-muted-foreground">
            {brand.tagline}
          </p>
          <p className="text-xs text-muted-foreground/60">
            &copy; {year} {brand.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `cd /Users/will/github/graspful/apps/web && bun test src/components/marketing/__tests__/footer.test.tsx`
Expected: PASS

**Step 5: Ask me for feedback before commit**

**Step 6: Commit**

```bash
git add apps/web/src/components/marketing/footer.tsx apps/web/src/components/marketing/__tests__/footer.test.tsx
git commit -m "feat(marketing): minimal footer matching Just Listen style"
```

---

### Task 8: Wire up the landing page with new component props

**Files:**
- Modify: `apps/web/src/app/(marketing)/page.tsx`

Now that all marketing components have their new interfaces, update the landing page to pass the right props.

**Step 1: Update the landing page**

Replace `apps/web/src/app/(marketing)/page.tsx`:

```tsx
import { resolvePageBrand } from "@/lib/brand/resolve";
import { Hero } from "@/components/marketing/hero";
import { Features } from "@/components/marketing/features";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { FAQ } from "@/components/marketing/faq";
import { PricingSection } from "@/components/marketing/pricing";
import { CTA } from "@/components/marketing/cta";
import { CourseJsonLd, OrganizationJsonLd } from "@/components/seo/json-ld";

export default async function LandingPage() {
  const brand = await resolvePageBrand();

  return (
    <div className="bg-background text-foreground">
      <Hero
        headline={brand.landing.hero.headline}
        subheadline={brand.landing.hero.subheadline}
        ctaText={brand.landing.hero.ctaText}
      />
      <Features
        heading={brand.landing.features.heading}
        subheading={brand.landing.features.subheading}
        features={brand.landing.features.items}
      />
      <HowItWorks
        heading={brand.landing.howItWorks.heading}
        steps={brand.landing.howItWorks.items}
      />
      <PricingSection />
      <FAQ items={brand.landing.faq} />
      <CTA
        ctaText={brand.landing.hero.ctaText}
        headline={brand.landing.bottomCta.headline}
        subheadline={brand.landing.bottomCta.subheadline}
      />
      <CourseJsonLd
        name={`${brand.name} -- Audio Exam Prep`}
        description={brand.seo.description}
        provider={brand.name}
        url={`https://${brand.domain}`}
      />
      <OrganizationJsonLd
        name={brand.name}
        url={`https://${brand.domain}`}
        description={brand.seo.description}
        logoUrl={`https://${brand.domain}${brand.logoUrl}`}
      />
    </div>
  );
}
```

**Step 2: Run type checker**

Run: `cd /Users/will/github/graspful/apps/web && npx tsc --noEmit`
Expected: No type errors related to marketing components

**Step 3: Run all marketing tests**

Run: `cd /Users/will/github/graspful/apps/web && bun test src/components/marketing`
Expected: All tests pass

**Step 4: Visual check**

Run: `cd /Users/will/github/graspful && bun run dev --filter=@graspful/web`
Open `http://localhost:3001` and verify:
- Massive headline with word-by-word animation
- 4 gradient orbs floating behind hero
- Glowing CTA button
- Cool gray features section with bento grid
- Dark navy How It Works section
- Clean white bottom CTA
- Minimal footer

**Step 5: Ask me for feedback before commit**

**Step 6: Commit**

```bash
git add apps/web/src/app/\(marketing\)/page.tsx
git commit -m "feat(marketing): wire landing page to rebuilt components with brand-driven props"
```

---

## Phase 2: SEO + AEO Infrastructure

### Task 9: Add scroll-triggered fade-in animation with Intersection Observer

**Files:**
- Create: `apps/web/src/hooks/use-fade-in-ref.ts`
- Modify: `apps/web/src/app/globals.css`

Many sections should animate in on scroll, not just on page load. This reusable hook handles that.

**Step 1: Write the failing test**

Create `apps/web/src/hooks/__tests__/use-fade-in-ref.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useFadeInRef } from "../use-fade-in-ref";

describe("useFadeInRef", () => {
  let observeMock: ReturnType<typeof vi.fn>;
  let disconnectMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    observeMock = vi.fn();
    disconnectMock = vi.fn();
    vi.stubGlobal(
      "IntersectionObserver",
      vi.fn(() => ({
        observe: observeMock,
        disconnect: disconnectMock,
        unobserve: vi.fn(),
      })),
    );
  });

  it("returns a ref object", () => {
    const { result } = renderHook(() => useFadeInRef());
    expect(result.current).toHaveProperty("current");
  });

  it("creates an IntersectionObserver", () => {
    renderHook(() => useFadeInRef());
    expect(IntersectionObserver).toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/will/github/graspful/apps/web && bun test src/hooks/__tests__/use-fade-in-ref.test.ts`
Expected: FAIL -- module not found

**Step 3: Implement the hook**

Create `apps/web/src/hooks/use-fade-in-ref.ts`:

```typescript
"use client";

import { useEffect, useRef } from "react";

/**
 * Returns a ref to attach to a container element.
 * Children with class `fade-in-section` will animate in when scrolled into view.
 */
export function useFadeInRef<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 },
    );

    const targets = el.querySelectorAll(".fade-in-section");
    targets.forEach((target) => observer.observe(target));

    return () => observer.disconnect();
  }, []);

  return ref;
}
```

**Step 4: Add fade-in-section CSS**

In `apps/web/src/app/globals.css`, add:

```css
.fade-in-section {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.6s ease-out, transform 0.6s ease-out;
}

.fade-in-section.is-visible {
  opacity: 1;
  transform: translateY(0);
}
```

**Step 5: Run test to verify it passes**

Run: `cd /Users/will/github/graspful/apps/web && bun test src/hooks/__tests__/use-fade-in-ref.test.ts`
Expected: PASS

**Step 6: Ask me for feedback before commit**

**Step 7: Commit**

```bash
git add apps/web/src/hooks/use-fade-in-ref.ts apps/web/src/hooks/__tests__/use-fade-in-ref.test.ts apps/web/src/app/globals.css
git commit -m "feat: add useFadeInRef hook for scroll-triggered animations"
```

---

### Task 10: Add EducationalOccupationalCredential JSON-LD + expand existing JSON-LD

**Files:**
- Modify: `apps/web/src/components/seo/json-ld.tsx`
- Modify: `apps/web/src/components/seo/__tests__/json-ld.test.tsx`

The spec calls for `EducationalOccupationalCredential` structured data. Also enrich Course with `educationalLevel` and `teaches`.

**Step 1: Write the failing test**

Add to `apps/web/src/components/seo/__tests__/json-ld.test.tsx`:

```typescript
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { CourseJsonLd, OrganizationJsonLd, CredentialJsonLd } from "../json-ld";

// ... keep existing tests ...

describe("CredentialJsonLd", () => {
  it("renders EducationalOccupationalCredential schema", () => {
    const { container } = render(
      <CredentialJsonLd
        name="NFPA 1001 Firefighter Certification"
        description="Professional certification for firefighters"
        url="https://firefighterprep.audio"
        educationalLevel="Professional"
        credentialCategory="Professional Certification"
      />,
    );
    const scripts = container.querySelectorAll('script[type="application/ld+json"]');
    const data = JSON.parse(scripts[0].textContent!);
    expect(data["@type"]).toBe("EducationalOccupationalCredential");
    expect(data.name).toBe("NFPA 1001 Firefighter Certification");
    expect(data.credentialCategory).toBe("Professional Certification");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/will/github/graspful/apps/web && bun test src/components/seo/__tests__/json-ld.test.tsx`
Expected: FAIL -- `CredentialJsonLd` is not exported

**Step 3: Add CredentialJsonLd component**

Add to `apps/web/src/components/seo/json-ld.tsx`:

```typescript
interface CredentialJsonLdProps {
  name: string;
  description: string;
  url: string;
  educationalLevel: string;
  credentialCategory: string;
}

export function CredentialJsonLd({
  name,
  description,
  url,
  educationalLevel,
  credentialCategory,
}: CredentialJsonLdProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "EducationalOccupationalCredential",
    name,
    description,
    url,
    educationalLevel,
    credentialCategory,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
```

**Step 4: Run test to verify it passes**

Run: `cd /Users/will/github/graspful/apps/web && bun test src/components/seo/__tests__/json-ld.test.tsx`
Expected: PASS

**Step 5: Wire into landing page**

In `apps/web/src/app/(marketing)/page.tsx`, import `CredentialJsonLd` and add it alongside the existing JSON-LD:

```tsx
import { CourseJsonLd, OrganizationJsonLd, CredentialJsonLd } from "@/components/seo/json-ld";

// ... inside the return, after OrganizationJsonLd:
<CredentialJsonLd
  name={`${brand.name} Certification Prep`}
  description={brand.seo.description}
  url={`https://${brand.domain}`}
  educationalLevel="Professional"
  credentialCategory="Professional Certification"
/>
```

**Step 6: Ask me for feedback before commit**

**Step 7: Commit**

```bash
git add apps/web/src/components/seo/json-ld.tsx apps/web/src/components/seo/__tests__/json-ld.test.tsx apps/web/src/app/\(marketing\)/page.tsx
git commit -m "feat(seo): add EducationalOccupationalCredential JSON-LD schema"
```

---

### Task 11: Enhanced robots.txt with AI crawler rules

**Files:**
- Modify: `apps/web/src/app/robots.ts`

Block AI training bots (GPTBot, Google-Extended, CCBot) while allowing retrieval bots (ChatGPT-User, Applebot, Googlebot).

**Step 1: Update robots.ts**

Replace `apps/web/src/app/robots.ts`:

```typescript
import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { resolveBrand } from "@/lib/brand/resolve";

async function getBaseUrl(): Promise<string> {
  try {
    const headersList = await headers();
    const hostname = headersList.get("host") || "";
    if (hostname && hostname !== "localhost") {
      const brand = await resolveBrand(hostname);
      return `https://${brand.domain}`;
    }
  } catch {
    // static export or build time
  }
  return process.env.NEXT_PUBLIC_SITE_URL || "https://firefighterprep.audio";
}

export default async function robots(): Promise<MetadataRoute.Robots> {
  const BASE_URL = await getBaseUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/study",
          "/browse",
          "/settings",
          "/diagnostic",
          "/auth",
        ],
      },
      // Allow retrieval/answer bots
      {
        userAgent: "ChatGPT-User",
        allow: "/",
      },
      {
        userAgent: "Applebot",
        allow: "/",
      },
      // Block training bots
      {
        userAgent: "GPTBot",
        disallow: "/",
      },
      {
        userAgent: "Google-Extended",
        disallow: "/",
      },
      {
        userAgent: "CCBot",
        disallow: "/",
      },
      {
        userAgent: "anthropic-ai",
        disallow: "/",
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
```

**Step 2: Verify by running dev server**

Run: `cd /Users/will/github/graspful && bun run dev --filter=@graspful/web`
Visit `http://localhost:3001/robots.txt` and verify training bots are blocked, retrieval bots are allowed.

**Step 3: Ask me for feedback before commit**

**Step 4: Commit**

```bash
git add apps/web/src/app/robots.ts
git commit -m "feat(seo): block AI training crawlers, allow retrieval bots in robots.txt"
```

---

### Task 12: Add llms.txt route handler for AI engine optimization

**Files:**
- Create: `apps/web/src/app/llms.txt/route.ts`

The `llms.txt` file is an emerging convention for AI-readable site descriptions. It should be a plain text file at the domain root describing the brand/product for LLM retrieval agents.

**Step 1: Write the failing test**

Create `apps/web/src/app/llms.txt/__tests__/route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// We cannot easily test Next.js route handlers with full headers() context,
// so we test the content generation function directly.
import { generateLlmsTxt } from "../route";

describe("generateLlmsTxt", () => {
  it("returns a string containing brand name", () => {
    const result = generateLlmsTxt({
      name: "FirefighterPrep",
      tagline: "Pass Your Firefighter Exam. Eyes-Free.",
      description: "Audio-first adaptive learning for NFPA 1001.",
      domain: "firefighterprep.audio",
      features: ["Audio-First Learning", "Adaptive Engine"],
    });
    expect(result).toContain("FirefighterPrep");
    expect(result).toContain("firefighterprep.audio");
    expect(result).toContain("Audio-First Learning");
  });

  it("uses markdown-like formatting", () => {
    const result = generateLlmsTxt({
      name: "Test",
      tagline: "Tag",
      description: "Desc",
      domain: "test.com",
      features: ["F1"],
    });
    expect(result).toContain("# Test");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/will/github/graspful/apps/web && bun test src/app/llms.txt/__tests__/route.test.ts`
Expected: FAIL -- module not found

**Step 3: Create the route handler**

Create `apps/web/src/app/llms.txt/route.ts`:

```typescript
import { headers } from "next/headers";
import { resolveBrand } from "@/lib/brand/resolve";

export interface LlmsTxtInput {
  name: string;
  tagline: string;
  description: string;
  domain: string;
  features: string[];
}

export function generateLlmsTxt(input: LlmsTxtInput): string {
  const lines = [
    `# ${input.name}`,
    "",
    `> ${input.tagline}`,
    "",
    input.description,
    "",
    `## What ${input.name} Offers`,
    "",
    ...input.features.map((f) => `- ${f}`),
    "",
    `## Links`,
    "",
    `- Website: https://${input.domain}`,
    `- Sign Up: https://${input.domain}/sign-up`,
    `- Pricing: https://${input.domain}/pricing`,
  ];
  return lines.join("\n");
}

export async function GET() {
  const headersList = await headers();
  const hostname = headersList.get("host") || "localhost";
  const cookieHeader = headersList.get("cookie");
  const brand = await resolveBrand(hostname, cookieHeader);

  const content = generateLlmsTxt({
    name: brand.name,
    tagline: brand.tagline,
    description: brand.seo.description,
    domain: brand.domain,
    features: brand.landing.features.items.map((f) => `${f.title}: ${f.description}`),
  });

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
```

**Step 4: Run test to verify it passes**

Run: `cd /Users/will/github/graspful/apps/web && bun test src/app/llms.txt/__tests__/route.test.ts`
Expected: PASS

**Step 5: Update middleware matcher to exclude llms.txt**

In `apps/web/src/middleware.ts`, update the matcher to also exclude `llms.txt`:

```typescript
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|images|icon|api|sitemap\\.xml|robots\\.txt|llms\\.txt).*)",
  ],
};
```

**Step 6: Ask me for feedback before commit**

**Step 7: Commit**

```bash
git add apps/web/src/app/llms.txt/route.ts apps/web/src/app/llms.txt/__tests__/route.test.ts apps/web/src/middleware.ts
git commit -m "feat(seo): add brand-aware llms.txt for AI engine optimization"
```

---

### Task 13: Add landing page PostHog event tracking

**Files:**
- Create: `apps/web/src/components/marketing/tracking.tsx`
- Modify: `apps/web/src/lib/posthog/events.ts`
- Modify: `apps/web/src/app/(marketing)/page.tsx`

Track: CTA clicks, pricing toggle, scroll depth. PostHog is already integrated; we just need to fire events.

**Step 1: Add landing event functions to events.ts**

Add to `apps/web/src/lib/posthog/events.ts`:

```typescript
// ── Landing Page ─────────────────────────────────────────────────────

export function trackLandingCtaClick(location: "hero" | "bottom", brandId: string) {
  if (!isLoaded()) return;
  posthog.capture("landing_cta_clicked", {
    location,
    brand_id: brandId,
  });
}

export function trackLandingPricingToggle(interval: "month" | "year", brandId: string) {
  if (!isLoaded()) return;
  posthog.capture("landing_pricing_toggle", {
    interval,
    brand_id: brandId,
  });
}

export function trackLandingScrollDepth(depth: 25 | 50 | 75 | 100, brandId: string) {
  if (!isLoaded()) return;
  posthog.capture("landing_scroll_depth", {
    depth_percent: depth,
    brand_id: brandId,
  });
}
```

**Step 2: Create scroll depth tracker component**

Create `apps/web/src/components/marketing/tracking.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";
import { useBrand } from "@/lib/brand/context";
import { trackLandingScrollDepth } from "@/lib/posthog/events";

export function ScrollDepthTracker() {
  const brand = useBrand();
  const firedRef = useRef(new Set<number>());

  useEffect(() => {
    function handleScroll() {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight <= 0) return;
      const percent = Math.round((window.scrollY / scrollHeight) * 100);

      const thresholds = [25, 50, 75, 100] as const;
      for (const t of thresholds) {
        if (percent >= t && !firedRef.current.has(t)) {
          firedRef.current.add(t);
          trackLandingScrollDepth(t, brand.id);
        }
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [brand.id]);

  return null;
}
```

**Step 3: Add ScrollDepthTracker to the landing page**

In `apps/web/src/app/(marketing)/page.tsx`, import and add:

```tsx
import { ScrollDepthTracker } from "@/components/marketing/tracking";

// Inside the return, at the end:
<ScrollDepthTracker />
```

**Step 4: Run type checker**

Run: `cd /Users/will/github/graspful/apps/web && npx tsc --noEmit`
Expected: No errors

**Step 5: Ask me for feedback before commit**

**Step 6: Commit**

```bash
git add apps/web/src/lib/posthog/events.ts apps/web/src/components/marketing/tracking.tsx apps/web/src/app/\(marketing\)/page.tsx
git commit -m "feat(analytics): add landing page PostHog tracking (CTA clicks, scroll depth, pricing toggle)"
```

---

### Task 14: Add Open Graph + Twitter Card meta tags to brand metadata

**Files:**
- Modify: `apps/web/src/app/layout.tsx`

The current `generateMetadata` has Open Graph but no Twitter Card. Also ensure `og:type`, `og:locale`, and Twitter `card` / `site` are present.

**Step 1: Update generateMetadata**

In `apps/web/src/app/layout.tsx`, update the `generateMetadata` function:

```typescript
export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const hostname = headersList.get("host") || "localhost";
  const cookieHeader = headersList.get("cookie");
  const brand = await resolveBrand(hostname, cookieHeader);

  return {
    metadataBase: new URL(`https://${brand.domain}`),
    title: brand.seo.title,
    description: brand.seo.description,
    keywords: brand.seo.keywords,
    openGraph: {
      type: "website",
      locale: "en_US",
      title: brand.seo.title,
      description: brand.seo.description,
      siteName: brand.name,
      ...(brand.ogImageUrl ? { images: [{ url: brand.ogImageUrl, width: 1200, height: 630, alt: brand.name }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: brand.seo.title,
      description: brand.seo.description,
      ...(brand.ogImageUrl ? { images: [brand.ogImageUrl] } : {}),
    },
    alternates: {
      canonical: `https://${brand.domain}`,
    },
  };
}
```

**Step 2: Run type checker**

Run: `cd /Users/will/github/graspful/apps/web && npx tsc --noEmit`
Expected: No errors

**Step 3: Ask me for feedback before commit**

**Step 4: Commit**

```bash
git add apps/web/src/app/layout.tsx
git commit -m "feat(seo): add Twitter Card meta, OG locale/siteName, canonical URL"
```

---

## Phase 3: Database-Driven Brand Config

### Task 15: Create Prisma Brand model

**Files:**
- Modify: `backend/prisma/schema.prisma`

Add a `Brand` model that mirrors the `BrandConfig` TypeScript interface. Store theme and landing config as JSON columns for flexibility.

**Step 1: Add Brand model to schema**

Add to `backend/prisma/schema.prisma` after the Organization model:

```prisma
// =============================================================================
// BRANDS (white-label brand configuration)
// =============================================================================

model Brand {
  id          String   @id @default(uuid()) @db.Uuid
  slug        String   @unique
  name        String
  domain      String   @unique
  tagline     String
  logoUrl     String   @map("logo_url")
  faviconUrl  String   @default("/favicon.ico") @map("favicon_url")
  ogImageUrl  String?  @map("og_image_url")
  orgSlug     String   @map("org_slug")
  theme       Json     @default("{}")
  landing     Json     @default("{}")
  seo         Json     @default("{}")
  pricing     Json     @default("{}")
  contentScope Json    @default("{}") @map("content_scope")
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt   DateTime @updatedAt @map("updated_at") @db.Timestamptz

  @@map("brands")
}
```

**Step 2: Generate migration**

Run: `cd /Users/will/github/graspful/backend && npx prisma migrate dev --name add_brands_table`
Expected: Migration created, Prisma client regenerated

**Step 3: Ask me for feedback before commit**

**Step 4: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat(db): add brands table for database-driven brand configuration"
```

---

### Task 16: Create brand seed script

**Files:**
- Create: `backend/prisma/seeds/brands.ts`

Seed the brands table with the existing hardcoded brand configs so the database has data from the start.

**Step 1: Create the seed script**

Create `backend/prisma/seeds/brands.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const brands = [
  {
    slug: "firefighter",
    name: "FirefighterPrep",
    domain: "firefighterprep.audio",
    tagline: "Pass Your Firefighter Exam. Eyes-Free.",
    logoUrl: "/images/logo-firefighter.svg",
    faviconUrl: "/favicon.ico",
    ogImageUrl: "/images/og-firefighter.png",
    orgSlug: "firefighter-prep",
    theme: {
      light: {
        primary: "16 100% 50%",
        primaryForeground: "0 0% 100%",
        secondary: "0 72% 51%",
        secondaryForeground: "0 0% 100%",
        accent: "39 100% 50%",
        accentForeground: "0 0% 0%",
        background: "0 0% 100%",
        foreground: "222 47% 11%",
        card: "0 0% 100%",
        cardForeground: "222 47% 11%",
        popover: "0 0% 100%",
        popoverForeground: "222 47% 11%",
        muted: "30 20% 96%",
        mutedForeground: "25 10% 40%",
        destructive: "0 84% 60%",
        border: "30 20% 90%",
        input: "30 20% 90%",
        ring: "16 100% 50%",
      },
      dark: {
        primary: "16 100% 55%",
        primaryForeground: "0 0% 100%",
        secondary: "0 72% 56%",
        secondaryForeground: "0 0% 100%",
        accent: "39 100% 55%",
        accentForeground: "0 0% 0%",
        background: "222 47% 4%",
        foreground: "210 40% 98%",
        card: "222 47% 6%",
        cardForeground: "210 40% 98%",
        popover: "222 47% 6%",
        popoverForeground: "210 40% 98%",
        muted: "217 33% 17%",
        mutedForeground: "215 20% 65%",
        destructive: "0 63% 31%",
        border: "217 33% 17%",
        input: "217 33% 17%",
        ring: "16 100% 55%",
      },
      radius: "0.5rem",
    },
    // NOTE: landing, seo, pricing, contentScope should be populated
    // from the defaults.ts values for each brand.
    // Keep this seed file as the source of truth for initial data.
    // For brevity, only the firefighter brand's full config is shown here.
    // Replicate for electrician, javascript, posthog.
  },
];

async function seed() {
  for (const brand of brands) {
    await prisma.brand.upsert({
      where: { slug: brand.slug },
      update: brand,
      create: brand,
    });
  }
  console.log(`Seeded ${brands.length} brands`);
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Note: The implementing engineer should copy the full landing, seo, pricing, and contentScope objects from `apps/web/src/lib/brand/defaults.ts` for each of the 4 brands. The structure above shows the pattern.

**Step 2: Run the seed**

Run: `cd /Users/will/github/graspful/backend && npx ts-node --project tsconfig.runtime.json prisma/seeds/brands.ts`
Expected: "Seeded 4 brands"

**Step 3: Verify data**

Run: `cd /Users/will/github/graspful/backend && npx prisma studio`
Open Prisma Studio, check the `brands` table has 4 rows.

**Step 4: Ask me for feedback before commit**

**Step 5: Commit**

```bash
git add backend/prisma/seeds/brands.ts
git commit -m "feat(db): add brand seed script with all 4 existing brand configs"
```

---

### Task 17: Create brand resolution API endpoint on the backend

**Files:**
- Create: `backend/src/brands/brands.module.ts`
- Create: `backend/src/brands/brands.service.ts`
- Create: `backend/src/brands/brands.controller.ts`
- Create: `backend/src/brands/brands.service.spec.ts`
- Modify: `backend/src/app.module.ts`

The frontend middleware needs to query the DB for brand config. This API endpoint returns a brand config by domain hostname.

**Step 1: Write the failing test**

Create `backend/src/brands/brands.service.spec.ts`:

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { BrandsService } from "./brands.service";
import { PrismaService } from "../prisma/prisma.service";

describe("BrandsService", () => {
  let service: BrandsService;
  let prisma: { brand: { findUnique: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      brand: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BrandsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<BrandsService>(BrandsService);
  });

  it("should return brand by domain", async () => {
    const mockBrand = {
      id: "uuid",
      slug: "firefighter",
      name: "FirefighterPrep",
      domain: "firefighterprep.audio",
      isActive: true,
    };
    prisma.brand.findUnique.mockResolvedValue(mockBrand);

    const result = await service.findByDomain("firefighterprep.audio");
    expect(result).toEqual(mockBrand);
    expect(prisma.brand.findUnique).toHaveBeenCalledWith({
      where: { domain: "firefighterprep.audio", isActive: true },
    });
  });

  it("should return null for unknown domain", async () => {
    prisma.brand.findUnique.mockResolvedValue(null);
    const result = await service.findByDomain("unknown.com");
    expect(result).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/will/github/graspful/backend && bun run test -- brands.service`
Expected: FAIL -- module not found

**Step 3: Create BrandsService**

Create `backend/src/brands/brands.service.ts`:

```typescript
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class BrandsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByDomain(domain: string) {
    return this.prisma.brand.findUnique({
      where: { domain, isActive: true },
    });
  }

  async findBySlug(slug: string) {
    return this.prisma.brand.findUnique({
      where: { slug },
    });
  }

  async findAll() {
    return this.prisma.brand.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
  }
}
```

**Step 4: Create BrandsController**

Create `backend/src/brands/brands.controller.ts`:

```typescript
import { Controller, Get, Param, NotFoundException } from "@nestjs/common";
import { BrandsService } from "./brands.service";

@Controller("brands")
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get("by-domain/:domain")
  async getByDomain(@Param("domain") domain: string) {
    const brand = await this.brandsService.findByDomain(domain);
    if (!brand) throw new NotFoundException(`Brand not found for domain: ${domain}`);
    return brand;
  }

  @Get()
  async getAll() {
    return this.brandsService.findAll();
  }
}
```

**Step 5: Create BrandsModule**

Create `backend/src/brands/brands.module.ts`:

```typescript
import { Module } from "@nestjs/common";
import { BrandsService } from "./brands.service";
import { BrandsController } from "./brands.controller";

@Module({
  controllers: [BrandsController],
  providers: [BrandsService],
  exports: [BrandsService],
})
export class BrandsModule {}
```

**Step 6: Register in AppModule**

In `backend/src/app.module.ts`, import and add `BrandsModule` to the `imports` array.

**Step 7: Run test to verify it passes**

Run: `cd /Users/will/github/graspful/backend && bun run test -- brands.service`
Expected: PASS

**Step 8: Ask me for feedback before commit**

**Step 9: Commit**

```bash
git add backend/src/brands/ backend/src/app.module.ts
git commit -m "feat(backend): add brands module with domain-based resolution API"
```

---

### Task 18: Update frontend brand resolution to query database with cache fallback

**Files:**
- Modify: `apps/web/src/lib/brand/resolve.ts`
- Create: `apps/web/src/lib/brand/resolve-db.ts`
- Create: `apps/web/src/lib/brand/__tests__/resolve-db.test.ts`

This is the critical architectural change. The middleware `resolveBrand()` function should:
1. Try to fetch from the backend API (with in-memory cache, 5-min TTL)
2. Fall back to hardcoded defaults if API is unavailable
3. Map the DB response to a `BrandConfig` object

**Step 1: Write the failing test**

Create `apps/web/src/lib/brand/__tests__/resolve-db.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchBrandByDomain, clearBrandCache } from "../resolve-db";

describe("fetchBrandByDomain", () => {
  beforeEach(() => {
    clearBrandCache();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches brand from API and returns BrandConfig", async () => {
    const mockBrand = {
      slug: "firefighter",
      name: "FirefighterPrep",
      domain: "firefighterprep.audio",
      tagline: "Pass Your Exam",
      logoUrl: "/logo.svg",
      faviconUrl: "/favicon.ico",
      ogImageUrl: "/og.png",
      orgSlug: "firefighter-prep",
      theme: { light: {}, dark: {}, radius: "0.5rem" },
      landing: { hero: {}, features: { heading: "", subheading: "", items: [] }, howItWorks: { heading: "", items: [] }, faq: [], bottomCta: { headline: "", subheadline: "" } },
      seo: { title: "", description: "", keywords: [] },
      pricing: { monthly: 14.99, yearly: 149, currency: "USD", trialDays: 7 },
      contentScope: { courseIds: [] },
    };

    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockBrand),
    });

    const result = await fetchBrandByDomain("firefighterprep.audio");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("firefighter");
    expect(result!.name).toBe("FirefighterPrep");
  });

  it("returns null when API returns 404", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const result = await fetchBrandByDomain("unknown.com");
    expect(result).toBeNull();
  });

  it("returns null when API is unreachable", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("ECONNREFUSED"));

    const result = await fetchBrandByDomain("firefighterprep.audio");
    expect(result).toBeNull();
  });

  it("uses cache on subsequent calls", async () => {
    const mockBrand = {
      slug: "firefighter",
      name: "FirefighterPrep",
      domain: "firefighterprep.audio",
      tagline: "Tag",
      logoUrl: "/l.svg",
      faviconUrl: "/f.ico",
      ogImageUrl: null,
      orgSlug: "fp",
      theme: { light: {}, dark: {}, radius: "0.5rem" },
      landing: { hero: {}, features: { heading: "", subheading: "", items: [] }, howItWorks: { heading: "", items: [] }, faq: [], bottomCta: { headline: "", subheadline: "" } },
      seo: { title: "", description: "", keywords: [] },
      pricing: { monthly: 0, yearly: 0, currency: "USD", trialDays: 0 },
      contentScope: { courseIds: [] },
    };

    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockBrand),
    });

    await fetchBrandByDomain("firefighterprep.audio");
    await fetchBrandByDomain("firefighterprep.audio");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/will/github/graspful/apps/web && bun test src/lib/brand/__tests__/resolve-db.test.ts`
Expected: FAIL -- module not found

**Step 3: Create resolve-db.ts**

Create `apps/web/src/lib/brand/resolve-db.ts`:

```typescript
import type { BrandConfig } from "./config";

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  brand: BrandConfig | null;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

export function clearBrandCache() {
  cache.clear();
}

/**
 * Fetch a BrandConfig from the backend API by domain.
 * Returns null if the domain is not found or the API is unreachable.
 * Results are cached in-memory for 5 minutes.
 */
export async function fetchBrandByDomain(domain: string): Promise<BrandConfig | null> {
  const now = Date.now();
  const cached = cache.get(domain);
  if (cached && cached.expiresAt > now) {
    return cached.brand;
  }

  try {
    const res = await fetch(`${BACKEND_URL}/brands/by-domain/${encodeURIComponent(domain)}`, {
      next: { revalidate: 300 }, // Next.js fetch cache: 5 min
    });

    if (!res.ok) {
      cache.set(domain, { brand: null, expiresAt: now + CACHE_TTL_MS });
      return null;
    }

    const data = await res.json();
    const brand: BrandConfig = {
      id: data.slug,
      name: data.name,
      domain: data.domain,
      tagline: data.tagline,
      logoUrl: data.logoUrl,
      faviconUrl: data.faviconUrl,
      ogImageUrl: data.ogImageUrl || "",
      orgSlug: data.orgSlug,
      theme: data.theme,
      landing: data.landing,
      seo: data.seo,
      pricing: data.pricing,
      contentScope: data.contentScope,
    };

    cache.set(domain, { brand, expiresAt: now + CACHE_TTL_MS });
    return brand;
  } catch {
    // API unreachable -- return null, caller falls back to defaults
    return null;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd /Users/will/github/graspful/apps/web && bun test src/lib/brand/__tests__/resolve-db.test.ts`
Expected: PASS

**Step 5: Update resolveBrand to use DB with fallback**

In `apps/web/src/lib/brand/resolve.ts`, update the production path:

```typescript
import { headers } from "next/headers";
import type { BrandConfig } from "./config";
import { defaultBrand, firefighterBrand, electricianBrand, javascriptBrand, posthogBrand } from "./defaults";
import { fetchBrandByDomain } from "./resolve-db";

/** In-memory brand registry -- used as fallback when DB is unavailable. */
const brandsByDomain = new Map<string, BrandConfig>([
  ["firefighterprep.audio", firefighterBrand],
  ["electricianprep.audio", electricianBrand],
  ["jsprep.audio", javascriptBrand],
  ["posthog-tam.audio", posthogBrand],
]);

export const brandsById = new Map<string, BrandConfig>([
  ["firefighter", firefighterBrand],
  ["electrician", electricianBrand],
  ["javascript", javascriptBrand],
  ["posthog", posthogBrand],
]);

export async function resolveBrand(
  hostname: string,
  cookieHeader?: string | null,
): Promise<BrandConfig> {
  const host = hostname.split(":")[0];

  // Development: check cookie override, then env var
  if (host === "localhost" || host === "127.0.0.1") {
    if (cookieHeader) {
      const match = cookieHeader.match(/dev-brand-override=([^;]+)/);
      if (match) {
        const overrideBrand = brandsById.get(match[1]);
        if (overrideBrand) return overrideBrand;
      }
    }

    const devBrandId =
      typeof process !== "undefined"
        ? process.env.DEV_BRAND_ID || "firefighter"
        : "firefighter";
    return brandsById.get(devBrandId) ?? defaultBrand;
  }

  // Production: try database first, fall back to hardcoded
  const dbBrand = await fetchBrandByDomain(host);
  if (dbBrand) return dbBrand;

  return brandsByDomain.get(host) ?? defaultBrand;
}

export async function resolvePageBrand(): Promise<BrandConfig> {
  const headersList = await headers();
  const hostname = headersList.get("host") || "localhost";
  const cookieHeader = headersList.get("cookie");
  return resolveBrand(hostname, cookieHeader);
}
```

**Step 6: Run type checker**

Run: `cd /Users/will/github/graspful/apps/web && npx tsc --noEmit`
Expected: No errors

**Step 7: Ask me for feedback before commit**

**Step 8: Commit**

```bash
git add apps/web/src/lib/brand/resolve.ts apps/web/src/lib/brand/resolve-db.ts apps/web/src/lib/brand/__tests__/resolve-db.test.ts
git commit -m "feat(brand): add database-driven brand resolution with in-memory cache and hardcoded fallback"
```

---

## Phase 4: Automated Domain Provisioning

### Task 19: Create Vercel domain provisioning service

**Files:**
- Create: `backend/src/brands/vercel-domains.service.ts`
- Create: `backend/src/brands/vercel-domains.service.spec.ts`

This service wraps the Vercel API for adding/removing/verifying custom domains.

**Step 1: Write the failing test**

Create `backend/src/brands/vercel-domains.service.spec.ts`:

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { VercelDomainsService } from "./vercel-domains.service";

describe("VercelDomainsService", () => {
  let service: VercelDomainsService;

  beforeEach(async () => {
    global.fetch = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VercelDomainsService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              if (key === "VERCEL_PROJECT_ID") return "prj_123";
              if (key === "VERCEL_TEAM_ID") return "team_123";
              if (key === "VERCEL_API_TOKEN") return "token_123";
              throw new Error(`Unknown key: ${key}`);
            }),
          },
        },
      ],
    }).compile();

    service = module.get<VercelDomainsService>(VercelDomainsService);
  });

  it("should add a domain via Vercel API", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ name: "example.com", verified: false }),
    });

    const result = await service.addDomain("example.com");
    expect(result.name).toBe("example.com");
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/v10/projects/prj_123/domains"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "example.com" }),
      }),
    );
  });

  it("should check domain verification status", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ name: "example.com", verified: true }),
    });

    const result = await service.getDomainStatus("example.com");
    expect(result.verified).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/will/github/graspful/backend && bun run test -- vercel-domains`
Expected: FAIL -- module not found

**Step 3: Implement VercelDomainsService**

Create `backend/src/brands/vercel-domains.service.ts`:

```typescript
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

interface VercelDomainResponse {
  name: string;
  verified: boolean;
  verification?: Array<{
    type: string;
    domain: string;
    value: string;
    reason: string;
  }>;
}

@Injectable()
export class VercelDomainsService {
  private readonly logger = new Logger(VercelDomainsService.name);
  private readonly projectId: string;
  private readonly teamId: string;
  private readonly apiToken: string;
  private readonly baseUrl = "https://api.vercel.com";

  constructor(private readonly config: ConfigService) {
    this.projectId = this.config.getOrThrow("VERCEL_PROJECT_ID");
    this.teamId = this.config.getOrThrow("VERCEL_TEAM_ID");
    this.apiToken = this.config.getOrThrow("VERCEL_API_TOKEN");
  }

  async addDomain(domain: string): Promise<VercelDomainResponse> {
    const url = `${this.baseUrl}/v10/projects/${this.projectId}/domains?teamId=${this.teamId}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: domain }),
    });

    if (!res.ok) {
      const error = await res.text();
      this.logger.error(`Failed to add domain ${domain}: ${error}`);
      throw new Error(`Vercel API error: ${res.status} ${error}`);
    }

    return res.json();
  }

  async removeDomain(domain: string): Promise<void> {
    const url = `${this.baseUrl}/v9/projects/${this.projectId}/domains/${domain}?teamId=${this.teamId}`;
    const res = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${this.apiToken}` },
    });

    if (!res.ok) {
      const error = await res.text();
      this.logger.error(`Failed to remove domain ${domain}: ${error}`);
      throw new Error(`Vercel API error: ${res.status} ${error}`);
    }
  }

  async getDomainStatus(domain: string): Promise<VercelDomainResponse> {
    const url = `${this.baseUrl}/v9/projects/${this.projectId}/domains/${domain}?teamId=${this.teamId}`;
    const res = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${this.apiToken}` },
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Vercel API error: ${res.status} ${error}`);
    }

    return res.json();
  }

  async getDnsInstructions(domain: string): Promise<{
    type: "CNAME" | "A";
    name: string;
    value: string;
  }> {
    // For custom domains, Vercel expects a CNAME to cname.vercel-dns.com
    // For apex domains, an A record to 76.76.21.21
    const isApex = domain.split(".").length === 2;
    if (isApex) {
      return { type: "A", name: "@", value: "76.76.21.21" };
    }
    return { type: "CNAME", name: domain.split(".")[0], value: "cname.vercel-dns.com" };
  }
}
```

**Step 4: Register in BrandsModule**

In `backend/src/brands/brands.module.ts`, add `VercelDomainsService` to providers and exports.

**Step 5: Run test to verify it passes**

Run: `cd /Users/will/github/graspful/backend && bun run test -- vercel-domains`
Expected: PASS

**Step 6: Ask me for feedback before commit**

**Step 7: Commit**

```bash
git add backend/src/brands/vercel-domains.service.ts backend/src/brands/vercel-domains.service.spec.ts backend/src/brands/brands.module.ts
git commit -m "feat(backend): add Vercel domain provisioning service"
```

---

### Task 20: Create brand admin CRUD endpoints with domain provisioning

**Files:**
- Create: `backend/src/brands/dto/create-brand.dto.ts`
- Create: `backend/src/brands/dto/update-brand.dto.ts`
- Modify: `backend/src/brands/brands.controller.ts`
- Modify: `backend/src/brands/brands.service.ts`

Admin endpoints to create/update/delete brands. Creating a brand also provisions the domain on Vercel.

**Step 1: Create DTOs**

Create `backend/src/brands/dto/create-brand.dto.ts`:

```typescript
export class CreateBrandDto {
  slug: string;
  name: string;
  domain: string;
  tagline: string;
  logoUrl: string;
  faviconUrl?: string;
  ogImageUrl?: string;
  orgSlug: string;
  theme: Record<string, unknown>;
  landing: Record<string, unknown>;
  seo: Record<string, unknown>;
  pricing: Record<string, unknown>;
  contentScope?: Record<string, unknown>;
}
```

Create `backend/src/brands/dto/update-brand.dto.ts`:

```typescript
export class UpdateBrandDto {
  name?: string;
  tagline?: string;
  logoUrl?: string;
  faviconUrl?: string;
  ogImageUrl?: string;
  theme?: Record<string, unknown>;
  landing?: Record<string, unknown>;
  seo?: Record<string, unknown>;
  pricing?: Record<string, unknown>;
  contentScope?: Record<string, unknown>;
  isActive?: boolean;
}
```

**Step 2: Add create/update/delete to BrandsService**

Add to `backend/src/brands/brands.service.ts`:

```typescript
import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateBrandDto } from "./dto/create-brand.dto";
import { UpdateBrandDto } from "./dto/update-brand.dto";

@Injectable()
export class BrandsService {
  private readonly logger = new Logger(BrandsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findByDomain(domain: string) {
    return this.prisma.brand.findUnique({
      where: { domain, isActive: true },
    });
  }

  async findBySlug(slug: string) {
    return this.prisma.brand.findUnique({
      where: { slug },
    });
  }

  async findAll() {
    return this.prisma.brand.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
  }

  async create(dto: CreateBrandDto) {
    return this.prisma.brand.create({
      data: {
        slug: dto.slug,
        name: dto.name,
        domain: dto.domain,
        tagline: dto.tagline,
        logoUrl: dto.logoUrl,
        faviconUrl: dto.faviconUrl || "/favicon.ico",
        ogImageUrl: dto.ogImageUrl,
        orgSlug: dto.orgSlug,
        theme: dto.theme,
        landing: dto.landing,
        seo: dto.seo,
        pricing: dto.pricing,
        contentScope: dto.contentScope || {},
      },
    });
  }

  async update(slug: string, dto: UpdateBrandDto) {
    return this.prisma.brand.update({
      where: { slug },
      data: dto,
    });
  }

  async delete(slug: string) {
    return this.prisma.brand.update({
      where: { slug },
      data: { isActive: false },
    });
  }
}
```

**Step 3: Add admin endpoints to BrandsController**

Update `backend/src/brands/brands.controller.ts`:

```typescript
import { Controller, Get, Post, Patch, Delete, Param, Body, NotFoundException } from "@nestjs/common";
import { BrandsService } from "./brands.service";
import { VercelDomainsService } from "./vercel-domains.service";
import { CreateBrandDto } from "./dto/create-brand.dto";
import { UpdateBrandDto } from "./dto/update-brand.dto";

@Controller("brands")
export class BrandsController {
  constructor(
    private readonly brandsService: BrandsService,
    private readonly vercelDomains: VercelDomainsService,
  ) {}

  @Get("by-domain/:domain")
  async getByDomain(@Param("domain") domain: string) {
    const brand = await this.brandsService.findByDomain(domain);
    if (!brand) throw new NotFoundException(`Brand not found for domain: ${domain}`);
    return brand;
  }

  @Get()
  async getAll() {
    return this.brandsService.findAll();
  }

  @Get(":slug")
  async getBySlug(@Param("slug") slug: string) {
    const brand = await this.brandsService.findBySlug(slug);
    if (!brand) throw new NotFoundException(`Brand not found: ${slug}`);
    return brand;
  }

  @Post()
  async create(@Body() dto: CreateBrandDto) {
    // 1. Create brand in database
    const brand = await this.brandsService.create(dto);

    // 2. Provision domain on Vercel
    let vercelDomain = null;
    let dnsInstructions = null;
    try {
      vercelDomain = await this.vercelDomains.addDomain(dto.domain);
      dnsInstructions = await this.vercelDomains.getDnsInstructions(dto.domain);
    } catch (error) {
      // Domain provisioning failed, but brand is created.
      // Return brand with error info so admin can retry.
    }

    return {
      brand,
      vercelDomain,
      dnsInstructions,
    };
  }

  @Patch(":slug")
  async update(@Param("slug") slug: string, @Body() dto: UpdateBrandDto) {
    return this.brandsService.update(slug, dto);
  }

  @Delete(":slug")
  async softDelete(@Param("slug") slug: string) {
    return this.brandsService.delete(slug);
  }

  @Post(":slug/verify-domain")
  async verifyDomain(@Param("slug") slug: string) {
    const brand = await this.brandsService.findBySlug(slug);
    if (!brand) throw new NotFoundException(`Brand not found: ${slug}`);

    const status = await this.vercelDomains.getDomainStatus(brand.domain);
    return {
      domain: brand.domain,
      verified: status.verified,
      verification: status.verification,
    };
  }
}
```

**Step 4: Run type checker**

Run: `cd /Users/will/github/graspful/backend && npx tsc --noEmit`
Expected: No errors

**Step 5: Ask me for feedback before commit**

**Step 6: Commit**

```bash
git add backend/src/brands/
git commit -m "feat(backend): add brand admin CRUD with Vercel domain provisioning"
```

---

### Task 21: Add environment variables documentation

**Files:**
- Create: `docs/plans/env-vars-custom-domains.md`

Document the new environment variables needed for the custom domain system.

**Step 1: Create the documentation**

Create `docs/plans/env-vars-custom-domains.md`:

```markdown
# Environment Variables for Custom Domain System

## Backend (.env)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VERCEL_PROJECT_ID` | Yes | Vercel project ID for domain provisioning | `prj_abc123...` |
| `VERCEL_TEAM_ID` | Yes | Vercel team ID | `team_abc123...` |
| `VERCEL_API_TOKEN` | Yes | Vercel API token (Settings > Tokens) | `bearer_abc...` |

## Frontend (.env.local)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `BACKEND_INTERNAL_URL` | Production | Internal URL for backend (server-to-server) | `http://backend:3000` |
| `NEXT_PUBLIC_BACKEND_URL` | Dev | Public backend URL | `http://localhost:3000` |

## How to get Vercel credentials

1. **Project ID:** Vercel Dashboard > Project > Settings > General > "Project ID"
2. **Team ID:** Vercel Dashboard > Settings > General > "Team ID"
3. **API Token:** Vercel Dashboard > Settings > Tokens > Create Token (scope: project-level)
```

**Step 2: Ask me for feedback before commit**

**Step 3: Commit**

```bash
git add docs/plans/env-vars-custom-domains.md
git commit -m "docs: add environment variables reference for custom domain system"
```

---

### Task 22: Run full test suite and verify integration

**Files:** None (verification only)

**Step 1: Run all frontend tests**

Run: `cd /Users/will/github/graspful/apps/web && bun test`
Expected: All tests pass

**Step 2: Run all backend tests**

Run: `cd /Users/will/github/graspful/backend && bun run test`
Expected: All tests pass

**Step 3: Run type checker for frontend**

Run: `cd /Users/will/github/graspful/apps/web && npx tsc --noEmit`
Expected: No errors

**Step 4: Run type checker for backend**

Run: `cd /Users/will/github/graspful/backend && npx tsc -p tsconfig.build.json --noEmit`
Expected: No errors

**Step 5: Visual smoke test**

Run: `cd /Users/will/github/graspful && bun run dev`
Open `http://localhost:3001` and verify:
- Premium landing page loads with gradient mesh, bento grid, dark section
- Switch brands via dev brand switcher -- each brand has unique colors/copy
- Check `/robots.txt` has AI crawler rules
- Check `/llms.txt` returns brand-specific content
- Check page source for JSON-LD script tags

**Step 6: Ask me for feedback**

---

## Summary of all files touched

### Modified
- `apps/web/src/lib/brand/config.ts` -- Extended landing section of BrandConfig
- `apps/web/src/lib/brand/defaults.ts` -- Restructured all 4 brand defaults
- `apps/web/src/lib/brand/resolve.ts` -- Added DB-first resolution with fallback
- `apps/web/src/components/marketing/nav.tsx` -- Gradient pill CTA
- `apps/web/src/components/marketing/hero.tsx` -- 9xl type, 4 orbs, glow pulse
- `apps/web/src/components/marketing/features.tsx` -- Bento grid with cool gray bg
- `apps/web/src/components/marketing/how-it-works.tsx` -- Dark navy, animated line
- `apps/web/src/components/marketing/cta.tsx` -- Brand-driven copy
- `apps/web/src/components/marketing/footer.tsx` -- Minimal style
- `apps/web/src/app/(marketing)/page.tsx` -- New component props + tracking
- `apps/web/src/app/globals.css` -- Orb-4, glow-pulse, line-grow, fade-in
- `apps/web/src/app/robots.ts` -- AI crawler rules
- `apps/web/src/app/layout.tsx` -- Twitter Card, canonical URL
- `apps/web/src/components/seo/json-ld.tsx` -- CredentialJsonLd
- `apps/web/src/lib/posthog/events.ts` -- Landing event functions
- `apps/web/src/middleware.ts` -- Exclude llms.txt from auth
- `backend/prisma/schema.prisma` -- Brand model
- `backend/src/app.module.ts` -- Register BrandsModule

### Created
- `apps/web/src/lib/brand/resolve-db.ts` -- DB brand fetcher with cache
- `apps/web/src/hooks/use-fade-in-ref.ts` -- Intersection Observer hook
- `apps/web/src/app/llms.txt/route.ts` -- Brand-aware llms.txt endpoint
- `apps/web/src/components/marketing/tracking.tsx` -- Scroll depth tracker
- `backend/src/brands/brands.module.ts`
- `backend/src/brands/brands.service.ts`
- `backend/src/brands/brands.controller.ts`
- `backend/src/brands/vercel-domains.service.ts`
- `backend/src/brands/dto/create-brand.dto.ts`
- `backend/src/brands/dto/update-brand.dto.ts`
- `backend/prisma/seeds/brands.ts`

### Test files created
- `apps/web/src/components/marketing/__tests__/nav.test.tsx`
- `apps/web/src/components/marketing/__tests__/hero.test.tsx`
- `apps/web/src/components/marketing/__tests__/features.test.tsx`
- `apps/web/src/components/marketing/__tests__/how-it-works.test.tsx`
- `apps/web/src/components/marketing/__tests__/cta.test.tsx`
- `apps/web/src/components/marketing/__tests__/footer.test.tsx`
- `apps/web/src/hooks/__tests__/use-fade-in-ref.test.ts`
- `apps/web/src/app/llms.txt/__tests__/route.test.ts`
- `apps/web/src/lib/brand/__tests__/resolve-db.test.ts`
- `backend/src/brands/brands.service.spec.ts`
- `backend/src/brands/vercel-domains.service.spec.ts`

---

## What is NOT in scope (future phases)

- **Admin UI for brand management** (Phase 3 in the spec -- build after API is solid)
- **Self-service brand portal** (Phase 3 -- needs auth, preview, etc.)
- **OG image generation** (per-brand dynamic OG images via `@vercel/og`)
- **A/B testing hero variants** with PostHog feature flags (mentioned in spec, do after baseline is live)
- **Subdomain routing** (brand.graspful.com) -- currently all custom domains; add subdomain tier later

---

## Execution

Plan saved to `docs/plans/2026-03-21-landing-site-custom-domains.md`. Two execution options:

**1. Subagent-Driven (this session)** -- I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** -- Open a new session with executing-plans, batch execution with checkpoints

Which approach?
