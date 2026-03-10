import { EncompassingLink, ImplicitUpdate } from './types';

/**
 * Compute implicit repetition credit for encompassed concepts.
 *
 * When a student practices concept B, credit flows to concepts that B encompasses.
 * Uses BFS to handle transitive chains. Only propagates to concepts where
 * the student's speed >= 1.0 (they've demonstrated sufficient facility).
 *
 * @param practicedConceptId - The concept the student directly practiced
 * @param rawDelta - The raw delta from the practice (from calculateRawDelta)
 * @param encompassingEdges - All encompassing edges in the course
 * @param conceptSpeeds - Map of conceptId -> speed for this student
 * @returns Array of implicit updates to apply to encompassed concepts
 */
export function computeImplicitRepetition(
  practicedConceptId: string,
  rawDelta: number,
  encompassingEdges: EncompassingLink[],
  conceptSpeeds: Map<string, number>,
): ImplicitUpdate[] {
  // Build adjacency: targetConceptId -> array of { sourceConceptId, weight }
  // "target encompasses source" means practicing target gives credit to source
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

  const updates: ImplicitUpdate[] = [];
  const visited = new Set<string>([practicedConceptId]);

  // BFS queue: [conceptId, accumulated weight product]
  const queue: Array<[string, number]> = [[practicedConceptId, 1.0]];

  while (queue.length > 0) {
    const [currentId, cumulativeWeight] = queue.shift()!;
    const children = adj.get(currentId) ?? [];

    for (const child of children) {
      if (visited.has(child.conceptId)) continue;
      visited.add(child.conceptId);

      const speed = conceptSpeeds.get(child.conceptId) ?? 0;
      if (speed < 1.0) continue; // only propagate to sufficiently fast concepts

      const effectiveWeight = cumulativeWeight * child.weight;
      const memoryDelta = effectiveWeight * rawDelta;
      // Spec: speed_discount = 1.0 if speed >= 1.0 (gate already checked above)
      const repNumDelta = effectiveWeight * rawDelta;

      updates.push({
        conceptId: child.conceptId,
        repNumDelta,
        memoryDelta,
      });

      // Continue BFS to transitive children
      queue.push([child.conceptId, effectiveWeight]);
    }
  }

  return updates;
}
