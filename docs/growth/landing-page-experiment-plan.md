# Graspful landing-page experiment plan

## Objective

Increase the share of qualified visitors who understand Graspful, try the course-creation workflow, and later create or publish a course.

Keep the current homepage as the control. Test one meaningful change at a time with PostHog Experiments. Ship a challenger only after the result and session evidence support it.

## What the current data says

The 90-day PostHog sample is small:

| Page | Visitors | Pageviews | Bounce rate |
| --- | ---: | ---: | ---: |
| `/` | 142 | 225 | 71.1% |
| `/sign-in` | 33 | 82 | 70.6% |
| `/sign-up` | 9 | 12 | 100% |
| `/pricing` | 8 | 10 | 50% |
| `/docs/how-it-works` | 8 | 13 | 11.1% |
| `/agents` | 6 | 8 | 33.3% |
| `/academies` | 5 | 10 | 66.7% |

The homepage has the strongest evidence of friction, but bounce data alone cannot identify the cause. The 100% rates on small pages come from too few visitors to support a conclusion. `/docs/how-it-works` has the best engagement signal, which supports testing a clearer product explanation on the homepage.

Traffic is mainly direct. Organic search produced six visitors and ten pageviews in the same period. Experiment speed depends on the SEO and distribution work in `seo-growth-plan.md`.

## Measurement contract

### Exposure

Use PostHog's standard experiment exposure event, filtered to the experiment flag, `$host = graspful.ai`, and `$pathname = /`. Evaluate `homepage-product-proof-v2` only on the platform host surface. Academy, app, and local surfaces must stay outside enrollment. The exact exposure host filter excludes preview deployments from analysis.

Allow up to two seconds for assignment. On a request error, show the control immediately. After a fallback, keep that rendered variant for the visit and stop flag evaluation. A fallback is not an assigned experiment exposure. Review exposure coverage separately; the longer timeout does not guarantee enrollment for every slow request.

### Primary metric

`landing_cta_clicked`, filtered to `page = /` and `$host = graspful.ai`, measured as an ordered user-level funnel after exposure. Do not filter to an exact `$current_url`: campaign query strings must remain eligible.

This event includes the CTA location, destination, page, and brand ID. The page filter prevents later clicks on other marketing pages from counting as homepage conversions. A funnel keeps repeated clicks from one person from inflating the conversion rate.

### Secondary metric

`account_created`, measured as an ordered user-level funnel after exposure.

Use this as a guardrail. The backend emits it once after provisioning a new account, using the user ID that the browser later identifies. Cross-device email confirmation can still prevent an anonymous browser from linking to that identity. Keep `sign_up` as a diagnostic event for confirmation in the originating browser. The challenger sends people to the quickstart first, so it may increase qualified interest while reducing immediate account creation.

### Diagnostic events

- `sign_up_started`
- `docs_code_copied`
- CTA `location` and `destination`
- Scroll depth
- Session recordings for exposed visitors

These events explain why a result changed. `docs_code_copied` was absent in the October 7 review. Instrument and verify it before using it in a live metric. Add diagnostic events as experiment metrics only after production has received them.

### Activation limitation

`course scaffolded` is absent from the current PostHog project. CLI and MCP activity also uses a different identity from the anonymous website visitor, so it cannot serve as a valid experiment conversion yet. A later identity handoff should associate the web visitor or signed-in user with CLI and MCP activation without sending API keys as identifiers.

## Experiment 1: Product proof before account creation

Status: v1 is inconclusive and is being replaced by a separate measurement window. Preserve its dates, metrics, and historical results. See the [October 7 review](https://us.posthog.com/project/345138/notebooks/Qb2iTfn8).

- Historical experiment: [Homepage product proof](https://us.posthog.com/project/345138/experiments/460864), `homepage-product-proof-v1`
- Rerun: [Homepage product proof, measurement rerun](https://us.posthog.com/project/345138/experiments/473920), `homepage-product-proof-v2`
- Control: `control`, the current homepage hero
- Challenger: `product-proof`, a source-to-course workflow with a quickstart CTA
- Allocation: 50% control, 50% challenger
- Rollout: 100% of eligible homepage visitors
- Primary metric: Homepage CTA conversion
- Secondary metric: Account creation after homepage exposure
- Multiple variants: Excluded from analysis
- Test traffic: Project test filter enabled, canonical production exposure host required, and local/CI ingestion disabled. Explicit internal-user classification on the production hostname remains a limitation.

Hypothesis:

Showing a concrete source-to-course workflow and sending visitors to a runnable quickstart will increase qualified homepage CTA clicks and downstream course creation because visitors can understand the product before creating an account.

### Launch checklist

1. Deploy the code that reads `homepage-product-proof-v2`.
2. Confirm that an unknown, missing, or `control` value renders the original hero.
3. Use PostHog's local flag override to inspect both variants on desktop and mobile.
4. Confirm one exposure event per visitor and the correct variant property.
5. Click each CTA and confirm `location`, `destination`, and `brand_id`.
6. Verify identity continuity from anonymous activity to the identified user used by `account_created`. Run signup tests against isolated local Supabase with real ingestion disabled.
7. Check that non-Graspful brands never evaluate the flag.
8. Launch only after these checks pass.

### Decision rule

Run for at least two full weeks to cover weekday and weekend behavior. Because current traffic is low, treat the Bayesian result as directional until each variant has at least 50 exposed visitors and 10 primary conversions. Keep the test running longer when those minimums are unmet.

Ship the challenger when all of these conditions are true:

- PostHog gives it at least a 95% chance of improving the primary metric.
- Account creation has no clear harmful change.
- Recordings show that visitors understand the workflow and reach the quickstart intentionally.
- The result is stable for seven days.

Keep the control when the challenger clearly harms CTA conversion or account creation. Mark the result inconclusive when volume stays too low or the credible interval remains wide. The sample gates are minimums, not a statistical power calculation. Keep v1 and v2 results separate.

## Next experiments

Run these in order. Keep each test focused on one causal question.

### Experiment 2: CTA commitment level

Question: Does a low-commitment quickstart CTA outperform an account CTA?

- Control: Winning hero with its current primary CTA
- Challenger: Same hero, primary CTA changed between `/sign-up` and `/docs/quickstart`
- Primary: `landing_cta_clicked`
- Secondary: `account_created`; add `docs_code_copied` after instrumentation is verified

### Experiment 3: Product artifact

Question: Does showing a real course output improve comprehension?

- Control: Winning hero
- Challenger: Same copy and CTA with an interactive course outline, knowledge graph, or learner path preview
- Primary: `landing_cta_clicked`
- Secondary: `account_created`; add `docs_code_copied` after instrumentation is verified

### Experiment 4: Audience framing

Question: Which audience statement attracts qualified creators?

- Control: Broad AI course-builder framing
- Challenger: AI-agent and developer-tool framing
- Primary: `landing_cta_clicked`
- Secondary: `account_created`; add `docs_code_copied` after instrumentation is verified
- Breakdown: Source, campaign, device, and new versus returning visitor

### Experiment 5: Trust and evidence

Question: Does concrete proof reduce uncertainty?

- Control: Winning page
- Challenger: Adds one verified case study, real review-gate output, and a live academy example near the first CTA
- Primary: `landing_cta_clicked`
- Secondary: `account_created`, course import after identity tracking is fixed

New candidates from the October 7 review are saved in [the review notebook](https://us.posthog.com/project/345138/notebooks/Qb2iTfn8) and [the run record](runs/2026-10-07/review.md). Keep them queued while the measurement rerun collects its sample. They are hypotheses to test, not conclusions from the small current sample.

## Weekly review

Every Friday:

1. Check exposure balance and variant contamination.
2. Review primary and secondary metrics.
3. Watch five bounced sessions and five converted sessions from each variant when recordings exist.
4. Segment only for diagnosis. Do not choose a winner from a tiny segment.
5. Record the result, confidence, traffic, and decision in the experiment description or linked note.
6. Choose the next test from observed friction, not from preference.

## Traffic and testing relationship

At the current rate, even a strong experiment will take weeks or months to resolve. SEO should bring qualified visitors to `/ai-course-builder` and the documentation cluster, while the homepage experiment improves how those visitors continue. Track both systems with the same activation events so traffic growth does not hide a weaker conversion rate.
