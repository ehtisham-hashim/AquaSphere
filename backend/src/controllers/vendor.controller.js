import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { uploadImage } from '../utils/cloudinaryUpload.js';
import { getTenantPrefix } from '../utils/tenant.js';
import { createAuditLog } from '../utils/auditLog.js';
import { sendSuccess } from '../utils/response.js';
import { broadcastEvent } from '../utils/sseBus.js';

/** Retrieves all vendors with aggregated purchase and payment totals */
export const getVendors = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { includeArchived } = req.query;
  const where = includeArchived === 'true' ? {} : { archivedAt: null };

  const vendors = await prisma[`${prefix}Vendor`].findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { purchases: { orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true } } }
  });

  const vendorIds = vendors.map(v => v.id);
  const ledgerSums = await prisma[`${prefix}VendorLedgerEntry`].groupBy({
    by: ['vendorId', 'type'],
    _sum: { amount: true },
    where: { vendorId: { in: vendorIds } }
  });

  const statsMap = {};
  for (const entry of ledgerSums) {
    statsMap[entry.vendorId] ||= { totalPurchases: 0, totalPaid: 0 };
    if (entry.type === 'PURCHASE') statsMap[entry.vendorId].totalPurchases = Number(entry._sum.amount);
    if (entry.type === 'PAYMENT') statsMap[entry.vendorId].totalPaid = Number(entry._sum.amount);
  }

  const formatted = vendors.map(v => {
    const totalPurchases = statsMap[v.id]?.totalPurchases || 0;
    const totalPaid = statsMap[v.id]?.totalPaid || 0;
    return {
      ...v,
      totalPurchases,
      totalPaid,
      payableBalance: totalPurchases - totalPaid,
      lastPurchaseDate: v.purchases[0]?.createdAt || null,
      status: v.archivedAt ? 'ARCHIVED' : 'ACTIVE'
    };
  });

  return sendSuccess(res, formatted);
});

/** Retrieves single vendor with ledger totals and running balances */
export const getVendorById = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { id } = req.params;
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.max(1, parseInt(req.query.limit || '100', 10));
  const skip = (page - 1) * limit;

  const [vendor, ledgerSums, totalLedgerCount, pageEntries] = await Promise.all([
    prisma[`${prefix}Vendor`].findUnique({
      where: { id },
      include: {
        purchases: { orderBy: { createdAt: 'desc' }, take: 50, include: { items: { include: { item: true } } } },
        payments: { orderBy: { createdAt: 'desc' }, take: 50 }
      }
    }),
    prisma[`${prefix}VendorLedgerEntry`].groupBy({
      by: ['type'],
      where: { vendorId: id },
      _sum: { amount: true }
    }),
    prisma[`${prefix}VendorLedgerEntry`].count({ where: { vendorId: id } }),
    prisma[`${prefix}VendorLedgerEntry`].findMany({
      where: { vendorId: id },
      orderBy: { createdAt: 'asc' },
      skip,
      take: limit
    })
  ]);

  if (!vendor) throw new ApiError(404, 'Vendor not found');

  const totalPurchases = Number(ledgerSums.find(s => s.type === 'PURCHASE')?._sum?.amount || 0);
  const totalPaid = Number(ledgerSums.find(s => s.type === 'PAYMENT')?._sum?.amount || 0);
  const payableBalance = totalPurchases - totalPaid;

  let openingBalance = 0;
  if (skip > 0 && pageEntries.length > 0) {
    const priorSums = await prisma[`${prefix}VendorLedgerEntry`].groupBy({
      by: ['type'],
      where: { vendorId: id, createdAt: { lt: pageEntries[0].createdAt } },
      _sum: { amount: true }
    });
    const pPurchases = Number(priorSums.find(s => s.type === 'PURCHASE')?._sum?.amount || 0);
    const pPayments = Number(priorSums.find(s => s.type === 'PAYMENT')?._sum?.amount || 0);
    openingBalance = pPurchases - pPayments;
  }

  let currentBalance = openingBalance;
  const ledgerWithRunningBalance = pageEntries.map(entry => {
    const amt = Number(entry.amount);
    if (entry.type === 'PURCHASE') currentBalance += amt;
    else if (entry.type === 'PAYMENT') currentBalance -= amt;
    return { ...entry, runningBalance: currentBalance };
  }).reverse();

  return sendSuccess(res, {
    ...vendor,
    ledgerEntries: ledgerWithRunningBalance,
    totalPurchases,
    totalPaid,
    payableBalance,
    lastPurchaseDate: vendor.purchases[0]?.createdAt || null,
    status: vendor.archivedAt ? 'ARCHIVED' : 'ACTIVE',
    pagination: { page, limit, totalRecords: totalLedgerCount, totalPages: Math.ceil(totalLedgerCount / limit) || 1 }
  });
});

/** Creates a new vendor record */
export const createVendor = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { name, phone, email, address, notes } = req.body;
  if (!name || !phone) throw new ApiError(400, 'Vendor Name and Phone are required');

  const trimmedName = name.trim();
  const trimmedPhone = phone.trim();

  const existingVendor = await prisma[`${prefix}Vendor`].findFirst({
    where: {
      archivedAt: null,
      OR: [{ name: { equals: trimmedName, mode: 'insensitive' } }, { phone: { equals: trimmedPhone } }]
    }
  });

  if (existingVendor) throw new ApiError(400, `A vendor with name "${trimmedName}" or phone "${trimmedPhone}" already exists.`);

  const vendor = await prisma[`${prefix}Vendor`].create({
    data: {
      name: trimmedName,
      phone: trimmedPhone,
      email: email?.trim() || null,
      address: address?.trim() || null,
      notes: notes?.trim() || null
    }
  });

  await createAuditLog(prefix, {
    action: 'VENDOR_CREATED',
    entityType: 'Vendor',
    entityId: vendor.id,
    performedBy: req.user?.name || req.user?.id || 'Admin',
    details: `Vendor Created: ${vendor.name} (${vendor.phone})`
  });

  broadcastEvent(prefix, 'VENDOR_UPDATED', { vendorId: vendor.id });

  return sendSuccess(res, vendor, 201);
});

/** Updates an existing vendor profile */
export const updateVendor = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { id } = req.params;
  const { name, phone, email, address, notes } = req.body;
  if (!name || !phone) throw new ApiError(400, 'Vendor Name and Phone are required');

  const trimmedName = name.trim();
  const trimmedPhone = phone.trim();

  const existing = await prisma[`${prefix}Vendor`].findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, 'Vendor not found');

  const duplicate = await prisma[`${prefix}Vendor`].findFirst({
    where: {
      id: { not: id },
      archivedAt: null,
      OR: [{ name: { equals: trimmedName, mode: 'insensitive' } }, { phone: { equals: trimmedPhone } }]
    }
  });
  if (duplicate) throw new ApiError(400, `Another vendor with name "${trimmedName}" or phone "${trimmedPhone}" already exists.`);

  const vendor = await prisma[`${prefix}Vendor`].update({
    where: { id },
    data: {
      name: trimmedName,
      phone: trimmedPhone,
      email: email?.trim() || null,
      address: address?.trim() || null,
      notes: notes?.trim() || null
    }
  });

  await createAuditLog(prefix, {
    action: 'VENDOR_UPDATED',
    entityType: 'Vendor',
    entityId: vendor.id,
    performedBy: req.user?.name || req.user?.id || 'Admin',
    details: `Vendor Updated: ${vendor.name} (${vendor.phone})`
  });

  broadcastEvent(prefix, 'VENDOR_UPDATED', { vendorId: vendor.id });

  return sendSuccess(res, vendor);
});

/** Soft archives a vendor */
export const archiveVendor = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const vendor = await prisma[`${prefix}Vendor`].update({
    where: { id: req.params.id },
    data: { archivedAt: new Date() }
  });

  await createAuditLog(prefix, {
    action: 'VENDOR_ARCHIVED',
    entityType: 'Vendor',
    entityId: vendor.id,
    performedBy: req.user?.name || req.user?.id || 'Admin',
    details: `Vendor Archived: ${vendor.name}`
  });

  broadcastEvent(prefix, 'VENDOR_UPDATED', { vendorId: vendor.id });

  return sendSuccess(res, vendor, 200, { message: 'Vendor archived successfully' });
});

/** Restores an archived vendor */
export const restoreVendor = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const vendor = await prisma[`${prefix}Vendor`].update({
    where: { id: req.params.id },
    data: { archivedAt: null }
  });

  await createAuditLog(prefix, {
    action: 'VENDOR_RESTORED',
    entityType: 'Vendor',
    entityId: vendor.id,
    performedBy: req.user?.name || req.user?.id || 'Admin',
    details: `Vendor Restored: ${vendor.name}`
  });

  broadcastEvent(prefix, 'VENDOR_UPDATED', { vendorId: vendor.id });

  return sendSuccess(res, vendor, 200, { message: 'Vendor restored successfully' });
});

/** Records a vendor payment */
export const recordVendorPayment = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { id: vendorId } = req.params;
  const { amount, paymentMethod, referenceNo, proofUrl, remarks, paymentDate } = req.body;

  const paymentAmount = parseFloat(amount);
  if (isNaN(paymentAmount) || paymentAmount <= 0) throw new ApiError(400, 'Payment amount must be greater than zero');

  const requiresProof = ['BANK_TRANSFER', 'CHEQUE', 'ONLINE_TRANSFER'].includes(paymentMethod);
  if (requiresProof && (!proofUrl || !proofUrl.trim())) {
    throw new ApiError(400, `Payment proof is required for ${paymentMethod.replace('_', ' ')}`);
  }

  const vendor = await prisma[`${prefix}Vendor`].findUnique({ where: { id: vendorId } });
  if (!vendor) throw new ApiError(404, 'Vendor not found');
  if (vendor.archivedAt) throw new ApiError(400, 'Cannot record payment for an archived vendor');

  const [purchasesAgg, paymentsAgg] = await Promise.all([
    prisma[`${prefix}Purchase`].aggregate({ where: { vendorId }, _sum: { grandTotal: true } }),
    prisma[`${prefix}VendorPayment`].aggregate({ where: { vendorId }, _sum: { amount: true } })
  ]);

  const currentPayableBalance = Math.max(0, Number(purchasesAgg._sum.grandTotal || 0) - Number(paymentsAgg._sum.amount || 0));
  if (currentPayableBalance > 0 && paymentAmount > currentPayableBalance + 0.01) {
    throw new ApiError(400, `Payment amount (Rs. ${paymentAmount.toLocaleString()}) cannot exceed outstanding balance of Rs. ${currentPayableBalance.toLocaleString()}`);
  }

  const targetDate = paymentDate ? new Date(paymentDate) : new Date();

  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx[`${prefix}VendorPayment`].create({
      data: {
        vendorId,
        amount: paymentAmount,
        paymentMethod: paymentMethod || 'CASH',
        referenceNo: referenceNo || null,
        proofUrl: proofUrl || null,
        remarks: remarks || null,
        createdAt: targetDate
      }
    });

    const ledgerRemarks = `Payment [${paymentMethod || 'CASH'}]${referenceNo ? ` Ref: ${referenceNo}` : ''}${remarks ? ` - ${remarks}` : ''}`;
    const ledgerEntry = await tx[`${prefix}VendorLedgerEntry`].create({
      data: { vendorId, type: 'PAYMENT', amount: paymentAmount, remarks: ledgerRemarks.trim(), createdAt: targetDate }
    });

    await createAuditLog(prefix, {
      action: 'VENDOR_PAYMENT_RECORDED',
      entityType: 'VENDOR_PAYMENT',
      entityId: payment.id,
      details: JSON.stringify({ vendorId, vendorName: vendor.name, amount: paymentAmount, paymentMethod, proofUrl }),
      performedBy: req.user?.id || 'SYSTEM'
    });

    return { payment, ledgerEntry };
  });

  const ledgerSums = await prisma[`${prefix}VendorLedgerEntry`].groupBy({
    by: ['type'],
    where: { vendorId },
    _sum: { amount: true }
  });

  const totalPurchases = Number(ledgerSums.find(s => s.type === 'PURCHASE')?._sum?.amount || 0);
  const totalPaid = Number(ledgerSums.find(s => s.type === 'PAYMENT')?._sum?.amount || 0);

  broadcastEvent(prefix, 'VENDOR_UPDATED', { vendorId });

  return sendSuccess(res, result.payment, 201, {
    payableBalance: totalPurchases - totalPaid,
    message: 'Vendor payment recorded successfully'
  });
});

/** Uploads payment proof image */
export const uploadPaymentProof = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Payment proof image is required');
  const prefix = getTenantPrefix(req);
  const { secure_url, public_id } = await uploadImage(req.file, `${prefix}/vendor-payments`);
  return sendSuccess(res, { proofUrl: secure_url, publicId: public_id }, 200, {
    proofUrl: secure_url,
    publicId: public_id
  });
});

/** Permanently deletes a vendor and reverses linked purchases/inventory (Owner only) */
export const deleteVendor = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { id } = req.params;

  if (req.user?.role !== 'OWNER') {
    throw new ApiError(403, 'Only the OWNER can delete vendor records');
  }

  const vendor = await prisma[`${prefix}Vendor`].findUnique({
    where: { id },
    include: {
      purchases: { include: { items: true } },
      payments: true,
      ledgerEntries: true
    }
  });

  if (!vendor) throw new ApiError(404, 'Vendor not found');

  await prisma.$transaction(async (tx) => {
    // 1. Revert inventory additions for all purchases of this vendor
    for (const p of vendor.purchases) {
      const destination = (p.deliveredTo || 'FACTORY').toUpperCase();
      for (const pItem of p.items) {
        const updateData = { cachedQty: { decrement: pItem.quantity } };
        if (destination === 'FACTORY') updateData.factoryQty = { decrement: pItem.quantity };
        else if (destination === 'WAREHOUSE') updateData.warehouseQty = { decrement: pItem.quantity };

        await tx[`${prefix}Item`].update({ where: { id: pItem.itemId }, data: updateData });

        await tx[`${prefix}InventoryTransaction`].create({
          data: {
            itemId: pItem.itemId,
            quantity: pItem.quantity,
            direction: 'OUT',
            reason: 'VENDOR_DELETED_PURCHASE_REVERSAL',
            refType: 'PURCHASE',
            refId: p.id
          }
        });
      }

      await tx[`${prefix}PurchaseItem`].deleteMany({ where: { purchaseId: p.id } });
    }

    // 2. Delete vendor ledger entries
    await tx[`${prefix}VendorLedgerEntry`].deleteMany({ where: { vendorId: id } });

    // 3. Delete vendor payments
    await tx[`${prefix}VendorPayment`].deleteMany({ where: { vendorId: id } });

    // 4. Delete vendor purchases
    await tx[`${prefix}Purchase`].deleteMany({ where: { vendorId: id } });

    // 5. Delete vendor
    await tx[`${prefix}Vendor`].delete({ where: { id } });

    await createAuditLog(prefix, {
      action: 'VENDOR_DELETED',
      entityType: 'VENDOR',
      entityId: id,
      performedBy: req.user?.name || req.user?.id || 'OWNER',
      details: `Vendor "${vendor.name}" (${vendor.phone}) and all linked purchases/ledger entries deleted by Owner`
    });
  }, { maxWait: 10000, timeout: 30000 });

  broadcastEvent(prefix, 'VENDOR_UPDATED', { deletedVendorId: id });
  broadcastEvent(prefix, 'INVENTORY_CHANGED');
  return sendSuccess(res, null, 200, { message: `Vendor "${vendor.name}" and associated records deleted successfully` });
});
