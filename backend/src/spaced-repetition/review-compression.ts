import { EncompassingLink } from './types';

/**
 * Rank candidate review concepts by how many other due reviews they'd
 * implicitly satisfy. Concepts that cover the most due reviews come first.
 *
 * This is a greedy optimization: by reviewing an encompassing concept,
 * the student implicitly practices its encompassed concepts too,
 * potentially satisfying multiple review needs at once.
 *
 * @param dueReviewConceptIds - Concept IDs that are due for review
 * @param encompassingEdges - All encompassing edges in the course
 * @param conceptSpeeds - Map of conceptId -> speed for this student
 * @returns Sorted concept IDs (most coverage first)
 */
export function rankReviewsByCompression(
  dueReviewConceptIds: string[],
  encompassingEdges: EncompassingLink[],
  conceptSpeeds: Map<string, number>,
): string[] {
  if (dueReviewConceptIds.length === 0) return [];

  const dueSet = new Set(dueReviewConceptIds);

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

  // For each due concept, count how many OTHER due concepts it covers via BFS
  const coverageMap = new Map<string, number>();

  for (const conceptId of dueReviewConceptIds) {
    const covered = countCoverage(conceptId, adj, dueSet, conceptSpeeds);
    coverageMap.set(conceptId, covered);
  }

  // Sort by coverage descending, break ties by original order
  const indexed = dueReviewConceptIds.map((id, i) => ({ id, i }));
  indexed.sort((a, b) => {
    const coverageDiff = (coverageMap.get(b.id) ?? 0) - (coverageMap.get(a.id) ?? 0);
    if (coverageDiff !== 0) return coverageDiff;
    return a.i - b.i; // preserve original order as tiebreaker
  });

  return indexed.map((item) => item.id);
}

/**
 * BFS to count how many concepts in dueSet are reachable from startId
 * through encompassing edges (where the encompassed concept has speed >= 1.0).
 */
function countCoverage(
  startId: string,
  adj: Map<string, Array<{ conceptId: string; weight: number }>>,
  dueSet: Set<string>,
  conceptSpeeds: Map<string, number>,
): number {
  const visited = new Set<string>([startId]);
  const queue = [startId];
  let count = 0;

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const children = adj.get(currentId) ?? [];

    for (const child of children) {
      if (visited.has(child.conceptId)) continue;
      visited.add(child.conceptId);

      const speed = conceptSpeeds.get(child.conceptId) ?? 0;
      if (speed < 1.0) continue;

      if (dueSet.has(child.conceptId)) {
        count++;
      }

      queue.push(child.conceptId);
    }
  }

  return count;
}
