// backend/tests/integration/07-wadaana-tenant-isolation.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../src/config/db.js';
import { createOrder, deliverOrder, recordOrderPayment } from '../../src/controllers/order.controller.js';
import { getCustomerDetails } from '../../src/controllers/customer.controller.js';
import { getDailySummary } from '../../src/controllers/analytics.controller.js';
import { invokeHandler } from './helpers/mockExpress.js';
import { SandboxTracker } from './helpers/sandboxCleanup.js';

test('Live Postgres Integration 7: Wadaana Multi-Tenant Isolation, Loose Bottle Trading & Cross-Tenant Zero Bleed', async (t) => {
  const prefix = 'wadaana';
  const tracker = new SandboxTracker(prefix);
  const ts = Date.now();
  const wadaanaOwnerId = '06e8b43a-baed-4ecb-9ef6-0e02f7a80838';

  // 1. Locate an active Wadaana Finished Good
  const fg = await prisma.wadaanaItem.findFirst({
    where: { type: 'FINISHED_GOOD', archivedAt: null }
  });
  assert.ok(fg, 'Wadaana finished good item must exist');
  assert.equal(fg.packSize, 1, 'Wadaana sells loose bottles (packSize = 1 per ERP Guardrail 3)');

  // 2. Baseline counts in the OTHER tenant (AquaSphere) to prove zero cross-tenant bleed
  const [initAquaOrders, initAquaCusts, initAquaDeliveries, initAquaPayments] = await Promise.all([
    prisma.aquasphereOrder.count(),
    prisma.aquasphereCustomer.count(),
    prisma.aquasphereDelivery.count(),
    prisma.aquaspherePayment.count()
  ]);

  let customerId = null;
  let orderId = null;

  try {
    // -----------------------------------------------------------------
    // Stage 1: Create sandbox Wadaana Customer
    // -----------------------------------------------------------------
    const customer = await prisma.wadaanaCustomer.create({
      data: {
        name: `Wadaana Isolated Customer ${ts}`,
        customerCode: `WC-${ts.toString().slice(-6)}`,
        phone: `0300${ts.toString().slice(-7)}`,
        type: 'COMMERCIAL',
        address: 'Plot 18, Industrial Estate, Wadaana',
        currentBalance: 0,
        cachedBottleBalance: 0,
        deposit: 0
      }
    });
    customerId = customer.id;
    tracker.trackCustomer(customerId);

    // Assert that AquaSphere customer count did NOT change
    const aquaCustCount = await prisma.aquasphereCustomer.count();
    assert.equal(aquaCustCount, initAquaCusts, 'Zero customer bleed into AquaSphere schema');

    // -----------------------------------------------------------------
    // Stage 2: Create Wadaana Delivery Order (PURE_BOTTLES)
    // -----------------------------------------------------------------
    const orderQty = 500; // 500 loose bottles
    const unitPrice = 15; // Rs. 15 per bottle
    const expectedTotal = orderQty * unitPrice; // Rs. 7,500

    const orderRes = await invokeHandler(createOrder, {
      body: {
        customerId,
        type: 'PURE_BOTTLES',
        items: [{ itemId: fg.id, quantity: orderQty, price: unitPrice }],
        paymentStatus: 'UNPAID',
        bypassCreditCheck: true,
        withGst: false
      },
      user: { id: wadaanaOwnerId, role: 'OWNER', name: 'Wadaana Owner' },
      headers: { 'x-tenant-id': prefix }
    });
    assert.equal(orderRes.getStatusCode(), 201);

    const orderData = orderRes.getData();
    assert.ok(orderData.id, 'Wadaana order ID generated');
    orderId = orderData.id;
    tracker.trackOrder(orderId);
    assert.equal(orderData.type, 'PURE_BOTTLES');
    assert.equal(orderData.deliveryStatus, 'PENDING');

    // Assert zero bleed into AquaSphere orders
    const aquaOrderCount = await prisma.aquasphereOrder.count();
    assert.equal(aquaOrderCount, initAquaOrders, 'Zero order bleed into AquaSphere schema');

    // -------------------------------------------------------------
    // Stage 3: Deliver Wadaana Order with Partial Doorstep Payment
    // -------------------------------------------------------------
    // Supply 500 loose bottles to factory floor so physical dispatch can proceed
    await prisma.wadaanaItem.update({
      where: { id: fg.id },
      data: { cachedQty: orderQty, factoryQty: orderQty }
    });

    const doorstepCash = 2500;
    const deliverRes = await invokeHandler(deliverOrder, {
      params: { id: orderId },
      body: {
        qtyDelivered: orderQty,
        bottlesReturnedGood: 0,
        bottlesReturnedBroken: 0,
        bottlesLost: 0,
        cashReceived: doorstepCash,
        paymentMethod: 'CASH',
        remarks: 'Wadaana factory dispatch'
      },
      user: { id: wadaanaOwnerId, role: 'OWNER', name: 'Wadaana Owner' },
      headers: { 'x-tenant-id': prefix }
    });
    assert.equal(deliverRes.getStatusCode(), 200);

    // Cross-Page Check: Wadaana Customer Details
    const custRes = await invokeHandler(getCustomerDetails, {
      params: { id: customerId },
      user: { id: wadaanaOwnerId, role: 'OWNER' },
      headers: { 'x-tenant-id': prefix }
    });
    assert.equal(custRes.getStatusCode(), 200);
    const expectedDebt = expectedTotal - doorstepCash; // Rs. 5,000
    assert.equal(Number(custRes.getData().currentBalance), expectedDebt, 'Wadaana customer debt correctly reflects remaining balance');

    // Assert zero bleed into AquaSphere deliveries and payments
    const [aquaDelCount, aquaPayCount] = await Promise.all([
      prisma.aquasphereDelivery.count(),
      prisma.aquaspherePayment.count()
    ]);
    assert.equal(aquaDelCount, initAquaDeliveries, 'Zero delivery bleed into AquaSphere schema');
    assert.equal(aquaPayCount, initAquaPayments, 'Zero payment bleed into AquaSphere schema');

    // -----------------------------------------------------------------
    // Stage 4: Settle Remaining Debt
    // -----------------------------------------------------------------
    const payRes = await invokeHandler(recordOrderPayment, {
      params: { id: orderId },
      body: {
        amount: expectedDebt,
        paymentMethod: 'CASH',
        remarks: 'Wadaana settlement'
      },
      user: { id: wadaanaOwnerId, role: 'OWNER' },
      headers: { 'x-tenant-id': prefix }
    });
    assert.equal(payRes.getStatusCode(), 200);

    const settledCust = await prisma.wadaanaCustomer.findUnique({ where: { id: customerId } });
    assert.equal(Number(settledCust.currentBalance), 0, 'Wadaana customer debt cleared to Rs. 0');

    // Cross-Page Check: Wadaana Daily Summary Drawer
    const todayStr = new Date().toISOString().split('T')[0];
    const summaryRes = await invokeHandler(getDailySummary, {
      query: { date: todayStr },
      user: { id: wadaanaOwnerId, role: 'OWNER' },
      headers: { 'x-tenant-id': prefix }
    });
    assert.equal(summaryRes.getStatusCode(), 200);
    const summary = summaryRes.getData();
    assert.ok(Number(summary.ordersCashOnly) >= expectedTotal, 'Wadaana daily summary drawer captures cash accurately');

    console.log(`\n  [Wadaana Suite Passed] Order #${orderId.slice(0, 8)} • 500 loose bottles @ Rs. 15 = Rs. 7,500 • Full delivery & settlement verified • Zero bleed into AquaSphere\n`);
  } catch (err) {
    console.error('\n🔴 Wadaana Suite Failed:', err);
    throw err;
  } finally {
    await tracker.cleanup();
    await prisma.$disconnect();
    setTimeout(() => process.exit(0), 500).unref();
  }
});
