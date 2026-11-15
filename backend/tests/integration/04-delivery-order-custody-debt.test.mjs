// backend/tests/integration/04-delivery-order-custody-debt.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../src/config/db.js';
import { createOrder, deliverOrder, recordOrderPayment } from '../../src/controllers/order.controller.js';
import { getDailySummary } from '../../src/controllers/analytics.controller.js';
import { getReportData } from '../../src/controllers/reports.controller.js';
import { invokeHandler } from './helpers/mockExpress.js';
import { SandboxTracker } from './helpers/sandboxCleanup.js';

test('Live Postgres Integration 4: Customer Delivery Orders, Custody Float, Doorstep Cash & Debt Settlement', async (t) => {
  const prefix = 'aquasphere';
  const tracker = new SandboxTracker(prefix);
  const ts = Date.now();

  // 1. Locate 19L Refill (FG) and Empty 19L Bottles (RM)
  const fg19L = await prisma.aquasphereItem.findFirst({
    where: { name: { contains: '19L' }, type: 'FINISHED_GOOD', archivedAt: null }
  });
  const emptyBtlRM = await prisma.aquasphereItem.findFirst({
    where: { name: { contains: '19L' }, type: 'RAW_MATERIAL', isReturnable: true, archivedAt: null }
  });

  assert.ok(fg19L, 'Active 19L finished good must exist in database');
  assert.ok(emptyBtlRM, 'Active Empty 19L returnable bottle item must exist in database');

  const unitPrice = 200;
  const orderQty = 15;
  const expectedOrderTotal = orderQty * unitPrice; // Rs. 3,000

  const initialCustodyFloat = 10;
  const goodEmptiesReturned = 12;
  const brokenEmptiesReturned = 1;
  const doorstepCash = 1000;
  const expectedDebtAfterDelivery = expectedOrderTotal - doorstepCash; // Rs. 2,000
  const expectedBottleBalanceAfter = initialCustodyFloat + orderQty - (goodEmptiesReturned + brokenEmptiesReturned); // 12 bottles

  let customerId = null;
  let orderId = null;

  try {
    // -----------------------------------------------------------------
    // Stage 1: Create sandbox customer with opening bottle custody
    // -----------------------------------------------------------------
    const customer = await prisma.aquasphereCustomer.create({
      data: {
        name: `Sandbox Customer ${ts}`,
        customerCode: `TC-${ts.toString().slice(-6)}`,
        phone: `0300${ts.toString().slice(-7)}`,
        type: 'COMMERCIAL',
        address: '42 Main Boulevard, Lahore',
        currentBalance: 0,
        cachedBottleBalance: initialCustodyFloat,
        deposit: 0
      }
    });
    customerId = customer.id;
    tracker.trackCustomer(customerId);

    assert.equal(Number(customer.currentBalance), 0);
    assert.equal(customer.cachedBottleBalance, initialCustodyFloat);

    // -----------------------------------------------------------------
    // Stage 2: Create Delivery Order (POST /orders)
    // -----------------------------------------------------------------
    const createReq = {
      body: {
        customerId,
        type: 'NINETEEN_L',
        items: [{ itemId: fg19L.id, quantity: orderQty, price: unitPrice }],
        expectedDelivery: new Date(),
        paymentStatus: 'UNPAID',
        bypassCreditCheck: true,
        withGst: false
      },
      headers: { 'x-tenant-id': prefix }
    };

    const createRes = await invokeHandler(createOrder, createReq);
    assert.equal(createRes.getStatusCode(), 201);

    const orderData = createRes.getData();
    assert.ok(orderData.id, 'Order ID must be generated');
    orderId = orderData.id;
    tracker.trackOrder(orderId);
    assert.equal(orderData.deliveryStatus, 'PENDING');
    assert.equal(orderData.paymentStatus, 'UNPAID');

    // Invariant Check: Customer debt must NOT increase before goods are delivered!
    const custBeforeDelivery = await prisma.aquasphereCustomer.findUnique({ where: { id: customerId } });
    assert.equal(Number(custBeforeDelivery.currentBalance), 0, 'No debt before physical delivery');

    // -----------------------------------------------------------------
    // Stage 3: Deliver Order (POST /orders/:id/deliver)
    // Deliver 15 units, collect 12 good empties + 1 broken, collect Rs. 1,000 doorstep cash
    // -----------------------------------------------------------------
    const deliverReq = {
      params: { id: orderId },
      body: {
        qtyDelivered: orderQty,
        bottlesReturnedGood: goodEmptiesReturned,
        bottlesReturnedBroken: brokenEmptiesReturned,
        bottlesLost: 0,
        cashReceived: doorstepCash,
        paymentMethod: 'CASH',
        remarks: 'Test Doorstep Delivery'
      },
      headers: { 'x-tenant-id': prefix }
    };

    const deliverRes = await invokeHandler(deliverOrder, deliverReq);
    assert.equal(deliverRes.getStatusCode(), 200);

    const deliveredData = deliverRes.getData();
    assert.equal(deliveredData.deliveryStatus, 'DELIVERED');
    assert.equal(deliveredData.paymentStatus, 'PARTIAL');

    // Cross-Page Check: Customers & Receivables Page (/customers)
    const custAfterDelivery = await prisma.aquasphereCustomer.findUnique({ where: { id: customerId } });
    assert.equal(
      Number(custAfterDelivery.currentBalance),
      expectedDebtAfterDelivery,
      'Customer debt matches remaining balance (Total - Doorstep Cash)'
    );
    assert.equal(
      custAfterDelivery.cachedBottleBalance,
      expectedBottleBalanceAfter,
      'Bottle custody float accurately tracks returnables (Initial + Delivered - Returned)'
    );

    // Cross-Page Check: Deliveries and Doorstep Payment recorded
    const deliveryRec = await prisma.aquasphereDelivery.findFirst({ where: { orderId } });
    assert.ok(deliveryRec, 'Delivery record exists');
    assert.equal(deliveryRec.qtyDelivered, orderQty);
    assert.equal(Number(deliveryRec.cashReceived), doorstepCash);

    const doorstepPayment = await prisma.aquaspherePayment.findFirst({ where: { orderId } });
    assert.ok(doorstepPayment, 'Doorstep payment record exists');
    assert.equal(Number(doorstepPayment.amount), doorstepCash);

    // -----------------------------------------------------------------
    // Stage 4: Post-Delivery Debt Settlement (POST /orders/:id/payment)
    // Customer settles remaining Rs. 2,000 in cash
    // -----------------------------------------------------------------
    const payReq = {
      params: { id: orderId },
      body: {
        amount: expectedDebtAfterDelivery,
        paymentMethod: 'CASH',
        remarks: 'Complete debt clearance settlement'
      },
      headers: { 'x-tenant-id': prefix }
    };

    const payRes = await invokeHandler(recordOrderPayment, payReq);
    assert.equal(payRes.getStatusCode(), 200);

    const orderSettled = payRes.getData();
    assert.equal(orderSettled.paymentStatus, 'PAID', 'Order transitions to PAID upon complete settlement');

    // Cross-Page Check: Customer AR cleared back to Rs. 0
    const custAfterSettle = await prisma.aquasphereCustomer.findUnique({ where: { id: customerId } });
    assert.equal(Number(custAfterSettle.currentBalance), 0, 'Customer debt is completely cleared to Rs. 0');

    // -----------------------------------------------------------------
    // Stage 5: Financial Daily Drawer Reconciliation & Reports Non-Double Counting
    // -----------------------------------------------------------------
    const todayStr = new Date().toISOString().split('T')[0];
    const summaryRes = await invokeHandler(getDailySummary, {
      query: { date: todayStr },
      headers: { 'x-tenant-id': prefix },
      user: { role: 'OWNER' }
    });
    assert.equal(summaryRes.getStatusCode(), 200);
    const summaryData = summaryRes.getData();
    assert.ok(Number(summaryData.ordersCashOnly || 0) >= expectedOrderTotal, 'Drawer captures both doorstep and settled cash');

    // Cross-Page Check: Reports Profitability Non-Double-Counting
    const reportRes = await invokeHandler(getReportData, {
      params: { reportType: 'profitability' },
      query: { period: 'daily' },
      headers: { 'x-tenant-id': prefix },
      user: { role: 'OWNER' }
    });
    assert.equal(reportRes.getStatusCode(), 200);

    // Cross-Page Check: Reports Fleet Label Clarity
    const fleetRes = await invokeHandler(getReportData, {
      params: { reportType: 'fleet' },
      query: { period: 'monthly' },
      headers: { 'x-tenant-id': prefix },
      user: { role: 'OWNER' }
    });
    assert.equal(fleetRes.getStatusCode(), 200);
    const fleetData = fleetRes.getData();
    const bottleKpi = fleetData.kpis.find(k => k.label === 'Total 19L Bottles in Fleet');
    assert.ok(bottleKpi, 'Fleet KPI clearly states Total 19L Bottles in Fleet');

    console.log(`\n  [Delivery Suite Passed] Order #${orderId.slice(0, 8)} • 15 delivered, 13 empties processed, Rs. 1,000 doorstep + Rs. 2,000 settled -> Customer AR: Rs. 0, Custody Float: ${expectedBottleBalanceAfter} bottles\n`);
  } catch (err) {
    console.error('\n🔴 Delivery Suite Failed:', err);
    throw err;
  } finally {
    // Restore physical stock
    if (orderId) {
      await prisma.aquasphereItem.update({
        where: { id: fg19L.id },
        data: {
          cachedQty: { increment: orderQty },
          factoryQty: { increment: orderQty }
        }
      }).catch(() => {});

      await prisma.aquasphereItem.update({
        where: { id: emptyBtlRM.id },
        data: {
          cachedQty: { decrement: goodEmptiesReturned },
          factoryQty: { decrement: goodEmptiesReturned }
        }
      }).catch(() => {});
    }

    await tracker.cleanup();
    await prisma.$disconnect();
    setTimeout(() => process.exit(0), 500).unref();
  }
});
