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
  const { name, type = 'RAW_MATERIAL', unit = 'kg', reorderLevel = 0, initialStock = 0, quantityToAdd = 0 } = req.body;
  const prefix = getTenantPrefix(req);

  if (!name || !name.trim()) throw new ApiError(400, 'Item name is required');
  const cleanName = name.trim();
  const addQty = parseFloat(initialStock || quantityToAdd || 0);

  // Check if active item with same name exists to avoid duplicate rows
  const existingItem = await prisma[`${prefix}Item`].findFirst({
    where: {
      name: { equals: cleanName, mode: 'insensitive' },
      archivedAt: null
    }
  });

  if (existingItem) {
    const updated = await prisma.$transaction(async (tx) => {
      if (addQty > 0) {
        await tx[`${prefix}InventoryTransaction`].create({
          data: {
            itemId: existingItem.id,
            quantity: addQty,
            direction: 'IN',
            reason: 'STOCK_ADDED',
            refType: 'MANUAL',
            refId: 'SYSTEM'
          }
        });
      }

      return await tx[`${prefix}Item`].update({
        where: { id: existingItem.id },
        data: {
          cachedQty: { increment: addQty > 0 ? addQty : 0 },
          reorderLevel: parseFloat(reorderLevel) || existingItem.reorderLevel,
          unit: unit || existingItem.unit
        }
      });
    });

    return res.status(200).json({ success: true, data: updated, message: 'Stock appended to existing item' });
  }

  const item = await prisma.$transaction(async (tx) => {
    const newItem = await tx[`${prefix}Item`].create({
      data: {
        name: cleanName,
        type,
        unit,
        reorderLevel: parseFloat(reorderLevel) || 0,
        cachedQty: addQty > 0 ? addQty : 0
      }
    });

    if (addQty > 0) {
      await tx[`${prefix}InventoryTransaction`].create({
        data: {
          itemId: newItem.id,
          quantity: addQty,
          direction: 'IN',
          reason: 'INITIAL_STOCK',
          refType: 'MANUAL',
          refId: 'SYSTEM'
        }
      });
    }

    return newItem;
  });

  res.status(201).json({ success: true, data: item });
});

export const updateItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, unit, reorderLevel, initialStock = 0, quantityToAdd = 0 } = req.body;
  const prefix = getTenantPrefix(req);

  if (!name || !name.trim()) throw new ApiError(400, 'Item name is required');
  const addQty = parseFloat(initialStock || quantityToAdd || 0);

  const updated = await prisma.$transaction(async (tx) => {
    const item = await tx[`${prefix}Item`].findUnique({ where: { id } });
    if (!item) throw new ApiError(404, 'Item not found');

    if (addQty > 0) {
      await tx[`${prefix}InventoryTransaction`].create({
        data: {
          itemId: item.id,
          quantity: addQty,
          direction: 'IN',
          reason: 'STOCK_ADDED',
          refType: 'MANUAL',
          refId: 'SYSTEM'
        }
      });
    }

    return await tx[`${prefix}Item`].update({
      where: { id },
      data: {
        name: name.trim(),
        unit: unit || item.unit,
        reorderLevel: parseFloat(reorderLevel) || item.reorderLevel,
        cachedQty: { increment: addQty > 0 ? addQty : 0 }
      }
    });
  });

  res.json({ success: true, data: updated });
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
