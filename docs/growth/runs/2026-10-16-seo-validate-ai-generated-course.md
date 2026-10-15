# Search research: /validate-ai-generated-course (package 3 Q3)

Date: 2026-10-16. Cost: $0.0084 (SE Ranking x2, autocomplete x1, Serper x1, ChatGPT x1).

## Question

"How do I check an AI-generated course before publishing?"

## Evidence

- Keyword volume (SE Ranking, US): "ai generated course quality" returned no rows. "check ai generated content" returns only AI-detector intent ("ai detector" 4.09M, "ai checker" 2.24M). Wrong intent: those people want to know if text was written by AI.
- Autocomplete for "ai course quality": QA-engineer training courses ("ai course for quality assurance"). Wrong intent.
- Google top 10 for "how to review an AI generated course before publishing": generic AI content review posts (proedit, Glean, PRSA, a r/SEO_for_AI thread). One course-specific result (coursiv.io). No tool page answers it.
- ChatGPT ("How do I check an AI-generated online course for quality before publishing it? Is there a tool that does automated review checks?"): cites Articulate, courseautopsy.com, scormly.app, scormx.com, courseagent.ai. Graspful not cited.
- Search Console: no query containing valid/quality/review/check in 90 days. /docs/review-gate had no impressions in the last 28 days.
- signals.csv: no rows map to this question.

## Verdict

Improve, don't create. There's no measurable demand for a new page, and /docs/review-gate already answers the question with the real check registry. ChatGPT answers it with course QA tools, so the page should say what it is in the searcher's words.

## Change (exp-008)

- Title: "Review gate | Graspful docs | Graspful" -> "Check an AI-Generated Course Before Publishing: Graspful Review Gate" (absolute, no doubled brand).
- Meta names the check count (from `QUALITY_CHECK_METADATA`) and real checks: duplicate questions, difficulty staircase, problem depth, worked examples, import dry run.
- H1: "Review gate: check an AI-generated course before publishing".

Claims verified against `packages/shared/src/quality-gate.ts` (10 checks).

Expected result: low data (baseline 0 impressions). If it ends low-data, one more test on this page at most, then move on.
