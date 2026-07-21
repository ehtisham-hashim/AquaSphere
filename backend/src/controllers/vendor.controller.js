import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

export const getVendors = asyncHandler(async (req, res) => {
  const { includeArchived } = req.query;
  const where = includeArchived === 'true' ? {} : { archivedAt: null };
  const vendors = await prisma.aquasphereVendor.findMany({
    where,
    include: {
      ledgerEntries: true
    },
    orderBy: { createdAt: 'desc' }
  });

  const formatted = vendors.map(v => {
    const totalPurchases = v.ledgerEntries
      .filter(l => l.type === 'PURCHASE')
      .reduce((sum, l) => sum + Number(l.amount), 0);
    const totalPayments = v.ledgerEntries
      .filter(l => l.type === 'PAYMENT')
      .reduce((sum, l) => sum + Number(l.amount), 0);
    return {
      ...v,
      payableBalance: totalPurchases - totalPayments,
      status: v.archivedAt ? 'ARCHIVED' : 'ACTIVE'
    };
  });

  res.json({ success: true, data: formatted });
});

export const getVendorById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const vendor = await prisma.aquasphereVendor.findUnique({
    where: { id },
    include: {
      purchases: { include: { items: { include: { item: true } } } },
      ledgerEntries: { orderBy: { createdAt: 'desc' } }
    }
  });
  if (!vendor) throw new ApiError(404, 'Vendor not found');

  const totalPurchases = vendor.ledgerEntries
    .filter(l => l.type === 'PURCHASE')
    .reduce((sum, l) => sum + Number(l.amount), 0);
  const totalPayments = vendor.ledgerEntries
    .filter(l => l.type === 'PAYMENT')
    .reduce((sum, l) => sum + Number(l.amount), 0);

  res.json({
    success: true,
    data: {
      ...vendor,
      payableBalance: totalPurchases - totalPayments,
      status: vendor.archivedAt ? 'ARCHIVED' : 'ACTIVE'
    }
  });
});

export const createVendor = asyncHandler(async (req, res) => {
  const { name, phone, email, address, notes } = req.body;
  if (!name || !phone) throw new ApiError(400, 'Vendor Name and Phone are required');

  const vendor = await prisma.aquasphereVendor.create({
    data: { name, phone, email, address, notes }
  });
  res.status(201).json({ success: true, data: vendor });
});

export const updateVendor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, phone, email, address, notes } = req.body;
  if (!name || !phone) throw new ApiError(400, 'Vendor Name and Phone are required');

  const vendor = await prisma.aquasphereVendor.update({
    where: { id },
    data: { name, phone, email, address, notes }
  });
  res.json({ success: true, data: vendor });
});

export const archiveVendor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const vendor = await prisma.aquasphereVendor.update({
    where: { id },
    data: { archivedAt: new Date() }
  });
  res.json({ success: true, data: vendor, message: 'Vendor archived successfully' });
});

export const restoreVendor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const vendor = await prisma.aquasphereVendor.update({
    where: { id },
    data: { archivedAt: null }
  });
  res.json({ success: true, data: vendor, message: 'Vendor restored successfully' });
});

export const recordVendorPayment = asyncHandler(async (req, res) => {
  const { id: vendorId } = req.params;
  const { amount, paymentMethod, remarks, paymentDate } = req.body;

  const paymentAmount = parseFloat(amount);
  if (isNaN(paymentAmount) || paymentAmount <= 0) {
    throw new ApiError(400, 'Payment amount must be greater than zero');
  }

  const vendor = await prisma.aquasphereVendor.findUnique({ where: { id: vendorId } });
  if (!vendor) {
    throw new ApiError(404, 'Vendor not found');
  }
  if (vendor.archivedAt) {
    throw new ApiError(400, 'Cannot record payment for an archived vendor');
  }

  const result = await prisma.$transaction(async (tx) => {
    const entry = await tx.aquasphereVendorLedgerEntry.create({
      data: {
        vendorId,
        type: 'PAYMENT',
        amount: paymentAmount,
        remarks: `${paymentMethod ? `[${paymentMethod}] ` : ''}${remarks || 'Vendor Payment'}`.trim(),
        createdAt: paymentDate ? new Date(paymentDate) : new Date()
      }
    });

    await tx.aquasphereAuditLog.create({
      data: {
        action: 'VENDOR_PAYMENT_RECORDED',
        entityType: 'VENDOR_PAYMENT',
        entityId: entry.id,
        details: JSON.stringify({
          vendorId,
          vendorName: vendor.name,
          amount: paymentAmount,
          paymentMethod
        }),
        performedBy: req.user?.id || 'SYSTEM'
      }
    });

    return entry;
  });

  // Calculate updated balance
  const ledgerEntries = await prisma.aquasphereVendorLedgerEntry.findMany({
    where: { vendorId }
  });

  const totalPurchases = ledgerEntries
    .filter(l => l.type === 'PURCHASE')
    .reduce((sum, l) => sum + Number(l.amount), 0);
  const totalPayments = ledgerEntries
    .filter(l => l.type === 'PAYMENT')
    .reduce((sum, l) => sum + Number(l.amount), 0);

  res.status(201).json({
    success: true,
    data: result,
    payableBalance: totalPurchases - totalPayments,
    message: 'Vendor payment recorded successfully'
  });
});

