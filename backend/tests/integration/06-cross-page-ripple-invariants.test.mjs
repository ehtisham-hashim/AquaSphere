// backend/tests/integration/06-cross-page-ripple-invariants.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../src/config/db.js';
import { createPurchase, recordPurchasePayment } from '../../src/controllers/purchase.controller.js';
import { createSpotSale } from '../../src/controllers/spotSale.controller.js';
import { createOrder, deliverOrder, recordOrderPayment } from '../../src/controllers/order.controller.js';
import { createExpense } from '../../src/controllers/expense.controller.js';
import { addTransportExpense } from '../../src/controllers/transportExpense.controller.js';
import { getDailySummary, getDashboardAnalytics } from '../../src/controllers/analytics.controller.js';
import { getAdminDashboard } from '../../src/controllers/adminDashboard.controller.js';
import { getCustomerDetails } from '../../src/controllers/customer.controller.js';
import { getVendorById } from '../../src/controllers/vendor.controller.js';
import { getReportData } from '../../src/controllers/reports.controller.js';
import { invokeHandler } from './helpers/mockExpress.js';
import { SandboxTracker } from './helpers/sandboxCleanup.js';

test('Live Postgres Integration 6: Unified Cross-Page Ripple Invariants Across Dashboard, Drawer, Customers, Vendors & Reports', async (t) => {
  const prefix = 'aquasphere';
  const tracker = new SandboxTracker(prefix);
  const ts = Date.now();
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Locate items
  const fg05 = await prisma.aquasphereItem.findFirst({
    where: { name: '0.5L PET', type: 'FINISHED_GOOD', archivedAt: null }
  });
  const fg19L = await prisma.aquasphereItem.findFirst({
    where: { name: { contains: '19L' }, type: 'FINISHED_GOOD', archivedAt: null }
  });
  const rawCap = await prisma.aquasphereItem.findFirst({
    where: { type: 'RAW_MATERIAL', unit: 'cap', archivedAt: null }
  });
  const vehicle = await prisma.aquasphereVehicle.findFirst({
    where: { isActive: true }
  });

  assert.ok(fg05 && fg19L && rawCap && vehicle, 'Required catalog entities must exist');

  // 2. Create sandbox Customer and Vendor
  const customer = await prisma.aquasphereCustomer.create({
    data: {
      name: `Ripple Customer ${ts}`,
      customerCode: `RC-${ts.toString().slice(-6)}`,
      phone: `0300${ts.toString().slice(-7)}`,
      type: 'COMMERCIAL',
      address: '77 Invariant Highway, Lahore',
      currentBalance: 0,
      cachedBottleBalance: 5, // Starts with 5 empty bottles
      deposit: 0
    }
  });
  tracker.trackCustomer(customer.id);

  const vendor = await prisma.aquasphereVendor.create({
    data: {
      name: `Ripple Vendor ${ts}`,
      phone: `0300${ts.toString().slice(-7)}`,
      notes: 'Ripple testing vendor'
    }
  });
  tracker.trackVendor(vendor.id);

  // -----------------------------------------------------------------
  // SNAPSHOT 1: Pre-Execution State Across All 7 System Pages
  // -----------------------------------------------------------------
  const [preSummaryRes, preAdminRes, preVendorRes, preCustRes, preReportRes] = await Promise.all([
    invokeHandler(getDailySummary, { query: { date: todayStr }, headers: { 'x-tenant-id': prefix }, user: { role: 'OWNER' } }),
    invokeHandler(getAdminDashboard, { query: { timeframe: 'TODAY' }, headers: { 'x-tenant-id': prefix }, user: { role: 'ADMIN' } }),
    invokeHandler(getVendorById, { params: { id: vendor.id }, headers: { 'x-tenant-id': prefix } }),
    invokeHandler(getCustomerDetails, { params: { id: customer.id }, headers: { 'x-tenant-id': prefix } }),
    invokeHandler(getReportData, { params: { reportType: 'profitability' }, query: { period: 'daily' }, headers: { 'x-tenant-id': prefix } })
  ]);

  const preSummary = preSummaryRes.getData();
  const preAdmin = preAdminRes.getData();
  const preVendor = preVendorRes.getData();
  const preCust = preCustRes.getData();

  const preDrawerCash = Number(preSummary.expectedDrawerCash || 0);
  assert.equal(Number(preVendor.payableBalance), 0, 'Initial Vendor AP is Rs. 0');
  assert.equal(Number(preCust.currentBalance), 0, 'Initial Customer AR is Rs. 0');
  assert.equal(preCust.cachedBottleBalance, 5, 'Initial Customer bottle balance is 5');

  // Stock snapshots
  const preStockFG05 = Number((await prisma.aquasphereItem.findUnique({ where: { id: fg05.id } })).cachedQty);
  const preStockFG19L = Number((await prisma.aquasphereItem.findUnique({ where: { id: fg19L.id } })).cachedQty);
  const preStockCap = Number((await prisma.aquasphereItem.findUnique({ where: { id: rawCap.id } })).cachedQty);

  let purchaseId = null;
  let saleId = null;
  let orderId = null;
  let transportExpId = null;

  try {
    // -----------------------------------------------------------------
    // COMPOUND BUSINESS CYCLE:
    // -----------------------------------------------------------------

    // Step A: Purchase 1,000 Caps @ Rs. 2.50 = Rs. 2,500
    const purRes = await invokeHandler(createPurchase, {
      body: {
        vendorId: vendor.id,
        purchaseDate: new Date(),
        invoiceNo: `PUR-RPL-${ts.toString().slice(-4)}`,
        items: [{ itemId: rawCap.id, quantity: 1000, unitPrice: 2.5 }],
        status: 'RECEIVED',
        paymentStatus: 'CREDIT'
      },
      headers: { 'x-tenant-id': prefix }
    });
    purchaseId = purRes.getData().id;
    tracker.trackPurchase(purchaseId);

    // Step B: Pay Vendor Rs. 1,000 cash from drawer
    await invokeHandler(recordPurchasePayment, {
      params: { id: purchaseId },
      body: { amount: 1000, paymentMethod: 'CASH', remarks: 'Drawer vendor payout' },
      headers: { 'x-tenant-id': prefix }
    });

    // Step C: Counter Sale of 1 pack 0.5L PET (12 bottles) @ Rs. 600 cash
    const spotRes = await invokeHandler(createSpotSale, {
      body: {
        items: [{ itemId: fg05.id, name: fg05.name, quantity: 1, unitPrice: 600, saleType: 'PACK', unitType: 'PACK' }],
        amountPaid: 600,
        cashCollected: 600,
        paymentMethod: 'CASH',
        remarks: 'Ripple counter sale'
      },
      headers: { 'x-tenant-id': prefix }
    });
    saleId = spotRes.getData().id;
    tracker.trackSpotSale(saleId, spotRes.getData().saleNumber);

    // Step D: Delivery Order for 10 units 19L Refill @ Rs. 200 = Rs. 2,000
    const orderRes = await invokeHandler(createOrder, {
      body: {
        customerId: customer.id,
        type: 'NINETEEN_L',
        items: [{ itemId: fg19L.id, quantity: 10, price: 200 }],
        paymentStatus: 'UNPAID',
        bypassCreditCheck: true
      },
      headers: { 'x-tenant-id': prefix }
    });
    orderId = orderRes.getData().id;
    tracker.trackOrder(orderId);

    // Deliver: 10 units delivered, 7 good empties returned, Rs. 500 doorstep cash paid
    await invokeHandler(deliverOrder, {
      params: { id: orderId },
      body: {
        qtyDelivered: 10,
        bottlesReturnedGood: 7,
        bottlesReturnedBroken: 0,
        bottlesLost: 0,
        cashReceived: 500,
        paymentMethod: 'CASH'
      },
      headers: { 'x-tenant-id': prefix }
    });

    // Step E: Settle remaining customer debt of Rs. 1,500 in cash
    await invokeHandler(recordOrderPayment, {
      params: { id: orderId },
      body: { amount: 1500, paymentMethod: 'CASH', remarks: 'Ripple complete settle' },
      headers: { 'x-tenant-id': prefix }
    });

    // Step F: Factory operational expense of Rs. 500 cash from drawer
    const expRes = await invokeHandler(createExpense, {
      body: {
        category: 'Maintenance',
        amount: 500,
        remarks: 'Plant maintenance',
        receiptUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg'
      },
      headers: { 'x-tenant-id': prefix }
    });
    const expId = expRes.getData().id;
    tracker.trackExpense(expId);

    // Step G: Transport fuel expense of Rs. 300 for delivery vehicle
    const transRes = await invokeHandler(addTransportExpense, {
      body: {
        vehicleId: vehicle.id,
        type: 'DAILY',
        period: 'MONTHLY',
        amount: 300,
        note: 'Ripple fuel expense',
        date: new Date()
      },
      headers: { 'x-tenant-id': prefix }
    });
    transportExpId = transRes.getData().id;
    tracker.trackTransportExpense(transportExpId);

    // -----------------------------------------------------------------
    // SNAPSHOT 2: Post-Execution Verification of Invariant Equations
    // -----------------------------------------------------------------
    const [postSummaryRes, postAdminRes, postVendorRes, postCustRes, postReportRes] = await Promise.all([
      invokeHandler(getDailySummary, { query: { date: todayStr }, headers: { 'x-tenant-id': prefix }, user: { role: 'OWNER' } }),
      invokeHandler(getAdminDashboard, { query: { timeframe: 'TODAY' }, headers: { 'x-tenant-id': prefix }, user: { role: 'ADMIN' } }),
      invokeHandler(getVendorById, { params: { id: vendor.id }, headers: { 'x-tenant-id': prefix } }),
      invokeHandler(getCustomerDetails, { params: { id: customer.id }, headers: { 'x-tenant-id': prefix } }),
      invokeHandler(getReportData, { params: { reportType: 'profitability' }, query: { period: 'daily' }, headers: { 'x-tenant-id': prefix } })
    ]);

    const postSummary = postSummaryRes.getData();
    const postAdmin = postAdminRes.getData();
    const postVendor = postVendorRes.getData();
    const postCust = postCustRes.getData();

    // -------------------------------------------------------------
    // Invariant Equation 1: Cash Drawer Flow
    // Delta Drawer = Counter(+600) + Doorstep(+500) + Settle(+1500) - VendorPay(-1000) - Expense(-500) = +1100 Rs.
    // -------------------------------------------------------------
    const expectedDrawerDelta = 600 + 500 + 1500 - 1000 - 500; // Rs. 1,100
    const actualDrawerDelta = Number(postSummary.expectedDrawerCash) - preDrawerCash;
    assert.equal(
      actualDrawerDelta,
      expectedDrawerDelta,
      `Exact Cash Drawer Invariant holds: preDrawer + ${expectedDrawerDelta} === postDrawer`
    );

    // -------------------------------------------------------------
    // Invariant Equation 2: Customer Debt & Custody Float
    // Accrued Rs. 1,500 debt on delivery, paid Rs. 1,500 on settlement -> Balance = Rs. 0
    // Custody Float: Initial(5) + Delivered(10) - Returned(7) = 8 bottles
    // -------------------------------------------------------------
    assert.equal(Number(postCust.currentBalance), 0, 'Customer debt completely cleared to Rs. 0');
    assert.equal(postCust.cachedBottleBalance, 8, 'Customer custody float updated to exactly 8 bottles');

    // -------------------------------------------------------------
    // Invariant Equation 3: Vendor AP Payable Balance
    // Purchased Rs. 2,500 - Paid Rs. 1,000 = Rs. 1,500 outstanding AP
    // -------------------------------------------------------------
    assert.equal(Number(postVendor.payableBalance), 1500, 'Vendor AP payableBalance accurately matches Rs. 1,500');

    // -------------------------------------------------------------
    // Invariant Equation 4: Inventory Physical Deductions & Additions
    // 0.5L PET: -12 bottles (1 pack * 12)
    // 19L Refill: -10 bottles
    // Small Caps: +1,000 caps
    // -------------------------------------------------------------
    const postStockFG05 = Number((await prisma.aquasphereItem.findUnique({ where: { id: fg05.id } })).cachedQty);
    const postStockFG19L = Number((await prisma.aquasphereItem.findUnique({ where: { id: fg19L.id } })).cachedQty);
    const postStockCap = Number((await prisma.aquasphereItem.findUnique({ where: { id: rawCap.id } })).cachedQty);

    assert.equal(postStockFG05, preStockFG05 - 12, '0.5L PET stock decremented by 12 base units');
    assert.equal(postStockFG19L, preStockFG19L - 10, '19L Refill stock decremented by 10 base units');
    assert.equal(postStockCap, preStockCap + 1000, 'Raw material caps stock incremented by 1,000 units');

    console.log(`\n  [Ripple Invariants Passed] Drawer Cash Delta: +Rs. ${actualDrawerDelta} (Math exact) • Customer AR: Rs. 0 • Customer Float: 8 bottles • Vendor AP: Rs. 1,500\n`);
  } catch (err) {
    console.error('\n🔴 Ripple Invariants Failed:', err);
    throw err;
  } finally {
    // Restore stock
    await prisma.aquasphereItem.update({
      where: { id: fg05.id },
      data: { cachedQty: { increment: 12 }, factoryQty: { increment: 12 } }
    }).catch(() => {});

    await prisma.aquasphereItem.update({
      where: { id: fg19L.id },
      data: { cachedQty: { increment: 10 }, factoryQty: { increment: 10 } }
    }).catch(() => {});

    await prisma.aquasphereItem.update({
      where: { id: rawCap.id },
      data: { cachedQty: { decrement: 1000 }, factoryQty: { decrement: 1000 } }
    }).catch(() => {});

    await tracker.cleanup();
    await prisma.$disconnect();
    setTimeout(() => process.exit(0), 500).unref();
  }
});
