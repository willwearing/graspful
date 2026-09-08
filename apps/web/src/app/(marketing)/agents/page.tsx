import type { Metadata } from "next";
import Link from "next/link";
import {
  Terminal,
  FileCode,
  Rocket,
  Bot,
  Layers,
  CheckCircle,
  Palette,
  BookOpen,
  Sparkles,
  ArrowRight,
  KeyRound,
} from "lucide-react";
import { SoftwareApplicationJsonLd } from "@/components/seo/json-ld";
import { AuthLink } from "@/components/navigation/auth-link";

export const metadata: Metadata = {
  title: "AI Agents",
  description:
    "Build adaptive learning courses with AI agents. Define courses as YAML, import via CLI or MCP, and review and publish a course from your source material.",
  openGraph: {
    title: "Build courses with AI agents — Graspful",
    description:
      "Define courses as YAML, import via CLI or MCP, and publish reviewed lessons with a knowledge graph, practice problems, and scheduled review.",
    url: "https://graspful.ai/agents",
    images: [
      {
        url: "/images/og-graspful.png",
        width: 1200,
        height: 630,
        alt: "Build courses with AI agents — Graspful",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Build courses with AI agents — Graspful",
    description:
      "Define courses as YAML, import via CLI or MCP, and review and publish adaptive learning courses.",
    images: ["/images/og-graspful.png"],
  },
  alternates: {
    canonical: "https://graspful.ai/agents",
  },
};

const agents = [
  { name: "Claude Code", description: "MCP tools through Claude Code" },
  { name: "Cursor", description: "MCP integration in Composer" },
  { name: "OpenAI Codex", description: "CLI tool use with MCP" },
  { name: "ChatGPT", description: "Browse llms.txt for context" },
  { name: "Gemini", description: "Browse llms.txt for context" },
  { name: "Windsurf", description: "MCP integration in Cascade" },
  { name: "VS Code Copilot", description: "MCP support in agent mode" },
];

const mcpTools = [
  {
    name: "graspful_scaffold_course",
    description: "Create a course skeleton for your agent to fill from source material",
  },
  {
    name: "graspful_fill_concept",
    description: "Add knowledge point and problem stubs for your agent to author",
  },
  {
    name: "graspful_review_course",
    description: "Run 10 automated checks, including problem depth and publication readiness",
  },
  {
    name: "graspful_validate",
    description: "Quick schema validation against the course YAML spec",
  },
  {
    name: "graspful_import_course",
    description: "Import a course YAML to the platform, optionally publishing immediately (auth required)",
  },
  {
    name: "graspful_create_brand",
    description: "Generate a brand YAML with landing page, theme, pricing, and SEO",
  },
];

const workflowSteps = [
  {
    icon: FileCode,
    title: "1. Course YAML",
    description:
      "Define your knowledge graph — sections, concepts, prerequisites, knowledge points, and practice problems.",
    file: "aws-saa-c03.yaml",
  },
  {
    icon: Palette,
    title: "2. Brand YAML",
    description:
      "Configure the landing page, pricing, theme preset, and SEO. This becomes a standalone product site.",
    file: "aws-prep-brand.yaml",
  },
  {
    icon: Rocket,
    title: "3. Import & Launch",
    description:
      "Import the reviewed course and brand files, then confirm course publication and domain verification. Billing requires separate setup.",
    file: null,
  },
];

export default function AgentsPage() {
  return (
    <div className="bg-background text-foreground">
      {/* Hero */}
      <section className="relative min-h-[70vh] flex items-center">
        <div className="gradient-mesh overflow-hidden">
          <div className="orb-1" />
          <div className="orb-2" />
          <div className="orb-3" />
        </div>
        <div className="relative z-10 mx-auto max-w-5xl px-6 py-32 text-center md:py-40">
          <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/50 px-4 py-1.5 text-sm text-muted-foreground mb-8 backdrop-blur-sm">
            <Bot className="h-4 w-4" />
            CLI and MCP tools for AI agents
          </div>
          <h1 className="text-5xl font-bold tracking-[-0.04em] leading-[1.1] sm:text-6xl lg:text-7xl">
            <span className="text-foreground">Build courses with AI agents.</span>
            <br />
            <span className="text-gradient">Review before you publish.</span>
          </h1>
          <p className="animate-fade-up mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl" style={{ animationDelay: "0.3s" }}>
            Give your source material to an external AI agent. It writes course
            YAML with Graspful tools. Review the lessons and answers, then import
            a draft and confirm publication.
          </p>
          <div className="animate-fade-up mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center" style={{ animationDelay: "0.5s" }}>
            <code className="rounded-lg border border-border/50 bg-card px-6 py-3 font-mono text-sm text-foreground">
              bun add -g @graspful/cli
            </code>
            <AuthLink
              href="/sign-up"
              className="btn-gradient px-8 py-3 text-sm font-medium"
            >
              Get started Free
            </AuthLink>
          </div>
        </div>
      </section>

      {/* Supported Agents */}
      <section className="bg-[#F8FAFC] py-24 md:py-32 dark:bg-card/50">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold tracking-[-0.03em] text-foreground sm:text-4xl mb-4">
            Works with your tools
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
            An agent with MCP or terminal access can use Graspful tools. The llms.txt reference supplies documentation to other assistants.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {agents.map((agent) => (
              <div
                key={agent.name}
                className="rounded-xl border border-border/50 bg-white p-6 shadow-sm dark:bg-card"
              >
                <h3 className="text-sm font-semibold text-foreground mb-1">
                  {agent.name}
                </h3>
                <p className="text-xs text-muted-foreground">{agent.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Two-YAML Workflow */}
      <section className="relative bg-[#0A1628] py-24 md:py-32 overflow-hidden">
        <div className="gradient-mesh opacity-30">
          <div className="orb-1" />
          <div className="orb-2" />
        </div>
        <div className="relative z-10 mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold tracking-[-0.03em] text-white sm:text-4xl mb-4">
            Two YAMLs. One product.
          </h2>
          <p className="text-center text-slate-400 mb-16 max-w-xl mx-auto">
            A course YAML defines the learning content. A brand YAML configures the product.
            Import both, and you have a live business.
          </p>
          <div className="relative">
            <div className="absolute top-10 left-[10%] right-[10%] h-px hidden sm:block overflow-hidden">
              <div className="w-full h-full bg-gradient-to-r from-primary via-secondary to-primary animate-line-grow" style={{ animationDuration: "1.5s" }} />
            </div>
            <div className="grid gap-12 sm:grid-cols-3 sm:gap-8">
              {workflowSteps.map((step) => {
                const Icon = step.icon;
                return (
                  <div key={step.title} className="flex flex-col items-center text-center">
                    <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-white shadow-[0_0_40px_rgba(99,102,241,0.3)] mb-6">
                      <Icon className="h-8 w-8" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                    <p className="text-slate-400 leading-relaxed text-sm">{step.description}</p>
                    {step.file && (
                      <code className="mt-3 text-xs text-primary/80 font-mono">{step.file}</code>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* MCP Tools */}
      <section className="py-24 md:py-32 bg-background">
        <div className="mx-auto max-w-5xl px-6">
          <div className="flex items-center gap-3 mb-4 justify-center">
            <Terminal className="h-6 w-6 text-primary" />
            <h2 className="text-3xl font-bold tracking-[-0.03em] text-foreground sm:text-4xl">
              MCP Tools
            </h2>
          </div>
          <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
            MCP tools cover scaffolding, content stubs, validation, review, and import. Browser authentication creates the credentials for publishing.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {mcpTools.map((tool) => (
              <div
                key={tool.name}
                className="rounded-xl border border-border/50 bg-card p-6 transition-all duration-200 hover:shadow-md"
              >
                <code className="text-sm font-mono font-semibold text-primary">
                  {tool.name}
                </code>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {tool.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How agents use Graspful */}
      <section className="bg-[#F8FAFC] py-24 md:py-32 dark:bg-card/50">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold tracking-[-0.03em] text-foreground sm:text-4xl mb-12">
            How agents build courses
          </h2>
          <div className="space-y-6">
            {[
              {
                icon: KeyRound,
                step: "0",
                title: "Authenticate for import and publish",
                description:
                  "Install the CLI, then run graspful register when you are ready to import. For MCP, configure GRASPFUL_API_KEY in your agent. Local scaffolding and review work without an account.",
              },
              {
                icon: BookOpen,
                step: "1",
                title: "Start from a source document",
                description:
                  "Feed the agent an exam guide, textbook, or documentation. It scaffolds the knowledge graph — sections, concepts, and prerequisite edges.",
              },
              {
                icon: Layers,
                step: "2",
                title: "Fill concepts incrementally",
                description:
                  "The agent fills one concept at a time — generating knowledge points with progressive difficulty and at least 3 practice problems each.",
              },
              {
                icon: CheckCircle,
                step: "3",
                title: "Review catches quality issues",
                description:
                  "The review gate checks content readiness, question variants, teaching alignment, and structure. A passing result still needs source and answer-key review.",
              },
              {
                icon: Sparkles,
                step: "4",
                title: "Import and publish",
                description:
                  "Import a course draft, request publication, and confirm published: true in the result. Import brand settings separately. Paid subscriptions are not available yet.",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.step}
                  className="flex gap-6 rounded-xl border border-border/50 bg-white p-6 dark:bg-card"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground mb-1">
                      {item.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* What agents build on */}
      <section className="py-24 md:py-32 bg-background">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold tracking-[-0.03em] text-foreground sm:text-4xl mb-4">
            What your courses are built on
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            You bring the content expertise. The platform brings the learning science.
            Every course you create automatically gets these research-backed systems.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Knowledge Graph",
                description: "Prerequisite links guide which concepts a learner can study next, based on recorded mastery estimates.",
                href: "/docs/concepts/knowledge-graph",
              },
              {
                title: "Adaptive Diagnostics",
                description: "Adaptive questions estimate which concepts a learner knows and where to begin practice.",
                href: "/docs/concepts/adaptive-diagnostics",
              },
              {
                title: "Mastery-Based Progression",
                description: "Bayesian Knowledge Tracing updates mastery estimates from learner answers. These estimates guide progression.",
                href: "/docs/concepts/mastery-learning",
              },
              {
                title: "Spaced Repetition",
                description: "The FIRe algorithm adjusts review intervals using recorded answers and related practice.",
                href: "/docs/concepts/spaced-repetition",
              },
              {
                title: "Intelligent Task Selection",
                description: "Priority-based system chooses lessons, reviews, or remediation — whatever the student needs most right now.",
                href: "/docs/concepts/task-selection",
              },
              {
                title: "XP and Gamification",
                description: "Streaks, leaderboards, and XP calibrated to ~1 point per minute drive daily engagement.",
                href: "/docs/concepts/gamification",
              },
            ].map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="group rounded-xl border border-border/50 bg-card p-6 transition-all duration-200 hover:shadow-md hover:border-primary/20"
              >
                <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </Link>
            ))}
          </div>
          <p className="text-center mt-8">
            <Link href="/docs/how-it-works" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
              How the learning engine works <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </p>
        </div>
      </section>

      <section className="bg-background px-6 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-foreground">Start with local authoring</h2>
          <p className="mt-4 text-muted-foreground">Local authoring and review are free. Paid subscriptions are not available yet. We will publish plan and payout details when billing is ready.</p>
          <Link href="/pricing" className="mt-4 inline-block text-primary underline">See current availability</Link>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative overflow-hidden py-24 md:py-32">
        <div className="gradient-mesh opacity-20">
          <div className="orb-1" />
          <div className="orb-2" />
        </div>
        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-[-0.03em] text-foreground sm:text-4xl lg:text-5xl mb-4">
            Start with one course draft.
          </h2>
          <p className="text-muted-foreground mb-8">
            Install the CLI and give your source document to your agent. Author, review, import, then confirm publication.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <code className="rounded-lg border border-border/50 bg-card px-6 py-3 font-mono text-sm text-foreground">
              bun add -g @graspful/cli
            </code>
            <AuthLink
              href="/sign-up"
              className="btn-gradient inline-flex items-center gap-2 px-8 py-3 text-sm font-medium"
            >
              Get started <ArrowRight className="h-4 w-4" />
            </AuthLink>
          </div>
          <div className="mt-6 flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <Link href="/docs" className="hover:text-foreground transition-colors">
              Documentation
            </Link>
            <Link href="/pricing" className="hover:text-foreground transition-colors">
              Pricing
            </Link>
            <Link href="/docs/mcp" className="hover:text-foreground transition-colors">
              MCP Setup
            </Link>
          </div>
        </div>
      </section>

      <SoftwareApplicationJsonLd
        name="Graspful"
        description="Author and review course YAML with AI agents. Import via CLI or MCP, confirm publication, and offer lessons, practice problems, and scheduled review."
        url="https://graspful.ai"
        applicationCategory="EducationalApplication"
        operatingSystem="Web"
        offers={{ price: 0, priceCurrency: "USD" }}
      />
    </div>
  );
}
