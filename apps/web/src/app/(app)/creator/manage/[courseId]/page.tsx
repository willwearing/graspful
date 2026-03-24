"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Download, Save, Bot, Loader2 } from "lucide-react";
import { useBrand } from "@/lib/brand/context";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { apiClientFetch } from "@/lib/api-client";
import { YamlEditor } from "@/components/creator/yaml-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function EditCoursePage() {
  const brand = useBrand();
  const params = useParams<{ courseId: string }>();
  const courseId = params.courseId;

  const [brandConfig, setBrandConfig] = useState("");
  const [courseContent, setCourseContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [token, setToken] = useState<string>("");

  useEffect(() => {
    async function loadCourse() {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token ?? "";
      setToken(accessToken);

      try {
        const yaml = await apiClientFetch<{ yaml: string }>(
          `/orgs/${brand.orgSlug}/courses/${courseId}/yaml`,
          accessToken
        );
        setCourseContent(yaml.yaml);
        setBrandConfig(""); // Brand config loaded separately in a future enhancement
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load course");
      } finally {
        setLoading(false);
      }
    }
    loadCourse();
  }, [brand.orgSlug, courseId]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await apiClientFetch(
        `/orgs/${brand.orgSlug}/courses/import`,
        token,
        {
          method: "POST",
          body: JSON.stringify({
            yaml: courseContent,
          }),
        }
      );
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
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
    a.download = `course-${courseId}.yaml`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-5 w-80 mb-8" />
        <Skeleton className="h-[500px] w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Edit Course</h1>
        <p className="text-muted-foreground mt-1">
          Modify the brand config or course content, then save changes.
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

      {success && (
        <div className="mt-4 rounded-lg border border-primary/50 bg-primary/10 px-4 py-3 text-sm text-primary">
          Changes saved successfully.
        </div>
      )}

      <div className="mt-6 flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? "Saving..." : "Save Changes"}
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
              Use the Graspful CLI or MCP server to edit courses with Claude,
              Codex, Cursor, or any AI agent.
            </p>
            <pre className="mt-3 rounded-lg bg-background p-3 text-xs text-foreground font-mono overflow-x-auto">
{`npx @graspful/cli import course.yaml --course-id ${courseId}`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
