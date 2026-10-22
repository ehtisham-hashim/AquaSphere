/**
 * Extracts cursor-based pagination args from query params.
 * If neither limit nor cursor is provided, returns an empty object {}
 * to allow uncapped queries for client-side pagination.
 *
 * Usage: prisma.model.findMany({ ...paginationArgs(req.query), ... })
 */
export function paginationArgs(query) {
  if (!query || (query.limit === undefined && !query.cursor)) {
    return {};
  }
  const take = Math.min(parseInt(query.limit, 10) || 50, 100);
  const cursor = query.cursor ? { id: query.cursor } : undefined;
  const skip = cursor ? 1 : 0;
  return { take, skip, ...(cursor && { cursor }) };
}

