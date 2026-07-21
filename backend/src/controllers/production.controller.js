import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

export const createProductionBatch = asyncHandler(async (req, res) => {
  const { outputItemId, quantity } = req.body;
  
  if (!outputItemId || !quantity) {
    throw new ApiError(400, 'Output item and quantity required');
  }

  const batch = await prisma.$transaction(async (tx) => {
    // 1. Create Production Batch
    const pb = await tx.aquasphereProductionBatch.create({
      data: {
        outputItemId,
        quantity: parseInt(quantity)
      }
    });

    // 2. Increase Finished Good Inventory
    await tx.aquasphereInventoryTransaction.create({
      data: {
        itemId: outputItemId,
        quantity: parseInt(quantity),
        direction: 'IN',
        reason: 'PRODUCTION',
        refType: 'BATCH',
        refId: pb.id
      }
    });

    const item = await tx.aquasphereItem.findUnique({ where: { id: outputItemId } });
    await tx.aquasphereItem.update({
      where: { id: outputItemId },
      data: { cachedQty: Number(item.cachedQty) + parseInt(quantity) }
    });

    // ponytail: Skipped full raw material auto-deduction (bottles, caps, labels, shrink wrap) 
    // because it requires a predefined BOM (Bill of Materials) mapping for exact item IDs.
    // Add when BOM config is defined in DB.
    
    return pb;
  });

  res.status(201).json({ success: true, data: batch });
});
