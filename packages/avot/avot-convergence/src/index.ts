import { isoDate } from "@sovereign-codex/shared-utils";
import { formatRepositorySummary } from "@sovereign-codex/avot";

export interface ConvergenceContext {
  readonly id: string;
  readonly revision: string;
  readonly activatedAt: Date;
}

/**
 * Produces an activation log line for the convergence agent.
 */
export function activate(context: ConvergenceContext): string {
  return `Convergence agent ${context.id} activated ${isoDate(context.activatedAt)} @ revision ${context.revision}`;
}

/**
 * Delegates to the shared AVOT formatter for repository descriptions.
 */
export function describeRepository(id: string, name: string): string {
  return formatRepositorySummary({ id, name, createdAt: new Date() });
}
