# Niche Audio Prep -- Frontend Architecture Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a white-labeled audio exam prep SaaS where one codebase serves multiple branded niche sites (firefighters, pilots, electricians, etc.) with different domains, colors, copy, and content.

**Architecture:** Runtime config, single Vercel deployment. Middleware reads the `Host` header, looks up the tenant/brand from the database, and injects brand config (theme CSS variables, copy, content scope) via React Server Components and CSS custom properties. Every UI component uses shadcn/ui tokens -- swapping a brand means swapping ~15 CSS variables.

**Tech Stack:** Next.js 15 (App Router), React 19, Tailwind CSS 4, shadcn/ui, Vercel (hosting + custom domains), Supabase (auth + DB), PostHog (analytics), IndexedDB (offline audio cache).

**Status:** Phase 7 (Core Shell) Complete — Phase 8 (Learning Experience) Complete — Phase 9 (Audio Pipeline) Complete — Phase 10 (Billing) Complete — Phase 11 (Gamification) Complete — Phase 12 (Launch Prep) Complete — 181 tests passing (35 files)

> **Note:** The web frontend is mobile-responsive. There is no separate native mobile app for the initial release. See future-plans/mobile-plan.md (deferred) for future native app plans.

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [White-Label Theming System](#2-white-label-theming-system)
3. [Tenant Detection and Brand Config](#3-tenant-detection-and-brand-config)
4. [Component Hierarchy](#4-component-hierarchy)
5. [Landing Page Template](#5-landing-page-template)
6. [App Layout and Navigation](#6-app-layout-and-navigation)
7. [Audio Player Evolution](#7-audio-player-evolution)
8. [Content Browser and Study System](#8-content-browser-and-study-system)
9. [State Management](#9-state-management)
10. [SEO Implementation](#10-seo-implementation)
11. [Offline Support](#11-offline-support)
12. [Task Breakdown](#12-task-breakdown)
13. [Self-Improvement Loop (Autoresearch Pattern)](#13-self-improvement-loop-autoresearch-pattern)

---

## 1. Project Structure

```
src/
  app/
    (marketing)/                  # Landing pages (unauthenticated)
      page.tsx                    # Landing page template (reads brand config)
      layout.tsx                  # Marketing layout (nav + footer)
      pricing/page.tsx            # Pricing page
    (app)/                        # Authenticated app
      layout.tsx                  # App shell (sidebar + player bar)
      dashboard/page.tsx          # Study dashboard (home)
      browse/                     # Content browser
        page.tsx                  # Exam list
        [examSlug]/page.tsx       # Topic list for exam
        [examSlug]/[topicSlug]/page.tsx  # Sections + study items
      study/[sessionId]/page.tsx  # Active study session (audio player)
      settings/page.tsx           # User settings
    api/                          # API routes
      tts/route.ts                # TTS synthesis endpoint (from try-listening)
      audio/route.ts              # Audio proxy (from try-listening)
    layout.tsx                    # Root layout (font loading, PostHog)
    globals.css                   # Base styles + shadcn/ui CSS variables
  components/
    ui/                           # shadcn/ui components (Button, Card, etc.)
    marketing/                    # Landing page sections
      hero.tsx
      features.tsx
      how-it-works.tsx
      testimonials.tsx
      pricing-section.tsx
      faq.tsx
      cta.tsx
    app/                          # App-specific components
      player-bar.tsx              # Fixed bottom audio player (evolved from try-listening)
      now-playing-card.tsx        # Currently playing info
      progress-ring.tsx           # Visual progress indicator
      study-card.tsx              # Single study item card
      content-tree.tsx            # Hierarchical content browser
      streak-counter.tsx          # Study streak display
    shared/                       # Used in both marketing + app
      brand-logo.tsx              # Renders brand logo from config
      nav.tsx                     # Brand-aware navigation
      footer.tsx                  # Brand-aware footer
  lib/
    brand/
      config.ts                   # BrandConfig type definition
      context.tsx                 # BrandContext provider + useBrand hook
      defaults.ts                 # Default/fallback brand config
      resolve.ts                  # Resolve brand from hostname
    audio/
      player.ts                   # Audio player logic (evolved from try-listening)
      idb-store.ts                # IndexedDB offline cache (from try-listening)
      media-session.ts            # MediaSession API integration
    content/
      types.ts                    # Exam, Topic, Section, StudyItem types
      queries.ts                  # Server-side data fetching
    supabase/
      client.ts                   # Browser Supabase client
      server.ts                   # Server Supabase client
    constants.ts                  # App-wide constants
    types.ts                      # Shared TypeScript types
  hooks/
    use-audio-player.ts           # Audio player hook (evolved from try-listening)
    use-media-session.ts          # Media Session hook (from try-listening)
    use-offline-audio.ts          # Offline audio hook (from try-listening)
    use-playback-persistence.ts   # Auto-save position (from try-listening)
    use-study-progress.ts         # Progress tracking hook
    use-brand.ts                  # Re-export of useBrand from context
  middleware.ts                   # Tenant detection + auth + brand resolution
```

### Key Differences from try-listening

| Aspect | try-listening | niche-audio-prep |
|---|---|---|
| **Routing** | Single `/app` page | Multi-page: dashboard, browse, study, settings |
| **Content model** | User-submitted URLs/files | Pre-authored exam content (exams > topics > sections > items) |
| **Branding** | Single brand, hardcoded colors | Runtime brand config via CSS variables |
| **Landing page** | Single static page | Templated, data-driven per brand |
| **Middleware** | Auth only | Auth + tenant detection + brand resolution |
| **Layout** | Single page with PlayerBar | Shell layout with sidebar + persistent PlayerBar |
| **Learning UI** | None (audio playback only) | Adaptive learning: diagnostic tests, practice problems, study sessions, knowledge graph visualization |

---

## 2. White-Label Theming System

### Design Principle

Every color in the app comes from a CSS variable. No hardcoded hex values in components. shadcn/ui already uses this pattern -- we extend it to cover brand-specific tokens.

### CSS Variable Schema

The root variables are set by the brand config. shadcn/ui components read from these automatically.

```css
/* src/app/globals.css */
@import "tailwindcss";

@theme {
  /* shadcn/ui token layer -- these are the ONLY color tokens components use */
  --color-background: hsl(var(--background));
  --color-foreground: hsl(var(--foreground));
  --color-primary: hsl(var(--primary));
  --color-primary-foreground: hsl(var(--primary-foreground));
  --color-secondary: hsl(var(--secondary));
  --color-secondary-foreground: hsl(var(--secondary-foreground));
  --color-muted: hsl(var(--muted));
  --color-muted-foreground: hsl(var(--muted-foreground));
  --color-accent: hsl(var(--accent));
  --color-accent-foreground: hsl(var(--accent-foreground));
  --color-destructive: hsl(var(--destructive));
  --color-destructive-foreground: hsl(var(--destructive-foreground));
  --color-card: hsl(var(--card));
  --color-card-foreground: hsl(var(--card-foreground));
  --color-popover: hsl(var(--popover));
  --color-popover-foreground: hsl(var(--popover-foreground));
  --color-border: hsl(var(--border));
  --color-input: hsl(var(--input));
  --color-ring: hsl(var(--ring));
  --radius: var(--brand-radius, 0.5rem);
}

/* Default brand (fallback) -- overridden per-tenant at runtime */
:root {
  --background: 0 0% 100%;
  --foreground: 222 47% 11%;
  --primary: 239 84% 67%;          /* indigo-500 */
  --primary-foreground: 0 0% 100%;
  --secondary: 271 91% 65%;        /* purple-500 */
  --secondary-foreground: 0 0% 100%;
  --muted: 210 40% 96%;
  --muted-foreground: 215 16% 47%;
  --accent: 210 40% 96%;
  --accent-foreground: 222 47% 11%;
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 100%;
  --card: 0 0% 100%;
  --card-foreground: 222 47% 11%;
  --popover: 0 0% 100%;
  --popover-foreground: 222 47% 11%;
  --border: 214 32% 91%;
  --input: 214 32% 91%;
  --ring: 239 84% 67%;
  --brand-radius: 0.5rem;
}

.dark {
  --background: 222 47% 4%;
  --foreground: 210 40% 98%;
  --primary: 239 84% 67%;
  --primary-foreground: 0 0% 100%;
  --secondary: 271 91% 65%;
  --secondary-foreground: 0 0% 100%;
  --muted: 217 33% 17%;
  --muted-foreground: 215 20% 65%;
  --accent: 217 33% 17%;
  --accent-foreground: 210 40% 98%;
  --destructive: 0 63% 31%;
  --destructive-foreground: 0 0% 100%;
  --card: 222 47% 6%;
  --card-foreground: 210 40% 98%;
  --popover: 222 47% 6%;
  --popover-foreground: 210 40% 98%;
  --border: 217 33% 17%;
  --input: 217 33% 17%;
  --ring: 239 84% 67%;
}
```

### BrandConfig Type

```typescript
// src/lib/brand/config.ts

export interface BrandConfig {
  /** Unique slug: "firefighter", "pilot", "electrician" */
  id: string;

  /** Display name: "FirefighterPrep" */
  name: string;

  /** Custom domain: "firefighterprep.audio" */
  domain: string;

  /** Tagline for header/meta */
  tagline: string;

  /** Logo URL (stored in R2/S3 per brand) */
  logoUrl: string;

  /** Favicon URL */
  faviconUrl: string;

  /** OG image URL */
  ogImageUrl: string;

  /** Theme -- HSL values without hsl() wrapper */
  theme: {
    light: {
      primary: string;           // e.g. "16 100% 50%" (fire orange)
      primaryForeground: string;
      secondary: string;
      secondaryForeground: string;
      accent: string;
      accentForeground: string;
      background: string;
      foreground: string;
      card: string;
      cardForeground: string;
      muted: string;
      mutedForeground: string;
      border: string;
      ring: string;
    };
    dark: {
      primary: string;
      primaryForeground: string;
      secondary: string;
      secondaryForeground: string;
      accent: string;
      accentForeground: string;
      background: string;
      foreground: string;
      card: string;
      cardForeground: string;
      muted: string;
      mutedForeground: string;
      border: string;
      ring: string;
    };
    radius: string;              // e.g. "0.5rem"
  };

  /** Landing page content */
  landing: {
    hero: {
      headline: string;          // "Pass Your Firefighter Exam. Eyes-Free."
      subheadline: string;
      ctaText: string;           // "Start Studying"
    };
    features: Array<{
      title: string;
      description: string;
      icon: string;              // Lucide icon name
    }>;
    howItWorks: Array<{
      title: string;
      description: string;
    }>;
    testimonials: Array<{
      name: string;
      role: string;              // "Firefighter Candidate, TX"
      quote: string;
      avatarUrl?: string;
    }>;
    faq: Array<{
      question: string;
      answer: string;
    }>;
  };

  /** SEO metadata */
  seo: {
    title: string;
    description: string;
    keywords: string[];
  };

  /** Content scope -- which exams this brand serves */
  contentScope: {
    examIds: string[];           // DB IDs of exams available to this brand
  };

  /** Pricing (can differ per brand) */
  pricing: {
    monthly: number;
    yearly: number;
    currency: string;
    trialDays: number;
  };
}
```

### How Brand Theme Gets Applied

The brand's CSS variables are injected as a `<style>` tag in the root layout, rendered server-side. No flash of wrong theme.

```typescript
// src/lib/brand/theme-style.tsx
// Server component -- generates inline <style> from brand config

import type { BrandConfig } from "./config";

export function BrandThemeStyle({ brand }: { brand: BrandConfig }) {
  const lightVars = Object.entries(brand.theme.light)
    .map(([key, value]) => {
      // Convert camelCase to kebab-case CSS variable
      const cssVar = key.replace(/([A-Z])/g, "-$1").toLowerCase();
      return `--${cssVar}: ${value};`;
    })
    .join("\n    ");

  const darkVars = Object.entries(brand.theme.dark)
    .map(([key, value]) => {
      const cssVar = key.replace(/([A-Z])/g, "-$1").toLowerCase();
      return `--${cssVar}: ${value};`;
    })
    .join("\n    ");

  const css = `
    :root {
      ${lightVars}
      --brand-radius: ${brand.theme.radius};
    }
    .dark {
      ${darkVars}
    }
  `;

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
```

### Example Brand Configs

```typescript
// For reference during development -- these will live in the DB

const firefighterBrand: Partial<BrandConfig> = {
  id: "firefighter",
  name: "FirefighterPrep",
  domain: "firefighterprep.audio",
  theme: {
    light: {
      primary: "16 100% 50%",        // fire orange
      primaryForeground: "0 0% 100%",
      secondary: "0 72% 51%",         // fire red
      secondaryForeground: "0 0% 100%",
      accent: "39 100% 50%",          // amber
      accentForeground: "0 0% 0%",
      background: "0 0% 100%",
      foreground: "222 47% 11%",
      card: "0 0% 100%",
      cardForeground: "222 47% 11%",
      muted: "30 20% 96%",
      mutedForeground: "25 10% 40%",
      border: "30 20% 90%",
      ring: "16 100% 50%",
    },
    dark: { /* ... dark mode equivalents ... */ },
    radius: "0.5rem",
  },
};

const pilotBrand: Partial<BrandConfig> = {
  id: "pilot",
  name: "PilotExamAudio",
  domain: "pilotcodes.audio",
  theme: {
    light: {
      primary: "217 91% 60%",         // sky blue
      primaryForeground: "0 0% 100%",
      secondary: "200 98% 39%",       // aviation blue
      secondaryForeground: "0 0% 100%",
      /* ... */
    },
    dark: { /* ... */ },
    radius: "0.375rem",
  },
};
```

---

## 3. Tenant Detection and Brand Config

### Middleware Flow

```
1. Request arrives at firefighterprep.audio/app/dashboard
2. Middleware reads Host header -> "firefighterprep.audio"
3. Looks up brand config from DB (cached in-memory + edge KV)
4. Sets X-Brand-Id header on the request
5. Checks auth (Supabase session refresh)
6. Routes appropriately (unauthenticated -> landing, authenticated -> app)
```

### Middleware Implementation

```typescript
// src/middleware.ts

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { resolveBrand } from "@/lib/brand/resolve";

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";

  // 1. Resolve brand from hostname
  const brand = await resolveBrand(hostname);
  // brand is null only if hostname is completely unknown -> 404

  // 2. Clone response and attach brand ID as header for downstream use
  let response = NextResponse.next({ request });
  if (brand) {
    response.headers.set("x-brand-id", brand.id);
    // Also set as a cookie so client components can read it
    response.cookies.set("brand-id", brand.id, {
      httpOnly: false,
      secure: true,
      sameSite: "lax",
      path: "/",
    });
  }

  // 3. Supabase auth (same pattern as try-listening)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          if (brand) {
            response.headers.set("x-brand-id", brand.id);
            response.cookies.set("brand-id", brand.id, {
              httpOnly: false, secure: true, sameSite: "lax", path: "/",
            });
          }
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // 4. Auth routing
  const pathname = request.nextUrl.pathname;
  const isPublicRoute = pathname === "/" ||
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/auth/callback") ||
    pathname.startsWith("/pricing");

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|icon|api).*)",
  ],
};
```

### Brand Resolution with Caching

```typescript
// src/lib/brand/resolve.ts

import type { BrandConfig } from "./config";
import { defaultBrand } from "./defaults";

// In-memory cache (survives across requests in the same worker)
const brandCache = new Map<string, { brand: BrandConfig; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function resolveBrand(hostname: string): Promise<BrandConfig> {
  // Strip port for local dev
  const host = hostname.split(":")[0];

  // Check cache
  const cached = brandCache.get(host);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.brand;
  }

  // Development fallback: localhost -> default brand
  if (host === "localhost" || host === "127.0.0.1") {
    const devBrandId = process.env.DEV_BRAND_ID || "firefighter";
    // Fetch from DB by ID instead of hostname
    const brand = await fetchBrandById(devBrandId);
    if (brand) {
      brandCache.set(host, { brand, expiresAt: Date.now() + CACHE_TTL_MS });
      return brand;
    }
    return defaultBrand;
  }

  // Fetch from DB by hostname
  const brand = await fetchBrandByDomain(host);
  if (brand) {
    brandCache.set(host, { brand, expiresAt: Date.now() + CACHE_TTL_MS });
    return brand;
  }

  // Fallback to default
  return defaultBrand;
}

async function fetchBrandByDomain(domain: string): Promise<BrandConfig | null> {
  // Supabase query: SELECT * FROM brands WHERE domain = $1
  // Implementation depends on DB schema -- placeholder
  return null;
}

async function fetchBrandById(id: string): Promise<BrandConfig | null> {
  // Supabase query: SELECT * FROM brands WHERE id = $1
  return null;
}
```

### React Context for Client Components

```typescript
// src/lib/brand/context.tsx
"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { BrandConfig } from "./config";
import { defaultBrand } from "./defaults";

const BrandContext = createContext<BrandConfig>(defaultBrand);

export function BrandProvider({
  brand,
  children,
}: {
  brand: BrandConfig;
  children: ReactNode;
}) {
  return (
    <BrandContext.Provider value={brand}>{children}</BrandContext.Provider>
  );
}

export function useBrand(): BrandConfig {
  return useContext(BrandContext);
}
```

### Root Layout Wiring

```typescript
// src/app/layout.tsx

import { Inter } from "next/font/google";
import { headers } from "next/headers";
import { BrandProvider } from "@/lib/brand/context";
import { BrandThemeStyle } from "@/lib/brand/theme-style";
import { resolveBrand } from "@/lib/brand/resolve";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const hostname = headersList.get("host") || "localhost";
  const brand = await resolveBrand(hostname);

  return (
    <html lang="en" className={inter.variable}>
      <head>
        <BrandThemeStyle brand={brand} />
        <link rel="icon" href={brand.faviconUrl} />
      </head>
      <body className="min-h-screen bg-background text-foreground">
        <BrandProvider brand={brand}>{children}</BrandProvider>
      </body>
    </html>
  );
}
```

---

## 4. Component Hierarchy

### Marketing Pages (Unauthenticated)

```
RootLayout (brand theme injected)
  MarketingLayout
    Nav (brand logo, CTA)
    [Page Content]
      LandingPage
        Hero (brand.landing.hero)
        Features (brand.landing.features)
        HowItWorks (brand.landing.howItWorks)
        Testimonials (brand.landing.testimonials)
        PricingSection (brand.pricing)
        FAQ (brand.landing.faq)
        CTA
    Footer (brand name, links)
```

### App Pages (Authenticated)

```
RootLayout (brand theme injected)
  AppLayout
    Sidebar
      BrandLogo
      NavLinks (Dashboard, Browse, Settings)
      StudyStreak
      UserMenu
    Main
      [Page Content]
        DashboardPage
          ProgressOverview
          RecommendedNext
          RecentActivity
          StreakCounter
        BrowsePage
          ExamList -> TopicList -> SectionList -> StudyItemList
        StudyPage
          NowPlayingCard
          ContentView (text + audio sync)
          ProgressIndicator
        SettingsPage
          VoicePreference
          PlaybackSpeedDefault
          ThemeToggle
          NotificationPrefs
    PlayerBar (persistent, fixed bottom -- evolved from try-listening)
```

### Component Design Rules

1. **No hardcoded colors.** Every component uses Tailwind classes that map to CSS variables: `bg-primary`, `text-foreground`, `border-border`.
2. **No brand-specific conditionals in components.** Components are generic. Brand-specific content comes from the BrandConfig data, not `if (brand === "firefighter")`.
3. **Server components by default.** Only add `"use client"` when the component needs interactivity (player controls, forms, state).
4. **Composition over props explosion.** Use children and slots instead of 20 optional props.

---

## 5. Landing Page Template

### Architecture

One `page.tsx` that renders all landing page sections using data from `BrandConfig.landing`. The layout is fixed; the content changes per brand.

```typescript
// src/app/(marketing)/page.tsx

import { headers } from "next/headers";
import { resolveBrand } from "@/lib/brand/resolve";
import { Hero } from "@/components/marketing/hero";
import { Features } from "@/components/marketing/features";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { Testimonials } from "@/components/marketing/testimonials";
import { PricingSection } from "@/components/marketing/pricing-section";
import { FAQ } from "@/components/marketing/faq";
import { CTA } from "@/components/marketing/cta";

export default async function LandingPage() {
  const headersList = await headers();
  const hostname = headersList.get("host") || "localhost";
  const brand = await resolveBrand(hostname);

  return (
    <div className="bg-background text-foreground">
      <Hero
        headline={brand.landing.hero.headline}
        subheadline={brand.landing.hero.subheadline}
        ctaText={brand.landing.hero.ctaText}
      />
      <Features features={brand.landing.features} />
      <HowItWorks steps={brand.landing.howItWorks} />
      <Testimonials testimonials={brand.landing.testimonials} />
      <PricingSection pricing={brand.pricing} brandName={brand.name} />
      <FAQ items={brand.landing.faq} />
      <CTA ctaText={brand.landing.hero.ctaText} />
    </div>
  );
}
```

### Hero Component (evolved from try-listening's landing)

```typescript
// src/components/marketing/hero.tsx

import Link from "next/link";

interface HeroProps {
  headline: string;
  subheadline: string;
  ctaText: string;
}

export function Hero({ headline, subheadline, ctaText }: HeroProps) {
  // Split headline into words for staggered animation (same pattern as try-listening)
  const words = headline.split(" ");

  return (
    <section className="relative overflow-hidden">
      {/* Gradient mesh background -- uses brand primary/secondary colors via CSS vars */}
      <div className="gradient-mesh">
        <div className="orb-1" />
        <div className="orb-2" />
        <div className="orb-3" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-6 pt-32 pb-36 text-center md:pt-44 md:pb-48">
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl xl:text-8xl">
          {words.map((word, i) => (
            <span
              key={i}
              className={`inline-block animate-word-enter ${
                i === words.length - 1 ? "text-gradient" : "text-foreground"
              }`}
              style={{ animationDelay: `${0.15 + i * 0.12}s` }}
            >
              {word}
              {i < words.length - 1 ? <span>&nbsp;</span> : null}
            </span>
          ))}
        </h1>
        <p
          className="animate-fade-up mx-auto mt-8 max-w-xl text-xl leading-relaxed text-muted-foreground md:text-2xl"
          style={{ animationDelay: "0.6s" }}
        >
          {subheadline}
        </p>
        <div className="animate-fade-up" style={{ animationDelay: "0.8s" }}>
          <Link
            href="/sign-in"
            className="btn-gradient mt-14 inline-block px-12 py-4.5 text-base font-medium"
          >
            {ctaText}
          </Link>
        </div>
      </div>
    </section>
  );
}
```

### What Changes Per Brand

| Section | What changes | What stays the same |
|---|---|---|
| Hero | Headline, subheadline, CTA text | Layout, animations, gradient mesh |
| Features | Titles, descriptions, icons | Grid layout, card styling |
| How It Works | Step titles and descriptions | 3-step layout, connecting line animation |
| Testimonials | Quotes, names, roles | Card layout, carousel behavior |
| Pricing | Prices, plan names | Card layout, comparison grid |
| FAQ | Questions and answers | Accordion component |
| CTA | CTA text | Layout, button styling |

### CSS Changes for Brand-Aware Gradients

The gradient mesh and button gradients in try-listening use hardcoded indigo/purple. We replace them with CSS variables.

```css
/* Updated gradient classes that use brand colors */
.gradient-mesh .orb-1 {
  background: radial-gradient(circle, hsl(var(--primary) / 0.6) 0%, transparent 70%);
}

.gradient-mesh .orb-2 {
  background: radial-gradient(circle, hsl(var(--secondary) / 0.5) 0%, transparent 70%);
}

.gradient-mesh .orb-3 {
  background: radial-gradient(circle, hsl(var(--accent) / 0.4) 0%, transparent 65%);
}

.btn-gradient {
  background: linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%);
}

.text-gradient {
  background: linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 50%, hsl(var(--primary)) 100%);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: gradient-shift 6s ease-in-out infinite;
}
```

---

## 6. App Layout and Navigation

### App Shell

The authenticated app uses a sidebar + main content area + persistent bottom player bar. This is different from try-listening's single-page layout.

```typescript
// src/app/(app)/layout.tsx
"use client";

import { useState } from "react";
import { Sidebar } from "@/components/app/sidebar";
import { PlayerBar } from "@/components/app/player-bar";
import { AudioPlayerProvider } from "@/hooks/use-audio-player";
import { useBrand } from "@/lib/brand/context";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const brand = useBrand();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AudioPlayerProvider>
      <div className="flex min-h-screen bg-background">
        {/* Sidebar -- hidden on mobile, toggle via hamburger */}
        <Sidebar
          brandName={brand.name}
          brandLogoUrl={brand.logoUrl}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main content area */}
        <main className="flex-1 pb-[100px]">
          {/* Mobile header with hamburger */}
          <header className="flex items-center justify-between px-4 py-3 md:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
              aria-label="Open menu"
            >
              {/* Hamburger icon */}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            </button>
            <img src={brand.logoUrl} alt={brand.name} className="h-8" />
            <div className="w-10" /> {/* Spacer for centering */}
          </header>

          {children}
        </main>

        {/* Persistent player bar at bottom */}
        <PlayerBar />
      </div>
    </AudioPlayerProvider>
  );
}
```

### Sidebar

```typescript
// src/components/app/sidebar.tsx

import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
  brandName: string;
  brandLogoUrl: string;
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "home" },
  { href: "/browse", label: "Browse", icon: "book-open" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

export function Sidebar({ brandName, brandLogoUrl, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border
          transform transition-transform duration-300
          md:relative md:translate-x-0
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Brand logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
          <img src={brandLogoUrl} alt={brandName} className="h-8" />
          <span className="font-semibold text-foreground">{brandName}</span>
        </div>

        {/* Nav links */}
        <nav className="flex flex-col gap-1 p-3">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`
                  flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium
                  transition-colors duration-200
                  ${isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }
                `}
              >
                {/* Icon would go here -- use lucide-react */}
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
```

### Dashboard Page

```typescript
// src/app/(app)/dashboard/page.tsx

import { headers } from "next/headers";
import { resolveBrand } from "@/lib/brand/resolve";
import { ProgressOverview } from "@/components/app/progress-overview";
import { RecommendedNext } from "@/components/app/recommended-next";
import { StreakCounter } from "@/components/app/streak-counter";

export default async function DashboardPage() {
  const headersList = await headers();
  const hostname = headersList.get("host") || "localhost";
  const brand = await resolveBrand(hostname);

  // Fetch user's study progress for this brand's exams
  // const progress = await fetchUserProgress(user.id, brand.contentScope.examIds);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <h1 className="text-3xl font-bold text-foreground mb-8">
        Welcome back
      </h1>

      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <StreakCounter /* streak={progress.streak} */ />
        <ProgressOverview /* progress={progress} */ />
      </div>

      <RecommendedNext /* examIds={brand.contentScope.examIds} */ />
    </div>
  );
}
```

---

## 7. Audio Player Evolution

### What We Keep from try-listening

The audio player hook (`useAudioPlayer`) is the core of try-listening and it works well. We keep:

1. **Chunk-based playback** -- content split into chunks, sequential playback with auto-advance
2. **Lookahead prefetching** -- prefetch next N chunks while current plays
3. **IndexedDB caching** -- cache audio blobs locally for offline playback
4. **Media Session API** -- lock screen controls, skip, seek
5. **Playback persistence** -- auto-save position on pause/close, resume on return
6. **Visibility change handling** -- iOS Safari background/foreground recovery
7. **Speed control** -- 0.75x to 3x

### What We Change

| Aspect | try-listening | niche-audio-prep |
|---|---|---|
| **Content source** | User-submitted text (TTS on demand) | Pre-generated audio files (stored in R2/S3) |
| **Player scope** | Page-level state | App-wide context (persists across page navigations) |
| **Queue** | Single article | Playlist/queue of study items |
| **Chunk source** | `/api/tts` endpoint (generates audio) | Direct R2/S3 URLs (pre-generated) |
| **Study modes** | None | Sequential, shuffle, spaced repetition |

### AudioPlayerProvider

Instead of a page-level hook, the audio player becomes an app-wide context that persists across navigation.

```typescript
// src/hooks/use-audio-player.tsx
"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

// Same AudioPlayerState interface as try-listening -- keep it identical
export interface AudioPlayerState {
  isPlaying: boolean;
  isLoading: boolean;
  isBuffering: boolean;
  currentChunk: number;
  totalChunks: number;
  loadedChunks: number;
  currentTime: number;
  duration: number;
  globalCurrentTime: number;
  totalKnownDuration: number;
  playbackRate: number;
  error: string | null;
}

export interface QueueItem {
  id: string;                    // Study item ID
  title: string;
  audioUrls: string[];           // Pre-signed R2 URLs per chunk
  chunkDurations: number[];      // Known durations (pre-computed)
}

interface AudioPlayerContextValue {
  state: AudioPlayerState;
  queue: QueueItem[];
  currentItem: QueueItem | null;
  // Transport controls
  play: () => void;
  pause: () => void;
  togglePlayPause: () => void;
  skipForward: () => void;
  skipBackward: () => void;
  seek: (globalTime: number) => void;
  cycleSpeed: () => void;
  setSpeed: (speed: number) => void;
  // Queue management
  loadItem: (item: QueueItem, startChunk?: number, startTime?: number) => Promise<void>;
  loadQueue: (items: QueueItem[], startIndex?: number) => Promise<void>;
  skipToNext: () => void;
  skipToPrevious: () => void;
  clearQueue: () => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  // ... Same internal implementation as try-listening's useAudioPlayer,
  // but adapted for pre-generated audio URLs instead of TTS calls.
  //
  // Key change in fetchChunk:
  //   Instead of POSTing to /api/tts, it fetches the pre-signed R2 URL directly.
  //   IDB caching still works the same way.

  // ... (full implementation extracted from try-listening's useAudioPlayer
  //      with the TTS-specific code replaced by direct URL fetching)

  return (
    <AudioPlayerContext.Provider value={/* ... */}>
      {children}
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer(): AudioPlayerContextValue {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) throw new Error("useAudioPlayer must be used within AudioPlayerProvider");
  return ctx;
}
```

### Key Difference: Pre-Generated Audio

try-listening generates audio on-the-fly via TTS. niche-audio-prep uses pre-generated audio files stored in R2/S3. This changes the `fetchChunk` function:

```typescript
// try-listening's fetchChunk: POST to /api/tts, get audio blob
// niche-audio-prep's fetchChunk: GET pre-signed URL, get audio blob

const fetchChunk = useCallback(async (index: number) => {
  const existing = audioChunksRef.current[index];
  if (existing) return existing;

  // 1. Check IndexedDB cache (same as try-listening)
  if (getChunkBlobRef.current) {
    const cached = await getChunkBlobRef.current(currentItemRef.current!.id, index);
    if (cached) {
      const blobUrl = URL.createObjectURL(cached.blob);
      audioChunksRef.current[index] = blobUrl;
      return blobUrl;
    }
  }

  // 2. Fetch from pre-signed URL (DIFFERENT from try-listening)
  const url = currentItemRef.current!.audioUrls[index];
  const response = await fetch(url, { signal: abortRef.current?.signal });
  if (!response.ok) throw new Error(`Audio fetch failed for chunk ${index}`);

  const blob = await response.blob();

  // 3. Cache in IndexedDB (same as try-listening)
  void putChunkBlobRef.current?.(currentItemRef.current!.id, index, blob);

  const blobUrl = URL.createObjectURL(blob);
  audioChunksRef.current[index] = blobUrl;
  return blobUrl;
}, []);
```

### PlayerBar Evolution

The PlayerBar stays very similar to try-listening's. Main additions:

1. **Current item title** displayed in the bar
2. **Next/Previous** buttons for queue navigation
3. **Queue indicator** showing position in queue

```typescript
// src/components/app/player-bar.tsx
// Almost identical to try-listening's PlayerBar, with additions:

export function PlayerBar() {
  const {
    state,
    currentItem,
    queue,
    togglePlayPause,
    skipForward,
    skipBackward,
    cycleSpeed,
    seek,
    skipToNext,
    skipToPrevious,
  } = useAudioPlayer();

  if (!currentItem && !state.isLoading) return null;

  return (
    <div className="safe-area-bottom glass-dark fixed bottom-0 left-0 right-0 z-50 border-t border-border">
      {/* Progress bar */}
      {state.totalKnownDuration > 0 && (
        <div className="px-4 pt-3 md:px-6">
          <input
            type="range"
            min={0}
            max={state.totalKnownDuration}
            value={state.globalCurrentTime}
            onChange={(e) => seek(parseFloat(e.target.value))}
            className="h-1 w-full progress-filled"
            style={{ "--progress": `${(state.globalCurrentTime / state.totalKnownDuration) * 100}%` } as React.CSSProperties}
          />
        </div>
      )}

      <div className="flex items-center gap-3 px-4 py-2.5 md:px-6">
        {/* Left: now playing info */}
        <div className="hidden w-[200px] shrink-0 sm:block">
          {currentItem && (
            <div className="truncate text-sm text-foreground font-medium">
              {currentItem.title}
            </div>
          )}
          {queue.length > 1 && (
            <div className="text-xs text-muted-foreground">
              {/* queue position */}
            </div>
          )}
        </div>

        {/* Center: transport controls (same as try-listening + prev/next) */}
        <div className="flex flex-1 items-center justify-center gap-4">
          {queue.length > 1 && (
            <button onClick={skipToPrevious} className="..." aria-label="Previous">
              {/* Previous icon */}
            </button>
          )}
          <button onClick={skipBackward} className="..." aria-label="Skip back 15s">
            {/* Same skip back SVG as try-listening */}
          </button>
          <button onClick={togglePlayPause} className="..." aria-label={state.isPlaying ? "Pause" : "Play"}>
            {/* Same play/pause SVG as try-listening */}
          </button>
          <button onClick={skipForward} className="..." aria-label="Skip forward 15s">
            {/* Same skip forward SVG as try-listening */}
          </button>
          {queue.length > 1 && (
            <button onClick={skipToNext} className="..." aria-label="Next">
              {/* Next icon */}
            </button>
          )}
        </div>

        {/* Right: speed + time (same as try-listening) */}
        <div className="flex w-[200px] shrink-0 items-center justify-end gap-3">
          {/* ... same as try-listening ... */}
        </div>
      </div>
    </div>
  );
}
```

---

## 8. Content Browser and Study System

### Content Model

```typescript
// src/lib/content/types.ts

export interface Exam {
  id: string;
  brandId: string;               // Scoped to brand
  title: string;                 // "NFPA 1001 -- Firefighter I"
  slug: string;                  // "nfpa-1001-firefighter-i"
  description: string;
  imageUrl: string;
  topicCount: number;
  totalItems: number;
  totalDurationSeconds: number;
}

export interface Topic {
  id: string;
  examId: string;
  title: string;                 // "Fire Behavior"
  slug: string;
  description: string;
  orderIndex: number;
  sectionCount: number;
  totalItems: number;
}

export interface Section {
  id: string;
  topicId: string;
  title: string;                 // "Phases of Fire"
  slug: string;
  orderIndex: number;
  itemCount: number;
}

export interface StudyItem {
  id: string;
  sectionId: string;
  title: string;                 // "Incipient Phase"
  slug: string;
  orderIndex: number;
  /** The study content as text (for read-along / reference) */
  text: string;
  /** Pre-generated audio chunk URLs */
  audioUrls: string[];
  /** Duration of each audio chunk in seconds */
  chunkDurations: number[];
  /** Total audio duration in seconds */
  totalDurationSeconds: number;
}

export interface UserProgress {
  userId: string;
  examId: string;
  /** Map of studyItemId -> completion status */
  completedItems: Set<string>;
  /** Map of studyItemId -> { chunkIndex, currentTime, playbackRate } */
  positions: Map<string, PlaybackPosition>;
  /** Current streak in days */
  streakDays: number;
  lastStudiedAt: string | null;
}

export interface PlaybackPosition {
  chunkIndex: number;
  currentTime: number;
  playbackRate: number;
}
```

### Content Browser Pages

```
/browse                          -> List of exams for this brand
/browse/nfpa-1001-firefighter-i  -> Topics within exam
/browse/nfpa-1001-firefighter-i/fire-behavior  -> Sections + items
```

Each level is a server component that fetches data scoped to the current brand.

### Study Modes

Study modes determine the order in which StudyItems are queued:

1. **Sequential** -- items in order (section 1 item 1, section 1 item 2, ...)
2. **Shuffle** -- random order within a topic or exam
3. **Spaced Repetition** -- items due for review (based on last studied + interval)
4. **Weakest Areas** -- items with lowest completion rate first

Study mode is selected when starting a study session. The mode generates a queue of `QueueItem`s that get loaded into the audio player.

---

## 9. State Management

### Approach: Server Components + Minimal Client State

No Redux. No Zustand. Keep it simple:

| State | Where | Why |
|---|---|---|
| Brand config | React Context (from server) | Available everywhere, set once per request |
| Audio player | React Context (`AudioPlayerProvider`) | Persists across page navigations |
| User session | Supabase auth (server middleware) | Standard pattern |
| Study progress | Server-fetched, cached with React Query or SWR | Needs background sync |
| Offline audio | IndexedDB via `useOfflineAudio` hook | Same pattern as try-listening |
| UI state (sidebar, modals) | Local component state | No need to globalize |
| Theme (light/dark) | `useTheme` hook + localStorage | Same pattern as try-listening |

### Data Fetching Pattern

```typescript
// Server components fetch data directly
// src/app/(app)/browse/page.tsx

import { getExamsForBrand } from "@/lib/content/queries";

export default async function BrowsePage() {
  const brand = await resolveBrandFromHeaders();
  const exams = await getExamsForBrand(brand.id);

  return (
    <div>
      {exams.map((exam) => (
        <ExamCard key={exam.id} exam={exam} />
      ))}
    </div>
  );
}
```

```typescript
// Client components that need dynamic data use SWR or React Query
// src/components/app/progress-overview.tsx
"use client";

import useSWR from "swr";

export function ProgressOverview({ examId }: { examId: string }) {
  const { data: progress } = useSWR(`/api/progress/${examId}`, fetcher);
  // ...
}
```

---

## 10. SEO Implementation

### Per-Brand Dynamic Metadata

```typescript
// src/app/(marketing)/page.tsx

import type { Metadata } from "next";
import { resolveBrand } from "@/lib/brand/resolve";
import { headers } from "next/headers";

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const hostname = headersList.get("host") || "localhost";
  const brand = await resolveBrand(hostname);

  return {
    title: brand.seo.title,
    description: brand.seo.description,
    keywords: brand.seo.keywords,
    openGraph: {
      title: brand.seo.title,
      description: brand.seo.description,
      images: [brand.ogImageUrl],
      siteName: brand.name,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: brand.seo.title,
      description: brand.seo.description,
      images: [brand.ogImageUrl],
    },
    alternates: {
      canonical: `https://${brand.domain}`,
    },
  };
}
```

### Dynamic Sitemap

```typescript
// src/app/sitemap.ts

import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { resolveBrand } from "@/lib/brand/resolve";
import { getExamsForBrand } from "@/lib/content/queries";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const headersList = await headers();
  const hostname = headersList.get("host") || "localhost";
  const brand = await resolveBrand(hostname);
  const baseUrl = `https://${brand.domain}`;

  const exams = await getExamsForBrand(brand.id);

  const staticPages = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 1 },
    { url: `${baseUrl}/pricing`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${baseUrl}/sign-in`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.3 },
  ];

  const examPages = exams.map((exam) => ({
    url: `${baseUrl}/browse/${exam.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

  return [...staticPages, ...examPages];
}
```

### Structured Data for Educational Content

```typescript
// src/components/marketing/structured-data.tsx

import type { BrandConfig } from "@/lib/brand/config";

export function StructuredData({ brand }: { brand: BrandConfig }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: brand.name,
    url: `https://${brand.domain}`,
    description: brand.seo.description,
    potentialAction: {
      "@type": "SearchAction",
      target: `https://${brand.domain}/browse?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
```

### Robots.txt

```typescript
// src/app/robots.ts

import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { resolveBrand } from "@/lib/brand/resolve";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const headersList = await headers();
  const hostname = headersList.get("host") || "localhost";
  const brand = await resolveBrand(hostname);

  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `https://${brand.domain}/sitemap.xml`,
  };
}
```

---

## 11. Offline Support

### Design: Same Pattern as try-listening, Evolved

try-listening's offline pattern works well:
- IndexedDB database with `audio_chunks` and `entry_meta` stores
- Compound key `[entryId, chunkIndex]` for chunks
- Background download of all chunks for an entry
- During playback: check IDB first, then network

We keep this pattern exactly and adapt the naming:

```typescript
// src/lib/audio/idb-store.ts
// Same implementation as try-listening's idb-audio-store.ts
// Only change: DB_NAME from "try-listening-audio" to "niche-audio-prep"

const DB_NAME = "niche-audio-prep-audio";
const DB_VERSION = 1;
const CHUNKS_STORE = "audio_chunks";
const META_STORE = "entry_meta";

// All interfaces and functions identical to try-listening:
// - IDBChunkRecord
// - IDBEntryMeta
// - openAudioDB()
// - getChunk()
// - putChunk()
// - updateChunkDuration()
// - deleteEntryAudio()
// - getEntryMeta()
// - getAllEntryMetas()
// - initEntryMeta()
```

### useOfflineAudio Hook

Same as try-listening's `useOfflineAudio`, adapted for pre-generated audio:

```typescript
// src/hooks/use-offline-audio.ts
// Same pattern as try-listening's use-offline-audio.ts
// Key change: downloadEntry fetches from R2 URLs instead of /api/tts

async function downloadWorker(items: QueueItem[], db: IDBDatabase, signal: AbortSignal) {
  for (const item of items) {
    for (let i = 0; i < item.audioUrls.length; i++) {
      if (signal.aborted) return;

      const existing = await getChunk(db, item.id, i);
      if (existing) continue;

      const response = await fetch(item.audioUrls[i], { signal });
      if (!response.ok) continue;

      const blob = await response.blob();
      await putChunk(db, {
        entryId: item.id,
        chunkIndex: i,
        voice: "default",
        model: "pregenerated",
        textHash: "",
        audioBlob: blob,
        duration: item.chunkDurations[i],
        sizeBytes: blob.size,
        createdAt: Date.now(),
      });
    }
  }
}
```

### Progressive Enhancement

Offline support is progressive:
1. **Online**: Stream audio directly from R2 URLs
2. **Slow network**: IDB cache serves previously-played chunks instantly
3. **Offline**: If user has downloaded content, full playback works offline
4. **Download manager**: UI to download entire exams/topics for offline use

---

## 12. Task Breakdown

### Phase 1: Project Scaffolding and White-Label Foundation

**Status:** Not Started

> **Agent Boundary**
> - **Skill:** `/writing-plans` → `/subagent-driven-development`
> - **Inputs:** Frontend plan (this doc), try-listening codebase for reference
> - **Outputs:** Scaffolded Next.js project, BrandConfig type, theme injection, brand resolution
> - **Dependencies:** None

#### Task 1: Initialize Next.js Project with shadcn/ui

**Files:**
- Create: `src/app/layout.tsx`
- Create: `src/app/globals.css`
- Create: `src/app/page.tsx` (placeholder)
- Create: `package.json`
- Create: `tailwind.config.ts`
- Create: `tsconfig.json`

**Step 1: Scaffold Next.js app**

Run:
```bash
cd /Users/will/github/niche-audio-prep
bunx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack
```

**Step 2: Install shadcn/ui**

Run:
```bash
bunx shadcn@latest init
```
Select: New York style, Zinc base color, CSS variables.

**Step 3: Install core dependencies**

Run:
```bash
bun add @supabase/supabase-js @supabase/ssr posthog-js lucide-react swr
bun add -d @testing-library/react @testing-library/jest-dom vitest jsdom
```

**Step 4: Verify the dev server starts**

Run: `bun dev`
Expected: App runs at localhost:3000

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js 15 + shadcn/ui + dependencies"
```

---

#### Task 2: BrandConfig Type and Default Config

**Files:**
- Create: `src/lib/brand/config.ts`
- Create: `src/lib/brand/defaults.ts`
- Test: `src/lib/brand/__tests__/config.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/brand/__tests__/config.test.ts
import { describe, it, expect } from "vitest";
import { defaultBrand } from "../defaults";
import type { BrandConfig } from "../config";

describe("BrandConfig", () => {
  it("defaultBrand has all required fields", () => {
    const brand: BrandConfig = defaultBrand;
    expect(brand.id).toBe("default");
    expect(brand.name).toBeTruthy();
    expect(brand.domain).toBeTruthy();
    expect(brand.theme.light.primary).toBeTruthy();
    expect(brand.theme.dark.primary).toBeTruthy();
    expect(brand.landing.hero.headline).toBeTruthy();
    expect(brand.seo.title).toBeTruthy();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/lib/brand/__tests__/config.test.ts`
Expected: FAIL -- modules not found

**Step 3: Write BrandConfig type**

Create `src/lib/brand/config.ts` with the full `BrandConfig` interface from Section 2 above.

**Step 4: Write default brand config**

Create `src/lib/brand/defaults.ts`:

```typescript
import type { BrandConfig } from "./config";

export const defaultBrand: BrandConfig = {
  id: "default",
  name: "AudioPrep",
  domain: "audioprep.com",
  tagline: "Audio exam prep that fits your life",
  logoUrl: "/logo.svg",
  faviconUrl: "/favicon.ico",
  ogImageUrl: "/og.png",
  theme: {
    light: {
      primary: "239 84% 67%",
      primaryForeground: "0 0% 100%",
      secondary: "271 91% 65%",
      secondaryForeground: "0 0% 100%",
      accent: "210 40% 96%",
      accentForeground: "222 47% 11%",
      background: "0 0% 100%",
      foreground: "222 47% 11%",
      card: "0 0% 100%",
      cardForeground: "222 47% 11%",
      muted: "210 40% 96%",
      mutedForeground: "215 16% 47%",
      border: "214 32% 91%",
      ring: "239 84% 67%",
    },
    dark: {
      primary: "239 84% 67%",
      primaryForeground: "0 0% 100%",
      secondary: "271 91% 65%",
      secondaryForeground: "0 0% 100%",
      accent: "217 33% 17%",
      accentForeground: "210 40% 98%",
      background: "222 47% 4%",
      foreground: "210 40% 98%",
      card: "222 47% 6%",
      cardForeground: "210 40% 98%",
      muted: "217 33% 17%",
      mutedForeground: "215 20% 65%",
      border: "217 33% 17%",
      ring: "239 84% 67%",
    },
    radius: "0.5rem",
  },
  landing: {
    hero: {
      headline: "Pass Your Exam By Listening",
      subheadline: "Audio-first study system. Learn while you commute, work out, or cook.",
      ctaText: "Start Studying Free",
    },
    features: [
      { title: "Listen Anywhere", description: "Study while driving, working, or exercising.", icon: "headphones" },
      { title: "Spaced Repetition", description: "Smart scheduling so you remember what matters.", icon: "brain" },
      { title: "Track Progress", description: "See exactly where you stand for every topic.", icon: "bar-chart" },
    ],
    howItWorks: [
      { title: "Pick your exam", description: "Choose your certification or license exam." },
      { title: "Listen and learn", description: "Audio lessons designed for busy schedules." },
      { title: "Pass with confidence", description: "Track progress and focus on weak areas." },
    ],
    testimonials: [],
    faq: [
      { question: "How does audio study work?", answer: "Our content is designed for listening. Each topic is broken into short audio segments you can study during your commute or downtime." },
    ],
  },
  seo: {
    title: "AudioPrep - Pass Your Exam By Listening",
    description: "Audio-first exam prep for professional certifications.",
    keywords: ["exam prep", "audio study", "certification"],
  },
  contentScope: { examIds: [] },
  pricing: {
    monthly: 19,
    yearly: 149,
    currency: "USD",
    trialDays: 7,
  },
};
```

**Step 5: Run test to verify it passes**

Run: `bun test src/lib/brand/__tests__/config.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/lib/brand/
git commit -m "feat: add BrandConfig type and default brand configuration"
```

---

#### Task 3: Brand Context Provider and useBrand Hook

**Files:**
- Create: `src/lib/brand/context.tsx`
- Create: `src/hooks/use-brand.ts`
- Test: `src/lib/brand/__tests__/context.test.tsx`

**Step 1: Write the failing test**

```typescript
// src/lib/brand/__tests__/context.test.tsx
import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { BrandProvider, useBrand } from "../context";
import { defaultBrand } from "../defaults";

describe("BrandContext", () => {
  it("provides brand config to children", () => {
    const { result } = renderHook(() => useBrand(), {
      wrapper: ({ children }) => (
        <BrandProvider brand={defaultBrand}>{children}</BrandProvider>
      ),
    });
    expect(result.current.id).toBe("default");
    expect(result.current.name).toBe("AudioPrep");
  });

  it("returns default brand when no provider", () => {
    const { result } = renderHook(() => useBrand());
    expect(result.current.id).toBe("default");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/lib/brand/__tests__/context.test.tsx`
Expected: FAIL

**Step 3: Implement BrandProvider and useBrand**

Create `src/lib/brand/context.tsx` (code from Section 3 above).
Create `src/hooks/use-brand.ts`:

```typescript
export { useBrand } from "@/lib/brand/context";
```

**Step 4: Run test to verify it passes**

Run: `bun test src/lib/brand/__tests__/context.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/brand/context.tsx src/hooks/use-brand.ts src/lib/brand/__tests__/context.test.tsx
git commit -m "feat: add BrandProvider context and useBrand hook"
```

---

#### Task 4: Brand Theme Style Injection

**Files:**
- Create: `src/lib/brand/theme-style.tsx`
- Test: `src/lib/brand/__tests__/theme-style.test.tsx`

**Step 1: Write the failing test**

```typescript
// src/lib/brand/__tests__/theme-style.test.tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { BrandThemeStyle } from "../theme-style";
import { defaultBrand } from "../defaults";

describe("BrandThemeStyle", () => {
  it("renders a style tag with brand CSS variables", () => {
    const { container } = render(<BrandThemeStyle brand={defaultBrand} />);
    const style = container.querySelector("style");
    expect(style).toBeTruthy();
    expect(style!.textContent).toContain("--primary:");
    expect(style!.textContent).toContain("--background:");
    expect(style!.textContent).toContain("--brand-radius:");
    expect(style!.textContent).toContain(".dark");
  });

  it("converts camelCase keys to kebab-case CSS vars", () => {
    const { container } = render(<BrandThemeStyle brand={defaultBrand} />);
    const style = container.querySelector("style");
    expect(style!.textContent).toContain("--primary-foreground:");
    expect(style!.textContent).toContain("--muted-foreground:");
    // Should NOT contain camelCase
    expect(style!.textContent).not.toContain("--primaryForeground:");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/lib/brand/__tests__/theme-style.test.tsx`
Expected: FAIL

**Step 3: Implement BrandThemeStyle**

Create `src/lib/brand/theme-style.tsx` (code from Section 2 above).

**Step 4: Run test to verify it passes**

Run: `bun test src/lib/brand/__tests__/theme-style.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/brand/theme-style.tsx src/lib/brand/__tests__/theme-style.test.tsx
git commit -m "feat: add BrandThemeStyle component for runtime CSS variable injection"
```

---

#### Task 5: Brand Resolution from Hostname

**Files:**
- Create: `src/lib/brand/resolve.ts`
- Test: `src/lib/brand/__tests__/resolve.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/brand/__tests__/resolve.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { resolveBrand } from "../resolve";
import { defaultBrand } from "../defaults";

describe("resolveBrand", () => {
  it("returns default brand for localhost", async () => {
    const brand = await resolveBrand("localhost:3000");
    expect(brand.id).toBeTruthy();
  });

  it("strips port from hostname", async () => {
    const brand = await resolveBrand("localhost:3000");
    // Should not throw
    expect(brand).toBeTruthy();
  });

  it("returns default brand for unknown hostname", async () => {
    const brand = await resolveBrand("unknown-domain.com");
    expect(brand.id).toBe("default");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/lib/brand/__tests__/resolve.test.ts`
Expected: FAIL

**Step 3: Implement resolveBrand**

Create `src/lib/brand/resolve.ts` (code from Section 3 above).

**Step 4: Run test to verify it passes**

Run: `bun test src/lib/brand/__tests__/resolve.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/brand/resolve.ts src/lib/brand/__tests__/resolve.test.ts
git commit -m "feat: add brand resolution from hostname with in-memory cache"
```

---

#### Task 6: Wire Up Root Layout with Brand Theming

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`

**Step 1: Update globals.css with shadcn/ui CSS variable schema**

Replace the scaffolded `globals.css` with the theme from Section 2, incorporating brand-aware gradient classes from Section 5.

**Step 2: Update root layout to inject brand theme**

Update `src/app/layout.tsx` to the server-component version from Section 3 (resolves brand, renders BrandThemeStyle, wraps children in BrandProvider).

**Step 3: Verify dev server renders with correct theme**

Run: `bun dev`
Expected: App loads with default brand colors at localhost:3000

**Step 4: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css
git commit -m "feat: wire root layout with runtime brand theme injection"
```

---

### Phase 2: Landing Page Template

**Status:** Not Started

> **Agent Boundary**
> - **Skill:** `/writing-plans` → `/subagent-driven-development`
> - **Inputs:** Brand config system from Phase 1, try-listening landing page components
> - **Outputs:** Marketing layout, hero, features, how-it-works, testimonials, FAQ, CTA, assembled landing page
> - **Dependencies:** Phase 1

#### Task 7: Marketing Layout (Nav + Footer)

**Files:**
- Create: `src/app/(marketing)/layout.tsx`
- Create: `src/components/shared/nav.tsx`
- Create: `src/components/shared/footer.tsx`
- Create: `src/components/shared/brand-logo.tsx`

**Steps:** Write layout that renders brand-aware nav (logo + CTA) and footer. Server components that read brand config via `resolveBrand`.

---

#### Task 8: Hero Section

**Files:**
- Create: `src/components/marketing/hero.tsx`
- Test: `src/components/marketing/__tests__/hero.test.tsx`

**Steps:** Port try-listening's hero section, replacing hardcoded copy with props. Keep animations. Replace hardcoded hex colors with CSS variable references.

---

#### Task 9: Features Section

**Files:**
- Create: `src/components/marketing/features.tsx`
- Test: `src/components/marketing/__tests__/features.test.tsx`

**Steps:** Port try-listening's features bento grid. Replace hardcoded feature content with props from `BrandConfig.landing.features`. Use Lucide icons referenced by name.

---

#### Task 10: How It Works, Testimonials, FAQ, CTA Sections

**Files:**
- Create: `src/components/marketing/how-it-works.tsx`
- Create: `src/components/marketing/testimonials.tsx`
- Create: `src/components/marketing/faq.tsx`
- Create: `src/components/marketing/cta.tsx`
- Create: `src/components/marketing/pricing-section.tsx`

**Steps:** Build each section as a reusable component accepting props from BrandConfig. Port the dark "How It Works" section from try-listening. Use shadcn/ui Accordion for FAQ.

---

#### Task 11: Assemble Landing Page

**Files:**
- Create: `src/app/(marketing)/page.tsx`

**Steps:** Wire all sections together in the landing page, fetching brand config server-side. Add `generateMetadata` for SEO.

---

### Phase 3: Auth and Middleware

**Status:** Not Started

> **Agent Boundary**
> - **Skill:** `/writing-plans` → `/subagent-driven-development`
> - **Inputs:** Brand resolution from Phase 1, try-listening middleware and Supabase auth
> - **Outputs:** Multi-tenant middleware, Supabase client/server setup, sign-in page, auth callback
> - **Dependencies:** Phase 1

#### Task 12: Multi-Tenant Middleware

**Files:**
- Create: `src/middleware.ts`
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`

**Steps:** Port try-listening's middleware, adding brand resolution. Supabase client setup is identical to try-listening.

---

#### Task 13: Sign-In Page

**Files:**
- Create: `src/app/(marketing)/sign-in/page.tsx`
- Create: `src/app/auth/callback/route.ts`

**Steps:** Port try-listening's sign-in flow, brand the page with brand logo and colors.

---

### Phase 4: App Shell and Dashboard

**Status:** Not Started

> **Agent Boundary**
> - **Skill:** `/writing-plans` → `/subagent-driven-development`
> - **Inputs:** Auth middleware from Phase 3, brand context from Phase 1
> - **Outputs:** App layout with responsive sidebar, dashboard page with progress/streak/recommendations
> - **Dependencies:** Phase 3

#### Task 14: App Layout with Sidebar

**Files:**
- Create: `src/app/(app)/layout.tsx`
- Create: `src/components/app/sidebar.tsx`

**Steps:** Build the app shell layout with responsive sidebar (code from Section 6).

---

#### Task 15: Dashboard Page

**Files:**
- Create: `src/app/(app)/dashboard/page.tsx`
- Create: `src/components/app/progress-overview.tsx`
- Create: `src/components/app/streak-counter.tsx`
- Create: `src/components/app/recommended-next.tsx`

**Steps:** Build dashboard with placeholder data. Wire up components. Progress data will come from the content + progress tables later.

---

### Phase 5: Audio Player

**Status:** Not Started

> **Agent Boundary**
> - **Skill:** `/writing-plans` → `/subagent-driven-development`
> - **Inputs:** App shell from Phase 4, try-listening audio player/hooks/PlayerBar
> - **Outputs:** AudioPlayerProvider context, PlayerBar component, media session hook, playback persistence
> - **Dependencies:** Phase 4

#### Task 16: Port Audio Player Hook

**Files:**
- Create: `src/hooks/use-audio-player.tsx` (Context version)
- Test: `src/hooks/__tests__/use-audio-player.test.ts`

**Steps:** Extract try-listening's `useAudioPlayer` into a context provider. Replace TTS fetch logic with direct URL fetch. Add queue management (loadQueue, skipToNext, skipToPrevious).

---

#### Task 17: Port PlayerBar Component

**Files:**
- Create: `src/components/app/player-bar.tsx`
- Create: `src/components/app/speed-button.tsx`

**Steps:** Port try-listening's PlayerBar almost verbatim. Add now-playing title display and prev/next buttons. Replace hardcoded indigo glow with CSS variable references.

---

#### Task 18: Port Media Session and Playback Persistence

**Files:**
- Create: `src/hooks/use-media-session.ts`
- Create: `src/hooks/use-playback-persistence.ts`

**Steps:** Copy directly from try-listening. These hooks need zero changes -- they're already generic.

---

### Phase 6: Content Browser

**Status:** Not Started

> **Agent Boundary**
> - **Skill:** `/writing-plans` → `/subagent-driven-development`
> - **Inputs:** App shell from Phase 4, content model design from Section 8
> - **Outputs:** Content types, query functions, three-level browse pages (exams → topics → sections/items)
> - **Dependencies:** Phase 4

#### Task 19: Content Types and Queries

**Files:**
- Create: `src/lib/content/types.ts`
- Create: `src/lib/content/queries.ts`

**Steps:** Define the content model types (Exam, Topic, Section, StudyItem). Write placeholder query functions that return mock data initially.

---

#### Task 20: Browse Pages

**Files:**
- Create: `src/app/(app)/browse/page.tsx`
- Create: `src/app/(app)/browse/[examSlug]/page.tsx`
- Create: `src/app/(app)/browse/[examSlug]/[topicSlug]/page.tsx`
- Create: `src/components/app/exam-card.tsx`
- Create: `src/components/app/topic-card.tsx`
- Create: `src/components/app/study-item-list.tsx`

**Steps:** Build the three-level content browser. Each page fetches data server-side, scoped to the current brand's `contentScope.examIds`.

---

### Phase 7: Offline Support

**Status:** Not Started

> **Agent Boundary**
> - **Skill:** `/writing-plans` → `/subagent-driven-development`
> - **Inputs:** Audio player from Phase 5, try-listening IDB store and offline hook
> - **Outputs:** IndexedDB audio store, useOfflineAudio hook adapted for R2 URLs
> - **Dependencies:** Phase 5

#### Task 21: Port IndexedDB Audio Store

**Files:**
- Create: `src/lib/audio/idb-store.ts`
- Test: `src/lib/audio/__tests__/idb-store.test.ts`

**Steps:** Copy try-listening's `idb-audio-store.ts` verbatim, changing only the DB name. Tests use fake-indexeddb.

---

#### Task 22: Port useOfflineAudio Hook

**Files:**
- Create: `src/hooks/use-offline-audio.ts`
- Test: `src/hooks/__tests__/use-offline-audio.test.ts`

**Steps:** Copy try-listening's `useOfflineAudio`, adapting the download worker to fetch from R2 URLs instead of `/api/tts`.

---

### Phase 8: SEO and Polish

**Status:** Not Started

> **Agent Boundary**
> - **Skill:** `/writing-plans` → `/subagent-driven-development`
> - **Inputs:** Landing page from Phase 2, app shell from Phase 4, brand config from Phase 1
> - **Outputs:** Dynamic sitemap, robots.txt, structured data, PostHog analytics, settings page
> - **Dependencies:** Phase 2, Phase 4

#### Task 23: SEO Infrastructure

**Files:**
- Create: `src/app/sitemap.ts`
- Create: `src/app/robots.ts`
- Create: `src/components/marketing/structured-data.tsx`
- Modify: `src/app/(marketing)/page.tsx` (add generateMetadata)

**Steps:** Implement dynamic sitemap, robots.txt, and structured data, all brand-aware.

---

#### Task 24: PostHog Analytics Setup

**Files:**
- Create: `src/lib/posthog.ts`
- Create: `src/components/posthog-provider.tsx`

**Steps:** Set up PostHog with brand context. Include `brandId` as a property on all events so analytics can be filtered per brand.

---

#### Task 25: Settings Page

**Files:**
- Create: `src/app/(app)/settings/page.tsx`

**Steps:** Build settings page with voice preference, default playback speed, theme toggle, notification preferences. Theme toggle reuses try-listening's `useTheme` hook.

---

### Summary: Implementation Order

| Phase | Tasks | Description | Depends On |
|---|---|---|---|
| 1 | 1-6 | Project scaffold + white-label foundation | Nothing |
| 2 | 7-11 | Landing page template | Phase 1 |
| 3 | 12-13 | Auth and middleware | Phase 1 |
| 4 | 14-15 | App shell and dashboard | Phase 3 |
| 5 | 16-18 | Audio player (evolved from try-listening) | Phase 4 |
| 6 | 19-20 | Content browser | Phase 4 |
| 7 | 21-22 | Offline support (ported from try-listening) | Phase 5 |
| 8 | 23-25 | SEO, analytics, settings | Phase 2 + Phase 4 |

Total: ~25 tasks. At 2-5 minutes per step, ~6 steps per task, roughly 12-15 hours of focused implementation.

---

## 13. Self-Improvement Loop (Autoresearch Pattern)

Every frontend change — new component, page, route, or UI fix — should follow an autonomous self-improvement loop inspired by [Karpathy's autoresearch](https://github.com/karpathy/autoresearch). The core principle: **modify one thing, verify mechanically, keep or revert, repeat.**

### The loop

```
1. MODIFY  — Make one targeted change (one component, one route, one fix)
2. VERIFY  — Run the mechanical quality gate
3. MEASURE — Compare against the baseline (tests pass, types check, no regressions)
4. DECIDE  — Keep if all checks pass; revert if any check fails
5. REPEAT  — Loop until the feature is complete and all gates pass
```

### Why this matters for frontend

Frontend changes have high blast radius. A CSS variable rename can break every brand. A route change can break E2E tests across multiple specs. A component refactor can introduce regressions in pages that weren't the target. The self-improvement loop catches these before they compound.

### Mechanical quality gate checks

Run these after every meaningful change. Each produces a pass/fail.

| # | Check | Pass condition | How to verify |
|---|-------|---------------|---------------|
| 1 | TypeScript compiles | 0 type errors | `npx next build` or `tsc --noEmit` |
| 2 | Unit tests pass | 0 failures | `bun run test` |
| 3 | E2E tests pass | 0 failures | `bun x playwright test` |
| 4 | No console errors | No runtime errors on key pages | Playwright console message check |
| 5 | Brand theming intact | CSS variables resolve correctly for all brands | `white-label.spec.ts` passes |
| 6 | Responsive layout | No horizontal overflow on mobile/tablet | `responsive.spec.ts` passes |
| 7 | SEO meta tags | Correct title, description, OG tags | `seo.spec.ts` passes |
| 8 | Auth flows | Sign-up, sign-in, sign-out, route protection | `auth.spec.ts` passes |
| 9 | Learning flows | Diagnostic, study, lesson completion | `diagnostic.spec.ts`, `courses.spec.ts` pass |
| 10 | No unused imports | Linter passes | `bun run lint` (if configured) |

### How to apply it

**When adding a new page or component:**

1. Write the component.
2. Run the gate (TypeScript + E2E tests).
3. If any check fails, fix the issue before adding the next component.
4. Do not accumulate multiple new components before verifying.

**When refactoring routes or layouts:**

1. Make the route change.
2. Run the full E2E suite — route changes break selectors in unexpected places.
3. Fix any broken tests by updating selectors to match the new UI, not by deleting tests.
4. Keep or revert based on the gate result.

**When updating shared components (brand config, navigation, player):**

1. Make the change in the shared component.
2. Run ALL E2E specs — shared components affect every page.
3. If a test breaks, the fix goes in the test OR the component — decide which is wrong.
4. Never skip the gate because "it's just a style change."

### Single change, single verify

The most common mistake is batching: "I'll make all five changes, then run the tests." This makes debugging failures exponentially harder. The autoresearch loop works because each iteration is atomic — one change, one verify, one decision.

If a change takes more than one file, that's fine — but the _conceptual_ change should still be singular. "Add academy page" is one change (even if it touches 3 files). "Add academy page AND refactor navigation AND update brand config" is three changes and should be three iterations.

### Connection to course content

The frontend quality gate and the course content quality gate (see `adding-a-course.md`) are complementary:

- Course YAML changes → run the content quality gate (deduplication, staircase, import)
- Frontend changes → run the frontend quality gate (TypeScript, E2E, responsive)
- Changes that touch both (e.g., adding a new course section UI) → run both gates

A change is not complete until both applicable gates pass.

---

## Appendix: Files Directly Portable from try-listening

These files can be copied with minimal or no changes:

| try-listening File | niche-audio-prep Destination | Changes Needed |
|---|---|---|
| `src/hooks/use-media-session.ts` | `src/hooks/use-media-session.ts` | None |
| `src/hooks/use-playback-persistence.ts` | `src/hooks/use-playback-persistence.ts` | None |
| `src/hooks/use-theme.ts` | `src/hooks/use-theme.ts` | None |
| `src/lib/idb-audio-store.ts` | `src/lib/audio/idb-store.ts` | Change DB_NAME |
| `src/components/speed-button.tsx` | `src/components/app/speed-button.tsx` | Use CSS variables instead of hardcoded colors |
| `src/lib/supabase/client.ts` | `src/lib/supabase/client.ts` | None |
| `src/lib/supabase/server.ts` | `src/lib/supabase/server.ts` | None |
| `src/lib/text-hash.ts` | `src/lib/text-hash.ts` | None (may not be needed if no TTS) |
| `src/hooks/use-offline-audio.ts` | `src/hooks/use-offline-audio.ts` | Replace TTS fetch with R2 URL fetch |
| `src/hooks/use-audio-player.ts` | `src/hooks/use-audio-player.tsx` | Context wrapper + replace TTS with URL fetch + queue |
| `src/components/player-bar.tsx` | `src/components/app/player-bar.tsx` | Add now-playing info + queue nav + CSS vars |

---

## Appendix: Brand Config Database Schema

For reference when setting up the backend:

```sql
CREATE TABLE brands (
  id TEXT PRIMARY KEY,           -- "firefighter"
  name TEXT NOT NULL,            -- "FirefighterPrep"
  domain TEXT UNIQUE NOT NULL,   -- "firefighterprep.audio"
  tagline TEXT NOT NULL,
  logo_url TEXT NOT NULL,
  favicon_url TEXT NOT NULL,
  og_image_url TEXT NOT NULL,
  theme JSONB NOT NULL,          -- { light: {...}, dark: {...}, radius: "..." }
  landing JSONB NOT NULL,        -- { hero: {...}, features: [...], ... }
  seo JSONB NOT NULL,            -- { title, description, keywords }
  content_scope JSONB NOT NULL,  -- { examIds: [...] }
  pricing JSONB NOT NULL,        -- { monthly, yearly, currency, trialDays }
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_brands_domain ON brands(domain);
```
