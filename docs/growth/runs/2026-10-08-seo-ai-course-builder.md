# SEO run: AI course builder (existing page)

Date: October 8, 2026
Page: https://graspful.ai/ai-course-builder
Verdict: **Improve.** The page already gets impressions for the head term, so sharpen the title and first answer for agent users and add the one piece of proof the top results all show: a real lesson.
Cost: $0.0114 of Treg credit (balance $0.9886 after the run).

## The question

"Is there an AI course builder that works with the agent I already use (Claude Code, Codex, Cursor) and my own documents?"

The head term "ai course builder" is dominated by no-code web generators. Graspful can't win that crowd by copying them. The creator Graspful serves asks the agent-flavoured version. Autocomplete shows that intent exists: "ai course builder github", "ai course builder project github", "ai course generator from documents".

## Raw findings

### 1. Keyword data

- AnyAPI autocomplete ($0.002, 2 calls), suggestions for "ai course builder": free, project, github, project github, app, curriculum builder. For "ai course generator from documents": free, and notes, for teachers.
- SE Ranking related keywords ($0.0018), US volume: "course ai" 6,600 (KD 69), "course builder" 320 (KD 36, CPC $11.05), "build a course" 320, "free online course creator" 320, "course creators" 390 (KD 19). No volume row came back for the exact seed "ai course builder".

### 2. Our site (Search Console, Sep 9 to Oct 6)

- `/ai-course-builder`: 29 impressions, 0 clicks, avg position 22.8. It's the top page by impressions on the site.
- No matching query has enough impressions to show by name. The 90-day queries are mostly brand ("grasp mcp", "grasp-mcp login") plus "build adaptive courses" (14 impressions, position 51.6).
- Existing page means improve, not create.

### 3. Google top 10 for "ai course builder" (Serper, $0.001)

| # | Result | Format | Promise | Leaves out |
|---|---|---|---|---|
| 1 | coursebox.ai | SaaS home | Idea or document to course, free | Agent workflow, review of facts |
| 2 | courseai.com | SaaS home | Topic to sellable course in about 2 minutes | Source fidelity, practice depth |
| 3 | reddit r/elearning | Thread | Practitioner opinions | No product answer |
| 4 | mitti.com | Listicle | 10 free generators | Hands-on proof |
| 5 | canva.com | Feature page | Generate courses free | Practice and review |
| 6 | minicoursegenerator.com | SaaS home | Interactive mini-courses | Agent and docs workflow |
| 7 | YouTube | Video roundup | 5 best tools | Anything reproducible |
| 8 | coassemble.com | Blog | Free courses in minutes | Same |
| 9 | learningstudioai.com | SaaS home | SCORM, quizzes, analytics | Agent workflow |
| 10 | coursera.org/campus/course-builder | Product page | Faculty use partner content | Your own material |

People also ask: "Is there an AI that can create a course for me?", "Can ChatGPT create a course?", "How to make your own AI course?"

Second query, "ai course builder from documents with claude code" (Serper, $0.001): no product page answers it. Results are Claude tutorials, a Reddit post about an open-source Claude Code course builder, and a Claude Code "course generator" skill on mcpmarket.com. That's the gap.

### 4. ChatGPT answers (cloro, $0.0056, 2 calls)

- "What is the best AI course builder?" ChatGPT picks Coursebox first, then Articulate Rise, Mindsmith, Heights, Circle, Synthesia, and iSpring. It cites listicles (ddiy.co, stigstack.com, toolbriefing.com, paradisosolutions.com, circle.so, storyflow.so). Graspful isn't cited.
- "How can I use Claude Code or Cursor to turn my own documents into an online course with practice questions?" ChatGPT says yes, then tells the reader to build their own "course factory": source folder, CLAUDE.md rules, lessons, question JSON, and a site to host it. It cites only Anthropic and Cursor docs. It names no product, and Graspful isn't cited.

The second answer describes Graspful's workflow without knowing Graspful exists. The page has to state this plainly and show proof, so an answer engine can match the question to us.

## Decision

Improve `/ai-course-builder`. Don't create a new URL. The agent-and-documents variant belongs on this pillar until it has its own query data. `/create-course-from-source-material` stays in the backlog.

## Brief

The page must:

1. Name the agents in the title and first answer. Title: "AI Course Builder for Claude Code, Codex, and Cursor". The first paragraph answers "already using an agent? point it at your docs".
2. Show a real lesson question on the page. Reuse the homepage `LessonPreview` (SQL example from the repo) with the link to the public YAML.
3. Answer the PAA question "Can ChatGPT create a course?" truthfully: models draft content, while Graspful adds the format, checks, and learner practice with review.
4. Say who it's not for (a one-line prompt in a web app). That's honest, and it filters out unqualified traffic.
5. Keep the next step on the quickstart. Link to the page from the course creation guide.

What winners miss and Graspful can show: a reproducible workflow inside the reader's own agent, on their own source material, with checks before publishing.

Out of scope this run: preview interaction tracking (plan package 1, still open), and a full source-to-course example (package 2).

## Six-week check

Check date: six weeks after merge. Watch impressions and position for `/ai-course-builder`, clicks, and `seo_pillar_*` CTA clicks.
