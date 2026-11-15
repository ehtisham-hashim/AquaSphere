// backend/tests/integration/03-counter-sales-cash-drawer.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../src/config/db.js';
import { createSpotSale, getTodaySpotSalesSummary } from '../../src/controllers/spotSale.controller.js';
import { getDailySummary } from '../../src/controllers/analytics.controller.js';
import { getAdminDashboard } from '../../src/controllers/adminDashboard.controller.js';
import { invokeHandler } from './helpers/mockExpress.js';
import { SandboxTracker } from './helpers/sandboxCleanup.js';

test('Live Postgres Integration 3: Walk-in Counter Sales, Base-Unit Deductions & Cash Drawer Inflow', async (t) => {
  const prefix = 'aquasphere';
  const tracker = new SandboxTracker(prefix);

  // 1. Locate 0.5L PET (packSize 12) and 19L Refill (packSize 1)
  const fg05 = await prisma.aquasphereItem.findFirst({
    where: { name: '0.5L PET', type: 'FINISHED_GOOD', archivedAt: null }
  });
  const fg19L = await prisma.aquasphereItem.findFirst({
    where: { name: { contains: '19L' }, type: 'FINISHED_GOOD', archivedAt: null }
  });

  assert.ok(fg05, '0.5L PET finished good must exist');
  assert.ok(fg19L, '19L finished good must exist');
  assert.equal(fg05.packSize, 12, '0.5L PET packSize must be 12 (Base unit storage law)');

  // Baseline snapshots
  const initFG05 = await prisma.aquasphereItem.findUnique({ where: { id: fg05.id } });
  const initFG19L = await prisma.aquasphereItem.findUnique({ where: { id: fg19L.id } });

  const todayStr = new Date().toISOString().split('T')[0];
  const initSummaryRes = await invokeHandler(getDailySummary, {
    query: { date: todayStr },
    headers: { 'x-tenant-id': prefix },
    user: { role: 'OWNER' }
  });
  assert.equal(initSummaryRes.getStatusCode(), 200);
  const initSummary = initSummaryRes.getData();
  const initDrawerCash = Number(initSummary.expectedDrawerCash || 0);
  const initSpotSales = Number(initSummary.totalSpotSales || 0);

  // Counter sale parameters:
  // 2 packs of 0.5L @ Rs. 600/pack = Rs. 1,200 (deducts 24 physical bottles)
  // 1 unit of 19L @ Rs. 200 = Rs. 200 (deducts 1 physical bottle)
  // Total Sale = Rs. 1,400
  const packQty05 = 2;
  const rate05 = 600;
  const expectedDeduct05 = packQty05 * 12; // 24 bottles

  const unitQty19L = 1;
  const rate19L = 200;
  const expectedDeduct19L = unitQty19L; // 1 bottle

  const expectedTotalBill = (packQty05 * rate05) + (unitQty19L * rate19L); // Rs. 1,400

  let saleId = null;

  try {
    // -----------------------------------------------------------------
    // Stage 1: Create Walk-in Counter Sale (POST /spot-sales)
    // -----------------------------------------------------------------
    const saleReq = {
      body: {
        items: [
          {
            itemId: fg05.id,
            name: fg05.name,
            quantity: packQty05,
            unitPrice: rate05,
            saleType: 'PACK',
            unitType: 'PACK'
          },
          {
            itemId: fg19L.id,
            name: fg19L.name,
            quantity: unitQty19L,
            unitPrice: rate19L,
            saleType: 'FINISHED_GOOD',
            unitType: 'BOTTLE'
          }
        ],
        amountPaid: expectedTotalBill,
        cashCollected: expectedTotalBill,
        paymentMethod: 'CASH',
        remarks: 'Walk-in cash counter sale integration test'
      },
      user: { id: 'test-counter-cashier', role: 'OWNER', name: 'Counter Cashier' },
      headers: { 'x-tenant-id': prefix }
    };

    const saleRes = await invokeHandler(createSpotSale, saleReq);
    assert.equal(saleRes.getStatusCode(), 201);

    const saleData = saleRes.getData();
    assert.ok(saleData.id, 'Spot sale ID must be generated');
    saleId = saleData.id;
    const saleNumber = saleData.saleNumber;
    tracker.trackSpotSale(saleId, saleNumber);
    assert.equal(Number(saleData.totalAmount), expectedTotalBill);

    // Cross-Page Check: Inventory Page (/inventory) - Base Unit Deductions
    const postFG05 = await prisma.aquasphereItem.findUnique({ where: { id: fg05.id } });
    const postFG19L = await prisma.aquasphereItem.findUnique({ where: { id: fg19L.id } });

    assert.equal(
      Number(postFG05.cachedQty),
      Number(initFG05.cachedQty) - expectedDeduct05,
      '0.5L PET cachedQty decremented by 24 physical bottles (2 packs * 12)'
    );
    assert.equal(
      Number(postFG19L.cachedQty),
      Number(initFG19L.cachedQty) - expectedDeduct19L,
      '19L Refill cachedQty decremented by 1 physical bottle'
    );

    // Invariant Check: Inventory Transactions logged with reason SPOT_SALE
    const spotTx05 = await prisma.aquasphereInventoryTransaction.findFirst({
      where: { refType: 'SPOT_SALE', refId: saleNumber, itemId: fg05.id }
    });
    assert.ok(spotTx05, 'Counter sale transaction logged for 0.5L PET');
    assert.equal(spotTx05.direction, 'OUT');
    assert.equal(Number(spotTx05.quantity), expectedDeduct05);

    // Cross-Page Check: Daily Close & Cash Drawer Page (/daily-close)
    const postSummaryRes = await invokeHandler(getDailySummary, {
      query: { date: todayStr },
      headers: { 'x-tenant-id': prefix },
      user: { role: 'OWNER' }
    });
    assert.equal(postSummaryRes.getStatusCode(), 200);
    const postSummary = postSummaryRes.getData();

    assert.equal(
      Number(postSummary.totalSpotSales),
      initSpotSales + expectedTotalBill,
      'totalSpotSales reflects the Rs. 1,400 counter sale inflow'
    );
    assert.equal(
      Number(postSummary.expectedDrawerCash),
      initDrawerCash + expectedTotalBill,
      'expectedDrawerCash reflects immediate cash receipt in register'
    );

    // Cross-Page Check: Counter Sales Today Summary (/spot-sales/today-summary)
    const summaryCardRes = await invokeHandler(getTodaySpotSalesSummary, {
      headers: { 'x-tenant-id': prefix },
      user: { role: 'OWNER' }
    });
    assert.equal(summaryCardRes.getStatusCode(), 200);
    const summaryCard = summaryCardRes.getData();
    assert.ok(summaryCard.todayRevenue >= expectedTotalBill);

    // Cross-Page Check: Admin Dashboard (/admin)
    const adminRes = await invokeHandler(getAdminDashboard, {
      query: { timeframe: 'TODAY' },
      headers: { 'x-tenant-id': prefix },
      user: { role: 'ADMIN' }
    });
    assert.equal(adminRes.getStatusCode(), 200);

    console.log(`\n  [Counter Sales Suite Passed] Sale #${saleId.slice(0, 8)} • Rs. ${expectedTotalBill} Cash Inflow • Deducted: 24 0.5L bottles + 1 19L bottle • Drawer Cash: Rs. ${initDrawerCash} -> Rs. ${initDrawerCash + expectedTotalBill}\n`);
  } catch (err) {
    console.error('\n🔴 Counter Sales Suite Failed:', err);
    throw err;
  } finally {
    // Restore inventory counts for finished goods
    if (saleId) {
      await prisma.aquasphereItem.update({
        where: { id: fg05.id },
        data: {
          cachedQty: { increment: expectedDeduct05 },
          factoryQty: { increment: expectedDeduct05 }
        }
      }).catch(() => {});

      await prisma.aquasphereItem.update({
        where: { id: fg19L.id },
        data: {
          cachedQty: { increment: expectedDeduct19L },
          factoryQty: { increment: expectedDeduct19L }
        }
      }).catch(() => {});
    }

    await tracker.cleanup();
    await prisma.$disconnect();
    setTimeout(() => process.exit(0), 500).unref();
  }
});
