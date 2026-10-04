import 'dotenv/config';
import { prisma, closeDatabaseConnections } from '../src/config/db.js';

async function run() {
  console.log('====================================================');
  console.log('🔬 PRISMA SCHEMA & DATABASE INTEGRITY TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Connection Test
    console.log('📡 1. Testing Database Connection...');
    await prisma.$queryRaw`SELECT 1 as connected;`;
    assert(true, 'Connected to Neon PostgreSQL database');

    // 2. Model Read & Count Tests (AquaSphere & Wadaana)
    console.log('\n📊 2. Testing Tenant Model Queries & Schema Alignment...');
    
    const tenants = ['Aquasphere', 'Wadaana'];

    for (const t of tenants) {
      console.log(`\n  Checking [${t}] Models:`);

      // Item
      const items = await prisma[`${t}Item`].findMany({ take: 3 });
      assert(Array.isArray(items), `${t}Item query successful (${items.length} records checked)`);
      if (items.length > 0) {
        const item = items[0];
        assert('packSize' in item, `${t}Item has field 'packSize'`);
        assert('cachedQty' in item, `${t}Item has field 'cachedQty'`);
        assert('factoryQty' in item, `${t}Item has field 'factoryQty'`);
        assert('warehouseQty' in item, `${t}Item has field 'warehouseQty'`);
        assert('retailPrice' in item, `${t}Item has field 'retailPrice'`);
        assert('sellableOnCounter' in item, `${t}Item has field 'sellableOnCounter'`);
      }

      // User
      const users = await prisma[`${t}User`].findMany({ take: 1 });
      assert(Array.isArray(users), `${t}User query successful`);
      if (users.length > 0) {
        assert('otpCode' in users[0], `${t}User has field 'otpCode'`);
        assert('otpExpiresAt' in users[0], `${t}User has field 'otpExpiresAt'`);
      }

      // Customer
      const customers = await prisma[`${t}Customer`].findMany({ take: 1 });
      assert(Array.isArray(customers), `${t}Customer query successful`);

      // Order
      const orders = await prisma[`${t}Order`].findMany({ take: 1, include: { items: true } });
      assert(Array.isArray(orders), `${t}Order query with items relation successful`);

      // SpotSale
      const spotSales = await prisma[`${t}SpotSale`].findMany({ take: 1, include: { items: true } });
      assert(Array.isArray(spotSales), `${t}SpotSale query with items relation successful`);

      // DailyClose
      const dailyCloses = await prisma[`${t}DailyClose`].findMany({ take: 1 });
      assert(Array.isArray(dailyCloses), `${t}DailyClose query successful`);
      if (dailyCloses.length > 0) {
        const dc = dailyCloses[0];
        assert('actualCash' in dc, `${t}DailyClose has field 'actualCash'`);
        assert('expectedCash' in dc, `${t}DailyClose has field 'expectedCash'`);
        assert('cashDifference' in dc, `${t}DailyClose has field 'cashDifference'`);
      }

      // CounterAuditLedger
      const audits = await prisma[`${t}CounterAuditLedger`].findMany({ take: 1 });
      assert(Array.isArray(audits), `${t}CounterAuditLedger query successful`);

      // InventoryTransaction
      const txs = await prisma[`${t}InventoryTransaction`].findMany({ take: 1 });
      assert(Array.isArray(txs), `${t}InventoryTransaction query successful`);

      // ProductionBatch
      const batches = await prisma[`${t}ProductionBatch`].findMany({ take: 1 });
      assert(Array.isArray(batches), `${t}ProductionBatch query successful`);

      // Vehicle & Transport Expense
      const vehicles = await prisma[`${t}Vehicle`].findMany({ take: 1 });
      assert(Array.isArray(vehicles), `${t}Vehicle query successful`);
      const transportExp = await prisma[`${t}TransportExpense`].findMany({ take: 1 });
      assert(Array.isArray(transportExp), `${t}TransportExpense query successful`);

      // General Expense
      const expenses = await prisma[`${t}Expense`].findMany({ take: 1 });
      assert(Array.isArray(expenses), `${t}Expense query successful`);

      // Vendors & Bills
      const vendors = await prisma[`${t}Vendor`].findMany({ take: 1 });
      assert(Array.isArray(vendors), `${t}Vendor query successful`);
      const vendorLedger = await prisma[`${t}VendorLedgerEntry`].findMany({ take: 1 });
      assert(Array.isArray(vendorLedger), `${t}VendorLedgerEntry query successful`);
      const vendorPayments = await prisma[`${t}VendorPayment`].findMany({ take: 1 });
      assert(Array.isArray(vendorPayments), `${t}VendorPayment query successful`);
    }

    // 3. CRUD Integrity Test on Item (Counter Sales Fields)
    console.log('\n🧪 3. Testing CRUD & Type Integrity on AquasphereItem...');
    const testItemName = `__TEST_SCHEMA_ITEM_${Date.now()}__`;
    
    // Create
    const createdItem = await prisma.aquasphereItem.create({
      data: {
        name: testItemName,
        type: 'RAW_MATERIAL',
        unit: 'pcs',
        packSize: 24,
        cachedQty: 100,
        factoryQty: 100,
        warehouseQty: 0,
        reorderLevel: 20,
        retailPrice: 45.5,
        sellableOnCounter: true
      }
    });
    assert(createdItem.id != null, 'Created item successfully with ID');
    assert(createdItem.packSize === 24, 'packSize correctly stored as 24');
    assert(Number(createdItem.retailPrice) === 45.5, 'retailPrice correctly stored as 45.5');
    assert(createdItem.sellableOnCounter === true, 'sellableOnCounter correctly stored as true');

    // Update
    const updatedItem = await prisma.aquasphereItem.update({
      where: { id: createdItem.id },
      data: {
        retailPrice: 50.0,
        sellableOnCounter: false
      }
    });
    assert(Number(updatedItem.retailPrice) === 50.0, 'Updated retailPrice to 50.0');
    assert(updatedItem.sellableOnCounter === false, 'Updated sellableOnCounter to false');

    // Delete
    await prisma.aquasphereItem.delete({ where: { id: createdItem.id } });
    const verifyDeleted = await prisma.aquasphereItem.findUnique({ where: { id: createdItem.id } });
    assert(verifyDeleted === null, 'Item deleted cleanly');

    // 4. CRUD Integrity Test on CounterAuditLedger
    console.log('\n🧪 4. Testing CRUD on AquasphereCounterAuditLedger & DailyClose...');
    const testDate = new Date('2099-12-31');
    const createdAudit = await prisma.aquasphereCounterAuditLedger.create({
      data: {
        date: testDate,
        physicalCashInHand: 15420.50,
        recordedWaterLitres: 1500.0,
        countedBottles: 120,
        countedCaps: 350,
        cameraVerificationNotes: 'Audit verification test note',
        isVerified: true
      }
    });
    assert(createdAudit.id != null, 'CounterAuditLedger record created');
    assert(Number(createdAudit.physicalCashInHand) === 15420.50, 'physicalCashInHand correctly stored');
    assert(createdAudit.countedBottles === 120, 'countedBottles correctly stored');
    assert(createdAudit.countedCaps === 350, 'countedCaps correctly stored');
    assert(createdAudit.isVerified === true, 'isVerified correctly stored');

    // Cleanup Audit
    await prisma.aquasphereCounterAuditLedger.delete({ where: { id: createdAudit.id } });
    const verifyAuditDel = await prisma.aquasphereCounterAuditLedger.findUnique({ where: { id: createdAudit.id } });
    assert(verifyAuditDel === null, 'CounterAuditLedger deleted cleanly');

    // 5. Test Wadaana Item CRUD
    console.log('\n🧪 5. Testing CRUD on WadaanaItem...');
    const createdWItem = await prisma.wadaanaItem.create({
      data: {
        name: `__TEST_WADAANA_ITEM_${Date.now()}__`,
        type: 'RAW_MATERIAL',
        unit: 'kg',
        packSize: 1,
        cachedQty: 500,
        factoryQty: 500,
        warehouseQty: 0,
        reorderLevel: 50,
        retailPrice: 280.0,
        sellableOnCounter: false
      }
    });
    assert(createdWItem.id != null, 'WadaanaItem created successfully');
    assert(Number(createdWItem.cachedQty) === 500, 'WadaanaItem cachedQty verified');
    await prisma.wadaanaItem.delete({ where: { id: createdWItem.id } });
    const verifyWDeleted = await prisma.wadaanaItem.findUnique({ where: { id: createdWItem.id } });
    assert(verifyWDeleted === null, 'WadaanaItem deleted cleanly');

  } catch (err) {
    console.error('\n💥 Unexpected Exception during test run:', err);
    failed++;
  } finally {
    await closeDatabaseConnections();
    console.log('\n====================================================');
    console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');
    process.exit(failed > 0 ? 1 : 0);
  }
}

run();
