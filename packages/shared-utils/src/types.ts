/**
 * Branded string identifier shared across Sovereign Codex packages.
 */
export type Identifier = string & { readonly brand: unique symbol };

export interface Timestamped {
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Normalized structure for paginated responses throughout the platform.
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  cursor?: string;
}
