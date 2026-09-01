import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { uploadImage } from '../utils/cloudinaryUpload.js';
import { paginationArgs } from '../utils/pagination.js';
import { getTenantPrefix } from '../utils/tenant.js';
import { createAuditLog } from '../utils/auditLog.js';
import { sendSuccess } from '../utils/response.js';

/** Retrieves purchase orders with filtering */
export const getPurchases = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { search, dateFilter } = req.query;

  const where = {};
  if (search) {
    where.OR = [
      { invoiceNo: { contains: search, mode: 'insensitive' } },
      { vendor: { name: { contains: search, mode: 'insensitive' } } }
    ];
  }

  if (dateFilter && dateFilter !== 'ALL') {
    const today = new Date();
    if (dateFilter === 'TODAY') {
      where.createdAt = {
        gte: new Date(today.setHours(0, 0, 0, 0)),
        lte: new Date(today.setHours(23, 59, 59, 999))
      };
    } else if (dateFilter === 'WEEK') {
      where.createdAt = { gte: new Date(today.setDate(today.getDate() - 7)) };
    } else if (dateFilter === 'MONTH') {
      where.createdAt = { gte: new Date(today.setMonth(today.getMonth() - 1)) };
    }
  }

  const purchases = await prisma[`${prefix}Purchase`].findMany({
    where,
    ...paginationArgs(req.query),
    include: {
      vendor: { select: { id: true, name: true } },
      items: {
        select: {
          id: true, itemId: true, quantity: true, unitPrice: true, total: true,
          item: { select: { id: true, name: true, unit: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const nextCursor = purchases.length > 0 ? purchases[purchases.length - 1].id : null;
  return sendSuccess(res, purchases, 200, { nextCursor });
});

/** Retrieves single purchase record */
export const getPurchaseById = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const purchase = await prisma[`${prefix}Purchase`].findUnique({
    where: { id: req.params.id },
    include: {
      vendor: { select: { id: true, name: true } },
      items: {
        select: {
          id: true, itemId: true, quantity: true, unitPrice: true, total: true,
          item: { select: { id: true, name: true, unit: true } }
        }
      },
      ledgerEntries: true
    }
  });
  if (!purchase) throw new ApiError(404, 'Purchase not found');
  return sendSuccess(res, purchase);
});

/** Records a new purchase of raw materials and updates inventory */
export const createPurchase = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const {
    vendorId, invoiceNo, deliveryChallanNo, receivedBy, purchaseDate,
    receiptUrl, remarks, items, deliveredTo, status = 'RECEIVED', paymentStatus = 'PAID'
  } = req.body;

  if (!vendorId) throw new ApiError(400, 'Vendor is required');
  const vendor = await prisma[`${prefix}Vendor`].findUnique({ where: { id: vendorId } });
  if (!vendor) throw new ApiError(404, 'Vendor not found');
  if (vendor.archivedAt) throw new ApiError(400, 'Cannot record purchase for an archived vendor');
  if (!Array.isArray(items) || items.length === 0) throw new ApiError(400, 'Purchase must contain at least one item');

  const destination = (deliveredTo || 'FACTORY').toUpperCase();
  const itemIds = items.map(it => it.itemId).filter(Boolean);
  const rawMaterials = itemIds.length > 0
    ? await prisma[`${prefix}Item`].findMany({ where: { id: { in: itemIds } } })
    : [];
  const rawMatMap = new Map(rawMaterials.map(m => [m.id, m]));

  let grandTotal = 0;
  const validatedItems = [];

  for (const it of items) {
    if (!it.itemId) throw new ApiError(400, 'Item selection is required for all rows');
    const qty = parseFloat(it.quantity);
    const unitPrice = parseFloat(it.unitPrice);

    if (isNaN(qty) || qty <= 0) throw new ApiError(400, 'Quantity must be greater than zero');
    if (isNaN(unitPrice) || unitPrice < 0) throw new ApiError(400, 'Unit price cannot be negative');

    const rawMat = rawMatMap.get(it.itemId);
    if (!rawMat) throw new ApiError(404, `Raw Material #${it.itemId} not found`);
    if (rawMat.archivedAt) throw new ApiError(400, `Material "${rawMat.name}" is archived`);

    const lineTotal = qty * unitPrice;
    grandTotal += lineTotal;
    validatedItems.push({ itemId: it.itemId, quantity: qty, unitPrice, total: lineTotal, itemName: rawMat.name });
  }

  const formattedRemarks = [
    deliveryChallanNo ? `Challan #${deliveryChallanNo}` : null,
    receivedBy ? `Received By: ${receivedBy}` : null,
    remarks
  ].filter(Boolean).join(' | ');

  const purchase = await prisma.$transaction(async (tx) => {
    const newPurchase = await tx[`${prefix}Purchase`].create({
      data: {
        vendorId,
        invoiceNo: invoiceNo || `INV-${Date.now()}`,
        receiptUrl: receiptUrl || null,
        remarks: formattedRemarks,
        deliveredTo: destination,
        status: status || 'RECEIVED',
        paymentStatus: paymentStatus || 'PAID',
        grandTotal,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
        createdBy: req.user?.name ? `${req.user.name} (${req.user.role})` : 'Production Manager'
      }
    });

    for (const vItem of validatedItems) {
      await tx[`${prefix}PurchaseItem`].create({
        data: { purchaseId: newPurchase.id, itemId: vItem.itemId, quantity: vItem.quantity, unitPrice: vItem.unitPrice, total: vItem.total }
      });

      const updateData = { cachedQty: { increment: vItem.quantity } };
      if (destination === 'FACTORY') updateData.factoryQty = { increment: vItem.quantity };
      else if (destination === 'WAREHOUSE') updateData.warehouseQty = { increment: vItem.quantity };

      await tx[`${prefix}Item`].update({ where: { id: vItem.itemId }, data: updateData });

      if (vItem.itemName && vItem.itemName.toLowerCase().includes('19l')) {
        await tx[`${prefix}BottleTransaction`].create({
          data: { type: 'NEW_PURCHASE', quantity: Math.round(vItem.quantity), reason: `Purchase Invoice #${newPurchase.invoiceNo}` }
        });
      }

      await tx[`${prefix}InventoryTransaction`].create({
        data: { itemId: vItem.itemId, quantity: vItem.quantity, direction: 'IN', reason: 'NEW_PURCHASE', refType: 'PURCHASE', refId: newPurchase.id }
      });
    }

    await tx[`${prefix}VendorLedgerEntry`].create({
      data: { vendorId, purchaseId: newPurchase.id, type: 'PURCHASE', amount: grandTotal, remarks: `Purchase ${newPurchase.invoiceNo}` }
    });

    await createAuditLog(prefix, {
      action: 'PURCHASE_CREATED',
      entityType: 'PURCHASE',
      entityId: newPurchase.id,
      performedBy: req.user?.id || 'SYSTEM',
      details: JSON.stringify({ vendorName: vendor.name, invoiceNo: newPurchase.invoiceNo, grandTotal, itemCount: validatedItems.length })
    });

    return newPurchase;
  }, { maxWait: 10000, timeout: 30000 });

  const fullPurchase = await prisma[`${prefix}Purchase`].findUnique({
    where: { id: purchase.id },
    include: { vendor: true, items: { include: { item: true } } }
  });

  return sendSuccess(res, fullPurchase, 201);
});

/** Uploads purchase invoice or receipt document */
export const uploadReceipt = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  if (!req.file) throw new ApiError(400, 'Receipt file is required');
  const { secure_url } = await uploadImage(req.file, `${prefix}/receipts`);
  return sendSuccess(res, { receiptUrl: secure_url });
});

/** Marks purchase order as verified by accountant */
export const approvePurchase = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { id } = req.params;

  const purchase = await prisma[`${prefix}Purchase`].findUnique({ where: { id } });
  if (!purchase) throw new ApiError(404, 'Purchase not found');

  const updated = await prisma[`${prefix}Purchase`].update({
    where: { id },
    data: { verifiedBy: req.user?.name || req.user?.id || 'Accountant', verifiedAt: new Date() }
  });

  await createAuditLog(prefix, {
    action: 'PURCHASE_VERIFIED',
    entityType: 'PURCHASE',
    entityId: id,
    performedBy: req.user?.name || req.user?.id || 'Accountant',
    details: JSON.stringify({ invoiceNo: purchase.invoiceNo })
  });

  return sendSuccess(res, updated, 200, { message: 'Purchase verified successfully' });
});

/** Deletes purchase record and rolls back stock / ledger (OWNER only) */
export const deletePurchase = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { id } = req.params;

  if (req.user?.role !== 'OWNER') throw new ApiError(403, 'Only the OWNER can delete purchase records');

  const purchase = await prisma[`${prefix}Purchase`].findUnique({
    where: { id },
    include: { items: true }
  });
  if (!purchase) throw new ApiError(404, 'Purchase not found');

  await prisma.$transaction(async (tx) => {
    for (const pItem of purchase.items) {
      await tx[`${prefix}Item`].update({ where: { id: pItem.itemId }, data: { cachedQty: { decrement: pItem.quantity } } });
      await tx[`${prefix}InventoryTransaction`].create({
        data: { itemId: pItem.itemId, quantity: pItem.quantity, direction: 'OUT', reason: 'PURCHASE_DELETED_REVERSAL', refType: 'PURCHASE', refId: purchase.id }
      });
    }

    await tx[`${prefix}VendorLedgerEntry`].deleteMany({ where: { purchaseId: purchase.id } });
    await tx[`${prefix}PurchaseItem`].deleteMany({ where: { purchaseId: purchase.id } });
    await tx[`${prefix}Purchase`].delete({ where: { id: purchase.id } });

    await createAuditLog(prefix, {
      action: 'PURCHASE_DELETED',
      entityType: 'PURCHASE',
      entityId: id,
      performedBy: req.user?.name || req.user?.id || 'OWNER',
      details: JSON.stringify({ invoiceNo: purchase.invoiceNo, grandTotal: purchase.grandTotal })
    });
  }, { maxWait: 10000, timeout: 30000 });

  return sendSuccess(res, null, 200, { message: 'Purchase deleted and stock/ledger reversed successfully' });
});

/** Updates status or paymentStatus for a purchase */
export const updatePurchaseStatus = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { id } = req.params;
  const { status, paymentStatus } = req.body;

  const existing = await prisma[`${prefix}Purchase`].findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, 'Purchase not found');

  const updateData = {};
  if (status) updateData.status = status;
  if (paymentStatus) updateData.paymentStatus = paymentStatus;

  const updated = await prisma[`${prefix}Purchase`].update({
    where: { id },
    data: updateData,
    include: { vendor: true, items: { include: { item: true } } }
  });

  return sendSuccess(res, updated);
});

