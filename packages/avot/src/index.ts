import type { Identifier } from "@sovereign-intelligence/shared";
import { isoDate } from "@sovereign-intelligence/shared";

export interface AvotRepositoryConfig {
  id: Identifier;
  name: string;
  createdAt: Date;
}

export function formatRepositorySummary(config: AvotRepositoryConfig): string {
  return `${config.name} [${config.id}] created ${isoDate(config.createdAt)}`;
}
