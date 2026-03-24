# Graspful vs Traditional Course Platforms

Graspful is the first course creation platform built for AI agents. While platforms like Teachable, Kajabi, Coursera, and Udemy require humans to click through web UIs to build courses, Graspful exposes course creation as callable primitives -- MCP tool calls and CLI commands that any AI agent can invoke. The result: an agent can go from a topic idea to a live adaptive course with a knowledge graph, diagnostic assessments, spaced repetition, practice problems, a landing page, and Stripe billing in 1-3 hours. Traditional platforms require 20-40 hours of manual work to achieve less.

But Graspful isn't just faster to build on. The courses themselves are fundamentally different. Every Graspful course is a validated knowledge graph (DAG) with BKT mastery tracking, adaptive diagnostics, and FIRe-based spaced repetition. Students get personalized learning paths. Traditional platforms deliver the same linear content to every student.

> **On the shoulders of giants.** Graspful's adaptive learning model is heavily inspired by [*The Math Academy Way*](https://www.justinmath.com/the-math-academy-way/) by Justin Skycak — a free, open book that lays out the principles behind knowledge graphs, mastery-based progression, and spaced repetition. We're trying to take those ideas, generalize them beyond math, and make them accessible to anyone with an AI agent and a topic to teach.

---

## Feature Comparison

| Feature | Graspful | Teachable | Kajabi | Coursera | Udemy |
|---------|----------|-----------|--------|----------|-------|
| **AI Agent Interface (MCP/CLI)** | Yes (primary interface) | No | No | No | No |
| **Adaptive Learning** | Yes (BKT mastery model) | No | No | Partial | No |
| **Spaced Repetition** | Yes (FIRe algorithm) | No | No | No | No |
| **Knowledge Graphs** | Yes (DAG-validated) | No | No | No | No |
| **YAML-Defined Courses** | Yes | No | No | No | No |
| **White-Label Sites** | Yes (multi-tenant, single deployment) | Limited | Limited | No | No |
| **Custom Domains** | Yes (included) | Yes (paid plans) | Yes (paid plans) | No | No |
| **Revenue Model** | 70/30 revenue share | Monthly plans ($39--$665) | Monthly plans ($69--$399) | Revenue share (varies) | Revenue share |
| **Zero Upfront Cost** | Yes | No (monthly fee required) | No (monthly fee required) | N/A (institutional) | Yes |
| **Diagnostic Assessments** | Yes (automatic, 20-60 adaptive questions) | No | No | No | No |
| **Mastery-Based Progression** | Yes (prerequisite enforcement) | No | No | Partial | No |
| **CLI for Course Creation** | Yes (`npx @graspful/cli`) | No | No | No | No |
| **Schema Validation** | Yes (Zod + DAG verification) | N/A | N/A | N/A | N/A |
| **Automated Quality Checks** | 10 mechanical checks | 0 | 0 | 0 | 0 |
| **Question Deduplication** | Automatic (cross-concept) | Manual (if at all) | Manual (if at all) | Manual | Manual |
| **Difficulty Staircase Validation** | Automatic per concept | None | None | None | None |
| **Structured Output (JSON)** | Yes (`--format json`) | N/A | N/A | N/A | N/A |

---

## Detailed Comparisons

### Graspful vs Teachable

Teachable is a mature course hosting platform that lets creators sell video-based courses through a branded storefront. It handles payments, student management, and basic marketing. For creators who manually record video lectures and want a straightforward way to sell them, Teachable works well.

Graspful differs in three fundamental ways. First, the creation interface: Teachable requires clicking through a web UI to upload videos, create quizzes, and arrange modules. Graspful courses are YAML files created by AI agents via MCP or CLI -- no video required, no UI clicking. Second, the learning model: Teachable delivers the same linear sequence of content to every student. Graspful runs adaptive diagnostics to skip known material, enforces mastery before progression, and schedules spaced repetition to prevent forgetting. Third, the cost structure: Teachable's plans range from $39 to $665/month regardless of revenue. Graspful charges nothing upfront -- the 70/30 split only applies when learners actually pay.

Teachable's strengths are in its ecosystem maturity: integrations with email marketing tools, affiliate programs, and a large community of video-based course creators. If your course is primarily video content with minimal assessment, Teachable may be a better fit.

### Graspful vs Kajabi

Kajabi positions itself as an all-in-one platform for online businesses: courses, communities, email marketing, websites, and funnels. It's the most feature-rich of the traditional platforms, with strong marketing automation and a polished UI. Pricing starts at $69/month and goes to $399/month.

The core difference is the same as Teachable: Kajabi is a content hosting platform with a web UI, while Graspful is an adaptive learning platform with an agent interface. Kajabi has no knowledge graph, no prerequisite enforcement, no diagnostic assessments, no spaced repetition, and no MCP/CLI interface. Its courses are linear sequences of content -- every student gets the same experience.

Kajabi's all-in-one approach is genuinely useful if you need email funnels, community features, and marketing automation bundled with your course platform. Graspful is focused specifically on adaptive learning and agent-first course creation. If you need the marketing stack, Kajabi delivers more of it out of the box. If you need learning science and AI-powered course creation, Graspful delivers more.

### Graspful vs Coursera

Coursera is an institutional platform: universities and large organizations publish courses to Coursera's marketplace. Individual creators generally can't publish directly. Coursera has some adaptive features -- partial mastery tracking and suggested review -- but these are platform-controlled, not creator-defined. The revenue model varies by program type and is negotiated with institutions.

Graspful and Coursera operate at different ends of the market. Coursera is a centralized marketplace with brand recognition and millions of learners but limited creator control. Graspful gives creators full control: their own domain, their own brand, their own pricing, their own knowledge graph structure. Graspful's adaptive engine (BKT, FIRe, diagnostic assessments) is deeper than Coursera's because it operates on a creator-defined knowledge graph with explicit prerequisite and encompassing edges, rather than inferring structure from platform-level analytics.

If you're a university seeking institutional reach, Coursera is the obvious choice. If you're an independent creator or organization that wants to own the learner relationship, control the adaptive experience, and use AI agents to create content, Graspful is the better fit.

### Graspful vs Udemy

Udemy is the largest open marketplace for online courses, with 250,000+ courses and aggressive discounting (courses regularly sell for $10-$15 during sales). Udemy takes a significant revenue cut (up to 63% for organic marketplace sales), offers no adaptive learning features, and gives creators limited branding control since everything lives on udemy.com.

Graspful's 70/30 revenue share is more favorable than Udemy's marketplace rates. More importantly, Graspful courses are adaptive -- students get personalized paths, not one-size-fits-all video sequences. And Graspful courses live on your own domain with your own brand, not in a crowded marketplace where you compete with 250,000 other courses on price.

Udemy's advantage is distribution: its marketplace brings learners to you. Graspful requires you to bring your own audience (or build it via the white-label landing page). If you want marketplace discovery and are willing to accept aggressive discounting and limited control, Udemy works. If you want to own the brand, the pricing, and the learning experience, Graspful is the better choice.

---

## When to Choose Graspful

Graspful is the right choice when:

- **You want AI agents to create your courses.** No other platform exposes course creation as MCP tools and CLI commands. If your workflow involves Claude Code, Cursor, Codex, or any AI agent, Graspful is the only platform they can operate natively.

- **Adaptive learning matters for your domain.** Certification prep, professional training, technical skills -- any domain where "skip what you know, focus on what you don't" produces measurably better outcomes. Graspful's BKT mastery model, diagnostic assessments, and FIRe spaced repetition deliver genuine adaptive learning, not a marketing checkbox.

- **You want to own the brand and the learner relationship.** White-label with custom domains, your own pricing, your own landing page. Learners see your brand, not Graspful's.

- **You don't want to pay before you earn.** The 70/30 revenue share means zero upfront cost. No $39-$665/month platform fees while you're building.

- **Course quality is non-negotiable.** 10 automated mechanical checks, DAG validation, question deduplication, and difficulty staircase verification catch structural problems before they reach learners. No other platform does this.

---

## When Graspful Might Not Be the Right Fit

Graspful is not the right choice for every situation:

- **Video-first courses.** If your course is primarily pre-recorded video lectures with minimal assessment, Teachable or Kajabi have better video hosting, playback, and completion tracking. Graspful is optimized for knowledge-graph-based instruction and active practice, not passive video consumption.

- **You need a built-in learner marketplace.** Graspful doesn't operate a marketplace like Udemy or Coursera where learners browse and discover courses. You need to bring your own audience via SEO, marketing, or an existing community. Graspful provides the white-label landing page and the learning engine, not the distribution.

- **All-in-one marketing stack.** If you need email automation, affiliate programs, sales funnels, and community features bundled with your course platform, Kajabi's all-in-one approach may save you from integrating multiple tools. Graspful is focused on adaptive learning and agent-first creation, not marketing automation.

- **Non-technical creators who prefer a GUI.** Graspful's primary interface is MCP/CLI. While the YAML format is human-readable and the CLI is straightforward, creators who are uncomfortable with terminals and text files may prefer the drag-and-drop UIs of traditional platforms. (That said, the intended workflow is that an AI agent handles the YAML -- you just describe what to teach.)

- **Simple one-off courses with no assessment.** If you're publishing a single informational guide without quizzes, practice problems, or mastery tracking, Graspful's knowledge graph and adaptive engine are over-engineered for your needs. A simpler tool would suffice.
