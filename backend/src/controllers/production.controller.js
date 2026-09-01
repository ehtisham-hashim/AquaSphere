import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { calculateProductionBatch } from '../utils/productionFormulas.js';
import { getTenantPrefix } from '../utils/tenant.js';

/**
 * Retrieves paginated production batch runs enriched with output and raw material consumption details.
 *
 * @param {import('express').Request} req - Express request object with pagination parameters.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
export const getProductionBatches = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const skip = (page - 1) * limit;
  const prefix = getTenantPrefix(req);

  const [batches, total] = await Promise.all([
    prisma[`${prefix}ProductionBatch`].findMany({
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        outputItem: { select: { id: true, name: true, unit: true } },
        inputItem: { select: { id: true, name: true, unit: true } },
        consumptions: {
          include: { item: true }
        }
      }
    }),
    prisma[`${prefix}ProductionBatch`].count()
  ]);

  // Enrich producedBy IDs with user names
  const userIds = [...new Set(batches.map(b => b.producedBy).filter(Boolean))];
  const users = userIds.length > 0 ? await prisma[`${prefix}User`].findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, role: true }
  }) : [];
  const userMap = Object.fromEntries(users.map(u => [u.id, u]));

  const enrichedBatches = batches.map(b => ({
    ...b,
    createdBy: userMap[b.producedBy] || { name: b.producedBy || 'System', role: 'OPERATOR' }
  }));

  res.status(200).json({
    success: true,
    data: enrichedBatches,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit)
    }
  });
});

/**
 * Retrieves single production batch by ID with recipe consumptions.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
export const getProductionBatchById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const prefix = getTenantPrefix(req);

  const batch = await prisma[`${prefix}ProductionBatch`].findUnique({
    where: { id },
    include: {
      outputItem: true,
      inputItem: true,
      consumptions: {
        include: { item: true }
      }
    }
  });

  if (!batch) {
    throw new ApiError(404, 'Production batch not found');
  }

  res.status(200).json({ success: true, data: batch });
});

/**
 * Retrieves aggregated production statistics (yield, packs produced, waste) for today and current month.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
export const getProductionStats = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const todaysBatches = await prisma[`${prefix}ProductionBatch`].aggregate({
    where: { createdAt: { gte: startOfDay, lte: endOfDay } },
    _count: { id: true },
    _sum: { packs05L: true, packs15L: true, quantity: true, wasteQuantity: true }
  });

  const monthBatches = await prisma[`${prefix}ProductionBatch`].aggregate({
    where: { createdAt: { gte: startOfMonth } },
    _sum: { packs05L: true, packs15L: true, quantity: true, wasteQuantity: true }
  });

  res.status(200).json({
    success: true,
    data: {
      today: {
        batches: todaysBatches._count.id || 0,
        packs05L: todaysBatches._sum.packs05L || 0,
        packs15L: todaysBatches._sum.packs15L || 0,
        quantity: todaysBatches._sum.quantity || 0,
        wasteQuantity: todaysBatches._sum.wasteQuantity || 0
      },
      month: {
        packs05L: monthBatches._sum.packs05L || 0,
        packs15L: monthBatches._sum.packs15L || 0,
        quantity: monthBatches._sum.quantity || 0,
        wasteQuantity: monthBatches._sum.wasteQuantity || 0
      }
    }
  });
});

/**
 * Creates a new pending production batch with planned output targets for PET packs or 19L refills.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
export const createProductionBatch = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const isWadaana = prefix === 'wadaana';

  if (isWadaana) {
    const { qtyPure05L, qtyPure15L, qtyMix05L, qtyMix15L, batchDate, notes } = req.body;
    const p05 = parseInt(qtyPure05L || 0);
    const p15 = parseInt(qtyPure15L || 0);
    const m05 = parseInt(qtyMix05L || 0);
    const m15 = parseInt(qtyMix15L || 0);

    if (p05 < 0 || p15 < 0 || m05 < 0 || m15 < 0) {
      throw new ApiError(400, 'Quantities cannot be negative');
    }

    if (p05 === 0 && p15 === 0 && m05 === 0 && m15 === 0) {
      throw new ApiError(400, 'Must produce at least one bottle type');
    }

    const batch = await prisma.wadaanaProductionBatch.create({
      data: {
        qtyPure05L: p05,
        qtyPure15L: p15,
        qtyMix05L: m05,
        qtyMix15L: m15,
        batchDate: batchDate ? new Date(batchDate) : new Date(),
        notes: notes || null,
        producedBy: req.user?.id || 'Unknown',
        status: 'PENDING'
      }
    });

    return res.status(201).json({ success: true, data: batch });
  } else {
    const { quantity, packs05L, packs15L, batchDate, notes } = req.body;
    const packs05LNum = parseInt(packs05L || 0);
    const packs15LNum = parseInt(packs15L || 0);
    const quantityNum = parseInt(quantity || 0);

    if (packs05LNum < 0 || packs15LNum < 0 || quantityNum < 0) {
      throw new ApiError(400, 'Quantities cannot be negative');
    }

    if (packs05LNum === 0 && packs15LNum === 0 && quantityNum === 0) {
      throw new ApiError(400, 'Must produce at least one pack or 19L bottle');
    }

    const batch = await prisma.aquasphereProductionBatch.create({
      data: {
        quantity: quantityNum,
        packs05L: packs05LNum,
        packs15L: packs15LNum,
        batchDate: batchDate ? new Date(batchDate) : new Date(),
        notes: notes || null,
        producedBy: req.user?.id || 'Unknown',
        status: 'PENDING'
      }
    });

    return res.status(201).json({ success: true, data: batch });
  }
});

/**
 * Completes a production batch run, deducting consumed raw materials and adding good finished goods into stock.
 *
 * @param {import('express').Request} req - Express request object with actual yields and breakages.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
export const completeProductionBatch = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const prefix = getTenantPrefix(req);
  const isWadaana = prefix === 'wadaana';
  const { brokenBottles05L, brokenBottles15L, wasteQuantity, confirmed: _confirmed } = req.body;

  const batch = await prisma[`${prefix}ProductionBatch`].findUnique({
    where: { id }
  });

  if (!batch) throw new ApiError(404, 'Batch not found');
  if (batch.status === 'COMPLETED') throw new ApiError(400, 'Batch is already completed');

  const allItems = await prisma[`${prefix}Item`].findMany({
    where: { archivedAt: null }
  });

  if (isWadaana) {
    const { brokenPure05L, brokenPure15L, brokenMix05L, brokenMix15L } = req.body;

    const brPure05L = parseInt(brokenPure05L || 0);
    const brPure15L = parseInt(brokenPure15L || 0);
    const brMix05L = parseInt(brokenMix05L || 0);
    const brMix15L = parseInt(brokenMix15L || 0);

    if (brPure05L < 0 || brPure15L < 0 || brMix05L < 0 || brMix15L < 0) {
      throw new ApiError(400, 'Broken bottle quantities cannot be negative');
    }

    if (brPure05L > batch.qtyPure05L) {
      throw new ApiError(400, `Broken 0.5L Pure bottles (${brPure05L}) cannot exceed produced amount (${batch.qtyPure05L})`);
    }
    if (brPure15L > batch.qtyPure15L) {
      throw new ApiError(400, `Broken 1.5L Pure bottles (${brPure15L}) cannot exceed produced amount (${batch.qtyPure15L})`);
    }
    if (brMix05L > batch.qtyMix05L) {
      throw new ApiError(400, `Broken 0.5L Mix bottles (${brMix05L}) cannot exceed produced amount (${batch.qtyMix05L})`);
    }
    if (brMix15L > batch.qtyMix15L) {
      throw new ApiError(400, `Broken 1.5L Mix bottles (${brMix15L}) cannot exceed produced amount (${batch.qtyMix15L})`);
    }

    const matchWadaanaItem = (itemsList, type, primaryKW, volumeKW) => {
      return itemsList.find(i => {
        if (type && i.type !== type) return false;
        const name = i.name.toLowerCase();
        return name.includes(primaryKW) && volumeKW.some(v => name.includes(v));
      }) || itemsList.find(i => type && i.type === type && volumeKW.some(v => i.name.toLowerCase().includes(v)));
    };

    const wadaanaMapping = [
      { key: 'qtyPure05L', brokenKey: 'brokenPure05L', primary: 'pure', volume: ['0.5l', '0.5', '500ml', '500'] },
      { key: 'qtyPure15L', brokenKey: 'brokenPure15L', primary: 'pure', volume: ['1.5l', '1.5', '1500ml', '1500'] },
      { key: 'qtyMix05L', brokenKey: 'brokenMix05L', primary: 'mix', volume: ['0.5l', '0.5', '500ml', '500'] },
      { key: 'qtyMix15L', brokenKey: 'brokenMix15L', primary: 'mix', volume: ['1.5l', '1.5', '1500ml', '1500'] }
    ];

    const preformDeductions = [
      { qty: batch.qtyPure05L || 0, weight: 0.015, primary: 'pure', volume: ['0.5l', '0.5', '500ml', '500'] },
      { qty: batch.qtyPure15L || 0, weight: 0.030, primary: 'pure', volume: ['1.5l', '1.5', '1500ml', '1500'] },
      { qty: batch.qtyMix05L || 0, weight: 0.013, primary: 'mix', volume: ['0.5l', '0.5', '500ml', '500'] },
      { qty: batch.qtyMix15L || 0, weight: 0.027, primary: 'mix', volume: ['1.5l', '1.5', '1500ml', '1500'] }
    ];

    // Validate Preform Stock
    for (const pref of preformDeductions) {
      if (pref.qty > 0) {
        const kgUsed = pref.qty * pref.weight;
        const rmItem = matchWadaanaItem(allItems, 'RAW_MATERIAL', pref.primary, pref.volume);
        if (rmItem) {
          const avail = Number(rmItem.cachedQty || 0);
          if (avail < kgUsed) {
            throw new ApiError(400, `❌ Insufficient preform stock for ${rmItem.name} (Required: ${kgUsed} kg, Available: ${avail} kg)`);
          }
        }
      }
    }

    const updatedBatch = await prisma.$transaction(async (tx) => {
      const pb = await tx.wadaanaProductionBatch.update({
        where: { id },
        data: { 
          status: 'COMPLETED',
          brokenPure05L: brPure05L,
          brokenPure15L: brPure15L,
          brokenMix05L: brMix05L,
          brokenMix15L: brMix15L
        }
      });

      // Update Wadaana finished goods stocks (Net Good = Total Produced - Broken)
      const fgTxRows = [];
      const fgItemUpdates = [];
      for (const map of wadaanaMapping) {
        const produced = pb[map.key] || 0;
        const brokenQty = pb[map.brokenKey] || 0;
        const netGood = Math.max(0, produced - brokenQty);

        if (netGood > 0) {
          const item = matchWadaanaItem(allItems, 'FINISHED_GOOD', map.primary, map.volume);
          if (item) {
            fgTxRows.push({ itemId: item.id, quantity: netGood, direction: 'IN', reason: 'PRODUCTION', refType: 'BATCH', refId: pb.id });
            fgItemUpdates.push(tx.wadaanaItem.update({
              where: { id: item.id },
              data: { 
                cachedQty: { increment: netGood },
                factoryQty: { increment: netGood }
              }
            }));
          }
        }
      }

      if (fgTxRows.length > 0) {
        await tx.wadaanaInventoryTransaction.createMany({ data: fgTxRows });
        await Promise.all(fgItemUpdates);
      }

      // Deduct Wadaana Preform Raw Materials
      const rmConsumptionRows = [];
      const rmTxRows = [];
      const rmItemUpdates = [];
      for (const pref of preformDeductions) {
        if (pref.qty > 0) {
          const kgUsed = pref.qty * pref.weight;
          const rmItem = matchWadaanaItem(allItems, 'RAW_MATERIAL', pref.primary, pref.volume);
          if (rmItem) {
            rmConsumptionRows.push({ batchId: pb.id, itemId: rmItem.id, quantityUsed: kgUsed });
            rmTxRows.push({ itemId: rmItem.id, quantity: kgUsed, direction: 'OUT', reason: 'PRODUCTION', refType: 'BATCH', refId: pb.id });
            rmItemUpdates.push(tx.wadaanaItem.update({
              where: { id: rmItem.id },
              data: { cachedQty: { decrement: kgUsed } }
            }));
          }
        }
      }

      if (rmConsumptionRows.length > 0) {
        await tx.wadaanaProductionBatchConsumption.createMany({ data: rmConsumptionRows });
        await tx.wadaanaInventoryTransaction.createMany({ data: rmTxRows });
        await Promise.all(rmItemUpdates);
      }

      await tx.wadaanaAuditLog.create({
        data: {
          action: 'PRODUCTION_BATCH_COMPLETED',
          entityType: 'PRODUCTION_BATCH',
          entityId: pb.id,
          performedBy: req.user?.id || 'Unknown',
          details: JSON.stringify({ 
            status: 'COMPLETED', 
            qtyPure05L: pb.qtyPure05L, brPure05L, 
            qtyPure15L: pb.qtyPure15L, brPure15L, 
            qtyMix05L: pb.qtyMix05L, brMix05L, 
            qtyMix15L: pb.qtyMix15L, brMix15L 
          })
        }
      });

      return pb;
    }, { maxWait: 10000, timeout: 30000 });

    return res.status(200).json({ success: true, data: updatedBatch });
  }

  // AquaSphere Execution Flow
  const packs05LNum = batch.packs05L || 0;
  const packs15LNum = batch.packs15L || 0;
  const quantityNum = batch.quantity || 0;
  
  const broken05LNum = parseInt(brokenBottles05L || 0);
  const broken15LNum = parseInt(brokenBottles15L || 0);
  const wasteQtyNum = parseInt(wasteQuantity || 0);

  if (broken05LNum < 0 || broken15LNum < 0 || wasteQtyNum < 0) {
    throw new ApiError(400, 'Broken quantities cannot be negative');
  }

  const max05LBottles = packs05LNum * 12;
  const max15LBottles = packs15LNum * 6;
  const max19LBottles = quantityNum;

  if (broken05LNum > max05LBottles) {
    throw new ApiError(400, `Broken 0.5L bottles (${broken05LNum}) cannot exceed produced amount (${max05LBottles} pcs)`);
  }
  if (broken15LNum > max15LBottles) {
    throw new ApiError(400, `Broken 1.5L bottles (${broken15LNum}) cannot exceed produced amount (${max15LBottles} pcs)`);
  }
  if (wasteQtyNum > max19LBottles) {
    throw new ApiError(400, `Broken 19L bottles (${wasteQtyNum}) cannot exceed produced amount (${max19LBottles} pcs)`);
  }

  const { deductions, finishedGoods } = calculateProductionBatch({
    packs05L: packs05LNum,
    packs15L: packs15LNum,
    quantity: quantityNum,
    brokenBottles05L: broken05LNum,
    brokenBottles15L: broken15LNum
  }, allItems);

  // Raw Material Stock Validation before deducting
  for (const d of deductions) {
    const item = allItems.find(i => i.id === d.itemId);
    const availableQty = item ? Number(item.cachedQty || 0) : 0;
    const requiredQty = Number(d.quantityUsed || 0);

    if (availableQty < requiredQty) {
      throw new ApiError(400, `❌ Insufficient stock for ${item?.name || 'raw material'} (Required: ${requiredQty} ${item?.unit || ''}, Available: ${availableQty} ${item?.unit || ''})`);
    }
  }

  const updatedBatch = await prisma.$transaction(async (tx) => {
    const pb = await tx.aquasphereProductionBatch.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        brokenBottles05L: broken05LNum,
        brokenBottles15L: broken15LNum,
        wasteQuantity: wasteQtyNum
      }
    });

    if (quantityNum > 0) {
      const netGood19L = Math.max(0, quantityNum - wasteQtyNum);
      const fg19L = allItems.find(i => i.type === 'FINISHED_GOOD' && (i.name.toLowerCase().includes('19l') || i.name.toLowerCase().includes('19 l')));
      if (fg19L && netGood19L > 0) {
        await tx.aquasphereInventoryTransaction.create({
          data: { itemId: fg19L.id, quantity: netGood19L, direction: 'IN', reason: 'PRODUCTION', refType: 'BATCH', refId: pb.id, location: 'FACTORY' }
        });
        await tx.aquasphereItem.update({
          where: { id: fg19L.id }, data: { cachedQty: { increment: netGood19L }, factoryQty: { increment: netGood19L } }
        });
        await tx.aquasphereBottleTransaction.create({
          data: {
            type: 'MOVED_TO_FACTORY',
            quantity: netGood19L,
            reason: `Production Batch #${pb.id.substring(0,8).toUpperCase()}`
          }
        });
      }

      if (wasteQtyNum > 0) {
        await tx.aquasphereBottleTransaction.create({
          data: {
            type: 'RETURNED_BROKEN',
            quantity: wasteQtyNum,
            reason: `Broken in Production Batch #${pb.id.substring(0,8).toUpperCase()}`
          }
        });
      }
    }

    if (deductions.length > 0) {
      await tx.aquasphereProductionBatchConsumption.createMany({
        data: deductions.map(d => ({ batchId: pb.id, itemId: d.itemId, quantityUsed: d.quantityUsed }))
      });
      await tx.aquasphereInventoryTransaction.createMany({
        data: deductions.map(d => ({ itemId: d.itemId, quantity: d.quantityUsed, direction: 'OUT', reason: 'PRODUCTION', refType: 'BATCH', refId: pb.id, location: 'FACTORY' }))
      });
      await Promise.all(deductions.map(d => 
        tx.aquasphereItem.update({ where: { id: d.itemId }, data: { cachedQty: { decrement: d.quantityUsed } } })
      ));
    }

    if (finishedGoods.length > 0) {
      await tx.aquasphereInventoryTransaction.createMany({
        data: finishedGoods.map(fg => ({ itemId: fg.itemId, quantity: fg.quantityAdded, direction: 'IN', reason: 'PRODUCTION', refType: 'BATCH', refId: pb.id, location: 'FACTORY' }))
      });
      await Promise.all(finishedGoods.map(fg => 
        tx.aquasphereItem.update({ where: { id: fg.itemId }, data: { cachedQty: { increment: fg.quantityAdded }, factoryQty: { increment: fg.quantityAdded } } })
      ));
    }

    return pb;
  }, { maxWait: 10000, timeout: 30000 });

  res.status(200).json({ success: true, data: updatedBatch });
});

/**
 * Deletes a production batch and rolls back all inventory impacts (restricted to OWNER role).
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
export const deleteProductionBatch = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const prefix = getTenantPrefix(req);

  if (req.user?.role !== 'OWNER') {
    throw new ApiError(403, 'Only Owner can delete production batches');
  }

  const batch = await prisma[`${prefix}ProductionBatch`].findUnique({
    where: { id }
  });

  if (!batch) {
    throw new ApiError(404, 'Production batch not found');
  }

  await prisma.$transaction(async (tx) => {
    if (batch.status === 'COMPLETED') {
      // Revert Inventory Transactions for this batch
      const txs = await tx[`${prefix}InventoryTransaction`].findMany({
        where: { refType: 'BATCH', refId: id }
      });

      await Promise.all(txs.map(async (t) => {
        const q = Number(t.quantity || 0);
        if (t.direction === 'IN') {
          // Revert finished goods addition
          await tx[`${prefix}Item`].update({
            where: { id: t.itemId },
            data: { cachedQty: { decrement: q } }
          }).catch(() => null);
        } else if (t.direction === 'OUT') {
          // Revert raw material consumption
          await tx[`${prefix}Item`].update({
            where: { id: t.itemId },
            data: { cachedQty: { increment: q } }
          }).catch(() => null);
        }
      }));

      await tx[`${prefix}InventoryTransaction`].deleteMany({
        where: { refType: 'BATCH', refId: id }
      });
    }

    // Delete consumptions if any
    await tx[`${prefix}ProductionBatchConsumption`].deleteMany({
      where: { batchId: id }
    });

    // Delete batch
    await tx[`${prefix}ProductionBatch`].delete({
      where: { id }
    });
  }, { maxWait: 10000, timeout: 30000 });

  res.status(200).json({ success: true, message: 'Production batch deleted successfully' });
});
