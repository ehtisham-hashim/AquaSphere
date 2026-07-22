import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { uploadToCloudinary } from '../utils/cloudinaryUpload.js';
import { paginationArgs } from '../utils/pagination.js';

const getTenantPrefix = (req) => {
  const tenant = (req.headers['x-tenant'] || 'aquasphere').toLowerCase();
  return tenant === 'wadaana' ? 'wadaana' : 'aquasphere';
};

export const getPurchases = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const purchases = await prisma[`${prefix}Purchase`].findMany({
    ...paginationArgs(req.query),
    include: {
      vendor: true,
      items: {
        include: {
          item: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  const nextCursor = purchases.length > 0 ? purchases[purchases.length - 1].id : null;
  res.json({ success: true, data: purchases, nextCursor });
});

export const getPurchaseById = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { id } = req.params;
  const purchase = await prisma[`${prefix}Purchase`].findUnique({
    where: { id },
    include: {
      vendor: true,
      items: {
        include: {
          item: true
        }
      },
      ledgerEntries: true
    }
  });
  if (!purchase) throw new ApiError(404, 'Purchase not found');
  res.json({ success: true, data: purchase });
});

export const createPurchase = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { vendorId, invoiceNo, purchaseDate, receiptUrl, remarks, items } = req.body;

  if (!vendorId) throw new ApiError(400, 'Vendor is required');

  const vendor = await prisma[`${prefix}Vendor`].findUnique({ where: { id: vendorId } });
  if (!vendor) throw new ApiError(404, 'Vendor not found');
  if (vendor.archivedAt) throw new ApiError(400, 'Cannot record purchase for an archived vendor');

  if (!receiptUrl || typeof receiptUrl !== 'string' || !receiptUrl.trim()) {
    throw new ApiError(400, 'Bill photo/receipt URL is required');
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, 'Purchase must contain at least one item');
  }

  let grandTotal = 0;
  const validatedItems = [];

  for (const it of items) {
    if (!it.itemId) throw new ApiError(400, 'Item selection is required for all rows');
    
    const qty = parseFloat(it.quantity);
    const unitPrice = parseFloat(it.unitPrice);

    if (isNaN(qty) || qty <= 0) throw new ApiError(400, 'Quantity must be greater than zero');
    if (isNaN(unitPrice) || unitPrice <= 0) throw new ApiError(400, 'Unit price must be greater than zero');

    const rawMat = await prisma[`${prefix}Item`].findUnique({ where: { id: it.itemId } });
    if (!rawMat) throw new ApiError(404, `Raw material ${it.itemId} not found`);
    if (rawMat.archivedAt) throw new ApiError(400, `Material "${rawMat.name}" is archived and cannot be purchased`);

    const lineTotal = qty * unitPrice;
    grandTotal += lineTotal;

    validatedItems.push({
      itemId: it.itemId,
      quantity: qty,
      unitPrice,
      total: lineTotal,
      rawMat
    });
  }

  const purchase = await prisma.$transaction(async (tx) => {
    const newPurchase = await tx[`${prefix}Purchase`].create({
      data: {
        vendorId,
        invoiceNo: invoiceNo || `INV-${Date.now()}`,
        receiptUrl,
        remarks: remarks || '',
        grandTotal,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
        createdBy: req.user?.id || 'SYSTEM'
      }
    });

    for (const vItem of validatedItems) {
      await tx[`${prefix}PurchaseItem`].create({
        data: {
          purchaseId: newPurchase.id,
          itemId: vItem.itemId,
          quantity: vItem.quantity,
          unitPrice: vItem.unitPrice,
          total: vItem.total
        }
      });

      await tx[`${prefix}Item`].update({
        where: { id: vItem.itemId },
        data: { cachedQty: { increment: vItem.quantity } }
      });

      await tx[`${prefix}InventoryTransaction`].create({
        data: {
          itemId: vItem.itemId,
          quantity: vItem.quantity,
          direction: 'IN',
          reason: 'NEW_PURCHASE',
          refType: 'PURCHASE',
          refId: newPurchase.id
        }
      });
    }

    await tx[`${prefix}VendorLedgerEntry`].create({
      data: {
        vendorId,
        purchaseId: newPurchase.id,
        type: 'PURCHASE',
        amount: grandTotal,
        remarks: `Purchase ${newPurchase.invoiceNo}`
      }
    });

    await tx[`${prefix}AuditLog`].create({
      data: {
        action: 'PURCHASE_CREATED',
        entityType: 'PURCHASE',
        entityId: newPurchase.id,
        details: JSON.stringify({
          vendorName: vendor.name,
          invoiceNo: newPurchase.invoiceNo,
          grandTotal,
          itemCount: validatedItems.length
        }),
        performedBy: req.user?.id || 'SYSTEM'
      }
    });

    return newPurchase;
  });

  const fullPurchase = await prisma[`${prefix}Purchase`].findUnique({
    where: { id: purchase.id },
    include: { vendor: true, items: { include: { item: true } } }
  });

  res.status(201).json({ success: true, data: fullPurchase });
});

export const uploadReceipt = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  if (!req.file) throw new ApiError(400, 'Receipt file is required. Please attach an image or PDF.');
  const receiptUrl = await uploadToCloudinary(req.file.buffer, `${prefix}/receipts`);
  res.status(200).json({ success: true, receiptUrl });
});
