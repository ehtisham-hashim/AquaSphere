// backend/tests/integration/02-production-bom-yield-scrap.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../src/config/db.js';
import { createProductionBatch, completeProductionBatch, getProductionBatchById } from '../../src/controllers/production.controller.js';
import { invokeHandler } from './helpers/mockExpress.js';
import { SandboxTracker } from './helpers/sandboxCleanup.js';

test('Live Postgres Integration 2: Production BOM Deductions, Base-Unit Yield Inflow & Waste Scrap Sparing', async (t) => {
  const prefix = 'aquasphere';
  const tracker = new SandboxTracker(prefix);

  // 1. Locate 0.5L PET finished good and its BOM recipe components
  const fg05 = await prisma.aquasphereItem.findFirst({
    where: { name: '0.5L PET', type: 'FINISHED_GOOD', archivedAt: null },
    include: { recipeFinishedGoods: { include: { rawMaterial: true } } }
  });
  assert.ok(fg05, '0.5L PET finished good must exist in database');
  assert.equal(fg05.packSize, 12, '0.5L PET packSize must be 12 (Base unit law)');

  const emptyBottleRM = fg05.recipeFinishedGoods.find(r => r.rawMaterial.name.includes('Empty Bottles'))?.rawMaterial;
  const capRM = fg05.recipeFinishedGoods.find(r => r.rawMaterial.unit === 'cap')?.rawMaterial;
  const shrinkFilmRM = fg05.recipeFinishedGoods.find(r => r.rawMaterial.name.includes('Shrink Wrap'))?.rawMaterial;

  assert.ok(emptyBottleRM, 'Empty bottle raw material must exist in BOM');
  assert.ok(capRM, 'Cap raw material must exist in BOM');
  assert.ok(shrinkFilmRM, 'Shrink film raw material must exist in BOM');

  // Baseline stock snapshots
  const initFG = await prisma.aquasphereItem.findUnique({ where: { id: fg05.id } });
  const initBtl = await prisma.aquasphereItem.findUnique({ where: { id: emptyBottleRM.id } });
  const initCap = await prisma.aquasphereItem.findUnique({ where: { id: capRM.id } });
  const initFilm = await prisma.aquasphereItem.findUnique({ where: { id: shrinkFilmRM.id } });

  const packsToProduce = 5;
  const expectedBottlesAdded = packsToProduce * 12; // 60 bottles base units
  const brokenBottlesScrap = 4; // 4 bottles broken during run

  // Expected deductions:
  // Bottles & Caps used = (5 packs * 12) + 4 scrap = 64
  // Film used = 5 packs * 0.02273 = 0.11365 kg (shrink film is spared on broken bottles!)
  const expectedBtlDeduction = expectedBottlesAdded + brokenBottlesScrap;
  const expectedCapDeduction = expectedBottlesAdded + brokenBottlesScrap;
  const expectedFilmDeduction = parseFloat((packsToProduce * 0.02273).toFixed(5));

  let batchId = null;

  try {
    // -----------------------------------------------------------------
    // Stage 1: Create Production Batch (IN_PROGRESS)
    // -----------------------------------------------------------------
    const createReq = {
      body: {
        items: [{ outputItemId: fg05.id, quantity: packsToProduce }],
        batchDate: new Date(),
        notes: 'Integration Test Batch 0.5L PET'
      },
      user: { id: 'test-plant-mgr', role: 'OWNER', name: 'Plant Manager' },
      headers: { 'x-tenant-id': prefix }
    };

    const createRes = await invokeHandler(createProductionBatch, createReq);
    assert.equal(createRes.getStatusCode(), 201);

    const batchData = createRes.getData();
    assert.ok(batchData.id, 'Batch ID must be generated');
    batchId = batchData.id;
    tracker.trackBatch(batchId);
    assert.equal(batchData.status, 'PENDING');

    // -----------------------------------------------------------------
    // Stage 2: Complete Production Batch with Good Yield + 4 Broken Scrap
    // -----------------------------------------------------------------
    const completeReq = {
      params: { id: batchId },
      body: {
        itemBreakages: { [fg05.id]: brokenBottlesScrap },
        wasteQuantity: brokenBottlesScrap
      },
      user: { id: 'test-operator-id', role: 'OWNER', name: 'Shift Operator' },
      headers: { 'x-tenant-id': prefix }
    };

    const completeRes = await invokeHandler(completeProductionBatch, completeReq);
    assert.equal(completeRes.getStatusCode(), 200);

    // Cross-Page Check: Production Page (/production)
    const viewBatchRes = await invokeHandler(getProductionBatchById, {
      params: { id: batchId },
      headers: { 'x-tenant-id': prefix }
    });
    assert.equal(viewBatchRes.getStatusCode(), 200);
    const completedBatch = viewBatchRes.getData();
    assert.equal(completedBatch.status, 'COMPLETED');
    assert.equal(completedBatch.wasteQuantity, brokenBottlesScrap);

    // Cross-Page Check: Inventory Page (/inventory) - Finished Good Inflow
    const postFG = await prisma.aquasphereItem.findUnique({ where: { id: fg05.id } });
    assert.equal(
      Number(postFG.cachedQty),
      Number(initFG.cachedQty) + expectedBottlesAdded,
      '0.5L PET cachedQty increases by exact physical base bottles (5 packs * 12 = 60 bottles)'
    );
    assert.equal(
      Number(postFG.factoryQty),
      Number(initFG.factoryQty) + expectedBottlesAdded,
      '0.5L PET factoryQty increases by exact physical base bottles'
    );

    // Cross-Page Check: Inventory Page (/inventory) - Raw Material Deductions
    const postBtl = await prisma.aquasphereItem.findUnique({ where: { id: emptyBottleRM.id } });
    const postCap = await prisma.aquasphereItem.findUnique({ where: { id: capRM.id } });
    const postFilm = await prisma.aquasphereItem.findUnique({ where: { id: shrinkFilmRM.id } });

    assert.equal(
      Number(postBtl.cachedQty),
      Number(initBtl.cachedQty) - expectedBtlDeduction,
      'Empty bottles deducted by yield + scrap (64 bottles)'
    );
    assert.equal(
      Number(postCap.cachedQty),
      Number(initCap.cachedQty) - expectedCapDeduction,
      'Caps deducted by yield + scrap (64 caps)'
    );
    assert.ok(
      Math.abs(Number(postFilm.cachedQty) - (Number(initFilm.cachedQty) - expectedFilmDeduction)) < 0.001,
      'Shrink wrap film deducted ONLY for good packs (spared on scrap bottles)'
    );

    // Invariant Check: Inventory Transactions logged
    const fgTx = await prisma.aquasphereInventoryTransaction.findFirst({
      where: { refType: 'BATCH', refId: batchId, itemId: fg05.id, direction: 'IN' }
    });
    assert.ok(fgTx, 'FG inventory transaction logged');
    assert.equal(Number(fgTx.quantity), expectedBottlesAdded);

    const btlTx = await prisma.aquasphereInventoryTransaction.findFirst({
      where: { refType: 'BATCH', refId: batchId, itemId: emptyBottleRM.id, direction: 'OUT' }
    });
    assert.ok(btlTx, 'Bottle deduction transaction logged');
    assert.equal(Number(btlTx.quantity), expectedBtlDeduction);

    console.log(`\n  [Production Suite Passed] Batch #${batchId.slice(0, 8)} Produced 5 packs (${expectedBottlesAdded} bottles) • Consumed: ${expectedBtlDeduction} bottles/caps, ${expectedFilmDeduction}kg film (Film spared on scrap)\n`);
  } catch (err) {
    console.error('\n🔴 Production Suite Failed:', err);
    throw err;
  } finally {
    // Restore pristine inventory stocks for finished good and raw materials
    if (batchId) {
      await prisma.aquasphereItem.update({
        where: { id: fg05.id },
        data: {
          cachedQty: { decrement: expectedBottlesAdded },
          factoryQty: { decrement: expectedBottlesAdded }
        }
      }).catch(() => {});

      await prisma.aquasphereItem.update({
        where: { id: emptyBottleRM.id },
        data: {
          cachedQty: { increment: expectedBtlDeduction },
          factoryQty: { increment: expectedBtlDeduction }
        }
      }).catch(() => {});

      await prisma.aquasphereItem.update({
        where: { id: capRM.id },
        data: {
          cachedQty: { increment: expectedCapDeduction },
          factoryQty: { increment: expectedCapDeduction }
        }
      }).catch(() => {});

      await prisma.aquasphereItem.update({
        where: { id: shrinkFilmRM.id },
        data: {
          cachedQty: { increment: expectedFilmDeduction },
          factoryQty: { increment: expectedFilmDeduction }
        }
      }).catch(() => {});
    }

    await tracker.cleanup();
    await prisma.$disconnect();
    setTimeout(() => process.exit(0), 500).unref();
  }
});
