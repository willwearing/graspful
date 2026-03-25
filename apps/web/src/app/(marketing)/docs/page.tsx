import type { Metadata } from "next";
import Link from "next/link";
import {
  Rocket,
  Terminal,
  Bot,
  FileCode,
  Palette,
  CreditCard,
  ShieldCheck,
  ArrowRight,
  Brain,
  Network,
  Target,
  BarChart3,
  Repeat,
  ListChecks,
  Gamepad2,
  TrendingUp,
  GraduationCap,
  Paintbrush,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "Everything you need to create adaptive learning courses with Graspful. Concepts, learning science, CLI reference, MCP server setup, YAML schemas, billing, and quality checks.",
  keywords: [
    "graspful docs",
    "graspful documentation",
    "adaptive learning",
    "course creation",
    "MCP server",
    "CLI reference",
    "knowledge graph",
    "mastery learning",
    "spaced repetition",
  ],
  openGraph: {
    title: "Documentation — Graspful",
    description:
      "CLI reference, MCP server setup, YAML schemas, billing, and quality checks for Graspful course creation.",
    url: "https://graspful.ai/docs",
    images: [
      {
        url: "/images/og-graspful.png",
        width: 1200,
        height: 630,
        alt: "Graspful Documentation",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Documentation — Graspful",
    description:
      "CLI reference, MCP server setup, YAML schemas, and quality checks for building adaptive courses.",
    images: ["/images/og-graspful.png"],
  },
  alternates: {
    canonical: "https://graspful.ai/docs",
  },
};

const sectionGroups = [
  {
    label: "Getting Started",
    sections: [
      {
        href: "/docs/quickstart",
        icon: Rocket,
        title: "Quickstart",
        description:
          "Install the CLI, scaffold a course, fill concepts, review, and publish — in under 5 minutes.",
      },
      {
        href: "/docs/how-it-works",
        icon: Brain,
        title: "How It Works",
        description:
          "Conceptual overview of the adaptive learning engine — the 7 core principles, two-YAML workflow, and system architecture.",
      },
      {
        href: "/docs/glossary",
        icon: GraduationCap,
        title: "Glossary",
        description:
          "Consistent definitions for every platform concept — from Academy to XP. Essential reference for humans and AI agents.",
      },
    ],
  },
  {
    label: "Building Courses",
    sections: [
      {
        href: "/docs/course-creation-guide",
        icon: ArrowRight,
        title: "Course Creation Guide",
        description:
          "Step-by-step guide to building a course on Graspful. Content-agnostic — works for any subject.",
      },
      {
        href: "/docs/course-schema",
        icon: FileCode,
        title: "Course Schema",
        description:
          "Full YAML schema reference for courses — sections, concepts, knowledge points, problems, and prerequisite edges.",
      },
      {
        href: "/docs/brand-schema",
        icon: Palette,
        title: "Brand Schema",
        description:
          "YAML schema for white-label brands — theme presets, landing page configuration, SEO, and pricing.",
      },
      {
        href: "/docs/review-gate",
        icon: ShieldCheck,
        title: "Review Gate",
        description:
          "The 10 mechanical quality checks that every course must pass before publishing.",
      },
      {
        href: "/docs/design-guide",
        icon: Paintbrush,
        title: "Design Guide",
        description:
          "Brand colors, typography, spacing, and component patterns. The visual system behind every Graspful brand.",
      },
    ],
  },
  {
    label: "Tools",
    sections: [
      {
        href: "/docs/cli",
        icon: Terminal,
        title: "CLI Reference",
        description:
          "Full reference for every graspful command: validate, import, publish, review, create, fill, describe, and login.",
      },
      {
        href: "/docs/mcp",
        icon: Bot,
        title: "MCP Server",
        description:
          "Set up the MCP server for Claude Code, Cursor, Codex, and VS Code. All 10 tools with schemas and examples.",
      },
    ],
  },
  {
    label: "Concepts",
    sections: [
      {
        href: "/docs/concepts/knowledge-graph",
        icon: Network,
        title: "Knowledge Graph",
        description:
          "Prerequisites, encompassing edges, and the knowledge frontier that drives adaptive learning.",
      },
      {
        href: "/docs/concepts/mastery-learning",
        icon: Target,
        title: "Mastery Learning",
        description:
          "Bayesian Knowledge Tracing, mastery states, and why students never advance without understanding.",
      },
      {
        href: "/docs/concepts/adaptive-diagnostics",
        icon: BarChart3,
        title: "Adaptive Diagnostics",
        description:
          "MEPE question selection and evidence propagation — how 20-60 questions map student knowledge.",
      },
      {
        href: "/docs/concepts/spaced-repetition",
        icon: Repeat,
        title: "Spaced Repetition",
        description:
          "The FIRe algorithm, implicit repetition via encompassing edges, and exponential memory decay.",
      },
      {
        href: "/docs/concepts/task-selection",
        icon: ListChecks,
        title: "Task Selection",
        description:
          "Priority-based system that chooses lessons, reviews, or remediation — whatever the student needs most.",
      },
      {
        href: "/docs/concepts/gamification",
        icon: Gamepad2,
        title: "Gamification",
        description:
          "XP calibrated to ~1 point per minute, streaks, leaderboards, and daily caps.",
      },
      {
        href: "/docs/concepts/learning-staircase",
        icon: TrendingUp,
        title: "Learning Staircase",
        description:
          "Knowledge points with progressive difficulty — structured as a staircase from simple to complex.",
      },
    ],
  },
  {
    label: "Business",
    sections: [
      {
        href: "/docs/billing",
        icon: CreditCard,
        title: "Billing",
        description:
          "70/30 revenue share model, Stripe Connect setup, free tier, and API key management.",
      },
    ],
  },
];

export default function DocsIndexPage() {
  return (
    <div>
      <h1 className="text-4xl font-bold tracking-[-0.04em] text-foreground">
        Documentation
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
        Graspful is the fastest way to create adaptive learning courses. Define
        a course as YAML, import it via CLI or MCP, and get a live product with
        a landing page, knowledge graph, spaced repetition, and billing.
      </p>

      <div className="mt-4 flex items-center gap-4">
        <code className="rounded-lg border border-border/50 bg-card px-4 py-2 font-mono text-sm text-foreground">
          bun add -g @graspful/cli
        </code>
        <Link
          href="/docs/quickstart"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          Get started <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {sectionGroups.map((group) => (
        <div key={group.label} className="mt-12">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            {group.label}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {group.sections.map((section) => {
              const Icon = section.icon;
              return (
                <Link
                  key={section.href}
                  href={section.href}
                  className="group rounded-xl border border-border/50 bg-card p-6 transition-all duration-200 hover:shadow-md hover:border-primary/20"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-4.5 w-4.5 text-primary" />
                    </div>
                    <h2 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                      {section.title}
                    </h2>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {section.description}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      ))}

      <div className="mt-16 rounded-xl border border-border/50 bg-[#0A1628] p-8">
        <h2 className="text-xl font-bold text-white mb-3">
          The two-YAML workflow
        </h2>
        <p className="text-slate-400 text-sm leading-relaxed mb-6 max-w-xl">
          Every Graspful product is defined by two YAML files. A course YAML
          defines the learning content. A brand YAML configures the product.
          Import both, and you have a live business.
        </p>
        <div className="grid gap-6 sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary/80 mb-1">
              Step 1
            </p>
            <p className="text-sm font-medium text-white">Course YAML</p>
            <p className="text-xs text-slate-400 mt-1">
              Sections, concepts, prerequisites, knowledge points, and practice
              problems.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary/80 mb-1">
              Step 2
            </p>
            <p className="text-sm font-medium text-white">Brand YAML</p>
            <p className="text-xs text-slate-400 mt-1">
              Landing page, theme preset, pricing, SEO, and custom domain.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary/80 mb-1">
              Step 3
            </p>
            <p className="text-sm font-medium text-white">Import & Launch</p>
            <p className="text-xs text-slate-400 mt-1">
              One command imports both and publishes a live product with
              billing and adaptive learning.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
