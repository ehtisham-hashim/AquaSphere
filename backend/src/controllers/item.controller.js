import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getItems = asyncHandler(async (req, res) => {
  const items = await prisma.aquasphereItem.findMany({
    where: { archivedAt: null },
    orderBy: { name: 'asc' }
  });
  res.json({ success: true, data: items });
});
