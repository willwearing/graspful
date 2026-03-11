"use client";

import { useMemo } from "react";
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  useNodesState,
  useEdgesState,
  Position,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type MasteryState = "unstarted" | "in_progress" | "mastered" | "needs_review";

interface ConceptNode {
  id: string;
  name: string;
  masteryState: MasteryState;
}

interface PrereqEdge {
  sourceConceptId: string;
  targetConceptId: string;
}

interface KnowledgeGraphProps {
  concepts: ConceptNode[];
  edges: PrereqEdge[];
}

const MASTERY_COLORS: Record<MasteryState, string> = {
  mastered: "var(--chart-2, #22c55e)",
  in_progress: "var(--chart-4, #3b82f6)",
  needs_review: "var(--chart-5, #f59e0b)",
  unstarted: "var(--muted, #e5e7eb)",
};

const MASTERY_LABELS: Record<MasteryState, string> = {
  mastered: "Mastered",
  in_progress: "In Progress",
  needs_review: "Needs Review",
  unstarted: "Unstarted",
};

export function KnowledgeGraph({ concepts, edges }: KnowledgeGraphProps) {
  const initialNodes = useMemo(
    () =>
      concepts.map((c, i) => ({
        id: c.id,
        position: {
          x: (i % 5) * 200 + 50,
          y: Math.floor(i / 5) * 120 + 50,
        },
        data: { label: c.name },
        style: {
          background: MASTERY_COLORS[c.masteryState],
          border: "1px solid var(--border)",
          borderRadius: "8px",
          padding: "8px 12px",
          fontSize: "12px",
          color:
            c.masteryState === "mastered" || c.masteryState === "in_progress"
              ? "#fff"
              : "var(--foreground)",
          minWidth: "120px",
          textAlign: "center" as const,
        },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      })),
    [concepts],
  );

  const initialEdges = useMemo(
    () =>
      edges.map((e) => ({
        id: `${e.sourceConceptId}-${e.targetConceptId}`,
        source: e.sourceConceptId,
        target: e.targetConceptId,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: "var(--border)" },
      })),
    [edges],
  );

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [flowEdges, , onEdgesChange] = useEdgesState(initialEdges);

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Knowledge Graph</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] rounded-lg border border-border overflow-hidden">
          <ReactFlow
            nodes={nodes}
            edges={flowEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            fitView
            panOnDrag
            zoomOnPinch
            minZoom={0.3}
            maxZoom={2}
          >
            <Controls />
            <MiniMap
              nodeColor={(node: any) => node.style?.background as string ?? "#e5e7eb"}
              maskColor="var(--background)"
            />
            <Background />
          </ReactFlow>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-3">
          {(Object.entries(MASTERY_LABELS) as [MasteryState, string][]).map(
            ([state, label]) => (
              <div key={state} className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: MASTERY_COLORS[state] }}
                />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            ),
          )}
        </div>
      </CardContent>
    </Card>
  );
}
