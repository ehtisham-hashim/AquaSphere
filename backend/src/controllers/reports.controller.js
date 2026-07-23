import { prisma } from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const getPrefix = (req) => (req.headers['x-tenant'] || 'aquasphere').toLowerCase() === 'wadaana' ? 'wadaana' : 'aquasphere';

export const getReportData = asyncHandler(async (req, res) => {
  const { reportType } = req.params;
  const { startDate, endDate, period } = req.query;

  const prefix = getPrefix(req);

  const start = startDate ? new Date(startDate) : new Date(0);
  const end = endDate ? new Date(endDate) : new Date();
  
  if (startDate) start.setUTCHours(0, 0, 0, 0);
  if (endDate) end.setUTCHours(23, 59, 59, 999);

  let data = {};

  switch (reportType) {
    case 'sales': {
      const orders = await prisma[`${prefix}Order`].findMany({
        where: { createdAt: { gte: start, lte: end } },
        include: { items: true, customer: true, deliveries: true }
      });
      // aggregate
      const revenue19L = orders.filter(o => o.type === 'NINETEEN_L').reduce((sum, o) => {
        return sum + o.deliveries.reduce((dSum, d) => dSum + Number(d.cashReceived), 0);
      }, 0);
      const revenuePET = orders.filter(o => o.type === 'PET').reduce((sum, o) => {
        return sum + o.deliveries.reduce((dSum, d) => dSum + Number(d.cashReceived), 0);
      }, 0);
      data = { revenue19L, revenuePET, totalOrders: orders.length };
      break;
    }
    case 'profit': {
      const deliveries = await prisma[`${prefix}Delivery`].findMany({
        where: { deliveredAt: { gte: start, lte: end } }
      });
      const revenue = deliveries.reduce((sum, d) => sum + Number(d.cashReceived), 0);
      
      const expenses = await prisma[`${prefix}Expense`].findMany({
        where: { createdAt: { gte: start, lte: end } }
      });
      const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

      const consumptions = await prisma[`${prefix}ProductionBatchConsumption`].findMany({
        where: { createdAt: { gte: start, lte: end } },
        include: { item: true }
      });
      // simplified cogs (just an estimate without unit price tracking in DB explicitly for items)
      const cogs = consumptions.reduce((sum, c) => sum + Number(c.quantityUsed) * 10, 0); // Placeholder 10 as we don't have unit cost in schema easily

      const estimatedProfit = revenue - cogs - totalExpenses;
      const marginPercent = revenue > 0 ? ((estimatedProfit / revenue) * 100).toFixed(2) : 0;
      data = { revenue, cogs, expenses: totalExpenses, estimatedProfit, marginPercent };
      break;
    }
    case 'expenses': {
      const expenses = await prisma[`${prefix}Expense`].findMany({
        where: { createdAt: { gte: start, lte: end } }
      });
      const grouped = {};
      expenses.forEach(e => {
        if (!grouped[e.category]) grouped[e.category] = { total: 0, receipts: [] };
        grouped[e.category].total += Number(e.amount);
        if (e.receiptUrl) grouped[e.category].receipts.push(e.receiptUrl);
      });
      data = grouped;
      break;
    }
    case 'inventory': {
      const items = await prisma[`${prefix}Item`].findMany();
      data = items.map(i => ({
        id: i.id,
        name: i.name,
        type: i.type,
        cachedQty: i.cachedQty,
        reorderLevel: i.reorderLevel,
        isLow: Number(i.cachedQty) <= Number(i.reorderLevel)
      }));
      break;
    }
    case 'production': {
      const batches = await prisma[`${prefix}ProductionBatch`].findMany({
        where: { batchDate: { gte: start, lte: end } }
      });
      let packs05L = 0, packs15L = 0, waste = 0;
      batches.forEach(b => {
        packs05L += b.packs05L;
        packs15L += b.packs15L;
        waste += b.wasteQuantity;
      });
      data = { packs05L, packs15L, waste, totalBatches: batches.length };
      break;
    }
    case 'customer-credits': {
      const customers = await prisma[`${prefix}Customer`].findMany({
        where: { cachedBalance: { gt: 0 } }
      });
      data = customers.map(c => ({
        id: c.id,
        name: c.name,
        balance: c.cachedBalance,
        creditLimit: c.creditLimit,
        usagePercent: Number(c.creditLimit) > 0 ? (Number(c.cachedBalance) / Number(c.creditLimit) * 100).toFixed(2) : 0
      }));
      break;
    }
    case 'vendor-balances': {
      const vendors = await prisma[`${prefix}Vendor`].findMany({
        include: {
          ledgerEntries: true
        }
      });
      data = vendors.map(v => {
        const purchases = v.ledgerEntries.filter(e => e.type === 'PURCHASE').reduce((s, e) => s + Number(e.amount), 0);
        const payments = v.ledgerEntries.filter(e => e.type === 'PAYMENT').reduce((s, e) => s + Number(e.amount), 0);
        return {
          id: v.id,
          name: v.name,
          payable: purchases - payments
        };
      }).filter(v => v.payable > 0);
      break;
    }
    case 'bottle-summary': {
      const transactions = await prisma[`${prefix}BottleTransaction`].findMany();
      let totalOwned = 0, atFactory = 0, withCustomers = 0, broken = 0, lost = 0;
      transactions.forEach(t => {
        if (t.type === 'NEW_PURCHASE') totalOwned += t.quantity;
        if (t.type === 'RETURNED_BROKEN') broken += t.quantity;
        if (t.type === 'MARKED_LOST') lost += t.quantity;
        if (t.type === 'DELIVERED_TO_CUSTOMER') withCustomers += t.quantity;
        if (t.type === 'RETURNED_GOOD') {
          withCustomers -= t.quantity;
          atFactory += t.quantity;
        }
      });
      // Very simplified bottle logic
      atFactory = totalOwned - withCustomers - broken - lost;
      data = { totalOwned, atFactory, withCustomers, broken, lost };
      break;
    }
    default:
      throw new ApiError(400, 'Invalid report type');
  }

  res.status(200).json(new ApiResponse(200, data, `${reportType} report fetched successfully`));
});
