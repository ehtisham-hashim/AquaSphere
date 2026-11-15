// backend/tests/integration/05-transport-fleet-daily-close-lock.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../src/config/db.js';
import { addTransportExpense, getExpensesByVehicle, deleteTransportExpense } from '../../src/controllers/transportExpense.controller.js';
import { checkDailyCloseLock } from '../../src/middlewares/dailyClose.middleware.js';
import { createPurchase } from '../../src/controllers/purchase.controller.js';
import { invokeHandler } from './helpers/mockExpress.js';
import { SandboxTracker } from './helpers/sandboxCleanup.js';

test('Live Postgres Integration 5: Transport Vehicle Expenses, Daily Close Lock Guards & Role Access Controls', async (t) => {
  const prefix = 'aquasphere';
  const tracker = new SandboxTracker(prefix);
  const ts = Date.now();

  try {
    // 1. Locate or create a test vehicle
  let vehicle = await prisma.aquasphereVehicle.findFirst({
    where: { isActive: true }
  });

  if (!vehicle) {
    vehicle = await prisma.aquasphereVehicle.create({
      data: {
        name: `Test Carry ${ts}`,
        plateNumber: `LE-${ts.toString().slice(-4)}`,
        model: 'Suzuki Carry 2024',
        isActive: true
      }
    });
    tracker.trackVehicle(vehicle.id);
  }

  assert.ok(vehicle, 'Active vehicle must exist');

  // -----------------------------------------------------------------
  // Stage 1: Add Transport Expense (POST /transport-expenses)
  // -----------------------------------------------------------------
  const expenseAmount = 2500;
  const addReq = {
    body: {
      vehicleId: vehicle.id,
      type: 'DAILY',
      period: 'MONTHLY',
      amount: expenseAmount,
      note: 'Fuel & toll taxes for delivery run',
      date: new Date()
    },
    user: { id: 'bf9a3abe-33d5-41ac-8cb6-110f112a840f', role: 'OWNER', name: 'Logistics Lead' },
    headers: { 'x-tenant-id': prefix }
  };

  const addRes = await invokeHandler(addTransportExpense, addReq);
  assert.equal(addRes.getStatusCode(), 201);

  const expData = addRes.getData();
  assert.ok(expData.id, 'Transport expense ID generated');
  tracker.trackTransportExpense(expData.id);
  assert.equal(Number(expData.amount), expenseAmount);

  // Cross-Page Check: Transport Page - Vehicle Expenses Summary
  const vehicleSummaryRes = await invokeHandler(getExpensesByVehicle, {
    params: { id: vehicle.id },
    headers: { 'x-tenant-id': prefix },
    user: { role: 'OWNER' }
  });
  assert.equal(vehicleSummaryRes.getStatusCode(), 200);

  // -----------------------------------------------------------------
  // Stage 2: Create a Finalized Daily Close Lock on Historical Date
  // -----------------------------------------------------------------
  const lockedDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
  lockedDate.setUTCHours(0, 0, 0, 0);
  const lockedDateStr = lockedDate.toISOString().split('T')[0];
  tracker.trackLockDate(lockedDateStr);

  // Ensure daily close record is marked finalized
  await prisma.aquasphereDailyClose.upsert({
    where: { date: lockedDate },
    create: {
      date: lockedDate,
      adminConfirmed: true,
      expectedCash: 50000,
      actualCash: 50000,
      closedById: 'bf9a3abe-33d5-41ac-8cb6-110f112a840f',
      notes: 'Finalized test lock'
    },
    update: {
      adminConfirmed: true,
      closedById: 'bf9a3abe-33d5-41ac-8cb6-110f112a840f'
    }
  });

  // Create a transport expense on that locked date
  const lockedExpense = await prisma.aquasphereTransportExpense.create({
    data: {
      vehicleId: vehicle.id,
      type: 'REPAIRS',
      period: 'MONTHLY',
      amount: 1200,
      date: lockedDate,
      note: 'Historical radiator repair'
    }
  });
  tracker.trackTransportExpense(lockedExpense.id);

  // -----------------------------------------------------------------
  // Stage 3: Test Daily Close Lock Interception for Non-Owner (ACCOUNTANT)
  // Non-owner attempting to mutate locked record must receive 403 Forbidden
  // -----------------------------------------------------------------
  let lockBlocked = false;
  try {
    const accountantReq = {
      baseUrl: '/api/v1/transport-expenses',
      originalUrl: `/api/v1/transport-expenses/${lockedExpense.id}`,
      params: { id: lockedExpense.id },
      user: { id: 'test-accountant-id', role: 'ACCOUNTANT', name: 'Accountant' },
      headers: { 'x-tenant-id': prefix }
    };
    await invokeHandler(checkDailyCloseLock, accountantReq);
  } catch (err) {
    if (err.statusCode === 403 && err.message.includes('Date is closed for editing')) {
      lockBlocked = true;
    } else {
      throw err;
    }
  }
  assert.ok(lockBlocked, 'ACCOUNTANT role blocked by checkDailyCloseLock on locked transport expense date');

  // -----------------------------------------------------------------
  // Stage 4: Test Owner Bypass on Daily Close Lock
  // Owner is exempted from daily close lock and can delete locked records
  // -----------------------------------------------------------------
  const ownerDeleteReq = {
    baseUrl: '/api/v1/transport-expenses',
    originalUrl: `/api/v1/transport-expenses/${lockedExpense.id}`,
    params: { id: lockedExpense.id },
    user: { id: 'bf9a3abe-33d5-41ac-8cb6-110f112a840f', role: 'OWNER', name: 'Owner' },
    headers: { 'x-tenant-id': prefix }
  };

  // 1. Middleware passes
  await invokeHandler(checkDailyCloseLock, ownerDeleteReq);

  // 2. Controller successfully deletes record
  const deleteRes = await invokeHandler(deleteTransportExpense, ownerDeleteReq);
  assert.equal(deleteRes.getStatusCode(), 200);

  const deletedCheck = await prisma.aquasphereTransportExpense.findUnique({
    where: { id: lockedExpense.id }
  });
  assert.equal(deletedCheck, null, 'Owner successfully deleted locked transport expense');

  // -----------------------------------------------------------------
  // Stage 5: Test Item 1 Audit Fix (pur_ prefix on /expenses route)
  // On the Expenses page, purchases have ID pur_<uuid>. checkDailyCloseLock
  // must strip 'pur_' and query Purchase rather than throwing 404 Expense not found!
  // -----------------------------------------------------------------
  const rawMat = await prisma.aquasphereItem.findFirst({
    where: { type: 'RAW_MATERIAL', archivedAt: null, isReturnable: false }
  });
  const vendor = await prisma.aquasphereVendor.create({
    data: { name: `Lock Test Vendor ${ts}`, phone: `0300${ts.toString().slice(-7)}` }
  });
  tracker.trackVendor(vendor.id);

  const purchaseRes = await invokeHandler(createPurchase, {
    body: {
      vendorId: vendor.id,
      purchaseDate: lockedDate,
      invoiceNo: `PUR-LOCK-${ts.toString().slice(-4)}`,
      items: [{ itemId: rawMat.id, quantity: 10, unitPrice: 10 }],
      status: 'RECEIVED',
      paymentStatus: 'CREDIT'
    },
    headers: { 'x-tenant-id': prefix }
  });
  const lockedPurchase = purchaseRes.getData();
  tracker.trackPurchase(lockedPurchase.id);

  let purPrefixHandled = false;
  try {
    const expensePurReq = {
      baseUrl: '/api/v1/expenses',
      originalUrl: `/api/v1/expenses/pur_${lockedPurchase.id}`,
      params: { id: `pur_${lockedPurchase.id}` },
      user: { id: 'test-accountant-id', role: 'ACCOUNTANT', name: 'Accountant' },
      headers: { 'x-tenant-id': prefix }
    };
    await invokeHandler(checkDailyCloseLock, expensePurReq);
  } catch (err) {
    // Must NOT throw "404 Record not found for daily close lock verification"
    // Must throw "403 Date is closed for editing"
    if (err.statusCode === 403 && err.message.includes('Date is closed for editing')) {
      purPrefixHandled = true;
    } else {
      console.error('Unexpected error on pur_ prefix test:', err);
      throw err;
    }
  }
  assert.ok(purPrefixHandled, 'pur_ prefix on /expenses correctly routes to Purchase without 404 and enforces lock');

  console.log(`\n  [Transport & Lock Suite Passed] Expense logged: Rs. ${expenseAmount} • Daily Close Lock (Date: ${lockedDateStr}) blocked ACCOUNTANT (403) • OWNER bypassed • pur_ prefix handled\n`);
  } catch (err) {
    console.error('\n🔴 Transport & Lock Suite Failed:', err);
    throw err;
  } finally {
    await tracker.cleanup();
    await prisma.$disconnect();
    setTimeout(() => process.exit(0), 500).unref();
  }
});
