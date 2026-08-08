/** Shared list pagination / search helpers for company list actions. */

export type PaginatedList<T> = {
  items: T[];
  total: number;
};

export type ListPagination = {
  page?: number;
  pageSize?: number;
};

/** Returns inclusive PostgREST `.range(from, to)` bounds, or null for "fetch all". */
export function resolveRange(
  page?: number,
  pageSize?: number,
): { from: number; to: number } | null {
  if (!page || !pageSize || page < 1 || pageSize < 1) return null;
  const from = (page - 1) * pageSize;
  return { from, to: from + pageSize - 1 };
}

/** Strip PostgREST filter metacharacters from free-text search. */
export function sanitizeSearchTerm(raw: string): string {
  return raw
    .replace(/[%_,.()]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}
