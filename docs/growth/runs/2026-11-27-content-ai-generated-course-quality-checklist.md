# Content brief: AI-generated course quality checklist (exp-014)

Date: 2026-11-27 (seo loop, Track 1, Thursday run)
Page: /blog/ai-generated-course-quality-checklist
Content plan item: #2, "How do I check an AI-generated course before publishing?"

## Target question and phrases

- Main: "AI generated course quality checklist"
- Secondary: "how to check an AI-generated course before publishing" (frozen AI prompt, objection stage)
- /docs/review-gate already holds the "check before publishing" title. This post takes the checklist angle and the human fact-check step, and links to the docs for the rule-by-rule detail. The docs page now links back.

## Demand proof

- Frozen AI visibility prompt "how do I check an AI-generated course before publishing" (Nov 25: Google AI Mode cites hivelearn.app, wiley.com, articulate.com, not us).
- Google top 10 for both phrases is full of dedicated checklist pages (SubSchool, HiveLearn, Articulate, reviewmyelearning, dalim, markup.ai), plus Reddit threads asking the same question (r/learnmachinelearning, r/AIDigitalStack, r/instructionaldesign). That shape means steady question demand.
- SE Ranking returns no volume for these long-tail phrasings (see content-plan volume note).

## SERP (serper, 2026-11-27, US)

"how to check an AI-generated course before publishing": HiveLearn guide, Articulate checklist, Reddit x2, dalim, Facebook group, Quora, SitePoint, markup.ai, Rainbrand.
"AI generated course quality checklist": SubSchool 20-minute checklist, HiveLearn, Articulate, Reddit r/instructionaldesign, reviewmyelearning QA checklist, academic course-redesign checklists.
People also ask: "How to test quality of AI output?", "What is an AI checklist?"

Gap: every top result is a manual reading checklist. None splits machine-checkable items from human-only items, none shows real tool output, and none shows a course that passes automated review while still being wrong.

## What the page has that the top 10 don't

1. A 15-row table split into Automated (10) and You (5).
2. Real `graspful review` output (published CLI 0.3.0) for a two-concept sample course: 8/10 with two named failures, then 10/10 after the fix.
3. The 10/10-but-wrong example: the course teaches a 30-day refund window when the (hypothetical) handbook says 14. Clearly framed as a made-up policy.
4. A copyable prompt for a second agent session to flag unsupported claims.

## Claims verified against code

- 10 checks and their rules: packages/shared/src/quality-gate.ts (QUALITY_CHECK_METADATA; MIN_INSTRUCTION_WORDS=5; difficulty staircase needs 2+ levels; 3+ problems per KP; worked examples on 50%+ of authored concepts; long instruction threshold 100 words).
- Teaching alignment is a vocabulary heuristic that fails a KP only when no judged question shares a stem with the teaching path: checkProblemTeachingAlignment in quality-gate.ts.
- `graspful review` exits 1 on failure: packages/cli/src/commands/review.ts.
- `--format json`: documented on /docs/review-gate and in CLAUDE.md.
- Server re-runs the checks on publish: /docs/review-gate ("The server runs the same checks when you request publication"), backend/src/knowledge-graph/review.service.ts.
- `sourceDocument` is optional in the course schema (packages/shared/src/schemas/course-yaml.schema.ts), so the page says "can record".
- MCP tool `graspful_review_course` exists: packages/mcp and CLAUDE.md tool table.

## Cost

serper x2 = $0.002.
