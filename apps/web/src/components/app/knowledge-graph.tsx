"use client";

import { useMemo } from "react";
import {
  ReactFlow,
  Background,
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
  courseId?: string;
}

interface PrereqEdge {
  sourceConceptId: string;
  targetConceptId: string;
}

interface KnowledgeGraphProps {
  concepts: ConceptNode[];
  edges: PrereqEdge[];
  courseIds?: string[];
}

const MASTERY_COLORS: Record<MasteryState, string> = {
  mastered: "#91e2af",
  in_progress: "#facf85",
  needs_review: "#f7a2a2",
  unstarted: "#cdd1d7",
};

const MASTERY_LABELS: Record<MasteryState, string> = {
  mastered: "Mastered",
  in_progress: "In Progress",
  needs_review: "Needs Review",
  unstarted: "Unstarted",
};

// Course-level border colors for academy view
const COURSE_BORDER_COLORS = [
  "#6366f1", // indigo
  "#f59e0b", // amber
  "#10b981", // emerald
  "#ef4444", // red
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#f97316", // orange
  "#ec4899", // pink
];

const NODE_WIDTH = 150;
const NODE_HEIGHT = 50;
const HORIZONTAL_GAP = 40;
const VERTICAL_GAP = 80;

function computeHierarchicalLayout(
  concepts: ConceptNode[],
  edges: PrereqEdge[]
): { id: string; x: number; y: number }[] {
  const ids = new Set(concepts.map((c) => c.id));

  const children = new Map<string, string[]>();
  const parents = new Map<string, string[]>();
  for (const id of ids) {
    children.set(id, []);
    parents.set(id, []);
  }
  for (const e of edges) {
    if (!ids.has(e.sourceConceptId) || !ids.has(e.targetConceptId)) continue;
    children.get(e.sourceConceptId)!.push(e.targetConceptId);
    parents.get(e.targetConceptId)!.push(e.sourceConceptId);
  }

  const layer = new Map<string, number>();
  const visited = new Set<string>();

  function assignLayer(id: string): number {
    if (layer.has(id)) return layer.get(id)!;
    if (visited.has(id)) return 0;
    visited.add(id);

    const pars = parents.get(id) ?? [];
    const myLayer =
      pars.length === 0 ? 0 : 1 + Math.max(...pars.map(assignLayer));
    layer.set(id, myLayer);
    return myLayer;
  }

  for (const id of ids) assignLayer(id);

  const layers = new Map<number, string[]>();
  for (const [id, l] of layer) {
    if (!layers.has(l)) layers.set(l, []);
    layers.get(l)!.push(id);
  }

  const sortedLayerKeys = [...layers.keys()].sort((a, b) => a - b);
  const maxLayer = sortedLayerKeys[sortedLayerKeys.length - 1] ?? 0;

  const maxNodesInLayer = Math.max(
    ...sortedLayerKeys.map((k) => layers.get(k)!.length)
  );
  const totalWidth = maxNodesInLayer * (NODE_WIDTH + HORIZONTAL_GAP);

  const positions: { id: string; x: number; y: number }[] = [];

  for (const layerKey of sortedLayerKeys) {
    const nodesInLayer = layers.get(layerKey)!;
    const layerWidth =
      nodesInLayer.length * (NODE_WIDTH + HORIZONTAL_GAP) - HORIZONTAL_GAP;
    const startX = (totalWidth - layerWidth) / 2;

    for (let i = 0; i < nodesInLayer.length; i++) {
      positions.push({
        id: nodesInLayer[i],
        x: startX + i * (NODE_WIDTH + HORIZONTAL_GAP),
        y: (maxLayer - layerKey) * (NODE_HEIGHT + VERTICAL_GAP),
      });
    }
  }

  return positions;
}

export function KnowledgeGraph({ concepts, edges, courseIds }: KnowledgeGraphProps) {
  const safeEdges = edges ?? [];

  // Build course color map for academy view
  const courseColorMap = useMemo(() => {
    if (!courseIds || courseIds.length <= 1) return null;
    const map = new Map<string, string>();
    courseIds.forEach((id, i) => {
      map.set(id, COURSE_BORDER_COLORS[i % COURSE_BORDER_COLORS.length]);
    });
    return map;
  }, [courseIds]);

  const initialNodes = useMemo(() => {
    const positions = computeHierarchicalLayout(concepts, safeEdges);
    const posMap = new Map(positions.map((p) => [p.id, { x: p.x, y: p.y }]));

    return concepts.map((c, i) => {
      const pos = posMap.get(c.id) ?? {
        x: (i % 5) * 200,
        y: Math.floor(i / 5) * 120,
      };
      const borderColor = courseColorMap && c.courseId
        ? courseColorMap.get(c.courseId) ?? "#e2e8f0"
        : "#e2e8f0";
      return {
        id: c.id,
        position: pos,
        data: { label: c.name },
        draggable: false,
        connectable: false,
        selectable: false,
        style: {
          background: MASTERY_COLORS[c.masteryState],
          border: `2px solid ${borderColor}`,
          borderRadius: "8px",
          padding: "8px 12px",
          fontSize: "12px",
          color: "var(--foreground)",
          minWidth: `${NODE_WIDTH}px`,
          maxWidth: `${NODE_WIDTH}px`,
          textAlign: "center" as const,
        },
        sourcePosition: Position.Top,
        targetPosition: Position.Bottom,
      };
    });
  }, [concepts, safeEdges, courseColorMap]);

  const initialEdges = useMemo(
    () =>
      safeEdges.map((e) => ({
        id: `${e.sourceConceptId}-${e.targetConceptId}`,
        source: e.sourceConceptId,
        target: e.targetConceptId,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: "var(--border)", strokeWidth: 1.5 },
        selectable: false,
      })),
    [safeEdges]
  );

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">
          Knowledge Graph
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[500px] rounded-lg border border-border overflow-hidden">
          <ReactFlow
            nodes={initialNodes}
            edges={initialEdges}
            fitView
            fitViewOptions={{ padding: 0.15 }}
            panOnDrag
            zoomOnPinch
            zoomOnScroll
            minZoom={0.2}
            maxZoom={2}
            nodesDraggable={false}
            nodesConnectable={false}
            nodesFocusable={false}
            edgesFocusable={false}
            elementsSelectable={false}
            proOptions={{ hideAttribution: true }}
          >
            <Background />
          </ReactFlow>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-3">
          {(Object.entries(MASTERY_LABELS) as [MasteryState, string][]).map(
            ([state, label]) => (
              <div key={state} className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full border border-border"
                  style={{ backgroundColor: MASTERY_COLORS[state] }}
                />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            )
          )}
        </div>

        {/* Course color legend for academy view */}
        {courseColorMap && courseIds && courseIds.length > 1 && (
          <div className="flex flex-wrap gap-4 mt-2 pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground font-medium">Courses:</span>
            {courseIds.map((id, i) => (
              <div key={id} className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded border"
                  style={{
                    borderColor: COURSE_BORDER_COLORS[i % COURSE_BORDER_COLORS.length],
                    borderWidth: "2px",
                  }}
                />
                <span className="text-xs text-muted-foreground">
                  Course {i + 1}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
