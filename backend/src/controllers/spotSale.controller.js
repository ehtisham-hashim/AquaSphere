import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { broadcastDashboardUpdate } from './analytics.controller.js';
import pkg from '@prisma/client';
const { Prisma } = pkg;

const getTenantPrefix = (req) => {
  const cookieVal = req.cookies?.tenant || req.cookies?.company;
  const headerVal = req.headers['x-tenant'];
  const tenant = (cookieVal || headerVal || 'aquasphere').toLowerCase();
  return tenant === 'wadaana' ? 'wadaana' : 'aquasphere';
};

const generateSaleNumber = () => {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, '0');
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const y = String(now.getFullYear()).slice(-2);
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CS-${d}${m}${y}-${rand}`;
};

// GET /api/v1/spot-sales
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
        customer: {
          select: { id: true, name: true, phone: true, currentBalance: true, creditLimit: true }
        },
        createdBy: {
          select: { id: true, name: true, role: true }
        }
      }
    }),
    prisma[`${prefix}SpotSale`].count()
  ]);

  res.status(200).json({
    success: true,
    data: sales,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit)
    }
  });
});

// POST /api/v1/spot-sales
export const createSpotSale = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { 
    productType = 'CUSTOM',
    productQty = 1,
    litresSold, 
    capsIssued = 0, 
    cashCollected = 0, 
    creditAmount = 0, 
    paymentMethod = 'CASH', 
    customerId, 
    remarks 
  } = req.body;

  const litres = parseFloat(litresSold);
  const caps = parseInt(capsIssued || 0, 10);
  const cash = parseFloat(cashCollected || 0);
  const credit = parseFloat(creditAmount || 0);
  const qty = parseFloat(productQty || 1);

  if (isNaN(litres) || litres <= 0) {
    throw new ApiError(400, 'Litres sold must be a positive number');
  }
  if (isNaN(cash) || cash < 0) {
    throw new ApiError(400, 'Cash collected must be a non-negative number');
  }
  if (isNaN(credit) || credit < 0) {
    throw new ApiError(400, 'Credit amount must be a non-negative number');
  }

  // Credit Rule: Customer selection is MANDATORY for credit sales
  if (credit > 0 && (!customerId || !customerId.trim())) {
    throw new ApiError(400, 'Customer selection is mandatory for credit sales (Credit Amount > 0)');
  }

  let customerObj = null;
  if (customerId) {
    customerObj = await prisma[`${prefix}Customer`].findUnique({
      where: { id: customerId }
    });
    if (!customerObj) {
      throw new ApiError(404, 'Selected customer not found');
    }
  }

  // Stock Checks for Caps
  if (caps > 0) {
    const capItem = await prisma[`${prefix}Item`].findFirst({
      where: {
        type: 'RAW_MATERIAL',
        archivedAt: null,
        name: { contains: 'cap', mode: 'insensitive' }
      }
    });
    if (capItem && Number(capItem.cachedQty) < caps) {
      throw new ApiError(400, `Insufficient cap stock. Required: ${caps}, Available: ${capItem.cachedQty}`);
    }
  }

  const saleNumber = generateSaleNumber();

  // Deduct finished goods packs and loose bottles derivation
  let openPackLeftover = 0;

  const spotSale = await prisma.$transaction(async (tx) => {
    // 1. Finished Goods Stock Deduction for 0.5L and 1.5L Packs & Single Bottles
    if (productType === 'PACK_05L' || productType === 'SINGLE_05L') {
      const fg05L = await tx[`${prefix}Item`].findFirst({
        where: {
          type: 'FINISHED_GOOD',
          archivedAt: null,
          name: { contains: '0.5', mode: 'insensitive' }
        }
      });

      if (fg05L) {
        if (productType === 'PACK_05L') {
          // Full Pack sale: deduct 'qty' packs directly
          await tx[`${prefix}InventoryTransaction`].create({
            data: { itemId: fg05L.id, quantity: qty, direction: 'OUT', reason: 'SPOT_SALE_PACK_05L', refType: 'SPOT_SALE', refId: saleNumber }
          });
          await tx[`${prefix}Item`].update({
            where: { id: fg05L.id }, data: { cachedQty: { decrement: qty } }
          });
        } else if (productType === 'SINGLE_05L') {
          // Single 0.5L bottles: 12 single bottles = 1 Pack. Calculate pack fraction/open pack leftover
          const packDeduction = new Prisma.Decimal(qty).dividedBy(12);
          const looseBottles = qty % 12;
          openPackLeftover = (12 - looseBottles) % 12;

          await tx[`${prefix}InventoryTransaction`].create({
            data: { itemId: fg05L.id, quantity: packDeduction, direction: 'OUT', reason: 'SPOT_SALE_SINGLE_05L', refType: 'SPOT_SALE', refId: saleNumber }
          });
          await tx[`${prefix}Item`].update({
            where: { id: fg05L.id }, data: { cachedQty: { decrement: packDeduction } }
          });
        }
      }
    } else if (productType === 'PACK_15L' || productType === 'SINGLE_15L') {
      const fg15L = await tx[`${prefix}Item`].findFirst({
        where: {
          type: 'FINISHED_GOOD',
          archivedAt: null,
          name: { contains: '1.5', mode: 'insensitive' }
        }
      });

      if (fg15L) {
        if (productType === 'PACK_15L') {
          // Full Pack sale: deduct 'qty' packs directly
          await tx[`${prefix}InventoryTransaction`].create({
            data: { itemId: fg15L.id, quantity: qty, direction: 'OUT', reason: 'SPOT_SALE_PACK_15L', refType: 'SPOT_SALE', refId: saleNumber }
          });
          await tx[`${prefix}Item`].update({
            where: { id: fg15L.id }, data: { cachedQty: { decrement: qty } }
          });
        } else if (productType === 'SINGLE_15L') {
          // Single 1.5L bottles: 6 single bottles = 1 Pack.
          const packDeduction = new Prisma.Decimal(qty).dividedBy(6);
          const looseBottles = qty % 6;
          openPackLeftover = (6 - looseBottles) % 6;

          await tx[`${prefix}InventoryTransaction`].create({
            data: { itemId: fg15L.id, quantity: packDeduction, direction: 'OUT', reason: 'SPOT_SALE_SINGLE_15L', refType: 'SPOT_SALE', refId: saleNumber }
          });
          await tx[`${prefix}Item`].update({
            where: { id: fg15L.id }, data: { cachedQty: { decrement: packDeduction } }
          });
        }
      }
    } else if (productType === 'BOTTLE_19L') {
      const fg19L = await tx[`${prefix}Item`].findFirst({
        where: {
          type: 'FINISHED_GOOD',
          archivedAt: null,
          name: { contains: '19', mode: 'insensitive' }
        }
      });
      if (fg19L) {
        await tx[`${prefix}InventoryTransaction`].create({
          data: { itemId: fg19L.id, quantity: qty, direction: 'OUT', reason: 'SPOT_SALE_19L', refType: 'SPOT_SALE', refId: saleNumber }
        });
        await tx[`${prefix}Item`].update({
          where: { id: fg19L.id }, data: { cachedQty: { decrement: qty } }
        });
      }
      // Log to Bottle Ledger as delivered
      await tx[`${prefix}BottleTransaction`].create({
        data: { type: 'DELIVERED_TO_CUSTOMER', quantity: Math.round(qty), reason: `Counter Sale 19L Refill (${saleNumber})` }
      });
    }

    // 2. Create Spot Sale record
    const sale = await tx[`${prefix}SpotSale`].create({
      data: {
        saleNumber,
        productType,
        productQty: qty,
        openPackLeftover,
        litresSold: litres,
        capsIssued: caps,
        cashCollected: cash,
        creditAmount: credit,
        paymentMethod: paymentMethod || 'CASH',
        remarks: remarks || null,
        customerId: customerId || null,
        createdById: req.user?.id || null
      },
      include: {
        customer: {
          select: { id: true, name: true, phone: true }
        },
        createdBy: {
          select: { id: true, name: true, role: true }
        }
      }
    });

    // 3. Update Customer outstanding balance for credit sales
    if (credit > 0 && customerId) {
      await tx[`${prefix}Customer`].update({
        where: { id: customerId },
        data: {
          currentBalance: { increment: credit }
        }
      });
    }

    // 4. Deduct caps from inventory if issued
    if (caps > 0) {
      const capItem = await tx[`${prefix}Item`].findFirst({
        where: {
          type: 'RAW_MATERIAL',
          archivedAt: null,
          name: { contains: 'cap', mode: 'insensitive' }
        }
      });

      if (capItem) {
        await tx[`${prefix}InventoryTransaction`].create({
          data: {
            itemId: capItem.id,
            quantity: caps,
            direction: 'OUT',
            reason: 'SPOT_SALE_CAPS',
            refType: 'SPOT_SALE',
            refId: sale.id
          }
        });

        await tx[`${prefix}Item`].update({
          where: { id: capItem.id },
          data: { cachedQty: { decrement: caps } }
        });
      }
    }

    // 5. Deduct mineral fractions for water treated (1 mineral set = 15,140 Litres)
    const WATER_PER_MINERAL_SET = 15140;
    const mineralSetFraction = new Prisma.Decimal(litres).dividedBy(WATER_PER_MINERAL_SET);

    const items = await tx[`${prefix}Item`].findMany({
      where: { type: 'RAW_MATERIAL', archivedAt: null }
    });

    const minerals = [
      { search: 'calcium', factor: 2 },
      { search: 'magnesium', factor: 1 },
      { search: 'sodium', factor: 0.5 }
    ];

    for (const m of minerals) {
      const minItem = items.find(i => i.name.toLowerCase().includes(m.search));
      if (minItem && mineralSetFraction.greaterThan(0)) {
        const qtyUsed = mineralSetFraction.mul(m.factor);
        await tx[`${prefix}InventoryTransaction`].create({
          data: {
            itemId: minItem.id,
            quantity: qtyUsed,
            direction: 'OUT',
            reason: 'SPOT_SALE_MINERALS',
            refType: 'SPOT_SALE',
            refId: sale.id
          }
        });

        await tx[`${prefix}Item`].update({
          where: { id: minItem.id },
          data: { cachedQty: { decrement: qtyUsed } }
        });
      }
    }

    // 6. Create Audit Log entry
    await tx[`${prefix}AuditLog`].create({
      data: {
        action: 'COUNTER_SALE_CREATED',
        entityType: 'SPOT_SALE',
        entityId: sale.id,
        details: `Counter Sale ${saleNumber} created. Product: ${productType} x ${qty}, Litres: ${litres}L, Caps: ${caps}, Amount: Rs. ${cash + credit}, Recorded By: ${req.user?.name || 'User'} (${req.user?.role || 'MM'})`,
        performedBy: req.user?.name || req.user?.id || 'System'
      }
    });

    return sale;
  });

  broadcastDashboardUpdate(prefix);
  res.status(201).json({ success: true, data: spotSale });
});

// PUT /api/v1/spot-sales/:id
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

  await prisma[`${prefix}AuditLog`].create({
    data: {
      action: 'COUNTER_SALE_UPDATED',
      entityType: 'SPOT_SALE',
      entityId: id,
      details: `Counter Sale ${existing.saleNumber || id} updated by ${req.user?.name} (${userRole})`,
      performedBy: req.user?.name || req.user?.id || 'System'
    }
  });

  res.status(200).json({ success: true, data: updated });
});

// DELETE /api/v1/spot-sales/:id
export const deleteSpotSale = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const prefix = getTenantPrefix(req);
  const userRole = req.user?.role;

  const existing = await prisma[`${prefix}SpotSale`].findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, 'Counter sale record not found');

  if (userRole !== 'OWNER') {
    throw new ApiError(403, 'Deleting counter sales is strictly restricted to Owner.');
  }

  await prisma.$transaction(async (tx) => {
    if (existing.customerId && Number(existing.creditAmount) > 0) {
      await tx[`${prefix}Customer`].update({
        where: { id: existing.customerId },
        data: { currentBalance: { decrement: Number(existing.creditAmount) } }
      });
    }

    await tx[`${prefix}SpotSale`].delete({ where: { id } });

    await tx[`${prefix}AuditLog`].create({
      data: {
        action: 'COUNTER_SALE_DELETED',
        entityType: 'SPOT_SALE',
        entityId: id,
        details: `Counter Sale ${existing.saleNumber || id} deleted by ${req.user?.name} (${userRole})`,
        performedBy: req.user?.name || req.user?.id || 'System'
      }
    });
  });

  broadcastDashboardUpdate(prefix);
  res.status(200).json({ success: true, message: 'Counter sale deleted successfully' });
});
