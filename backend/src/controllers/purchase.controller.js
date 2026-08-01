import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { uploadImage } from '../utils/cloudinaryUpload.js';
import { paginationArgs } from '../utils/pagination.js';

const getTenantPrefix = (req) => {
  const tenant = (req.headers['x-tenant'] || 'aquasphere').toLowerCase();
  return tenant === 'wadaana' ? 'wadaana' : 'aquasphere';
};

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
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));
      where.createdAt = { gte: startOfDay, lte: endOfDay };
    } else if (dateFilter === 'WEEK') {
      const weekAgo = new Date(today.setDate(today.getDate() - 7));
      where.createdAt = { gte: weekAgo };
    } else if (dateFilter === 'MONTH') {
      const monthAgo = new Date(today.setMonth(today.getMonth() - 1));
      where.createdAt = { gte: monthAgo };
    }
  }

  const purchases = await prisma[`${prefix}Purchase`].findMany({
    where,
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
  const { 
    vendorId, 
    invoiceNo, 
    deliveryChallanNo,
    receivedBy,
    purchaseDate, 
    receiptUrl, 
    remarks, 
    items, 
    deliveredTo,
    status = 'RECEIVED',
    paymentStatus = 'PAID'
  } = req.body;

  if (!vendorId) throw new ApiError(400, 'Vendor is required');

  const vendor = await prisma[`${prefix}Vendor`].findUnique({ where: { id: vendorId } });
  if (!vendor) throw new ApiError(404, 'Vendor not found');
  if (vendor.archivedAt) throw new ApiError(400, 'Cannot record purchase for an archived vendor');

  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, 'Purchase must contain at least one item');
  }

  const destination = (deliveredTo || 'FACTORY').toUpperCase();

  let grandTotal = 0;
  const validatedItems = [];

  for (const it of items) {
    if (!it.itemId) throw new ApiError(400, 'Item selection is required for all rows');
    
    const qty = parseFloat(it.quantity);
    const unitPrice = parseFloat(it.unitPrice);

    if (isNaN(qty) || qty <= 0) throw new ApiError(400, 'Quantity must be greater than zero');
    if (isNaN(unitPrice) || unitPrice < 0) throw new ApiError(400, 'Unit price cannot be negative');

    const rawMat = await prisma[`${prefix}Item`].findUnique({ where: { id: it.itemId } });
    if (!rawMat) throw new ApiError(404, `Raw Material #${it.itemId} not found`);
    if (rawMat.archivedAt) throw new ApiError(400, `Material "${rawMat.name}" is archived and cannot be purchased`);

    const lineTotal = qty * unitPrice;
    grandTotal += lineTotal;

    validatedItems.push({
      itemId: it.itemId,
      quantity: qty,
      unitPrice,
      total: lineTotal,
      itemName: rawMat.name
    });
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

      const itemInfo = await tx[`${prefix}Item`].findUnique({ where: { id: vItem.itemId } });
      if (itemInfo && (itemInfo.name.toLowerCase().includes('19l') || itemInfo.name.toLowerCase().includes('19 l'))) {
        await tx[`${prefix}BottleTransaction`].create({
          data: {
            type: 'NEW_PURCHASE',
            quantity: Math.round(vItem.quantity),
            reason: `Purchase Invoice #${newPurchase.invoiceNo}`
          }
        });
      }

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
  const { secure_url } = await uploadImage(req.file, `${prefix}/receipts`);
  res.status(200).json({ success: true, receiptUrl: secure_url });
});

export const approvePurchase = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { id } = req.params;

  const purchase = await prisma[`${prefix}Purchase`].findUnique({ where: { id } });
  if (!purchase) throw new ApiError(404, 'Purchase not found');

  const updated = await prisma[`${prefix}Purchase`].update({
    where: { id },
    data: {
      verifiedBy: req.user?.name || req.user?.id || 'Accountant',
      verifiedAt: new Date()
    }
  });

  await prisma[`${prefix}AuditLog`].create({
    data: {
      action: 'PURCHASE_VERIFIED',
      entityType: 'PURCHASE',
      entityId: id,
      performedBy: req.user?.name || req.user?.id || 'Accountant',
      details: JSON.stringify({ invoiceNo: purchase.invoiceNo })
    }
  });

  res.status(200).json({ success: true, data: updated, message: 'Purchase verified successfully' });
});

export const deletePurchase = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { id } = req.params;

  if (req.user?.role !== 'OWNER') {
    throw new ApiError(430, 'Only the OWNER can delete purchase records');
  }

  const purchase = await prisma[`${prefix}Purchase`].findUnique({
    where: { id },
    include: { items: true }
  });

  if (!purchase) throw new ApiError(404, 'Purchase not found');

  await prisma.$transaction(async (tx) => {
    // 1. Reverse inventory cached quantities
    for (const pItem of purchase.items) {
      await tx[`${prefix}Item`].update({
        where: { id: pItem.itemId },
        data: { cachedQty: { decrement: pItem.quantity } }
      });

      await tx[`${prefix}InventoryTransaction`].create({
        data: {
          itemId: pItem.itemId,
          quantity: pItem.quantity,
          direction: 'OUT',
          reason: 'PURCHASE_DELETED_REVERSAL',
          refType: 'PURCHASE',
          refId: purchase.id
        }
      });
    }

    // 2. Delete Vendor Ledger Entry
    await tx[`${prefix}VendorLedgerEntry`].deleteMany({
      where: { purchaseId: purchase.id }
    });

    // 3. Delete Purchase Items & Purchase Record
    await tx[`${prefix}PurchaseItem`].deleteMany({
      where: { purchaseId: purchase.id }
    });

    await tx[`${prefix}Purchase`].delete({
      where: { id: purchase.id }
    });

    // 4. Audit log
    await tx[`${prefix}AuditLog`].create({
      data: {
        action: 'PURCHASE_DELETED',
        entityType: 'PURCHASE',
        entityId: id,
        performedBy: req.user?.name || req.user?.id || 'OWNER',
        details: JSON.stringify({ invoiceNo: purchase.invoiceNo, grandTotal: purchase.grandTotal })
      }
    });
  });

  res.status(200).json({ success: true, message: 'Purchase deleted and stock/ledger reversed successfully' });
});

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
    include: {
      vendor: true,
      items: {
        include: {
          item: true
        }
      }
    }
  });

  res.json({ success: true, data: updated });
});
