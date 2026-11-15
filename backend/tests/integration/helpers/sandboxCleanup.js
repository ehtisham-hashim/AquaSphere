// backend/tests/integration/helpers/sandboxCleanup.js
import { prisma } from '../../../src/config/db.js';

export class SandboxTracker {
  constructor(prefix = 'aquasphere') {
    this.prefix = prefix;
    this.orderIds = new Set();
    this.customerIds = new Set();
    this.vendorIds = new Set();
    this.purchaseIds = new Set();
    this.spotSaleIds = new Set();
    this.spotSaleNumbers = new Set();
    this.productionBatchIds = new Set();
    this.transportExpenseIds = new Set();
    this.expenseIds = new Set();
    this.itemIds = new Set();
    this.vehicleIds = new Set();
    this.lockedDates = new Set();
  }

  trackOrder(id) { if (id) this.orderIds.add(id); }
  trackCustomer(id) { if (id) this.customerIds.add(id); }
  trackVendor(id) { if (id) this.vendorIds.add(id); }
  trackPurchase(id) { if (id) this.purchaseIds.add(id); }
  trackSpotSale(id, saleNumber) { 
    if (id) this.spotSaleIds.add(id); 
    if (saleNumber) this.spotSaleNumbers.add(saleNumber); 
  }
  trackBatch(id) { if (id) this.productionBatchIds.add(id); }
  trackTransportExpense(id) { if (id) this.transportExpenseIds.add(id); }
  trackExpense(id) { if (id) this.expenseIds.add(id); }
  trackItem(id) { if (id) this.itemIds.add(id); }
  trackVehicle(id) { if (id) this.vehicleIds.add(id); }
  trackLockDate(dateStr) { if (dateStr) this.lockedDates.add(dateStr); }

  async cleanup() {
    const p = this.prefix;
    const orderIds = Array.from(this.orderIds);
    const customerIds = Array.from(this.customerIds);
    const vendorIds = Array.from(this.vendorIds);
    const purchaseIds = Array.from(this.purchaseIds);
    const spotSaleIds = Array.from(this.spotSaleIds);
    const batchIds = Array.from(this.productionBatchIds);
    const transportExpenseIds = Array.from(this.transportExpenseIds);
    const expenseIds = Array.from(this.expenseIds);
    const itemIds = Array.from(this.itemIds);
    const vehicleIds = Array.from(this.vehicleIds);
    const lockedDates = Array.from(this.lockedDates);

    try {
      // 1. Bottle & Inventory transactions
      if (orderIds.length || customerIds.length) {
        await prisma[`${p}BottleTransaction`].deleteMany({
          where: { OR: [{ orderId: { in: orderIds } }, { customerId: { in: customerIds } }] }
        }).catch(() => {});
      }

      const spotSaleNumbers = Array.from(this.spotSaleNumbers);
      const allRefIds = [...orderIds, ...purchaseIds, ...spotSaleIds, ...spotSaleNumbers, ...batchIds, ...itemIds];
      if (allRefIds.length) {
        await prisma[`${p}InventoryTransaction`].deleteMany({
          where: { refId: { in: allRefIds } }
        }).catch(() => {});
      }

      // 2. Deliveries & Payments
      if (orderIds.length) {
        await prisma[`${p}Delivery`].deleteMany({ where: { orderId: { in: orderIds } } }).catch(() => {});
      }
      if (orderIds.length || customerIds.length) {
        await prisma[`${p}Payment`].deleteMany({
          where: { OR: [{ orderId: { in: orderIds } }, { customerId: { in: customerIds } }] }
        }).catch(() => {});
      }

      // 3. Orders & items
      if (orderIds.length) {
        await prisma[`${p}OrderItem`].deleteMany({ where: { orderId: { in: orderIds } } }).catch(() => {});
        await prisma[`${p}Order`].deleteMany({ where: { id: { in: orderIds } } }).catch(() => {});
      }

      // 4. Spot / Counter sales
      if (spotSaleIds.length) {
        await prisma[`${p}SpotSaleItem`].deleteMany({ where: { spotSaleId: { in: spotSaleIds } } }).catch(() => {});
        await prisma[`${p}SpotSale`].deleteMany({ where: { id: { in: spotSaleIds } } }).catch(() => {});
      }

      // 5. Production batches
      if (batchIds.length) {
        await prisma[`${p}ProductionBatchConsumption`].deleteMany({ where: { batchId: { in: batchIds } } }).catch(() => {});
        await prisma[`${p}ProductionBatch`].deleteMany({ where: { id: { in: batchIds } } }).catch(() => {});
      }

      // 6. Purchases & Vendor payments
      if (purchaseIds.length) {
        await prisma[`${p}VendorLedgerEntry`].deleteMany({ where: { purchaseId: { in: purchaseIds } } }).catch(() => {});
        await prisma[`${p}PurchaseItem`].deleteMany({ where: { purchaseId: { in: purchaseIds } } }).catch(() => {});
        await prisma[`${p}Purchase`].deleteMany({ where: { id: { in: purchaseIds } } }).catch(() => {});
      }
      if (vendorIds.length) {
        await prisma[`${p}VendorLedgerEntry`].deleteMany({ where: { vendorId: { in: vendorIds } } }).catch(() => {});
        await prisma[`${p}VendorPayment`].deleteMany({ where: { vendorId: { in: vendorIds } } }).catch(() => {});
      }

      // 7. Transport Expenses & General Expenses
      if (transportExpenseIds.length) {
        await prisma[`${p}TransportExpense`].deleteMany({ where: { id: { in: transportExpenseIds } } }).catch(() => {});
      }
      if (expenseIds.length) {
        await prisma[`${p}Expense`].deleteMany({ where: { id: { in: expenseIds } } }).catch(() => {});
      }

      // 8. Daily close locks
      for (const d of lockedDates) {
        const lockDate = new Date(d);
        await prisma[`${p}DailyClose`].deleteMany({
          where: { date: lockDate }
        }).catch(() => {});
      }

      // 9. Master entities: Customers, Vendors, Vehicles, Items
      if (customerIds.length) {
        await prisma[`${p}Customer`].deleteMany({ where: { id: { in: customerIds } } }).catch(() => {});
      }
      if (vendorIds.length) {
        await prisma[`${p}Vendor`].deleteMany({ where: { id: { in: vendorIds } } }).catch(() => {});
      }
      if (vehicleIds.length) {
        await prisma[`${p}Vehicle`].deleteMany({ where: { id: { in: vehicleIds } } }).catch(() => {});
      }
      if (itemIds.length) {
        await prisma[`${p}Item`].deleteMany({ where: { id: { in: itemIds } } }).catch(() => {});
      }
    } catch (err) {
      console.error('Error during sandbox cleanup:', err);
    }
  }
}
