# Graspful SEO growth plan

## Goal

Build a compounding source of qualified course creators who reach the quickstart, use the CLI or MCP server, and publish an adaptive course.

The current 90-day baseline is six organic-search visitors and ten organic pageviews. PostHog contains no configured conversion goal. The first month must establish reliable search and conversion measurement.

## Primary conversion path

1. Organic landing-page view
2. Quickstart or course-creation-guide view
3. `docs_code_copied`
4. `course scaffolded` from the CLI
5. `course reviewed` with a passing score
6. `course imported`
7. `course published`

Use `course published` as the business outcome. Use `docs_code_copied` and `course scaffolded` as early indicators while volume is low.

## 90-day milestones

### Days 1 to 30: Technical recovery and baseline

- Deploy unique canonical URLs for every public documentation page.
- Deploy the complete XML sitemap and submit it in Google Search Console and Bing Webmaster Tools.
- Request recrawls for the homepage, `/ai-course-builder`, `/docs`, `/docs/quickstart`, `/docs/course-creation-guide`, `/docs/how-it-works`, and `/docs/mcp`.
- Verify index status and canonical selection in Search Console.
- Connect Search Console query data to a weekly reporting sheet or dashboard.
- Configure PostHog goals for signup, docs code copy, course import, and course publication.
- Add UTM parameters to every owned distribution link.
- Record the baseline for impressions, clicks, click-through rate, average position, engaged sessions, and course creation.

Exit criteria:

- Every submitted public URL reports its own canonical.
- Search Console discovers every sitemap URL.
- Organic visitors can be traced to at least the docs-code-copy step.

### Days 31 to 60: High-intent content

Publish one complete, useful page each week. Each page must show the real product workflow, include commands or examples, and link to the quickstart.

Priority pages:

1. `/ai-course-builder`, primary query: `AI course builder`
2. `/create-adaptive-course-with-ai`, primary query: `adaptive course builder`
3. `/ai-course-builder-for-claude`, primary query: `Claude course generator`
4. `/mcp-course-builder`, primary query: `MCP course builder`
5. `/create-course-from-source-material`, primary query: `create course from source material`
6. `/adaptive-learning-platform`, primary query: `adaptive learning platform`

Support these pages with the existing technical cluster:

- Knowledge graphs
- Mastery learning and Bayesian Knowledge Tracing
- Adaptive diagnostics
- Spaced repetition
- Learning staircases
- Course quality validation

Each commercial page should contain:

- One clear search intent
- A concrete input-to-output example
- A working command sequence
- Product screenshots or an accurate product diagram
- A comparison against the manual workflow
- Original explanations of Graspful's learning model
- Five to eight useful questions and answers
- Links to two related concept pages and one conversion page

Exit criteria:

- Four new high-intent pages are indexed.
- Organic traffic reaches 50 qualified visits per month.
- At least five organic visitors copy a quickstart command or begin signup.

### Days 61 to 90: Authority and distribution

- Publish one technical case study showing source material, the generated knowledge graph, review results, and the live academy.
- Publish one open template or example course each month on GitHub.
- Submit the CLI to relevant MCP directories, agent-tool directories, and developer newsletters.
- Ask each public academy creator to link to Graspful from their own site, repository, or launch post.
- Create useful integration guides for Claude Code, Codex, Cursor, Windsurf, and VS Code.
- Turn each guide into one launch post for Hacker News, Reddit, Dev.to, and relevant learning-design communities. Follow each community's promotion rules.
- Add links from public academy detail pages to the methods and tools used to build them.

Exit criteria:

- Ten relevant referring domains.
- Eight high-intent pages indexed.
- 150 qualified organic visits per month.
- Organic traffic produces at least one course scaffold or import each month.

## Keyword strategy

### Commercial intent

- AI course builder
- AI course generator
- adaptive course builder
- adaptive learning platform
- create online course with AI
- AI agent course creation
- course creation CLI
- MCP course builder

### Problem intent

- create course from source material
- turn handbook into training course
- generate course knowledge graph
- validate AI-generated course content
- add adaptive learning to an online course
- build mastery-based online course

### Technical authority

- knowledge graph course design
- Bayesian Knowledge Tracing implementation
- adaptive diagnostic algorithm
- mastery learning software
- spaced repetition knowledge graph
- prerequisite graph course design

## Internal linking model

Every high-intent page should link through this path:

`Commercial landing page -> technical proof -> quickstart -> signup or CLI`

The homepage and footer should link to the main commercial pillar. Technical concept pages should link back to the relevant commercial page. Public academy pages should link to the platform feature that powers the learner experience.

## Content quality rules

- Write from actual product behavior and real examples.
- Show the complete workflow and its limits.
- Keep each page focused on one reader and one task.
- Add original diagrams, course examples, validation output, or benchmark data.
- Update pages when commands or product behavior change.
- Avoid thin programmatic pages and keyword-swapped copies.

Google recommends descriptive titles, useful main headings, and content written for people. See [Google's title-link guidance](https://developers.google.com/search/docs/appearance/title-link) and [helpful-content guidance](https://developers.google.com/search/docs/fundamentals/creating-helpful-content).

## Weekly operating cadence

Monday:

- Review Search Console queries, impressions, and indexing issues.
- Review PostHog organic funnels and recordings.
- Select one page based on search intent and product relevance.

Tuesday to Wednesday:

- Build the page from product evidence and source material.
- Add internal links, metadata, canonical URL, structured data, and sitemap entry.

Thursday:

- Publish and request indexing.
- Distribute through one relevant channel with a tagged URL.

Friday:

- Record the result in the SEO scorecard.
- Improve one existing page based on queries, clicks, and recordings.

## Scorecard

Track these measures weekly:

| Measure | Source | Purpose |
| --- | --- | --- |
| Indexed pages | Search Console | Technical health |
| Organic impressions | Search Console | Search visibility |
| Organic clicks | Search Console | Traffic |
| Organic click-through rate | Search Console | Search-result relevance |
| Top queries and positions | Search Console | Content opportunities |
| Organic engaged sessions | PostHog | Visit quality |
| `docs_code_copied` | PostHog | Setup intent |
| `course scaffolded` | PostHog CLI | Product activation |
| `course imported` | PostHog | Creator activation |
| `course published` | PostHog | Business outcome |

## Decision rules

- Give a new page four weeks after indexing before making a large rewrite.
- Improve pages with impressions and weak click-through rates by aligning the title, description, and opening section with the query.
- Improve pages with clicks and weak activation by adding product proof, a clearer next step, or a better example.
- Consolidate overlapping pages when Google alternates between them for the same query.
- Remove a page only after checking backlinks, conversions, and query history.
