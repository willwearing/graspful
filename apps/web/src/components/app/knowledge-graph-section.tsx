"use client";

import { useState, useEffect } from "react";
import { KnowledgeGraph } from "./knowledge-graph";
import { apiClientFetch } from "@/lib/api-client";
import { useAuthToken } from "@/lib/hooks/use-auth-token";

interface KnowledgeGraphSectionProps {
  orgId: string;
  courseId: string;
}

interface GraphData {
  concepts: Array<{
    id: string;
    name: string;
    masteryState: "unstarted" | "in_progress" | "mastered" | "needs_review";
  }>;
  edges: Array<{
    sourceConceptId: string;
    targetConceptId: string;
  }>;
}

export function KnowledgeGraphSection({
  orgId,
  courseId,
}: KnowledgeGraphSectionProps) {
  const token = useAuthToken();
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    apiClientFetch<GraphData>(
      `/orgs/${orgId}/courses/${courseId}/graph`,
      token
    )
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [orgId, courseId, token]);

  if (loading) {
    return (
      <div className="h-[400px] rounded-lg border border-border flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading knowledge graph...</p>
      </div>
    );
  }

  if (!data || data.concepts.length === 0) return null;

  return <KnowledgeGraph concepts={data.concepts} edges={data.edges} />;
}
