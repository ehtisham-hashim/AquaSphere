import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { broadcastDashboardUpdate } from './analytics.controller.js';
import { Prisma } from '@prisma/client';

const getTenantPrefix = (req) => {
  const tenant = (req.headers['x-tenant'] || 'aquasphere').toLowerCase();
  return tenant === 'wadaana' ? 'wadaana' : 'aquasphere';
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
      orderBy: { createdAt: 'desc' }
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
  const { litresSold, capsIssued = 0, cashCollected, paymentMethod = 'CASH', remarks } = req.body;

  const litres = parseFloat(litresSold);
  const caps = parseInt(capsIssued || 0);
  const cash = parseFloat(cashCollected);

  if (isNaN(litres) || litres <= 0) {
    throw new ApiError(400, 'Litres sold must be a positive number');
  }
  if (isNaN(cash) || cash < 0) {
    throw new ApiError(400, 'Cash collected must be a non-negative number');
  }

  const spotSale = await prisma.$transaction(async (tx) => {
    // 1. Create Spot Sale record
    const sale = await tx[`${prefix}SpotSale`].create({
      data: {
        litresSold: litres,
        capsIssued: caps,
        cashCollected: cash,
        paymentMethod: paymentMethod || 'CASH',
        remarks: remarks || null,
        createdById: req.user?.id || 'SYSTEM'
      }
    });

    // 2. Deduct caps from inventory if issued
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

    // 3. Deduct mineral fractions for water treated (1 mineral set = 15,140 Litres)
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

    return sale;
  });

  broadcastDashboardUpdate();
  res.status(201).json({ success: true, data: spotSale });
});
