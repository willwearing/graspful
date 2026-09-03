import type { Metadata } from "next";
import {
  ArrowRight,
  Bot,
  Brain,
  CheckCircle2,
  FileCheck2,
  Network,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { FAQPageJsonLd } from "@/components/seo/json-ld";
import { TrackedMarketingLink } from "@/components/marketing/tracked-marketing-link";

export const metadata: Metadata = {
  title: "AI Course Builder for Adaptive Learning",
  description:
    "Build validated adaptive courses from source material with Claude, Codex, Cursor, or another MCP client. Create knowledge graphs, lessons, assessments, and a branded learning site.",
  keywords: [
    "AI course builder",
    "AI course generator",
    "adaptive course builder",
    "create online course with AI",
    "AI agent course creation",
    "MCP course builder",
    "course generator from source material",
  ],
  alternates: { canonical: "https://graspful.ai/ai-course-builder" },
  openGraph: {
    title: "AI Course Builder for Adaptive Learning | Graspful",
    description:
      "Turn source material into a validated adaptive course with your AI coding agent.",
    url: "https://graspful.ai/ai-course-builder",
    images: [
      {
        url: "/images/og-graspful.png",
        width: 1200,
        height: 630,
        alt: "Graspful AI course builder",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Course Builder for Adaptive Learning | Graspful",
    description:
      "Turn source material into a validated adaptive course with your AI coding agent.",
    images: ["/images/og-graspful.png"],
  },
};

const workflow = [
  {
    icon: Bot,
    title: "Connect your AI agent",
    description:
      "Install the Graspful CLI or MCP server in Claude, Codex, Cursor, Windsurf, or VS Code.",
  },
  {
    icon: Network,
    title: "Build the learning graph",
    description:
      "Your agent maps concepts, prerequisites, lessons, worked examples, and assessment problems from your source material.",
  },
  {
    icon: ShieldCheck,
    title: "Validate course quality",
    description:
      "Ten automated checks find weak coverage, duplicate questions, missing explanations, and broken prerequisite links.",
  },
  {
    icon: Brain,
    title: "Publish adaptive learning",
    description:
      "Each learner receives a diagnostic, a personal learning path, mastery tracking, and timed review.",
  },
];

const differentiators = [
  "A prerequisite graph instead of a flat module outline",
  "Progressive knowledge points with worked examples",
  "Multiple assessment types and quality checks",
  "Adaptive diagnostics and mastery-based progression",
  "Spaced review based on learner performance",
  "A branded course site with billing and analytics",
];

const faqs = [
  {
    question: "What is an AI course builder?",
    answer:
      "An AI course builder turns a topic or source material into a structured course. Graspful adds a knowledge graph, quality validation, adaptive diagnostics, mastery tracking, and spaced review to the generated content.",
  },
  {
    question: "Which AI agents work with Graspful?",
    answer:
      "Graspful works through a CLI and Model Context Protocol server. You can use it with Claude Code, Codex, Cursor, Windsurf, VS Code, and other MCP-compatible clients.",
  },
  {
    question: "Can I build from a PDF or an existing document?",
    answer:
      "Yes. Give the document to your AI agent as the source of truth, then use Graspful to scaffold, fill, validate, and review the course. The agent reads the source while Graspful enforces the course schema and quality gates.",
  },
  {
    question: "Does Graspful create video courses?",
    answer:
      "Graspful focuses on active learning. Courses use instruction, worked examples, practice problems, diagnostics, quizzes, and spaced review. Lessons can also include images, video, links, and callouts.",
  },
  {
    question: "Do I need an account to try it?",
    answer:
      "Course scaffolding, authoring, validation, and review run locally without an account. Authentication is required when you import or publish a course.",
  },
  {
    question: "How much does course creation cost?",
    answer:
      "Course creation and testing are free. When you sell access to a published course, you keep 70% of learner revenue and Graspful keeps 30%.",
  },
];

export default function AiCourseBuilderPage() {
  return (
    <div className="bg-background text-foreground">
      <section className="relative overflow-hidden border-b border-border/40 pt-14 md:pt-20">
        <div className="gradient-mesh overflow-hidden opacity-70">
          <div className="orb-1" />
          <div className="orb-3" />
        </div>
        <div className="relative z-10 mx-auto max-w-6xl px-6 py-6 text-center md:py-14">
          <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-sky-200/70 bg-white/70 px-3 py-1.5 text-xs font-semibold text-sky-700 backdrop-blur sm:mb-4 dark:border-sky-400/20 dark:bg-sky-950/40 dark:text-sky-300">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            AI course creation with learning science built in
          </div>
          <h1 className="mx-auto max-w-4xl text-[2rem] font-bold leading-[1.04] tracking-[-0.05em] sm:text-5xl lg:text-6xl">
            An AI course builder that creates{" "}
            <span className="text-gradient">learning that adapts.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg lg:text-xl">
            Give source material to your AI agent. Graspful turns it into a
            validated knowledge graph, active practice, and an adaptive course
            for each learner.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <TrackedMarketingLink
              href="/docs/quickstart"
              location="seo_pillar_primary"
              className="btn-gradient inline-flex items-center gap-2 px-7 py-3 text-sm font-semibold"
            >
              Build your first course
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </TrackedMarketingLink>
            <TrackedMarketingLink
              href="/docs/course-creation-guide"
              location="seo_pillar_guide"
              className="rounded-full border border-border bg-background/70 px-7 py-3 text-sm font-semibold transition-colors hover:bg-muted"
            >
              Read the creation guide
            </TrackedMarketingLink>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Build and validate locally. No account required until publishing.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold text-primary">The workflow</p>
            <h2 className="mt-2 text-3xl font-bold tracking-[-0.035em] sm:text-4xl">
              From source material to a live course
            </h2>
            <p className="mt-4 max-w-xl leading-7 text-muted-foreground">
              Graspful gives AI agents a defined course schema and an exact
              review process. You stay in control of the source, structure, and
              final content.
            </p>
            <div className="mt-7 overflow-hidden rounded-2xl border border-border/60 bg-[#07111f] p-5 shadow-xl">
              <div className="mb-4 flex items-center gap-2 text-xs text-slate-400">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <span className="ml-2">Terminal</span>
              </div>
              <pre className="overflow-x-auto text-left text-sm leading-7 text-slate-200">
                <code>{`npx @graspful/cli init

graspful create course \\
  --topic "Your subject" \\
  --source "source-material.pdf" \\
  --output course.yaml

# Ask your AI agent to author the lessons and problems
graspful review course.yaml
# PASS
# Score: 10`}</code>
              </pre>
            </div>
          </div>

          <ol className="grid gap-4 sm:grid-cols-2">
            {workflow.map((step, index) => {
              const Icon = step.icon;
              return (
                <li
                  key={step.title}
                  className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="mt-6 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {step.description}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section className="border-y border-border/40 bg-muted/35">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 md:py-28 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-semibold text-primary">
              Built for outcomes
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-[-0.035em] sm:text-4xl">
              Generation is only the first step
            </h2>
            <p className="mt-4 leading-7 text-muted-foreground">
              A course needs a coherent learning sequence, enough practice, and
              evidence that each learner has mastered the foundations. Graspful
              checks the course before publishing and adapts it after launch.
            </p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {differentiators.map((item) => (
              <li
                key={item}
                className="flex gap-3 rounded-xl border border-border/50 bg-background p-4 text-sm leading-6"
              >
                <CheckCircle2
                  className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500"
                  aria-hidden="true"
                />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-20 md:py-28">
        <div className="text-center">
          <FileCheck2
            className="mx-auto h-8 w-8 text-primary"
            aria-hidden="true"
          />
          <h2 className="mt-4 text-3xl font-bold tracking-[-0.035em] sm:text-4xl">
            AI course builder FAQ
          </h2>
        </div>
        <div className="mt-10 divide-y divide-border/60 border-y border-border/60">
          {faqs.map((item) => (
            <section key={item.question} className="py-6">
              <h3 className="font-semibold">{item.question}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {item.answer}
              </p>
            </section>
          ))}
        </div>
      </section>

      <section className="border-t border-border/40 bg-[#07111f]">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center md:py-24">
          <h2 className="text-3xl font-bold tracking-[-0.035em] text-white sm:text-4xl">
            Build a course your learners can master
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-400">
            Install the tools, create locally, and publish when the course
            passes every quality check.
          </p>
          <TrackedMarketingLink
            href="/docs/quickstart"
            location="seo_pillar_bottom"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-slate-950 transition-transform hover:scale-[1.02]"
          >
            Start with the quickstart
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </TrackedMarketingLink>
        </div>
      </section>

      <FAQPageJsonLd items={faqs} />
    </div>
  );
}
