// Same envelope as the storefront's src/types/api.ts and ADMIN-API-CONTRACT.md's
// Conventions section — duplicated rather than cross-imported (see api.ts's
// header comment for why this app doesn't reach into ../src).
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
