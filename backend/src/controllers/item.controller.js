import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

export const getItems = asyncHandler(async (req, res) => {
  const { type, includeArchived } = req.query;
  const where = {};
  if (type) where.type = type;
  if (includeArchived !== 'true') where.archivedAt = null;

  let items = await prisma.aquasphereItem.findMany({
    where,
    orderBy: { name: 'asc' }
  });

  // Seed default Raw Materials if empty and RAW_MATERIAL requested
  if (items.length === 0 && type === 'RAW_MATERIAL') {
    const defaults = [
      { name: 'Calcium', unit: 'kg', reorderLevel: 50 },
      { name: 'Magnesium', unit: 'kg', reorderLevel: 50 },
      { name: 'Sodium', unit: 'kg', reorderLevel: 50 },
      { name: 'Small Caps', unit: 'pcs', reorderLevel: 1000 },
      { name: 'Large Caps', unit: 'pcs', reorderLevel: 1000 },
      { name: '0.5L Bottle', unit: 'pcs', reorderLevel: 500 },
      { name: '1.5L Bottle', unit: 'pcs', reorderLevel: 500 },
      { name: 'Labels', unit: 'pcs', reorderLevel: 2000 },
      { name: 'Shrink Wrap', unit: 'rolls', reorderLevel: 20 },
      { name: 'Preforms', unit: 'pcs', reorderLevel: 1000 }
    ];
    for (const d of defaults) {
      await prisma.aquasphereItem.create({
        data: {
          name: d.name,
          type: 'RAW_MATERIAL',
          unit: d.unit,
          reorderLevel: d.reorderLevel,
          cachedQty: 0
        }
      });
    }
    items = await prisma.aquasphereItem.findMany({
      where,
      orderBy: { name: 'asc' }
    });
  }

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
