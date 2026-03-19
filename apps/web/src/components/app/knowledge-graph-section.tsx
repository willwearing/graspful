"use client";

import { useState, useEffect } from "react";
import { KnowledgeGraph } from "./knowledge-graph";
import { apiClientFetch } from "@/lib/api-client";
import { useAuthToken } from "@/lib/hooks/use-auth-token";

interface KnowledgeGraphSectionProps {
  orgSlug: string;
  courseId: string;
}

type MasteryState = "unstarted" | "in_progress" | "mastered" | "needs_review";

interface RawGraphData {
  concepts: Array<{ id: string; name: string }>;
  edges?: Array<{ sourceConceptId: string; targetConceptId: string }>;
  prerequisiteEdges?: Array<{ sourceConceptId: string; targetConceptId: string }>;
}

interface ConceptState {
  conceptId: string;
  masteryState: MasteryState;
}

export function KnowledgeGraphSection({
  orgSlug,
  courseId,
}: KnowledgeGraphSectionProps) {
  const token = useAuthToken();
  const [concepts, setConcepts] = useState<Array<{ id: string; name: string; masteryState: MasteryState }> | null>(null);
  const [edges, setEdges] = useState<Array<{ sourceConceptId: string; targetConceptId: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    const basePath = `/orgs/${orgSlug}/courses/${courseId}`;

    Promise.all([
      apiClientFetch<RawGraphData>(`${basePath}/graph`, token),
      apiClientFetch<ConceptState[]>(`${basePath}/mastery`, token).catch(() => [] as ConceptState[]),
    ])
      .then(([graphData, masteryData]) => {
        const masteryMap = new Map<string, MasteryState>();
        for (const s of masteryData) {
          masteryMap.set(s.conceptId, s.masteryState);
        }

        setConcepts(
          graphData.concepts.map((c) => ({
            id: c.id,
            name: c.name,
            masteryState: masteryMap.get(c.id) ?? "unstarted",
          }))
        );
        setEdges(graphData.edges ?? graphData.prerequisiteEdges ?? []);
      })
      .catch(() => setConcepts(null))
      .finally(() => setLoading(false));
  }, [orgSlug, courseId, token]);

  if (loading) {
    return (
      <div className="h-[400px] rounded-lg border border-border flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading knowledge graph...</p>
      </div>
    );
  }

  if (!concepts || concepts.length === 0) return null;

  return <KnowledgeGraph concepts={concepts} edges={edges} />;
}
