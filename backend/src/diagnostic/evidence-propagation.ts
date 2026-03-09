import { SimpleEdge } from '@/knowledge-graph/graph-query.service';

const DECAY_FACTOR = 0.85;

/**
 * Build adjacency lists from edges.
 * forward: source -> [targets] (source is prereq of targets)
 * reverse: target -> [sources] (target depends on sources)
 */
function buildAdjacency(edges: SimpleEdge[]): {
  forward: Map<string, string[]>;
  reverse: Map<string, string[]>;
} {
  const forward = new Map<string, string[]>();
  const reverse = new Map<string, string[]>();

  for (const edge of edges) {
    if (!forward.has(edge.source)) forward.set(edge.source, []);
    forward.get(edge.source)!.push(edge.target);
    if (!reverse.has(edge.target)) reverse.set(edge.target, []);
    reverse.get(edge.target)!.push(edge.source);
  }

  return { forward, reverse };
}

/**
 * Propagate correct answer evidence UPWARD to prerequisites.
 * P(L_prereq) = max(P(L_prereq), updatedPL * DECAY^distance)
 *
 * Returns a map of conceptId -> new mastery value (only for changed concepts).
 */
export function propagateCorrectUpward(
  conceptId: string,
  updatedPL: number,
  masteries: Map<string, number>,
  edges: SimpleEdge[],
): Map<string, number> {
  const { reverse } = buildAdjacency(edges);
  const updates = new Map<string, number>();

  // BFS upward through prerequisites
  const queue: Array<{ id: string; distance: number }> = [];
  const visited = new Set<string>();

  for (const prereq of reverse.get(conceptId) ?? []) {
    queue.push({ id: prereq, distance: 1 });
  }

  while (queue.length > 0) {
    const { id, distance } = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);

    const propagated = updatedPL * Math.pow(DECAY_FACTOR, distance);
    const current = masteries.get(id) ?? 0.5;
    const newValue = Math.max(current, propagated);

    if (newValue > current) {
      updates.set(id, newValue);
    }

    for (const parent of reverse.get(id) ?? []) {
      if (!visited.has(parent)) {
        queue.push({ id: parent, distance: distance + 1 });
      }
    }
  }

  return updates;
}

/**
 * Propagate incorrect answer evidence DOWNWARD to dependents.
 * P(L_dep) = min(P(L_dep), updatedPL + (1 - updatedPL) * (1 - DECAY^distance))
 *
 * Returns a map of conceptId -> new mastery value (only for changed concepts).
 */
export function propagateIncorrectDownward(
  conceptId: string,
  updatedPL: number,
  masteries: Map<string, number>,
  edges: SimpleEdge[],
): Map<string, number> {
  const { forward } = buildAdjacency(edges);
  const updates = new Map<string, number>();

  // BFS downward through dependents
  const queue: Array<{ id: string; distance: number }> = [];
  const visited = new Set<string>();

  for (const dep of forward.get(conceptId) ?? []) {
    queue.push({ id: dep, distance: 1 });
  }

  while (queue.length > 0) {
    const { id, distance } = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);

    const propagated = updatedPL + (1 - updatedPL) * (1 - Math.pow(DECAY_FACTOR, distance));
    const current = masteries.get(id) ?? 0.5;
    const newValue = Math.min(current, propagated);

    if (newValue < current) {
      updates.set(id, newValue);
    }

    for (const child of forward.get(id) ?? []) {
      if (!visited.has(child)) {
        queue.push({ id: child, distance: distance + 1 });
      }
    }
  }

  return updates;
}

/**
 * Top-level evidence propagation dispatch.
 * Correct -> propagate UP to prerequisites.
 * Incorrect -> propagate DOWN to dependents.
 */
export function propagateEvidence(
  conceptId: string,
  correct: boolean,
  updatedPL: number,
  masteries: Map<string, number>,
  edges: SimpleEdge[],
): Map<string, number> {
  if (correct) {
    return propagateCorrectUpward(conceptId, updatedPL, masteries, edges);
  } else {
    return propagateIncorrectDownward(conceptId, updatedPL, masteries, edges);
  }
}
