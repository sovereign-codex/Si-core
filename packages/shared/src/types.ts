export type Identifier = string & { readonly brand: unique symbol };

export interface Timestamped {
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  cursor?: string;
}
