import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

const getTenantPrefix = (req) => {
  const tenant = (req.headers['x-tenant'] || 'aquasphere').toLowerCase();
  return tenant === 'wadaana' ? 'wadaana' : 'aquasphere';
};

export const getItems = asyncHandler(async (req, res) => {
  const { type, includeArchived } = req.query;
  const prefix = getTenantPrefix(req);
  
  const where = {};
  if (type) where.type = type;
  if (includeArchived !== 'true') where.archivedAt = null;

  const items = await prisma[`${prefix}Item`].findMany({
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
  const prefix = getTenantPrefix(req);

  const item = await prisma[`${prefix}Item`].findUnique({ where: { id } });
  if (!item) throw new ApiError(404, 'Item not found');
  
  res.json({ success: true, data: item });
});

export const createItem = asyncHandler(async (req, res) => {
  const { name, type = 'RAW_MATERIAL', unit = 'kg', reorderLevel = 0 } = req.body;
  const prefix = getTenantPrefix(req);

  if (!name) throw new ApiError(400, 'Item name is required');

  const item = await prisma[`${prefix}Item`].create({
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
  const prefix = getTenantPrefix(req);

  if (!name) throw new ApiError(400, 'Item name is required');

  const item = await prisma[`${prefix}Item`].update({
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
  const prefix = getTenantPrefix(req);

  const item = await prisma[`${prefix}Item`].update({
    where: { id },
    data: { archivedAt: new Date() }
  });
  
  res.json({ success: true, data: item, message: 'Item archived successfully' });
});

export const restoreItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const prefix = getTenantPrefix(req);

  const item = await prisma[`${prefix}Item`].update({
    where: { id },
    data: { archivedAt: null }
  });
  
  res.json({ success: true, data: item, message: 'Item restored successfully' });
});

export const adjustInventory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { quantity, direction, reason } = req.body;
  const prefix = getTenantPrefix(req);

  const qty = parseFloat(quantity);
  if (isNaN(qty) || qty <= 0) {
    throw new ApiError(400, 'Quantity must be a positive number');
  }

  if (!['IN', 'OUT'].includes(direction)) {
    throw new ApiError(400, 'Direction must be IN or OUT');
  }

  if (!reason) {
    throw new ApiError(400, 'Reason for manual adjustment is required');
  }

  const updatedItem = await prisma.$transaction(async (tx) => {
    const item = await tx[`${prefix}Item`].findUnique({ where: { id } });
    if (!item) throw new ApiError(404, 'Item not found');

    const newQty = direction === 'IN' 
      ? parseFloat(item.cachedQty) + qty 
      : parseFloat(item.cachedQty) - qty;

    await tx[`${prefix}InventoryTransaction`].create({
      data: {
        itemId: item.id,
        quantity: qty,
        direction,
        reason: `MANUAL_ADJUSTMENT: ${reason}`,
        refType: 'MANUAL',
        refId: 'SYSTEM'
      }
    });

    return await tx[`${prefix}Item`].update({
      where: { id },
      data: { cachedQty: newQty }
    });
  });

  res.json({ success: true, data: updatedItem });
});
