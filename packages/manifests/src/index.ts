import type { Identifier } from "@sovereign-codex/shared-utils";

export interface DeploymentManifest {
  id: Identifier;
  name: string;
  version: string;
  artifacts: string[];
}

/**
 * Creates a deployment manifest ensuring it matches the expected structure.
 */
export function createManifest(input: DeploymentManifest): DeploymentManifest {
  return input;
}
