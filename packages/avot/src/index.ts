import type { Identifier } from "@sovereign-codex/shared-utils";
import { isoDate } from "@sovereign-codex/shared-utils";

export interface AvotRepositoryConfig {
  id: Identifier;
  name: string;
  createdAt: Date;
}

/**
 * Formats a short summary string for the provided repository configuration.
 */
export function formatRepositorySummary(config: AvotRepositoryConfig): string {
  return `${config.name} [${config.id}] created ${isoDate(config.createdAt)}`;
}
