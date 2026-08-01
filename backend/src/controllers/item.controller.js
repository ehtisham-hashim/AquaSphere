import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

const getTenantPrefix = (req) => {
  const tenant = (req.headers['x-tenant'] || 'aquasphere').toLowerCase();
  return tenant === 'wadaana' ? 'wadaana' : 'aquasphere';
};

const consolidateDuplicateFinishedGoods = async (prefix) => {
  if (prefix === 'wadaana') return; // Wadaana operates on single bottle items, do not consolidate
  try {
    const allFG = await prisma[`${prefix}Item`].findMany({
      where: { archivedAt: null }
    });

    const groups = [
      {
        canonicalName: '0.5L PET Pack (12 Bottles)',
        unit: 'packs',
        keywords: ['0.5', '500']
      },
      {
        canonicalName: '1.5L PET Pack (6 Bottles)',
        unit: 'packs',
        keywords: ['1.5', '1500']
      },
      {
        canonicalName: '19L Refill Bottle',
        unit: 'bottles',
        keywords: ['19']
      }
    ];

    for (const g of groups) {
      const matchingItems = allFG.filter(i => 
        (i.type === 'FINISHED_GOOD' || !i.type) && 
        g.keywords.some(kw => i.name.toLowerCase().includes(kw.toLowerCase()))
      );

      if (matchingItems.length === 0) continue;

      let canonicalItem = matchingItems.find(i => i.name === g.canonicalName) || matchingItems[0];

      await prisma[`${prefix}Item`].update({
        where: { id: canonicalItem.id },
        data: { name: g.canonicalName, unit: g.unit, type: 'FINISHED_GOOD' }
      });

      for (const dupe of matchingItems) {
        if (dupe.id === canonicalItem.id) continue;

        await prisma[`${prefix}InventoryTransaction`].updateMany({
          where: { itemId: dupe.id },
          data: { itemId: canonicalItem.id }
        });

        await prisma[`${prefix}Item`].delete({
          where: { id: dupe.id }
        }).catch(() => null);
      }
    }
  } catch (err) {
    console.error('Consolidation warning:', err);
  }
};

export const getItems = asyncHandler(async (req, res) => {
  const { type, includeArchived } = req.query;
  const prefix = getTenantPrefix(req);
  
  await consolidateDuplicateFinishedGoods(prefix);

  const where = {};
  if (type) where.type = type;
  if (includeArchived !== 'true') where.archivedAt = null;

  const items = await prisma[`${prefix}Item`].findMany({
    where,
    orderBy: { name: 'asc' },
    include: {
      recipeFinishedGoods: {
        include: { rawMaterial: true }
      },
      inventoryTransactions: {
        select: { quantity: true, direction: true }
      }
    }
  });

  const itemsData = items.map(item => {
    if (item.type === 'FINISHED_GOOD' || !item.type) {
      const nameLower = (item.name || '').toLowerCase();
      if (nameLower.includes('0.5') || nameLower.includes('500') || nameLower.includes('1.5') || nameLower.includes('1500')) {
        item.unit = 'packs';
      } else if (nameLower.includes('19')) {
        item.unit = 'bottles';
      }
    }
    if (item.inventoryTransactions && item.inventoryTransactions.length > 0) {
      let netQty = 0;
      for (const t of item.inventoryTransactions) {
        const q = Number(t.quantity || 0);
        if (t.direction === 'IN') netQty += q;
        else if (t.direction === 'OUT') netQty -= q;
      }
      item.cachedQty = netQty;
    }
    delete item.inventoryTransactions;
    return item;
  });

  res.json({ success: true, data: itemsData });
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

export const getInventoryTransactions = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { type, limit = 100 } = req.query;

  const whereClause = {};
  if (type) {
    whereClause.item = { type };
  }

  const txns = await prisma[`${prefix}InventoryTransaction`].findMany({
    where: whereClause,
    include: {
      item: {
        select: { id: true, name: true, type: true, unit: true, cachedQty: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: parseInt(limit) || 100
  });

  res.json({ success: true, data: txns });
});
