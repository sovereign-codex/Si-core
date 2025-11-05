import type { Identifier } from "@sovereign-codex/shared-utils";

export interface LatticeNode {
  id: Identifier;
  label: string;
  metadata?: Record<string, unknown>;
}

export type LatticeEdge = [Identifier, Identifier];

export interface LatticeGraph {
  nodes: LatticeNode[];
  edges: LatticeEdge[];
}

/**
 * Creates an empty lattice graph ready for population.
 */
export function createGraph(): LatticeGraph {
  return { nodes: [], edges: [] };
}
