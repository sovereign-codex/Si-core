import type { Identifier } from "./types.js";

/**
 * Casts the provided string to an Identifier without additional validation.
 */
export function toIdentifier(value: string): Identifier {
  return value as Identifier;
}

/**
 * Ensures the provided string can act as an Identifier, throwing if empty.
 */
export function assertIdentifier(value: string): asserts value is Identifier {
  if (!value || value.trim().length === 0) {
    throw new Error("Identifier cannot be empty");
  }
}

/**
 * Formats the provided date-like value as an ISO 8601 string.
 */
export function isoDate(date: Date | string | number): string {
  if (date instanceof Date) {
    return date.toISOString();
  }

  return new Date(date).toISOString();
}
