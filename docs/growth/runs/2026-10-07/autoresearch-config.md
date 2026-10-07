# Measurement repair loop

Goal: Restore the homepage experiment measurement contract before rerunning the original hypothesis.

Scope: `apps/web/src/components/marketing/landing-hero-experiment.tsx`, `apps/web/src/lib/posthog/useFeatureFlag.ts`, `apps/web/src/lib/posthog/provider.tsx`. Freeze the 13 regression scenarios before implementation.

Verify: `bun apps/web/scripts/verify-experiment-measurement.ts` from the repository root. It reports the percentage of the fixed 13 scenarios that pass. This is a code reliability measure. It does not measure conversion lift.

Direction: Higher.

Guard: `bun run lint` and `bun run typecheck`. Run the complete web suite, script suite, build, and relevant browser checks before release.

Iterations: 2.

1. Allow flag assignment to settle for two seconds, with immediate fallback on request errors and no later variant switch.
2. Limit enrollment to the platform host surface and register host/brand properties before pageview capture.

Procedure: `/Users/will/.claude/agents/autoresearch/SKILL.md`, code mode. Commit each atomic implementation before measuring it. Keep improvements only with passing guards; use `git revert` for discarded changes.

The experiment setup and review record are separate from the mechanical repair loop. Preserve v1 history, use a fresh flag for the same content hypothesis, and require the original sample and time gates before a product decision.
