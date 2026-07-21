import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { uploadToCloudinary } from '../utils/cloudinaryUpload.js';

export const getPurchases = asyncHandler(async (req, res) => {
  const purchases = await prisma.aquaspherePurchase.findMany({
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
  res.json({ success: true, data: purchases });
});

export const getPurchaseById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const purchase = await prisma.aquaspherePurchase.findUnique({
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
  const { vendorId, invoiceNo, purchaseDate, receiptUrl, remarks, items } = req.body;

  // Validation rules
  if (!vendorId) {
    throw new ApiError(400, 'Vendor is required');
  }

  const vendor = await prisma.aquasphereVendor.findUnique({ where: { id: vendorId } });
  if (!vendor) {
    throw new ApiError(404, 'Vendor not found');
  }
  if (vendor.archivedAt) {
    throw new ApiError(400, 'Cannot record purchase for an archived vendor');
  }

  if (!receiptUrl || typeof receiptUrl !== 'string' || !receiptUrl.trim()) {
    throw new ApiError(400, 'Bill photo/receipt URL is required');
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, 'Purchase must contain at least one item');
  }

  // Validate all items before starting transaction
  let grandTotal = 0;
  const validatedItems = [];

  for (const it of items) {
    if (!it.itemId) {
      throw new ApiError(400, 'Item selection is required for all rows');
    }
    const qty = parseFloat(it.quantity);
    const unitPrice = parseFloat(it.unitPrice);

    if (isNaN(qty) || qty <= 0) {
      throw new ApiError(400, 'Quantity must be greater than zero');
    }
    if (isNaN(unitPrice) || unitPrice <= 0) {
      throw new ApiError(400, 'Unit price must be greater than zero');
    }

    const rawMat = await prisma.aquasphereItem.findUnique({ where: { id: it.itemId } });
    if (!rawMat) {
      throw new ApiError(404, `Raw material ${it.itemId} not found`);
    }
    if (rawMat.archivedAt) {
      throw new ApiError(400, `Material "${rawMat.name}" is archived and cannot be purchased`);
    }

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

  // Execute inside single Prisma transaction
  const purchase = await prisma.$transaction(async (tx) => {
    // 1. Create Purchase
    const newPurchase = await tx.aquaspherePurchase.create({
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

    // 2. Create Purchase Items & Update Inventory
    for (const vItem of validatedItems) {
      await tx.aquaspherePurchaseItem.create({
        data: {
          purchaseId: newPurchase.id,
          itemId: vItem.itemId,
          quantity: vItem.quantity,
          unitPrice: vItem.unitPrice,
          total: vItem.total
        }
      });

      // Update item cachedQty
      const currentItem = await tx.aquasphereItem.findUnique({ where: { id: vItem.itemId } });
      await tx.aquasphereItem.update({
        where: { id: vItem.itemId },
        data: {
          cachedQty: Number(currentItem.cachedQty) + vItem.quantity
        }
      });

      // Record inventory transaction
      await tx.aquasphereInventoryTransaction.create({
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

    // 3. Create Vendor Ledger Entry (+ grandTotal payable)
    await tx.aquasphereVendorLedgerEntry.create({
      data: {
        vendorId,
        purchaseId: newPurchase.id,
        type: 'PURCHASE',
        amount: grandTotal,
        remarks: `Purchase ${newPurchase.invoiceNo}`
      }
    });

    // 4. Create Audit Log
    await tx.aquasphereAuditLog.create({
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

  const fullPurchase = await prisma.aquaspherePurchase.findUnique({
    where: { id: purchase.id },
    include: { vendor: true, items: { include: { item: true } } }
  });

  res.status(201).json({ success: true, data: fullPurchase });
});

// ─── Upload Receipt to Cloudinary ────────────────────────────────────────────
// POST /api/v1/purchases/upload-receipt
// Accepts multipart/form-data with field "receipt"
// Returns { success: true, receiptUrl: "https://res.cloudinary.com/..." }
export const uploadReceipt = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'Receipt file is required. Please attach an image or PDF.');
  }

  const receiptUrl = await uploadToCloudinary(req.file.buffer, 'aquasphere/receipts');

  res.status(200).json({ success: true, receiptUrl });
});

