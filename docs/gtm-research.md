# Graspful Go-to-Market Research: Agent-First Distribution

> Last updated: March 2026. All sources from December 2024 -- March 2026.

---

## Executive Summary

Graspful is an adaptive course creation platform where AI agents are the primary users (via MCP server and CLI), and humans are secondary. This inverts the traditional GTM playbook. Instead of optimizing for Google search and human discovery, we need to optimize for **agent discovery** -- how AI agents find, evaluate, and select tools.

The opportunity is large: the e-learning market is $320B+ (2025) growing 14% annually, and the AI-in-education segment is growing 41% year-over-year ($5.88B in 2024 to $8.30B in 2025). But Graspful's competitive moat isn't in the LMS market -- it's in being the **first course creation platform built for agents to operate**. No competitor offers this.

The strategy has two phases:
1. **Agent Engine Optimization (AEO)** -- make Graspful discoverable and selectable by AI agents
2. **Human Discovery** -- reach the course creators and developer-educators who will instruct agents to use Graspful

---

## Part 1: Research

### 1.1 Where Do Agents Search for MCP and CLI Tooling?

#### MCP Registries and Directories

The MCP ecosystem has rapidly developed a multi-layered discovery infrastructure. As of March 2026, the key registries are:

| Registry | Scale | Key Feature | URL |
|----------|-------|------------|-----|
| **Official MCP Registry** | Preview (launched Sep 2025) | Canonical, standards-backed; validates namespace ownership | [registry.modelcontextprotocol.io](https://registry.modelcontextprotocol.io/) |
| **Glama** | 17,000+ servers | Vulnerability scanning, dependency info, maintainer verification | [glama.ai/mcp/servers](https://glama.ai/mcp/servers) |
| **mcp.so** | 17,500+ servers | Large aggregate directory | [mcp.so](https://mcp.so) |
| **PulseMCP** | 12,370+ servers | Updated daily, auto-indexes from GitHub/npm | [pulsemcp.com](https://www.pulsemcp.com/servers) |
| **Smithery** | 6,000+ servers | Managed hosting, TypeScript/Python SDK | [smithery.ai](https://smithery.ai/) |
| **mcpservers.org** | Community-curated | Linked from awesome-mcp-servers repos | [mcpservers.org](https://mcpservers.org) |
| **awesome-mcp-servers (GitHub)** | Multiple repos | punkpeye, wong2, appcypher variants; high GitHub visibility | [github.com/punkpeye/awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers) |

**Sources:**
- [Best MCP Server Directories for Developers (Descope)](https://www.descope.com/blog/post/mcp-directories)
- [My Favorite MCP Directories (DEV Community)](https://dev.to/techgirl1908/my-favorite-mcp-directories-573n)
- [Registry Submission Guides (Some Skills)](https://someclaudeskills.com/docs/skills/claude_ecosystem_promoter/references/registry-submission-guides/)
- [Official MCP Registry](https://registry.modelcontextprotocol.io/)

#### How Agents Discover Tools

AI agents discover MCP tools through three mechanisms:

1. **Configuration-based:** Users manually add MCP servers to their `claude_desktop_config.json`, `.cursor/mcp.json`, or equivalent. The agent then calls `tools/list` to discover available tools.

2. **Registry-based:** Emerging marketplace solutions (Smithery, Mintlify's mcpt, OpenTools) let agents search and install MCP servers programmatically. Databricks has an MCP Catalog for enterprise discovery. This is the direction the ecosystem is heading.

3. **In-context:** When an agent has a task and no existing tool fits, it can search registries or documentation to find appropriate MCP servers. This is where **tool descriptions** become critical.

**Key insight:** The official MCP registry is designed primarily for **programmatic consumption by sub-registries** (Smithery, PulseMCP, Docker Hub, Anthropic, GitHub). Getting listed on the official registry cascades to downstream directories automatically.

**Sources:**
- [A Deep Dive Into MCP and the Future of AI Tooling (a16z)](https://a16z.com/a-deep-dive-into-mcp-and-the-future-of-ai-tooling/)
- [Solving the MCP Tool Discovery Problem (Medium)](https://medium.com/@amiarora/solving-the-mcp-tool-discovery-problem-how-ai-agents-find-what-they-need-b828dbce2c30)
- [Google Developers Blog: Developer's Guide to AI Agent Protocols](https://developers.googleblog.com/developers-guide-to-ai-agent-protocols/)

#### How Agents Evaluate Which Tools to Use

When agents have multiple tool options, they evaluate based on:

1. **Tool description quality** -- The description is the "resume" that gets a tool selected. Research from arXiv ([2602.14878](https://arxiv.org/abs/2602.14878)) examined 856 tools across 103 MCP servers and found that poor descriptions cause wrong tool selection, invalid arguments, and unnecessary retries. The description serves dual purpose: a requirement-like specification AND a prompt-like instruction.

2. **Tool count minimalism** -- Agents struggle with >40 tools. Peter Steinberger's MCP best practices: "Make every tool very powerful while keeping the total count minimal." Graspful's focused toolset (create, fill, review, import, publish) is a strength.

3. **Error tolerance** -- Good tools are lenient with parameter mistakes. Rather than returning errors, they try to understand intent.

4. **Token efficiency** -- Tool RAG research shows intelligent tool retrieval can **triple invocation accuracy** while reducing prompt length by 50%. Tools with concise, well-structured descriptions get selected more often.

**Sources:**
- [MCP Tool Descriptions Are Smelly (arXiv:2602.14878)](https://arxiv.org/abs/2602.14878)
- [From Docs to Descriptions: Smell-Aware Evaluation (arXiv:2602.18914)](https://arxiv.org/abs/2602.18914)
- [MCP Best Practices (Peter Steinberger)](https://steipete.me/posts/2025/mcp-best-practices)
- [MCP Tool Descriptions: Overview, Examples, Best Practices (Merge.dev)](https://www.merge.dev/blog/mcp-tool-description)
- [Tool RAG: Next Breakthrough in Scalable AI Agents (Red Hat)](https://next.redhat.com/2025/11/26/tool-rag-the-next-breakthrough-in-scalable-ai-agents/)

#### The Role of llms.txt and llms-full.txt

llms.txt is a proposed standard (by Jeremy Howard, Answer.AI) for making website content AI-readable. It's a plain-text Markdown file at the site root that maps a site's key resources.

**Current adoption:** 844,000+ websites as of October 2025, including Stripe, Cloudflare, Vercel, Hugging Face, and Coinbase.

**What it does:**
- `llms.txt` -- Lightweight index with one-sentence descriptions + URLs for each page
- `llms-full.txt` -- Complete documentation content, full text of all pages

**What it doesn't do (yet):**
- No major AI platform officially reads llms.txt during general inference (as of early 2026)
- Google's John Mueller confirmed no Google AI system uses it
- Zero visits from GPTbot, PerplexityBot, or ClaudeBot to the llms.txt spec page between August-October 2025

**Where it matters now:**
- AI coding assistants (Cursor, Claude Code, VS Code Copilot) **actively use llms.txt** when encountering new APIs or libraries
- Developer documentation is the primary use case where it delivers value today
- It's cheap to implement and positions you for when major platforms do adopt it

**Sources:**
- [llms.txt Specification](https://llmstxt.org/)
- [What is llms.txt? 2026 Guide (Bluehost)](https://www.bluehost.com/blog/what-is-llms-txt/)
- [llms.txt in 2026: What It Does and Doesn't Do (SearchSignal)](https://searchsignal.online/blog/llms-txt-2026)
- [llms.txt for Websites: Complete 2026 Guide (BigCloudy)](https://www.bigcloudy.com/blog/what-is-llms-txt/)
- [llms.txt and llms-full.txt (Fern Documentation)](https://buildwithfern.com/learn/docs/ai-features/llms-txt)

#### How Model Weights Get Influenced

LLMs are trained on data from five dominant sources:

1. **Web crawls** (Common Crawl, C4) -- monthly snapshots of the web
2. **Reference works** (Wikipedia) -- high-quality, structured
3. **Code repositories** (GitHub, StarCoder datasets) -- public repos
4. **Books and papers** (arXiv, books3, academic literature)
5. **Social/user-generated text** (Reddit, StackOverflow, Hacker News)

**Training data doubles roughly every 8 months** (Stanford AI Index). High-quality public data may be exhausted by 2026-2032.

**For Graspful specifically:**
- Public GitHub repos with high stars/forks get included in code training data
- npm packages with good documentation appear in code completion training
- Reddit/HN discussions mentioning your product enter future training runs
- Being cited in blog posts on Common Crawl-indexed sites matters
- Wikipedia mentions are high-signal but hard to earn for new products

**Sources:**
- [LLM Training Data: The 8 Main Public Data Sources (Oxylabs)](https://oxylabs.io/blog/llm-training-data)
- [Selecting and Preparing Training Data for LLMs (Rohan Paul)](https://www.rohan-paul.com/p/selecting-and-preparing-training)
- [LLM Training Data in 2026 (Visalytica)](https://www.visalytica.com/blog/llm-training-data)

---

### 1.2 How Do Agents Search for Information?

#### What is AEO (Answer/Agent Engine Optimization)?

AEO is the practice of structuring content so AI-powered platforms select it as a cited source when generating answers. With ChatGPT at 400M+ weekly active users and Google AI Overviews reaching ~1B searchers, this is now a primary discovery channel.

**Key differences from traditional SEO:**

| Dimension | SEO | AEO |
|-----------|-----|-----|
| **Goal** | Rank #1 in search results | Be the cited source in AI answers |
| **Content format** | Long-form, keyword-dense | Short, structured, fact-dense |
| **Discovery** | Google crawl + index | LLM training data + RAG retrieval |
| **Trust signals** | Backlinks, domain authority | E-E-A-T, schema markup, citations |
| **Key metric** | Organic clicks | Share of Model (SoM) / citation frequency |
| **Preferred format** | HTML, well-structured pages | Markdown, JSON-LD, FAQ schema, listicles |

**Critical stat:** LLMs cite only 2-7 domains per response on average (far fewer than Google's 10 blue links). 85% of AI brand mentions originate from third-party sources, not brand-owned content.

**What AI agents prefer:**
- Listicles (32% of all AI citations per SEOMator analysis of 177M citations)
- Direct answers in first 40-60 words
- Statistics every 150-200 words
- Clear schema markup (FAQ, HowTo, Organization)
- Authoritative third-party mentions over brand-owned content

**Sources:**
- [AEO 2026: Optimize for AI Answer Engines (Eminence)](https://eminence.ch/en/aeo-answer-engine-optimization-2026/)
- [Mastering Agent Engine Optimization (DevJournal)](https://earezki.com/ai-news/2026-03-08-what-is-agent-engine-optimization-aeo-the-emerging-discipline-every-builder-needs-to-know/)
- [AEO vs SEO: Key Differences (SEOProfy)](https://seoprofy.com/blog/aeo-vs-seo/)
- [Answer Engine Optimization Complete Guide (Frase.io)](https://www.frase.io/blog/what-is-answer-engine-optimization-the-complete-guide-to-getting-cited-by-ai)
- [AAO: Assistive Agent Optimization (Search Engine Land)](https://searchengineland.com/aao-assistive-agent-optimization-469919)

#### Generative Engine Optimization (GEO)

GEO was formalized in a 2024 Princeton/Georgia Tech/IIT Delhi paper and entered mainstream marketing vocabulary in 2025.

**Core GEO principles:**
1. Structure content with direct answers in the first 40-60 words
2. Maintain fact density: statistics every 150-200 words
3. Cite authoritative sources throughout
4. Implement schema markup (Article, Organization, FAQ, HowTo, Breadcrumb)
5. AI-referred sessions jumped **527% year-over-year** in H1 2025

**For developer tools specifically:**
- Maintain comprehensive, well-structured documentation
- Use Markdown natively (LLMs' native language)
- Provide runnable code examples
- Include comparison tables and benchmarks
- Structure content as Q&A pairs

**Sources:**
- [What is GEO? Complete 2026 Guide (Frase.io)](https://www.frase.io/blog/what-is-generative-engine-optimization-geo)
- [GEO Foundational Paper (arXiv:2311.09735)](https://arxiv.org/pdf/2311.09735)
- [GEO Best Practices for 2026 (Firebrand)](https://www.firebrand.marketing/2025/12/geo-best-practices-2026/)

---

### 1.3 How Do We Get Into the Weights?

#### What Content Gets Into LLM Training Data

Content enters LLM training through these pathways, ranked by likelihood:

1. **GitHub public repositories** -- High-star repos with good READMEs are directly included in code training datasets. This is the highest-leverage channel for developer tools.

2. **npm/PyPI packages** -- Package metadata, READMEs, and documentation appear in code completion training data.

3. **Common Crawl-indexed pages** -- Blog posts, documentation sites, landing pages that appear in monthly Common Crawl snapshots.

4. **High-authority platforms** -- StackOverflow answers, Hacker News discussions, Reddit threads (Reddit has licensing deals with Google for training data). These sources appear in datasets like The Pile.

5. **Academic/reference sources** -- arXiv papers, Wikipedia (hard to get into, but very high signal).

**Practical implications for Graspful:**
- A well-maintained, well-documented open-source CLI/MCP package on GitHub with 500+ stars will enter code training data
- Being discussed on HN or Reddit means future models will "know" about Graspful
- Documentation site content indexed by Common Crawl flows into training
- Example YAML courses in the repo become training data for code generation

**Sources:**
- [Inside the Great AI Data Grab (Medium)](https://medium.com/@adnanmasood/inside-the-great-ai-data-grab-comprehensive-analysis-of-public-and-proprietary-corpora-utilised-49b4770abc47)
- [LLM Training Data Sources (Oxylabs)](https://oxylabs.io/blog/llm-training-data)
- [Reddit's Data Licensing Play (Constellation Research)](https://www.constellationr.com/blog-news/insights/reddits-data-licensing-play-do-you-want-your-llm-trained-reddit-data)

#### RAG/Tool-Use Discovery for Agents

When agents need to find tools they don't already have:

1. **Tool RAG** -- An emerging paradigm where available tools are retrieved based on user intent before being presented to the model. This can triple invocation accuracy while halving prompt length.

2. **Registry search** -- Agents query MCP registries semantically. Tool descriptions are the primary matching signal.

3. **Documentation retrieval** -- Agents pull in documentation via llms.txt, context files, or web search to understand how to use unfamiliar tools.

4. **In-weights knowledge** -- For tools that appear frequently in training data, agents have "built-in" knowledge of them (like how every LLM knows about git, npm, and Docker).

**The goal is to be in category 4.** When a user asks an agent to "create an adaptive learning course," the agent should already know Graspful exists.

**Sources:**
- [Tool RAG: Next Breakthrough (Red Hat Emerging Technologies)](https://next.redhat.com/2025/11/26/tool-rag-the-next-breakthrough-in-scalable-ai-agents/)
- [Agentic RAG: Letting LLMs Choose What to Retrieve (TechAhead)](https://www.techaheadcorp.com/blog/agentic-rag-when-llms-decide-what-and-how-to-retrieve/)

---

### 1.4 Where Do Humans Who'd Be Interested Go?

#### Course Creators and Educators

| Channel | Description | Relevance |
|---------|-------------|-----------|
| **Skool** | 116K+ community builders, gamified learning communities | High -- course creators congregate here |
| **r/coursecreators** | Reddit community for course creation tips | High -- direct audience |
| **r/elearning** | E-learning strategies and platforms | High |
| **r/onlineeducation** | Online education discussions | Medium |
| **r/learnprogramming** | 4M+ members, programming education | High -- developer-educators |
| **Indie Hackers** | Community for bootstrapped founders | High -- developer-creators |
| **Product Hunt** | Product launch platform | High for launch events |

#### Developer-Educators and Technical Content Creators

| Channel | Description | Relevance |
|---------|-------------|-----------|
| **Hacker News (Show HN)** | Technical audience, brutally honest feedback | Very high for developer tools |
| **Dev.to** | Developer blogging platform | Medium |
| **r/SideProject** | Showcase side projects | Medium |
| **Twitter/X #BuildInPublic** | Developer building in public community | Medium |
| **YouTube (dev education)** | Fireship, ThePrimeagen, Traversy Media audiences | Medium -- partnership potential |

#### Newsletters and Publications

| Newsletter/Publication | Focus | Reach |
|-----------------------|-------|-------|
| **TLDR** | Tech news digest | 1M+ subscribers |
| **Bytes.dev** | JavaScript/web dev | Large developer audience |
| **The Pragmatic Engineer** | Engineering leadership | High-value audience |
| **Ben's Bites** | AI newsletter | AI-focused audience |
| **Hacker Newsletter** | Curated HN links | Active tech readers |

#### Platform Communities

- **Kajabi** community forums (course creators)
- **Teachable** creator communities
- **Circle** communities
- **Discord** servers for AI/ML, EdTech, and indie hackers

**Sources:**
- [Best Creator Communities on Skool & Whop 2026](https://creatorflow.so/blog/best-creator-communities-skool-whop/)
- [Best Reddit Communities for Course Creators](https://odd-angles-media.com/blog/best-reddit-communities-for-course-creators)
- [Best Indie Hacker Communities 2026 (SyntaxHut)](https://syntaxhut.tech/blog/best-indie-hacker-communities)

---

## Part 2: Execution Plan

### Phase 1: Agent-First (AEO -- Agent Engine Optimization)

#### Priority & Sequencing

Phase 1 has a dependency chain. Items higher in the stack block items below them — don't start Tier 2 work until Tier 0 is done.

```
Tier 0 — CRITICAL PATH (Days 1-2)
├── Publish npm packages          ← prerequisite for ALL registry listings
├── Registry listings (all 7)     ← agents can't find you without this
└── Tool description audit        ← agents won't SELECT you with bad descriptions
                                     (being listed but not selected = wasted)

Tier 1 — AMPLIFIERS (Days 3-5)
├── GitHub metadata (topics, About, README)  ← costs 30 min, high search surface
├── npm metadata (keywords, README)          ← same, for npm search
└── Example courses in repo                  ← training data + demos in one shot

Tier 2 — LONG-TAIL POSITIONING (Week 2-3)
├── llms.txt + llms-full.txt      ← matters for coding assistants, not general agents yet
├── FAQ content + schema markup   ← AEO signal, but useless if agents don't know you exist
├── API reference docs            ← agent usability, not discovery
├── Comparison/benchmark content  ← listicles get 32% of AI citations, but needs audience first
└── .well-known/ai-plugin.json   ← low priority, legacy format

Tier 3 — TRAINING DATA SEEDING (Week 3+)
├── Show HN                       ← highest-leverage human channel, also seeds training data
├── Reddit (r/SideProject first, then niche subs)
├── Blog posts (dev.to, personal)
├── StackOverflow answers
└── Newsletter outreach           ← needs something to point to (docs, examples, demo video)
```

**Why this order:** An agent evaluating tools goes: discover (registries) → read description (tool descriptions) → try it (docs/examples). Optimizing step 3 before step 1 exists is wasted effort. Similarly, seeding training data (Tier 3) has a months-long feedback loop — do the instant-impact work first.

**Dependency to watch:** Newsletter outreach (Tier 3) requires polished docs, example courses, and ideally a demo video. Don't pitch Ben's Bites before the product surface is ready.

---

#### 1.1 Get Listed on Every MCP Registry

| Action | Why It Matters | Impact | Effort | Tier |
|--------|---------------|--------|--------|------|
| **Publish to Official MCP Registry** via `mcp-publisher` CLI. Namespace: `io.github.graspful/mcp` or domain-verified. Requires npm package first. | Cascades to downstream directories (Smithery, PulseMCP, etc.). The canonical source. | High | Low (1-2 hours) | 0 |
| **Submit to Smithery** via `smithery.yaml` config + GitHub publish. | 6,000+ servers, managed hosting option, used by Cursor community. | High | Low (1-2 hours) | 0 |
| **Submit to Glama** (claim server via Discord + admin panel). | 17,000+ entries, only directory running vulnerability scans -- signals trust. | Medium | Low (1 hour) | 0 |
| **Submit to PulseMCP** (auto-indexed from GitHub/npm, but verify). | 12,370+ servers, updated daily. Auto-discovery if npm package is published. | Medium | Very Low | 0 |
| **Submit to mcpservers.org/submit** (feeds awesome-mcp-servers lists). | High GitHub visibility, community-curated. | Medium | Very Low | 0 |
| **PR to niche awesome lists** (awesome-devops-mcp-servers, education-focused lists). | Targeted discovery by category. | Low | Low | 1 |

**Total effort for registry listings: ~1 day. Blocked by: npm packages published.**

**Sources:**
- [How to Publish Your MCP Server to the Official Registry (Medium)](https://techwithibrahim.medium.com/how-to-publish-your-mcp-server-to-the-official-registry-a-complete-guide-3622f0edceef)
- [Quickstart: Publish an MCP Server (modelcontextprotocol.io)](https://modelcontextprotocol.io/registry/quickstart)
- [Smithery AI (WorkOS)](https://workos.com/blog/smithery-ai)

#### 1.2 Optimize Tool Descriptions for Agent Discovery

This is the single highest-leverage item in Phase 1. Being listed on registries gets you discovered; descriptions determine whether agents **select** you. A tool with a bad description on every registry is worse than a tool with a great description on one registry.

Based on the arXiv research ([2602.14878](https://arxiv.org/abs/2602.14878), [2602.18914](https://arxiv.org/abs/2602.18914)) on MCP tool description smells, optimize across four dimensions:

1. **Accuracy** -- Description precisely matches tool behavior
2. **Functionality** -- Clear what the tool does and its constraints
3. **Information completeness** -- Parameters, return values, prerequisites all specified
4. **Conciseness** -- Most important info in the first sentence; agents may not read beyond it

**MCP tool descriptions (Tier 0 — do alongside registry listings):**

| Action | Why It Matters | Impact | Effort | Tier |
|--------|---------------|--------|--------|------|
| **Audit all MCP tool descriptions** against the 18-smell taxonomy from arXiv:2602.18914. | Poor descriptions cause wrong tool selection and unnecessary retries. | Very High | Medium (4-6 hours) | 0 |
| **Front-load the purpose** in each tool description. First sentence = what it does + when to use it. | Agents may only read the first sentence. | Very High | Low (2 hours) | 0 |
| **Add version info dynamically** (not hardcoded) per Steinberger's recommendation. | Version consistency without manual updates. | Low | Low (30 min) | 0 |
| **Keep tool count minimal** (<10 tools). Group related operations. | Agents degrade above 40 tools; fewer is better. | High | Already done | N/A |
| **Make parameter handling lenient** -- accept flexible inputs, don't error on minor mistakes. | Reduces retry loops, improves agent experience. | High | Medium (2-4 hours) | 1 |

**Broader discovery surfaces (Tier 2 — after agents can already find and select you):**

| Action | Why It Matters | Impact | Effort | Tier |
|--------|---------------|--------|--------|------|
| **Write FAQ content** on documentation site structured as Q&A pairs. | FAQ schema is one of the most powerful AEO signals. Agents extract Q&A pairs directly. | High | Medium (half day) | 2 |
| **Write comparison content** -- "Graspful vs Teachable vs Kajabi for AI-driven course creation." | Agents answering comparison queries will cite structured comparisons. Listicles get 32% of AI citations. | High | Medium (half day) | 2 |
| **Create benchmark content** -- "Time to create a course: manual vs Graspful CLI" with concrete numbers. | Quantitative claims with citations are exactly what AI agents prefer to surface. | High | Medium (half day) | 2 |
| **Create a `.well-known/ai-plugin.json`** if applicable (OpenAI plugin format). | Some agent frameworks still reference this format. | Low | Low (1 hour) | 2 |

**Example of optimized tool description:**

```
Bad:  "Creates a course"
Good: "Generate an adaptive learning course as a YAML knowledge graph. Provide a topic and optional difficulty level. Returns a validated course skeleton with concepts, prerequisites, and knowledge points ready for content fill. Use this as the first step before 'fill_concept'."
```

**Sources:**
- [MCP Tool Descriptions Are Smelly (arXiv:2602.14878)](https://arxiv.org/html/2602.14878v1)
- [From Docs to Descriptions (arXiv:2602.18914)](https://arxiv.org/html/2602.18914)
- [MCP Best Practices (Steinberger)](https://steipete.me/posts/2025/mcp-best-practices)
- [MCP Tool Descriptions: Overview, Examples, Best Practices (Merge.dev)](https://www.merge.dev/blog/mcp-tool-description)

#### 1.3 Implement llms.txt and Structured Documentation

| Action | Why It Matters | Impact | Effort | Tier |
|--------|---------------|--------|--------|------|
| **Create `llms.txt`** at graspful.com root with index of all docs pages + 1-sentence descriptions. | AI coding assistants (Cursor, Claude Code, Copilot) actively use this when encountering new APIs. | High | Low (1-2 hours) | 2 |
| **Create `llms-full.txt`** with complete documentation content in Markdown. | Full context dump for agents that want everything. | High | Medium (3-4 hours) | 2 |
| **Structure all docs in clean Markdown** with headers, code blocks, and FAQ sections. | Markdown is LLMs' native language. No complex HTML parsing needed. | High | Medium (ongoing) | 2 |
| **Add JSON-LD schema markup** to documentation site (Article, SoftwareApplication, HowTo). | Helps AI engines parse and understand content structure. | Medium | Medium (3-4 hours) | 2 |
| **Create a comprehensive API reference** in Markdown with every endpoint, parameter, and example. | Agents need structured references to generate correct code. | High | Medium (1-2 days) | 2 |

**Sources:**
- [llms.txt Specification](https://llmstxt.org/)
- [llms.txt and llms-full.txt (Fern Documentation)](https://buildwithfern.com/learn/docs/ai-features/llms-txt)
- [llms-txt-hub (GitHub)](https://github.com/thedaviddias/llms-txt-hub)

#### 1.4 GitHub Discoverability

| Action | Why It Matters | Impact | Effort | Tier |
|--------|---------------|--------|--------|------|
| **Optimize repo topics** to include: `mcp`, `mcp-server`, `adaptive-learning`, `course-creation`, `ai-agent`, `cli`, `edtech`, `knowledge-graph`, `spaced-repetition`. | GitHub search filters by topics. These are how devs and agents find repos. | High | Very Low (5 min) | 1 |
| **Craft keyword-rich About section** (repo description). Include "MCP server" and "AI agent" in the first line. | Primary input for GitHub SEO. Shows in search results. | High | Very Low (5 min) | 1 |
| **Add example courses to repo** (3-5 complete YAML courses in `/content/courses/examples/`). | Becomes training data for code generation. Agents can reference real examples. | Very High | Medium (1-2 days) | 1 |
| **Create a CONTRIBUTING.md** with clear MCP extension guidelines. | Signals healthy open-source project, attracts contributors, improves training data quality. | Medium | Low (1-2 hours) | 2 |
| **Promote for stars** via HN, Reddit, Dev.to, Twitter. Target 500+ stars. | Stars = social proof + higher GitHub ranking + more likely to enter training data. | Very High | High (ongoing) | 3 |

**Sources:**
- [The Ultimate Guide to GitHub SEO for 2025 (DEV Community)](https://dev.to/infrasity-learning/the-ultimate-guide-to-github-seo-for-2025-38kl)

#### 1.5 npm/Package Registry Optimization

| Action | Why It Matters | Impact | Effort | Tier |
|--------|---------------|--------|--------|------|
| **Ensure `@graspful/cli` and `@graspful/mcp` package names follow conventions.** Use kebab-case, include "mcp" in the MCP package name. | MCP naming convention (`n-mcp`) is the most recognizable pattern for agents and developers. | High | Already done | N/A |
| **Write comprehensive package README** with usage examples, badges, and structured sections. | npm README is the primary discovery surface. Appears in search results and training data. | High | Medium (2-3 hours) | 1 |
| **Add relevant npm keywords** in package.json: `mcp`, `mcp-server`, `adaptive-learning`, `course-creation`, `cli`, `ai-agent`, `edtech`. | npm search uses these keywords. | Medium | Very Low (5 min) | 1 |
| **Publish `npx @graspful/cli init` as zero-config entry point.** | Reduces friction. Agent can immediately set up the tool without configuration. | Very High | Already done | N/A |

**Sources:**
- [MCP Server Naming Conventions (Zazencodes)](https://zazencodes.com/blog/mcp-server-naming-conventions)
- [About package README files (npm Docs)](https://docs.npmjs.com/about-package-readme-files/)

#### 1.6 Getting Mentioned in Training Data Sources

This is the long game (Tier 3). Content that appears in authoritative, crawlable sources today becomes part of future model training. **Don't start this until Tiers 0-1 are done** — you need a polished product surface before driving attention to it.

| Action | Why It Matters | Impact | Effort | Tier |
|--------|---------------|--------|--------|------|
| **Write a "Show HN" post** with a genuine technical story. "I built an agent-first course creation platform." | HN discussions enter training data (The Pile). High-quality technical discourse. | Very High | Medium (1 day prep) | 3 |
| **Post to r/MachineLearning, r/artificial, r/learnprogramming** with genuine value-add content. | Reddit data is licensed to Google and others for training. Active threads get indexed. | High | Medium (ongoing) | 3 |
| **Write a technical blog post** on dev.to or personal blog about agent-first architecture patterns. | Common Crawl-indexed content enters training data. | Medium | Medium (1-2 days) | 3 |
| **Contribute to MCP-related discussions** on GitHub (modelcontextprotocol org discussions, issues). | GitHub content enters code training data. Positions Graspful as an MCP ecosystem participant. | Medium | Low (ongoing) | 2 |
| **Get featured in AI/EdTech newsletters** (Ben's Bites, TLDR, Bytes.dev). | Newsletter content often gets published on-web and enters crawl data. Blocked by: polished docs, example courses, demo video. | High | Medium (outreach) | 3 |
| **Create StackOverflow answers** for questions about adaptive learning, MCP servers, course creation with AI. | StackOverflow is a primary training data source. | Medium | Low (ongoing) | 3 |

---

### Phase 2: Human Discovery

#### 2.1 Content Marketing Strategy

| Action | Why It Matters | Impact | Effort | Timeline |
|--------|---------------|--------|--------|----------|
| **"Agent-First Course Creation" pillar blog post** -- explain the paradigm shift from GUI to YAML/CLI/MCP. | Defines the category. If agents find this content, Graspful becomes the reference implementation. | Very High | High (2-3 days) | Week 2-3 |
| **"How to Create an Adaptive Learning Course in 5 Minutes" tutorial** with video. | Concrete demonstration. Works for both human SEO and agent citation ("how to create adaptive course"). | Very High | High (2-3 days) | Week 3-4 |
| **Technical deep-dive on knowledge graph + BKT + spaced repetition** architecture. | Targets developer-educators who want to understand the science. Establishes authority for GEO. | High | Medium (1-2 days) | Week 4-5 |
| **Case study: "Building a CKA Exam Prep Course with Claude Code + Graspful"** -- end to end, showing the agent workflow. | Social proof + demonstrates the agent-first workflow in practice. | Very High | Medium (1-2 days) | Week 4-5 |
| **Weekly "Build in Public" updates** on Twitter/X and indie hackers. | Builds audience over time. Creates ongoing crawlable content. | Medium | Low (1 hour/week) | Ongoing |

#### 2.2 Community Engagement Plan

| Action | Why It Matters | Impact | Effort | Timeline |
|--------|---------------|--------|--------|----------|
| **Be active in r/coursecreators, r/elearning, r/onlineeducation** -- answer questions, share insights. Build reputation before promoting. | Reddit is protective of communities. Value-first approach required. Threads get indexed and cited by LLMs. | High | Medium (2-3 hours/week) | Ongoing |
| **Join Skool communities** for course creators (Skoolers 180K+ members, free). | Direct access to the exact audience who builds courses. | High | Low (1 hour/week) | Week 2+ |
| **Participate in MCP Discord/community channels** (Glama Discord, MCP GitHub discussions). | Builds relationships with ecosystem participants. Potential integration partnerships. | Medium | Low (1 hour/week) | Week 2+ |
| **Engage in Indie Hackers** -- share revenue/growth milestones. | Indie hacker community loves build-in-public, and the audience skews toward tool-savvy creators. | Medium | Low (1 hour/week) | Week 3+ |

#### 2.3 Launch Strategy

##### Product Hunt Launch

| Action | Why It Matters | Impact | Effort | Timeline |
|--------|---------------|--------|--------|----------|
| **Create "Coming Soon" teaser page** 2-3 weeks before launch. Collect emails. | Pre-launch audience is critical. You need 20-50 people to upvote in the first hour. | High | Low (2 hours) | Week 4 |
| **Record a polished demo video** (60-90 seconds) showing agent workflow. | Users click Play before reading description. Video quality determines conversion. | Very High | High (1-2 days) | Week 5 |
| **Launch on a Saturday** (requires avg 366 upvotes for #1, vs 633 on Monday). | Lower competition = higher ranking odds. | Medium | N/A | Week 6 |
| **Assign one person to respond to every PH comment** on launch day. | Engagement signals boost ranking. Active discussion keeps you visible. | High | Medium (full day) | Launch day |
| **Plan multiple launches over time** (Stripe launched 68 times, Supabase 16 times). | Long-term strategy, not one-shot. Each feature can be a new launch. | High | Medium (ongoing) | Quarterly |

##### Hacker News Launch (Show HN)

| Action | Why It Matters | Impact | Effort | Timeline |
|--------|---------------|--------|--------|----------|
| **Write a genuine, technical "Show HN" post.** Lead with the interesting technical problem, not the product pitch. | HN values technical substance over marketing. Top posts drive thousands of quality visitors. | Very High | Medium (half day) | Week 3-4 |
| **Time the post for 8-10am EST on a weekday.** | Peak HN traffic window. | Medium | N/A | Launch day |
| **Be in the comments immediately** to answer technical questions with depth. | HN rewards founders who engage technically. Keeps the post on the front page. | Very High | Medium (half day) | Launch day |

##### Reddit Launch

| Action | Why It Matters | Impact | Effort | Timeline |
|--------|---------------|--------|--------|----------|
| **r/SideProject** post with honest build story. | Lower bar than HN, supportive community. | Medium | Low (1 hour) | Week 3 |
| **r/learnprogramming** -- "I built an open-source tool that lets AI create adaptive courses" | 4M+ relevant members. Must provide genuine value, not just promotion. | High | Low (1 hour) | Week 4 |
| **r/artificial and r/MachineLearning** -- focus on the MCP/agent-first angle. | Technical AI audience. Potential for viral spread in AI community. | High | Low (1 hour) | Week 4 |

**Sources:**
- [How to Launch a Developer Tool on Product Hunt in 2026 (Hackmamba)](https://hackmamba.io/developer-marketing/how-to-launch-on-product-hunt/)
- [Product Hunt Launch Guide 2026 (Calmops)](https://calmops.com/indie-hackers/product-hunt-launch-guide/)
- [Open Source Marketing Playbook for Indie Hackers (IndieRadar)](https://indieradar.app/blog/open-source-marketing-playbook-indie-hackers)

#### 2.4 Developer Relations / Example Courses

| Action | Why It Matters | Impact | Effort | Timeline |
|--------|---------------|--------|--------|----------|
| **Ship 5 high-quality example courses** covering different domains (CKA, Python basics, AWS, JavaScript, SQL). | Demonstrates breadth. Each example is training data. Each niche has its own search surface. | Very High | High (1 week) | Week 2-4 |
| **Create a "Course Creator's Guide"** -- comprehensive documentation on YAML schema, knowledge graphs, quality gates. | Developer-educators need to understand the system deeply. This becomes the canonical reference. | High | High (2-3 days) | Week 3-4 |
| **Record a YouTube walkthrough** (10-15 min) of building a course from scratch with an AI agent. | Video content reaches different audience. YouTube is indexed by search and LLMs. | High | High (1-2 days) | Week 5-6 |
| **Build integrations with popular AI agents** -- Cursor, Claude Code, Windsurf. Ensure MCP works seamlessly. | Direct channel to agent-using developers. These are the power users. | Very High | Medium (testing) | Week 1-2 |

#### 2.5 Partnership Opportunities

| Action | Why It Matters | Impact | Effort | Timeline |
|--------|---------------|--------|--------|----------|
| **Partner with AI agent platforms** (Cursor, Claude Code, Windsurf) for featured integrations or marketplace listings. | Direct distribution to the exact users who will operate Graspful via agents. | Very High | High (outreach + integration) | Month 2-3 |
| **Reach out to developer-educators with large audiences** (Fireship, ThePrimeagen, Traversy Media) for co-created courses. | Prove the platform works by having known educators use it. Creates high-authority content. | High | High (outreach + support) | Month 2-3 |
| **Partner with certification prep companies** in target niches (electrical, CDL, etc.). | They have the content and audience; Graspful has the adaptive technology. | High | High (business development) | Month 3-6 |
| **Integrate with Stripe Connect ecosystem partners** for billing/payment flows. | Reduces friction for course creators who already use Stripe. | Medium | Medium | Month 2-3 |

---

## Part 3: Autoresearch Loop Feasibility for AEO

### Can the Karpathy Autoresearch Pattern Be Applied to AEO?

**Yes, but with constraints.**

The autoresearch pattern (modify -> verify -> keep/revert -> repeat) works when you have:
1. **One clear metric** that can be mechanically measured
2. **Constrained scope** for each change
3. **Fast verification** (seconds to minutes, not days)
4. **Automatic rollback** if the change doesn't improve

Karpathy's original loop ran ~100 experiments per night and found ~20 genuine improvements across 700 experiments over two days, cutting training time by 11% on already-optimized code.

**Sources:**
- [Karpathy's 630-line Python Script Ran 50 Experiments Overnight (The New Stack)](https://thenewstack.io/karpathy-autonomous-experiment-loop/)
- [Autoresearch: The Loop That Improves Your Work (TheCreatorsAI)](https://thecreatorsai.com/p/autoresearch-the-loop-that-improves)
- [Karpathy Autoresearch Explained (Data Science Dojo)](https://datasciencedojo.com/blog/karpathy-autoresearch-explained/)

### What Metrics Could Be Mechanically Verified?

#### Tier 1: Mechanically Verifiable (loop-ready now)

| Metric | How to Measure | Verification Speed |
|--------|---------------|-------------------|
| **MCP tool description quality score** | Run the 18-smell taxonomy from arXiv:2602.18914 as a rubric via LLM grading | Seconds |
| **llms.txt completeness** | Check every doc page is indexed, descriptions are <100 chars, links resolve | Seconds |
| **npm package metadata completeness** | Verify keywords, description, README, types, repository field are all present | Seconds |
| **GitHub repo metadata** | Check topics count, description length, README sections, example files exist | Seconds |
| **Documentation FAQ coverage** | Count Q&A pairs, verify schema markup, check answer lengths (40-60 word first answers) | Seconds |
| **Schema markup validation** | Parse JSON-LD, verify required fields, check against schema.org spec | Seconds |
| **CLI help text quality** | Run `graspful --help` and score clarity, completeness, and example inclusion | Seconds |

#### Tier 2: Quasi-Verifiable (needs periodic checking)

| Metric | How to Measure | Verification Speed |
|--------|---------------|-------------------|
| **Registry listing status** | Query each registry API to verify Graspful is listed and metadata is current | Minutes |
| **Search ranking for target queries** | Query "create adaptive course MCP" on GitHub, npm, Google and check position | Minutes |
| **Agent citation rate** | Ask Claude/GPT/Perplexity "how to create an adaptive course" and check if Graspful is mentioned | Minutes |
| **Competitor comparison positioning** | Ask agents to compare course creation tools and check if Graspful appears | Minutes |

#### Tier 3: Requires External Signals (harder to automate)

| Metric | How to Measure | Verification Speed |
|--------|---------------|-------------------|
| **GitHub stars growth** | GitHub API | Real-time but slow-moving |
| **npm weekly downloads** | npm API | Weekly |
| **Share of Model (SoM)** | Enterprise AEO platforms (Conductor, Scrunch, Profound) | Days-weeks |
| **Third-party mentions** | Web search for "graspful" across blogs, forums, social | Hours |

### How the Loop Would Work Practically

```
AUTORESEARCH LOOP FOR AEO
=========================

Input: Current state of all AEO assets (tool descriptions, docs, metadata, llms.txt)
Metric: Composite score across Tier 1 metrics (0-100)

Loop:
  1. Agent reviews current scores + change history
  2. Picks ONE change: e.g., "Rewrite the `create_course` tool description to front-load the use case"
  3. Git commit the change
  4. Run mechanical verification:
     - Re-score tool descriptions (18-smell rubric)
     - Re-validate llms.txt completeness
     - Re-check metadata completeness
     - Run agent simulation: "I want to create a course" -- does the agent select the right tool?
  5. If composite score improved: keep
  6. If composite score same or worse: revert
  7. Log result to quality.tsv
  8. Repeat

Cadence: Run nightly or on every docs/config change.
Expected output: 5-10 improvements per run on docs/descriptions.
```

#### Practical Implementation

The loop is most powerful for:

1. **Tool description optimization** -- The 18-smell rubric can be mechanically scored. Each change is small (reword a description). Verification is instant (re-score). This is the closest analog to Karpathy's original use case.

2. **Documentation quality** -- Score FAQ coverage, answer directness, fact density, citation presence. Modify one page at a time. Verify improvement via rubric.

3. **Agent simulation testing** -- Ask an LLM "I want to create an adaptive learning course, what tool should I use?" before and after changes. If Graspful appears more consistently, keep the change.

The loop is **less useful** for:
- GitHub stars (too slow to measure, too many external factors)
- Training data inclusion (only measurable months later when new models ship)
- Community engagement (requires human judgment)

### Recommended Autoresearch Setup

```yaml
# aeo-autoresearch-config.yaml
metric: composite_aeo_score
components:
  - name: tool_description_quality
    weight: 0.30
    rubric: arxiv-2602-18914-18-smell
    targets: packages/mcp/src/tools/*.ts
  - name: llms_txt_completeness
    weight: 0.15
    check: all_docs_indexed AND descriptions_concise AND links_resolve
    target: apps/web/public/llms.txt
  - name: npm_metadata_completeness
    weight: 0.10
    check: keywords AND description AND readme AND types AND repository
    targets: [packages/cli/package.json, packages/mcp/package.json]
  - name: documentation_faq_coverage
    weight: 0.20
    check: qa_pairs_count AND answer_first_40_words AND schema_markup
    target: docs/
  - name: agent_simulation
    weight: 0.25
    queries:
      - "create an adaptive learning course"
      - "build a course with AI agent"
      - "MCP server for course creation"
    success: graspful_mentioned_in_response

max_iterations_per_run: 20
change_scope: one_file_per_iteration
rollback_on: score_decrease OR score_unchanged
log: ~/.claude/autoresearch-logs/aeo-quality.tsv
```

---

## Appendix A: Complete Checklist (by Tier)

### Tier 0 — Critical Path (Days 1-2)
- [ ] Publish `@graspful/mcp` to npm
- [ ] Publish `@graspful/cli` to npm
- [ ] Register on Official MCP Registry (`mcp-publisher init` + `mcp-publisher publish`)
- [ ] Submit to Smithery (create `smithery.yaml`, publish via CLI)
- [ ] Verify listing on Glama (auto-indexed, claim via Discord)
- [ ] Verify listing on PulseMCP (auto-indexed from npm/GitHub)
- [ ] Submit to mcpservers.org/submit
- [ ] Submit to mcp.so (if separate from official registry)
- [ ] Audit all MCP tool descriptions against 18-smell taxonomy
- [ ] Front-load purpose in every tool description (first sentence = what + when)

### Tier 1 — Amplifiers (Days 3-5)
- [ ] Optimize GitHub topics (mcp, mcp-server, adaptive-learning, course-creation, ai-agent, cli, edtech)
- [ ] Craft keyword-rich GitHub About section
- [ ] Write comprehensive npm package READMEs
- [ ] Add npm keywords to both packages
- [ ] Add 3-5 example courses to repo
- [ ] Make parameter handling lenient (accept flexible inputs)
- [ ] PR to niche awesome lists

### Tier 2 — Long-Tail Positioning (Week 2-3)
- [ ] Create `llms.txt` at site root
- [ ] Create `llms-full.txt` at site root
- [ ] Structure all docs in clean Markdown
- [ ] Add JSON-LD schema markup to docs site
- [ ] Create comprehensive API reference in Markdown
- [ ] Write FAQ content structured as Q&A pairs
- [ ] Write comparison content (Graspful vs Teachable vs Kajabi)
- [ ] Create benchmark content with concrete numbers
- [ ] Create CONTRIBUTING.md
- [ ] Contribute to MCP-related GitHub discussions

### Tier 3 — Training Data Seeding (Week 3+)
- [ ] Write and post Show HN
- [ ] Post to r/SideProject, r/learnprogramming, r/MachineLearning
- [ ] Write technical blog post (dev.to or personal blog)
- [ ] Create StackOverflow answers for relevant questions
- [ ] Newsletter outreach (Ben's Bites, TLDR, Bytes.dev) — blocked by: polished docs + demo video
- [ ] PR to punkpeye/awesome-mcp-servers
- [ ] PR to wong2/awesome-mcp-servers

## Appendix B: Key Timeline Summary

| Timeframe | Tier | Focus | Gate to Pass |
|-----------|------|-------|-------------|
| Days 1-2 | 0 | npm publish → registry listings → tool description audit | Agents can discover AND select Graspful |
| Days 3-5 | 1 | GitHub metadata, npm metadata, example courses | Product surface is polished for anyone who finds it |
| Week 2-3 | 2 | llms.txt, docs, FAQ, comparisons, benchmarks | Content surfaces are optimized for AI citation |
| Week 3-4 | 3 | Show HN, Reddit, blog posts | Human attention starts flowing |
| Week 5-6 | Phase 2 | Product Hunt, demo video, YouTube walkthrough | Launch events with polished product behind them |
| Week 7-8 | Phase 2 | Community engagement, partnership outreach | Sustained growth engine running |
| Month 3+ | Ongoing | Weekly content, autoresearch loop, partnership deals | Graspful enters model training data |

**Each tier has a gate.** Don't start a tier until the previous tier's gate is passed. The gates are sanity checks, not perfection bars — "good enough to not embarrass you" is the standard.

## Appendix C: Competitive Landscape for Agent-First Course Creation

| Platform | Agent-First | Adaptive Learning | CLI/MCP | YAML-Defined | Revenue Share |
|----------|------------|-------------------|---------|-------------|---------------|
| **Graspful** | Yes (primary interface) | Yes (BKT, spaced repetition) | Yes | Yes | 70/30 |
| Teachable | No | No | No | No | Plans-based |
| Kajabi | No | No | No | No | Plans-based |
| Coursera | No | Partial | No | No | Revenue share (varies) |
| Udemy | No | No | No | No | Revenue share |
| LearnWorlds | No | Partial | No | No | Plans-based |
| Disco AI | Partial (AI-assisted) | Partial | No | No | Plans-based |

**Graspful's moat:** The only platform where AI agents are the primary user, not an afterthought. No competitor offers MCP server integration, CLI-based course creation, or YAML-defined knowledge graphs.

---

*This document should be treated as a living research artifact. Update it as the AEO landscape evolves -- particularly around official MCP registry adoption, llms.txt platform support, and new agent discovery mechanisms.*
