/**
 * Production BOM Seed — AquaSphere & Wadaana
 * ============================================================================
 * Safe, idempotent seed script with dry-run mode.
 * 
 * Reconciled from:
 *   - Notebook specifications (23/07 pass)
 *   - Precise mineral dosing: 15,141 Litres / set (Ca: 2kg, Mg: 1kg, Na: 0.5kg)
 *   - Worker-friendly short names
 *   - 19L bottle ledger preservation (Empty 19L, Big 19L Cap)
 * 
 * Usage:
 *   DRY RUN:
 *     node scripts/seed-production-bom.js --dry-run
 * 
 *   WIPE TEST ACTIVITY & LIVE SEED:
 *     node scripts/seed-production-bom.js --wipe
 * 
 *   LIVE SEED (Safe update):
 *     node scripts/seed-production-bom.js
 */

import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { prisma, closeDatabaseConnections } from '../src/config/db.js';

const isDryRun = process.argv.includes('--dry-run');
const shouldWipe = process.argv.includes('--wipe');

// ============================================================================
// 1. WADAANA DEFINITIONS
// ============================================================================

const WADAANA_RAW_MATERIALS = [
  { name: 'Preform 0.5 Pure', aliases: ['Pure Preform (0.5L - 15g)'], unit: 'kg', reorderLevel: 100 },
  { name: 'Preform 1.5 Pure', aliases: ['Pure Preform (1.5L - 30g)'], unit: 'kg', reorderLevel: 100 },
  { name: 'Preform 0.5 Mix', aliases: ['Mix Preform (0.5L - 13g)'], unit: 'kg', reorderLevel: 100 },
  { name: 'Preform 1.5 Mix', aliases: ['Mix Preform (1.5L - 27g)'], unit: 'kg', reorderLevel: 100 },
];

const WADAANA_FINISHED_GOODS = [
  {
    name: 'Bottle 0.5 Pure',
    aliases: ['0.5L Pure Preform Bottle (15g)', '0.5L Pure Blown Bottle (15g)'],
    unit: 'pcs',
    reorderLevel: 1250,
    retailPrice: 15,
    recipe: [{ rmName: 'Preform 0.5 Pure', qty: 0.015 }],
  },
  {
    name: 'Bottle 1.5 Pure',
    aliases: ['1.5L Pure Preform Bottle (30g)', '1.5L Pure Blown Bottle (30g)'],
    unit: 'pcs',
    reorderLevel: 1250,
    retailPrice: 30,
    recipe: [{ rmName: 'Preform 1.5 Pure', qty: 0.030 }],
  },
  {
    name: 'Bottle 0.5 Mix',
    aliases: ['0.5L Mix Preform Bottle (13g)', '0.5L Mix Blown Bottle (13g)'],
    unit: 'pcs',
    reorderLevel: 1250,
    retailPrice: 13,
    recipe: [{ rmName: 'Preform 0.5 Mix', qty: 0.013 }],
  },
  {
    name: 'Bottle 1.5 Mix',
    aliases: ['1.5L Mix Preform Bottle (27g)', '1.5L Mix Blown Bottle (27g)'],
    unit: 'pcs',
    reorderLevel: 1250,
    retailPrice: 27,
    recipe: [{ rmName: 'Preform 1.5 Mix', qty: 0.027 }],
  },
];

// ============================================================================
// 2. AQUASPHERE DEFINITIONS
// ============================================================================

const AQUASPHERE_RAW_MATERIALS = [
  { name: 'Raw Water', aliases: ['Water'], unit: 'Litres', reorderLevel: 0 },
  { name: 'Bottle 0.5 Pure', aliases: ['PET Bottles (500ml)', 'Empty Blown Bottles (0.5L Pure)'], unit: 'pcs', reorderLevel: 6000 },
  { name: 'Bottle 1.5 Pure', aliases: ['PET Bottles (1500ml)', 'Empty Blown Bottles (1.5L Pure)'], unit: 'pcs', reorderLevel: 6000 },
  { name: 'Bottle 0.5 Mix', aliases: ['Empty Blown Bottles (0.5L Mix)'], unit: 'pcs', reorderLevel: 6000 },
  { name: 'Bottle 1.5 Mix', aliases: ['Empty Blown Bottles (1.5L Mix)'], unit: 'pcs', reorderLevel: 6000 },
  { name: 'Empty 19L Bottles', aliases: ['Empty 19L', 'Empty 19L Bottle'], unit: 'pcs', reorderLevel: 50 },
  { name: 'Small Caps', aliases: ['Cap Small', 'Small Cap'], unit: 'pcs', reorderLevel: 6000 },
  { name: 'Big 19L Caps', aliases: ['Large Caps', 'Big Caps', '19L Caps'], unit: 'pcs', reorderLevel: 500 },
  { name: 'Labels 0.5L', aliases: ['Labels (500ml)', 'Label 0.5', 'Labels (0.5L)'], unit: 'kg', reorderLevel: 10 },
  { name: 'Labels 1.5L', aliases: ['Labels (1500ml)', 'Label 1.5', 'Labels (1.5L)'], unit: 'kg', reorderLevel: 15 },
  { name: 'Shrink Wrap', aliases: ['Wrap'], unit: 'kg', reorderLevel: 10 },
  { name: 'Calcium', aliases: ['Ca'], unit: 'kg', reorderLevel: 10 },
  { name: 'Magnesium', aliases: ['Mg'], unit: 'kg', reorderLevel: 5 },
  { name: 'Sodium', aliases: ['Na'], unit: 'kg', reorderLevel: 3 },
];

// Recipe components
const PURE_05_BASE = [
  { rmName: 'Raw Water', qty: 9 },
  { rmName: 'Bottle 0.5 Pure', qty: 12 },
  { rmName: 'Small Caps', qty: 12 },
  { rmName: 'Labels 0.5L', qty: 0.00672 },
  { rmName: 'Shrink Wrap', qty: 0.02273 },
];

const PURE_15_BASE = [
  { rmName: 'Raw Water', qty: 12 },
  { rmName: 'Bottle 1.5 Pure', qty: 6 },
  { rmName: 'Small Caps', qty: 6 },
  { rmName: 'Labels 1.5L', qty: 0.00780 },
  { rmName: 'Shrink Wrap', qty: 0.02500 },
];

// Mineral Dosing: 15,141L tank (Ca: 2kg, Mg: 1kg, Na: 0.5kg)
const MINERALS_05 = [
  { rmName: 'Calcium', qty: 0.001189 },
  { rmName: 'Magnesium', qty: 0.000594 },
  { rmName: 'Sodium', qty: 0.000297 },
];

const MINERALS_15 = [
  { rmName: 'Calcium', qty: 0.001585 },
  { rmName: 'Magnesium', qty: 0.000793 },
  { rmName: 'Sodium', qty: 0.000396 },
];

const MIX_05_BASE = [
  { rmName: 'Raw Water', qty: 9 },
  { rmName: 'Bottle 0.5 Mix', qty: 12 },
  { rmName: 'Small Caps', qty: 12 },
  { rmName: 'Labels 0.5L', qty: 0.00672 },
  { rmName: 'Shrink Wrap', qty: 0.02273 },
  ...MINERALS_05,
];

const MIX_15_BASE = [
  { rmName: 'Raw Water', qty: 12 },
  { rmName: 'Bottle 1.5 Mix', qty: 6 },
  { rmName: 'Small Caps', qty: 6 },
  { rmName: 'Labels 1.5L', qty: 0.00780 },
  { rmName: 'Shrink Wrap', qty: 0.02500 },
  ...MINERALS_15,
];

const AQUASPHERE_FINISHED_GOODS = [
  // --- AquaSphere Brand (Pure Water) ---
  {
    name: 'AquaSphere 0.5L Pack',
    aliases: ['0.5L PET Pack (12 Bottles)', '0.5L Pack (12 Bottles)', 'AquaSphere 0.5L Pack (12 Bottles)'],
    unit: 'packs',
    reorderLevel: 200,
    retailPrice: 360,
    recipe: PURE_05_BASE,
  },
  {
    name: 'AquaSphere 1.5L Pack',
    aliases: ['1.5L PET Pack (6 Bottles)', '1.5L Pack (6 Bottles)', 'AquaSphere 1.5L Pack (6 Bottles)'],
    unit: 'packs',
    reorderLevel: 1000,
    retailPrice: 300,
    recipe: PURE_15_BASE,
  },
  {
    name: '19L Refill Bottle',
    aliases: ['AquaSphere 19L Refill Bottle', '19L Refill'],
    unit: 'bottles',
    reorderLevel: 50,
    retailPrice: 200,
    recipe: [
      { rmName: 'Raw Water', qty: 24 },
      { rmName: 'Big 19L Caps', qty: 1 },
      { rmName: 'Empty 19L Bottles', qty: 1 },
    ],
  },

  // --- Dasani Brand (Pure + Mix) ---
  {
    name: 'Dasani 0.5L Pack',
    aliases: ['Dasani 0.5L Pack (12 Bottles)'],
    unit: 'packs',
    reorderLevel: 200,
    retailPrice: 360,
    recipe: MIX_05_BASE,
  },
  {
    name: 'Dasani 1.5L Pack',
    aliases: ['Dasani 1.5L Pack (6 Bottles)'],
    unit: 'packs',
    reorderLevel: 1000,
    retailPrice: 300,
    recipe: MIX_15_BASE,
  },

  // --- Pivirifine Brand (Pure + Mix) ---
  {
    name: 'Pivirifine 0.5L Pack',
    aliases: ['Pivirifine', 'Pivirifine 0.5L Pack (12 Bottles)'],
    unit: 'packs',
    reorderLevel: 200,
    retailPrice: 250,
    recipe: MIX_05_BASE,
  },
  {
    name: 'Pivirifine 1.5L Pack',
    aliases: ['Pivirifine 1.5L Pack (6 Bottles)'],
    unit: 'packs',
    reorderLevel: 1000,
    retailPrice: 300,
    recipe: MIX_15_BASE,
  },
];

// ============================================================================
// WIPE OLD TEST DATA (Optional via --wipe)
// ============================================================================
async function wipeOldTestData() {
  console.log(`\n🧹 Wiping old test data, recipes, and transactions...`);
  if (isDryRun) {
    console.log('   [DryRun] Would wipe recipe items, production batches, consumptions, and inventory txns.');
    return;
  }

  // Delete Recipes first
  await prisma.aquasphereRecipeItem.deleteMany();
  await prisma.wadaanaRecipeItem.deleteMany();
  console.log('  ✓ Deleted all old recipe items');

  // Delete Production Batch Consumptions and Batches
  await prisma.aquasphereProductionBatchConsumption.deleteMany();
  await prisma.wadaanaProductionBatchConsumption.deleteMany();
  await prisma.aquasphereProductionBatch.deleteMany();
  await prisma.wadaanaProductionBatch.deleteMany();
  console.log('  ✓ Deleted all old production batches and consumptions');

  // Delete Order items, Deliveries, Payments and Orders
  await prisma.aquasphereDelivery.deleteMany();
  await prisma.wadaanaDelivery.deleteMany();
  await prisma.aquaspherePayment.deleteMany();
  await prisma.wadaanaPayment.deleteMany();
  await prisma.aquasphereOrderItem.deleteMany();
  await prisma.wadaanaOrderItem.deleteMany();
  await prisma.aquasphereOrder.deleteMany();
  await prisma.wadaanaOrder.deleteMany();
  console.log('  ✓ Deleted all old test orders, deliveries, and payments');

  // Delete Bottle Transactions
  await prisma.aquasphereBottleTransaction.deleteMany();
  console.log('  ✓ Deleted test bottle transactions');

  // Delete Purchases
  await prisma.aquaspherePurchaseItem?.deleteMany().catch(() => {});
  await prisma.wadaanaPurchaseItem?.deleteMany().catch(() => {});
  await prisma.aquaspherePurchase.deleteMany();
  await prisma.wadaanaPurchase.deleteMany();
  console.log('  ✓ Deleted test purchases');

  // Delete Inventory Transactions
  await prisma.aquasphereInventoryTransaction.deleteMany();
  await prisma.wadaanaInventoryTransaction.deleteMany();
  console.log('  ✓ Deleted test inventory transactions');

  // Delete old Raw Materials and Finished Goods
  await prisma.aquasphereItem.deleteMany();
  await prisma.wadaanaItem.deleteMany();
  console.log('  ✓ Wiped all old items cleanly');

  // Reset Customer cachedBottleBalance and currentBalance
  await prisma.aquasphereCustomer.updateMany({
    data: { cachedBottleBalance: 0, currentBalance: 0 }
  });
  console.log('  ✓ Reset customer balances to 0');
}

// ============================================================================
// SEED ENGINE
// ============================================================================

async function syncItem(prefix, def, type) {
  const model = prisma[`${prefix}Item`];
  const candidates = [def.name, ...(def.aliases || [])];

  let item = null;
  for (const c of candidates) {
    item = await model.findFirst({
      where: { name: { equals: c, mode: 'insensitive' }, type, archivedAt: null }
    });
    if (item) break;
  }

  if (item) {
    if (item.name !== def.name || item.unit !== def.unit || Number(item.reorderLevel) !== def.reorderLevel) {
      console.log(`  ↺ [${prefix}] Updating "${item.name}" -> "${def.name}" (Unit: ${def.unit}, Reorder: ${def.reorderLevel})`);
      if (!isDryRun) {
        item = await model.update({
          where: { id: item.id },
          data: {
            name: def.name,
            unit: def.unit,
            reorderLevel: def.reorderLevel,
            archivedAt: null,
          }
        });
      }
    } else {
      console.log(`  ✓ [${prefix}] Reusing "${item.name}"`);
    }
  } else {
    console.log(`  + [${prefix}] Creating "${def.name}" (Type: ${type}, Unit: ${def.unit}, Reorder: ${def.reorderLevel})`);
    if (!isDryRun) {
      item = await model.create({
        data: {
          name: def.name,
          type,
          unit: def.unit,
          reorderLevel: def.reorderLevel,
          cachedQty: 0,
          factoryQty: 0,
          warehouseQty: 0,
        }
      });
    } else {
      item = { id: `simulated-${def.name}`, name: def.name, type, unit: def.unit, reorderLevel: def.reorderLevel };
    }
  }

  if (def.retailPrice !== undefined && Number(item.retailPrice || 0) <= 0) {
    console.log(`  $ [${prefix}] Setting default price for "${def.name}" -> Rs. ${def.retailPrice}`);
    if (!isDryRun) {
      item = await model.update({
        where: { id: item.id },
        data: { retailPrice: def.retailPrice }
      });
    }
  }

  return item;
}

async function syncTenant(prefix, rawDefs, fgDefs) {
  console.log(`\n========================================`);
  console.log(`🏢 Tenant: ${prefix.toUpperCase()}`);
  console.log(`========================================`);

  const rmMap = {};

  console.log('\n--- 1. Raw Materials ---');
  for (const rDef of rawDefs) {
    const item = await syncItem(prefix, rDef, 'RAW_MATERIAL');
    rmMap[rDef.name] = item;
  }

  console.log('\n--- 2. Finished Goods & Recipes ---');
  for (const fgDef of fgDefs) {
    const fgItem = await syncItem(prefix, fgDef, 'FINISHED_GOOD');

    console.log(`\n  Recipe for [${fgItem.name}]:`);
    if (!isDryRun) {
      await prisma[`${prefix}RecipeItem`].deleteMany({
        where: { finishedGoodId: fgItem.id }
      });
    }

    for (const rLine of fgDef.recipe) {
      const rmItem = rmMap[rLine.rmName];
      if (!rmItem) {
        console.warn(`    ⚠️ Missing raw material: "${rLine.rmName}" for "${fgItem.name}"`);
        continue;
      }

      console.log(`    -> ${rLine.qty} ${rmItem.unit} of ${rmItem.name}`);
      if (!isDryRun) {
        await prisma[`${prefix}RecipeItem`].create({
          data: {
            finishedGoodId: fgItem.id,
            rawMaterialId: rmItem.id,
            quantityPerUnit: rLine.qty
          }
        });
      }
    }
  }
}

async function main() {
  console.log(`\n🚀 STARTING PRODUCTION BOM SEED (DryRun: ${isDryRun}, Wipe: ${shouldWipe})\n`);

  if (shouldWipe) {
    await wipeOldTestData();
  }

  await syncTenant('wadaana', WADAANA_RAW_MATERIALS, WADAANA_FINISHED_GOODS);
  await syncTenant('aquasphere', AQUASPHERE_RAW_MATERIALS, AQUASPHERE_FINISHED_GOODS);

  // Add Bulk Water (Per Litre)
  if (!isDryRun) {
    const bulk = await prisma.aquasphereItem.findFirst({
      where: { name: { contains: 'Bulk Water', mode: 'insensitive' } }
    });
    if (!bulk) {
      await prisma.aquasphereItem.create({
        data: {
          name: 'Bulk Water (Per Litre)',
          type: 'FINISHED_GOOD',
          unit: 'Litres',
          retailPrice: 10,
          cachedQty: 0,
          factoryQty: 0,
          warehouseQty: 0,
          reorderLevel: 1000
        }
      });
      console.log('  ✓ Created "Bulk Water (Per Litre)"');
    }
  }

  if (isDryRun) {
    console.log('\n💡 DRY RUN FINISHED: No changes were made to the database.');
    console.log('   Run with --wipe to wipe old test data and seed fresh.');
  } else {
    console.log('\n✅ SEED COMPLETED SUCCESSFULLY!');
  }
}

main()
  .catch((err) => {
    console.error('❌ Seed Failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await closeDatabaseConnections();
  });
