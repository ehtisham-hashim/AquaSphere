// backend/tests/integration/01-procurement-vendor-ap.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../src/config/db.js';
import { createPurchase, recordPurchasePayment, updatePurchase } from '../../src/controllers/purchase.controller.js';
import { getVendorById } from '../../src/controllers/vendor.controller.js';
import { getDailySummary } from '../../src/controllers/analytics.controller.js';
import { getAdminDashboard } from '../../src/controllers/adminDashboard.controller.js';
import { invokeHandler } from './helpers/mockExpress.js';
import { SandboxTracker } from './helpers/sandboxCleanup.js';

test('Live Postgres Integration 1: Procurement, Raw Material Inflow, Vendor AP Ledger & Cash Outflow', async (t) => {
  const prefix = 'aquasphere';
  const tracker = new SandboxTracker(prefix);
  const ts = Date.now();

  try {
    // 1. Locate an active raw material item (e.g. Small Caps or first RAW_MATERIAL)
    const rawMat = await prisma.aquasphereItem.findFirst({
      where: { type: 'RAW_MATERIAL', archivedAt: null, isReturnable: false }
    });
    assert.ok(rawMat, 'An active non-returnable raw material item must exist in database');

    const initialCachedQty = Number(rawMat.cachedQty || 0);
    const initialFactoryQty = Number(rawMat.factoryQty || 0);
    const initialWarehouseQty = Number(rawMat.warehouseQty || 0);

    // Guardrail check: Raw materials must strictly have warehouseQty = 0
    assert.equal(initialWarehouseQty, 0, 'Raw materials must not have warehouse stock (Single-location law)');

    // 2. Create sandbox Vendor with initial AP = 0
    const vendor = await prisma.aquasphereVendor.create({
      data: {
        name: `Test Supplier ${ts}`,
        phone: `0300${ts.toString().slice(-7)}`,
        notes: 'Supplier Lead',
        address: '42 Industrial Estate, Karachi'
      }
    });
    tracker.trackVendor(vendor.id);

    // Initial Vendor AP check via getVendorById
    const initialVendorRes = await invokeHandler(getVendorById, { params: { id: vendor.id }, headers: { 'x-tenant-id': prefix } });
    assert.equal(initialVendorRes.getStatusCode(), 200);
    assert.equal(Number(initialVendorRes.getData().payableBalance), 0, 'New vendor starts with Rs. 0 AP balance');

    // -----------------------------------------------------------------
    // Stage 1: Create Purchase of 1,000 units @ Rs. 2.50 = Rs. 2,500
    // -----------------------------------------------------------------
    const purchaseQty = 1000;
    const unitPrice = 2.5;
    const expectedGrandTotal = purchaseQty * unitPrice; // Rs. 2,500

    const createReq = {
      body: {
        vendorId: vendor.id,
        purchaseDate: new Date(),
        invoiceNo: `INV-${ts.toString().slice(-6)}`,
        items: [{ itemId: rawMat.id, quantity: purchaseQty, unitPrice }],
        status: 'RECEIVED',
        paymentStatus: 'CREDIT'
      },
      user: { id: 'test-buyer-id', role: 'OWNER', name: 'Procurement Officer' },
      headers: { 'x-tenant-id': prefix }
    };

    const createRes = await invokeHandler(createPurchase, createReq);
    assert.equal(createRes.getStatusCode(), 201);

    const purchaseData = createRes.getData();
    assert.ok(purchaseData.id, 'Purchase ID must be generated');
    tracker.trackPurchase(purchaseData.id);
    assert.equal(Number(purchaseData.grandTotal), expectedGrandTotal);

    // Cross-Page Check: Inventory Page (/inventory)
    const rawMatAfterPurchase = await prisma.aquasphereItem.findUnique({ where: { id: rawMat.id } });
    assert.equal(Number(rawMatAfterPurchase.cachedQty), initialCachedQty + purchaseQty, 'Raw material cachedQty increases by exact purchase quantity');
    assert.equal(Number(rawMatAfterPurchase.factoryQty), initialFactoryQty + purchaseQty, 'Raw material factoryQty increases by exact purchase quantity');
    assert.equal(Number(rawMatAfterPurchase.warehouseQty), 0, 'Raw material warehouseQty remains 0');

    // Cross-Page Check: Vendors & AP Page (/vendors)
    const vendorResAfterPurchase = await invokeHandler(getVendorById, { params: { id: vendor.id }, headers: { 'x-tenant-id': prefix } });
    assert.equal(vendorResAfterPurchase.getStatusCode(), 200);
    assert.equal(Number(vendorResAfterPurchase.getData().payableBalance), expectedGrandTotal, 'Vendor AP payableBalance matches purchase grandTotal');

    // Invariant Check: Inventory Transaction ledger logged
    const invTx = await prisma.aquasphereInventoryTransaction.findFirst({
      where: { refType: 'PURCHASE', refId: purchaseData.id, reason: 'NEW_PURCHASE' }
    });
    assert.ok(invTx, 'InventoryTransaction for NEW_PURCHASE exists');
    assert.equal(invTx.direction, 'IN');
    assert.equal(Number(invTx.quantity), purchaseQty);

    // -----------------------------------------------------------------
    // Stage 2: Partial Cash Payout to Vendor (Rs. 1,000 from Drawer)
    // -----------------------------------------------------------------
    const payoutAmount = 1000;
    const payReq = {
      params: { id: purchaseData.id },
      body: {
        amount: payoutAmount,
        paymentMethod: 'CASH',
        remarks: 'Partial cash payment from register',
        paymentDate: new Date()
      },
      user: { id: 'test-cashier-id', role: 'OWNER', name: 'Cashier' },
      headers: { 'x-tenant-id': prefix }
    };

    const payRes = await invokeHandler(recordPurchasePayment, payReq);
    assert.equal(payRes.getStatusCode(), 200);

    // Cross-Page Check: Vendors & AP Page (/vendors)
    const vendorResAfterPay = await invokeHandler(getVendorById, { params: { id: vendor.id }, headers: { 'x-tenant-id': prefix } });
    assert.equal(vendorResAfterPay.getStatusCode(), 200);
    const expectedAPAfterPay = expectedGrandTotal - payoutAmount; // Rs. 1,500
    assert.equal(Number(vendorResAfterPay.getData().payableBalance), expectedAPAfterPay, 'Vendor AP payableBalance reduced by payment amount');

    // Cross-Page Check: Daily Close & Cash Drawer Page (/daily-close)
    const todayStr = new Date().toISOString().split('T')[0];
    const summaryReq = {
      query: { date: todayStr },
      headers: { 'x-tenant-id': prefix },
      user: { role: 'OWNER' }
    };

    const summaryRes = await invokeHandler(getDailySummary, summaryReq);
    assert.equal(summaryRes.getStatusCode(), 200);
    const summaryData = summaryRes.getData();
    assert.ok(Number(summaryData.vendorCash || 0) >= payoutAmount, 'Daily summary captures vendor cash payout in drawer reconciliation');

    // -----------------------------------------------------------------
    // Stage 3: Edit Purchase Quantities (1,000 -> 1,200 caps @ Rs. 2.50)
    // Verifies PURCHASE_UPDATED_REVERSAL (OUT) and PURCHASE_UPDATED (IN)
    // -----------------------------------------------------------------
    const updatedQty = 1200;
    const updatedGrandTotal = updatedQty * unitPrice; // Rs. 3,000

    const updateReq = {
      params: { id: purchaseData.id },
      body: {
        items: [{ itemId: rawMat.id, quantity: updatedQty, unitPrice }]
      },
      user: { id: 'test-buyer-id', role: 'OWNER', name: 'Procurement Officer' },
      headers: { 'x-tenant-id': prefix }
    };

    const updateRes = await invokeHandler(updatePurchase, updateReq);
    assert.equal(updateRes.getStatusCode(), 200);

    // Cross-Page Check: Inventory Page & Ledger
    const rawMatAfterUpdate = await prisma.aquasphereItem.findUnique({ where: { id: rawMat.id } });
    assert.equal(Number(rawMatAfterUpdate.cachedQty), initialCachedQty + updatedQty, 'Stock adjusts cleanly to updated purchase quantity');

    const reversalTx = await prisma.aquasphereInventoryTransaction.findFirst({
      where: { refType: 'PURCHASE', refId: purchaseData.id, reason: 'PURCHASE_UPDATED_REVERSAL' }
    });
    assert.ok(reversalTx, 'Reversal transaction logged before applying updated quantity');
    assert.equal(reversalTx.direction, 'OUT');
    assert.equal(Number(reversalTx.quantity), purchaseQty);

    const updatedTx = await prisma.aquasphereInventoryTransaction.findFirst({
      where: { refType: 'PURCHASE', refId: purchaseData.id, reason: 'PURCHASE_UPDATED' }
    });
    assert.ok(updatedTx, 'Updated IN transaction logged');
    assert.equal(updatedTx.direction, 'IN');
    assert.equal(Number(updatedTx.quantity), updatedQty);

    // Cross-Page Check: Admin Dashboard (/admin)
    const adminReq = {
      query: { timeframe: 'TODAY' },
      headers: { 'x-tenant-id': prefix },
      user: { role: 'ADMIN' }
    };
    const adminRes = await invokeHandler(getAdminDashboard, adminReq);
    assert.equal(adminRes.getStatusCode(), 200);

    console.log(`\n  [Procurement Suite Passed] Initial: ${initialCachedQty} -> Purchased: +${purchaseQty} -> Payout: Rs. ${payoutAmount} -> Updated: ${updatedQty} (Reversals verified)\n`);
  } catch (err) {
    console.error('\n🔴 Procurement Suite Failed:', err);
    throw err;
  } finally {
    await tracker.cleanup();
    await prisma.$disconnect();
    setTimeout(() => process.exit(0), 500).unref();
  }
});
