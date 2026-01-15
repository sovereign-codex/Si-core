import { isoDate } from "@sovereign-codex/shared-utils";

export interface CoreStatus {
  version: string;
  lastIngestedAt?: string;
}

/**
 * Creates a status payload summarizing the SI core runtime.
 */
export function createStatus(version: string, lastIngested?: Date): CoreStatus {
  return {
    version,
    lastIngestedAt: lastIngested ? isoDate(lastIngested) : undefined
  };
}
