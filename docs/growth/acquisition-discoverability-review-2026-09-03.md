# Graspful acquisition and discoverability review

Date: 2026-09-03

## Objective

Increase qualified traffic to `https://graspful.ai/ai-course-builder` from search engines, answer engines, AI agents, referrals, and focused distribution. A qualified visitor is likely to create a course, import source material, use the API, or connect Graspful to an AI coding agent.

## Executive assessment

Graspful has a sound technical base and a clear technical differentiator. The public site is server rendered, all 24 sitemap URLs return HTTP 200, canonical URLs are correct, public pages are indexable, private application pages use `noindex`, and internal links in the crawl do not break or redirect.

The main constraint is qualified demand and proof. The marketing hosts received 92 pageviews from 29 visitors in the 30-day audit snapshot. One visitor clicked a landing CTA and no visitor completed the measured visit-to-signup path. Direct and concentrated test-like activity dominates the sample. Search and AI referrals exist, but each has too little volume to support broad conclusions.

The priority page explains the workflow and product mechanics well. It needs stronger proof as real assets become available: one source-to-course example, a generated knowledge graph, review output, a live academy, clear limitations, and screenshots. These additions should use verified product artifacts. They should never use invented claims.

The best near-term search position is a focused combination of `AI course builder`, source-to-course tasks, adaptive course creation, course validation, and MCP or coding-agent workflows. Graspful has a better chance with these specific jobs than with broad terms such as `online course platform`.

## Current traffic and conversion baseline

Source: PostHog project `345138`. Unless stated otherwise, this snapshot covers the last 30 days and restricts website activity to `$host IN ('graspful.ai', 'www.graspful.ai')`.

| Measure | Result | Interpretation |
| --- | ---: | --- |
| Marketing pageviews | 92 | Low volume. A few visitors produced many views. |
| Marketing visitors | 29 | The useful denominator for the audit. |
| New visitors | 27 | Based on a 90-day visitor lookback. |
| Returning visitors | 2 | Retention conclusions are premature. |
| Landing CTA clicks | 2 | Both came from one homepage visitor. |
| Visitors who clicked a landing CTA | 1 | About 3% of the current visitor sample. |
| Attributable signups | 0 | No signup followed a measured marketing visit in the current sample. |
| Course scaffolds, imports, and publications | 0 | Production has not received these CLI or MCP events. |
| Google visitors | 1 | Four pageviews. Search demand is still unproven in product analytics. |
| AI-referred sessions | 1 | ChatGPT referral, 86 seconds. This is directional only. |

### Landing pages and engagement

PostHog's session table contained four qualifying sessions in the snapshot:

| Entry path | Sessions | Visitors | Average duration | Median duration | Bounce rate |
| --- | ---: | ---: | ---: | ---: | ---: |
| `/` | 2 | 1 | 166.5 seconds | 166.5 seconds | 0% |
| `/docs/how-it-works` | 2 | 2 | 43 seconds | 43 seconds | 0% |

The sample is too small to treat these rates as stable. The useful signal is that `/docs/how-it-works` can serve as a direct landing page and that one ChatGPT referral reached useful documentation.

### Referrers

The session sample contained three direct sessions and one ChatGPT session. Pageview-level referring-domain data also contains Google and ChatGPT traffic, but repeat pageviews from the same visitor inflate that view. Use unique sessions or visitors for acquisition decisions.

### Geography and device

The 29 marketing visitors included traffic from China, Singapore, South Korea, Canada, Germany, the United States, and several single-visitor countries. Desktop dominated most countries, while South Korea contained both mobile activity and one Firefox visitor with 21 pageviews. That concentration can distort pageview totals. Country and browser segments are diagnostic data until each segment has a larger sample.

### Project-wide noise

The same 30-day PostHog project view contained 138 pageviews and 67 visitors across marketing, academy, test, and localhost hosts. Project-wide numbers therefore overstate the Graspful marketing baseline. Saved reporting must keep the host filter.

### Measurement contract

Primary acquisition metric:

- Weekly unique qualified visitors to the Graspful marketing hosts who reach `/ai-course-builder`, `/docs/quickstart`, `/docs/course-creation-guide`, or `/docs/mcp`.

Primary business metric:

- Weekly unique creators who complete `course published`.

Early indicators:

- `landing_cta_clicked`
- `docs_code_copied`
- `course scaffolded`
- `course reviewed` with a passing score
- `course imported`

Guardrails:

- Signup completion
- CTA conversion per visitor
- Failed review rate
- Import and publish failures
- Marketing-page performance and accessibility

The CLI and MCP clients use credential or installation identities that are separate from the anonymous website identity. A privacy-safe identity handoff is required before PostHog can attribute a marketing visitor to a course scaffold or publication. API keys must never be sent as identifiers.

## Ranked findings

### 1. Qualified traffic is the binding constraint

Impact: Critical. Evidence: 29 visitors in 30 days, one CTA visitor, one Google visitor, and one AI-referred session.

The active homepage test will take a long time to reach a useful sample at this rate. Search and focused distribution should bring qualified visitors to the commercial and documentation pages while the experiment continues unchanged.

### 2. Course activation attribution is incomplete

Impact: Critical. Evidence: the code emits `course scaffolded`, `course imported`, and `course published`, but PostHog contains no events for them in the last 90 days. `docs_code_copied` is also absent.

The events exist in the application contract, but production delivery and identity continuity need verification. This blocks a complete acquisition-to-publication funnel.

### 3. The priority page is new and has little external discovery

Impact: High. Evidence: agent-style web searches surfaced the homepage, documentation, npm package, MCPMarket listing, and Socket package page. The sampled results did not surface `/ai-course-builder`.

The page needs discovery, indexing checks, relevant internal links, and third-party references. Search Console access is required to confirm index status and query impressions.

### 4. Competitors show stronger visible proof

Impact: High. Evidence: leading category pages show document inputs, generated outputs, quizzes, integrations, exports, screenshots, customer counts, FAQs, and pricing.

- [Coursebox course creator](https://www.coursebox.ai/course-creator) emphasizes document-to-course creation, quizzes, AI tutoring, integrations, and delivery formats.
- [Mindsmith authoring](https://www.mindsmith.ai/authoring) emphasizes source documents, interactive lesson elements, collaboration, and SCORM export.
- [LearningStudioAI](https://learningstudioai.com/) emphasizes course generation, document input, API access, and SCORM.
- [SC Training AI Create](https://training.safetyculture.com/ai-create/) emphasizes prompt and document inputs for mobile training.
- [eSkilled AI Course Creator](https://aicoursecreator.eskilled.io/) emphasizes full-course output, activities, SCORM, and languages.

Graspful should answer with verified technical proof: the schema, knowledge graph, ten-check review gate, adaptive delivery, and agent-native workflow.

### 5. Search demand language favors task terms

Impact: High. Evidence: current result pages use `AI course generator`, `AI course builder`, `document to course`, `online course creator`, and `AI eLearning authoring`. A Coursebox founder also reported that `AI course creator` produced stronger demand than `AI course builder`, but this is an anecdotal signal rather than keyword-volume evidence: [Indie Hackers case study](https://www.indiehackers.com/post/how-i-grew-my-ai-start-up-to-5k-mrr-within-4-months-of-launching-c3977847a3).

Reliable exact volume was unavailable without Google Search Console, Google Ads Keyword Planner, Ahrefs, or Semrush. The plan therefore ranks intent and product fit before unverified volume.

### 6. Small technical defects reduced clarity and machine accuracy

Impact: Medium. Evidence from the live crawl and lab tests:

- The pricing page had no H1.
- The homepage and academies titles repeated the brand through the root title template.
- The homepage emitted duplicate `SoftwareApplication` data.
- Graspful emitted `Course` and `EducationalOccupationalCredential` data that did not accurately describe the platform page.
- `WebSite` claimed a search action for `/docs?q=` without a corresponding search experience.
- Explicit AI crawler groups used incomplete or retired crawler names and omitted the new commercial page from their allow lists.
- Three low-contrast text elements failed the Lighthouse contrast check.
- A pre-hydration theme script changed body styles and caused a React hydration warning.
- Both a static file and a route claimed `/llms.txt`, which caused a development request conflict.

These items are corrected in this change.

### 7. Performance is healthy in the current lab sample

Impact: Low immediate risk. Evidence from Chrome DevTools on `/ai-course-builder`:

- Desktop and mobile Lighthouse: Accessibility 96, Best Practices 100, SEO 100.
- Desktop local trace: LCP 301 ms, TTFB 40 ms, CLS 0.00.
- No field Core Web Vitals data was available at the current traffic level.
- Render-blocking resources showed 0 ms estimated savings.
- Legacy JavaScript showed about 43 KB of possible savings.

The page should be watched after proof images or interactive examples are added. Those assets are more likely to change LCP and page weight than the current code.

## Technical crawl results

| Check | Result |
| --- | --- |
| Sitemap URLs crawled | 24 |
| HTTP 200 responses | 24 |
| Correct self-canonicals | 24 |
| Broken or redirecting internal URLs | 0 of 26 unique URLs |
| Malformed JSON-LD blocks | 0 |
| Pages with one H1 before the fix | 23 |
| Pages with no H1 before the fix | `/pricing` |
| Mobile horizontal overflow | None in the tested priority page |
| Private route indexing | Protected by page-level `noindex, nofollow` |

The sitemap covers the homepage, `/agents`, `/ai-course-builder`, `/academies`, `/pricing`, the documentation root, and public documentation pages. App-host robots rules allow crawling so crawlers can read the page-level `noindex` directive. The app host does not publish a sitemap.

## Changes implemented

### Crawler access

- Added explicit full-site access for `OAI-SearchBot`, `ClaudeBot`, `Claude-User`, `Claude-SearchBot`, and `Perplexity-User`.
- Kept explicit access for `GPTBot`, `ChatGPT-User`, `Google-Extended`, `PerplexityBot`, `Bytespider`, and `CCBot`.
- Replaced narrow allow lists with `Allow: /`, which includes `/ai-course-builder` and future public pages.

Current official references:

- [OpenAI publisher and developer FAQ](https://help.openai.com/en/articles/12627856-publishers-and-developers-faq)
- [Anthropic crawler documentation](https://support.anthropic.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler)
- [Perplexity crawler documentation](https://docs.perplexity.ai/docs/resources/perplexity-crawlers)
- [Googlebot documentation](https://developers.google.com/search/docs/crawling-indexing/googlebot)
- [Google AI search guidance](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)
- [Google-Extended documentation](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers)
- [Bing crawler documentation](https://www.bing.com/webmasters/help/which-crawlers-does-bing-use-8c184ec0)

Google states that its AI search experiences use the core search index. `Google-Extended` controls separate model training and grounding use, and does not control Google Search inclusion.

### Metadata and structured data

- Prevented repeated brand names in homepage and academies titles.
- Removed the duplicate page-level `SoftwareApplication` object.
- Stopped describing the Graspful platform page as a course or professional credential.
- Kept `Course` structured data for branded academy sites where the page represents a course experience.
- Removed the unsupported `SearchAction` from `WebSite` structured data.
- Changed discovery links for `llms.txt` and `llms-full.txt` to `rel="describedby"` and Markdown media types.

The `llms.txt` file remains an optional machine-readable summary. It is a community proposal, not a search ranking requirement. See the [llms.txt proposal](https://llmstxt.org/) and the [W3C strategy discussion](https://github.com/w3c/strategy/issues/506). Graspful should maintain it because the product serves AI agents, while avoiding claims that it improves rankings.

### Accessibility and semantic HTML

- Added an H1 mode to the shared pricing section and used it on the standalone pricing page.
- Kept the same component as an H2 when it appears inside the homepage.
- Increased contrast for the priority page's section labels and outcome paragraph.
- Increased footer copyright contrast.
- Stopped the early theme script from changing body attributes before React hydration.
- Removed the duplicate static `llms.txt`; the tested, brand-aware route is now the single source.

### Measurement

Created and pinned the [Acquisition and creator conversion dashboard](https://us.posthog.com/project/345138/dashboard/2063181). It contains six tested insights:

- Marketing daily visitors
- Marketing pageviews by page
- Marketing pageviews by referring domain
- Marketing visit to signup funnel
- Creator activation
- Landing CTA clicks by placement

All marketing charts use the Graspful host filter where applicable. The activation chart intentionally shows zero until CLI or MCP production delivery is confirmed.

## Keyword and content opportunity map

| Priority | Intent | Target query | Recommended page | Why Graspful can answer it |
| ---: | --- | --- | --- | --- |
| 1 | Commercial | AI course builder | `/ai-course-builder` | Existing pillar with a complete agent workflow. |
| 2 | Task | Create course from source material | `/create-course-from-source-material` | Can show a real input, graph, lessons, review, and output. |
| 3 | Technical commercial | MCP course builder | `/mcp-course-builder` | Direct product fit and sparse specialized competition. |
| 4 | Product method | Adaptive course builder | `/create-adaptive-course-with-ai` | Connects generation to diagnostics, mastery, and review. |
| 5 | Integration | Claude course generator | `/ai-course-builder-for-claude` | Can provide exact setup and verified MCP commands. |
| 6 | Problem | Validate AI-generated course content | `/validate-ai-generated-course` | The ten-check review gate is useful original proof. |
| 7 | Technical authority | Knowledge graph course design | Existing concept documentation | Strong fit with Graspful's real schema and prerequisites. |
| 8 | Technical authority | Bayesian Knowledge Tracing implementation | Existing mastery documentation | Supports the adaptive-learning claim with method detail. |

### Compact topic cluster

Parent:

- `/ai-course-builder`

High-intent supporting pages:

- `/create-course-from-source-material`
- `/mcp-course-builder`
- `/create-adaptive-course-with-ai`
- `/validate-ai-generated-course`
- `/ai-course-builder-for-claude`

Technical proof:

- Existing pages for knowledge graphs, mastery learning, adaptive diagnostics, spaced repetition, and learning staircases
- `/docs/course-creation-guide`
- `/docs/mcp`
- `/docs/quickstart`

Each new page must contain a distinct task, real input and output, accurate commands, limits, a useful example, and links to the pillar, technical proof, and quickstart. Do not publish keyword-swapped copies.

## Priority page assessment

`/ai-course-builder` answers the basic questions well:

- What it is
- Who it is for
- Which agents it supports
- How the source-to-course workflow works
- Which artifacts it creates
- How validation and adaptive learning differ from basic generation
- How to start without an account

Recommended proof additions, after real assets exist:

1. A before-and-after example from one permitted source document.
2. A visible course YAML or knowledge graph excerpt.
3. Actual review-gate output, including limitations and failures.
4. A screenshot or diagram of the published learner path.
5. One live public academy that credits the Graspful workflow.
6. A concise limitations section for supported input formats, output boundaries, authentication, and publication requirements.

These are content changes and should be tested when they change the conversion experience. Keep the current production page as the control.

## AI agent and answer-engine assessment

### Discoverable claims

Agent-style searches could find and corroborate these claims:

- Graspful is an agent-first adaptive learning and course creation platform.
- The product has a CLI and MCP server.
- Claude Code, Codex, Cursor, Windsurf, and VS Code workflows are documented.
- The npm package is available at [@graspful/mcp](https://www.npmjs.com/package/@graspful/mcp).
- Setup and workflow documentation is available at [How it works](https://graspful.ai/docs/how-it-works).
- A third-party directory entry exists at [MCPMarket](https://mcpmarket.com/server/graspful).
- Pricing facts are visible on the Graspful site.

### Weak or missing claims

- The new `/ai-course-builder` page did not appear in the sampled result set.
- Exact source-format support and limitations were hard to find from search results.
- API constraints and trust details did not have a single clear citation target.
- Product proof was weaker than the product description.

### Recommended machine-readable fact page

Keep product facts in ordinary server-rendered HTML and documentation. Provide one concise documentation page or section that states:

- Product definition and intended users
- Supported source inputs
- Created outputs
- CLI, MCP, and API workflows
- Authentication boundary
- Pricing and revenue share
- Review and publication requirements
- Data handling, security, and current limitations

`llms.txt` can point to this source. It should not replace it.

## Distribution and authority plan

Scores use 1 for low and 5 for high.

| Rank | Channel | Impact | Fit | Effort | Cost | First campaign |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | GitHub and npm | 5 | 5 | 2 | 1 | Publish one complete example academy repository with source, YAML, review output, and setup links. |
| 2 | MCP and agent directories | 4 | 5 | 2 | 1 | Improve current listings and submit to a small set of maintained directories with the same verified facts. |
| 3 | Integration tutorials | 4 | 5 | 3 | 1 | Publish one exact Claude, Codex, or Cursor source-to-course workflow with runnable commands. |
| 4 | Public academy backlinks | 4 | 5 | 2 | 1 | Add an accurate “Built with Graspful” method link to consenting public academies. |
| 5 | Technical communities | 4 | 4 | 3 | 1 | Share a technical case study in relevant developer and instructional-design communities under their rules. |
| 6 | Product launch communities | 3 | 4 | 3 | 1 | Launch the verified example and workflow, not a generic product announcement. |
| 7 | Partner content | 3 | 4 | 4 | 2 | Co-author a guide with an educator, enablement team, or documentation platform using a real use case. |
| 8 | Comparison and alternative pages | 3 | 3 | 3 | 1 | Publish only where Graspful can compare a specific workflow accurately and fairly. |

Potential maintained surfaces include npm, GitHub topics and examples, official integration galleries when submission is available, MCP directories with editorial maintenance, Dev.to, Hacker News, relevant Reddit communities, and instructional-design communities. Review rules before posting. Avoid automated submissions, reciprocal-link schemes, paid links, fake reviews, and broad low-quality directory lists.

## Experiment backlog

### Active: Homepage product proof

- Experiment: [Homepage product proof](https://us.posthog.com/project/345138/experiments/460864)
- Flag: `homepage-product-proof-v1`
- Control: Current homepage hero
- Challenger: Source-to-course product proof with a quickstart CTA
- Primary metric: Unique visitors who complete `landing_cta_clicked` on `/`
- Guardrail: `sign_up`
- Decision rule: Run at least two full weeks and wait for at least 50 exposed visitors and 10 primary conversions per variant. Require at least 95% probability of improvement and no clear signup harm.

The control path remains unchanged by this review.

### Next 1: Real product artifact

Hypothesis: A verified source, graph, review, and published output will increase qualified quickstart clicks because visitors can assess the product before setup.

- Primary: `landing_cta_clicked` to `/docs/quickstart` on `/ai-course-builder`
- Guardrails: Signup completion, page performance, scroll depth
- Diagnostic: Artifact interaction and docs code copy

### Next 2: CTA commitment

Hypothesis: A runnable quickstart CTA will attract more qualified creators than an account-first CTA.

- Primary: Unique CTA conversion
- Guardrails: Signup completion and later import rate
- Diagnostic: `docs_code_copied`

### Next 3: Audience framing

Hypothesis: Agent and developer-tool framing will produce more qualified course starts than broad AI course-builder framing.

- Primary: `course scaffolded` after identity continuity is fixed
- Guardrails: CTA conversion and signup completion
- Breakdowns: Campaign, referrer, device, and new versus returning

### Next 4: Verified trust proof

Hypothesis: One real case study, review score, and public academy will reduce uncertainty and increase course imports.

- Primary: `course imported`
- Guardrails: Failed review rate and CTA conversion
- Diagnostic: Case-study clicks and recordings

Run one causal change per experiment. Subjective copy, CTA, and layout changes must remain behind PostHog flags.

## Prioritized 30, 60, and 90-day plan

### Days 1 to 30

1. Submit the sitemap to Google Search Console and Bing Webmaster Tools.
2. Inspect index status for the homepage, priority page, docs root, quickstart, course creation guide, MCP guide, and how-it-works page.
3. Confirm CLI and MCP PostHog keys in production release workflows.
4. Confirm `docs_code_copied`, `course scaffolded`, `course reviewed`, `course imported`, and `course published` delivery.
5. Design a privacy-safe web-to-CLI identity handoff.
6. Add UTM tags to every controlled distribution link.
7. Produce one complete example academy repository and one verified product-proof asset.
8. Review the dashboard weekly and annotate launches.

Success criteria:

- All 24 sitemap URLs are discovered.
- The priority page is indexed with its selected canonical.
- At least one real event reaches every activation step.
- Marketing visits can be connected to at least an authenticated import.

### Days 31 to 60

1. Publish the source-to-course page with a permitted real example.
2. Publish the MCP course builder page with exact configuration and commands.
3. Add the verified product artifact to an experiment on the priority page.
4. Improve npm, GitHub, and selected directory descriptions with consistent facts and tagged links.
5. Publish one complete agent integration tutorial.
6. Earn method links from consenting public academies.

Success criteria:

- Four high-intent commercial and technical pages are indexed.
- Qualified organic and referral traffic reaches 50 visits per month.
- At least five visitors copy a command or scaffold a course.

### Days 61 to 90

1. Publish the adaptive-course and validation pages using original technical evidence.
2. Publish one case study from source material through a live academy.
3. Distribute each major asset through one relevant developer channel and one learning-design channel.
4. Seek partner tutorials or integrations where both products provide real user value.
5. Refresh pages from Search Console queries and PostHog behavior.
6. Continue the experiment sequence only when traffic meets the minimum sample.

Success criteria:

- Eight high-intent pages are indexed.
- Ten relevant referring domains exist.
- Qualified organic traffic reaches 150 visits per month.
- Organic or tagged referral traffic produces at least one scaffold or import each month.

## Local verification

| Check | Result |
| --- | --- |
| Bun unit and component suite | 56 files and 287 tests passed |
| TypeScript | Passed with `bun x tsc --noEmit` |
| ESLint | Passed |
| Next.js production build | Passed, including all 47 generated routes |
| Playwright SEO and pricing smoke tests | 16 passed on Chromium |
| Desktop priority page | CTA visible, no horizontal overflow, no browser errors |
| Mobile priority page, 390 by 844 | CTA visible, no horizontal overflow, no browser errors |
| Automated contrast audit | No color-contrast violations on desktop or mobile |
| Structured data | One application object, no unsupported platform course or credential, no false search action |
| `llms.txt` | HTTP 200 in E2E and `text/markdown` content type |
| Homepage experiment control | Existing unit coverage passed; experiment code was unchanged |

## Production verification

- [PR #129](https://github.com/willwearing/graspful/pull/129) merged the acquisition and discoverability improvements. Its full CI suite and production deployment passed.
- [PR #130](https://github.com/willwearing/graspful/pull/130) fixed CLI and MCP analytics delivery and identity continuity. PostHog received the labeled `course scaffolded` validation event from the built CLI through `posthog-node`.
- [PR #131](https://github.com/willwearing/graspful/pull/131) added the Google Search Console verification token. The token is live on `https://graspful.ai/`, Google verified ownership, and the resubmitted sitemap reports 24 discovered pages.
- Bing Webmaster Tools imported the verified property. The canonical sitemap has 24 discovered URLs and entered processing with no errors or warnings. Bing reports four known sitemaps and 40 discovered URLs across the main site and public academies.
- [PR #132](https://github.com/willwearing/graspful/pull/132) moved CLI and MCP releases to npm Trusted Publishing and preserved their executable mappings. The [release workflow](https://github.com/willwearing/graspful/actions/runs/33888729227) published `@graspful/cli@0.2.7` and `@graspful/mcp@0.2.5` successfully.
- A clean registry install created both `graspful` and `graspful-mcp` executables. The installed CLI reported version `0.2.7`; the installed MCP package reported version `0.2.5`.

## Remaining access blockers

- Google Search Console needs time to process the newly verified property before query, index, selected canonical, and Core Web Vitals reports become available.
- Bing needs time to process the newly submitted canonical sitemap.
- A paid keyword data source or Google Ads Keyword Planner: Required for reliable query-volume and difficulty estimates.
- Backlink index access: Required for a complete domain-authority and referring-domain comparison.
- Consent and customer assets: Required for case studies, academy links, screenshots, and customer proof.

## Reference pages

- Production priority page: [AI course builder](https://graspful.ai/ai-course-builder)
- Production documentation: [Graspful docs](https://graspful.ai/docs)
- PostHog dashboard: [Acquisition and creator conversion](https://us.posthog.com/project/345138/dashboard/2063181)
- Active experiment: [Homepage product proof](https://us.posthog.com/project/345138/experiments/460864)
- npm CLI package: [@graspful/cli](https://www.npmjs.com/package/@graspful/cli)
- npm MCP package: [@graspful/mcp](https://www.npmjs.com/package/@graspful/mcp)
- Existing SEO plan: [`docs/growth/seo-growth-plan.md`](./seo-growth-plan.md)
- Existing experiment plan: [`docs/growth/landing-page-experiment-plan.md`](./landing-page-experiment-plan.md)
