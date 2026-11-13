import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getTenantPrefix } from '../utils/tenant.js';
import { sendSuccess } from '../utils/response.js';

const cachedDashboardData = { aquasphere: null, wadaana: null };
const sseClients = { aquasphere: [], wadaana: [] };

const computeDashboardAnalytics = async (prefix) => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
  const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
  const startOfLast3Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2, 0, 0, 0);
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  const startOfYear = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1, 0, 0, 0);
  const minDate = twelveMonthsAgo < startOfYear ? twelveMonthsAgo : startOfYear;

  const [orders, payments, expenses, purchases, spotSales, pendingPayables, rawMaterials, customersWithBottles, customerReceivablesAgg, vendorPayments, purchaseItems, recipeItems, pendingDispatchCount] = await Promise.all([
    prisma[`${prefix}Order`].findMany({
      where: { 
        createdAt: { gte: minDate, lte: endOfDay },
        deliveryStatus: { not: 'CANCELLED' }
      },
      select: { 
        id: true,
        createdAt: true, 
        deliveryStatus: true,
        paymentStatus: true,
        withGst: true,
        customer: { select: { id: true, name: true, phone: true } },
        items: { 
          select: { 
            itemId: true,
            price: true, 
            quantity: true,
            item: { select: { id: true, name: true, unit: true, packSize: true } }
          } 
        }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma[`${prefix}Payment`].findMany({
      where: { createdAt: { gte: minDate, lte: endOfDay } },
      select: { createdAt: true, amount: true, type: true, orderId: true }
    }),
    prisma[`${prefix}Expense`].findMany({
      where: { createdAt: { gte: minDate, lte: endOfDay } },
      select: { createdAt: true, amount: true, category: true, vehicleId: true }
    }),
    prisma[`${prefix}Purchase`].findMany({
      where: { purchaseDate: { gte: minDate, lte: endOfDay }, status: { not: 'CANCELLED' } },
      select: { purchaseDate: true, grandTotal: true }
    }),
    prisma[`${prefix}SpotSale`].findMany({
      where: { createdAt: { gte: minDate, lte: endOfDay } },
      select: {
        createdAt: true,
        amountPaid: true,
        paymentMethod: true,
        cashCollected: true,
        debtAmount: true,
        creditAmount: true,
        totalAmount: true,
        litresSold: true,
        totalLitres: true,
        items: {
          select: {
            itemId: true,
            saleType: true,
            quantity: true,
            unitPrice: true,
            item: { select: { id: true, name: true, packSize: true } }
          }
        }
      }
    }),
    prisma[`${prefix}VendorLedgerEntry`].groupBy({
      by: ['type'],
      _sum: { amount: true }
    }),
    prisma[`${prefix}Item`].findMany({
      where: { type: 'RAW_MATERIAL', archivedAt: null }
    }),
    prisma[`${prefix}Customer`].findMany({
      where: { cachedBottleBalance: { gt: 0 } },
      orderBy: { cachedBottleBalance: 'desc' },
      select: {
        id: true,
        name: true,
        phone: true,
        type: true,
        cachedBottleBalance: true,
        deposit: true,
        orders: {
          where: { deliveryStatus: 'DELIVERED' },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true }
        }
      }
    }),
    prisma[`${prefix}Customer`].aggregate({
      _sum: { currentBalance: true },
      where: { currentBalance: { gt: 0 }, archivedAt: null }
    }),
    prisma[`${prefix}VendorPayment`].findMany({
      where: { createdAt: { gte: minDate, lte: endOfDay } },
      select: { createdAt: true, amount: true, paymentMethod: true }
    }),
    prisma[`${prefix}PurchaseItem`].findMany({
      where: { purchase: { status: { not: 'CANCELLED' } } },
      select: { itemId: true, quantity: true, unitPrice: true, total: true }
    }),
    prisma[`${prefix}RecipeItem`].findMany({
      include: { rawMaterial: { select: { id: true, name: true, unit: true, isReturnable: true } } }
    }),
    prisma[`${prefix}Order`].count({
      where: { deliveryStatus: { in: ['PENDING', 'PARTIAL'] } }
    })
  ]);

  // Build weighted-average raw material unit cost & consumable FG recipe COGS (excluding returnable 19L bottles)
  const rmCostTotals = new Map();
  for (const pi of purchaseItems) {
    const q = parseFloat(pi.quantity || 0);
    const tot = parseFloat(pi.total || 0) || (q * parseFloat(pi.unitPrice || 0));
    if (q > 0 && tot >= 0) {
      const cur = rmCostTotals.get(pi.itemId) || { sumTotal: 0, sumQty: 0 };
      cur.sumTotal += tot;
      cur.sumQty += q;
      rmCostTotals.set(pi.itemId, cur);
    }
  }
  const rmUnitCostMap = new Map();
  for (const [rmId, { sumTotal, sumQty }] of rmCostTotals.entries()) {
    if (sumQty > 0) rmUnitCostMap.set(rmId, sumTotal / sumQty);
  }

  const fgConsumableUnitCogsMap = new Map();
  for (const r of recipeItems) {
    const rm = r.rawMaterial;
    if (!rm) continue;
    const rmNameLower = (rm.name || '').toLowerCase();
    const isReturnable19LBottle = Boolean(rm.isReturnable) || (rmNameLower.includes('19') && rmNameLower.includes('bottle'));
    if (isReturnable19LBottle) continue;

    const unitCost = rmUnitCostMap.get(r.rawMaterialId) || 0;
    const qtyPerUnit = parseFloat(r.quantityPerUnit || 0);
    if (unitCost > 0 && qtyPerUnit > 0) {
      fgConsumableUnitCogsMap.set(
        r.finishedGoodId,
        (fgConsumableUnitCogsMap.get(r.finishedGoodId) || 0) + (qtyPerUnit * unitCost)
      );
    }
  }

  const calciumItem = rawMaterials.find(m => (m.name || '').toLowerCase().includes('calcium'));
  const magnesiumItem = rawMaterials.find(m => (m.name || '').toLowerCase().includes('magnesium'));
  const sodiumItem = rawMaterials.find(m => (m.name || '').toLowerCase().includes('sodium'));
  const antiscalantItem = rawMaterials.find(m => (m.name || '').toLowerCase().includes('antiscalant'));
  const extraCapItem = rawMaterials.find(m => (m.name || '').toLowerCase().includes('cap'));

  const mineralCostPerTreatedLitre = (
    (2 * (calciumItem ? (rmUnitCostMap.get(calciumItem.id) || 0) : 0)) +
    (1 * (magnesiumItem ? (rmUnitCostMap.get(magnesiumItem.id) || 0) : 0)) +
    (0.5 * (sodiumItem ? (rmUnitCostMap.get(sodiumItem.id) || 0) : 0))
  ) / 15141;
  const extraCapUnitCost = extraCapItem ? (rmUnitCostMap.get(extraCapItem.id) || 0) : 0;

  const dayMap = Object.create(null);
  const monthMap = Object.create(null);

  const getBottleSize = (name = '') => {
    const n = name.toLowerCase();
    if (n.includes('19l') || n.includes('19 l')) return '19L';
    if (n.includes('1.5') || n.includes('1500')) return '1.5L';
    if (n.includes('0.5') || n.includes('500')) return '0.5L';
    return null;
  };

  const createMetricBucket = () => ({
    sales: 0,
    netSalesExGst: 0,
    orderRevenue: 0,
    spotRevenue: 0,
    estimatedCogs: 0,
    grossProfit: 0,
    grossMarginPct: 0,
    operatingProfit: 0,
    deliveredSales: 0,
    unprocessedSales: 0,
    unprocessedOrdersCount: 0,
    ordersCount: 0,
    deliveredOrdersCount: 0,
    pendingOrdersCount: 0,
    partialOrdersCount: 0,
    cash: 0,
    orderCash: 0,
    spotSalesCash: 0,
    cashByMethod: {
      CASH: 0,
      BANK_TRANSFER: 0,
      EASYPAISA: 0,
      JAZZCASH: 0,
      CHEQUE: 0
    },
    salesBySize: {
      '19L': 0,
      '1.5L': 0,
      '0.5L': 0
    },
    cashBySize: {
      '19L': 0,
      '1.5L': 0,
      '0.5L': 0
    },
    skuVolumes: {},
    expenses: 0,
    transportExpenses: 0,
    generalExpenses: 0,
    vendorPayments: 0,
    cashVendorPayments: 0,
    credit: 0,
    bottlesSold: 0,
    purchases: 0,
    purchasesCount: 0,
    netCash: 0,
    netCashFlow: 0,
    expectedDrawerCash: 0,
    waterLitres: 0,
    customWaterLitres: 0,
    refillWaterLitres: 0,
    bottledWaterLitres: 0,
    creditBilled: 0
  });

  const daily = createMetricBucket();
  const yesterday = createMetricBucket();
  const last3Days = createMetricBucket();
  const week = createMetricBucket();
  const monthly = createMetricBucket();
  const yearly = createMetricBucket();

  const getBucketsForDate = (d) => {
    const list = [];
    if (d >= startOfDay && d <= endOfDay) list.push(daily);
    if (d >= startOfYesterday && d <= endOfYesterday) list.push(yesterday);
    if (d >= startOfLast3Days && d <= endOfDay) list.push(last3Days);
    if (d >= startOfWeek && d <= endOfDay) list.push(week);
    if (d >= startOfMonth && d <= endOfDay) list.push(monthly);
    if (d >= startOfYear && d <= endOfDay) list.push(yearly);
    return list;
  };

  const getDKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const getMKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

  const ensureDay = (key) => (dayMap[key] ||= {
    sales: 0, netSalesExGst: 0, orderRevenue: 0, spotRevenue: 0,
    estimatedCogs: 0, grossProfit: 0, operatingProfit: 0,
    deliveredSales: 0, unprocessedSales: 0, unprocessedOrdersCount: 0,
    ordersCount: 0, deliveredOrdersCount: 0, pendingOrdersCount: 0, partialOrdersCount: 0,
    skuVolumes: {},
    orderCash: 0, spotSalesCash: 0, cashCollected: 0, physicalCashCollected: 0, creditBilled: 0,
    expenses: 0, vendorPayments: 0, cashVendorPayments: 0, purchases: 0, waterLitres: 0
  });
  const ensureMonth = (key) => (monthMap[key] ||= {
    sales: 0, netSalesExGst: 0, orderRevenue: 0, spotRevenue: 0,
    estimatedCogs: 0, grossProfit: 0, operatingProfit: 0,
    deliveredSales: 0, unprocessedSales: 0, unprocessedOrdersCount: 0,
    ordersCount: 0, deliveredOrdersCount: 0, pendingOrdersCount: 0, partialOrdersCount: 0,
    skuVolumes: {},
    orderCash: 0, spotSalesCash: 0, cash: 0, physicalCash: 0,
    expenses: 0, vendorPayments: 0, cashVendorPayments: 0, purchases: 0, waterLitres: 0
  });

  for (const o of orders) {
    const d = new Date(o.createdAt);
    const sub = (o.items || []).reduce((sum, item) => sum + (parseFloat(item.price || 0) * (item.quantity || 0)), 0);
    const total = o.withGst ? sub + Math.round(sub * 0.18) : sub;
    const isDelivered = o.deliveryStatus === 'DELIVERED';
    const isPending = o.deliveryStatus === 'PENDING';
    const isPartial = o.deliveryStatus === 'PARTIAL';
    const isUnprocessed = isPending || isPartial;

    let orderCogs = 0;
    for (const it of o.items || []) {
      const unitCogs = fgConsumableUnitCogsMap.get(it.itemId) || 0;
      orderCogs += unitCogs * Number(it.quantity || 0);
    }

    const day = ensureDay(getDKey(d));
    const month = ensureMonth(getMKey(d));
    day.sales += total;
    day.netSalesExGst += sub;
    day.orderRevenue += total;
    day.estimatedCogs += orderCogs;
    day.ordersCount += 1;
    if (isDelivered) day.deliveredOrdersCount += 1;
    if (isPending) day.pendingOrdersCount += 1;
    if (isPartial) day.partialOrdersCount += 1;

    month.sales += total;
    month.netSalesExGst += sub;
    month.orderRevenue += total;
    month.estimatedCogs += orderCogs;
    month.ordersCount += 1;
    if (isDelivered) month.deliveredOrdersCount += 1;
    if (isPending) month.pendingOrdersCount += 1;
    if (isPartial) month.partialOrdersCount += 1;

    for (const it of o.items || []) {
      const skuName = it.item?.name;
      const qty = Number(it.quantity || 0);
      if (skuName && qty > 0) {
        day.skuVolumes[skuName] = (day.skuVolumes[skuName] || 0) + qty;
        month.skuVolumes[skuName] = (month.skuVolumes[skuName] || 0) + qty;
      }
    }

    if (isDelivered) {
      day.deliveredSales += total;
      month.deliveredSales += total;
    }
    if (isUnprocessed) {
      day.unprocessedSales += total;
      day.unprocessedOrdersCount += 1;
      month.unprocessedSales += total;
      month.unprocessedOrdersCount += 1;
    }

    const activeBuckets = getBucketsForDate(d);
    for (const b of activeBuckets) {
      b.sales += total;
      b.netSalesExGst += sub;
      b.orderRevenue += total;
      b.estimatedCogs += orderCogs;
      b.bottlesSold += 1;
      b.ordersCount += 1;
      if (isDelivered) {
        b.deliveredSales += total;
        b.deliveredOrdersCount += 1;
      }
      if (isPending) b.pendingOrdersCount += 1;
      if (isPartial) b.partialOrdersCount += 1;
      if (isUnprocessed) {
        b.unprocessedSales += total;
        b.unprocessedOrdersCount += 1;
      }
      for (const it of o.items || []) {
        const skuName = it.item?.name;
        const qty = Number(it.quantity || 0);
        if (skuName && qty > 0) {
          b.skuVolumes[skuName] = (b.skuVolumes[skuName] || 0) + qty;
        }
        const sz = getBottleSize(skuName);
        if (sz && b.salesBySize) {
          const rev = parseFloat(it.price || 0) * qty;
          b.salesBySize[sz] = (b.salesBySize[sz] || 0) + rev;
        }
      }
    }
  }

  for (const p of payments) {
    if (p.type === 'SECURITY_DEPOSIT') continue;
    const d = new Date(p.createdAt);
    const amt = parseFloat(p.amount || 0);
    const method = (p.type || 'CASH').toUpperCase();
    const day = ensureDay(getDKey(d));
    const month = ensureMonth(getMKey(d));
    day.orderCash += amt;
    day.cashCollected += amt;
    if (method === 'CASH') day.physicalCashCollected += amt;
    month.orderCash += amt;
    month.cash += amt;
    if (method === 'CASH') month.physicalCash += amt;

    const activeBuckets = getBucketsForDate(d);
    for (const b of activeBuckets) {
      b.orderCash += amt;
      b.cash += amt;
      if (b.cashByMethod) {
        if (b.cashByMethod[method] !== undefined) {
          b.cashByMethod[method] += amt;
        } else {
          b.cashByMethod.CASH = (b.cashByMethod.CASH || 0) + amt;
        }
      }
    }
  }

  // Allocate order payments to cashBySize
  for (const o of orders) {
    const oPayments = payments.filter(p => p.orderId === o.id && p.type !== 'SECURITY_DEPOSIT');
    const oPaid = oPayments.reduce((s, p) => s + parseFloat(p.amount || 0), 0);
    if (oPaid > 0) {
      const d = new Date(o.createdAt);
      const activeBuckets = getBucketsForDate(d);
      const itemsWithSize = (o.items || []).map(it => {
        const sz = getBottleSize(it.item?.name);
        return { sz, rev: parseFloat(it.price || 0) * (it.quantity || 0) };
      }).filter(x => x.sz);

      const totalSizeRev = itemsWithSize.reduce((s, x) => s + x.rev, 0) || 1;
      itemsWithSize.forEach(({ sz, rev }) => {
        const allocatedCash = Math.round(oPaid * (rev / totalSizeRev));
        for (const b of activeBuckets) {
          if (b.cashBySize) {
            b.cashBySize[sz] = (b.cashBySize[sz] || 0) + allocatedCash;
          }
        }
      });
    }
  }

  for (const st of spotSales) {
    const d = new Date(st.createdAt);
    const cashAmt = parseFloat(st.amountPaid || st.cashCollected || 0);
    const creditAmt = parseFloat(st.creditAmount || st.debtAmount || 0);
    const saleAmt = parseFloat(st.totalAmount || (cashAmt + creditAmt) || 0);
    const method = (st.paymentMethod || 'CASH').toUpperCase();

    // Litres Sold counts ONLY CUSTOM_WATER (1L) and WATER_REFILL (19L display); Finished Goods = 0L
    let customLit = 0;
    let refillDisplayLit = 0;
    let spotCogs = 0;
    const spotSkuMap = {};

    for (const it of st.items || []) {
      const qty = parseFloat(it.quantity || 0);
      const sType = it.saleType || 'FINISHED_GOOD';
      if (sType === 'CUSTOM_WATER') {
        customLit += qty;
        spotCogs += qty * mineralCostPerTreatedLitre;
      } else if (sType === 'WATER_REFILL') {
        refillDisplayLit += qty * 19.0;
        // WATER_REFILL uses minerals only (24L treated water spec), NO 19L cap or 19L bottle cost
        spotCogs += qty * 24.0 * mineralCostPerTreatedLitre;
      } else if (sType === 'EXTRA_CAP') {
        spotCogs += qty * extraCapUnitCost;
      } else if (sType === 'EXTRA_CHARGE') {
        spotCogs += 0;
      } else if (sType === 'RAW_MATERIAL') {
        spotCogs += qty * (rmUnitCostMap.get(it.itemId) || 0);
      } else if (sType === 'BOTTLE' || (sType === 'UNIT' && Number(it.item?.packSize || 1) > 1)) {
        const pSize = Math.max(1, Number(it.item?.packSize || 1));
        const unitCogs = fgConsumableUnitCogsMap.get(it.itemId) || 0;
        spotCogs += qty * (unitCogs / pSize);
        if (it.item?.name && qty > 0) {
          spotSkuMap[it.item.name] = (spotSkuMap[it.item.name] || 0) + (qty / pSize);
        }
      } else {
        // PACK / UNIT / FINISHED_GOOD
        const unitCogs = fgConsumableUnitCogsMap.get(it.itemId) || 0;
        spotCogs += qty * unitCogs;
        if (it.item?.name && qty > 0) {
          spotSkuMap[it.item.name] = (spotSkuMap[it.item.name] || 0) + qty;
        }
      }
    }

    const totalLit = customLit + refillDisplayLit;

    const day = ensureDay(getDKey(d));
    const month = ensureMonth(getMKey(d));
    day.sales += saleAmt;
    day.netSalesExGst += saleAmt;
    day.spotRevenue += saleAmt;
    day.estimatedCogs += spotCogs;
    day.spotSalesCash += cashAmt;
    day.cashCollected += cashAmt;
    if (method === 'CASH') day.physicalCashCollected += cashAmt;
    day.creditBilled += creditAmt;
    day.waterLitres = (day.waterLitres || 0) + totalLit;

    month.sales += saleAmt;
    month.netSalesExGst += saleAmt;
    month.spotRevenue += saleAmt;
    month.estimatedCogs += spotCogs;
    month.spotSalesCash += cashAmt;
    month.cash += cashAmt;
    if (method === 'CASH') month.physicalCash += cashAmt;
    month.waterLitres = (month.waterLitres || 0) + totalLit;

    for (const [skuName, skuQty] of Object.entries(spotSkuMap)) {
      day.skuVolumes[skuName] = (day.skuVolumes[skuName] || 0) + skuQty;
      month.skuVolumes[skuName] = (month.skuVolumes[skuName] || 0) + skuQty;
    }

    const activeBuckets = getBucketsForDate(d);
    for (const b of activeBuckets) {
      b.sales += saleAmt;
      b.netSalesExGst += saleAmt;
      b.spotRevenue += saleAmt;
      b.estimatedCogs += spotCogs;
      b.spotSalesCash += cashAmt;
      b.cash += cashAmt;
      if (method === 'CASH' && b.cashByMethod) {
        b.cashByMethod.CASH += cashAmt;
      } else if (b.cashByMethod) {
        if (b.cashByMethod[method] !== undefined) {
          b.cashByMethod[method] += cashAmt;
        } else {
          b.cashByMethod.CASH = (b.cashByMethod.CASH || 0) + cashAmt;
        }
      }
      b.creditBilled += creditAmt;
      b.waterLitres += totalLit;
      b.customWaterLitres += customLit;
      b.refillWaterLitres += refillDisplayLit;

      for (const [skuName, skuQty] of Object.entries(spotSkuMap)) {
        b.skuVolumes[skuName] = (b.skuVolumes[skuName] || 0) + skuQty;
      }

      let matchedSize = null;
      for (const it of st.items || []) {
        const sz = getBottleSize(it.item?.name);
        if (sz) { matchedSize = sz; break; }
      }
      const targetSize = matchedSize || '19L';
      if (b.cashBySize) {
        b.cashBySize[targetSize] = (b.cashBySize[targetSize] || 0) + cashAmt;
      }
      if (b.salesBySize) {
        b.salesBySize[targetSize] = (b.salesBySize[targetSize] || 0) + saleAmt;
      }
    }
  }

  for (const e of expenses) {
    const d = new Date(e.createdAt);
    const amt = parseFloat(e.amount || 0);
    const catLower = (e.category || '').toLowerCase();
    const isTransport = Boolean(e.vehicleId) || ['fuel', 'maintenance', 'transport', 'vehicle', 'repairs'].some(k => catLower.includes(k));
    const day = ensureDay(getDKey(d));
    const month = ensureMonth(getMKey(d));
    day.expenses += amt;
    month.expenses += amt;

    const activeBuckets = getBucketsForDate(d);
    for (const b of activeBuckets) {
      b.expenses += amt;
      if (isTransport) b.transportExpenses += amt;
      else b.generalExpenses += amt;
    }
  }

  for (const pu of purchases) {
    const d = new Date(pu.purchaseDate);
    const total = parseFloat(pu.grandTotal || 0);
    const day = ensureDay(getDKey(d));
    const month = ensureMonth(getMKey(d));
    day.purchases += total;
    month.purchases += total;

    const activeBuckets = getBucketsForDate(d);
    for (const b of activeBuckets) {
      b.purchases += total;
      b.purchasesCount += 1;
    }
  }

  for (const vp of vendorPayments) {
    const d = new Date(vp.createdAt);
    const amt = parseFloat(vp.amount || 0);
    const isCashVp = (vp.paymentMethod || 'CASH').toUpperCase() === 'CASH';
    const day = ensureDay(getDKey(d));
    const month = ensureMonth(getMKey(d));
    day.vendorPayments = (day.vendorPayments || 0) + amt;
    if (isCashVp) day.cashVendorPayments = (day.cashVendorPayments || 0) + amt;
    month.vendorPayments = (month.vendorPayments || 0) + amt;
    if (isCashVp) month.cashVendorPayments = (month.cashVendorPayments || 0) + amt;

    const activeBuckets = getBucketsForDate(d);
    for (const b of activeBuckets) {
      b.vendorPayments = (b.vendorPayments || 0) + amt;
      if (isCashVp) b.cashVendorPayments = (b.cashVendorPayments || 0) + amt;
    }
  }

  const allBuckets = [daily, yesterday, last3Days, week, monthly, yearly];
  for (const b of allBuckets) {
    b.estimatedCogs = Math.round(b.estimatedCogs);
    b.netSalesExGst = Math.round(b.netSalesExGst);
    b.grossProfit = Math.round(b.netSalesExGst - b.estimatedCogs);
    b.grossMarginPct = b.netSalesExGst > 0 ? Number(((b.grossProfit / b.netSalesExGst) * 100).toFixed(1)) : 0;
    b.operatingProfit = Math.round(b.grossProfit - b.expenses);
    b.credit = Math.max(0, b.deliveredSales - (b.orderCash || 0)) + b.creditBilled;
    b.netCashFlow = Math.round(b.cash - (b.expenses + (b.vendorPayments || 0)));
    b.netCash = b.netCashFlow;
    b.expectedDrawerCash = Math.round(Math.max(0, (b.cashByMethod?.CASH || 0) - b.expenses - (b.cashVendorPayments || 0)));
  }

  const totalBottlesInCirculation = customersWithBottles.reduce((sum, c) => sum + (c.cachedBottleBalance || 0), 0);
  const bottleCustodyList = customersWithBottles.map(c => {
    const lastDelivery = c.orders?.[0]?.createdAt || null;
    const daysElapsed = lastDelivery 
      ? Math.floor((now.getTime() - new Date(lastDelivery).getTime()) / (1000 * 60 * 60 * 24))
      : null;
    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      customerType: c.type,
      cachedBottleBalance: c.cachedBottleBalance,
      depositAmount: parseFloat(c.deposit || 0),
      lastDeliveryDate: lastDelivery,
      daysElapsed
    };
  });

  const bottleCustody = prefix === 'wadaana' 
    ? { totalInCirculation: 0, customers: [] }
    : {
        totalInCirculation: totalBottlesInCirculation,
        customers: bottleCustodyList
      };

  const dailySalesHistory = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const dateKey = getDKey(d);
    const bucket = dayMap[dateKey] || {
      sales: 0, netSalesExGst: 0, orderRevenue: 0, spotRevenue: 0,
      estimatedCogs: 0, ordersCount: 0, deliveredOrdersCount: 0, pendingOrdersCount: 0, partialOrdersCount: 0,
      skuVolumes: {}, orderCash: 0, spotSalesCash: 0, cashCollected: 0, physicalCashCollected: 0,
      creditBilled: 0, expenses: 0, vendorPayments: 0, cashVendorPayments: 0, purchases: 0
    };
    const roundedCogs = Math.round(bucket.estimatedCogs || 0);
    const netExGst = Math.round(bucket.netSalesExGst || 0);
    const grossProfit = Math.round(netExGst - roundedCogs);
    const operatingProfit = Math.round(grossProfit - (bucket.expenses || 0));
    const netCashFlow = Math.round((bucket.cashCollected || 0) - ((bucket.expenses || 0) + (bucket.vendorPayments || 0)));
    dailySalesHistory.push({
      date: dateKey,
      day: d.toLocaleDateString('en-US', { weekday: 'short' }),
      ...bucket,
      estimatedCogs: roundedCogs,
      netSalesExGst: netExGst,
      grossProfit,
      operatingProfit,
      netCashFlow,
      netCash: netCashFlow,
      expectedDrawerCash: Math.round(Math.max(0, (bucket.physicalCashCollected || 0) - (bucket.expenses || 0) - (bucket.cashVendorPayments || 0)))
    });
  }

  const monthlyTrend = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1, 0, 0, 0);
    const mKey = getMKey(d);
    const bucket = monthMap[mKey] || {
      sales: 0, netSalesExGst: 0, orderRevenue: 0, spotRevenue: 0,
      estimatedCogs: 0, ordersCount: 0, deliveredOrdersCount: 0, pendingOrdersCount: 0, partialOrdersCount: 0,
      skuVolumes: {}, cash: 0, physicalCash: 0, expenses: 0, vendorPayments: 0, cashVendorPayments: 0,
      purchases: 0, spotSalesCash: 0, orderCash: 0
    };
    const roundedCogs = Math.round(bucket.estimatedCogs || 0);
    const netExGst = Math.round(bucket.netSalesExGst || 0);
    const grossProfit = Math.round(netExGst - roundedCogs);
    const operatingProfit = Math.round(grossProfit - (bucket.expenses || 0));
    const netCashFlow = Math.round((bucket.cash || 0) - ((bucket.expenses || 0) + (bucket.vendorPayments || 0)));
    monthlyTrend.push({
      month: d.toLocaleDateString('en-US', { month: 'short' }),
      ...bucket,
      estimatedCogs: roundedCogs,
      netSalesExGst: netExGst,
      grossProfit,
      operatingProfit,
      netCashFlow,
      netCash: netCashFlow,
      expectedDrawerCash: Math.round(Math.max(0, (bucket.physicalCash || 0) - (bucket.expenses || 0) - (bucket.cashVendorPayments || 0)))
    });
  }

  const purchaseTotal = pendingPayables.find(e => e.type === 'PURCHASE')?._sum?.amount || 0;
  const paymentTotal = pendingPayables.find(e => e.type === 'PAYMENT')?._sum?.amount || 0;
  const pendingVendorPayables = Math.max(0, Number(purchaseTotal) - Number(paymentTotal));
  const lowStockMaterials = rawMaterials.filter(item => parseFloat(item.cachedQty || 0) < parseFloat(item.reorderLevel || 0));

  const allUnprocessed = orders.filter(o => o.deliveryStatus === 'PENDING' || o.deliveryStatus === 'PARTIAL');
  const unprocessedOrders = allUnprocessed
    .slice(0, 20)
    .map(o => {
      const orderTotal = (o.items || []).reduce((sum, item) => sum + (parseFloat(item.price || 0) * (item.quantity || 0)), 0);
      const itemsSummary = (o.items || []).map(i => `${i.quantity}x ${i.item?.name || 'Item'}`).join(', ');
      return {
        id: o.id,
        shortId: `#${o.id.substring(0, 8).toUpperCase()}`,
        createdAt: o.createdAt,
        customerName: o.customer?.name || 'Walk-in Customer',
        customerPhone: o.customer?.phone || '—',
        deliveryStatus: o.deliveryStatus,
        paymentStatus: o.paymentStatus,
        totalAmount: orderTotal,
        itemsSummary: itemsSummary || '—'
      };
    });

  const totalOutstandingReceivables = Number(customerReceivablesAgg?._sum?.currentBalance || 0);

  const caQty = Number(calciumItem?.cachedQty || 0);
  const mgQty = Number(magnesiumItem?.cachedQty || 0);
  const naQty = Number(sodiumItem?.cachedQty || 0);
  const antiQty = Number(antiscalantItem?.cachedQty || 0);

  // 15,141L capacity per full mineral set: Ca: 2kg, Mg: 1kg, Na: 0.5kg
  const caBatches = caQty / 2;
  const mgBatches = mgQty / 1;
  const naBatches = naQty / 0.5;
  const batchesAvailable = Math.max(0, Math.min(caBatches, mgBatches, naBatches));
  const mineralCapacityLitres = Math.round(batchesAvailable * 15141);

  return {
    ...daily,
    daily,
    today: daily,
    yesterday,
    last3Days,
    last_3_days: last3Days,
    week,
    '1_week': week,
    monthly,
    '1_month': monthly,
    yearly,
    '1_year': yearly,
    totalReceivables: totalOutstandingReceivables,
    totalOutstandingReceivables,
    mineralMetrics: prefix === 'wadaana' ? null : {
      calciumStock: caQty,
      magnesiumStock: mgQty,
      sodiumStock: naQty,
      antiscalantStock: antiQty,
      batchesAvailable: Number(batchesAvailable.toFixed(2)),
      mineralCapacityLitres,
      isLow: batchesAvailable < 2
    },
    waterMetrics: prefix === 'wadaana' ? null : {
      dailyLitres: daily.waterLitres,
      dailyCustomLitres: daily.customWaterLitres,
      dailyRefillLitres: daily.refillWaterLitres,
      dailyBottledLitres: 0,
      monthlyLitres: monthly.waterLitres,
      monthlyCustomLitres: monthly.customWaterLitres,
      monthlyRefillLitres: monthly.refillWaterLitres,
      yearlyLitres: yearly.waterLitres
    },
    bottleCustody,
    unprocessedOrders,
    pendingDispatchCount,
    dailySalesHistory,
    monthlyTrend,
    pendingVendorPayables,
    lowStockMaterialsCount: lowStockMaterials.length,
    lowStockMaterialsList: lowStockMaterials.map(m => ({
      id: m.id,
      name: m.name,
      cachedQty: parseFloat(m.cachedQty || 0),
      reorderLevel: parseFloat(m.reorderLevel || 0),
      unit: m.unit
    }))
  };
};

const debounceTimers = { aquasphere: null, wadaana: null };

/** Redacts confidential COGS and profit metrics for MARKETING_MANAGER callers without mutating shared cache */
export const sanitizeMarketingDashboardData = (data) => {
  if (!data || typeof data !== 'object') return data;
  const clone = JSON.parse(JSON.stringify(data));
  const redactBucket = (b) => {
    if (b && typeof b === 'object') {
      delete b.estimatedCogs;
      delete b.grossProfit;
      delete b.grossMarginPct;
      delete b.operatingProfit;
    }
  };
  redactBucket(clone);
  ['daily', 'today', 'yesterday', 'last3Days', 'last_3_days', 'week', '1_week', 'monthly', '1_month', 'yearly', '1_year'].forEach(k => {
    redactBucket(clone[k]);
  });
  if (Array.isArray(clone.dailySalesHistory)) {
    clone.dailySalesHistory.forEach(redactBucket);
  }
  if (Array.isArray(clone.monthlyTrend)) {
    clone.monthlyTrend.forEach(redactBucket);
  }
  return clone;
};

/** Broadcasts SSE update with debouncing to prevent database pool exhaustion */
export const broadcastDashboardUpdate = (prefix = 'aquasphere') => {
  if (debounceTimers[prefix]) {
    clearTimeout(debounceTimers[prefix]);
  }
  debounceTimers[prefix] = setTimeout(async () => {
    debounceTimers[prefix] = null;
    try {
      cachedDashboardData[prefix] = await computeDashboardAnalytics(prefix);
      const rawData = cachedDashboardData[prefix];
      const rawPayload = `data: ${JSON.stringify({ success: true, data: rawData })}\n\n`;
      let marketingPayload = null;
      sseClients[prefix].forEach(client => {
        if (client.userRole === 'MARKETING_MANAGER') {
          if (!marketingPayload) {
            marketingPayload = `data: ${JSON.stringify({ success: true, data: sanitizeMarketingDashboardData(rawData) })}\n\n`;
          }
          client.write(marketingPayload);
        } else {
          client.write(rawPayload);
        }
      });
    } catch (error) {
      console.error(`Error broadcasting dashboard update for ${prefix}:`, error);
    }
  }, 2500);
};

/** High-level dashboard analytics */
export const getDashboardAnalytics = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  cachedDashboardData[prefix] = await computeDashboardAnalytics(prefix);
  const data = req.user?.role === 'MARKETING_MANAGER'
    ? sanitizeMarketingDashboardData(cachedDashboardData[prefix])
    : cachedDashboardData[prefix];
  return sendSuccess(res, data);
});

/** Monthly purchasing summary and vendor balances */
export const getPurchasingSummary = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const [recentPurchases, vendors, ledgerSums, topMaterials] = await Promise.all([
    prisma[`${prefix}Purchase`].findMany({
      take: 7,
      orderBy: { purchaseDate: 'desc' },
      include: {
        vendor: { select: { id: true, name: true } },
        items: { include: { item: { select: { name: true, unit: true } } } }
      }
    }),
    prisma[`${prefix}Vendor`].findMany({
      where: { archivedAt: null },
      select: { id: true, name: true, phone: true }
    }),
    prisma[`${prefix}VendorLedgerEntry`].groupBy({
      by: ['vendorId', 'type'],
      _sum: { amount: true }
    }),
    prisma[`${prefix}PurchaseItem`].groupBy({
      by: ['itemId'],
      _sum: { total: true, quantity: true },
      where: { purchase: { purchaseDate: { gte: startOfMonth, lte: endOfDay } } },
      orderBy: { _sum: { total: 'desc' } },
      take: 6
    })
  ]);

  const balanceMap = {};
  for (const entry of ledgerSums) {
    balanceMap[entry.vendorId] ||= { purchases: 0, payments: 0 };
    if (entry.type === 'PURCHASE') balanceMap[entry.vendorId].purchases = Number(entry._sum.amount);
    if (entry.type === 'PAYMENT') balanceMap[entry.vendorId].payments = Number(entry._sum.amount);
  }

  const topVendors = vendors
    .map(v => ({
      id: v.id,
      name: v.name,
      phone: v.phone,
      totalPurchases: balanceMap[v.id]?.purchases || 0,
      totalPayments: balanceMap[v.id]?.payments || 0,
      outstanding: (balanceMap[v.id]?.purchases || 0) - (balanceMap[v.id]?.payments || 0)
    }))
    .sort((a, b) => b.totalPurchases - a.totalPurchases)
    .slice(0, 5);

  const materialIds = topMaterials.map(m => m.itemId);
  const materialDetails = materialIds.length > 0
    ? await prisma[`${prefix}Item`].findMany({
        where: { id: { in: materialIds } },
        select: { id: true, name: true, unit: true }
      })
    : [];
  const matMap = Object.fromEntries(materialDetails.map(m => [m.id, m]));

  const formattedMaterials = topMaterials.map(m => ({
    itemId: m.itemId,
    name: matMap[m.itemId]?.name || 'Unknown',
    unit: matMap[m.itemId]?.unit || '',
    totalSpend: Number(m._sum.total),
    totalQty: Number(m._sum.quantity)
  }));

  return sendSuccess(res, {
    recentPurchases: recentPurchases.map(p => ({
      id: p.id,
      invoiceNo: p.invoiceNo,
      vendorName: p.vendor?.name || 'N/A',
      grandTotal: Number(p.grandTotal),
      purchaseDate: p.purchaseDate,
      itemCount: p.items.length,
      items: p.items.map(i => ({
        name: i.item?.name || 'N/A',
        qty: Number(i.quantity),
        unit: i.item?.unit || '',
        total: Number(i.total)
      }))
    })),
    topVendors,
    topMaterials: formattedMaterials
  });
});

/** Streams real-time dashboard analytics via SSE */
export const streamDashboardAnalytics = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  res.userRole = req.user?.role;

  cachedDashboardData[prefix] = await computeDashboardAnalytics(prefix);
  const initialData = req.user?.role === 'MARKETING_MANAGER'
    ? sanitizeMarketingDashboardData(cachedDashboardData[prefix])
    : cachedDashboardData[prefix];
  res.write(`data: ${JSON.stringify({ success: true, data: initialData })}\n\n`);

  sseClients[prefix].push(res);
  const heartbeat = setInterval(() => res.write(':heartbeat\n\n'), 30000);
  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients[prefix] = sseClients[prefix].filter(client => client !== res);
  });
});

/** Daily financial summary for a target date */
export const getDailySummary = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { date } = req.query;
  if (!date) throw new Error('Date is required');

  const targetDate = new Date(date);
  targetDate.setUTCHours(0, 0, 0, 0);
  const nextDate = new Date(targetDate);
  nextDate.setDate(nextDate.getDate() + 1);

  const [deliveryPayments, expensesAgg, creditSalesAgg, vendorCashPayments, spotSalesTotalAgg, paymentsByMethodList, todaysOrders, spotSalesList] = await Promise.all([
    prisma[`${prefix}Payment`].aggregate({
      _sum: { amount: true },
      where: { createdAt: { gte: targetDate, lt: nextDate } }
    }),
    prisma[`${prefix}Expense`].aggregate({
      _sum: { amount: true },
      where: { createdAt: { gte: targetDate, lt: nextDate } }
    }),
    prisma[`${prefix}SpotSale`].aggregate({
      _sum: { creditAmount: true },
      where: { createdAt: { gte: targetDate, lt: nextDate }, creditAmount: { gt: 0 } }
    }),
    prisma[`${prefix}VendorPayment`].aggregate({
      _sum: { amount: true },
      where: { createdAt: { gte: targetDate, lt: nextDate }, paymentMethod: { equals: 'CASH', mode: 'insensitive' } }
    }),
    prisma[`${prefix}SpotSale`].aggregate({
      _sum: { totalLitres: true, litresSold: true, totalBottles: true, totalCaps: true },
      where: { createdAt: { gte: targetDate, lt: nextDate } }
    }),
    prisma[`${prefix}Payment`].groupBy({
      by: ['type'],
      where: { createdAt: { gte: targetDate, lt: nextDate } },
      _sum: { amount: true }
    }),
    prisma[`${prefix}Order`].findMany({
      where: { createdAt: { gte: targetDate, lt: nextDate }, deliveryStatus: { not: 'CANCELLED' } },
      select: {
        payments: { select: { amount: true } },
        items: { select: { quantity: true, price: true, item: { select: { name: true } } } }
      }
    }),
    prisma[`${prefix}SpotSale`].findMany({
      where: { createdAt: { gte: targetDate, lt: nextDate } },
      select: { amountPaid: true, cashCollected: true, paymentMethod: true }
    })
  ]);

  const totalDeliveryAmount = parseFloat(deliveryPayments._sum.amount || 0);
  const totalSpotSales = spotSalesList.reduce((sum, s) => sum + parseFloat(s.amountPaid || s.cashCollected || 0), 0);
  const totalCreditSales = parseFloat(creditSalesAgg._sum.creditAmount || 0);
  const totalExpenses = parseFloat(expensesAgg._sum.amount || 0);
  const totalVendorCash = parseFloat(vendorCashPayments._sum.amount || 0);
  const totalLitres = parseFloat(spotSalesTotalAgg._sum.totalLitres || spotSalesTotalAgg._sum.litresSold || 0);
  const totalBottles = parseInt(spotSalesTotalAgg._sum.totalBottles || 0, 10);
  const totalCaps = parseInt(spotSalesTotalAgg._sum.totalCaps || 0, 10);
  const netCash = Math.max(0, totalDeliveryAmount + totalSpotSales - totalExpenses - totalVendorCash);

  // Physical CASH-only drawer calculations matching dailyClose.controller.js closeDay
  const ordersCashOnly = paymentsByMethodList
    .filter(p => (p.type || 'CASH').toUpperCase() === 'CASH')
    .reduce((sum, p) => sum + parseFloat(p._sum.amount || 0), 0);
  const spotSalesCashOnly = spotSalesList
    .filter(s => (s.paymentMethod || 'CASH').toUpperCase() === 'CASH')
    .reduce((sum, s) => sum + parseFloat(s.cashCollected !== undefined && s.cashCollected !== null ? s.cashCollected : (s.amountPaid || 0)), 0);
  const expectedDrawerCash = Math.max(0, ordersCashOnly + spotSalesCashOnly - totalExpenses - totalVendorCash);

  const cashByMethod = { CASH: 0, BANK_TRANSFER: 0, EASYPAISA: 0, JAZZCASH: 0, CHEQUE: 0 };
  paymentsByMethodList.forEach(p => {
    const m = (p.type || 'CASH').toUpperCase();
    if (cashByMethod[m] !== undefined) {
      cashByMethod[m] += parseFloat(p._sum.amount || 0);
    } else {
      cashByMethod.CASH += parseFloat(p._sum.amount || 0);
    }
  });

  spotSalesList.forEach(s => {
    const m = (s.paymentMethod || 'CASH').toUpperCase();
    const amt = parseFloat(s.amountPaid || s.cashCollected || 0);
    if (cashByMethod[m] !== undefined) {
      cashByMethod[m] += amt;
    } else {
      cashByMethod.CASH += amt;
    }
  });

  const salesBySize = { '19L': totalSpotSales, '1.5L': 0, '0.5L': 0 };
  const cashBySize = { '19L': totalSpotSales, '1.5L': 0, '0.5L': 0 };

  todaysOrders.forEach(o => {
    const orderPaid = o.payments?.reduce((s, p) => s + parseFloat(p.amount || 0), 0) || 0;
    const items = (o.items || []).map(it => {
      const n = (it.item?.name || '').toLowerCase();
      let sz = null;
      if (n.includes('19l') || n.includes('19 l')) sz = '19L';
      else if (n.includes('1.5') || n.includes('1500')) sz = '1.5L';
      else if (n.includes('0.5') || n.includes('500')) sz = '0.5L';
      return { sz, rev: parseFloat(it.price || 0) * (it.quantity || 0) };
    }).filter(x => x.sz);
    const totalOrderRev = items.reduce((s, x) => s + x.rev, 0) || 1;
    items.forEach(({ sz, rev }) => {
      salesBySize[sz] = (salesBySize[sz] || 0) + rev;
      cashBySize[sz] = (cashBySize[sz] || 0) + Math.round(orderPaid * (rev / totalOrderRev));
    });
  });

  return sendSuccess(res, {
    totalDeliveryAmount,
    totalSpotSales,
    totalCreditSales,
    totalExpenses,
    totalVendorCash,
    ordersCashOnly,
    spotSalesCashOnly,
    expectedDrawerCash,
    totalLitres,
    counterSales: {
      totalLitres,
      totalBottles,
      totalCaps
    },
    cashByMethod,
    salesBySize,
    cashBySize,
    netCash,
    date: targetDate.toISOString().split('T')[0]
  });
});

/** Production performance dashboard data */
export const getProductionDashboard = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const isWadaana = prefix === 'wadaana';
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const timeframe = String(req.query.timeframe || 'TODAY').toUpperCase();
  let kpiStart = new Date(startOfDay);
  let kpiEnd = new Date(endOfDay);
  if (timeframe === 'YESTERDAY') {
    kpiStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
    kpiEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
  } else if (timeframe === 'LAST_3_DAYS') {
    kpiStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2, 0, 0, 0);
  } else if (timeframe === '1_WEEK' || timeframe === 'WEEKLY') {
    kpiStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0);
  } else if (timeframe === '1_MONTH' || timeframe === 'MONTHLY') {
    kpiStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  } else if (timeframe === '1_YEAR' || timeframe === 'YEARLY') {
    kpiStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
  }

  const daysNum = Math.min(Math.max(parseInt(req.query.days || '7', 10), 1), 365);
  const isYesterday = timeframe === 'YESTERDAY';
  const historyEnd = isYesterday
    ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999)
    : new Date(endOfDay);
  const startDate = new Date(historyEnd);
  if (daysNum > 60) {
    startDate.setFullYear(historyEnd.getFullYear(), historyEnd.getMonth() - 11, 1);
  } else {
    startDate.setDate(historyEnd.getDate() - (daysNum - 1));
  }
  startDate.setHours(0, 0, 0, 0);

  const prodBatchModel = prisma[`${prefix}ProductionBatch`];
  const itemModel = prisma[`${prefix}Item`];
  const dailyCloseModel = prisma[`${prefix}DailyClose`];

  const [
    kpiBatches,
    recentBatches,
    finishedGoods,
    rawMaterials,
    dailyCloseStatus,
    pendingBatchesCount,
    pastWeekBatches
  ] = await Promise.all([
    prodBatchModel.findMany({
      where: { batchDate: { gte: kpiStart, lte: kpiEnd } }
    }),
    prodBatchModel.findMany({ take: 6, orderBy: { createdAt: 'desc' } }),
    itemModel.findMany({ where: { type: 'FINISHED_GOOD', archivedAt: null }, orderBy: { name: 'asc' } }),
    itemModel.findMany({ where: { type: 'RAW_MATERIAL', archivedAt: null }, orderBy: { name: 'asc' } }),
    dailyCloseModel.findFirst({ where: { date: startOfDay } }),
    prodBatchModel.count({ where: { batchDate: { gte: kpiStart, lte: kpiEnd }, status: 'PENDING' } }),
    prodBatchModel.findMany({ where: { batchDate: { gte: startDate, lte: historyEnd } }, orderBy: { batchDate: 'asc' } })
  ]);

  const toLocalDKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const toLocalMKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

  const parseBatchOutput = (b) => {
    let producedItems = null;
    if (b.remarks && typeof b.remarks === 'string') {
      try {
        const parsed = JSON.parse(b.remarks);
        if (Array.isArray(parsed?.producedItems)) producedItems = parsed.producedItems;
      } catch {
        // non-JSON remarks
      }
    }

    if (isWadaana) {
      let pure05 = Number(b.qtyPure05L || 0);
      let pure15 = Number(b.qtyPure15L || 0);
      let mix05 = Number(b.qtyMix05L || 0);
      let mix15 = Number(b.qtyMix15L || 0);
      let custom = 0;

      if (producedItems && producedItems.length > 0 && pure05 === 0 && pure15 === 0 && mix05 === 0 && mix15 === 0) {
        for (const it of producedItems) {
          const n = (it.name || '').toLowerCase();
          const q = Number(it.quantity || 0);
          if ((n.includes('pure') || n.includes('aquasphere')) && (n.includes('0.5') || n.includes('500'))) pure05 += q;
          else if ((n.includes('pure') || n.includes('aquasphere')) && (n.includes('1.5') || n.includes('1500'))) pure15 += q;
          else if ((n.includes('mix') || n.includes('dasani')) && (n.includes('0.5') || n.includes('500'))) mix05 += q;
          else if ((n.includes('mix') || n.includes('dasani')) && (n.includes('1.5') || n.includes('1500'))) mix15 += q;
          else custom += q;
        }
      } else if (producedItems && producedItems.length > 0) {
        for (const it of producedItems) {
          const n = (it.name || '').toLowerCase();
          if (!n.includes('pure') && !n.includes('aquasphere') && !n.includes('mix') && !n.includes('dasani')) {
            custom += Number(it.quantity || 0);
          }
        }
      } else if (b.quantity && pure05 === 0 && pure15 === 0 && mix05 === 0 && mix15 === 0) {
        custom += Number(b.quantity || 0);
      }

      const waste = Number(b.wasteQuantity || 0) || (Number(b.brokenPure05L || 0) + Number(b.brokenPure15L || 0) + Number(b.brokenMix05L || 0) + Number(b.brokenMix15L || 0));
      return { pure05, pure15, mix05, mix15, custom, total: pure05 + pure15 + mix05 + mix15 + custom, waste };
    }

    // AquaSphere
    let qty19L = 0;
    const p15 = Number(b.packs15L || 0);
    const p05 = Number(b.packs05L || 0);
    let custom = 0;

    if (producedItems && producedItems.length > 0) {
      for (const it of producedItems) {
        const n = (it.name || '').toLowerCase();
        const q = Number(it.quantity || 0);
        if (n.includes('19l') || n.includes('19 l')) qty19L += q;
        else if (!(n.includes('1.5') || n.includes('1500') || n.includes('0.5') || n.includes('500'))) {
          custom += q;
        }
      }
    } else if (p15 === 0 && p05 === 0) {
      qty19L = Number(b.quantity || 0);
    }

    const waste = Number(b.wasteQuantity || 0) || (Number(b.brokenBottles15L || 0) + Number(b.brokenBottles05L || 0));
    return { qty19L, p15, p05, custom, total: qty19L + p15 + p05 + custom, waste };
  };

  const dailyHistory = [];
  if (daysNum > 60) {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(historyEnd.getFullYear(), historyEnd.getMonth() - i, 1, 0, 0, 0);
      const mKey = toLocalMKey(d);
      const monthBatches = pastWeekBatches.filter(b => b.batchDate && toLocalMKey(new Date(b.batchDate)) === mKey);
      const parsedList = monthBatches.map(parseBatchOutput);
      if (isWadaana) {
        dailyHistory.push({
          day: d.toLocaleDateString('en-US', { month: 'short' }),
          date: mKey,
          qtyPure05L: parsedList.reduce((s, p) => s + p.pure05, 0),
          qtyPure15L: parsedList.reduce((s, p) => s + p.pure15, 0),
          qtyMix05L: parsedList.reduce((s, p) => s + p.mix05, 0),
          qtyMix15L: parsedList.reduce((s, p) => s + p.mix15, 0),
          customUnits: parsedList.reduce((s, p) => s + p.custom, 0),
          totalWaste: parsedList.reduce((s, p) => s + p.waste, 0)
        });
      } else {
        dailyHistory.push({
          day: d.toLocaleDateString('en-US', { month: 'short' }),
          date: mKey,
          total19L: parsedList.reduce((s, p) => s + p.qty19L, 0),
          packs15L: parsedList.reduce((s, p) => s + p.p15, 0),
          packs05L: parsedList.reduce((s, p) => s + p.p05, 0),
          customUnits: parsedList.reduce((s, p) => s + p.custom, 0),
          totalWaste: parsedList.reduce((s, p) => s + p.waste, 0)
        });
      }
    }
  } else {
    for (let i = daysNum - 1; i >= 0; i--) {
      const d = new Date(historyEnd);
      d.setDate(historyEnd.getDate() - i);
      const dayStr = daysNum > 14 ? `${d.getMonth() + 1}/${d.getDate()}` : d.toLocaleDateString('en-US', { weekday: 'short' });
      const dateKey = toLocalDKey(d);
      const dayBatches = pastWeekBatches.filter(b => b.batchDate && toLocalDKey(new Date(b.batchDate)) === dateKey);
      const parsedList = dayBatches.map(parseBatchOutput);

      if (isWadaana) {
        dailyHistory.push({
          day: dayStr,
          date: dateKey,
          qtyPure05L: parsedList.reduce((s, p) => s + p.pure05, 0),
          qtyPure15L: parsedList.reduce((s, p) => s + p.pure15, 0),
          qtyMix05L: parsedList.reduce((s, p) => s + p.mix05, 0),
          qtyMix15L: parsedList.reduce((s, p) => s + p.mix15, 0),
          customUnits: parsedList.reduce((s, p) => s + p.custom, 0),
          totalWaste: parsedList.reduce((s, p) => s + p.waste, 0)
        });
      } else {
        dailyHistory.push({
          day: dayStr,
          date: dateKey,
          total19L: parsedList.reduce((s, p) => s + p.qty19L, 0),
          packs15L: parsedList.reduce((s, p) => s + p.p15, 0),
          packs05L: parsedList.reduce((s, p) => s + p.p05, 0),
          customUnits: parsedList.reduce((s, p) => s + p.custom, 0),
          totalWaste: parsedList.reduce((s, p) => s + p.waste, 0)
        });
      }
    }
  }

  const rawMaterialHealth = rawMaterials.map(mat => {
    const qty = Number(mat.cachedQty || 0);
    const reorder = Number(mat.reorderLevel || 0);
    const isCritical = qty <= 0;
    const isLow = reorder > 0 && qty <= reorder;

    return {
      id: mat.id,
      name: mat.name,
      unit: mat.unit,
      cachedQty: qty,
      factoryQty: Number(mat.factoryQty || 0),
      warehouseQty: Number(mat.warehouseQty || 0),
      reorderLevel: reorder,
      status: isCritical ? 'OUT_OF_STOCK' : isLow ? 'LOW_STOCK' : 'IN_STOCK'
    };
  });

  const kpiParsed = kpiBatches.map(parseBatchOutput);
  const todaysProduction = isWadaana ? {
    batchesCount: kpiBatches.length,
    qtyPure05L: kpiParsed.reduce((s, p) => s + p.pure05, 0),
    qtyPure15L: kpiParsed.reduce((s, p) => s + p.pure15, 0),
    qtyMix05L: kpiParsed.reduce((s, p) => s + p.mix05, 0),
    qtyMix15L: kpiParsed.reduce((s, p) => s + p.mix15, 0),
    customUnits: kpiParsed.reduce((s, p) => s + p.custom, 0),
    totalProduced: kpiParsed.reduce((s, p) => s + p.total, 0),
    totalWaste: kpiParsed.reduce((s, p) => s + p.waste, 0)
  } : {
    batchesCount: kpiBatches.length,
    total19L: kpiParsed.reduce((s, p) => s + p.qty19L, 0),
    packs15L: kpiParsed.reduce((s, p) => s + p.p15, 0),
    packs05L: kpiParsed.reduce((s, p) => s + p.p05, 0),
    customUnits: kpiParsed.reduce((s, p) => s + p.custom, 0),
    totalProduced: kpiParsed.reduce((s, p) => s + p.total, 0),
    totalWaste: kpiParsed.reduce((s, p) => s + p.waste, 0)
  };

  const userIds = [...new Set(recentBatches.map(b => b.producedBy).filter(Boolean))];
  const userRecords = userIds.length > 0 ? await prisma[`${prefix}User`].findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, role: true }
  }) : [];
  const userMap = Object.fromEntries(userRecords.map(u => [u.id, u]));

  const formatLoggedBy = (producedBy) => {
    if (!producedBy) return 'Production Manager';
    const u = userMap[producedBy];
    if (u?.name) return u.name;
    if (u?.role) return u.role.replace(/_/g, ' ');
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(producedBy) ? 'Production Manager' : producedBy;
  };

  const calcium = rawMaterials.find(m => (m.name || '').toLowerCase().includes('calcium'));
  const magnesium = rawMaterials.find(m => (m.name || '').toLowerCase().includes('magnesium'));
  const sodium = rawMaterials.find(m => (m.name || '').toLowerCase().includes('sodium'));
  const caQty = Number(calcium?.cachedQty || 0);
  const mgQty = Number(magnesium?.cachedQty || 0);
  const naQty = Number(sodium?.cachedQty || 0);
  const batchesAvailable = Math.max(0, Math.min(caQty / 2, mgQty / 1, naQty / 0.5));
  const mineralCapacityLitres = Math.round(batchesAvailable * 15141);

  return sendSuccess(res, {
    todaysProduction,
    dailyProductionHistory: dailyHistory,
    mineralMetrics: {
      batchesAvailable: Number(batchesAvailable.toFixed(1)),
      mineralCapacityLitres,
      calciumStock: caQty,
      magnesiumStock: mgQty,
      sodiumStock: naQty
    },
    finishedGoods: finishedGoods.map(fg => ({
      id: fg.id,
      name: fg.name,
      unit: fg.unit,
      packSize: Number(fg.packSize || 1),
      factoryQty: Number(fg.factoryQty || 0),
      warehouseQty: Number(fg.warehouseQty || 0),
      cachedQty: Number(fg.cachedQty || 0)
    })),
    rawMaterialHealth,
    lowStockCount: rawMaterialHealth.filter(m => m.status !== 'IN_STOCK').length,
    pendingBatchesCount,
    recentBatches: recentBatches.map(b => ({
      id: b.id,
      shortId: `#${b.id.substring(0, 8).toUpperCase()}`,
      batchDate: b.batchDate,
      status: b.status,
      createdBy: formatLoggedBy(b.producedBy),
      ...(isWadaana ? {
        qtyPure05L: b.qtyPure05L || 0,
        qtyPure15L: b.qtyPure15L || 0,
        qtyMix05L: b.qtyMix05L || 0,
        qtyMix15L: b.qtyMix15L || 0,
        wasteQuantity: Number(b.wasteQuantity || 0) || ((b.brokenPure05L || 0) + (b.brokenPure15L || 0) + (b.brokenMix05L || 0) + (b.brokenMix15L || 0))
      } : {
        quantity: b.quantity || 0,
        packs15L: b.packs15L || 0,
        packs05L: b.packs05L || 0,
        wasteQuantity: Number(b.wasteQuantity || 0) || (Number(b.brokenBottles15L || 0) + Number(b.brokenBottles05L || 0))
      })
    })),
    recentPurchases: [],
    dailyClose: {
      isClosed: dailyCloseStatus?.adminConfirmed || false,
      pmConfirmed: dailyCloseStatus?.pmConfirmed || false,
      pmConfirmedAt: dailyCloseStatus?.pmConfirmedAt || null
    }
  });
});

/** Dedicated endpoint for 19L Bottle Custody & Recovery feed */
export const getBottleCustody = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const now = new Date();
  const customersWithBottles = await prisma[`${prefix}Customer`].findMany({
    where: { cachedBottleBalance: { gt: 0 } },
    orderBy: { cachedBottleBalance: 'desc' },
    select: {
      id: true,
      name: true,
      phone: true,
      type: true,
      cachedBottleBalance: true,
      deposit: true,
      orders: {
        where: { deliveryStatus: 'DELIVERED' },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { createdAt: true }
      }
    }
  });

  const totalBottlesInCirculation = customersWithBottles.reduce((sum, c) => sum + (c.cachedBottleBalance || 0), 0);
  const bottleCustodyList = customersWithBottles.map(c => {
    const lastDelivery = c.orders?.[0]?.createdAt || null;
    const daysElapsed = lastDelivery 
      ? Math.floor((now.getTime() - new Date(lastDelivery).getTime()) / (1000 * 60 * 60 * 24))
      : null;
    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      customerType: c.type,
      cachedBottleBalance: c.cachedBottleBalance,
      depositAmount: parseFloat(c.deposit || 0),
      lastDeliveryDate: lastDelivery,
      daysElapsed
    };
  });

  return sendSuccess(res, {
    totalInCirculation: totalBottlesInCirculation,
    customers: bottleCustodyList
  });
});

/** Production loss and scrap analytics adhering to timeframe */
export const getProductionLoss = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const isWadaana = prefix === 'wadaana';
  const { timeframe = '1_MONTH' } = req.query;

  const now = new Date();
  let startDate = new Date();
  let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  switch (timeframe.toUpperCase()) {
    case 'TODAY':
    case 'DAILY':
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'YESTERDAY':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
      break;
    case 'LAST_3_DAYS':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2, 0, 0, 0);
      break;
    case '1_WEEK':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0);
      break;
    case '1_YEAR':
    case 'YEARLY':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    case '1_MONTH':
    case 'MONTHLY':
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
  }

  const batches = await prisma[`${prefix}ProductionBatch`].findMany({
    where: {
      status: 'COMPLETED',
      OR: [
        { createdAt: { gte: startDate, lte: endDate } },
        { batchDate: { gte: startDate, lte: endDate } }
      ]
    },
    select: isWadaana ? {
      id: true,
      wasteQuantity: true,
      remarks: true,
      qtyPure05L: true,
      qtyPure15L: true,
      qtyMix05L: true,
      qtyMix15L: true,
      brokenPure05L: true,
      brokenPure15L: true,
      brokenMix05L: true,
      brokenMix15L: true
    } : {
      id: true,
      wasteQuantity: true,
      remarks: true,
      packs05L: true,
      packs15L: true,
      quantity: true,
      brokenBottles05L: true,
      brokenBottles15L: true
    }
  });

  let totalWasteBottles = 0;
  const materialsMap = new Map();

  for (const b of batches) {
    let parsedLoss = null;
    let batchWaste = 0;

    if (b.remarks) {
      try {
        const obj = JSON.parse(b.remarks);
        if (obj?.lossDetails?.wasteItems) {
          parsedLoss = obj.lossDetails.wasteItems;
        }
        if (obj?.lossDetails?.totalWaste !== undefined) {
          batchWaste = Number(obj.lossDetails.totalWaste);
        }
      } catch (_e) { /* ignore */ }
    }

    if (!batchWaste) {
      if (isWadaana) {
        batchWaste = Number(b.wasteQuantity || 0) || (Number(b.brokenPure05L || 0) + Number(b.brokenPure15L || 0) + Number(b.brokenMix05L || 0) + Number(b.brokenMix15L || 0));
      } else {
        batchWaste = Number(b.wasteQuantity || 0) || (Number(b.brokenBottles05L || 0) + Number(b.brokenBottles15L || 0));
      }
    }
    totalWasteBottles += batchWaste;

    if (Array.isArray(parsedLoss) && parsedLoss.length > 0) {
      for (const item of parsedLoss) {
        const key = item.name;
        const current = materialsMap.get(key) || { name: item.name, quantity: 0, unit: item.unit };
        current.quantity = Number((current.quantity + Number(item.quantityLost || 0)).toFixed(4));
        materialsMap.set(key, current);
      }
    } else {
      if (prefix === 'aquasphere') {
        const b05 = Number(b.brokenBottles05L || 0);
        const b15 = Number(b.brokenBottles15L || 0);
        if (b05 > 0) {
          const cur = materialsMap.get('0.5L Empty Bottles') || { name: '0.5L Empty Bottles', quantity: 0, unit: 'bottle' };
          cur.quantity += b05;
          materialsMap.set('0.5L Empty Bottles', cur);

          const curCap = materialsMap.get('Small Caps') || { name: 'Small Caps', quantity: 0, unit: 'cap' };
          curCap.quantity += b05;
          materialsMap.set('Small Caps', curCap);
        }
        if (b15 > 0) {
          const cur = materialsMap.get('1.5L Empty Bottles') || { name: '1.5L Empty Bottles', quantity: 0, unit: 'bottle' };
          cur.quantity += b15;
          materialsMap.set('1.5L Empty Bottles', cur);

          const curCap = materialsMap.get('Small Caps') || { name: 'Small Caps', quantity: 0, unit: 'cap' };
          curCap.quantity += b15;
          materialsMap.set('Small Caps', curCap);
        }
      } else {
        const p05 = Number(b.brokenPure05L || 0);
        const p15 = Number(b.brokenPure15L || 0);
        const m05 = Number(b.brokenMix05L || 0);
        const m15 = Number(b.brokenMix15L || 0);
        if (p05 > 0) {
          const cur = materialsMap.get('Pure Preform 0.5L (Blue)') || { name: 'Pure Preform 0.5L (Blue)', quantity: 0, unit: 'kg' };
          cur.quantity = Number((cur.quantity + p05 * 0.015).toFixed(3));
          materialsMap.set('Pure Preform 0.5L (Blue)', cur);
        }
        if (p15 > 0) {
          const cur = materialsMap.get('Pure Preform 1.5L (Blue)') || { name: 'Pure Preform 1.5L (Blue)', quantity: 0, unit: 'kg' };
          cur.quantity = Number((cur.quantity + p15 * 0.030).toFixed(3));
          materialsMap.set('Pure Preform 1.5L (Blue)', cur);
        }
        if (m05 > 0) {
          const cur = materialsMap.get('Mix Preform 0.5L (Blue)') || { name: 'Mix Preform 0.5L (Blue)', quantity: 0, unit: 'kg' };
          cur.quantity = Number((cur.quantity + m05 * 0.013).toFixed(3));
          materialsMap.set('Mix Preform 0.5L (Blue)', cur);
        }
        if (m15 > 0) {
          const cur = materialsMap.get('Mix Preform 1.5L (Blue)') || { name: 'Mix Preform 1.5L (Blue)', quantity: 0, unit: 'kg' };
          cur.quantity = Number((cur.quantity + m15 * 0.027).toFixed(3));
          materialsMap.set('Mix Preform 1.5L (Blue)', cur);
        }
      }
    }
  }

  return sendSuccess(res, {
    timeframe,
    totalWasteBottles,
    batchCount: batches.length,
    materials: Array.from(materialsMap.values()).filter(m => m.quantity > 0)
  });
});


