import type { ComponentType } from "react";
import { AiGeneratedCourseQualityChecklist } from "./posts/ai-generated-course-quality-checklist";
import { TurnDocsIntoACourseWithClaudeCode } from "./posts/turn-docs-into-a-course-with-claude-code";

/** Body component for each blog post, keyed by slug in src/lib/blog/posts.ts. */
export const BLOG_POST_CONTENT: Record<string, ComponentType> = {
  "turn-docs-into-a-course-with-claude-code": TurnDocsIntoACourseWithClaudeCode,
  "ai-generated-course-quality-checklist": AiGeneratedCourseQualityChecklist,
};
