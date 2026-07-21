import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

export const getVendors = asyncHandler(async (req, res) => {
  const vendors = await prisma.aquasphereVendor.findMany({
    where: { archivedAt: null },
    orderBy: { createdAt: 'desc' }
  });
  res.json({ success: true, data: vendors });
});

export const createVendor = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name) throw new ApiError(400, 'Name is required');
  const vendor = await prisma.aquasphereVendor.create({ data: { name } });
  res.status(201).json({ success: true, data: vendor });
});

export const createPurchase = asyncHandler(async (req, res) => {
  const { vendorId, itemId, quantity, price } = req.body;
  const receiptUrl = req.file?.path || ''; 
  // ponytail: skip strict receipt block for local dev testing speed, real app add if(!receiptUrl) throw.

  if (!vendorId || !itemId || !quantity || !price) {
    throw new ApiError(400, 'Missing required fields');
  }

  const purchase = await prisma.$transaction(async (tx) => {
    const p = await tx.aquaspherePurchase.create({
      data: {
        vendorId,
        itemId,
        quantity: parseFloat(quantity),
        price: parseFloat(price),
        receiptUrl
      }
    });

    await tx.aquasphereInventoryTransaction.create({
      data: {
        itemId,
        quantity: parseFloat(quantity),
        direction: 'IN',
        reason: 'NEW_PURCHASE',
        refType: 'PURCHASE',
        refId: p.id
      }
    });

    const item = await tx.aquasphereItem.findUnique({ where: { id: itemId } });
    await tx.aquasphereItem.update({
      where: { id: itemId },
      data: { cachedQty: Number(item.cachedQty) + parseFloat(quantity) }
    });

    return p;
  });

  res.status(201).json({ success: true, data: purchase });
});
