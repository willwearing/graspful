import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { KnowledgeGraph } from "@/components/app/knowledge-graph";
import type { KnowledgeGraphEdge, KnowledgeGraphNode } from "@graspful/shared";

// Mock @xyflow/react
vi.mock("@xyflow/react", () => ({
  ReactFlow: ({ nodes, edges, children }: any) => (
    <div data-testid="react-flow" data-node-count={nodes?.length} data-edge-count={edges?.length}>
      {children}
    </div>
  ),
  Controls: () => <div data-testid="controls" />,
  MiniMap: () => <div data-testid="minimap" />,
  Background: () => <div data-testid="background" />,
  useNodesState: (initial: any) => [initial, vi.fn(), vi.fn()],
  useEdgesState: (initial: any) => [initial, vi.fn(), vi.fn()],
  Position: { Top: "top", Bottom: "bottom", Left: "left", Right: "right" },
  MarkerType: { ArrowClosed: "arrowclosed" },
}));

describe("KnowledgeGraph", () => {
  const concepts: KnowledgeGraphNode[] = [
    { id: "c1", name: "Concept A", masteryState: "mastered" as const },
    { id: "c2", name: "Concept B", masteryState: "in_progress" as const },
    { id: "c3", name: "Concept C", masteryState: "unstarted" as const },
    { id: "c4", name: "Concept D", masteryState: "needs_review" as const },
  ];

  const edges: KnowledgeGraphEdge[] = [
    { sourceConceptId: "c1", targetConceptId: "c2" },
    { sourceConceptId: "c2", targetConceptId: "c3" },
    { sourceConceptId: "c1", targetConceptId: "c4" },
  ];

  it("renders the graph container", () => {
    render(<KnowledgeGraph concepts={concepts} edges={edges} />);
    expect(screen.getByTestId("react-flow")).toBeTruthy();
  });

  it("creates correct number of nodes", () => {
    render(<KnowledgeGraph concepts={concepts} edges={edges} />);
    const flow = screen.getByTestId("react-flow");
    expect(flow.getAttribute("data-node-count")).toBe("4");
  });

  it("creates correct number of edges", () => {
    render(<KnowledgeGraph concepts={concepts} edges={edges} />);
    const flow = screen.getByTestId("react-flow");
    expect(flow.getAttribute("data-edge-count")).toBe("3");
  });

  it("renders legend with mastery states", () => {
    render(<KnowledgeGraph concepts={concepts} edges={edges} />);
    expect(screen.getByText(/mastered/i)).toBeTruthy();
    expect(screen.getByText(/in progress/i)).toBeTruthy();
    expect(screen.getByText(/unstarted/i)).toBeTruthy();
    expect(screen.getByText(/needs review/i)).toBeTruthy();
  });
});
