import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { broadcastDashboardUpdate } from './analytics.controller.js';
import { broadcastEvent } from '../utils/sseBus.js';
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
        customer: { select: { id: true, name: true, phone: true, currentBalance: true, deposit: true } },
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
      litresSold: true,
      totalLitres: true,
      totalBottles: true,
      totalCaps: true
    }
  });

  let todayRevenue = 0;
  let todayPaid = 0;
  let todayDebt = 0;
  let todayLitres = 0;
  let todayBottles = 0;
  let todayCaps = 0;

  for (const s of todaySales) {
    const rev = Number(s.totalAmount) || (Number(s.cashCollected || 0) + Number(s.creditAmount || 0));
    const paid = Number(s.amountPaid) || Number(s.cashCollected || 0);
    const debt = Number(s.debtAmount) || Number(s.creditAmount || 0);
    const lit = Number(s.totalLitres || s.litresSold || 0);

    todayRevenue += rev;
    todayPaid += paid;
    todayDebt += debt;
    todayLitres += lit;
    todayBottles += Number(s.totalBottles || 0);
    todayCaps += Number(s.totalCaps || 0);
  }

  return sendSuccess(res, {
    todayRevenue,
    todayPaid,
    todayDebt,
    todayLitres,
    todayBottles,
    todayCaps,
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
    paymentMethod = 'CASH',
    customerId,
    remarks
  } = req.body;

  if (!Array.isArray(inputItems) || inputItems.length === 0) {
    throw new ApiError(400, 'At least one item must be selected for the sale.');
  }

  // Pre-validate customer if provided
  if (customerId && customerId.trim()) {
    const customerObj = await prisma[`${prefix}Customer`].findUnique({ where: { id: customerId } });
    if (!customerObj) throw new ApiError(404, 'Selected customer not found');
  }

  // Fetch all items referenced in the sale (finished goods or raw materials)
  const itemIds = inputItems.map(i => i.itemId).filter(Boolean);
  const dbItems = itemIds.length > 0 ? await prisma[`${prefix}Item`].findMany({
    where: {
      id: { in: itemIds },
      archivedAt: null
    }
  }) : [];

  const dbItemMap = new Map(dbItems.map(i => [i.id, i]));

  // Calculate line items and total bill
  let totalBill = new Prisma.Decimal(0);
  let totalLitres = 0;
  let totalRefillLitres = 0;
  let totalBottles = 0;
  let totalCaps = 0;
  const processedItems = [];

  for (const raw of inputItems) {
    const saleType = String(raw.saleType || (raw.unitType === 'PACK' ? 'PACK' : (raw.unitType === 'BOTTLE' ? 'BOTTLE' : 'FINISHED_GOOD'))).toUpperCase();
    const isPack = saleType === 'PACK';
    const isRefill = saleType === 'WATER_REFILL';
    const isCustomWater = saleType === 'CUSTOM_WATER';
    const isWater = isRefill || isCustomWater;
    const dbItem = raw.itemId ? dbItemMap.get(raw.itemId) : null;
    const isRawMaterial = saleType === 'RAW_MATERIAL' || (dbItem && dbItem.type === 'RAW_MATERIAL');
    const isCap = saleType === 'EXTRA_CAP' || (isRawMaterial && (raw.name || dbItem?.name || '').toLowerCase().includes('cap'));
    const isExtraCharge = saleType === 'EXTRA_CHARGE';
    const isExtra = isExtraCharge;

    if (!dbItem && !isExtra && !isWater && saleType !== 'EXTRA_CAP') {
      throw new ApiError(400, `Item "${raw.name || raw.itemId}" is either invalid or archived.`);
    }

    const qty = parseFloat(raw.quantity);
    if (isNaN(qty) || qty <= 0) {
      throw new ApiError(400, `Invalid quantity for "${raw.name || dbItem?.name || 'item'}". Must be greater than 0.`);
    }

    const unitPrice = parseFloat(raw.unitPrice !== undefined ? raw.unitPrice : (dbItem?.retailPrice || 0));
    if (isNaN(unitPrice) || unitPrice < 0) {
      throw new ApiError(400, `Invalid unit price for "${raw.name || dbItem?.name || 'item'}".`);
    }

    const subtotal = new Prisma.Decimal(qty).times(unitPrice);
    totalBill = totalBill.plus(subtotal);

    const packMultiplier = (isPack && dbItem) ? Number(dbItem.packSize || 1) : 1;
    // Water has no shortage in Pakistan — NEVER deduct finished good bottle/water stock for bulk/custom water or customer refills
    // Raw materials deduct qty directly (1:1 physical units)
    const baseUnitsDeduct = (isWater || isExtra) ? 0 : (isRawMaterial ? qty : (qty * packMultiplier));

    if (!isExtra && !isWater && !isRawMaterial) {
      totalBottles += Math.round(baseUnitsDeduct);
    }
    if (isCap) {
      totalCaps += Math.round(qty);
    }

    // Litres calculation (tracks physical volume for dispensing & mineral dosing)
    if (isCustomWater) {
      const customLitres = raw.litres ? parseFloat(raw.litres) : qty;
      totalRefillLitres += customLitres;
      totalLitres += customLitres;
    } else if (isRefill) {
      const refillLitres = (raw.litres ? parseFloat(raw.litres) : (qty * 24.0));
      totalRefillLitres += refillLitres;
      totalLitres += refillLitres;
    } else if (!isExtra && !isRawMaterial && dbItem) {
      const nameLower = (dbItem.name || '').toLowerCase();
      let litresPerUnit;
      if (nameLower.includes('0.5') || nameLower.includes('500')) litresPerUnit = isPack ? 9.0 : 0.75;
      else if (nameLower.includes('1.5') || nameLower.includes('1500')) litresPerUnit = isPack ? 12.0 : 2.0;
      else if (nameLower.includes('19')) litresPerUnit = 24.0;
      else litresPerUnit = 1.0;

      totalLitres += litresPerUnit * qty;
    }

    processedItems.push({
      item: dbItem,
      fgItem: dbItem?.type === 'FINISHED_GOOD' ? dbItem : (isWater ? dbItems.find(i => (i.name || '').toLowerCase().includes('19') || (i.name || '').toLowerCase().includes('water')) : null),
      itemId: raw.itemId,
      name: raw.name || dbItem?.name || (isCustomWater ? `Custom Water (${qty}L)` : (isRefill ? '19L Water Refill (Customer Bottle)' : (isCap ? 'Extra Cap' : 'Extra Item'))),
      saleType: isRawMaterial ? 'RAW_MATERIAL' : saleType,
      isRawMaterial,
      quantity: qty,
      baseUnitsDeduct,
      unitPrice,
      subtotal: Number(subtotal),
      litres: isCustomWater ? (raw.litres ? parseFloat(raw.litres) : qty) : (isRefill ? (raw.litres ? parseFloat(raw.litres) : qty * 24.0) : 0)
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
      const { fgItem, baseUnitsDeduct, saleType, quantity } = line;

      if (saleType === 'RAW_MATERIAL' || line.isRawMaterial) {
        const rawItem = await tx[`${prefix}Item`].findUnique({ where: { id: line.itemId } });
        if (!rawItem) throw new ApiError(404, `Raw material "${line.name}" not found`);
        const totalAvail = Number(rawItem.cachedQty || 0);
        if (totalAvail < quantity) {
          throw new ApiError(400, `❌ Insufficient stock for "${rawItem.name}". Required: ${quantity} ${rawItem.unit || 'units'}, Available: ${totalAvail}.`);
        }
        await tx[`${prefix}Item`].update({
          where: { id: rawItem.id },
          data: {
            cachedQty: { decrement: quantity },
            factoryQty: { decrement: quantity }
          }
        });
        await tx[`${prefix}InventoryTransaction`].create({
          data: {
            itemId: rawItem.id,
            quantity,
            direction: 'OUT',
            reason: 'SPOT_SALE_RAW_MATERIAL',
            refType: 'SPOT_SALE',
            refId: saleNumber,
            location: 'FACTORY'
          }
        });
        continue;
      }

      if (saleType === 'EXTRA_CAP') {
        const capRaw = await tx[`${prefix}Item`].findFirst({
          where: { type: 'RAW_MATERIAL', name: { contains: 'cap', mode: 'insensitive' }, archivedAt: null }
        });
        if (capRaw) {
          line.itemId = capRaw.id;
          await tx[`${prefix}Item`].update({
            where: { id: capRaw.id },
            data: { 
              cachedQty: { decrement: quantity },
              factoryQty: { decrement: quantity }
            }
          });
          await tx[`${prefix}InventoryTransaction`].create({
            data: {
              itemId: capRaw.id,
              quantity,
              direction: 'OUT',
              reason: 'SPOT_SALE_EXTRA_CAP',
              refType: 'SPOT_SALE',
              refId: saleNumber,
              location: 'FACTORY'
            }
          });
        }
        continue;
      }

      if (baseUnitsDeduct <= 0) {
        continue; // e.g. WATER_REFILL: bottle provided by customer
      }
      
      // Re-read current stock inside transaction for consistency
      const currentItem = await tx[`${prefix}Item`].findUnique({
        where: { id: fgItem.id }
      });

      const totalAvail = Number(currentItem.cachedQty || 0);
      if (totalAvail < baseUnitsDeduct) {
        throw new ApiError(400, `❌ Insufficient stock for "${currentItem.name}". Required: ${baseUnitsDeduct} bottles, Available: ${totalAvail}.`);
      }

      const currentFactory = Number(currentItem.factoryQty || 0);
      const currentWarehouse = Number(currentItem.warehouseQty || 0);
      const effectiveFactory = (currentFactory === 0 && currentWarehouse === 0) ? totalAvail : currentFactory;
      const effectiveWarehouse = (currentFactory === 0 && currentWarehouse === 0) ? 0 : currentWarehouse;

      const factoryDeduct = effectiveFactory >= baseUnitsDeduct ? baseUnitsDeduct : (effectiveFactory > 0 ? effectiveFactory : 0);
      const warehouseDeduct = baseUnitsDeduct - factoryDeduct;

      if (warehouseDeduct > 0 && effectiveWarehouse < warehouseDeduct) {
        throw new ApiError(400, `❌ Insufficient stock for "${currentItem.name}". Required: ${baseUnitsDeduct} bottles, Available: ${totalAvail}.`);
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

      // Decrement item inventory atomically in base units
      const newFactoryQty = Math.max(0, effectiveFactory - factoryDeduct);
      const newWarehouseQty = Math.max(0, effectiveWarehouse - warehouseDeduct);
      await tx[`${prefix}Item`].update({
        where: { id: currentItem.id },
        data: {
          cachedQty: { decrement: baseUnitsDeduct },
          factoryQty: newFactoryQty,
          warehouseQty: newWarehouseQty
        }
      });

      // 19L bottle custody tracking
      const is19L = currentItem.name.toLowerCase().includes('19');
      if (is19L) {
        await tx[`${prefix}BottleTransaction`].create({
          data: {
            type: 'DELIVERED_TO_CUSTOMER',
            quantity: Math.round(baseUnitsDeduct),
            customerId: customerId || null,
            reason: `Counter Sale 19L Refill (${saleNumber})`
          }
        });

        if (customerId) {
          await tx[`${prefix}Customer`].update({
            where: { id: customerId },
            data: { cachedBottleBalance: { increment: Math.round(baseUnitsDeduct) } }
          });
        }
      }
    }

    // 1b. Water Refill & Custom Water Mineral Deductions (Calcium, Magnesium, Sodium)
    if (totalRefillLitres > 0) {
      const mineralFraction = totalRefillLitres / 15141; // 15,141L capacity per full mineral set
      const caDeduct = Math.max(0.0001, Math.round((mineralFraction * 2) * 10000) / 10000);
      const mgDeduct = Math.max(0.0001, Math.round((mineralFraction * 1) * 10000) / 10000);
      const naDeduct = Math.max(0.0001, Math.round((mineralFraction * 0.5) * 10000) / 10000);

      const [calcium, magnesium, sodium] = await Promise.all([
        tx[`${prefix}Item`].findFirst({
          where: { type: 'RAW_MATERIAL', name: { contains: 'calcium', mode: 'insensitive' }, archivedAt: null }
        }),
        tx[`${prefix}Item`].findFirst({
          where: { type: 'RAW_MATERIAL', name: { contains: 'magnesium', mode: 'insensitive' }, archivedAt: null }
        }),
        tx[`${prefix}Item`].findFirst({
          where: { type: 'RAW_MATERIAL', name: { contains: 'sodium', mode: 'insensitive' }, archivedAt: null }
        })
      ]);

      const mineralsToDeduct = [
        { item: calcium, qty: caDeduct, name: 'Calcium' },
        { item: magnesium, qty: mgDeduct, name: 'Magnesium' },
        { item: sodium, qty: naDeduct, name: 'Sodium' }
      ];

      for (const m of mineralsToDeduct) {
        if (m.item && m.qty > 0) {
          await tx[`${prefix}Item`].update({
            where: { id: m.item.id },
            data: {
              cachedQty: { decrement: m.qty },
              factoryQty: { decrement: m.qty }
            }
          });
          await tx[`${prefix}InventoryTransaction`].create({
            data: {
              itemId: m.item.id,
              quantity: m.qty,
              direction: 'OUT',
              reason: 'SPOT_SALE_MINERAL_DOSING',
              refType: 'SPOT_SALE',
              refId: saleNumber,
              location: 'FACTORY'
            }
          });
        }
      }
    }

    // 2. Summary string for legacy/receipt compatibility
    const summaryProductType = processedItems
      .map(p => `${p.name || p.fgItem?.name} ${p.saleType === 'PACK' ? '(Pack)' : (p.saleType === 'BOTTLE' ? '(Bottle)' : (p.saleType === 'WATER_REFILL' ? '(Refill)' : (p.saleType === 'CUSTOM_WATER' ? '(Custom Water)' : '')))} (x${p.quantity})`)
      .join(', ');
    const totalQty = processedItems.reduce((acc, p) => acc + p.quantity, 0);

    // 3. Create parent SpotSale record
    const sale = await tx[`${prefix}SpotSale`].create({
      data: {
        saleNumber,
        productType: summaryProductType,
        productQty: totalQty,
        litresSold: totalLitres,
        totalLitres: new Prisma.Decimal(totalLitres),
        totalBottles,
        totalCaps,
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

    // 4. Create child SpotSaleItem records (all items persisted)
    let genericFallbackItem = null;
    for (const p of processedItems) {
      let targetItemId = p.itemId || p.fgItem?.id;
      if (!targetItemId) {
        if (!genericFallbackItem) {
          genericFallbackItem = await tx[`${prefix}Item`].findFirst({ where: { archivedAt: null } });
        }
        targetItemId = genericFallbackItem?.id;
      }
      if (targetItemId) {
        await tx[`${prefix}SpotSaleItem`].create({
          data: {
            spotSaleId: sale.id,
            itemId: targetItemId,
            saleType: p.saleType,
            quantity: p.quantity,
            unitPrice: p.unitPrice,
            subtotal: p.subtotal
          }
        });
      }
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
  broadcastEvent(prefix, 'COUNTER_SALE_CREATED', { saleId: spotSale.id });
  broadcastEvent(prefix, 'INVENTORY_CHANGED');
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

  broadcastDashboardUpdate(prefix);
  broadcastEvent(prefix, 'COUNTER_SALE_CREATED', { saleId: id });
  broadcastEvent(prefix, 'INVENTORY_CHANGED');

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
    // 1. Restore finished goods stock and raw caps for each child line item
    if (Array.isArray(existing.items) && existing.items.length > 0) {
      for (const line of existing.items) {
        const lineQty = Number(line.quantity || 0);
        if (lineQty <= 0) continue;

        if (line.saleType === 'WATER_REFILL' || line.saleType === 'EXTRA_CHARGE') {
          continue; // Refills and extra charges never deducted container stock
        }

        if (line.saleType === 'EXTRA_CAP') {
          const capRaw = line.itemId 
            ? await tx[`${prefix}Item`].findUnique({ where: { id: line.itemId } })
            : await tx[`${prefix}Item`].findFirst({
                where: { type: 'RAW_MATERIAL', name: { contains: 'cap', mode: 'insensitive' }, archivedAt: null }
              });
          if (capRaw) {
            await tx[`${prefix}Item`].update({
              where: { id: capRaw.id },
              data: { cachedQty: { increment: lineQty } }
            });
            await tx[`${prefix}InventoryTransaction`].create({
              data: {
                itemId: capRaw.id,
                quantity: lineQty,
                direction: 'IN',
                reason: 'SPOT_SALE_DELETED_EXTRA_CAP',
                refType: 'SPOT_SALE',
                refId: existing.saleNumber || existing.id,
                location: 'FACTORY'
              }
            });
          }
          continue;
        }

        const returnBaseUnits = line.saleType === 'PACK' 
          ? lineQty * Number(line.item?.packSize || 1) 
          : lineQty;

        if (returnBaseUnits > 0 && line.itemId) {
          await tx[`${prefix}Item`].update({
            where: { id: line.itemId },
            data: {
              cachedQty: { increment: returnBaseUnits },
              factoryQty: { increment: returnBaseUnits }
            }
          });

          await tx[`${prefix}InventoryTransaction`].create({
            data: {
              itemId: line.itemId,
              quantity: returnBaseUnits,
              direction: 'IN',
              reason: 'SPOT_SALE_DELETED',
              refType: 'SPOT_SALE',
              refId: existing.saleNumber || existing.id,
              location: 'FACTORY'
            }
          });

          // Revert customer bottle balance if 19L bottle
          if (line.item?.name?.toLowerCase().includes('19')) {
            await tx[`${prefix}BottleTransaction`].create({
              data: {
                type: 'RETURNED_GOOD',
                quantity: Math.round(returnBaseUnits),
                customerId: existing.customerId || null,
                reason: `Reversal of deleted Counter Sale (${existing.saleNumber || existing.id})`
              }
            });

            if (existing.customerId) {
              await tx[`${prefix}Customer`].update({
                where: { id: existing.customerId },
                data: { cachedBottleBalance: { decrement: Math.round(returnBaseUnits) } }
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
  broadcastEvent(prefix, 'COUNTER_SALE_CREATED', { saleId: id, deleted: true });
  broadcastEvent(prefix, 'INVENTORY_CHANGED');
  return sendSuccess(res, null, 200, { message: 'Counter sale deleted and inventory restored successfully.' });
});

