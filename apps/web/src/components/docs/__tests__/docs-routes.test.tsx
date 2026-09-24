import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import type { ComponentType } from "react";
import type { Metadata } from "next";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import * as Billing from "@/app/(marketing)/docs/billing/page";
import * as BrandSchema from "@/app/(marketing)/docs/brand-schema/page";
import * as Cli from "@/app/(marketing)/docs/cli/page";
import * as ConceptsAdaptiveDiagnostics from "@/app/(marketing)/docs/concepts/adaptive-diagnostics/page";
import * as ConceptsGamification from "@/app/(marketing)/docs/concepts/gamification/page";
import * as ConceptsKnowledgeGraph from "@/app/(marketing)/docs/concepts/knowledge-graph/page";
import * as ConceptsLearningStaircase from "@/app/(marketing)/docs/concepts/learning-staircase/page";
import * as ConceptsMasteryLearning from "@/app/(marketing)/docs/concepts/mastery-learning/page";
import * as ConceptsSpacedRepetition from "@/app/(marketing)/docs/concepts/spaced-repetition/page";
import * as ConceptsTaskSelection from "@/app/(marketing)/docs/concepts/task-selection/page";
import * as CourseCreationGuide from "@/app/(marketing)/docs/course-creation-guide/page";
import * as CourseSchema from "@/app/(marketing)/docs/course-schema/page";
import * as DesignGuide from "@/app/(marketing)/docs/design-guide/page";
import * as Glossary from "@/app/(marketing)/docs/glossary/page";
import * as HowItWorks from "@/app/(marketing)/docs/how-it-works/page";
import * as Mcp from "@/app/(marketing)/docs/mcp/page";
import * as DocsIndex from "@/app/(marketing)/docs/page";
import * as Quickstart from "@/app/(marketing)/docs/quickstart/page";
import * as ReviewGate from "@/app/(marketing)/docs/review-gate/page";

const routeCases = [
  ["/docs/billing", "Billing", "available-now paid-subscriptions"],
  ["/docs/brand-schema", "Brand Schema", "structure brand theme presets custom-colors landing seo pricing content-scope example"],
  ["/docs/cli", "CLI Reference", "graspful-register graspful-login graspful-validate graspful-create-academy graspful-create-course graspful-fill-concept graspful-review graspful-import graspful-publish graspful-describe graspful-create-brand"],
  ["/docs/concepts/adaptive-diagnostics", "Adaptive Diagnostics", "purpose bkt-engine update-mechanics mepe how-mepe-works evidence-propagation downward-propagation upward-propagation stopping-criteria speed-bootstrapping diagnostic-config"],
  ["/docs/concepts/gamification", "Gamification", "design-philosophy xp-system difficulty-scaling anti-gaming streaks leaderboards completion-estimates configuration"],
  ["/docs/concepts/knowledge-graph", "Knowledge Graph", "what-is-it prerequisite-edges encompassing-edges weight-guidelines frontier course-graph validation"],
  ["/docs/concepts/learning-staircase", "The Learning Staircase", "cognitive-load kp-levels level-kp1 level-kp2 level-kp3 level-kp4 worked-examples problem-types section-exams yaml-example authoring-guidance"],
  ["/docs/concepts/mastery-learning", "Mastery Learning", "two-sigma what-is-mastery bkt bkt-parameters update-rule mastery-states consecutive-correct gap-prevention bkt-in-yaml"],
  ["/docs/concepts/spaced-repetition", "Spaced Repetition", "spacing-effect forgetting fire interval-schedule early-repetition decay-penalty implicit-repetition weight-product decay-service practical-impact configuration"],
  ["/docs/concepts/task-selection", "Task Selection", "why-order-matters priority-system priority-p1 priority-p2 priority-p3 priority-p4 priority-p5 plateau-detection interleaving example-session how-it-connects"],
  ["/docs/course-creation-guide", "How to Create a Course", "choose-your-subject design-the-knowledge-graph author-knowledge-points write-problems add-section-exams set-difficulty-and-metadata validate-and-import create-your-brand"],
  ["/docs/course-schema", "Course Schema", "structure course sections section-exam concepts knowledge-points content-blocks problems example guidelines"],
  ["/docs/design-guide", "Design Guide", "logo colors typography spacing components themes dark-mode"],
  ["/docs/glossary", "Glossary", "academy academy-part bayesian-knowledge-tracing-bkt concept course course-section diagnostic-session encompassing-edge fire knowledge-frontier knowledge-point-kp mastery-state memory mepe plateau-detection prerequisite-edge remediation repetition-number section-exam speed student-concept-state xp"],
  ["/docs/how-it-works", "How Graspful Works", "knowledge-graph adaptive-diagnostics mastery-based-progression learning-staircase spaced-repetition task-selection gamification two-yaml-workflow architecture"],
  ["/docs/mcp", "MCP Server", "api-key setup claude-code cursor codex vscode workflow tools graspful_scaffold_course graspful_fill_concept graspful_validate graspful_review_course graspful_import_course graspful_publish_course graspful_describe_course graspful_create_brand graspful_import_brand graspful_list_courses"],
  ["/docs", "Documentation", ""],
  ["/docs/quickstart", "Quickstart", "install authoring scaffold fill review register import publish brand"],
  ["/docs/review-gate", "Review gate", "how-it-works checks scoring"],
] as const;

const routes = new Map<string, { default: ComponentType; metadata: Metadata }>([
  ["/docs/billing", Billing],
  ["/docs/brand-schema", BrandSchema],
  ["/docs/cli", Cli],
  ["/docs/concepts/adaptive-diagnostics", ConceptsAdaptiveDiagnostics],
  ["/docs/concepts/gamification", ConceptsGamification],
  ["/docs/concepts/knowledge-graph", ConceptsKnowledgeGraph],
  ["/docs/concepts/learning-staircase", ConceptsLearningStaircase],
  ["/docs/concepts/mastery-learning", ConceptsMasteryLearning],
  ["/docs/concepts/spaced-repetition", ConceptsSpacedRepetition],
  ["/docs/concepts/task-selection", ConceptsTaskSelection],
  ["/docs/course-creation-guide", CourseCreationGuide],
  ["/docs/course-schema", CourseSchema],
  ["/docs/design-guide", DesignGuide],
  ["/docs/glossary", Glossary],
  ["/docs/how-it-works", HowItWorks],
  ["/docs/mcp", Mcp],
  ["/docs", DocsIndex],
  ["/docs/quickstart", Quickstart],
  ["/docs/review-gate", ReviewGate],
]);

afterEach(cleanup);

describe("Documentation routes", () => {
  it("includes every documentation route in the regression cases", () => {
    const files = readdirSync(resolve(process.cwd(), "src/app/(marketing)/docs"), { recursive: true });
    const pages = files.filter((file) => String(file).endsWith("page.tsx"))
      .map((file) => `/docs/${String(file).replace(/page\.tsx$/, "")}`.replace(/\/$/, ""));
    expect(pages.sort()).toEqual(routeCases.map(([route]) => route).sort());
    expect([...routes.keys()].sort()).toEqual(pages.sort());
  });

  it.each(routeCases)("preserves the page title and deep links for %s", (route, title, anchors) => {
    const page = routes.get(route)!;
    const Page = page.default;
    const { container } = render(<Page />);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: title })).toBeVisible();
    expect(page.metadata.alternates?.canonical).toBe(`https://graspful.ai${route}`);

    const actualIds = [...container.querySelectorAll("[id]")].map((node) => node.id);
    expect(new Set(actualIds).size).toBe(actualIds.length);
    for (const anchor of anchors.split(" ").filter(Boolean)) {
      expect(actualIds).toContain(anchor);
    }
    for (const link of container.querySelectorAll("a")) {
      const href = link.getAttribute("href")!;
      if (href.startsWith("#")) expect(actualIds).toContain(href.slice(1));
      if (href.startsWith("/docs")) expect(routes.has(href.split("#")[0])).toBe(true);
    }
  });
});
