import { Injectable } from '@nestjs/common';

export interface SimpleEdge {
  source: string;
  target: string;
}

@Injectable()
export class GraphQueryService {
  /**
   * Kahn's algorithm topological sort.
   * Throws if the graph contains a cycle.
   */
  topologicalSort(conceptIds: string[], edges: SimpleEdge[]): string[] {
    const inDegree = new Map<string, number>();
    const adj = new Map<string, string[]>();

    for (const id of conceptIds) {
      inDegree.set(id, 0);
      adj.set(id, []);
    }
    for (const edge of edges) {
      adj.get(edge.source)?.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
    }

    const queue: string[] = [];
    for (const [id, deg] of inDegree) {
      if (deg === 0) queue.push(id);
    }

    const sorted: string[] = [];
    while (queue.length > 0) {
      const node = queue.shift()!;
      sorted.push(node);
      for (const neighbor of adj.get(node) ?? []) {
        const newDeg = (inDegree.get(neighbor) ?? 1) - 1;
        inDegree.set(neighbor, newDeg);
        if (newDeg === 0) queue.push(neighbor);
      }
    }

    if (sorted.length !== conceptIds.length) {
      throw new Error('Graph contains a cycle — topological sort impossible');
    }

    return sorted;
  }

  /**
   * Calculate the knowledge frontier: unmastered concepts whose
   * prerequisites are ALL mastered.
   */
  knowledgeFrontier(
    conceptIds: string[],
    edges: SimpleEdge[],
    masteredIds: Set<string>,
  ): string[] {
    // Build prerequisite map: conceptId -> set of prerequisite concept IDs
    const prereqs = new Map<string, Set<string>>();
    for (const id of conceptIds) {
      prereqs.set(id, new Set());
    }
    for (const edge of edges) {
      prereqs.get(edge.target)?.add(edge.source);
    }

    return conceptIds.filter((id) => {
      if (masteredIds.has(id)) return false;
      const required = prereqs.get(id) ?? new Set();
      for (const req of required) {
        if (!masteredIds.has(req)) return false;
      }
      return true;
    });
  }

  /**
   * Get all ancestors (transitive prerequisites) of a concept.
   * Uses BFS backwards through the prerequisite edges.
   */
  prerequisiteChain(conceptId: string, edges: SimpleEdge[]): string[] {
    // Build reverse adjacency: target -> sources (prerequisites)
    const reverseAdj = new Map<string, string[]>();
    for (const edge of edges) {
      if (!reverseAdj.has(edge.target)) reverseAdj.set(edge.target, []);
      reverseAdj.get(edge.target)!.push(edge.source);
    }

    const visited = new Set<string>();
    const queue = [...(reverseAdj.get(conceptId) ?? [])];

    while (queue.length > 0) {
      const node = queue.shift()!;
      if (visited.has(node)) continue;
      visited.add(node);
      for (const parent of reverseAdj.get(node) ?? []) {
        if (!visited.has(parent)) queue.push(parent);
      }
    }

    return [...visited];
  }
}
