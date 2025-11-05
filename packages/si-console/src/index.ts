import type { Identifier } from "@sovereign-intelligence/shared";

export interface ConsoleModule {
  id: Identifier;
  title: string;
  route: string;
}

export function defineModule(module: ConsoleModule): ConsoleModule {
  return module;
}
