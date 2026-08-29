import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { uploadImage } from '../utils/cloudinaryUpload.js';
import { getTenantPrefix } from '../utils/tenant.js';

/**
 * Retrieves all vendors for the current tenant along with aggregated purchase and payment totals.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
export const getVendors = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { includeArchived } = req.query;
  const where = includeArchived === 'true' ? {} : { archivedAt: null };

  const vendors = await prisma[`${prefix}Vendor`].findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      purchases: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { createdAt: true }
      }
    }
  });

  const vendorIds = vendors.map(v => v.id);

  // Group ledger sums per vendor
  const ledgerSums = await prisma[`${prefix}VendorLedgerEntry`].groupBy({
    by: ['vendorId', 'type'],
    _sum: { amount: true },
    where: { vendorId: { in: vendorIds } }
  });

  const statsMap = {};
  for (const entry of ledgerSums) {
    if (!statsMap[entry.vendorId]) statsMap[entry.vendorId] = { totalPurchases: 0, totalPaid: 0 };
    if (entry.type === 'PURCHASE') statsMap[entry.vendorId].totalPurchases = Number(entry._sum.amount);
    if (entry.type === 'PAYMENT') statsMap[entry.vendorId].totalPaid = Number(entry._sum.amount);
  }

  const formatted = vendors.map(v => {
    const totalPurchases = statsMap[v.id]?.totalPurchases || 0;
    const totalPaid = statsMap[v.id]?.totalPaid || 0;
    const payableBalance = totalPurchases - totalPaid;
    const lastPurchaseDate = v.purchases[0]?.createdAt || null;

    return {
      ...v,
      totalPurchases,
      totalPaid,
      payableBalance,
      lastPurchaseDate,
      status: v.archivedAt ? 'ARCHIVED' : 'ACTIVE'
    };
  });

  res.json({ success: true, data: formatted });
});

/**
 * Retrieves a single vendor by ID with complete ledger totals calculated via database aggregation,
 * and paginated/windowed recent ledger entries with accurate opening and running balances.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
export const getVendorById = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { id } = req.params;
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.max(1, parseInt(req.query.limit || '100', 10));
  const skip = (page - 1) * limit;

  const vendor = await prisma[`${prefix}Vendor`].findUnique({
    where: { id },
    include: {
      purchases: {
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          items: {
            include: { item: true }
          }
        }
      },
      payments: {
        orderBy: { createdAt: 'desc' },
        take: 50
      }
    }
  });

  if (!vendor) throw new ApiError(404, 'Vendor not found');

  // 1. Calculate overall totals across the COMPLETE dataset via database aggregation
  const [ledgerSums, totalLedgerCount] = await Promise.all([
    prisma[`${prefix}VendorLedgerEntry`].groupBy({
      by: ['type'],
      where: { vendorId: id },
      _sum: { amount: true }
    }),
    prisma[`${prefix}VendorLedgerEntry`].count({
      where: { vendorId: id }
    })
  ]);

  let totalPurchases = 0;
  let totalPaid = 0;
  for (const s of ledgerSums) {
    if (s.type === 'PURCHASE') totalPurchases = Number(s._sum.amount || 0);
    if (s.type === 'PAYMENT') totalPaid = Number(s._sum.amount || 0);
  }
  const payableBalance = totalPurchases - totalPaid;

  // 2. Fetch windowed ledger entries
  const pageEntries = await prisma[`${prefix}VendorLedgerEntry`].findMany({
    where: { vendorId: id },
    orderBy: { createdAt: 'asc' },
    skip,
    take: limit
  });

  // 3. Compute opening balance prior to current window/page via DB aggregation
  let openingBalance = 0;
  if (skip > 0 && pageEntries.length > 0) {
    const priorSums = await prisma[`${prefix}VendorLedgerEntry`].groupBy({
      by: ['type'],
      where: {
        vendorId: id,
        createdAt: { lt: pageEntries[0].createdAt }
      },
      _sum: { amount: true }
    });
    const pPurchases = Number(priorSums.find(s => s.type === 'PURCHASE')?._sum?.amount || 0);
    const pPayments = Number(priorSums.find(s => s.type === 'PAYMENT')?._sum?.amount || 0);
    openingBalance = pPurchases - pPayments;
  }

  // 4. Compute accurate running balance for displayed entries
  let currentBalance = openingBalance;
  const ledgerWithRunningBalance = pageEntries.map(entry => {
    const amt = Number(entry.amount);
    if (entry.type === 'PURCHASE') {
      currentBalance += amt;
    } else if (entry.type === 'PAYMENT') {
      currentBalance -= amt;
    }
    return {
      ...entry,
      runningBalance: currentBalance
    };
  }).reverse(); // Reverse back so latest entry is on top for UI display

  const lastPurchaseDate = vendor.purchases[0]?.createdAt || null;

  res.json({
    success: true,
    data: {
      ...vendor,
      ledgerEntries: ledgerWithRunningBalance,
      totalPurchases,
      totalPaid,
      payableBalance,
      lastPurchaseDate,
      status: vendor.archivedAt ? 'ARCHIVED' : 'ACTIVE',
      pagination: {
        page,
        limit,
        totalRecords: totalLedgerCount,
        totalPages: Math.ceil(totalLedgerCount / limit) || 1
      }
    }
  });
});

/**
 * Creates a new vendor record.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
export const createVendor = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { name, phone, email, address, notes } = req.body;
  if (!name || !phone) throw new ApiError(400, 'Vendor Name and Phone are required');

  const trimmedName = name.trim();
  const trimmedPhone = phone.trim();

  // Unique Duplicate Check: Ensure no active vendor has same name or phone
  const existingVendor = await prisma[`${prefix}Vendor`].findFirst({
    where: {
      archivedAt: null,
      OR: [
        { name: { equals: trimmedName, mode: 'insensitive' } },
        { phone: { equals: trimmedPhone } }
      ]
    }
  });

  if (existingVendor) {
    throw new ApiError(400, `A vendor with name "${trimmedName}" or phone "${trimmedPhone}" already exists.`);
  }

  const vendor = await prisma[`${prefix}Vendor`].create({
    data: { name: trimmedName, phone: trimmedPhone, email: email?.trim(), address, notes }
  });
  res.status(201).json({ success: true, data: vendor });
});

/**
 * Updates an existing vendor profile.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
export const updateVendor = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { id } = req.params;
  const { name, phone, email, address, notes } = req.body;
  if (!name || !phone) throw new ApiError(400, 'Vendor Name and Phone are required');

  const vendor = await prisma[`${prefix}Vendor`].update({
    where: { id },
    data: { name, phone, email, address, notes }
  });
  res.json({ success: true, data: vendor });
});

/**
 * Soft archives a vendor.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
export const archiveVendor = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { id } = req.params;
  const vendor = await prisma[`${prefix}Vendor`].update({
    where: { id },
    data: { archivedAt: new Date() }
  });
  res.json({ success: true, data: vendor, message: 'Vendor archived successfully' });
});

/**
 * Restores an archived vendor.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
export const restoreVendor = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { id } = req.params;
  const vendor = await prisma[`${prefix}Vendor`].update({
    where: { id },
    data: { archivedAt: null }
  });
  res.json({ success: true, data: vendor, message: 'Vendor restored successfully' });
});

/**
 * Records a vendor payment, logs audit entries, and creates matching ledger records inside a transaction.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
export const recordVendorPayment = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { id: vendorId } = req.params;
  const { amount, paymentMethod, referenceNo, proofUrl, remarks, paymentDate } = req.body;

  const paymentAmount = parseFloat(amount);
  if (isNaN(paymentAmount) || paymentAmount <= 0) {
    throw new ApiError(400, 'Payment amount must be greater than zero');
  }
  
  // ENFORCE PROOF REQUIREMENT for non-cash payments
  const requiresProof = ['BANK_TRANSFER', 'CHEQUE', 'ONLINE_TRANSFER'].includes(paymentMethod);
  if (requiresProof && (!proofUrl || !proofUrl.trim())) {
    throw new ApiError(400, `Payment proof is required for ${paymentMethod.replace('_', ' ')}`);
  }

  const vendor = await prisma[`${prefix}Vendor`].findUnique({ where: { id: vendorId } });
  if (!vendor) throw new ApiError(404, 'Vendor not found');
  if (vendor.archivedAt) throw new ApiError(400, 'Cannot record payment for an archived vendor');

  // Check current outstanding payable balance
  const purchasesAgg = await prisma[`${prefix}Purchase`].aggregate({
    where: { vendorId },
    _sum: { grandTotal: true }
  });
  const paymentsAgg = await prisma[`${prefix}VendorPayment`].aggregate({
    where: { vendorId },
    _sum: { amount: true }
  });
  const currentPayableBalance = Math.max(0, Number(purchasesAgg._sum.grandTotal || 0) - Number(paymentsAgg._sum.amount || 0));
  if (currentPayableBalance > 0 && paymentAmount > currentPayableBalance + 0.01) {
    throw new ApiError(400, `Payment amount (Rs. ${paymentAmount.toLocaleString()}) cannot exceed outstanding balance of Rs. ${currentPayableBalance.toLocaleString()}`);
  }

  const targetDate = paymentDate ? new Date(paymentDate) : new Date();

  const result = await prisma.$transaction(async (tx) => {
    // 1. Record VendorPayment
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

    // 2. Record VendorLedgerEntry
    const ledgerRemarks = `Payment [${paymentMethod || 'CASH'}]${referenceNo ? ` Ref: ${referenceNo}` : ''}${remarks ? ` - ${remarks}` : ''}`;
    const ledgerEntry = await tx[`${prefix}VendorLedgerEntry`].create({
      data: {
        vendorId,
        type: 'PAYMENT',
        amount: paymentAmount,
        remarks: ledgerRemarks.trim(),
        createdAt: targetDate
      }
    });

    // 3. Record Audit Log
    await tx[`${prefix}AuditLog`].create({
      data: {
        action: 'VENDOR_PAYMENT_RECORDED',
        entityType: 'VENDOR_PAYMENT',
        entityId: payment.id,
        details: JSON.stringify({
          vendorId,
          vendorName: vendor.name,
          amount: paymentAmount,
          paymentMethod,
          proofUrl
        }),
        performedBy: req.user?.id || 'SYSTEM'
      }
    });

    return { payment, ledgerEntry };
  });

  const ledgerSums = await prisma[`${prefix}VendorLedgerEntry`].groupBy({
    by: ['type'],
    where: { vendorId },
    _sum: { amount: true }
  });

  let totalPurchases = 0;
  let totalPaid = 0;
  for (const s of ledgerSums) {
    if (s.type === 'PURCHASE') totalPurchases = Number(s._sum.amount || 0);
    if (s.type === 'PAYMENT') totalPaid = Number(s._sum.amount || 0);
  }

  res.status(201).json({
    success: true,
    data: result.payment,
    payableBalance: totalPurchases - totalPaid,
    message: 'Vendor payment recorded successfully'
  });
});

/**
 * Uploads a payment proof image to Cloudinary and returns the secure URL and public ID.
 *
 * @param {import('express').Request} req - Express request object with uploaded file.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
export const uploadPaymentProof = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Payment proof image is required');
  const prefix = getTenantPrefix(req);
  const { secure_url, public_id } = await uploadImage(req.file, `${prefix}/vendor-payments`);
  res.status(200).json({ 
    success: true, 
    proofUrl: secure_url,
    publicId: public_id
  });
});