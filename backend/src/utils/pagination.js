/**
 * Extracts cursor-based pagination args from query params.
 * Usage: const { take, skip, cursor } = paginationArgs(req.query);
 * Then pass to Prisma: prisma.model.findMany({ ...paginationArgs(req.query), ... })
 */
export function paginationArgs(query) {
  const take = Math.min(parseInt(query.limit) || 50, 100);
  const cursor = query.cursor ? { id: query.cursor } : undefined;
  const skip = cursor ? 1 : 0;
  return { take, skip, ...(cursor && { cursor }) };
}
