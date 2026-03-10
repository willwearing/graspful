import { EncompassingLink } from './types';

/**
 * Rank candidate review concepts using greedy set-cover: pick the concept
 * that implicitly covers the most OTHER due reviews, remove covered concepts,
 * repeat. This minimises the total number of explicit reviews needed.
 *
 * @param dueReviewConceptIds - Concept IDs that are due for review
 * @param encompassingEdges - All encompassing edges in the course
 * @param conceptSpeeds - Map of conceptId -> speed for this student
 * @returns Sorted concept IDs (greedy set-cover order)
 */
export function rankReviewsByCompression(
  dueReviewConceptIds: string[],
  encompassingEdges: EncompassingLink[],
  conceptSpeeds: Map<string, number>,
): string[] {
  if (dueReviewConceptIds.length === 0) return [];

  // Build adjacency: targetConceptId -> array of { sourceConceptId }
  const adj = new Map<string, Array<{ conceptId: string; weight: number }>>();
  for (const edge of encompassingEdges) {
    if (!adj.has(edge.targetConceptId)) {
      adj.set(edge.targetConceptId, []);
    }
    adj.get(edge.targetConceptId)!.push({
      conceptId: edge.sourceConceptId,
      weight: edge.weight,
    });
  }

  const remaining = new Set(dueReviewConceptIds);
  const result: string[] = [];

  while (remaining.size > 0) {
    // For each remaining concept, count how many OTHER remaining concepts it covers
    let bestId = '';
    let bestCoverage = -1;
    let bestOriginalIndex = Infinity;

    for (const conceptId of remaining) {
      const covered = getCoveredSet(conceptId, adj, remaining, conceptSpeeds);
      const originalIndex = dueReviewConceptIds.indexOf(conceptId);
      // Pick highest coverage, break ties by original order
      if (
        covered.size > bestCoverage ||
        (covered.size === bestCoverage && originalIndex < bestOriginalIndex)
      ) {
        bestId = conceptId;
        bestCoverage = covered.size;
        bestOriginalIndex = originalIndex;
      }
    }

    // Add best concept to result
    result.push(bestId);
    remaining.delete(bestId);

    // Remove all concepts covered by this pick from remaining
    if (bestCoverage > 0) {
      const covered = getCoveredSet(bestId, adj, remaining, conceptSpeeds);
      for (const coveredId of covered) {
        remaining.delete(coveredId);
        result.push(coveredId); // still include them, just after the covering concept
      }
    }
  }

  return result;
}

/**
 * BFS to find which concepts in `remaining` are reachable from startId
 * through encompassing edges (where the encompassed concept has speed >= 1.0).
 * Does NOT include startId itself.
 */
function getCoveredSet(
  startId: string,
  adj: Map<string, Array<{ conceptId: string; weight: number }>>,
  remaining: Set<string>,
  conceptSpeeds: Map<string, number>,
): Set<string> {
  const visited = new Set<string>([startId]);
  const queue = [startId];
  const covered = new Set<string>();

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const children = adj.get(currentId) ?? [];

    for (const child of children) {
      if (visited.has(child.conceptId)) continue;
      visited.add(child.conceptId);

      const speed = conceptSpeeds.get(child.conceptId) ?? 0;
      if (speed < 1.0) continue;

      if (remaining.has(child.conceptId)) {
        covered.add(child.conceptId);
      }

      queue.push(child.conceptId);
    }
  }

  return covered;
}
