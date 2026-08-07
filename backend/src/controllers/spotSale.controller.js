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

  // Auto-heal missing inventory transactions for recent spot sales
  try {
    const recentSales = await prisma[`${prefix}SpotSale`].findMany({
      take: 20,
      orderBy: { createdAt: 'desc' }
    });
    const allItems = await prisma[`${prefix}Item`].findMany({ where: { archivedAt: null } });

    for (const sale of recentSales) {
      const existingTx = await prisma[`${prefix}InventoryTransaction`].findFirst({
        where: { refType: 'SPOT_SALE', refId: sale.saleNumber }
      });

      if (!existingTx) {
        let fgItem = null;
        let qtyToDeduct = Number(sale.productQty || 1);

        if (sale.productType === 'PACK_05L' || sale.productType === 'SINGLE_05L') {
          fgItem = allItems.find(i => (i.type === 'FINISHED_GOOD' || !i.type) && ['500ml', '0.5l', '0.5', '500'].some(kw => i.name.toLowerCase().includes(kw)));
          if (sale.productType === 'SINGLE_05L') qtyToDeduct = qtyToDeduct / 12;
        } else if (sale.productType === 'PACK_15L' || sale.productType === 'SINGLE_15L') {
          fgItem = allItems.find(i => (i.type === 'FINISHED_GOOD' || !i.type) && ['1.5l', '1500ml', '1.5', '1500'].some(kw => i.name.toLowerCase().includes(kw)));
          if (sale.productType === 'SINGLE_15L') qtyToDeduct = qtyToDeduct / 6;
        } else if (sale.productType === 'BOTTLE_19L') {
          fgItem = allItems.find(i => (i.type === 'FINISHED_GOOD' || !i.type) && ['19l', '19'].some(kw => i.name.toLowerCase().includes(kw)));
        }

        if (fgItem) {
          const currentFactory = Number(fgItem.factoryQty || 0);
          let factoryDeduct = 0;
          let warehouseDeduct = 0;

          if (currentFactory >= qtyToDeduct) {
            factoryDeduct = qtyToDeduct;
          } else if (currentFactory > 0) {
            factoryDeduct = currentFactory;
            warehouseDeduct = qtyToDeduct - currentFactory;
          } else {
            warehouseDeduct = qtyToDeduct;
          }

          await prisma[`${prefix}InventoryTransaction`].create({
            data: {
              itemId: fgItem.id,
              quantity: qtyToDeduct,
              direction: 'OUT',
              reason: `SPOT_SALE_${sale.productType}`,
              refType: 'SPOT_SALE',
              refId: sale.saleNumber,
              createdAt: sale.createdAt,
              location: factoryDeduct > 0 ? 'FACTORY' : 'WAREHOUSE'
            }
          });

          const updateData = { cachedQty: { decrement: qtyToDeduct } };
          if (factoryDeduct > 0) {
            updateData.factoryQty = { decrement: factoryDeduct };
          }
          if (warehouseDeduct > 0) {
            updateData.warehouseQty = { decrement: warehouseDeduct };
          }

          await prisma[`${prefix}Item`].update({
            where: { id: fgItem.id },
            data: updateData
          });
        }
      }
    }
  } catch (err) {
    console.error('SpotSale auto-heal warning:', err);
  }

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
    items: inputItems,
    litresSold, 
    capsIssued = 0, 
    cashCollected = 0, 
    creditAmount = 0, 
    paymentMethod = 'CASH', 
    customerId, 
    remarks 
  } = req.body;

  const itemsList = (Array.isArray(inputItems) && inputItems.length > 0) 
    ? inputItems 
    : [{ productType, productQty: parseFloat(productQty || 1) }];

  const cash = parseFloat(cashCollected || 0);
  const credit = parseFloat(creditAmount || 0);
  const caps = parseInt(capsIssued || 0, 10);

  const litresMap = {
    'PACK_05L': 9.0,
    'SINGLE_05L': 0.75,
    'PACK_15L': 12.0,
    'SINGLE_15L': 2.0,
    'BOTTLE_19L': 24.0,
    'CUSTOM': 1.0
  };

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
    
    if (credit > 0 && customerObj.creditLimit > 0) {
      const currentBalance = Number(customerObj.currentBalance || 0);
      const creditLimit = Number(customerObj.creditLimit || 0);
      const projectedBalance = currentBalance + credit;
      
      if (projectedBalance > creditLimit) {
        console.warn(`CREDIT_LIMIT_EXCEEDED: Customer ${customerObj.name} balance will reach Rs ${projectedBalance} (Limit: Rs ${creditLimit})`);
      }
    }
  }

  const saleNumber = generateSaleNumber();

  const spotSale = await prisma.$transaction(async (tx) => {
    const allItems = await tx[`${prefix}Item`].findMany({
      where: { archivedAt: null }
    });

    const findFG = (keywords) => {
      return allItems.find(i => (i.type === 'FINISHED_GOOD' || !i.type) && keywords.some(kw => i.name.toLowerCase().includes(kw.toLowerCase())));
    };

    // Helper for location-based stock deduction
    const deductStock = async (fgItem, qtyDeduct, reason) => {
      const avail = Number(fgItem.cachedQty || 0);
      if (avail < qtyDeduct) {
        throw new ApiError(
          400,
          `❌ Cannot process Counter Sale: Insufficient finished stock for "${fgItem.name}". Required: ${qtyDeduct}, Available: ${avail}. Please produce or add finished goods in Inventory first.`
        );
      }

      const currentFactory = Number(fgItem.factoryQty || 0);
      let factoryDeduct = 0;
      let warehouseDeduct = 0;

      if (currentFactory >= qtyDeduct) {
        factoryDeduct = qtyDeduct;
      } else if (currentFactory > 0) {
        factoryDeduct = currentFactory;
        warehouseDeduct = qtyDeduct - currentFactory;
      } else {
        warehouseDeduct = qtyDeduct;
      }

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
      const itemLitres = (litresMap[pType] || 1.0) * pQty;
      totalLitresCalculated += itemLitres;

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
        if (fg19L) {
          await deductStock(fg19L, pQty, 'SPOT_SALE_19L');
        }
        await tx[`${prefix}BottleTransaction`].create({
          data: { type: 'DELIVERED_TO_CUSTOMER', quantity: Math.round(pQty), reason: `Counter Sale 19L Refill (${saleNumber})` }
        });
      }
    }

    const finalLitres = parseFloat(litresSold) || totalLitresCalculated;

    // 2. Create Spot Sale record
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

    // 6. Create Audit Log entry
    await tx[`${prefix}AuditLog`].create({
      data: {
        action: 'COUNTER_SALE_CREATED',
        entityType: 'SPOT_SALE',
        entityId: sale.id,
        details: `Counter Sale ${saleNumber} created. Product: ${summaryProductType}, Total Qty: ${totalQty}, Litres: ${finalLitres}L, Caps: ${caps}, Amount: Rs. ${cash + credit}, Recorded By: ${req.user?.name || 'User'} (${req.user?.role || 'MM'})`,
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
