import type { Metadata } from "next";
import { CodeBlock, InlineCode } from "@/components/docs/code-block";

export const metadata: Metadata = {
  title: "Brand Schema — Graspful Docs",
  description:
    "Full YAML schema reference for Graspful brands. Theme presets, landing page configuration, pricing, SEO, and domain setup.",
  keywords: [
    "graspful brand schema",
    "brand yaml",
    "white label learning",
    "theme presets",
    "landing page config",
  ],
};

function FieldTable({
  fields,
}: {
  fields: { name: string; type: string; required: boolean; description: string }[];
}) {
  return (
    <div className="mt-3 rounded-xl border border-border/50 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/30 bg-muted/30">
            <th className="px-4 py-2 text-left text-xs font-semibold text-foreground">
              Field
            </th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-foreground">
              Type
            </th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-foreground">
              Description
            </th>
          </tr>
        </thead>
        <tbody>
          {fields.map((field) => (
            <tr
              key={field.name}
              className="border-b border-border/20 last:border-0"
            >
              <td className="px-4 py-2 font-mono text-xs text-primary whitespace-nowrap align-top">
                {field.name}
                {field.required && (
                  <span className="text-destructive ml-0.5">*</span>
                )}
              </td>
              <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap align-top">
                {field.type}
              </td>
              <td className="px-4 py-2 text-xs text-muted-foreground">
                {field.description}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function BrandSchemaPage() {
  return (
    <div>
      <h1 className="text-4xl font-bold tracking-[-0.04em] text-foreground">
        Brand Schema
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
        Brand YAML files configure white-label learning sites. Each brand gets
        its own domain, theme, landing page, pricing, and SEO — learners never
        see Graspful.
      </p>

      {/* Top-level structure */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="structure">
          Top-level structure
        </h2>
        <CodeBlock language="yaml">
          {`brand:           # required — identity and domain
  id: string
  name: string
  domain: string
  tagline: string
  orgSlug: string

theme:           # optional — color preset and radius
  preset: string
  radius: string

landing:         # required — landing page sections
  hero: ...
  features: ...
  howItWorks: ...
  faq: ...
  bottomCta: ...

seo:             # optional — meta tags and keywords
  title: string
  description: string
  keywords: [string]

pricing:         # optional — Stripe pricing config
  monthly: number
  yearly: number
  currency: string
  trialDays: number

contentScope:    # optional — which courses this brand serves
  courseIds: [string]`}
        </CodeBlock>
      </section>

      {/* brand */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="brand">
          brand
        </h2>
        <p className="mt-2 text-muted-foreground">
          Core identity for the white-label site.
        </p>
        <FieldTable
          fields={[
            { name: "id", type: "string", required: true, description: "Kebab-case identifier for the brand" },
            { name: "name", type: "string", required: true, description: "Display name (shown in nav, footer, and SEO)" },
            { name: "domain", type: "string", required: true, description: 'Custom domain (e.g., "aws-prep.graspful.ai" or "prep.yourdomain.com")' },
            { name: "tagline", type: "string", required: true, description: "Short tagline shown in the footer" },
            { name: "logoUrl", type: "string", required: false, description: "Path to logo image (e.g., /images/logo.svg)" },
            { name: "faviconUrl", type: "string", required: false, description: "Path to favicon" },
            { name: "ogImageUrl", type: "string", required: false, description: "Open Graph image for social sharing" },
            { name: "orgSlug", type: "string", required: true, description: "Organization slug that owns this brand" },
          ]}
        />
      </section>

      {/* theme */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="theme">
          theme
        </h2>
        <p className="mt-2 text-muted-foreground">
          Use a preset for quick theming, or specify individual HSL colors for
          light and dark modes.
        </p>
        <FieldTable
          fields={[
            { name: "preset", type: "enum", required: false, description: "Color preset (see list below)" },
            { name: "radius", type: "string", required: false, description: 'Border radius (default: "0.5rem")' },
            { name: "light", type: "object", required: false, description: "Custom HSL colors for light mode (overrides preset)" },
            { name: "dark", type: "object", required: false, description: "Custom HSL colors for dark mode (overrides preset)" },
          ]}
        />

        <h3 className="mt-6 text-lg font-semibold text-foreground" id="presets">
          Available presets
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            { name: "blue", color: "bg-blue-500" },
            { name: "red", color: "bg-red-500" },
            { name: "green", color: "bg-green-500" },
            { name: "orange", color: "bg-orange-500" },
            { name: "purple", color: "bg-purple-500" },
            { name: "slate", color: "bg-slate-500" },
            { name: "emerald", color: "bg-emerald-500" },
            { name: "rose", color: "bg-rose-500" },
            { name: "amber", color: "bg-amber-500" },
            { name: "indigo", color: "bg-indigo-500" },
          ].map((preset) => (
            <div
              key={preset.name}
              className="flex items-center gap-2 rounded-lg border border-border/30 bg-card px-3 py-1.5"
            >
              <div className={`h-3.5 w-3.5 rounded-full ${preset.color}`} />
              <span className="text-xs font-mono text-foreground">
                {preset.name}
              </span>
            </div>
          ))}
        </div>

        <h3
          className="mt-6 text-lg font-semibold text-foreground"
          id="custom-colors"
        >
          Custom HSL colors
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          When not using a preset, specify individual colors in{" "}
          <InlineCode>light</InlineCode> and/or <InlineCode>dark</InlineCode>{" "}
          objects. Values use HSL format: <InlineCode>&quot;220 90% 50%&quot;</InlineCode>.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Available color keys: background, foreground, card, cardForeground,
          popover, popoverForeground, primary, primaryForeground, secondary,
          secondaryForeground, muted, mutedForeground, accent, accentForeground,
          destructive, destructiveForeground, border, input, ring.
        </p>
      </section>

      {/* landing */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="landing">
          landing
        </h2>
        <p className="mt-2 text-muted-foreground">
          Configuration for the auto-generated landing page.
        </p>

        <h3 className="mt-6 text-base font-semibold text-foreground">
          landing.hero
        </h3>
        <FieldTable
          fields={[
            { name: "headline", type: "string", required: true, description: "Main headline text" },
            { name: "subheadline", type: "string", required: true, description: "Supporting text below the headline" },
            { name: "ctaText", type: "string", required: true, description: 'Call-to-action button text (e.g., "Start Learning")' },
          ]}
        />

        <h3 className="mt-6 text-base font-semibold text-foreground">
          landing.features
        </h3>
        <FieldTable
          fields={[
            { name: "heading", type: "string", required: true, description: "Section heading" },
            { name: "subheading", type: "string", required: false, description: "Optional subheading" },
            { name: "items", type: "array", required: true, description: "Array of { title, description, icon, wide? } — at least 1 item" },
          ]}
        />

        <h3 className="mt-6 text-base font-semibold text-foreground">
          landing.howItWorks
        </h3>
        <FieldTable
          fields={[
            { name: "heading", type: "string", required: true, description: "Section heading" },
            { name: "items", type: "array", required: true, description: "Array of { title, description } — at least 1 item" },
          ]}
        />

        <h3 className="mt-6 text-base font-semibold text-foreground">
          landing.faq
        </h3>
        <FieldTable
          fields={[
            { name: "(array)", type: "array", required: false, description: "Array of { question, answer } pairs. Defaults to empty." },
          ]}
        />

        <h3 className="mt-6 text-base font-semibold text-foreground">
          landing.bottomCta
        </h3>
        <FieldTable
          fields={[
            { name: "headline", type: "string", required: true, description: "Bottom CTA headline" },
            { name: "subheadline", type: "string", required: false, description: "Optional supporting text" },
          ]}
        />
      </section>

      {/* seo */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="seo">
          seo
        </h2>
        <FieldTable
          fields={[
            { name: "title", type: "string", required: true, description: "Page title for meta tag and browser tab" },
            { name: "description", type: "string", required: true, description: "Meta description for search engines" },
            { name: "keywords", type: "string[]", required: false, description: "Meta keywords array" },
          ]}
        />
      </section>

      {/* pricing */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="pricing">
          pricing
        </h2>
        <p className="mt-2 text-muted-foreground">
          Stripe pricing configuration. Set monthly to 0 for free courses.
        </p>
        <FieldTable
          fields={[
            { name: "monthly", type: "number", required: true, description: "Monthly price in base currency units (0 = free)" },
            { name: "yearly", type: "number", required: false, description: "Optional yearly price (for annual discount)" },
            { name: "currency", type: "string", required: false, description: 'Currency code (default: "usd")' },
            { name: "trialDays", type: "number", required: false, description: "Free trial period in days (default: 0)" },
          ]}
        />
      </section>

      {/* contentScope */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="content-scope">
          contentScope
        </h2>
        <p className="mt-2 text-muted-foreground">
          Controls which courses appear under this brand.
        </p>
        <FieldTable
          fields={[
            { name: "courseIds", type: "string[]", required: false, description: "Array of course IDs to include. Empty = all courses in the org." },
          ]}
        />
      </section>

      {/* Example */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="example">
          Example brand YAML
        </h2>
        <CodeBlock language="yaml" title="aws-prep-brand.yaml">
          {`brand:
  id: aws-prep
  name: AWS Prep Academy
  domain: aws-prep.graspful.ai
  tagline: "Pass the AWS exam on your first try."
  logoUrl: /images/logo-aws-prep.svg
  faviconUrl: /favicon.ico
  ogImageUrl: /images/og-aws-prep.png
  orgSlug: my-org

theme:
  preset: indigo
  radius: "0.5rem"

landing:
  hero:
    headline: "Master AWS. Pass the Exam."
    subheadline: "Adaptive learning that focuses on what you don't know yet."
    ctaText: "Start Studying"
  features:
    heading: "Why AWS Prep Academy?"
    subheading: "Built for the SAA-C03 exam."
    items:
      - title: "Adaptive Learning"
        description: "The engine skips what you already know."
        icon: Brain
      - title: "Spaced Repetition"
        description: "Review at optimal intervals for lasting memory."
        icon: Clock
      - title: "Audio Lessons"
        description: "Study on your commute with AI-generated audio."
        icon: Headphones
  howItWorks:
    heading: "How It Works"
    items:
      - title: "Take a diagnostic"
        description: "We assess your current AWS knowledge in 15 minutes."
      - title: "Study adaptively"
        description: "Focus on gaps. Skip what you know."
      - title: "Pass the exam"
        description: "Prove mastery through progressive challenges."
  faq:
    - question: "How long does it take to prepare?"
      answer: "Most learners are exam-ready in 4-6 weeks."
    - question: "Is the content up to date?"
      answer: "Yes — aligned with the current SAA-C03 exam guide."
  bottomCta:
    headline: "Ready to pass the AWS exam?"
    subheadline: "Start your adaptive study plan today."

seo:
  title: "AWS Prep Academy — Adaptive SAA-C03 Exam Prep"
  description: "Pass the AWS Solutions Architect exam with adaptive learning and spaced repetition."
  keywords:
    - aws certification
    - saa-c03 exam prep
    - aws solutions architect

pricing:
  monthly: 29
  yearly: 249
  currency: usd
  trialDays: 7

contentScope:
  courseIds:
    - aws-saa-c03`}
        </CodeBlock>
      </section>
    </div>
  );
}
