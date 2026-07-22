import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

export const getItems = asyncHandler(async (req, res) => {
  const { type, includeArchived } = req.query;
  const where = {};
  if (type) where.type = type;
  if (includeArchived !== 'true') where.archivedAt = null;

  const items = await prisma.aquasphereItem.findMany({
    where,
    orderBy: { name: 'asc' },
    include: {
      recipeFinishedGoods: {
        include: { rawMaterial: true }
      }
    }
  });

  res.json({ success: true, data: items });
});

export const getItemById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const item = await prisma.aquasphereItem.findUnique({ where: { id } });
  if (!item) throw new ApiError(404, 'Item not found');
  res.json({ success: true, data: item });
});

export const createItem = asyncHandler(async (req, res) => {
  const { name, type = 'RAW_MATERIAL', unit = 'kg', reorderLevel = 0 } = req.body;
  if (!name) throw new ApiError(400, 'Item name is required');

  const item = await prisma.aquasphereItem.create({
    data: {
      name,
      type,
      unit,
      reorderLevel: parseFloat(reorderLevel),
      cachedQty: 0
    }
  });
  res.status(201).json({ success: true, data: item });
});

export const updateItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, unit, reorderLevel } = req.body;
  if (!name) throw new ApiError(400, 'Item name is required');

  const item = await prisma.aquasphereItem.update({
    where: { id },
    data: {
      name,
      unit,
      reorderLevel: parseFloat(reorderLevel)
    }
  });
  res.json({ success: true, data: item });
});

export const archiveItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const item = await prisma.aquasphereItem.update({
    where: { id },
    data: { archivedAt: new Date() }
  });
  res.json({ success: true, data: item, message: 'Item archived successfully' });
});

export const restoreItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const item = await prisma.aquasphereItem.update({
    where: { id },
    data: { archivedAt: null }
  });
  res.json({ success: true, data: item, message: 'Item restored successfully' });
});
