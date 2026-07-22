import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

// Dynamic tenant helper
const getTenantPrefix = (req) => {
  const tenant = (req.headers['x-tenant'] || 'aquasphere').toLowerCase();
  return tenant === 'wadaana' ? 'wadaana' : 'aquasphere';
};

export const getProductionBatches = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const batches = await prisma[`${prefix}ProductionBatch`].findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      outputItem: { select: { name: true } }
    }
  });
  res.json({ success: true, data: batches });
});

export const createProductionBatch = asyncHandler(async (req, res) => {
  const { outputItemId, quantity, wasteQuantity, remarks } = req.body;
  const prefix = getTenantPrefix(req);
  
  if (!outputItemId || !quantity) {
    throw new ApiError(400, 'Output item and quantity required');
  }

  const batch = await prisma.$transaction(async (tx) => {
    // 1. Create Production Batch
    const pb = await tx[`${prefix}ProductionBatch`].create({
      data: {
        outputItemId,
        quantity: parseInt(quantity),
        wasteQuantity: wasteQuantity ? parseInt(wasteQuantity) : 0,
        remarks: remarks || null
      }
    });

    // 2. Increase Finished Good Inventory
    await tx[`${prefix}InventoryTransaction`].create({
      data: {
        itemId: outputItemId,
        quantity: parseInt(quantity),
        direction: 'IN',
        reason: 'PRODUCTION',
        refType: 'BATCH',
        refId: pb.id
      }
    });

    await tx[`${prefix}Item`].update({
      where: { id: outputItemId },
      data: { cachedQty: { increment: parseInt(quantity) } }
    });

    // 3. BOM Auto-Deduction for Raw Materials
    const recipes = await tx[`${prefix}RecipeItem`].findMany({
      where: { finishedGoodId: outputItemId }
    });

    for (const recipe of recipes) {
      const consumedQty = Number(recipe.quantityPerUnit) * parseInt(quantity);
      
      // Deduct raw material
      await tx[`${prefix}InventoryTransaction`].create({
        data: {
          itemId: recipe.rawMaterialId,
          quantity: consumedQty,
          direction: 'OUT',
          reason: 'CONSUMED_IN_PRODUCTION',
          refType: 'BATCH',
          refId: pb.id
        }
      });

      await tx[`${prefix}Item`].update({
        where: { id: recipe.rawMaterialId },
        data: { cachedQty: { decrement: consumedQty } }
      });
    }

    // 4. Handle Waste
    if (wasteQuantity && parseInt(wasteQuantity) > 0) {
      if (req.body.wasteItemId) {
         await tx[`${prefix}InventoryTransaction`].create({
          data: {
            itemId: req.body.wasteItemId,
            quantity: parseInt(wasteQuantity),
            direction: 'OUT',
            reason: 'BROKEN_WASTE',
            refType: 'BATCH',
            refId: pb.id
          }
        });
        await tx[`${prefix}Item`].update({
          where: { id: req.body.wasteItemId },
          data: { cachedQty: { decrement: parseInt(wasteQuantity) } }
        });
      }
    }

    return pb;
  });

  res.status(201).json({ success: true, data: batch });
});
