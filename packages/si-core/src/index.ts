import { isoDate } from "@sovereign-intelligence/shared";

export interface CoreStatus {
  version: string;
  lastIngestedAt?: string;
}

export function createStatus(version: string, lastIngested?: Date): CoreStatus {
  return {
    version,
    lastIngestedAt: lastIngested ? isoDate(lastIngested) : undefined
  };
}
