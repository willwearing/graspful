# Homepage experiment and improvement loop review

Reviewed October 7, 2026 (UTC), before code or experiment edits. [Full analysis with runnable diagnostic funnels](https://us.posthog.com/project/345138/notebooks/Qb2iTfn8).

## What ran and what the loop saved

The project had one A/B experiment, [Homepage product proof](https://us.posthog.com/project/345138/experiments/460864), launched September 3. Daily General scout runs are monitoring runs, separate from experiments and repository tests. The scout saved observations to the fleet scratchpad, summaries to scout run rows, and evidence and implementation work to inbox reports. The app had no custom auto-improvement team skill; the active loop uses the canonical General and Inbox validation scouts. The local autoresearch wrapper points to `/Users/will/.claude/agents/autoresearch/SKILL.md`.

The [experiment report](https://us.posthog.com/project/345138/inbox/01a0d4d2-8b31-7725-9b62-d6101eddf78e) and [test traffic report](https://us.posthog.com/project/345138/inbox/01a0e5ae-63e6-7642-a03b-a26fb67e28d0) produced draft PRs [141](https://github.com/willwearing/graspful/pull/141) and [142](https://github.com/willwearing/graspful/pull/142). Both remained open drafts. Their verification checks wait for report resolution, so neither was evidence of a successful production repair. The review takes over those existing reports and brings both fixes onto current main.

## Results

October 7 cached results (metric cutoff 04:21 UTC, exposure read cutoff 06:43 UTC):

| Variant | Exposures | Stored homepage CTA conversions | Stored sign_up conversions |
| --- | ---: | ---: | ---: |
| Control | 20 | 1 | 0 |
| Product proof | 13 | 0 | 0 |

The metrics fail data sufficiency checks and supply no usable confidence result. One person appears in multiple variants. No winner is supported.

An independent, noncanonical diagnostic ordered funnel from September 3 20:58:42 to October 7 06:43:17 UTC, restricted to `graspful.ai` with a 14-day conversion window, finds control 2 CTA conversions/17 exposures and 2 account creations; product proof 1 CTA conversion/11 exposures and zero account creations. This diagnostic uses different filters, conversion timing, and multi-variant handling. It cannot replace the stored experiment result or establish causality.

The stored CTA metric uses the exact URL `https://graspful.ai/`, dropping valid homepage clicks with query strings. The earlier scout conversion query checks person membership overlap without requiring account creation after exposure. `sign_up` describes confirmation in the originating browser and undercounts confirmations elsewhere. Backend `account_created` is available, but anonymous cross-device continuity remains incomplete.

A raw diagnostic from September 24 to October 1 finds four control exposure events on `js-basics-test.graspful.ai` and two product-proof exposure events on `final1774549999-test.graspful.ai`. Host names suggest test activity but do not establish that all visits were automated. The current project test filter covers loopback hosts. Academy fallback brands enrolled in v1; slow requests could also fall outside the 500ms assignment deadline.

## Repair and decision

The original hypothesis remains: showing a concrete source-to-course workflow and sending visitors to a runnable quickstart will increase qualified homepage CTA clicks and downstream course creation because visitors can understand the product before creating an account.

The bounded autoresearch repair loop freezes 13 scenarios, commits each atomic repair before measuring, checks lint/type guards, and records keeps/discards in [autoresearch-results.tsv](autoresearch-results.tsv). Baseline 6/13 (46.153846%). Timing repair reaches 8/13; host enrollment and registration repair reaches 13/13. One timing attempt was discarded after the verification script failed type checks, then retried after repairing the script. Two repairs kept, one attempt discarded. The pass rate measures code behavior, not business impact.

Preserve v1 as inconclusive. [V2](https://us.posthog.com/project/345138/experiments/473920) uses a new flag and fresh dates, the same hero content, 50/50 allocation, full eligible rollout, distinct-ID bucketing, and no experience continuity. Exposure is the standard exposure event filtered to the v2 flag, canonical production homepage host and path. Multiple-variant users are excluded. Primary conversion uses ordered `landing_cta_clicked`, `page=/`, and the production host. The ordered `account_created` funnel is the guardrail. Existing metric events were verified; no unknown-event override was used. No matching shared experiment metrics or governed metrics existed.

Require two full weeks, 50 exposures and 10 primary conversions per arm, 95% chance of improvement, no clear guardrail harm, comprehension evidence from recordings, and seven days of stable results. These are minimum gates, not a power calculation. Keep v1 and v2 data separate. Explicit internal-user classification on the production hostname and web-to-CLI activation identity remain limitations.

## New candidate hypotheses

| Candidate | Proposed mechanism | One change | Measure and prerequisite |
| --- | --- | --- | --- |
| Quickstart continuity | A visible runnable first command may reduce effort at the preview-to-docs handoff | Put one first command beside the course preview, keeping hero and CTA destination fixed | Instrument and ingest `docs_code_copied` before launch; link web and CLI identity before using activation |
| Source and quality proof | A real source-to-knowledge-point mapping and review result may reduce uncertainty about accuracy | Replace only the proof artifact, keeping copy and CTA fixed | Existing homepage CTA and account-creation funnels; review replay comprehension |
| Preview next step | A contextual next step may help sample-question users start creating | Add one quickstart CTA after sample completion, keeping initial hero fixed | Instrument preview completion before launch; ordered completion-to-quickstart funnel |

The current sparse data suggests possible handoff friction but does not prove these explanations. Run one candidate after v2 meets its decision gates or has a documented inconclusive stop decision. Preserve the existing backlog of CTA, product artifact, audience, and trust experiments. New instrumentation must be received and verified before it becomes a live metric.

## Verification and release

The complete web suite passed 518 tests after the repair. Root script tests passed 39 checks. Lint and type checks passed, with existing lint warnings. Browser and release verification are recorded with the final deployment state, separately from the production experiment sample.
