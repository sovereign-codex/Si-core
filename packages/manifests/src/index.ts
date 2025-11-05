import type { Identifier } from "@sovereign-intelligence/shared";

export interface DeploymentManifest {
  id: Identifier;
  name: string;
  version: string;
  artifacts: string[];
}

export function createManifest(input: DeploymentManifest): DeploymentManifest {
  return input;
}
