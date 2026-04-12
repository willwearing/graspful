"use client";

import Link from "next/link";
import { useState } from "react";
import { faqItems } from "@/lib/site-config";

/* ─── Data ─── */
const features = [
  {
    title: "Adaptive Diagnostics",
    description:
      "Every student starts with a diagnostic that maps what they know. The system skips mastered material and targets gaps. No two students get the same path.",
    wide: true,
  },
  {
    title: "Fully Automated Learning Paths",
    description:
      "The system knows what each student needs next and delivers it. Different paths for different learners, zero manual intervention.",
  },
  {
    title: "Research-Backed Retention",
    description:
      "Spaced repetition, mastery gates, and retrieval practice. Students keep what they learned instead of forgetting it two weeks later.",
  },
  {
    title: "Your Brand, Your Business",
    description:
      "Your domain. Your colors. Your pricing. The learner sees your academy, not ours. Full white-label from day one.",
    wide: true,
  },
  {
    title: "Free to Build. You Keep 70%.",
    description:
      "No upfront costs. No platform subscription. Build your course for free and earn 70% of every paid subscription.",
  },
  {
    title: "Quality Checks Built In",
    description:
      "Automated checks catch duplicate questions, missing prerequisites, and content gaps before you publish.",
  },
];

const howSteps = [
  {
    step: "npx @graspful/cli init",
    title: "Install the CLI",
    description:
      "One command wires up MCP in Claude Code, Cursor, or Windsurf. Your AI agent gets course-building tools.",
  },
  {
    step: '"Build me a course on X"',
    title: "Prompt your agent",
    description:
      "Your agent calls scaffold, fill, validate, and review. You guide the content. It handles the structure.",
  },
  {
    step: "graspful import",
    title: "Go live",
    description:
      "Your academy launches on your domain with adaptive diagnostics, mastery gates, and spaced review from day one.",
  },
];

const learnerBenefits = [
  { title: "Personalized Path", desc: "Each student gets a unique learning path based on what they already know." },
  { title: "Smart Diagnostics", desc: "A quick assessment skips what they've mastered. No wasted time." },
  { title: "No Gaps Allowed", desc: "Students prove they understand each topic before moving forward." },
  { title: "Timed Reviews", desc: "The system schedules reviews at the optimal time so nothing is forgotten." },
  { title: "Finds Weak Spots", desc: "When a student is stuck, the system identifies exactly which foundation is shaky." },
  { title: "Built-In Reinforcement", desc: "Advanced topics naturally reinforce earlier material." },
];

const agentLogos = [
  { name: "Claude Code", icon: "claude" },
  { name: "Cursor", icon: "cursor" },
  { name: "Windsurf", icon: "windsurf" },
  { name: "Codex", icon: "codex" },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="ml-3 shrink-0 rounded border border-white/20 px-2 py-1 text-xs text-white/60 hover:text-white hover:border-white/40 transition-colors"
      aria-label="Copy to clipboard"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

/* ─── Component ─── */
export function HomePage() {
  const headline = "Build courses where students actually";
  const words = headline.split(" ");

  return (
    <main id="main-content">
      {/* ── Hero ── */}
      <section className="relative min-h-[70vh] flex items-center">
        <div className="gradient-mesh overflow-hidden">
          <div className="orb-1" />
          <div className="orb-2" />
          <div className="orb-3" />
          <div className="orb-4" />
        </div>

        <div className="relative z-10 mx-auto max-w-5xl px-6 py-20 text-center md:py-32">
          <h1 className="text-7xl font-bold tracking-[-0.045em] leading-[1.08] sm:text-8xl lg:text-9xl">
            {words.map((word, i) => (
              <span
                key={`${word}-${i}`}
                className="inline-block animate-word-enter text-foreground"
                style={{ animationDelay: `${0.15 + i * 0.14}s` }}
              >
                {word}
                <span>&nbsp;</span>
              </span>
            ))}
            <span
              className="inline-block animate-word-enter text-gradient"
              style={{ animationDelay: `${0.15 + words.length * 0.14}s` }}
            >
              learn.
            </span>
          </h1>
          <p
            className="animate-fade-up mx-auto mt-8 max-w-xl text-xl leading-relaxed text-muted-foreground md:text-2xl"
            style={{ animationDelay: "0.6s" }}
          >
            Prompt AI to build your course. Adaptive diagnostics, mastery
            gates, and spaced review - scaffolded for you. Go live in one
            session.
          </p>

          {/* CLI snippet */}
          <div className="animate-fade-up mx-auto mt-8 inline-flex" style={{ animationDelay: "0.75s" }}>
            <div className="flex items-center rounded-full bg-[#0A1628] px-4 py-2.5 font-mono text-sm text-white/90 shadow-lg border border-white/10">
              <span className="text-white/40 mr-2 select-none">$</span>
              <code>npx @graspful/cli init</code>
              <CopyButton text="npx @graspful/cli init" />
            </div>
          </div>

          <div className="animate-fade-up flex flex-col sm:flex-row items-center justify-center gap-4 mt-8" style={{ animationDelay: "0.9s" }}>
            <Link
              href={"/sign-up"}
              className="btn-gradient glow-pulse inline-block px-12 py-4 text-base font-medium"
            >
              Create Free Account
            </Link>
            <Link
              href={"/how-graspful-works"}
              className="inline-block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors no-underline"
            >
              See how it works &rarr;
            </Link>
          </div>

          {/* Agent logo strip */}
          <div className="animate-fade-up mt-14" style={{ animationDelay: "1.05s" }}>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/60 mb-4">
              Works with any MCP-compatible agent
            </p>
            <div className="flex items-center justify-center gap-8 flex-wrap">
              {agentLogos.map((agent) => (
                <span
                  key={agent.icon}
                  className="text-sm font-medium text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                >
                  {agent.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="bg-[#F8FAFC] py-20 md:py-28 dark:bg-card/50">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-4xl font-bold tracking-[-0.04em] text-foreground sm:text-5xl lg:text-6xl mb-4">
            What we do for you
          </h2>
          <p className="text-center text-muted-foreground mb-16 max-w-2xl mx-auto text-lg">
            You know what to teach. We make sure students actually learn it.
          </p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className={`group rounded-2xl border border-border/50 bg-white p-10 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:bg-card ${
                  f.wide ? "sm:col-span-2 lg:col-span-2" : ""
                }`}
              >
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {f.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="relative bg-[#0A1628] py-32 md:py-40 overflow-hidden">
        <div className="gradient-mesh opacity-30">
          <div className="orb-1" />
          <div className="orb-2" />
        </div>
        <div className="relative z-10 mx-auto max-w-5xl px-6">
          <h2 className="text-center text-4xl font-bold tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl mb-6">
            Three commands. One session.
          </h2>
          <p className="text-center text-slate-400 mb-20 max-w-2xl mx-auto text-lg">
            From empty repo to live academy with adaptive learning built in.
          </p>
          <div className="relative">
            <div className="absolute top-10 left-[10%] right-[10%] h-px hidden sm:block overflow-hidden">
              <div className="w-full h-full animate-line-grow" style={{ background: "linear-gradient(to right, var(--gradient-start), var(--gradient-accent))" }} />
            </div>
            <div className="grid gap-16 sm:grid-cols-3 sm:gap-8">
              {howSteps.map((step, i) => (
                <div key={step.title} className="flex flex-col items-center text-center">
                  <div
                    className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-white text-2xl font-bold shadow-[0_0_40px_rgba(2,132,199,0.3)] mb-8"
                    style={{ background: "linear-gradient(135deg, var(--gradient-start), var(--gradient-accent))" }}
                  >
                    {i + 1}
                  </div>
                  <div className="mb-4 rounded-lg bg-white/5 border border-white/10 px-4 py-2 font-mono text-sm text-white/80">
                    {step.step}
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">{step.title}</h3>
                  <p className="text-slate-400 leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Your students learn better ── */}
      <section className="bg-muted/50 py-24 md:py-32">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold tracking-[-0.03em] text-foreground sm:text-4xl mb-4">
            Your students learn better
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Every Graspful course adapts to each student. They focus on what
            they don&apos;t know, review at the right time, and prove mastery
            before moving on.
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {learnerBenefits.map((item) => (
              <div key={item.title} className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-foreground mb-1">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-20 px-4 bg-background">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-center text-foreground mb-4">
            Free to Create. Earn When Learners Pay.
          </h2>
          <p className="text-center text-muted-foreground mb-10 max-w-lg mx-auto">
            No monthly fees. No upfront cost. Like the App Store — we take a cut when you make money.
          </p>
          <div className="grid md:grid-cols-2 gap-6 pt-4">
            <div className="relative flex flex-col overflow-visible rounded-2xl border border-border bg-card p-8 shadow-sm">
              <h3 className="text-xl font-bold text-foreground">Free</h3>
              <p className="text-sm text-muted-foreground mt-2 mb-6">
                Everything you need to create and test courses.
              </p>
              <ul className="space-y-2 mb-6 flex-1">
                {["CLI + MCP server", "Unlimited course creation", "Quality gate validation", "Course review dashboard", "5 active learners"].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <span className="text-primary">&#10003;</span> {f}
                  </li>
                ))}
              </ul>
              <Link href={"/sign-up"} className="block text-center rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground no-underline hover:bg-muted transition-colors">
                Start Building Free
              </Link>
            </div>
            <div className="relative flex flex-col overflow-visible rounded-2xl border-2 border-primary bg-card p-8 shadow-lg">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full z-10">
                Recommended
              </div>
              <h3 className="text-xl font-bold text-foreground">Creator</h3>
              <p className="text-sm text-muted-foreground mt-1">
                <span className="text-3xl font-bold text-foreground">70/30</span>{" "}revenue share
              </p>
              <p className="text-sm text-muted-foreground mt-2 mb-6">Go live. Learners pay you — we take 30%.</p>
              <ul className="space-y-2 mb-6 flex-1">
                {["Everything in Free", "Stripe Connect billing", "Custom domain", "Unlimited learners", "Landing page builder", "Analytics dashboard", "You keep 70% of revenue"].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <span className="text-primary">&#10003;</span> {f}
                  </li>
                ))}
              </ul>
              <Link href={"/sign-up"} className="btn-gradient block text-center py-2 text-sm">
                Start Earning
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="mx-auto max-w-3xl px-6 py-24">
        <h2 className="text-center text-3xl font-bold text-foreground mb-12">
          Frequently Asked Questions
        </h2>
        <div className="space-y-3">
          {faqItems.map((faq) => (
            <details key={faq.question} className="group rounded-xl border border-border bg-card p-5 cursor-pointer">
              <summary className="font-semibold text-sm text-foreground list-none flex items-center justify-between gap-4">
                {faq.question}
                <span className="text-muted-foreground group-open:rotate-45 transition-transform text-lg shrink-0">+</span>
              </summary>
              <p className="mt-3 text-muted-foreground text-sm">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="relative overflow-hidden py-32 md:py-44 bg-background">
        <div className="gradient-mesh opacity-20">
          <div className="orb-1" />
          <div className="orb-2" />
        </div>
        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-4xl font-bold tracking-[-0.04em] text-foreground sm:text-5xl lg:text-7xl mb-4">
            Build your first course today
          </h2>
          <p className="text-lg text-muted-foreground mb-2">
            Free to create. You earn 70% when learners subscribe.
          </p>
          <p className="text-sm text-muted-foreground/70 mb-10">
            No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={"/sign-up"}
              className="btn-gradient glow-pulse inline-block px-12 py-4 text-base font-medium"
            >
              Create Free Account
            </Link>
            <Link
              href={"/docs"}
              className="inline-block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors no-underline"
            >
              Read the docs &rarr;
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
