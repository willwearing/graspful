"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useBrand } from "@/lib/brand/context";
import { trackLandingCtaClick } from "@/lib/posthog/events";
import { LessonPreview } from "./lesson-preview";

export function ProductProofHero() {
  const brand = useBrand();

  return (
    <section
      className="border-b border-border bg-background pt-20"
      data-landing-variant="product-proof"
    >
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 md:px-12 md:py-20 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="mb-4 text-sm font-medium text-primary">
            For Claude Code, Codex, and MCP clients
          </p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Turn source material into an adaptive course.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Give your sources to your external AI agent. It drafts the lessons,
            prerequisite graph, and questions. Review the content, run
            Graspful&apos;s automated checks, then publish with the CLI or MCP.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-4">
            <Link
              href="/docs/quickstart"
              onClick={() => trackLandingCtaClick("product_proof_primary", brand.id, "/docs/quickstart")}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Create your first course
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="#lesson-preview"
              onClick={() => trackLandingCtaClick("product_proof_details", brand.id, "#lesson-preview")}
              className="text-sm font-semibold text-foreground underline underline-offset-4"
            >
              Try a question
            </Link>
          </div>
          <p className="mt-5 text-sm text-muted-foreground">
            Author and review locally. An account is required to import or publish.
          </p>
        </div>
        <LessonPreview />
      </div>
    </section>
  );
}
