import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { getTenantPrefix } from '../utils/tenant.js';

/**
 * Retrieves catalog items (raw materials / finished goods) with recipe relations.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
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

  const itemsData = items.map(item => {
    if (item.type === 'FINISHED_GOOD' || !item.type) {
      const nameLower = (item.name || '').toLowerCase();
      if (nameLower.includes('0.5') || nameLower.includes('500') || nameLower.includes('1.5') || nameLower.includes('1500')) {
        item.unit = 'packs';
      } else if (nameLower.includes('19')) {
        item.unit = 'bottles';
      }
    }
    return item;
  });

  res.json({ success: true, data: itemsData });
});

/**
 * Retrieves a single inventory item by ID.
 *
 * @param {import('express').Request} req - Express request object with item id parameter.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
export const getItemById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const prefix = getTenantPrefix(req);

  const item = await prisma[`${prefix}Item`].findUnique({ where: { id } });
  if (!item) throw new ApiError(404, 'Item not found');
  
  res.json({ success: true, data: item });
});

/**
 * Creates a new catalog item or reactivates an archived one with initial stock balance.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
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

/**
 * Updates an item's configuration (name, unit, reorder level) and optionally increments stock atomically.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
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

/**
 * Soft archives an item, hiding it from default inventory listings.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
export const archiveItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const prefix = getTenantPrefix(req);

  const item = await prisma[`${prefix}Item`].update({
    where: { id },
    data: { archivedAt: new Date() }
  });
  
  res.json({ success: true, data: item, message: 'Item archived successfully' });
});

/**
 * Restores a soft-archived item back to active inventory listings.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
export const restoreItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const prefix = getTenantPrefix(req);

  const item = await prisma[`${prefix}Item`].update({
    where: { id },
    data: { archivedAt: null }
  });
  
  res.json({ success: true, data: item, message: 'Item restored successfully' });
});

/**
 * Manually adjusts inventory quantity up or down with transaction tracking.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
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

/**
 * Retrieves inventory ledger transactions with optional item type filtering.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
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
        select: { id: true, name: true, type: true, unit: true, cachedQty: true, factoryQty: true, warehouseQty: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: parseInt(limit) || 100
  });

  res.json({ success: true, data: txns });
});

/**
 * Transfers stock between factory and warehouse locations with batch tracking.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
export const transferStock = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { itemId, fromLocation, toLocation, quantity, batchNo, notes } = req.body;

  const qty = parseFloat(quantity);
  if (isNaN(qty) || qty <= 0) throw new ApiError(400, 'Quantity must be a positive number');
  if (!itemId) throw new ApiError(400, 'Item selection is required');
  if (!fromLocation || !toLocation) throw new ApiError(400, 'From and To locations are required');
  if (fromLocation === toLocation) throw new ApiError(400, 'From and To locations must be different');

  const item = await prisma[`${prefix}Item`].findUnique({ where: { id: itemId } });
  if (!item) throw new ApiError(404, 'Item not found');

  const fac = Number(item.factoryQty || 0);
  const wh = Number(item.warehouseQty || 0);
  const cached = Number(item.cachedQty || 0);

  const effectiveFac = (fac === 0 && wh === 0) ? cached : fac;
  const effectiveWh = (fac === 0 && wh === 0) ? 0 : wh;

  const srcQty = fromLocation === 'FACTORY' ? effectiveFac : effectiveWh;
  if (srcQty < qty) {
    throw new ApiError(400, `Insufficient stock at ${fromLocation} (Available: ${srcQty}, Requested: ${qty})`);
  }

  const updatedItem = await prisma.$transaction(async (tx) => {
    const newFactoryQty = effectiveFac + (fromLocation === 'FACTORY' ? -qty : qty);
    const newWarehouseQty = effectiveWh + (fromLocation === 'WAREHOUSE' ? -qty : qty);

    const updated = await tx[`${prefix}Item`].update({
      where: { id: itemId },
      data: {
        factoryQty: Math.max(0, newFactoryQty),
        warehouseQty: Math.max(0, newWarehouseQty)
      }
    });

    const now = new Date();
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 1);

    await tx[`${prefix}InventoryTransaction`].create({
      data: {
        itemId,
        quantity: qty,
        direction: 'IN',
        reason: `STOCK_TRANSFER: ${fromLocation} ➔ ${toLocation}${notes ? ` (${notes})` : ''}`,
        refType: 'TRANSFER',
        refId: 'TRANSFER',
        location: `${fromLocation} -> ${toLocation}`,
        batchNo: batchNo || `AQ-BATCH-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`,
        productionDate: now,
        expiryDate: expiry
      }
    });

    return updated;
  });

  res.json({ success: true, data: updatedItem, message: 'Stock transferred successfully' });
});

/**
 * Reconciles an item's cached stock balance from the sum of its historic inventory transactions.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
export const reconcileInventory = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { itemId } = req.params;

  if (!['OWNER', 'ADMIN'].includes(req.user?.role)) {
    throw new ApiError(403, 'Only Owner or Admin can perform inventory reconciliation');
  }

  const item = await prisma[`${prefix}Item`].findUnique({ 
    where: { id: itemId },
    include: {
      inventoryTransactions: {
        select: { quantity: true, direction: true, refType: true }
      }
    }
  });

  if (!item) throw new ApiError(404, 'Item not found');

  // Calculate net quantity from transactions
  let netQty = 0;
  for (const t of item.inventoryTransactions) {
    if (t.refType === 'TRANSFER') continue;
    const q = Number(t.quantity || 0);
    if (t.direction === 'IN') netQty += q;
    else if (t.direction === 'OUT') netQty -= q;
  }

  const fQty = Number(item.factoryQty || 0);
  const wQty = Number(item.warehouseQty || 0);
  const cachedQty = Number(item.cachedQty || 0);
  const diff = (fQty + wQty) - netQty;

  if (diff === 0 && cachedQty === netQty) {
    return res.json({ 
      success: true, 
      message: 'Inventory is already reconciled',
      data: { item, reconciled: false }
    });
  }

  // Perform reconciliation
  let newF = fQty;
  let newW = wQty;

  if (diff > 0) {
    // Excess stock: deduct from Factory first, then Warehouse
    if (newF >= diff) {
      newF -= diff;
    } else {
      const remainder = diff - newF;
      newF = 0;
      newW = Math.max(0, newW - remainder);
    }
  } else {
    // Deficit: add to Factory
    newF += Math.abs(diff);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const reconciled = await tx[`${prefix}Item`].update({
      where: { id: itemId },
      data: { 
        factoryQty: newF, 
        warehouseQty: newW, 
        cachedQty: netQty 
      }
    });

    // Create audit log entry
    await tx[`${prefix}AuditLog`].create({
      data: {
        action: 'INVENTORY_RECONCILED',
        entityType: 'Item',
        entityId: itemId,
        performedBy: req.user?.name || req.user?.id || 'Admin',
        details: JSON.stringify({
          itemName: item.name,
          before: { factory: fQty, warehouse: wQty, cached: cachedQty },
          after: { factory: newF, warehouse: newW, cached: netQty },
          discrepancy: diff
        })
      }
    });

    return reconciled;
  });

  res.json({ 
    success: true, 
    message: 'Inventory reconciled successfully',
    data: { 
      item: updated,
      reconciled: true,
      changes: {
        before: { factory: fQty, warehouse: wQty, cached: cachedQty },
        after: { factory: newF, warehouse: newW, cached: netQty },
        discrepancy: diff
      }
    }
  });
});
