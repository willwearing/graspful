# Graspful — Go-to-Market Plan

> Last updated: March 29, 2026
> Based on Minimalist Entrepreneur framework (validate, community, first customers, marketing)

---

## The Business

**What:** Adaptive learning platform (CLI + white-label SaaS). Two YAML files in (course + brand), live course product out — with Bayesian Knowledge Tracing, spaced repetition (FIRe algorithm), mastery-based progression, and Stripe billing.

**Model:** Teachable model. Creators bring their own audience. Graspful handles infrastructure, adaptive learning, commerce. Creators keep revenue minus platform fee.

**Target community:** Certification prep authors — people who create study materials for AWS, CKA, CompTIA, PMP, Cisco, etc.

**Current state:** Product built and published on npm (@graspful/cli). Docs site at graspful.ai. Zero paying customers.

---

## Phase 0: Dogfood (Weeks 1-4)

The product exists. Demand is unproven. Dogfooding comes first.

- [ ] Finish PostHog TAM course on Graspful
- [ ] Sign up as new user (human flow)
- [ ] Sign up as new user (agent flow)
- [ ] Create a course as human
- [ ] Create a course as agent
- [ ] Test both flows end-to-end (learner experience, spaced repetition, mastery gates)
- [ ] Measure: completion rate, spaced rep engagement, learner comeback rate

**No outreach until this is done.** This is the proof. Without it, you're selling a platform with zero evidence it works for learners.

---

## Validation Summary

### Why Cert Prep

- Binary outcome (pass/fail) — adaptive learning has obvious, measurable ROI
- "Just ask ChatGPT" doesn't work when you need structured mastery of an exam blueprint
- People already pay $50-$400/mo for inferior platforms (Teachable, Thinkific)
- Learners are desperate for tools that focus on their weak areas

### Green Flags

- People already paying for inferior solutions (Teachable has no adaptive learning)
- Agent-first workflow is genuinely differentiated — no competitor offers `npx @graspful/cli create course`
- White-label + revenue share = zero risk for creators
- The tech works — CLI, MCP server, quality gate, e2e tests

### Risks to Watch

- Two-sided market: need creators AND learners. Mitigated by Teachable model (creators bring audience)
- "Agent-first" may attract devs, not course creators. The actual target (cert prep SMEs) may need a simpler onboarding path
- Adaptive learning is invisible to buyers — learners buy based on topic and instructor, not algorithms
- No demand signal yet

### Verdict

**Needs validation through selling, not more building.** Dogfood first, then sell retroactively.

---

## Community: Certification Prep Authors

### Why This Community

- Cert prep is where adaptive learning has the clearest, most measurable ROI
- More niche than "course creators" — easier to dominate
- Less vulnerable to "just use AI" objection — you actually need to pass to get the cert
- Measurable outcome: pass rates. If Graspful improves pass rates, the marketing story writes itself

### Where They Gather

| Channel | Notes |
|---------|-------|
| r/AWSCertifications (~100k+) | Study resources welcome. Post as helpful resource |
| r/CompTIA (~150k+) | Same — "free adaptive quiz" format works |
| r/kubernetes (~200k+) | CKA/CKAD content angle |
| r/ccna (~100k+) | Cisco cert prep |
| r/cissp (~50k+) | Security cert — desperate for good tools |
| r/WGU (~100k+) | WGU students grind certs constantly. Underrated |
| r/ITCareerQuestions (~300k+) | Tolerates helpful resources |
| r/cybersecurity (~500k+) | Cert prep angle works here |
| Udemy instructor community | Top cert prep instructors frustrated with 63% rev share |
| YouTube cert prep creators | Mid-tier (5k-50k subs) — big enough to have audience, small enough to respond |
| LinkedIn cert prep influencers | Heavy cert promotion culture |
| CNCF Slack, AWS community Slack | Study group organizers are potential creators |
| Gumroad/Podia cert prep sellers | Solo creators already selling digital products |
| Conference workshop leaders | KubeCon, re:Invent cert prep workshops |

### How to Enter

Don't lead with Graspful. Lead with your course. Build a CKA or AWS course yourself — that makes you a genuine member. Share the process publicly. The credibility comes from being a practitioner, not a vendor.

---

## First Customers Strategy

### Circle 1: Friends & Network (Creators 1-5)

After dogfood course is live, pitch with:

> "I built a CKA prep course that uses adaptive learning (spaced repetition, mastery gates). Students only move forward when they've actually mastered each topic. Early results: [X% completion, Y engagement]. I'm looking for cert prep creators who want to try this approach with their own content. Would you be open to a 15-min call?"

**Free for the first 5.** You're buying data and testimonials, not revenue.

People to pitch:
- PostHog colleagues who've created courses/workshops/tutorials
- Dev friends who teach on Udemy or YouTube
- Contacts studying for certs right now (they know what's broken)
- PostHog customers who do internal training
- Anyone who's built a "learning" side project

### Circle 2: Cert Prep Community (Creators 6-20)

Research and reach out to:
1. Top Udemy cert prep instructors (frustrated with 63% rev share on organic)
2. YouTube cert prep creators (5k-50k subs sweet spot)
3. r/AWSCertifications contributors who post study guides
4. Gumroad/Podia cert prep sellers
5. Training company founders (2-10 person shops doing cloud cert training)
6. Conference workshop leaders
7. Discord/Slack study group organizers

**Approach:** Don't lead with Graspful. Show them your course with real data.

> "Hey — I built a CKA prep course that uses adaptive learning. Early results: [metrics]. I'm looking for cert prep creators who want to try this with their own content. Would you be open to a 15-min look? Happy to rebuild one section of your course as a demo."

### Circle 3: Cold Outreach (Creators 20-100)

Only start after 3-5 creators are live with real data.

**Template (personalize every one):**

> Subject: Your [cert name] course + adaptive learning
>
> Hi [name],
>
> I took your [course name] on [platform]. [Specific genuine compliment.]
>
> One thing I noticed: the practice questions don't adapt to what I already know. I spent 30 minutes on topics I'd already mastered.
>
> I built Graspful — it turns cert prep content into adaptive courses with spaced repetition and mastery gates. [Creator name] is using it for their [cert] course and seeing [specific metric].
>
> Two YAML files, and your content becomes a live branded course product with Stripe billing. You keep the revenue.
>
> Worth a 15-min look? Happy to rebuild one section of your course as a demo.
>
> Will

### Pricing

**First 20 creators:** $0/mo + 10% of learner revenue. Zero risk for them. Aligns incentives.

**After 20 (with proven data):**

| Tier | Price | Rev Share | Includes |
|------|-------|-----------|----------|
| Free | $0/mo | 15% | 1 course, Graspful branding |
| Pro | $49/mo | 8% | Unlimited courses, white-label |
| Business | $149/mo | 5% | Custom domain, team seats, priority support |

### Sales Cadence

| Phase | Weeks | Outreach/week | Goal |
|-------|-------|---------------|------|
| 0: Dogfood | 1-4 | 0 | Ship own course, get learner data |
| 1: Friends | 5-8 | 5 messages | 3 creators signed up, 1 course live |
| 2: Community | 9-16 | 10 messages | 10 creators, 5 courses live |
| 3: Cold | 17-30 | 15 messages | 50 creators |

**Track in a spreadsheet:**

| Name | Platform | Cert | Contacted | Responded | Call | Signed Up | Course Live | Learner Revenue |
|------|----------|------|-----------|-----------|------|-----------|-------------|-----------------|

---

## Marketing Plan

### Platforms

**Reddit** — launch vehicle. Where cert prep students and devs live.
**Twitter/X** — build-in-public home base. Compounds over time.

### Weekly Schedule (3-4 hours/week max)

| Day | Activity | Time |
|-----|----------|------|
| Monday | One build-in-public tweet | 20 min |
| Wednesday | Post or comment in one cert prep subreddit | 30 min |
| Friday | Post in one dev/side-project subreddit OR short blog post | 45 min |
| Weekend | Reply to comments, DMs, threads | 30 min |

### Reddit Launch Sequence

**Wave 1 — Dev/builder communities (after dogfood, Day 1-3):**

| Subreddit | Post angle |
|-----------|-----------|
| r/SideProject | "I built a CLI that turns YAML into adaptive learning courses" |
| r/microsaas | "Building an adaptive Teachable for cert prep" |
| r/commandline | GIF of the CLI workflow |
| r/SaaS | "Launched my SaaS" — include stack, pricing, goals |

**Wave 2 — AI communities (Day 4-7):**

| Subreddit | Post angle |
|-----------|-----------|
| r/ClaudeAI | "Built an MCP server that lets Claude create full cert prep courses" |
| r/artificial | "Agent-first course creation: two YAMLs to a live adaptive course" |

**Wave 3 — Target users (Day 8-14):**

| Subreddit | Post angle |
|-----------|-----------|
| r/AWSCertifications | "Free adaptive quiz: test your SAA-C03 knowledge with spaced repetition" |
| r/CompTIA | Same format, different cert |
| r/Anki | "What if Anki had mastery gates and a knowledge graph?" |
| r/WGU | Cert grinders — share as study resource |

**Wave 4 — Niche (when content ready):**

| Subreddit | Post angle |
|-----------|-----------|
| r/hunting / Alberta hunting subs | Niche course topic |
| r/kubernetes | CKA prep resource |

**Between waves:** Respond to every comment. Answer questions. Take feedback. Post follow-ups.

### Twitter Launch Tweet

> @_MathAcademy_ is sick. building something to see if the learning model it advocates for can be generalized to any subject: https://graspful.ai/

### Content Ideas

**Educate:**
1. "How spaced repetition actually works (and why most course platforms ignore it)" — r/Anki, r/GetStudying
2. "What a knowledge graph looks like for CKA prep" — show the YAML + visual diagram — r/kubernetes
3. "Why cert prep courses have 5-15% completion rates" — problem statement, don't mention Graspful until end — r/AWSCertifications
4. "I built a CLI that generates cert prep courses from YAML" — terminal GIF — r/commandline
5. "The two-YAML architecture: knowledge graph to live course product" — technical breakdown — r/webdev

**Inspire:**
1. "I'm a TAM by day, building an adaptive learning platform by night" — the honest origin story — r/indiehackers
2. "Week 1 of dogfooding my own course platform — here's what broke" — Twitter thread
3. "I taught myself spaced repetition algorithms to build better cert prep" — the learning journey
4. "From 0 to live course in a weekend: the dogfood diary" — screenshots, terminal, mistakes
5. "Why I chose cert prep over 'online courses' as my niche" — strategic thinking — r/microsaas

**Entertain (save for later):**
1. Side-by-side video: Udemy studying vs. adaptive learning — 30 seconds
2. "I asked Claude to build a CKA prep course in 4 minutes" — screen recording of agent workflow — r/ClaudeAI
3. "The cert prep completion rate iceberg" — meme format
4. Screenshot meme: quality gate rejecting a course publish
5. Hot take thread with real learner data (once you have it)

### Email List

**Don't build yet.** Start when you have 3+ Reddit posts with >20 upvotes and people asking "how do I try this?"

**Lead magnet:** Free adaptive quiz for one popular cert (AWS SAA or CompTIA Security+). 20-30 adaptive questions demonstrating mastery gating and spaced repetition. At the end: "Want more? Leave your email."

**Collect:** Simple form on graspful.ai. One line: "Get early access to adaptive cert prep."

**Send:** Monthly update with real data. Learner outcomes, new certs, platform improvements. Kill it if you don't have anything worth saying.

### Paid Advertising

**Not now. Not for months.**

Consider only when:
- 10+ creators on platform with live courses
- You can calculate customer lifetime value
- You know which message converts (from organic post performance)
- Landing page has social proof (testimonials, learner outcome data)

When ready:
- Reddit ads targeting cert prep subreddits ($5-10/day)
- Google Search ads for "AWS certification prep tool" ($10-20/day)
- Don't touch Facebook/Instagram — buyers aren't there

---

## Execution Checklist

### Weeks 1-4: Dogfood
- [ ] Finish PostHog TAM course
- [ ] Test human signup + course creation flow
- [ ] Test agent signup + course creation flow
- [ ] Get real learners through the course
- [ ] Collect metrics: completion rate, spaced rep engagement, comeback rate

### Week 5: Launch Tweet + Wave 1
- [ ] Post MathAcademy tweet on Twitter/X
- [ ] Post on r/SideProject
- [ ] Post on r/microsaas
- [ ] Post CLI GIF on r/commandline

### Week 6: Wave 2
- [ ] Post on r/ClaudeAI (MCP server angle)
- [ ] Post on r/artificial
- [ ] First build-in-public Twitter thread

### Weeks 7-8: Wave 3
- [ ] Create free adaptive quiz for one cert
- [ ] Post on r/AWSCertifications
- [ ] Post on r/CompTIA
- [ ] Post on r/Anki
- [ ] Post on r/WGU

### Weeks 9+: Ongoing
- [ ] Weekly: 1 tweet + 1 Reddit post + respond to everything
- [ ] Start Circle 1 outreach to friends/network
- [ ] Begin Circle 2 outreach to cert prep creators
- [ ] Track everything in spreadsheet
