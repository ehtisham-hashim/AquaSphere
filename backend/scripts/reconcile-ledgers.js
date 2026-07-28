import 'dotenv/config';
import { prisma } from '../src/config/db.js';

async function reconcileLedgers(prefix = 'aquasphere') {
  console.log(`Starting ledger reconciliation for tenant [${prefix}]...`);

  // 1. Reconcile Item Stock Quantities from InventoryTransactions
  const items = await prisma[`${prefix}Item`].findMany();
  for (const item of items) {
    const transactions = await prisma[`${prefix}InventoryTransaction`].findMany({
      where: { itemId: item.id }
    });

    let totalQty = 0;
    for (const t of transactions) {
      const qty = Number(t.quantity);
      if (t.direction === 'IN') totalQty += qty;
      else if (t.direction === 'OUT') totalQty -= qty;
    }

    await prisma[`${prefix}Item`].update({
      where: { id: item.id },
      data: { cachedQty: totalQty }
    });
    console.log(`Reconciled Item [${item.name}]: stock set to ${totalQty}`);
  }

  // 2. Reconcile Customer Bottle Balance & Cash Balance
  const customers = await prisma[`${prefix}Customer`].findMany();
  for (const c of customers) {
    // Bottle balance
    const bottleTxns = await prisma[`${prefix}BottleTransaction`].findMany({
      where: { customerId: c.id }
    });

    let bottleBal = 0;
    for (const bt of bottleTxns) {
      if (bt.type === 'DELIVERED_TO_CUSTOMER') bottleBal += bt.quantity;
      if (bt.type === 'RETURNED_GOOD' || bt.type === 'RETURNED_BROKEN') bottleBal -= bt.quantity;
    }

    // Cash balance (Delivered orders total - total payments)
    const orders = await prisma[`${prefix}Order`].findMany({
      where: { customerId: c.id, deliveryStatus: 'DELIVERED' },
      include: { items: true }
    });
    const payments = await prisma[`${prefix}Payment`].findMany({
      where: { customerId: c.id }
    });

    let totalOrdered = 0;
    orders.forEach(o => {
      o.items.forEach(i => {
        totalOrdered += Number(i.price) * i.quantity;
      });
    });

    let totalPaid = 0;
    payments.forEach(p => {
      totalPaid += Number(p.amount);
    });

    const cashBal = totalOrdered - totalPaid;

    await prisma[`${prefix}Customer`].update({
      where: { id: c.id },
      data: {
        cachedBottleBalance: bottleBal,
        cachedBalance: cashBal
      }
    });
    console.log(`Reconciled Customer [${c.name}]: bottles=${bottleBal}, balance=Rs. ${cashBal}`);
  }

  console.log(`Reconciliation complete for tenant [${prefix}]!`);
}

async function main() {
  try {
    await reconcileLedgers('aquasphere');
    await reconcileLedgers('wadaana');
  } catch (err) {
    console.error('Reconciliation error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
