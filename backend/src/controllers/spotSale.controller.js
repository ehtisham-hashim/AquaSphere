import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { broadcastDashboardUpdate } from './analytics.controller.js';
import { getTenantPrefix } from '../utils/tenant.js';
import { createAuditLog } from '../utils/auditLog.js';
import { sendSuccess } from '../utils/response.js';
import pkg from '@prisma/client';
const { Prisma } = pkg;

const generateSaleNumber = () => {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, '0');
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const y = String(now.getFullYear()).slice(-2);
  const ts = Date.now().toString(36).slice(-4).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 4).toUpperCase();
  return `CS-${d}${m}${y}-${ts}${rand}`;
};

/** Retrieves paginated spot/counter sales */
export const getSpotSales = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, search } = req.query;
  const skip = (page - 1) * limit;
  const prefix = getTenantPrefix(req);

  const where = {};
  if (search && search.trim()) {
    const s = search.trim();
    where.OR = [
      { saleNumber: { contains: s, mode: 'insensitive' } },
      { remarks: { contains: s, mode: 'insensitive' } },
      { customer: { name: { contains: s, mode: 'insensitive' } } }
    ];
  }

  const [sales, total] = await Promise.all([
    prisma[`${prefix}SpotSale`].findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, name: true, phone: true, currentBalance: true, creditLimit: true, deposit: true } },
        createdBy: { select: { id: true, name: true, role: true } },
        items: {
          include: {
            item: { select: { id: true, name: true, unit: true, retailPrice: true } }
          }
        }
      }
    }),
    prisma[`${prefix}SpotSale`].count({ where })
  ]);

  return sendSuccess(res, sales, 200, {
    pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) }
  });
});

/** Retrieves today's aggregate metrics directly from database */
export const getTodaySpotSalesSummary = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const todaySales = await prisma[`${prefix}SpotSale`].findMany({
    where: {
      createdAt: { gte: startOfDay }
    },
    select: {
      totalAmount: true,
      amountPaid: true,
      debtAmount: true,
      cashCollected: true,
      creditAmount: true,
      litresSold: true
    }
  });

  let todayRevenue = 0;
  let todayPaid = 0;
  let todayDebt = 0;
  let todayLitres = 0;

  for (const s of todaySales) {
    const rev = Number(s.totalAmount) || (Number(s.cashCollected || 0) + Number(s.creditAmount || 0));
    const paid = Number(s.amountPaid) || Number(s.cashCollected || 0);
    const debt = Number(s.debtAmount) || Number(s.creditAmount || 0);
    const lit = Number(s.litresSold || 0);

    todayRevenue += rev;
    todayPaid += paid;
    todayDebt += debt;
    todayLitres += lit;
  }

  return sendSuccess(res, {
    todayRevenue,
    todayPaid,
    todayDebt,
    todayLitres,
    todayCount: todaySales.length
  });
});

/** Records a walk-in / spot sale transaction with dynamic finished goods */
export const createSpotSale = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const {
    items: inputItems,
    amountPaid,
    cashCollected,
    creditAmount,
    paymentMethod = 'CASH',
    customerId,
    remarks
  } = req.body;

  if (!Array.isArray(inputItems) || inputItems.length === 0) {
    throw new ApiError(400, 'At least one finished good item must be selected for the sale.');
  }

  // Pre-validate customer if provided
  let customerObj = null;
  if (customerId && customerId.trim()) {
    customerObj = await prisma[`${prefix}Customer`].findUnique({ where: { id: customerId } });
    if (!customerObj) throw new ApiError(404, 'Selected customer not found');
  }

  // Fetch all finished goods referenced in the sale
  const itemIds = inputItems.map(i => i.itemId).filter(Boolean);
  const dbItems = await prisma[`${prefix}Item`].findMany({
    where: {
      id: { in: itemIds },
      type: 'FINISHED_GOOD',
      archivedAt: null
    }
  });

  const dbItemMap = new Map(dbItems.map(i => [i.id, i]));

  // Calculate line items and total bill
  let totalBill = new Prisma.Decimal(0);
  let totalLitres = 0;
  const processedItems = [];

  for (const raw of inputItems) {
    const fgItem = dbItemMap.get(raw.itemId);
    if (!fgItem) {
      throw new ApiError(400, `Item "${raw.name || raw.itemId}" is either invalid or not an active finished good.`);
    }

    const qty = parseFloat(raw.quantity);
    if (isNaN(qty) || qty <= 0) {
      throw new ApiError(400, `Invalid quantity for "${fgItem.name}". Must be greater than 0.`);
    }

    const unitPrice = parseFloat(raw.unitPrice !== undefined ? raw.unitPrice : (fgItem.retailPrice || 0));
    if (isNaN(unitPrice) || unitPrice < 0) {
      throw new ApiError(400, `Invalid unit price for "${fgItem.name}".`);
    }

    const subtotal = new Prisma.Decimal(qty).times(unitPrice);
    totalBill = totalBill.plus(subtotal);

    // Approximate litres from item name or size
    const nameLower = fgItem.name.toLowerCase();
    let litresPerUnit = 0;
    if (nameLower.includes('0.5') || nameLower.includes('500')) litresPerUnit = 9.0; // 12 btls x 0.75L
    else if (nameLower.includes('1.5') || nameLower.includes('1500')) litresPerUnit = 12.0; // 6 btls x 2L
    else if (nameLower.includes('19')) litresPerUnit = 24.0;
    else litresPerUnit = 1.0;

    totalLitres += litresPerUnit * qty;

    processedItems.push({
      fgItem,
      quantity: qty,
      unitPrice,
      subtotal: Number(subtotal)
    });
  }

  const numericTotalBill = Number(totalBill);
  
  // Determine amount paid (supports amountPaid or legacy cashCollected)
  let numericAmountPaid = 0;
  if (amountPaid !== undefined && amountPaid !== null && amountPaid !== '') {
    numericAmountPaid = parseFloat(amountPaid);
  } else if (cashCollected !== undefined && cashCollected !== null && cashCollected !== '') {
    numericAmountPaid = parseFloat(cashCollected);
  } else {
    // Default to paid in full
    numericAmountPaid = numericTotalBill;
  }

  if (isNaN(numericAmountPaid) || numericAmountPaid < 0) {
    throw new ApiError(400, 'Amount paid must be a non-negative number.');
  }

  const numericDebtAmount = Math.max(0, Number(new Prisma.Decimal(numericTotalBill).minus(numericAmountPaid)));

  // Strict Walk-In rule: Walk-in cash customers cannot leave unpaid balances (debt)
  if (numericDebtAmount > 0 && (!customerId || !customerId.trim())) {
    throw new ApiError(400, `Walk-in customers must pay in full. Unpaid balance of Rs. ${numericDebtAmount.toLocaleString()} requires selecting or registering a customer profile to record debt.`);
  }

  const saleNumber = generateSaleNumber();

  const spotSale = await prisma.$transaction(async (tx) => {
    // 1. Stock deduction and location validation
    for (const line of processedItems) {
      const { fgItem, quantity } = line;
      
      // Re-read current stock inside transaction for consistency
      const currentItem = await tx[`${prefix}Item`].findUnique({
        where: { id: fgItem.id }
      });

      const totalAvail = Number(currentItem.cachedQty || 0);
      if (totalAvail < quantity) {
        throw new ApiError(400, `❌ Insufficient stock for "${currentItem.name}". Required: ${quantity}, Available: ${totalAvail}.`);
      }

      const currentFactory = Number(currentItem.factoryQty || 0);
      const factoryDeduct = currentFactory >= quantity ? quantity : (currentFactory > 0 ? currentFactory : 0);
      const warehouseDeduct = quantity - factoryDeduct;

      if (warehouseDeduct > 0 && Number(currentItem.warehouseQty || 0) < warehouseDeduct) {
        throw new ApiError(400, `❌ Insufficient warehouse stock for "${currentItem.name}".`);
      }

      // Record factory inventory transaction if applicable
      if (factoryDeduct > 0) {
        await tx[`${prefix}InventoryTransaction`].create({
          data: {
            itemId: currentItem.id,
            quantity: factoryDeduct,
            direction: 'OUT',
            reason: 'SPOT_SALE',
            refType: 'SPOT_SALE',
            refId: saleNumber,
            location: 'FACTORY'
          }
        });
      }

      // Record warehouse inventory transaction if applicable
      if (warehouseDeduct > 0) {
        await tx[`${prefix}InventoryTransaction`].create({
          data: {
            itemId: currentItem.id,
            quantity: warehouseDeduct,
            direction: 'OUT',
            reason: 'SPOT_SALE',
            refType: 'SPOT_SALE',
            refId: saleNumber,
            location: 'WAREHOUSE'
          }
        });
      }

      // Decrement item inventory atomically
      await tx[`${prefix}Item`].update({
        where: { id: currentItem.id },
        data: {
          cachedQty: { decrement: quantity },
          ...(factoryDeduct > 0 && { factoryQty: { decrement: factoryDeduct } }),
          ...(warehouseDeduct > 0 && { warehouseQty: { decrement: warehouseDeduct } })
        }
      });

      // 19L bottle custody tracking
      const is19L = currentItem.name.toLowerCase().includes('19');
      if (is19L) {
        await tx[`${prefix}BottleTransaction`].create({
          data: {
            type: 'DELIVERED_TO_CUSTOMER',
            quantity: Math.round(quantity),
            customerId: customerId || null,
            reason: `Counter Sale 19L Refill (${saleNumber})`
          }
        });

        if (customerId) {
          await tx[`${prefix}Customer`].update({
            where: { id: customerId },
            data: { cachedBottleBalance: { increment: Math.round(quantity) } }
          });
        }
      }
    }

    // 2. Summary string for legacy/receipt compatibility
    const summaryProductType = processedItems
      .map(p => `${p.fgItem.name} (x${p.quantity})`)
      .join(', ');
    const totalQty = processedItems.reduce((acc, p) => acc + p.quantity, 0);

    // 3. Create parent SpotSale record
    const sale = await tx[`${prefix}SpotSale`].create({
      data: {
        saleNumber,
        productType: summaryProductType,
        productQty: totalQty,
        litresSold: totalLitres,
        totalAmount: numericTotalBill,
        amountPaid: numericAmountPaid,
        debtAmount: numericDebtAmount,
        cashCollected: numericAmountPaid,
        creditAmount: numericDebtAmount,
        paymentMethod: paymentMethod || 'CASH',
        remarks: remarks || null,
        customerId: customerId || null,
        createdById: req.user?.id || null
      }
    });

    // 4. Create child SpotSaleItem records
    for (const p of processedItems) {
      await tx[`${prefix}SpotSaleItem`].create({
        data: {
          spotSaleId: sale.id,
          itemId: p.fgItem.id,
          quantity: p.quantity,
          unitPrice: p.unitPrice,
          subtotal: p.subtotal
        }
      });
    }

    // 5. Update customer balance if debt occurred
    if (numericDebtAmount > 0 && customerId) {
      await tx[`${prefix}Customer`].update({
        where: { id: customerId },
        data: { currentBalance: { increment: numericDebtAmount } }
      });
    }

    // 6. Audit Log
    await createAuditLog(prefix, {
      action: 'COUNTER_SALE_CREATED',
      entityType: 'SPOT_SALE',
      entityId: sale.id,
      details: `Counter Sale ${saleNumber} created. Items: ${summaryProductType}, Bill: Rs. ${numericTotalBill}, Paid: Rs. ${numericAmountPaid}, Debt: Rs. ${numericDebtAmount}`,
      performedBy: req.user?.name || req.user?.id || 'System'
    });

    // 7. Re-fetch full sale with items for client return
    return tx[`${prefix}SpotSale`].findUnique({
      where: { id: sale.id },
      include: {
        customer: { select: { id: true, name: true, phone: true, currentBalance: true, deposit: true } },
        createdBy: { select: { id: true, name: true, role: true } },
        items: {
          include: {
            item: { select: { id: true, name: true, unit: true, retailPrice: true } }
          }
        }
      }
    });
  }, { maxWait: 10000, timeout: 30000 });

  broadcastDashboardUpdate(prefix);
  return sendSuccess(res, spotSale, 201);
});

/** Updates notes or payment method on a spot sale before daily close */
export const updateSpotSale = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const prefix = getTenantPrefix(req);
  const userRole = req.user?.role;

  const existing = await prisma[`${prefix}SpotSale`].findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, 'Counter sale record not found');

  const saleDate = new Date(existing.createdAt);
  saleDate.setHours(0, 0, 0, 0);
  const dailyClose = await prisma[`${prefix}DailyClose`].findFirst({
    where: { date: saleDate, adminConfirmed: true }
  });

  if (dailyClose && userRole !== 'OWNER') {
    throw new ApiError(403, 'This sale date has been Daily Closed. Only Owner can modify records after Daily Close.');
  }

  const { remarks, paymentMethod } = req.body;

  const updated = await prisma[`${prefix}SpotSale`].update({
    where: { id },
    data: {
      ...(remarks !== undefined && { remarks }),
      ...(paymentMethod !== undefined && { paymentMethod })
    },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      createdBy: { select: { id: true, name: true, role: true } },
      items: { include: { item: true } }
    }
  });

  await createAuditLog(prefix, {
    action: 'COUNTER_SALE_UPDATED',
    entityType: 'SPOT_SALE',
    entityId: id,
    details: `Counter Sale ${existing.saleNumber || id} updated by ${req.user?.name} (${userRole})`,
    performedBy: req.user?.name || req.user?.id || 'System'
  });

  return sendSuccess(res, updated);
});

/** Deletes a counter sale and restores inventory stock and customer debt (OWNER only) */
export const deleteSpotSale = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const prefix = getTenantPrefix(req);
  const userRole = req.user?.role;

  const existing = await prisma[`${prefix}SpotSale`].findUnique({
    where: { id },
    include: {
      items: { include: { item: true } }
    }
  });

  if (!existing) throw new ApiError(404, 'Counter sale record not found');
  if (userRole !== 'OWNER') throw new ApiError(403, 'Deleting counter sales is strictly restricted to Owner.');

  await prisma.$transaction(async (tx) => {
    // 1. Restore finished goods stock for each child line item
    if (Array.isArray(existing.items) && existing.items.length > 0) {
      for (const line of existing.items) {
        const returnQty = Number(line.quantity || 0);
        if (returnQty > 0) {
          await tx[`${prefix}Item`].update({
            where: { id: line.itemId },
            data: {
              cachedQty: { increment: returnQty },
              factoryQty: { increment: returnQty }
            }
          });

          await tx[`${prefix}InventoryTransaction`].create({
            data: {
              itemId: line.itemId,
              quantity: returnQty,
              direction: 'IN',
              reason: 'SPOT_SALE_DELETED',
              refType: 'SPOT_SALE',
              refId: existing.saleNumber || existing.id,
              location: 'FACTORY'
            }
          });

          // Revert 19L bottle transaction if applicable
          if (line.item?.name?.toLowerCase().includes('19')) {
            await tx[`${prefix}BottleTransaction`].create({
              data: {
                type: 'RETURNED_GOOD',
                quantity: Math.round(returnQty),
                customerId: existing.customerId || null,
                reason: `Reversal of deleted Counter Sale (${existing.saleNumber || existing.id})`
              }
            });

            if (existing.customerId) {
              await tx[`${prefix}Customer`].update({
                where: { id: existing.customerId },
                data: { cachedBottleBalance: { decrement: Math.round(returnQty) } }
              });
            }
          }
        }
      }
    }

    // 2. Revert customer debt if debt was accrued
    const debtToRevert = Number(existing.debtAmount || existing.creditAmount || 0);
    if (existing.customerId && debtToRevert > 0) {
      await tx[`${prefix}Customer`].update({
        where: { id: existing.customerId },
        data: { currentBalance: { decrement: debtToRevert } }
      });
    }

    // 3. Delete the parent SpotSale record (cascade deletes SpotSaleItem)
    await tx[`${prefix}SpotSale`].delete({ where: { id } });

    // 4. Audit Log
    await createAuditLog(prefix, {
      action: 'COUNTER_SALE_DELETED',
      entityType: 'SPOT_SALE',
      entityId: id,
      details: `Counter Sale ${existing.saleNumber || id} deleted by ${req.user?.name} (${userRole}). Stock and customer balances restored.`,
      performedBy: req.user?.name || req.user?.id || 'System'
    });
  }, { maxWait: 10000, timeout: 30000 });

  broadcastDashboardUpdate(prefix);
  return sendSuccess(res, null, 200, { message: 'Counter sale deleted and inventory restored successfully.' });
});

