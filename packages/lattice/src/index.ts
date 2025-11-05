import type { Identifier } from "@sovereign-intelligence/shared";

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

export function createGraph(): LatticeGraph {
  return { nodes: [], edges: [] };
}
