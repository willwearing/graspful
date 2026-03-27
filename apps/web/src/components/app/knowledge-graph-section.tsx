"use client";

import { useState, useEffect } from "react";
import { KnowledgeGraph } from "./knowledge-graph";
import { apiClientFetch } from "@/lib/api-client";
import { useAuthToken } from "@/lib/hooks/use-auth-token";
import type {
  KnowledgeGraphData,
  KnowledgeGraphEdge,
  KnowledgeGraphNode,
  MasteryState,
} from "@graspful/shared";

interface KnowledgeGraphSectionProps {
  orgSlug: string;
  courseId: string;
  academyId?: string;
}

export function KnowledgeGraphSection({
  orgSlug,
  courseId,
  academyId,
}: KnowledgeGraphSectionProps) {
  const token = useAuthToken();
  const [concepts, setConcepts] = useState<KnowledgeGraphNode[] | null>(null);
  const [edges, setEdges] = useState<KnowledgeGraphEdge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    const basePath = academyId
      ? `/orgs/${orgSlug}/academies/${academyId}`
      : `/orgs/${orgSlug}/courses/${courseId}`;

    Promise.all([
      apiClientFetch<KnowledgeGraphData>(`${basePath}/graph`, token),
      academyId
        ? Promise.resolve([] as Array<{ conceptId: string; masteryState: MasteryState }>) // Academy graph endpoint includes mastery
        : apiClientFetch<
            Array<{ conceptId: string; masteryState: MasteryState }>
          >(`${basePath}/mastery`, token).catch(
            () => [] as Array<{ conceptId: string; masteryState: MasteryState }>
          ),
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
            courseId: c.courseId,
            // Academy graph includes masteryState inline; course graph needs overlay
            masteryState: c.masteryState ?? masteryMap.get(c.id) ?? "unstarted",
          }))
        );
        setEdges(graphData.prerequisiteEdges ?? graphData.edges ?? []);
      })
      .catch(() => setConcepts(null))
      .finally(() => setLoading(false));
  }, [orgSlug, courseId, academyId, token]);

  if (loading) {
    return (
      <div className="h-[400px] rounded-lg border border-border flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading knowledge graph...</p>
      </div>
    );
  }

  if (!concepts || concepts.length === 0) return null;

  // Extract unique course IDs for academy-level color legend
  const courseIds = academyId
    ? [...new Set(concepts.map((c) => c.courseId).filter(Boolean))] as string[]
    : undefined;

  return <KnowledgeGraph concepts={concepts} edges={edges} courseIds={courseIds} />;
}
