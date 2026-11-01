import { prisma } from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getTenantPrefix } from '../utils/tenant.js';
import { getMarketersRegistry, formatCustomerMarketer } from './customer.controller.js';

const getPrefix = getTenantPrefix;

/**
 * Generates structured KPI summaries, chart datasets, secondary visual breakdowns,
 * and tabular datasets for business reports (sales, marketers, profitability, expenses,
 * inventory, production, credit, vendor, fleet).
 *
 * @param {import('express').Request} req - Express request object with reportType and parameters.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
export const getReportData = asyncHandler(async (req, res) => {
  const { reportType } = req.params;
  const { startDate, endDate, period, month } = req.query;

  const prefix = getPrefix(req);
  const now = new Date();

  let start = startDate ? new Date(startDate) : null;
  let end = endDate ? new Date(endDate) : new Date();

  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split('-').map(Number);
    start = new Date(y, m - 1, 1, 0, 0, 0, 0);
    end = new Date(y, m, 0, 23, 59, 59, 999);
  } else if (!start) {
    if (period === 'daily') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    } else if (period === 'weekly') {
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      start.setHours(0, 0, 0, 0);
    } else if (period === 'yearly') {
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    } else if (period === 'all') {
      start = new Date(0);
    } else {
      // Default to monthly (start of current month)
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    }
  }

  if (startDate) start.setUTCHours(0, 0, 0, 0);
  if (endDate && !month) end.setUTCHours(23, 59, 59, 999);

  let kpis = [];
  let chartData = [];
  let secondaryBreakdown = {};
  let summaryRow = null;
  let table = [];

  switch (reportType) {
    case 'sales': {
      const [orders, spotSales, finishedGoods, registry] = await Promise.all([
        prisma[`${prefix}Order`].findMany({
          where: {
            createdAt: { gte: start, lte: end },
            deliveryStatus: { not: 'CANCELLED' }
          },
          include: {
            customer: { select: { id: true, name: true, customerCode: true, marketerRef: true } },
            items: { include: { item: { select: { id: true, name: true, packSize: true, unit: true } } } },
            deliveries: { select: { id: true, qtyDelivered: true, cashReceived: true, paymentMethod: true, deliveredAt: true } },
            payments: { select: { id: true, amount: true, type: true, createdAt: true } }
          },
          orderBy: { createdAt: 'desc' }
        }),
        prisma[`${prefix}SpotSale`].findMany({
          where: { createdAt: { gte: start, lte: end } },
          include: {
            customer: { select: { id: true, name: true, customerCode: true, marketerRef: true } },
            items: { include: { item: { select: { id: true, name: true, packSize: true, unit: true } } } }
          },
          orderBy: { createdAt: 'desc' }
        }),
        prisma[`${prefix}Item`].findMany({
          where: { type: 'FINISHED_GOOD', archivedAt: null },
          select: { id: true, name: true, packSize: true, unit: true }
        }),
        getMarketersRegistry(prefix)
      ]);

      // Dynamic Product Breakdown Map
      const productMap = new Map();
      finishedGoods.forEach(fg => {
        productMap.set(fg.id, {
          itemId: fg.id,
          name: fg.name,
          packSize: Number(fg.packSize || 1),
          unit: fg.unit || 'pack',
          qtySold: 0,
          billedRevenue: 0,
          cashCollected: 0
        });
      });

      // Payment Method Breakdown
      const byPaymentMethod = {
        CASH: 0,
        BANK_TRANSFER: 0,
        EASYPAISA: 0,
        JAZZCASH: 0,
        CHEQUE: 0
      };

      // Daily Time-series for Recharts
      const timeSeriesMap = new Map();
      const getOrInitDay = (d) => {
        const key = d.toISOString().slice(5, 10); // MM-DD
        if (!timeSeriesMap.has(key)) {
          timeSeriesMap.set(key, { label: key, Billed: 0, Collected: 0, Credit: 0 });
        }
        return timeSeriesMap.get(key);
      };

      let totalBilled = 0;
      let totalCollected = 0;
      let totalBalanceDue = 0;

      // 1. Process Orders
      const orderTableRows = orders.map(o => {
        const mkt = formatCustomerMarketer(o.customer || {}, registry.marketers);
        const orderBilled = o.items.reduce((s, it) => s + (Number(it.quantity || 0) * Number(it.price || 0)), 0);

        const deliveryCash = o.deliveries.reduce((s, d) => s + Number(d.cashReceived || 0), 0);
        const paymentCash = o.payments.reduce((s, p) => s + Number(p.amount || 0), 0);
        const orderCash = deliveryCash + paymentCash;
        const balance = Math.max(0, orderBilled - orderCash);

        totalBilled += orderBilled;
        totalCollected += orderCash;
        totalBalanceDue += balance;

        // Attribute cash to payment methods
        o.deliveries.forEach(d => {
          const method = (d.paymentMethod || 'CASH').toUpperCase();
          byPaymentMethod[method] = (byPaymentMethod[method] || 0) + Number(d.cashReceived || 0);
        });
        o.payments.forEach(p => {
          const method = (p.type || 'CASH').toUpperCase();
          byPaymentMethod[method] = (byPaymentMethod[method] || 0) + Number(p.amount || 0);
        });

        // Dynamic Product Breakdown (iterates over ALL items)
        o.items.forEach(it => {
          const itemId = it.itemId || it.item?.id;
          if (itemId) {
            if (!productMap.has(itemId)) {
              productMap.set(itemId, {
                itemId,
                name: it.item?.name || 'Finished Good',
                packSize: Number(it.item?.packSize || 1),
                unit: it.item?.unit || 'pack',
                qtySold: 0,
                billedRevenue: 0,
                cashCollected: 0
              });
            }
            const p = productMap.get(itemId);
            const lineBilled = Number(it.quantity || 0) * Number(it.price || 0);
            p.qtySold += Number(it.quantity || 0);
            p.billedRevenue += lineBilled;
            // Pro-rate cash collected
            if (orderBilled > 0) {
              p.cashCollected += Math.round((lineBilled / orderBilled) * orderCash);
            }
          }
        });

        // Time series chart point
        const pt = getOrInitDay(new Date(o.createdAt));
        pt.Billed += orderBilled;
        pt.Collected += orderCash;
        pt.Credit += balance;

        const itemsSummary = o.items.map(i => `${i.quantity}x ${i.item?.name || 'Item'}`).join(', ');

        return {
          'Record ID': `#ORD-${o.id.slice(0, 6).toUpperCase()}`,
          'Type': 'Delivery Order',
          'Customer Code': o.customer?.customerCode || '—',
          'Customer': o.customer?.name || 'Walk-in',
          'Marketer': mkt.marketerDisplay,
          'Items': itemsSummary || 'No items',
          'Billed Total (Rs)': orderBilled,
          'Cash Collected (Rs)': orderCash,
          'Balance Due (Rs)': balance,
          'Payment Status': o.paymentStatus || 'UNPAID',
          'Delivery Status': o.deliveryStatus || 'PENDING',
          'Date': new Date(o.createdAt).toLocaleDateString()
        };
      });

      // 2. Process Spot Sales (Counter Sales)
      const spotTableRows = spotSales.map(s => {
        const mkt = formatCustomerMarketer(s.customer || {}, registry.marketers);
        const billed = Number(s.totalAmount || 0);
        const collected = Number(s.paidAmount || s.cashReceived || 0);
        const balance = Math.max(0, billed - collected);

        totalBilled += billed;
        totalCollected += collected;
        totalBalanceDue += balance;

        const method = (s.paymentMethod || 'CASH').toUpperCase();
        byPaymentMethod[method] = (byPaymentMethod[method] || 0) + collected;

        s.items.forEach(it => {
          const itemId = it.itemId || it.item?.id;
          if (itemId) {
            if (!productMap.has(itemId)) {
              productMap.set(itemId, {
                itemId,
                name: it.item?.name || 'Counter Item',
                packSize: Number(it.item?.packSize || 1),
                unit: it.item?.unit || 'bottle',
                qtySold: 0,
                billedRevenue: 0,
                cashCollected: 0
              });
            }
            const p = productMap.get(itemId);
            const lineBilled = Number(it.quantity || 0) * Number(it.unitPrice || 0);
            p.qtySold += Number(it.quantity || 0);
            p.billedRevenue += lineBilled;
            if (billed > 0) {
              p.cashCollected += Math.round((lineBilled / billed) * collected);
            }
          }
        });

        const pt = getOrInitDay(new Date(s.createdAt));
        pt.Billed += billed;
        pt.Collected += collected;
        pt.Credit += balance;

        const itemsSummary = s.items.map(i => `${i.quantity}x ${i.item?.name || 'Item'}`).join(', ');

        return {
          'Record ID': `#SPOT-${s.id.slice(0, 6).toUpperCase()}`,
          'Type': 'Counter Sale',
          'Customer Code': s.customer?.customerCode || 'COUNTER',
          'Customer': s.customer?.name || 'Walk-in Customer',
          'Marketer': mkt.marketerDisplay,
          'Items': itemsSummary || 'Spot Sale',
          'Billed Total (Rs)': billed,
          'Cash Collected (Rs)': collected,
          'Balance Due (Rs)': balance,
          'Payment Status': balance === 0 ? 'PAID' : 'PARTIAL',
          'Delivery Status': 'DELIVERED',
          'Date': new Date(s.createdAt).toLocaleDateString()
        };
      });

      table = [...orderTableRows, ...spotTableRows];

      // Recharts chartData sorted chronologically
      chartData = Array.from(timeSeriesMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, v]) => v);

      // Dynamic Product List for Secondary Breakdown
      const byProduct = Array.from(productMap.values()).filter(p => p.qtySold > 0 || finishedGoods.some(fg => fg.id === p.itemId));

      secondaryBreakdown = {
        byPaymentMethod,
        byProduct
      };

      summaryRow = {
        'Record ID': 'TOTALS',
        'Type': `${table.length} Transactions`,
        'Customer Code': '—',
        'Customer': '—',
        'Marketer': '—',
        'Items': '—',
        'Billed Total (Rs)': totalBilled,
        'Cash Collected (Rs)': totalCollected,
        'Balance Due (Rs)': totalBalanceDue,
        'Payment Status': '—',
        'Delivery Status': '—',
        'Date': '—'
      };

      kpis = [
        { label: 'Total Sales & Counters', value: table.length.toString() },
        { label: 'Total Billed Sales', value: `Rs. ${Math.round(totalBilled).toLocaleString()}` },
        { label: 'Total Cash Collected', value: `Rs. ${Math.round(totalCollected).toLocaleString()}` },
        { label: 'Unpaid Credit Billed', value: `Rs. ${Math.round(totalBalanceDue).toLocaleString()}` }
      ];
      break;
    }

    case 'marketers': {
      const [customers, orders, registry] = await Promise.all([
        prisma[`${prefix}Customer`].findMany({
          where: { archivedAt: null },
          select: { id: true, customerCode: true, name: true, marketerRef: true, currentBalance: true }
        }),
        prisma[`${prefix}Order`].findMany({
          where: {
            createdAt: { gte: start, lte: end },
            deliveryStatus: { not: 'CANCELLED' }
          },
          include: {
            customer: { select: { id: true, customerCode: true, name: true, marketerRef: true } },
            items: { include: { item: { select: { id: true, name: true } } } },
            deliveries: { select: { cashReceived: true } },
            payments: { select: { amount: true } }
          }
        }),
        getMarketersRegistry(prefix)
      ]);

      // Group customers by marketerId
      const marketerMap = new Map();

      // Seed registered marketers
      registry.marketers.forEach(m => {
        marketerMap.set(m.id, {
          id: m.id,
          name: m.name,
          phone: m.phone || '—',
          segment: m.segment || 'Standard',
          customerCodes: [],
          customersCount: 0,
          productUnits: {},
          billedSales: 0,
          cashCollected: 0,
          outstandingDebt: 0
        });
      });

      // Also seed DIRECT / Company
      marketerMap.set('DIRECT', {
        id: 'DIRECT',
        name: 'Direct / Company',
        phone: '—',
        segment: 'Direct Sales',
        customerCodes: [],
        customersCount: 0,
        productUnits: {},
        billedSales: 0,
        cashCollected: 0,
        outstandingDebt: 0
      });

      // Populate customer distribution
      const customerToMarketerMap = new Map();
      customers.forEach(c => {
        const meta = formatCustomerMarketer(c, registry.marketers);
        const targetId = meta.marketerId || 'DIRECT';
        if (!marketerMap.has(targetId)) {
          marketerMap.set(targetId, {
            id: targetId,
            name: meta.marketerName || targetId,
            phone: '—',
            segment: 'Other',
            customerCodes: [],
            customersCount: 0,
            productUnits: {},
            billedSales: 0,
            cashCollected: 0,
            outstandingDebt: 0
          });
        }
        const m = marketerMap.get(targetId);
        m.customersCount++;
        m.outstandingDebt += Number(c.currentBalance || 0);
        if (c.customerCode) m.customerCodes.push(c.customerCode);
        customerToMarketerMap.set(c.id, targetId);
      });

      // Aggregate Order Sales per Marketer
      orders.forEach(o => {
        const targetId = customerToMarketerMap.get(o.customerId) || 'DIRECT';
        const m = marketerMap.get(targetId);
        if (m) {
          const billed = o.items.reduce((s, it) => s + (Number(it.quantity || 0) * Number(it.price || 0)), 0);
          const delivCash = o.deliveries.reduce((s, d) => s + Number(d.cashReceived || 0), 0);
          const payCash = o.payments.reduce((s, p) => s + Number(p.amount || 0), 0);
          m.billedSales += billed;
          m.cashCollected += (delivCash + payCash);

          o.items.forEach(it => {
            const pName = it.item?.name || 'Item';
            m.productUnits[pName] = (m.productUnits[pName] || 0) + Number(it.quantity || 0);
          });
        }
      });

      const marketerList = Array.from(marketerMap.values());
      const activeMarketersCount = marketerList.filter(m => m.id !== 'DIRECT' && (m.customersCount > 0 || m.billedSales > 0)).length;
      const totalReferredCustomers = marketerList.filter(m => m.id !== 'DIRECT').reduce((s, m) => s + m.customersCount, 0);
      const totalReferredBilled = marketerList.filter(m => m.id !== 'DIRECT').reduce((s, m) => s + m.billedSales, 0);
      const totalReferredCash = marketerList.filter(m => m.id !== 'DIRECT').reduce((s, m) => s + m.cashCollected, 0);

      kpis = [
        { label: 'Active Marketers', value: activeMarketersCount.toString() },
        { label: 'Referred Customers', value: totalReferredCustomers.toString() },
        { label: 'Referred Sales (Billed)', value: `Rs. ${Math.round(totalReferredBilled).toLocaleString()}` },
        { label: 'Referred Cash Collected', value: `Rs. ${Math.round(totalReferredCash).toLocaleString()}` }
      ];

      chartData = marketerList.map(m => ({
        name: m.id === 'DIRECT' ? 'Direct' : `${m.id} ${m.name.slice(0, 10)}`,
        BilledSales: Math.round(m.billedSales),
        CashCollected: Math.round(m.cashCollected),
        UnpaidDebt: Math.round(m.outstandingDebt)
      }));

      table = marketerList.map(m => {
        const unitsFormatted = Object.entries(m.productUnits)
          .map(([k, v]) => `${v}x ${k}`)
          .join(', ') || '0 units';

        return {
          'Marketer ID': m.id,
          'Marketer Name': m.name,
          'Segment': m.segment,
          'Customers Count': m.customersCount,
          'Customer IDs': m.customerCodes.slice(0, 6).join(', ') + (m.customerCodes.length > 6 ? ` (+${m.customerCodes.length - 6} more)` : '') || 'None',
          'Units Sold': unitsFormatted,
          'Billed Sales (Rs)': Math.round(m.billedSales),
          'Cash Collected (Rs)': Math.round(m.cashCollected),
          'Outstanding Debt (Rs)': Math.round(m.outstandingDebt)
        };
      });

      const sumBilled = marketerList.reduce((s, m) => s + m.billedSales, 0);
      const sumCash = marketerList.reduce((s, m) => s + m.cashCollected, 0);
      const sumDebt = marketerList.reduce((s, m) => s + m.outstandingDebt, 0);

      summaryRow = {
        'Marketer ID': 'TOTALS',
        'Marketer Name': `${marketerList.length} Accounts`,
        'Segment': '—',
        'Customers Count': customers.length,
        'Customer IDs': '—',
        'Units Sold': '—',
        'Billed Sales (Rs)': Math.round(sumBilled),
        'Cash Collected (Rs)': Math.round(sumCash),
        'Outstanding Debt (Rs)': Math.round(sumDebt)
      };
      break;
    }

    case 'credit':
    case 'customer-credits': {
      const [debtorCustomers, registry] = await Promise.all([
        prisma[`${prefix}Customer`].findMany({
          where: {
            archivedAt: null,
            OR: [
              { currentBalance: { gt: 0 } },
              { orders: { some: { paymentStatus: { in: ['UNPAID', 'PARTIAL'] } } } },
              { spotSales: { some: { debtAmount: { gt: 0 } } } }
            ]
          },
          include: {
            orders: {
              where: {
                paymentStatus: { in: ['UNPAID', 'PARTIAL'] },
                deliveryStatus: { not: 'CANCELLED' }
              },
              select: { id: true, items: true, deliveries: true, payments: true }
            },
            spotSales: {
              where: { debtAmount: { gt: 0 } },
              select: { id: true, debtAmount: true }
            }
          },
          orderBy: { currentBalance: 'desc' }
        }),
        getMarketersRegistry(prefix)
      ]);

      let totalOrderDebt = 0;
      let totalCounterDebt = 0;
      let totalExposure = 0;
      let breaches = 0;

      table = debtorCustomers.map(c => {
        const mkt = formatCustomerMarketer(c, registry.marketers);
        const orderDebt = c.orders.reduce((sum, ord) => {
          const ordBilled = ord.items.reduce((s, it) => s + (Number(it.quantity || 0) * Number(it.price || 0)), 0);
          const delivCash = ord.deliveries.reduce((s, d) => s + Number(d.cashReceived || 0), 0);
          const payCash = ord.payments.reduce((s, p) => s + Number(p.amount || 0), 0);
          return sum + Math.max(0, ordBilled - (delivCash + payCash));
        }, 0);

        const counterDebt = c.spotSales.reduce((sum, s) => sum + Number(s.debtAmount || 0), 0);
        const balance = Number(c.currentBalance || 0);

        totalOrderDebt += orderDebt;
        totalCounterDebt += counterDebt;
        totalExposure += balance;

        const creditLimit = Number(c.creditLimit || 0);
        const isBreached = creditLimit > 0 && balance > creditLimit;
        if (isBreached) breaches++;

        return {
          'Customer Code': c.customerCode || `#${c.id.substring(0, 6).toUpperCase()}`,
          'Customer Name': c.name,
          'Marketer': mkt.marketerDisplay,
          'Phone': c.phone || '—',
          'Customer Type': c.type || 'Standard',
          'Order Debt (Rs)': Math.round(orderDebt),
          'Counter Debt (Rs)': Math.round(counterDebt),
          'Total Balance Due (Rs)': Math.round(balance),
          'Credit Limit (Rs)': creditLimit,
          'Status': isBreached ? 'LIMIT BREACHED' : 'OVERDUE'
        };
      });

      kpis = [
        { label: 'Customers With Debt', value: debtorCustomers.length.toString() },
        { label: 'Unpaid Orders Debt', value: `Rs. ${Math.round(totalOrderDebt).toLocaleString()}` },
        { label: 'Counter Credit Debt', value: `Rs. ${Math.round(totalCounterDebt).toLocaleString()}` },
        { label: 'Total Market Exposure', value: `Rs. ${Math.round(totalExposure).toLocaleString()}` }
      ];

      chartData = debtorCustomers.slice(0, 10).map(c => ({
        name: c.name.length > 12 ? c.name.slice(0, 12) + '...' : c.name,
        Debt: Math.round(Number(c.currentBalance || 0)),
        Limit: Math.round(Number(c.creditLimit || 0))
      }));

      summaryRow = {
        'Customer Code': 'TOTALS',
        'Customer Name': `${debtorCustomers.length} Debtors`,
        'Marketer': '—',
        'Phone': '—',
        'Customer Type': '—',
        'Order Debt (Rs)': Math.round(totalOrderDebt),
        'Counter Debt (Rs)': Math.round(totalCounterDebt),
        'Total Balance Due (Rs)': Math.round(totalExposure),
        'Credit Limit (Rs)': '—',
        'Status': `${breaches} Breaches`
      };
      break;
    }

    case 'profitability':
    case 'profit': {
      const [deliveriesSum, spotSalesSum, expensesSum, transportSum] = await Promise.all([
        prisma[`${prefix}Delivery`].aggregate({
          _sum: { cashReceived: true },
          where: { deliveredAt: { gte: start, lte: end } }
        }),
        prisma[`${prefix}SpotSale`].aggregate({
          _sum: { paidAmount: true },
          where: { createdAt: { gte: start, lte: end } }
        }),
        prisma[`${prefix}Expense`].aggregate({
          _sum: { amount: true },
          where: { createdAt: { gte: start, lte: end } }
        }),
        prisma[`${prefix}TransportExpense`].aggregate({
          _sum: { amount: true },
          where: { expenseDate: { gte: start, lte: end } }
        })
      ]);

      const deliveryRevenue = Number(deliveriesSum._sum.cashReceived || 0);
      const spotRevenue = Number(spotSalesSum._sum.paidAmount || 0);
      const revenue = deliveryRevenue + spotRevenue;

      const operatingExpenses = Number(expensesSum._sum.amount || 0);
      const transportExpenses = Number(transportSum._sum.amount || 0);
      const totalExpenses = operatingExpenses + transportExpenses;

      // Weighted Average COGS dynamically from PurchaseItem records
      const purchaseItems = await prisma[`${prefix}PurchaseItem`].findMany({
        where: { purchase: { purchaseDate: { lte: end } } },
        select: { itemId: true, quantity: true, unitPrice: true, total: true }
      });

      const itemTotalCost = {};
      const itemTotalQty = {};
      purchaseItems.forEach(pi => {
        const qty = Number(pi.quantity) || 0;
        const total = Number(pi.total) || (qty * (Number(pi.unitPrice) || 0));
        if (!itemTotalCost[pi.itemId]) {
          itemTotalCost[pi.itemId] = 0;
          itemTotalQty[pi.itemId] = 0;
        }
        itemTotalCost[pi.itemId] += total;
        itemTotalQty[pi.itemId] += qty;
      });

      const itemCostMap = {};
      Object.keys(itemTotalCost).forEach(itemId => {
        itemCostMap[itemId] = itemTotalQty[itemId] > 0 ? (itemTotalCost[itemId] / itemTotalQty[itemId]) : 0;
      });

      const consumptions = await prisma[`${prefix}ProductionBatchConsumption`].findMany({
        where: { createdAt: { gte: start, lte: end } },
        select: { itemId: true, quantityUsed: true }
      });

      const cogs = consumptions.reduce((sum, c) => {
        const unitCost = itemCostMap[c.itemId] || 0;
        return sum + (Number(c.quantityUsed) * unitCost);
      }, 0);

      const estimatedProfit = revenue - cogs - totalExpenses;
      const marginPercent = revenue > 0 ? ((estimatedProfit / revenue) * 100).toFixed(2) : 0;

      kpis = [
        { label: 'Total Cash Revenue', value: `Rs. ${Math.round(revenue).toLocaleString()}` },
        { label: 'Raw Material COGS', value: `Rs. ${Math.round(cogs).toLocaleString()}` },
        { label: 'Total Operating & Fuel', value: `Rs. ${Math.round(totalExpenses).toLocaleString()}` },
        { label: 'Estimated Net Operating Profit', value: `Rs. ${Math.round(estimatedProfit).toLocaleString()}` }
      ];

      chartData = [
        { name: 'Revenue', value: Math.round(revenue) },
        { name: 'COGS', value: Math.round(cogs) },
        { name: 'Expenses', value: Math.round(totalExpenses) },
        { name: 'Net Profit', value: Math.round(estimatedProfit) }
      ];

      table = [
        { 'Financial Metric': 'Delivery Orders Cash Received', 'Amount (Rs)': deliveryRevenue },
        { 'Financial Metric': 'Counter Sales Cash Received', 'Amount (Rs)': spotRevenue },
        { 'Financial Metric': 'Total Operating Cash Inflow', 'Amount (Rs)': revenue },
        { 'Financial Metric': 'Cost of Goods Sold (Raw Materials Used)', 'Amount (Rs)': Math.round(cogs) },
        { 'Financial Metric': 'General & Operating Expenses', 'Amount (Rs)': operatingExpenses },
        { 'Financial Metric': 'Fleet Transport & Fuel Expenses', 'Amount (Rs)': transportExpenses },
        { 'Financial Metric': 'Net Operating Profit', 'Amount (Rs)': Math.round(estimatedProfit) },
        { 'Financial Metric': 'Net Profit Margin %', 'Amount (Rs)': `${marginPercent}%` }
      ];
      break;
    }

    case 'production': {
      const batches = await prisma[`${prefix}ProductionBatch`].findMany({
        where: { batchDate: { gte: start, lte: end } },
        include: {
          outputItem: { select: { id: true, name: true, unit: true } },
          consumptions: { include: { item: { select: { id: true, name: true, unit: true } } } }
        },
        orderBy: { batchDate: 'desc' }
      });

      const prodItemMap = new Map();
      let totalGoodYield = 0;
      let totalWaste = 0;

      table = batches.map(b => {
        let producedItems = [];
        if (b.remarks) {
          try {
            const parsed = JSON.parse(b.remarks);
            if (Array.isArray(parsed.producedItems)) producedItems = parsed.producedItems;
            else if (Array.isArray(parsed)) producedItems = parsed;
          } catch {}
        }

        // Aggregate yield dynamically
        let batchYield = Number(b.quantity || 0);
        if (producedItems.length > 0) {
          batchYield = producedItems.reduce((s, it) => s + Number(it.quantity || 0), 0);
          producedItems.forEach(it => {
            const key = it.itemId || it.name;
            if (!prodItemMap.has(key)) {
              prodItemMap.set(key, { name: it.name, quantity: 0, unit: it.unit || 'pack' });
            }
            prodItemMap.get(key).quantity += Number(it.quantity || 0);
          });
        } else {
          // Fallback to legacy columns
          const legacyQty = Number(b.packs05L || 0) + Number(b.packs15L || 0);
          if (legacyQty > 0) batchYield = legacyQty;
          const key = b.outputItem?.id || 'FINISHED_GOOD';
          if (!prodItemMap.has(key)) {
            prodItemMap.set(key, { name: b.outputItem?.name || 'Finished Goods', quantity: 0, unit: 'pack' });
          }
          prodItemMap.get(key).quantity += batchYield;
        }

        const waste = Number(b.wasteQuantity || 0);
        totalGoodYield += batchYield;
        totalWaste += waste;

        const outputDesc = producedItems.length > 0
          ? producedItems.map(p => `${p.quantity}x ${p.name}`).join(', ')
          : (b.outputItem?.name || 'Finished Goods');

        return {
          'Batch ID': `#${b.id.substring(0, 6).toUpperCase()}`,
          'Batch Date': new Date(b.batchDate || b.createdAt).toLocaleDateString(),
          'Output Items': outputDesc,
          'Good Yield (Packs)': batchYield,
          'Breakage / Waste': waste,
          'Consumptions': b.consumptions.map(c => `${c.quantityUsed} ${c.item?.unit || ''} ${c.item?.name}`).join(', ') || 'None'
        };
      });

      kpis = [
        { label: 'Total Production Batches', value: batches.length.toString() },
        { label: 'Total Good Yield (Packs)', value: totalGoodYield.toLocaleString() },
        { label: 'Total Waste / Breakage', value: totalWaste.toLocaleString() }
      ];

      chartData = batches.slice(0, 10).map(b => ({
        name: `#${b.id.slice(0, 5).toUpperCase()}`,
        Yield: Number(b.quantity || 0) || (Number(b.packs05L || 0) + Number(b.packs15L || 0)),
        Waste: Number(b.wasteQuantity || 0)
      }));

      secondaryBreakdown = {
        byFinishedGood: Array.from(prodItemMap.values())
      };

      summaryRow = {
        'Batch ID': 'TOTALS',
        'Batch Date': `${batches.length} Batches`,
        'Output Items': '—',
        'Good Yield (Packs)': totalGoodYield,
        'Breakage / Waste': totalWaste,
        'Consumptions': '—'
      };
      break;
    }

    case 'expenses': {
      const expenses = await prisma[`${prefix}Expense`].findMany({
        where: { createdAt: { gte: start, lte: end } },
        select: { id: true, category: true, amount: true, createdAt: true, receiptUrl: true, remarks: true },
        orderBy: { createdAt: 'desc' }
      });

      const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
      const totalReceipts = expenses.filter(e => !!e.receiptUrl).length;

      const catMap = {};
      expenses.forEach(e => {
        catMap[e.category] = (catMap[e.category] || 0) + Number(e.amount || 0);
      });

      kpis = [
        { label: 'Total Expenses', value: `Rs. ${totalAmount.toLocaleString()}` },
        { label: 'Total Logs', value: expenses.length.toString() },
        { label: 'Receipts Attached', value: totalReceipts.toString() }
      ];

      chartData = Object.entries(catMap).map(([name, value]) => ({ name, value }));

      table = expenses.map(e => ({
        'Expense ID': `#${e.id.substring(0, 6).toUpperCase()}`,
        'Category': e.category,
        'Remarks': e.remarks || '—',
        'Amount (Rs)': Number(e.amount),
        'Date Logged': new Date(e.createdAt).toLocaleDateString(),
        'Receipt Attached': e.receiptUrl ? 'Yes' : 'No'
      }));

      summaryRow = {
        'Expense ID': 'TOTALS',
        'Category': `${Object.keys(catMap).length} Categories`,
        'Remarks': '—',
        'Amount (Rs)': totalAmount,
        'Date Logged': '—',
        'Receipt Attached': `${totalReceipts} Attached`
      };
      break;
    }

    case 'inventory': {
      const items = await prisma[`${prefix}Item`].findMany({
        where: { archivedAt: null },
        select: { id: true, name: true, type: true, unit: true, cachedQty: true, reorderLevel: true, factoryQty: true, warehouseQty: true },
        orderBy: { name: 'asc' }
      });

      const lowStockItems = items.filter(i => Number(i.cachedQty) <= Number(i.reorderLevel));
      const rawMaterials = items.filter(i => i.type === 'RAW_MATERIAL');
      const finishedGoods = items.filter(i => i.type === 'FINISHED_GOOD');

      kpis = [
        { label: 'Total Managed Items', value: items.length.toString() },
        { label: 'Low Stock Alerts', value: lowStockItems.length.toString() },
        { label: 'Raw Materials Count', value: rawMaterials.length.toString() },
        { label: 'Finished Goods Count', value: finishedGoods.length.toString() }
      ];

      chartData = items.slice(0, 10).map(i => ({
        name: i.name.length > 12 ? i.name.slice(0, 12) + '...' : i.name,
        Stock: Number(i.cachedQty),
        Reorder: Number(i.reorderLevel)
      }));

      table = items.map(i => ({
        'Item Name': i.name,
        'Category Type': i.type === 'RAW_MATERIAL' ? 'Raw Material' : 'Finished Good',
        'Unit': i.unit,
        'Factory Stock': Number(i.factoryQty || i.cachedQty || 0),
        'Warehouse Stock': Number(i.warehouseQty || 0),
        'Total Current Stock': Number(i.cachedQty),
        'Reorder Level': Number(i.reorderLevel),
        'Status': Number(i.cachedQty) <= Number(i.reorderLevel) ? 'LOW STOCK WARNING' : 'NORMAL'
      }));
      break;
    }

    case 'vendor':
    case 'vendor-balances': {
      const [vendors, ledgerSums] = await Promise.all([
        prisma[`${prefix}Vendor`].findMany({
          where: { archivedAt: null },
          select: { id: true, name: true, phone: true }
        }),
        prisma[`${prefix}VendorLedgerEntry`].groupBy({
          by: ['vendorId', 'type'],
          _sum: { amount: true }
        })
      ]);

      const balanceMap = {};
      for (const entry of ledgerSums) {
        if (!balanceMap[entry.vendorId]) balanceMap[entry.vendorId] = { purchases: 0, payments: 0 };
        if (entry.type === 'PURCHASE') balanceMap[entry.vendorId].purchases = Number(entry._sum.amount || 0);
        if (entry.type === 'PAYMENT') balanceMap[entry.vendorId].payments = Number(entry._sum.amount || 0);
      }

      const vendorSummaries = vendors.map(v => {
        const purchases = balanceMap[v.id]?.purchases || 0;
        const payments = balanceMap[v.id]?.payments || 0;
        return {
          name: v.name,
          phone: v.phone || '-',
          purchases,
          payments,
          payable: purchases - payments
        };
      }).filter(v => v.payable > 0);

      const totalPayable = vendorSummaries.reduce((sum, v) => sum + v.payable, 0);

      kpis = [
        { label: 'Vendors With Payable', value: vendorSummaries.length.toString() },
        { label: 'Total Vendor Payables', value: `Rs. ${totalPayable.toLocaleString()}` }
      ];

      chartData = vendorSummaries.slice(0, 10).map(v => ({
        name: v.name.length > 12 ? v.name.slice(0, 12) + '...' : v.name,
        Payable: v.payable
      }));

      table = vendorSummaries.map(v => ({
        'Vendor Name': v.name,
        'Phone': v.phone,
        'Total Purchases (Rs)': v.purchases,
        'Total Payments (Rs)': v.payments,
        'Net Payable Balance (Rs)': v.payable
      }));

      summaryRow = {
        'Vendor Name': 'TOTALS',
        'Phone': `${vendorSummaries.length} Vendors`,
        'Total Purchases (Rs)': vendorSummaries.reduce((s, v) => s + v.purchases, 0),
        'Total Payments (Rs)': vendorSummaries.reduce((s, v) => s + v.payments, 0),
        'Net Payable Balance (Rs)': totalPayable
      };
      break;
    }

    case 'fleet':
    case 'bottle-summary': {
      const [transactions, customerBottleSum] = await Promise.all([
        prisma[`${prefix}BottleTransaction`].groupBy({
          by: ['type'],
          _sum: { quantity: true }
        }),
        prisma[`${prefix}Customer`].aggregate({
          _sum: { cachedBottleBalance: true },
          where: { archivedAt: null }
        })
      ]);

      const map = {};
      transactions.forEach(t => {
        map[t.type] = t._sum.quantity || 0;
      });

      const totalOwned = map.NEW_PURCHASE || 0;
      const broken = map.RETURNED_BROKEN || 0;
      const lost = map.MARKED_LOST || 0;

      const withCustomers = Math.max(0, Number(customerBottleSum._sum.cachedBottleBalance || 0));
      const atFactory = Math.max(0, totalOwned - withCustomers - broken - lost);

      kpis = [
        { label: 'Total Fleet Owned', value: totalOwned.toString() },
        { label: 'At Factory', value: atFactory.toString() },
        { label: 'With Customers', value: withCustomers.toString() },
        { label: 'Damaged / Lost', value: (broken + lost).toString() }
      ];

      chartData = [
        { name: 'At Factory', value: atFactory },
        { name: 'With Customers', value: withCustomers },
        { name: 'Damaged / Broken', value: broken },
        { name: 'Lost', value: lost }
      ];

      table = [
        { '19L Asset Location / State': 'Bottles at Factory', 'Quantity': atFactory },
        { '19L Asset Location / State': 'Bottles with Customers', 'Quantity': withCustomers },
        { '19L Asset Location / State': 'Bottles Broken (Scrapped)', 'Quantity': broken },
        { '19L Asset Location / State': 'Bottles Lost (Unrecoverable)', 'Quantity': lost },
        { '19L Asset Location / State': 'Total Fleet Size', 'Quantity': totalOwned }
      ];
      break;
    }

    default:
      throw new ApiError(400, 'Invalid report type');
  }

  res.status(200).json(new ApiResponse(200, {
    kpis,
    chartData,
    secondaryBreakdown,
    summaryRow,
    table
  }, `${reportType} report fetched successfully`));
});
