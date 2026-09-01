import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { broadcastDashboardUpdate } from './analytics.controller.js';
import { getTenantPrefix } from '../utils/tenant.js';
import { createAuditLog } from '../utils/auditLog.js';
import { sendSuccess } from '../utils/response.js';
import pkg from '@prisma/client';
const { Prisma } = pkg;

const LITRES_MAP = {
  'PACK_05L': 9.0,
  'SINGLE_05L': 0.75,
  'PACK_15L': 12.0,
  'SINGLE_15L': 2.0,
  'BOTTLE_19L': 24.0,
  'CUSTOM': 1.0
};

const generateSaleNumber = () => {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, '0');
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const y = String(now.getFullYear()).slice(-2);
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CS-${d}${m}${y}-${rand}`;
};

/** Retrieves paginated spot/counter sales */
export const getSpotSales = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const skip = (page - 1) * limit;
  const prefix = getTenantPrefix(req);

  const [sales, total] = await Promise.all([
    prisma[`${prefix}SpotSale`].findMany({
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, name: true, phone: true, currentBalance: true, creditLimit: true } },
        createdBy: { select: { id: true, name: true, role: true } }
      }
    }),
    prisma[`${prefix}SpotSale`].count()
  ]);

  return sendSuccess(res, sales, 200, {
    pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) }
  });
});

/** Records a walk-in / spot sale transaction */
export const createSpotSale = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const {
    productType = 'CUSTOM', productQty = 1, items: inputItems,
    litresSold, capsIssued = 0, cashCollected = 0, creditAmount = 0,
    paymentMethod = 'CASH', customerId, remarks
  } = req.body;

  const itemsList = (Array.isArray(inputItems) && inputItems.length > 0)
    ? inputItems
    : [{ productType, productQty: parseFloat(productQty || 1) }];

  const cash = parseFloat(cashCollected || 0);
  const credit = parseFloat(creditAmount || 0);
  const caps = parseInt(capsIssued || 0, 10);

  if (isNaN(cash) || cash < 0) throw new ApiError(400, 'Cash collected must be a non-negative number');
  if (isNaN(credit) || credit < 0) throw new ApiError(400, 'Credit amount must be a non-negative number');
  if (credit > 0 && (!customerId || !customerId.trim())) {
    throw new ApiError(400, 'Customer selection is mandatory for credit sales (Credit Amount > 0)');
  }

  if (customerId) {
    const customerObj = await prisma[`${prefix}Customer`].findUnique({ where: { id: customerId } });
    if (!customerObj) throw new ApiError(404, 'Selected customer not found');
  }

  const saleNumber = generateSaleNumber();

  const spotSale = await prisma.$transaction(async (tx) => {
    const finishedGoods = await tx[`${prefix}Item`].findMany({
      where: { type: 'FINISHED_GOOD', archivedAt: null }
    });

    const findFG = (keywords) => finishedGoods.find(i => keywords.some(kw => i.name.toLowerCase().includes(kw.toLowerCase())));

    const deductStock = async (fgItem, qtyDeduct, reason) => {
      const avail = Number(fgItem.cachedQty || 0);
      if (avail < qtyDeduct) {
        throw new ApiError(400, `❌ Cannot process Counter Sale: Insufficient stock for "${fgItem.name}". Required: ${qtyDeduct}, Available: ${avail}.`);
      }

      const currentFactory = Number(fgItem.factoryQty || 0);
      const factoryDeduct = currentFactory >= qtyDeduct ? qtyDeduct : (currentFactory > 0 ? currentFactory : 0);
      const warehouseDeduct = qtyDeduct - factoryDeduct;

      await tx[`${prefix}InventoryTransaction`].create({
        data: {
          itemId: fgItem.id,
          quantity: qtyDeduct,
          direction: 'OUT',
          reason,
          refType: 'SPOT_SALE',
          refId: saleNumber,
          location: factoryDeduct > 0 ? 'FACTORY' : 'WAREHOUSE'
        }
      });

      await tx[`${prefix}Item`].update({
        where: { id: fgItem.id },
        data: {
          cachedQty: { decrement: qtyDeduct },
          ...(factoryDeduct > 0 && { factoryQty: { decrement: factoryDeduct } }),
          ...(warehouseDeduct > 0 && { warehouseQty: { decrement: warehouseDeduct } })
        }
      });
    };

    let totalLitresCalculated = 0;
    let openPackLeftover = 0;
    const summaryProductType = itemsList.map(i => `${i.productType} (x${i.productQty})`).join(', ');
    const totalQty = itemsList.reduce((acc, i) => acc + Number(i.productQty || 1), 0);

    for (const item of itemsList) {
      const pType = item.productType;
      const pQty = parseFloat(item.productQty || 1);
      totalLitresCalculated += (LITRES_MAP[pType] || 1.0) * pQty;

      if (pType === 'PACK_05L' || pType === 'SINGLE_05L') {
        const fg05L = findFG(['500ml', '0.5l', '0.5', '500']);
        if (fg05L) {
          if (pType === 'PACK_05L') {
            await deductStock(fg05L, pQty, 'SPOT_SALE_PACK_05L');
          } else {
            const packDeduction = Number(new Prisma.Decimal(pQty).dividedBy(12));
            const looseBottles = pQty % 12;
            openPackLeftover += (12 - looseBottles) % 12;
            await deductStock(fg05L, packDeduction, 'SPOT_SALE_SINGLE_05L');
          }
        }
      } else if (pType === 'PACK_15L' || pType === 'SINGLE_15L') {
        const fg15L = findFG(['1.5l', '1500ml', '1.5', '1500']);
        if (fg15L) {
          if (pType === 'PACK_15L') {
            await deductStock(fg15L, pQty, 'SPOT_SALE_PACK_15L');
          } else {
            const packDeduction = Number(new Prisma.Decimal(pQty).dividedBy(6));
            const looseBottles = pQty % 6;
            openPackLeftover += (6 - looseBottles) % 6;
            await deductStock(fg15L, packDeduction, 'SPOT_SALE_SINGLE_15L');
          }
        }
      } else if (pType === 'BOTTLE_19L') {
        const fg19L = findFG(['19l', '19']);
        if (fg19L) await deductStock(fg19L, pQty, 'SPOT_SALE_19L');
        await tx[`${prefix}BottleTransaction`].create({
          data: { type: 'DELIVERED_TO_CUSTOMER', quantity: Math.round(pQty), reason: `Counter Sale 19L Refill (${saleNumber})` }
        });
      }
    }

    const finalLitres = parseFloat(litresSold) || totalLitresCalculated;

    const sale = await tx[`${prefix}SpotSale`].create({
      data: {
        saleNumber,
        productType: summaryProductType,
        productQty: totalQty,
        openPackLeftover,
        litresSold: finalLitres,
        capsIssued: caps,
        cashCollected: cash,
        creditAmount: credit,
        paymentMethod: paymentMethod || 'CASH',
        remarks: remarks || null,
        customerId: customerId || null,
        createdById: req.user?.id || null
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        createdBy: { select: { id: true, name: true, role: true } }
      }
    });

    if (credit > 0 && customerId) {
      await tx[`${prefix}Customer`].update({
        where: { id: customerId },
        data: { currentBalance: { increment: credit } }
      });
    }

    await createAuditLog(prefix, {
      action: 'COUNTER_SALE_CREATED',
      entityType: 'SPOT_SALE',
      entityId: sale.id,
      details: `Counter Sale ${saleNumber} created. Product: ${summaryProductType}, Total Qty: ${totalQty}, Litres: ${finalLitres}L, Caps: ${caps}, Amount: Rs. ${cash + credit}`,
      performedBy: req.user?.name || req.user?.id || 'System'
    });

    return sale;
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

/** Deletes a counter sale and reverts credit (OWNER only) */
export const deleteSpotSale = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const prefix = getTenantPrefix(req);
  const userRole = req.user?.role;

  const existing = await prisma[`${prefix}SpotSale`].findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, 'Counter sale record not found');

  if (userRole !== 'OWNER') throw new ApiError(403, 'Deleting counter sales is strictly restricted to Owner.');

  await prisma.$transaction(async (tx) => {
    if (existing.customerId && Number(existing.creditAmount) > 0) {
      await tx[`${prefix}Customer`].update({
        where: { id: existing.customerId },
        data: { currentBalance: { decrement: Number(existing.creditAmount) } }
      });
    }

    await tx[`${prefix}SpotSale`].delete({ where: { id } });

    await createAuditLog(prefix, {
      action: 'COUNTER_SALE_DELETED',
      entityType: 'SPOT_SALE',
      entityId: id,
      details: `Counter Sale ${existing.saleNumber || id} deleted by ${req.user?.name} (${userRole})`,
      performedBy: req.user?.name || req.user?.id || 'System'
    });
  }, { maxWait: 10000, timeout: 30000 });

  broadcastDashboardUpdate(prefix);
  return sendSuccess(res, null, 200, { message: 'Counter sale deleted successfully' });
});

