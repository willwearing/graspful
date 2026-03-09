import { Injectable } from '@nestjs/common';

export interface SimpleEdge {
  source: string;
  target: string;
}

export interface WeightedEdge extends SimpleEdge {
  weight: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

@Injectable()
export class GraphValidationService {
  /**
   * Detect cycles in a directed graph using DFS with coloring.
   * Returns a list of error messages (empty = no cycles).
   */
  detectCycles(conceptIds: string[], edges: SimpleEdge[]): string[] {
    const WHITE = 0, GRAY = 1, BLACK = 2;
    const color = new Map<string, number>();
    const adj = new Map<string, string[]>();

    for (const id of conceptIds) {
      color.set(id, WHITE);
      adj.set(id, []);
    }
    for (const edge of edges) {
      adj.get(edge.source)?.push(edge.target);
    }

    const errors: string[] = [];

    const dfs = (node: string, path: string[]): boolean => {
      color.set(node, GRAY);
      path.push(node);

      for (const neighbor of adj.get(node) ?? []) {
        if (color.get(neighbor) === GRAY) {
          const cycleStart = path.indexOf(neighbor);
          const cycle = path.slice(cycleStart).concat(neighbor);
          errors.push(`Cycle detected: ${cycle.join(' -> ')}`);
          return true;
        }
        if (color.get(neighbor) === WHITE) {
          if (dfs(neighbor, path)) return true;
        }
      }

      path.pop();
      color.set(node, BLACK);
      return false;
    };

    for (const id of conceptIds) {
      if (color.get(id) === WHITE) {
        dfs(id, []);
      }
    }

    return errors;
  }

  /**
   * Find orphan concepts (concepts with no edges at all).
   * A single-concept course is not considered orphaned.
   */
  detectOrphans(
    conceptIds: string[],
    prereqEdges: SimpleEdge[],
    encompEdges: SimpleEdge[],
  ): string[] {
    if (conceptIds.length <= 1) return [];

    const connected = new Set<string>();
    for (const edge of [...prereqEdges, ...encompEdges]) {
      connected.add(edge.source);
      connected.add(edge.target);
    }

    return conceptIds.filter((id) => !connected.has(id));
  }

  /**
   * Validate that all encompassing edge weights are in [0, 1].
   */
  validateEncompassingWeights(edges: WeightedEdge[]): string[] {
    return edges
      .filter((e) => e.weight < 0 || e.weight > 1)
      .map((e) => `Invalid weight ${e.weight} on edge ${e.source} -> ${e.target} (must be 0.0-1.0)`);
  }

  /**
   * Validate that all source/target concept IDs in edges actually exist.
   */
  validateReferences(conceptIds: Set<string>, edges: SimpleEdge[]): string[] {
    const errors: string[] = [];
    for (const edge of edges) {
      if (!conceptIds.has(edge.source)) {
        errors.push(`Edge references non-existent concept: ${edge.source}`);
      }
      if (!conceptIds.has(edge.target)) {
        errors.push(`Edge references non-existent concept: ${edge.target}`);
      }
    }
    return errors;
  }

  /**
   * Run all validations and return a combined result.
   */
  validate(
    conceptIds: string[],
    prereqEdges: SimpleEdge[],
    encompEdges: WeightedEdge[],
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const idSet = new Set(conceptIds);

    // Reference checks
    errors.push(...this.validateReferences(idSet, prereqEdges));
    errors.push(...this.validateReferences(idSet, encompEdges));

    // Cycle detection (only on valid references)
    const validPrereqs = prereqEdges.filter(
      (e) => idSet.has(e.source) && idSet.has(e.target),
    );
    errors.push(...this.detectCycles(conceptIds, validPrereqs));

    // Weight validation
    errors.push(...this.validateEncompassingWeights(encompEdges));

    // Orphan detection (warning, not error)
    const orphans = this.detectOrphans(conceptIds, prereqEdges, encompEdges);
    if (orphans.length > 0) {
      warnings.push(`Orphan concepts (no edges): ${orphans.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
