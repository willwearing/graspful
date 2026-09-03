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

Use PostHog's standard experiment exposure event. Evaluate `homepage-product-proof-v1` only on the Graspful homepage. Other hosted brands must stay outside the experiment.

### Primary metric

`landing_cta_clicked`, filtered to `page = /` and measured as a user-level funnel after exposure.

This event includes the CTA location, destination, page, and brand ID. The page filter prevents later clicks on other marketing pages from counting as homepage conversions. A funnel keeps repeated clicks from one person from inflating the conversion rate.

### Secondary metric

`sign_up`, measured as a user-level funnel after exposure.

Use this as a guardrail for the first experiment. The challenger sends people to the quickstart first, so it may increase qualified interest while reducing immediate signup clicks.

### Diagnostic events

- `sign_up_started`
- `docs_code_copied`
- CTA `location` and `destination`
- Scroll depth
- Session recordings for exposed visitors

These events explain why a result changed. Add them as experiment metrics only after production has received them.

### Activation limitation

`course scaffolded` is absent from the current PostHog project. CLI and MCP activity also uses a different identity from the anonymous website visitor, so it cannot serve as a valid experiment conversion yet. A later identity handoff should associate the web visitor or signed-in user with CLI and MCP activation without sending API keys as identifiers.

## Experiment 1: Product proof before account creation

Status: Draft in PostHog.

- Experiment: `Homepage product proof`
- Feature flag: `homepage-product-proof-v1`
- Control: `control`, the current homepage hero
- Challenger: `product-proof`, a source-to-course workflow with a quickstart CTA
- Allocation: 50% control, 50% challenger
- Rollout: 100% of eligible homepage visitors
- Primary metric: Homepage CTA conversion
- Secondary metric: Signup completion
- Internal and test users: Excluded

Hypothesis:

Showing a concrete source-to-course workflow and sending visitors to a runnable quickstart will increase qualified homepage CTA clicks and downstream course creation because visitors can understand the product before creating an account.

### Launch checklist

1. Deploy the code that reads `homepage-product-proof-v1`.
2. Confirm that an unknown, missing, or `control` value renders the original hero.
3. Use PostHog's local flag override to inspect both variants on desktop and mobile.
4. Confirm one exposure event per visitor and the correct variant property.
5. Click each CTA and confirm `location`, `destination`, and `brand_id`.
6. Complete a signup and confirm identity continuity from anonymous activity to `sign_up`.
7. Check that non-Graspful brands never evaluate the flag.
8. Launch only after these checks pass.

### Decision rule

Run for at least two full weeks to cover weekday and weekend behavior. Because current traffic is low, treat the Bayesian result as directional until each variant has at least 50 exposed visitors and 10 primary conversions. Keep the test running longer when those minimums are unmet.

Ship the challenger when all of these conditions are true:

- PostHog gives it at least a 95% chance of improving the primary metric.
- Signup completion has no clear harmful change.
- Recordings show that visitors understand the workflow and reach the quickstart intentionally.
- The result is stable for seven days.

Keep the control when the challenger clearly harms CTA conversion or signup completion. Mark the result inconclusive when volume stays too low or the credible interval remains wide.

## Next experiments

Run these in order. Keep each test focused on one causal question.

### Experiment 2: CTA commitment level

Question: Does a low-commitment quickstart CTA outperform an account CTA?

- Control: Winning hero with its current primary CTA
- Challenger: Same hero, primary CTA changed between `/sign-up` and `/docs/quickstart`
- Primary: `landing_cta_clicked`
- Secondary: `sign_up`, `docs_code_copied`

### Experiment 3: Product artifact

Question: Does showing a real course output improve comprehension?

- Control: Winning hero
- Challenger: Same copy and CTA with an interactive course outline, knowledge graph, or learner path preview
- Primary: `landing_cta_clicked`
- Secondary: `docs_code_copied`, `sign_up`

### Experiment 4: Audience framing

Question: Which audience statement attracts qualified creators?

- Control: Broad AI course-builder framing
- Challenger: AI-agent and developer-tool framing
- Primary: `landing_cta_clicked`
- Secondary: `docs_code_copied`, `sign_up`
- Breakdown: Source, campaign, device, and new versus returning visitor

### Experiment 5: Trust and evidence

Question: Does concrete proof reduce uncertainty?

- Control: Winning page
- Challenger: Adds one verified case study, real review-gate output, and a live academy example near the first CTA
- Primary: `landing_cta_clicked`
- Secondary: `sign_up`, course import after identity tracking is fixed

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
