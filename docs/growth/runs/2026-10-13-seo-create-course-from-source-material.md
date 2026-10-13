# Create course from source material: research brief (2026-10-13)

Question: "How do I turn my existing documents into a course?" (package 3, question 1)

## Evidence
- Keyword volume (SE Ranking, US): "ai course generator from documents", "turn documents into course", "course from pdf" all return 0 related keywords. Broad seed "ai course generator" shows "course ai" 6,600, "create a course" 390, "course builder" 320. None mention documents.
- Search Console: no graspful.ai query mentions documents, notes, or PDFs in the last 90 days.
- Google top 10 ("turn documents into an online course with AI"): Canva, Coursebox, LearningStudioAI, MiniCourseGenerator, Coassemble, SlidesPeak, Articulate, two YouTube tutorials, r/instructionaldesign. Format: upload-a-PDF tool pages. PAA: "Is there an AI that I can upload documents to?", "Can ChatGPT create a course?".
- Product truth: Graspful has no upload-a-document flow. The agent reads your sources and writes course YAML; `graspful create course --source` and the MCP scaffold `sourceDocument` record the reference, and review checks gate publishing.

## Verdict
Defer. No measured volume, and the SERP wants an upload tool we don't ship. Revisit if Search Console shows document or notes queries, or if 2+ signals repeat the phrasing.

## Today's experiment instead
exp-005: /agents title "AI Agents" -> "Build Adaptive Courses with AI Agents via MCP" (matches the H1; page ranks pos 5.5 with 0 clicks).
