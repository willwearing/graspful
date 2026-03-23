import type { Metadata } from "next";
import Link from "next/link";
import { CodeBlock } from "@/components/docs/code-block";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Design Guide — Graspful Docs",
  description:
    "Brand colors, typography, spacing, and component patterns for Graspful. Use this guide to maintain visual consistency across brands and pages.",
  keywords: [
    "graspful design",
    "brand guide",
    "style guide",
    "design system",
    "theme presets",
  ],
};

const graspfulColors = [
  { name: "Primary", hsl: "199 89% 48%", hex: "#0EA5E9", usage: "Buttons, links, active states, icons" },
  { name: "Secondary", hsl: "210 80% 55%", hex: "#4A90D9", usage: "Supporting accents, secondary buttons" },
  { name: "Accent", hsl: "186 94% 42%", hex: "#06B6B4", usage: "Highlights, badges, teal accents" },
  { name: "Foreground", hsl: "222 47% 11%", hex: "#0F172A", usage: "Headings, body text" },
  { name: "Muted Foreground", hsl: "200 5% 46%", hex: "#6B7280", usage: "Secondary text, descriptions" },
  { name: "Background", hsl: "0 0% 100%", hex: "#FFFFFF", usage: "Page background" },
  { name: "Card", hsl: "0 0% 100%", hex: "#FFFFFF", usage: "Card surfaces, elevated content" },
  { name: "Border", hsl: "200 10% 90%", hex: "#E5E7EB", usage: "Card borders, dividers" },
  { name: "Muted", hsl: "200 10% 96%", hex: "#F5F5F5", usage: "Subtle backgrounds, code blocks inline" },
  { name: "Destructive", hsl: "0 84% 60%", hex: "#EF4444", usage: "Errors, destructive actions" },
];

const gradientColors = [
  { name: "Start", hex: "#0284C7", usage: "Gradient left / top" },
  { name: "Mid", hex: "#0EA5E9", usage: "Gradient center" },
  { name: "End", hex: "#38BDF8", usage: "Gradient right / bottom" },
  { name: "Accent", hex: "#2DD4BF", usage: "Mesh orbs, teal highlight" },
];

const brandPresets = [
  { name: "Sky Blue", id: "sky", primary: "#0EA5E9", usage: "Graspful (default)" },
  { name: "Red / Orange", id: "red", primary: "#FF6600", usage: "FirefighterPrep" },
  { name: "Blue", id: "blue", primary: "#3B82F6", usage: "ElectricianPrep" },
  { name: "Yellow", id: "yellow", primary: "#EAB308", usage: "JSPrep" },
  { name: "Orange", id: "orange", primary: "#F97316", usage: "PostHog TAM" },
];

export default function DesignGuidePage() {
  return (
    <div>
      <h1 className="text-4xl font-bold tracking-[-0.04em] text-foreground">
        Design Guide
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
        Colors, typography, spacing, and component patterns for Graspful.
        Every brand gets its own theme — this documents the Graspful defaults
        and the system that drives all brands.
      </p>

      {/* Logo & Favicon */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="logo">
          Logo and Favicon
        </h2>
        <p className="mt-2 text-muted-foreground">
          The Graspful favicon is a white &ldquo;G&rdquo; on a sky-blue rounded
          square. It ships as three formats for maximum compatibility.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border/50 bg-card p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">SVG</p>
            <code className="text-sm font-mono text-foreground">src/app/icon.svg</code>
            <p className="mt-1 text-xs text-muted-foreground">Modern browsers. Auto-served by Next.js.</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">ICO</p>
            <code className="text-sm font-mono text-foreground">src/app/favicon.ico</code>
            <p className="mt-1 text-xs text-muted-foreground">Legacy browsers. 16px, 32px, 48px.</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">PNG</p>
            <code className="text-sm font-mono text-foreground">src/app/apple-icon.png</code>
            <p className="mt-1 text-xs text-muted-foreground">iOS home screen. 180x180.</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Each brand sets{" "}
          <code className="rounded-md bg-muted px-1.5 py-0.5 text-sm font-mono">faviconUrl</code>{" "}
          in its brand YAML. The root layout injects it as{" "}
          <code className="rounded-md bg-muted px-1.5 py-0.5 text-sm font-mono">&lt;link rel=&quot;icon&quot;&gt;</code>.
          Next.js also auto-serves{" "}
          <code className="rounded-md bg-muted px-1.5 py-0.5 text-sm font-mono">icon.svg</code>{" "}
          and{" "}
          <code className="rounded-md bg-muted px-1.5 py-0.5 text-sm font-mono">apple-icon.png</code>{" "}
          from the app directory.
        </p>
      </section>

      {/* Colors */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="colors">
          Colors
        </h2>
        <p className="mt-2 text-muted-foreground">
          The Graspful brand uses a sky-blue primary with teal accents.
          All colors are defined as HSL values in the brand config and injected
          as CSS custom properties at runtime.
        </p>

        <h3 className="text-lg font-semibold text-foreground mt-6">Core palette</h3>
        <div className="mt-3 space-y-2">
          {graspfulColors.map((color) => (
            <div key={color.name} className="flex items-center gap-4 rounded-lg border border-border/50 bg-card px-4 py-3">
              <div
                className="h-8 w-8 shrink-0 rounded-md border border-border/50"
                style={{ backgroundColor: color.hex }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-foreground">{color.name}</span>
                  <code className="text-xs font-mono text-muted-foreground">{color.hex}</code>
                  <code className="text-xs font-mono text-muted-foreground">hsl({color.hsl})</code>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{color.usage}</p>
              </div>
            </div>
          ))}
        </div>

        <h3 className="text-lg font-semibold text-foreground mt-6">Gradient</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Used for CTA buttons, hero text, and mesh background orbs on marketing pages.
        </p>
        <div className="mt-3 rounded-xl border border-border/50 overflow-hidden">
          <div className="h-16 w-full" style={{ background: "linear-gradient(135deg, #0284C7, #0EA5E9, #38BDF8, #2DD4BF)" }} />
          <div className="p-4 grid gap-2 sm:grid-cols-4">
            {gradientColors.map((color) => (
              <div key={color.name} className="flex items-center gap-2">
                <div className="h-5 w-5 shrink-0 rounded border border-border/50" style={{ backgroundColor: color.hex }} />
                <div>
                  <p className="text-xs font-semibold text-foreground">{color.name}</p>
                  <code className="text-[10px] font-mono text-muted-foreground">{color.hex}</code>
                </div>
              </div>
            ))}
          </div>
        </div>
        <CodeBlock language="css" title="CSS custom properties (injected by BrandThemeStyle)">
          {`:root {
  --primary: hsl(199 89% 48%);
  --secondary: hsl(210 80% 55%);
  --accent: hsl(186 94% 42%);
  --foreground: hsl(222 47% 11%);
  --background: hsl(0 0% 100%);
  --muted-foreground: hsl(200 5% 46%);
  --border: hsl(200 10% 90%);
  --radius: 0.625rem;
  --gradient-start: #0284C7;
  --gradient-mid: #0EA5E9;
  --gradient-end: #38BDF8;
  --gradient-accent: #2DD4BF;
}`}
        </CodeBlock>
      </section>

      {/* Typography */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="typography">
          Typography
        </h2>
        <p className="mt-2 text-muted-foreground">
          Inter is the only typeface. Loaded via{" "}
          <code className="rounded-md bg-muted px-1.5 py-0.5 text-sm font-mono">next/font/google</code>{" "}
          with{" "}
          <code className="rounded-md bg-muted px-1.5 py-0.5 text-sm font-mono">display: swap</code>.
        </p>

        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-border/50 bg-card p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Heading scale</p>
            <div className="space-y-3">
              <div>
                <p className="text-4xl font-bold tracking-[-0.04em] text-foreground">Page title</p>
                <code className="text-xs font-mono text-muted-foreground">text-4xl font-bold tracking-[-0.04em]</code>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">Section heading</p>
                <code className="text-xs font-mono text-muted-foreground">text-2xl font-bold</code>
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">Subsection heading</p>
                <code className="text-xs font-mono text-muted-foreground">text-lg font-semibold</code>
              </div>
              <div>
                <p className="text-base font-semibold text-foreground">Card title</p>
                <code className="text-xs font-mono text-muted-foreground">text-base font-semibold</code>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/50 bg-card p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Body text</p>
            <div className="space-y-3">
              <div>
                <p className="text-lg leading-relaxed text-muted-foreground">Intro paragraph — used below page titles</p>
                <code className="text-xs font-mono text-muted-foreground">text-lg leading-relaxed text-muted-foreground</code>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Body text — used in sections and descriptions</p>
                <code className="text-xs font-mono text-muted-foreground">text-sm text-muted-foreground</code>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Small text — captions, labels</p>
                <code className="text-xs font-mono text-muted-foreground">text-xs text-muted-foreground</code>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Spacing */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="spacing">
          Spacing and Layout
        </h2>
        <p className="mt-2 text-muted-foreground">
          Consistent spacing creates visual rhythm. These are the patterns used
          across all doc and marketing pages.
        </p>
        <div className="mt-4 rounded-xl border border-border/50 bg-card p-6">
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-4">
              <code className="w-32 font-mono text-muted-foreground">mt-12</code>
              <span className="text-foreground">Between major sections</span>
            </div>
            <div className="flex items-center gap-4">
              <code className="w-32 font-mono text-muted-foreground">mt-6</code>
              <span className="text-foreground">Between subsections (h3)</span>
            </div>
            <div className="flex items-center gap-4">
              <code className="w-32 font-mono text-muted-foreground">mt-4</code>
              <span className="text-foreground">Content after a heading</span>
            </div>
            <div className="flex items-center gap-4">
              <code className="w-32 font-mono text-muted-foreground">mt-2</code>
              <span className="text-foreground">Paragraph after a heading</span>
            </div>
            <div className="flex items-center gap-4">
              <code className="w-32 font-mono text-muted-foreground">gap-4</code>
              <span className="text-foreground">Grid gaps (cards, items)</span>
            </div>
            <div className="flex items-center gap-4">
              <code className="w-32 font-mono text-muted-foreground">p-6</code>
              <span className="text-foreground">Card padding</span>
            </div>
            <div className="flex items-center gap-4">
              <code className="w-32 font-mono text-muted-foreground">p-8</code>
              <span className="text-foreground">Feature card / CTA padding</span>
            </div>
            <div className="flex items-center gap-4">
              <code className="w-32 font-mono text-muted-foreground">max-w-7xl</code>
              <span className="text-foreground">Page max width (docs layout)</span>
            </div>
            <div className="flex items-center gap-4">
              <code className="w-32 font-mono text-muted-foreground">max-w-5xl</code>
              <span className="text-foreground">Marketing section max width</span>
            </div>
            <div className="flex items-center gap-4">
              <code className="w-32 font-mono text-muted-foreground">rounded-xl</code>
              <span className="text-foreground">Cards and containers</span>
            </div>
            <div className="flex items-center gap-4">
              <code className="w-32 font-mono text-muted-foreground">rounded-lg</code>
              <span className="text-foreground">Buttons, inputs, smaller elements</span>
            </div>
          </div>
        </div>
      </section>

      {/* Component Patterns */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="components">
          Component Patterns
        </h2>
        <p className="mt-2 text-muted-foreground">
          Reusable patterns across docs and marketing pages.
        </p>

        <h3 className="text-lg font-semibold text-foreground mt-6">Card</h3>
        <div className="mt-3 rounded-xl border border-border/50 bg-card p-6 transition-all duration-200 hover:shadow-md hover:border-primary/20">
          <h4 className="text-base font-semibold text-foreground mb-1">Card Title</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Card description text. Cards use rounded-xl, border-border/50, bg-card, and p-6.
            Hover state adds shadow-md and border-primary/20.
          </p>
        </div>
        <CodeBlock language="tsx" title="Card pattern">
          {`<div className="rounded-xl border border-border/50 bg-card p-6
     transition-all duration-200 hover:shadow-md hover:border-primary/20">
  <h3 className="text-base font-semibold text-foreground mb-1">Title</h3>
  <p className="text-sm text-muted-foreground">Description</p>
</div>`}
        </CodeBlock>

        <h3 className="text-lg font-semibold text-foreground mt-6">Code block</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Dark background (<code className="rounded-md bg-muted px-1.5 py-0.5 text-sm font-mono">#0A1628</code>),
          slate-300 text, optional title bar, copy button on hover. Import from{" "}
          <code className="rounded-md bg-muted px-1.5 py-0.5 text-sm font-mono">@/components/docs/code-block</code>.
        </p>
        <CodeBlock language="tsx">
          {`import { CodeBlock } from "@/components/docs/code-block";

<CodeBlock language="yaml" title="example.yaml">
  {\`key: value\`}
</CodeBlock>`}
        </CodeBlock>

        <h3 className="text-lg font-semibold text-foreground mt-6">Section label</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Used in sidebar nav and card group headers.
        </p>
        <div className="mt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Section Label
          </p>
        </div>
        <CodeBlock language="tsx">
          {`<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
  Section Label
</p>`}
        </CodeBlock>

        <h3 className="text-lg font-semibold text-foreground mt-6">Next steps card</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Every doc page ends with this. Links to related pages.
        </p>
        <CodeBlock language="tsx">
          {`<section className="mt-16 rounded-xl border border-border/50 bg-card p-8">
  <h2 className="text-xl font-bold text-foreground mb-4">Next steps</h2>
  <div className="grid gap-3 sm:grid-cols-2">
    <Link href="/docs/page" className="group flex items-center gap-2 text-sm
      text-muted-foreground hover:text-foreground transition-colors">
      <ArrowRight className="h-3.5 w-3.5 text-primary" />
      <span>Link text</span>
    </Link>
  </div>
</section>`}
        </CodeBlock>
      </section>

      {/* Multi-Brand Theme System */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="themes">
          Multi-Brand Theme System
        </h2>
        <p className="mt-2 text-muted-foreground">
          Graspful is white-label. Each brand defines its own colors, gradients,
          and radius in the brand config. The{" "}
          <code className="rounded-md bg-muted px-1.5 py-0.5 text-sm font-mono">BrandThemeStyle</code>{" "}
          component injects these as CSS custom properties at runtime, overriding
          the defaults in globals.css.
        </p>

        <h3 className="text-lg font-semibold text-foreground mt-6">Available brand presets</h3>
        <div className="mt-3 space-y-2">
          {brandPresets.map((preset) => (
            <div key={preset.id} className="flex items-center gap-4 rounded-lg border border-border/50 bg-card px-4 py-3">
              <div
                className="h-8 w-8 shrink-0 rounded-md border border-border/50"
                style={{ backgroundColor: preset.primary }}
              />
              <div>
                <span className="text-sm font-semibold text-foreground">{preset.name}</span>
                <span className="text-xs text-muted-foreground ml-2">({preset.usage})</span>
              </div>
              <code className="ml-auto text-xs font-mono text-muted-foreground">{preset.primary}</code>
            </div>
          ))}
        </div>

        <h3 className="text-lg font-semibold text-foreground mt-6">How theming works</h3>
        <CodeBlock language="yaml" title="brand.yaml — theme section">
          {`theme:
  preset: sky          # Not used at runtime — colors are explicit
  radius: "0.625rem"   # Border radius base

# Colors are defined in the TypeScript brand config (defaults.ts)
# as BrandThemeColors objects for light and dark modes.
# BrandThemeStyle converts them to CSS custom properties.`}
        </CodeBlock>

        <CodeBlock language="tsx" title="How BrandThemeStyle works">
          {`// In root layout.tsx:
<BrandThemeStyle brand={brand} />

// This injects a <style> tag:
// :root { --primary: hsl(199 89% 48%); ... }
// .dark { --primary: hsl(199 89% 58%); ... }

// All Tailwind classes (bg-primary, text-foreground, etc.)
// automatically pick up the brand's colors.`}
        </CodeBlock>
      </section>

      {/* Dark Mode */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="dark-mode">
          Dark Mode
        </h2>
        <p className="mt-2 text-muted-foreground">
          Dark mode is supported via the{" "}
          <code className="rounded-md bg-muted px-1.5 py-0.5 text-sm font-mono">.dark</code>{" "}
          class on the HTML element. The{" "}
          <code className="rounded-md bg-muted px-1.5 py-0.5 text-sm font-mono">ThemeProvider</code>{" "}
          manages toggling. Marketing pages force light mode.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Each brand defines both{" "}
          <code className="rounded-md bg-muted px-1.5 py-0.5 text-sm font-mono">theme.light</code>{" "}
          and{" "}
          <code className="rounded-md bg-muted px-1.5 py-0.5 text-sm font-mono">theme.dark</code>{" "}
          color sets. The app layout (student dashboard, study flow) respects the user&apos;s
          preference. Marketing pages always render in light mode.
        </p>
      </section>

      {/* Next steps */}
      <section className="mt-16 rounded-xl border border-border/50 bg-card p-8">
        <h2 className="text-xl font-bold text-foreground mb-4">Next steps</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/docs/brand-schema"
            className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowRight className="h-3.5 w-3.5 text-primary" />
            <span>Brand YAML schema reference</span>
          </Link>
          <Link
            href="/docs/how-it-works"
            className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowRight className="h-3.5 w-3.5 text-primary" />
            <span>How Graspful Works</span>
          </Link>
          <Link
            href="/docs/course-creation-guide"
            className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowRight className="h-3.5 w-3.5 text-primary" />
            <span>Course Creation Guide</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
