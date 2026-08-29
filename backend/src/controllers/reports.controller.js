import { prisma } from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getTenantPrefix } from '../utils/tenant.js';

const getPrefix = getTenantPrefix;

/**
 * Generates structured KPI summaries and tabular datasets for various business reports (sales, profitability, expenses, inventory, production, fleet).
 *
 * @param {import('express').Request} req - Express request object with reportType and date range parameters.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
export const getReportData = asyncHandler(async (req, res) => {
  const { reportType } = req.params;
  const { startDate, endDate, period } = req.query;

  const prefix = getPrefix(req);
  const now = new Date();

  let start = startDate ? new Date(startDate) : null;
  let end = endDate ? new Date(endDate) : new Date();

  if (!start) {
    if (period === 'daily') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    } else if (period === 'weekly') {
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      start.setHours(0, 0, 0, 0);
    } else if (period === 'yearly') {
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
    } else if (period === 'all') {
      start = new Date(0);
    } else {
      // Default to monthly (start of current month)
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    }
  }
  
  if (startDate) start.setUTCHours(0, 0, 0, 0);
  if (endDate) end.setUTCHours(23, 59, 59, 999);

  let kpis;
  let table;

  switch (reportType) {
    case 'sales': {
      const orders = await prisma[`${prefix}Order`].findMany({
        where: { createdAt: { gte: start, lte: end } },
        include: { items: { include: { item: true } }, customer: true, deliveries: true },
        orderBy: { createdAt: 'desc' }
      });

      const revenue19L = orders.filter(o => o.type === 'NINETEEN_L').reduce((sum, o) => {
        return sum + o.deliveries.reduce((dSum, d) => dSum + Number(d.cashReceived), 0);
      }, 0);
      const revenuePET = orders.filter(o => o.type === 'PET').reduce((sum, o) => {
        return sum + o.deliveries.reduce((dSum, d) => dSum + Number(d.cashReceived), 0);
      }, 0);
      const totalRevenue = revenue19L + revenuePET;

      kpis = [
        { label: 'Total Orders', value: orders.length.toString() },
        { label: '19L Revenue', value: `Rs. ${revenue19L.toLocaleString()}` },
        { label: 'PET Revenue', value: `Rs. ${revenuePET.toLocaleString()}` },
        { label: 'Total Revenue Collected', value: `Rs. ${totalRevenue.toLocaleString()}` }
      ];

      table = orders.map(o => {
        const cashRec = o.deliveries.reduce((s, d) => s + Number(d.cashReceived), 0);
        return {
          'Order ID': `#${o.id.substring(0, 6).toUpperCase()}`,
          'Customer': o.customer?.name || 'N/A',
          'Category Type': o.type === 'NINETEEN_L' ? '19L Bottle' : 'PET Bottle',
          'Item': o.items[0]?.item?.name || 'N/A',
          'Order Qty': o.items[0]?.quantity || 0,
          'Cash Collected (Rs)': cashRec,
          'Delivery Status': o.deliveryStatus,
          'Payment Status': o.paymentStatus,
          'Date': new Date(o.createdAt).toLocaleDateString()
        };
      });
      break;
    }

    case 'profitability':
    case 'profit': {
      const deliveries = await prisma[`${prefix}Delivery`].findMany({
        where: { deliveredAt: { gte: start, lte: end } }
      });
      const revenue = deliveries.reduce((sum, d) => sum + Number(d.cashReceived), 0);
      
      const expenses = await prisma[`${prefix}Expense`].findMany({
        where: { createdAt: { gte: start, lte: end } }
      });
      const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

      // Compute Weighted Average COGS dynamically from PurchaseItem records
      const purchaseItems = await prisma[`${prefix}PurchaseItem`].findMany({
        where: { purchase: { purchaseDate: { lte: end } } }
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
        where: { createdAt: { gte: start, lte: end } }
      });

      const cogs = consumptions.reduce((sum, c) => {
        const unitCost = itemCostMap[c.itemId] || 0;
        return sum + (Number(c.quantityUsed) * unitCost);
      }, 0);

      const estimatedProfit = revenue - cogs - totalExpenses;
      const marginPercent = revenue > 0 ? ((estimatedProfit / revenue) * 100).toFixed(2) : 0;

      kpis = [
        { label: 'Total Revenue', value: `Rs. ${revenue.toLocaleString()}` },
        { label: 'Real COGS', value: `Rs. ${cogs.toLocaleString()}` },
        { label: 'Operating Expenses', value: `Rs. ${totalExpenses.toLocaleString()}` },
        { label: 'Estimated Net Profit', value: `Rs. ${estimatedProfit.toLocaleString()}` }
      ];

      table = [
        { 'Financial Metric': 'Total Revenue Collected', 'Amount (Rs)': revenue },
        { 'Financial Metric': 'Cost of Goods Sold (COGS)', 'Amount (Rs)': cogs },
        { 'Financial Metric': 'Operating Expenses', 'Amount (Rs)': totalExpenses },
        { 'Financial Metric': 'Net Operating Profit', 'Amount (Rs)': estimatedProfit },
        { 'Financial Metric': 'Profit Margin %', 'Amount (Rs)': `${marginPercent}%` }
      ];
      break;
    }

    case 'expenses': {
      const expenses = await prisma[`${prefix}Expense`].findMany({
        where: { createdAt: { gte: start, lte: end } },
        orderBy: { createdAt: 'desc' }
      });

      const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
      const totalReceipts = expenses.filter(e => !!e.receiptUrl).length;

      kpis = [
        { label: 'Total Expenses', value: `Rs. ${totalAmount.toLocaleString()}` },
        { label: 'Total Logs', value: expenses.length.toString() },
        { label: 'Receipts Attached', value: totalReceipts.toString() }
      ];

      table = expenses.map(e => ({
        'Expense ID': `#${e.id.substring(0, 6).toUpperCase()}`,
        'Category': e.category,
        'Amount (Rs)': Number(e.amount),
        'Date Logged': new Date(e.createdAt).toLocaleDateString(),
        'Receipt URL': e.receiptUrl || 'None Attached'
      }));
      break;
    }

    case 'inventory': {
      const items = await prisma[`${prefix}Item`].findMany({
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

      table = items.map(i => ({
        'Item Name': i.name,
        'Category Type': i.type === 'RAW_MATERIAL' ? 'Raw Material' : 'Finished Good',
        'Unit': i.unit,
        'Current Stock': Number(i.cachedQty),
        'Reorder Level': Number(i.reorderLevel),
        'Status': Number(i.cachedQty) <= Number(i.reorderLevel) ? 'LOW STOCK WARNING' : 'NORMAL'
      }));
      break;
    }

    case 'production': {
      const batches = await prisma[`${prefix}ProductionBatch`].findMany({
        where: { batchDate: { gte: start, lte: end } },
        include: { outputItem: true },
        orderBy: { batchDate: 'desc' }
      });

      let totalGoodYield = 0;
      let totalWaste = 0;
      batches.forEach(b => {
        totalGoodYield += b.quantity || (b.packs05L + b.packs15L);
        totalWaste += b.wasteQuantity || 0;
      });

      kpis = [
        { label: 'Total Production Batches', value: batches.length.toString() },
        { label: 'Total Good Yield (Packs)', value: totalGoodYield.toLocaleString() },
        { label: 'Total Waste / Breakage', value: totalWaste.toLocaleString() }
      ];

      table = batches.map(b => ({
        'Batch ID': `#${b.id.substring(0, 6).toUpperCase()}`,
        'Batch Date': new Date(b.batchDate || b.createdAt).toLocaleDateString(),
        'Output Item': b.outputItem?.name || 'Finished Goods',
        'Good Yield (Packs)': b.quantity || (b.packs05L + b.packs15L),
        'Breakage / Waste': b.wasteQuantity || 0,
        'Remarks': b.remarks || '-'
      }));
      break;
    }

    case 'credit':
    case 'customer-credits': {
      kpis = [
        { label: 'Customers With Outstanding', value: '0' },
        { label: 'Total Exposure', value: 'Rs. 0' },
        { label: 'Credit Limit Breaches', value: '0' }
      ];

      table = [];
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

      table = vendorSummaries.map(v => ({
        'Vendor Name': v.name,
        'Phone': v.phone,
        'Total Purchases (Rs)': v.purchases,
        'Total Payments (Rs)': v.payments,
        'Net Payable Balance (Rs)': v.payable
      }));
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

  res.status(200).json(new ApiResponse(200, { kpis, table }, `${reportType} report fetched successfully`));
});
