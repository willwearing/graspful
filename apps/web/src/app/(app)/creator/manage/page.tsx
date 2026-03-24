"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Download, Upload, Bot } from "lucide-react";
import { useBrand } from "@/lib/brand/context";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { apiClientFetch } from "@/lib/api-client";
import { YamlEditor } from "@/components/creator/yaml-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const BRAND_CONFIG_TEMPLATE = `# Brand Configuration
# See docs: https://docs.graspful.com/brand-config

name: "My Course Brand"
slug: "my-course-brand"       # URL-safe, unique
tagline: "Learn X — the smart way"

# Domain (assigned after publish)
# domain: "my-course-brand.graspful.com"

# Theme colors (HSL values)
theme:
  primary: "217 91% 60%"
  secondary: "45 93% 47%"
  accent: "217 91% 95%"
  background: "0 0% 100%"
  foreground: "222 47% 11%"
  radius: "0.5rem"

# Landing page
landing:
  hero:
    headline: "TODO: Your headline here"
    subheadline: "TODO: Describe what learners will master"
    ctaText: "Start Learning Free"

# Pricing (70/30 revenue share)
pricing:
  monthly: 14.99
  yearly: 149
  currency: "USD"
  trialDays: 7

# SEO
seo:
  title: "TODO: Page title"
  description: "TODO: Meta description"
  keywords:
    - "TODO"
`;

const COURSE_CONTENT_TEMPLATE = `# Course Content
# See docs: https://docs.graspful.com/course-yaml

name: "My Course"
slug: "my-course"
description: "TODO: What this course teaches"

sections:
  - name: "Getting Started"
    slug: "getting-started"
    order: 1
    concepts:
      - name: "Introduction"
        slug: "introduction"
        order: 1
        explanation: "TODO: Explain this concept clearly"
        knowledgePoints:
          - id: "kp-intro-1"
            statement: "TODO: A specific fact the learner should know"
        problems:
          - type: "multiple_choice"
            stem: "TODO: Write a question"
            options:
              - text: "Correct answer"
                correct: true
              - text: "Wrong answer 1"
                correct: false
              - text: "Wrong answer 2"
                correct: false
              - text: "Wrong answer 3"
                correct: false
            knowledgePointIds:
              - "kp-intro-1"
`;

export default function NewCoursePage() {
  const brand = useBrand();
  const router = useRouter();
  const [brandConfig, setBrandConfig] = useState(BRAND_CONFIG_TEMPLATE);
  const [courseContent, setCourseContent] = useState(COURSE_CONTENT_TEMPLATE);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string>("");

  useEffect(() => {
    async function getToken() {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      setToken(data.session?.access_token ?? "");
    }
    getToken();
  }, []);

  async function handleImport() {
    setImporting(true);
    setError(null);
    try {
      const result = await apiClientFetch<{ courseId: string }>(
        `/orgs/${brand.orgSlug}/courses/import`,
        token,
        {
          method: "POST",
          body: JSON.stringify({ yaml: courseContent }),
        }
      );
      router.push(`/creator/manage/${result.courseId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  function handleDownload() {
    const blob = new Blob(
      [
        `# === Brand Config ===\n${brandConfig}\n\n# === Course Content ===\n${courseContent}`,
      ],
      { type: "text/yaml" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "course.yaml";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">New Course</h1>
        <p className="text-muted-foreground mt-1">
          Define your brand and course content as YAML, then import to the platform.
        </p>
      </div>

      <YamlEditor
        brandConfig={brandConfig}
        courseContent={courseContent}
        onBrandConfigChange={setBrandConfig}
        onCourseContentChange={setCourseContent}
      />

      {error && (
        <div className="mt-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="mt-6 flex items-center gap-3">
        <Button onClick={handleImport} disabled={importing}>
          <Upload className="h-4 w-4" />
          {importing ? "Importing..." : "Import to Platform"}
        </Button>
        <Button variant="outline" onClick={handleDownload}>
          <Download className="h-4 w-4" />
          Download YAML
        </Button>
      </div>

      {/* Agent callout */}
      <Card className="mt-8 bg-muted/50">
        <CardContent className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground mb-1">Prefer using AI?</p>
            <p className="text-sm text-muted-foreground">
              Use the Graspful CLI or MCP server to create courses with Claude,
              Codex, Cursor, or any AI agent. Agents generate the YAML for you.
            </p>
            <pre className="mt-3 rounded-lg bg-background p-3 text-xs text-foreground font-mono overflow-x-auto">
{`npx @graspful/cli init
npx @graspful/cli import course.yaml`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
