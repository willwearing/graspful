"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  Bot,
  Check,
  FileText,
  Network,
} from "lucide-react";
import { useBrand } from "@/lib/brand/context";
import { trackLandingCtaClick } from "@/lib/posthog/events";

function ProductFlow() {
  return (
    <div
      className="relative mx-auto w-full max-w-2xl rounded-[2rem] border border-sky-200/70 bg-white/80 p-3 shadow-[0_32px_100px_-40px_rgba(14,165,233,0.45)] backdrop-blur dark:border-sky-400/15 dark:bg-slate-950/75"
      aria-label="Source material becomes a validated adaptive course"
    >
      <div className="grid gap-2 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-stretch">
        <div className="rounded-2xl border border-border/60 bg-background p-4 text-left">
          <div className="mb-6 flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
            <FileText className="h-4 w-4" aria-hidden="true" />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Your source
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            handbook.pdf
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Notes, standards, or existing material
          </p>
        </div>

        <div className="hidden items-center text-sky-500 md:flex">
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </div>

        <div className="rounded-2xl border border-sky-200/80 bg-sky-50/80 p-4 text-left dark:border-sky-400/20 dark:bg-sky-950/40">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500 text-white">
              <Bot className="h-4 w-4" aria-hidden="true" />
            </div>
            <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              10/10 checks
            </span>
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700 dark:text-sky-300">
            AI agent builds
          </p>
          <div className="mt-2 space-y-1.5 text-xs text-foreground/80">
            <p className="flex items-center gap-1.5">
              <Check className="h-3 w-3 text-emerald-500" aria-hidden="true" />
              Knowledge graph
            </p>
            <p className="flex items-center gap-1.5">
              <Check className="h-3 w-3 text-emerald-500" aria-hidden="true" />
              Lessons and problems
            </p>
            <p className="flex items-center gap-1.5">
              <Check className="h-3 w-3 text-emerald-500" aria-hidden="true" />
              Quality validation
            </p>
          </div>
        </div>

        <div className="hidden items-center text-sky-500 md:flex">
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </div>

        <div className="rounded-2xl border border-border/60 bg-background p-4 text-left">
          <div className="mb-6 flex h-9 w-9 items-center justify-center rounded-xl bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
            <BookOpenCheck className="h-4 w-4" aria-hidden="true" />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Learners master
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-4/5 rounded-full bg-gradient-to-r from-sky-500 to-teal-400" />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Mastery</span>
            <span className="font-semibold text-foreground">82%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProductProofHero() {
  const brand = useBrand();

  return (
    <section
      className="relative flex min-h-[78vh] items-center overflow-hidden pt-24"
      data-landing-variant="product-proof"
    >
      <div className="gradient-mesh overflow-hidden opacity-80">
        <div className="orb-1" />
        <div className="orb-2" />
        <div className="orb-3" />
        <div className="orb-4" />
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-14 px-6 py-16 md:px-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:py-24">
        <div className="text-center lg:text-left">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-200/70 bg-white/70 px-3 py-1.5 text-xs font-semibold text-sky-700 shadow-sm backdrop-blur dark:border-sky-400/20 dark:bg-sky-950/40 dark:text-sky-300">
            <Network className="h-3.5 w-3.5" aria-hidden="true" />
            Built for Claude, Codex, and MCP clients
          </div>
          <h1 className="text-5xl font-bold leading-[1.04] tracking-[-0.05em] text-foreground sm:text-6xl lg:text-7xl">
            Turn source material into an{" "}
            <span className="text-gradient">adaptive course.</span>
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl lg:mx-0">
            Your AI agent builds the knowledge graph, lessons, and assessments.
            Graspful validates the course, adapts every learner&apos;s path, and
            gives you a product ready to publish.
          </p>

          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <Link
              href="/docs/quickstart"
              onClick={() =>
                trackLandingCtaClick(
                  "product_proof_primary",
                  brand.id,
                  "/docs/quickstart",
                )
              }
              className="btn-gradient inline-flex items-center justify-center gap-2 px-7 py-3.5 text-sm font-semibold"
            >
              Create your first course
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/docs/how-it-works"
              onClick={() =>
                trackLandingCtaClick(
                  "product_proof_details",
                  brand.id,
                  "/docs/how-it-works",
                )
              }
              className="inline-flex items-center justify-center rounded-full border border-border bg-background/70 px-7 py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              See how it works
            </Link>
          </div>

          <p className="mt-5 text-xs text-muted-foreground">
            Create and validate locally. Sign up when you are ready to publish.
          </p>
        </div>

        <ProductFlow />
      </div>
    </section>
  );
}
