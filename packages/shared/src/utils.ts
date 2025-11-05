import type { Identifier } from "./types.js";

export function toIdentifier(value: string): Identifier {
  return value as Identifier;
}

export function assertIdentifier(value: string): asserts value is Identifier {
  if (!value || value.trim().length === 0) {
    throw new Error("Identifier cannot be empty");
  }
}

export function isoDate(date: Date | string | number): string {
  if (date instanceof Date) {
    return date.toISOString();
  }

  return new Date(date).toISOString();
}
