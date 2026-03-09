import {
  ConceptSnapshot,
  SimpleEdge,
  PLATEAU_FAIL_COUNT_THRESHOLD,
} from './types';

/**
 * Detect if a student is stuck on a concept.
 * A student is "plateaued" when they've failed the same concept
 * PLATEAU_FAIL_COUNT_THRESHOLD or more times.
 */
export function detectPlateau(snapshot: ConceptSnapshot): boolean {
  return snapshot.failCount >= PLATEAU_FAIL_COUNT_THRESHOLD;
}

/**
 * Given a blocked concept, trace back through the prerequisite graph
 * and return all ancestor concept IDs that are NOT mastered.
 *
 * Uses BFS backwards through edges to find all prerequisites,
 * then filters to those whose masteryState !== 'mastered'.
 */
export function findWeakPrerequisites(
  blockedConceptId: string,
  edges: SimpleEdge[],
  allSnapshots: ConceptSnapshot[],
): string[] {
  // Build reverse adjacency: target -> [sources]
  const reverseAdj = new Map<string, string[]>();
  for (const edge of edges) {
    if (!reverseAdj.has(edge.target)) reverseAdj.set(edge.target, []);
    reverseAdj.get(edge.target)!.push(edge.source);
  }

  // BFS to find all ancestors
  const visited = new Set<string>();
  const queue = [...(reverseAdj.get(blockedConceptId) ?? [])];

  while (queue.length > 0) {
    const node = queue.shift()!;
    if (visited.has(node)) continue;
    visited.add(node);
    for (const parent of reverseAdj.get(node) ?? []) {
      if (!visited.has(parent)) queue.push(parent);
    }
  }

  // Build lookup for mastery state
  const snapshotMap = new Map<string, ConceptSnapshot>();
  for (const s of allSnapshots) {
    snapshotMap.set(s.conceptId, s);
  }

  // Filter to weak (not mastered) prerequisites.
  // Only consider concepts that have a snapshot (i.e., the student has state for them).
  return [...visited].filter((id) => {
    const snap = snapshotMap.get(id);
    return snap !== undefined && snap.masteryState !== 'mastered';
  });
}
