import type { Identifier } from "@sovereign-codex/shared-utils";

export interface ConsoleModule {
  id: Identifier;
  title: string;
  route: string;
}

/**
 * Normalizes and returns a console module definition for registration.
 */
export function defineModule(module: ConsoleModule): ConsoleModule {
  return module;
}
