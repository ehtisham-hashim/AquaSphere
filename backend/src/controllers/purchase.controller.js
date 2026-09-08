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
      { vendor: { name: { contains: search, mode: 'insensitive' } } },
      { items: { some: { item: { name: { contains: search, mode: 'insensitive' } } } } }
    ];
  }

  if (dateFilter && dateFilter !== 'ALL') {
    const today = new Date();
    if (dateFilter === 'TODAY') {
      const start = new Date(today);
      start.setHours(0, 0, 0, 0);
      const end = new Date(today);
      end.setHours(23, 59, 59, 999);
      where.purchaseDate = { gte: start, lte: end };
    } else if (dateFilter === 'WEEK') {
      const past = new Date(today);
      past.setDate(past.getDate() - 7);
      past.setHours(0, 0, 0, 0);
      where.purchaseDate = { gte: past };
    } else if (dateFilter === 'MONTH') {
      const past = new Date(today);
      past.setMonth(past.getMonth() - 1);
      past.setHours(0, 0, 0, 0);
      where.purchaseDate = { gte: past };
    }
  }

  const purchases = await prisma[`${prefix}Purchase`].findMany({
    where,
    ...paginationArgs(req.query),
    include: {
      vendor: { select: { id: true, name: true, phone: true } },
      items: {
        select: {
          id: true, itemId: true, quantity: true, unitPrice: true, total: true,
          item: { select: { id: true, name: true, unit: true } }
        }
      }
    },
    orderBy: [
      { purchaseDate: 'desc' },
      { createdAt: 'desc' }
    ]
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
      vendor: { select: { id: true, name: true, phone: true, address: true } },
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

/** Generates a guaranteed unique invoice number candidate in PUR-YYYYMMDD-XXXX format */
const generateUniqueInvoiceNo = async (tx, prefix) => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  let invoiceCandidate = '';
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 10) {
    attempts++;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    invoiceCandidate = `PUR-${dateStr}-${randomSuffix}`;
    const existing = await tx[`${prefix}Purchase`].findFirst({
      where: { invoiceNo: invoiceCandidate },
      select: { id: true }
    });
    if (!existing) {
      isUnique = true;
    }
  }

  return invoiceCandidate;
};

/** Records a new purchase of raw materials and updates inventory */
export const createPurchase = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const {
    vendorId, invoiceNo, deliveryChallanNo, receivedBy, purchaseDate,
    receiptUrl, remarks, items, deliveredTo, status = 'RECEIVED', paymentStatus = 'CREDIT'
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

  const finalPurchaseDate = purchaseDate ? new Date(purchaseDate) : new Date();
  const finalPaymentStatus = paymentStatus === 'PAID' ? 'PAID' : 'CREDIT';

  const formattedRemarks = [
    deliveryChallanNo ? `Challan #${deliveryChallanNo}` : null,
    receivedBy ? `Received By: ${receivedBy}` : null,
    remarks
  ].filter(Boolean).join(' | ');

  const purchase = await prisma.$transaction(async (tx) => {
    // Generate or validate guaranteed unique invoice number
    let finalInvoiceNo = invoiceNo && invoiceNo.trim();
    if (finalInvoiceNo) {
      const existingWithNo = await tx[`${prefix}Purchase`].findFirst({
        where: { invoiceNo: finalInvoiceNo },
        select: { id: true }
      });
      if (existingWithNo) {
        finalInvoiceNo = await generateUniqueInvoiceNo(tx, prefix);
      }
    } else {
      finalInvoiceNo = await generateUniqueInvoiceNo(tx, prefix);
    }

    const newPurchase = await tx[`${prefix}Purchase`].create({
      data: {
        vendorId,
        invoiceNo: finalInvoiceNo,
        receiptUrl: receiptUrl || null,
        remarks: formattedRemarks,
        deliveredTo: destination,
        status: status || 'RECEIVED',
        paymentStatus: finalPaymentStatus,
        grandTotal,
        purchaseDate: finalPurchaseDate,
        createdBy: req.user?.name ? `${req.user.name} (${req.user.role})` : 'Staff'
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

      const updateData = { cachedQty: { increment: vItem.quantity } };
      if (destination === 'FACTORY') updateData.factoryQty = { increment: vItem.quantity };
      else if (destination === 'WAREHOUSE') updateData.warehouseQty = { increment: vItem.quantity };

      await tx[`${prefix}Item`].update({ where: { id: vItem.itemId }, data: updateData });

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

    // 1. Always record the PURCHASE entry in vendor ledger
    await tx[`${prefix}VendorLedgerEntry`].create({
      data: {
        vendorId,
        purchaseId: newPurchase.id,
        type: 'PURCHASE',
        amount: grandTotal,
        remarks: `Purchase ${newPurchase.invoiceNo}`,
        createdAt: finalPurchaseDate
      }
    });

    // 2. If marked PAID at purchase, record immediate cash payment so vendor ledger balance stays zero
    if (finalPaymentStatus === 'PAID') {
      await tx[`${prefix}VendorPayment`].create({
        data: {
          vendorId,
          amount: grandTotal,
          paymentMethod: 'CASH',
          referenceNo: newPurchase.invoiceNo,
          remarks: `Cash payment at purchase (${newPurchase.invoiceNo})`,
          createdAt: finalPurchaseDate
        }
      });

      await tx[`${prefix}VendorLedgerEntry`].create({
        data: {
          vendorId,
          purchaseId: newPurchase.id,
          type: 'PAYMENT',
          amount: grandTotal,
          remarks: `Cash Paid for Purchase ${newPurchase.invoiceNo}`,
          createdAt: finalPurchaseDate
        }
      });
    }

    await createAuditLog(prefix, {
      action: 'PURCHASE_CREATED',
      entityType: 'PURCHASE',
      entityId: newPurchase.id,
      performedBy: req.user?.id || 'SYSTEM',
      details: JSON.stringify({ vendorName: vendor.name, invoiceNo: newPurchase.invoiceNo, grandTotal, paymentStatus: finalPaymentStatus })
    });

    return newPurchase;
  }, { maxWait: 10000, timeout: 30000 });

  const fullPurchase = await prisma[`${prefix}Purchase`].findUnique({
    where: { id: purchase.id },
    include: { vendor: true, items: { include: { item: true } } }
  });

  return sendSuccess(res, fullPurchase, 201);
});

/** Updates an existing purchase record atomically (OWNER only) */
export const updatePurchase = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { id } = req.params;
  const {
    vendorId, deliveryChallanNo, receivedBy, purchaseDate,
    receiptUrl, remarks, items, deliveredTo, status, paymentStatus
  } = req.body;

  if (req.user?.role !== 'OWNER') {
    throw new ApiError(403, 'Only the OWNER can modify purchase records');
  }

  const existing = await prisma[`${prefix}Purchase`].findUnique({
    where: { id },
    include: { items: true, vendor: true }
  });
  if (!existing) throw new ApiError(404, 'Purchase not found');

  const targetVendorId = vendorId || existing.vendorId;
  const vendor = await prisma[`${prefix}Vendor`].findUnique({ where: { id: targetVendorId } });
  if (!vendor) throw new ApiError(404, 'Vendor not found');

  const oldDestination = (existing.deliveredTo || 'FACTORY').toUpperCase();
  const newDestination = (deliveredTo || existing.deliveredTo || 'FACTORY').toUpperCase();
  const finalPurchaseDate = purchaseDate ? new Date(purchaseDate) : existing.purchaseDate;
  const finalPaymentStatus = paymentStatus ? (paymentStatus === 'PAID' ? 'PAID' : 'CREDIT') : existing.paymentStatus;
  const finalInvoiceNo = existing.invoiceNo; // Uneditable: strictly preserves existing invoice number

  const formattedRemarks = [
    deliveryChallanNo ? `Challan #${deliveryChallanNo}` : null,
    receivedBy ? `Received By: ${receivedBy}` : null,
    remarks !== undefined ? remarks : existing.remarks
  ].filter(Boolean).join(' | ');

  // Validate items if provided
  let validatedItems = null;
  let newGrandTotal = Number(existing.grandTotal);

  if (Array.isArray(items) && items.length > 0) {
    const itemIds = items.map(it => it.itemId).filter(Boolean);
    const rawMaterials = await prisma[`${prefix}Item`].findMany({ where: { id: { in: itemIds } } });
    const rawMatMap = new Map(rawMaterials.map(m => [m.id, m]));

    newGrandTotal = 0;
    validatedItems = [];
    for (const it of items) {
      if (!it.itemId) throw new ApiError(400, 'Item selection is required for all rows');
      const qty = parseFloat(it.quantity);
      const unitPrice = parseFloat(it.unitPrice);
      if (isNaN(qty) || qty <= 0) throw new ApiError(400, 'Quantity must be greater than zero');
      if (isNaN(unitPrice) || unitPrice < 0) throw new ApiError(400, 'Unit price cannot be negative');

      const rawMat = rawMatMap.get(it.itemId);
      if (!rawMat) throw new ApiError(404, `Raw Material #${it.itemId} not found`);

      const lineTotal = qty * unitPrice;
      newGrandTotal += lineTotal;
      validatedItems.push({ itemId: it.itemId, quantity: qty, unitPrice, total: lineTotal });
    }
  }

  const updatedPurchase = await prisma.$transaction(async (tx) => {
    // 1. If items were changed, revert old inventory and apply new inventory
    if (validatedItems) {
      for (const oldItem of existing.items) {
        const revertData = { cachedQty: { decrement: oldItem.quantity } };
        if (oldDestination === 'FACTORY') revertData.factoryQty = { decrement: oldItem.quantity };
        else if (oldDestination === 'WAREHOUSE') revertData.warehouseQty = { decrement: oldItem.quantity };
        await tx[`${prefix}Item`].update({ where: { id: oldItem.itemId }, data: revertData });
      }

      await tx[`${prefix}PurchaseItem`].deleteMany({ where: { purchaseId: id } });

      for (const newItem of validatedItems) {
        await tx[`${prefix}PurchaseItem`].create({
          data: {
            purchaseId: id,
            itemId: newItem.itemId,
            quantity: newItem.quantity,
            unitPrice: newItem.unitPrice,
            total: newItem.total
          }
        });

        const addData = { cachedQty: { increment: newItem.quantity } };
        if (newDestination === 'FACTORY') addData.factoryQty = { increment: newItem.quantity };
        else if (newDestination === 'WAREHOUSE') addData.warehouseQty = { increment: newItem.quantity };
        await tx[`${prefix}Item`].update({ where: { id: newItem.itemId }, data: addData });

        await tx[`${prefix}InventoryTransaction`].create({
          data: {
            itemId: newItem.itemId,
            quantity: newItem.quantity,
            direction: 'IN',
            reason: 'PURCHASE_UPDATED',
            refType: 'PURCHASE',
            refId: id
          }
        });
      }
    } else if (newDestination !== oldDestination) {
      // If only destination changed, move stock between locations
      for (const it of existing.items) {
        const moveOld = {};
        if (oldDestination === 'FACTORY') moveOld.factoryQty = { decrement: it.quantity };
        else if (oldDestination === 'WAREHOUSE') moveOld.warehouseQty = { decrement: it.quantity };
        await tx[`${prefix}Item`].update({ where: { id: it.itemId }, data: moveOld });

        const moveNew = {};
        if (newDestination === 'FACTORY') moveNew.factoryQty = { increment: it.quantity };
        else if (newDestination === 'WAREHOUSE') moveNew.warehouseQty = { increment: it.quantity };
        await tx[`${prefix}Item`].update({ where: { id: it.itemId }, data: moveNew });
      }
    }

    // 2. Update Purchase Header
    const updated = await tx[`${prefix}Purchase`].update({
      where: { id },
      data: {
        vendorId: targetVendorId,
        invoiceNo: finalInvoiceNo,
        deliveredTo: newDestination,
        remarks: formattedRemarks,
        receiptUrl: receiptUrl !== undefined ? receiptUrl : existing.receiptUrl,
        purchaseDate: finalPurchaseDate,
        status: status || existing.status,
        paymentStatus: finalPaymentStatus,
        grandTotal: newGrandTotal
      }
    });

    // 3. Reconcile Vendor Ledger and Payments
    await tx[`${prefix}VendorLedgerEntry`].deleteMany({ where: { purchaseId: id } });
    await tx[`${prefix}VendorPayment`].deleteMany({
      where: { vendorId: existing.vendorId, referenceNo: existing.invoiceNo }
    });

    await tx[`${prefix}VendorLedgerEntry`].create({
      data: {
        vendorId: targetVendorId,
        purchaseId: id,
        type: 'PURCHASE',
        amount: newGrandTotal,
        remarks: `Purchase ${finalInvoiceNo}`,
        createdAt: finalPurchaseDate
      }
    });

    if (finalPaymentStatus === 'PAID') {
      await tx[`${prefix}VendorPayment`].create({
        data: {
          vendorId: targetVendorId,
          amount: newGrandTotal,
          paymentMethod: 'CASH',
          referenceNo: finalInvoiceNo,
          remarks: `Cash payment at purchase (${finalInvoiceNo})`,
          createdAt: finalPurchaseDate
        }
      });

      await tx[`${prefix}VendorLedgerEntry`].create({
        data: {
          vendorId: targetVendorId,
          purchaseId: id,
          type: 'PAYMENT',
          amount: newGrandTotal,
          remarks: `Cash Paid for Purchase ${finalInvoiceNo}`,
          createdAt: finalPurchaseDate
        }
      });
    }

    await createAuditLog(prefix, {
      action: 'PURCHASE_UPDATED',
      entityType: 'PURCHASE',
      entityId: id,
      performedBy: req.user?.id || 'OWNER',
      details: JSON.stringify({ invoiceNo: finalInvoiceNo, grandTotal: newGrandTotal, paymentStatus: finalPaymentStatus })
    });

    return updated;
  }, { maxWait: 10000, timeout: 30000 });

  const result = await prisma[`${prefix}Purchase`].findUnique({
    where: { id: updatedPurchase.id },
    include: { vendor: true, items: { include: { item: true } } }
  });

  return sendSuccess(res, result, 200, { message: 'Purchase updated successfully' });
});

/** Uploads receipt image */
export const uploadReceipt = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  if (!req.file) throw new ApiError(400, 'Receipt file is required');
  const { secure_url } = await uploadImage(req.file, `${prefix}/receipts`);
  return sendSuccess(res, { receiptUrl: secure_url }, 200, { receiptUrl: secure_url });
});

/** Marks purchase order as verified by accountant or owner */
export const approvePurchase = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { id } = req.params;

  const purchase = await prisma[`${prefix}Purchase`].findUnique({ where: { id } });
  if (!purchase) throw new ApiError(404, 'Purchase not found');

  const verifierName = req.user?.name || req.user?.email || 'Accountant';
  const updated = await prisma[`${prefix}Purchase`].update({
    where: { id },
    data: { verifiedBy: verifierName, verifiedAt: new Date() }
  });

  await createAuditLog(prefix, {
    action: 'PURCHASE_VERIFIED',
    entityType: 'PURCHASE',
    entityId: id,
    performedBy: req.user?.id || 'SYSTEM',
    details: JSON.stringify({ invoiceNo: purchase.invoiceNo, verifiedBy: verifierName })
  });

  return sendSuccess(res, updated, 200, { message: 'Purchase verified successfully' });
});

/** Deletes purchase record and symmetrically rolls back stock / ledger (OWNER only) */
export const deletePurchase = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { id } = req.params;

  if (req.user?.role !== 'OWNER') {
    throw new ApiError(403, 'Only the OWNER can delete purchase records');
  }

  const purchase = await prisma[`${prefix}Purchase`].findUnique({
    where: { id },
    include: { items: true }
  });
  if (!purchase) throw new ApiError(404, 'Purchase not found');

  const destination = (purchase.deliveredTo || 'FACTORY').toUpperCase();

  await prisma.$transaction(async (tx) => {
    for (const pItem of purchase.items) {
      const updateData = { cachedQty: { decrement: pItem.quantity } };
      if (destination === 'FACTORY') updateData.factoryQty = { decrement: pItem.quantity };
      else if (destination === 'WAREHOUSE') updateData.warehouseQty = { decrement: pItem.quantity };

      await tx[`${prefix}Item`].update({ where: { id: pItem.itemId }, data: updateData });

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

    // Clean up vendor ledger and any automated payments linked to this invoice
    await tx[`${prefix}VendorLedgerEntry`].deleteMany({ where: { purchaseId: purchase.id } });
    if (purchase.invoiceNo) {
      await tx[`${prefix}VendorPayment`].deleteMany({
        where: { vendorId: purchase.vendorId, referenceNo: purchase.invoiceNo }
      });
    }

    await tx[`${prefix}PurchaseItem`].deleteMany({ where: { purchaseId: purchase.id } });
    await tx[`${prefix}Purchase`].delete({ where: { id: purchase.id } });

    await createAuditLog(prefix, {
      action: 'PURCHASE_DELETED',
      entityType: 'PURCHASE',
      entityId: id,
      performedBy: req.user?.id || 'OWNER',
      details: JSON.stringify({ invoiceNo: purchase.invoiceNo, grandTotal: purchase.grandTotal })
    });
  }, { maxWait: 10000, timeout: 30000 });

  return sendSuccess(res, null, 200, { message: 'Purchase deleted and stock/ledger reversed successfully' });
});

/** Compatibility helper for status updates (OWNER only) */
export const updatePurchaseStatus = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { id } = req.params;
  const { status, paymentStatus } = req.body;

  if (req.user?.role !== 'OWNER') {
    throw new ApiError(403, 'Only the OWNER can modify purchase status');
  }

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
