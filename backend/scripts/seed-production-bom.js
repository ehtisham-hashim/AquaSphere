/**
 * Production BOM Seed — AquaSphere & Wadaana
 * ============================================================================
 * Safe, idempotent seed script with dry-run mode and clean wipe.
 * 
 * Base Unit Architecture:
 *   - Stored in physical base units: 'bottle', 'cap', 'kg'
 *   - Display / trading multiplier: packSize (12 for 0.5L, 6 for 1.5L, 1 for 19L)
 *   - Clean, bare names for AquaSphere: '0.5L PET', '1.5L PET', '19L Refill'
 *   - Precise mineral dosing: 15,141 Litres / set (Ca: 2kg, Mg: 1kg, Na: 0.5kg)
 *   - Raw materials tracked in single quantity at Factory
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
  { name: 'Pure Preform 0.5L (Blue)', aliases: ['Preform 0.5 Pure', 'Pure Preform (0.5L - 15g)'], unit: 'kg', packSize: 1, reorderLevel: 100 },
  { name: 'Pure Preform 1.5L (Blue)', aliases: ['Preform 1.5 Pure', 'Pure Preform (1.5L - 30g)'], unit: 'kg', packSize: 1, reorderLevel: 100 },
  { name: 'Mix Preform 0.5L (Blue)', aliases: ['Preform 0.5 Mix', 'Mix Preform (0.5L - 13g)'], unit: 'kg', packSize: 1, reorderLevel: 100 },
  { name: 'Mix Preform 1.5L (Blue)', aliases: ['Preform 1.5 Mix', 'Mix Preform (1.5L - 27g)'], unit: 'kg', packSize: 1, reorderLevel: 100 },
  { name: 'Pure Preform 0.5L (White)', aliases: ['Pure Preform 0.5L White'], unit: 'kg', packSize: 1, reorderLevel: 100 },
  { name: 'Pure Preform 1.5L (White)', aliases: ['Pure Preform 1.5L White'], unit: 'kg', packSize: 1, reorderLevel: 100 },
];

const WADAANA_FINISHED_GOODS = [
  {
    name: 'AquaSphere 0.5L Bottle',
    aliases: ['Bottle 0.5 Pure', '0.5L Pure Preform Bottle (15g)', '0.5L Pure Blown Bottle (15g)'],
    unit: 'bottle',
    packSize: 1,
    reorderLevel: 1250,
    retailPrice: 15,
    recipe: [{ rmName: 'Pure Preform 0.5L (Blue)', qty: 0.015 }],
  },
  {
    name: 'AquaSphere 1.5L Bottle',
    aliases: ['Bottle 1.5 Pure', '1.5L Pure Preform Bottle (30g)', '1.5L Pure Blown Bottle (30g)'],
    unit: 'bottle',
    packSize: 1,
    reorderLevel: 1250,
    retailPrice: 30,
    recipe: [{ rmName: 'Pure Preform 1.5L (Blue)', qty: 0.030 }],
  },
  {
    name: 'Dasani 0.5L Bottle',
    aliases: ['Bottle 0.5 Mix', '0.5L Mix Preform Bottle (13g)', '0.5L Mix Blown Bottle (13g)'],
    unit: 'bottle',
    packSize: 1,
    reorderLevel: 1250,
    retailPrice: 13,
    recipe: [{ rmName: 'Mix Preform 0.5L (Blue)', qty: 0.013 }],
  },
  {
    name: 'Dasani 1.5L Bottle',
    aliases: ['Bottle 1.5 Mix', '1.5L Mix Preform Bottle (27g)', '1.5L Mix Blown Bottle (27g)'],
    unit: 'bottle',
    packSize: 1,
    reorderLevel: 1250,
    retailPrice: 27,
    recipe: [{ rmName: 'Mix Preform 1.5L (Blue)', qty: 0.027 }],
  },
  {
    name: 'Pivrifine 0.5L Bottle',
    aliases: ['Pivrifine 0.5L', 'Pivirifine 0.5L Bottle'],
    unit: 'bottle',
    packSize: 1,
    reorderLevel: 1250,
    retailPrice: 15,
    recipe: [{ rmName: 'Pure Preform 0.5L (White)', qty: 0.015 }],
  },
  {
    name: 'Pivrifine 1.5L Bottle',
    aliases: ['Pivrifine 1.5L', 'Pivirifine 1.5L Bottle'],
    unit: 'bottle',
    packSize: 1,
    reorderLevel: 1250,
    retailPrice: 30,
    recipe: [{ rmName: 'Pure Preform 1.5L (White)', qty: 0.030 }],
  },
];

// ============================================================================
// 2. AQUASPHERE DEFINITIONS
// ============================================================================

const AQUASPHERE_RAW_MATERIALS = [
  { name: '0.5L Empty Bottles', aliases: ['Bottle 0.5 Pure', 'Empty 0.5L Bottles', 'Empty 0.5L Pure Bottles'], unit: 'bottle', packSize: 1, reorderLevel: 6000 },
  { name: '1.5L Empty Bottles', aliases: ['Bottle 1.5 Pure', 'Empty 1.5L Bottles', 'Empty 1.5L Pure Bottles'], unit: 'bottle', packSize: 1, reorderLevel: 6000 },
  { name: 'Empty 19L Bottles', aliases: ['Empty 19L', 'Empty 19L Bottle'], unit: 'bottle', packSize: 1, reorderLevel: 50 },
  { name: 'Small Caps', aliases: ['Cap Small', 'Small Cap'], unit: 'cap', packSize: 1, reorderLevel: 6000 },
  { name: 'Big 19L Caps', aliases: ['Large Caps', 'Big Caps', '19L Caps'], unit: 'cap', packSize: 1, reorderLevel: 500 },
  { name: '0.5L Labels', aliases: ['Labels 0.5L', 'Labels (500ml)', 'Label 0.5'], unit: 'kg', packSize: 1, reorderLevel: 10 },
  { name: '1.5L Labels', aliases: ['Labels 1.5L', 'Labels (1500ml)', 'Label 1.5'], unit: 'kg', packSize: 1, reorderLevel: 15 },
  { name: 'Shrink Wrap Film', aliases: ['Shrink Wrap', 'Wrap'], unit: 'kg', packSize: 1, reorderLevel: 10 },
  { name: 'Calcium', aliases: ['Ca'], unit: 'kg', packSize: 1, reorderLevel: 10 },
  { name: 'Magnesium', aliases: ['Mg'], unit: 'kg', packSize: 1, reorderLevel: 5 },
  { name: 'Sodium', aliases: ['Na'], unit: 'kg', packSize: 1, reorderLevel: 3 },
];

// Single bottle consumption (unit = bottle)
const AQUASPHERE_FINISHED_GOODS = [
  {
    name: '0.5L PET',
    aliases: ['AquaSphere 0.5L Pack', '0.5L PET Pack', '0.5L Pack (12 Bottles)', 'AquaSphere 0.5L Pack (12 Bottles)'],
    unit: 'bottle',
    packSize: 12,
    reorderLevel: 2400, // 200 packs
    retailPrice: 360,
    recipe: [
      { rmName: '0.5L Empty Bottles', qty: 1 },
      { rmName: 'Small Caps', qty: 1 },
      { rmName: '0.5L Labels', qty: 0.00056 }, // 0.56g per bottle
      { rmName: 'Shrink Wrap Film', qty: 0.001894 }, // 0.02273 kg / 12
      { rmName: 'Calcium', qty: 0.00009907 }, // (9L / 12) * 2 / 15141
      { rmName: 'Magnesium', qty: 0.00004953 }, // (9L / 12) * 1 / 15141
      { rmName: 'Sodium', qty: 0.00002477 }, // (9L / 12) * 0.5 / 15141
    ],
  },
  {
    name: '1.5L PET',
    aliases: ['AquaSphere 1.5L Pack', '1.5L PET Pack', '1.5L Pack (6 Bottles)', 'AquaSphere 1.5L Pack (6 Bottles)'],
    unit: 'bottle',
    packSize: 6,
    reorderLevel: 6000, // 1000 packs
    retailPrice: 300,
    recipe: [
      { rmName: '1.5L Empty Bottles', qty: 1 },
      { rmName: 'Small Caps', qty: 1 },
      { rmName: '1.5L Labels', qty: 0.00130 }, // 1.30g per bottle
      { rmName: 'Shrink Wrap Film', qty: 0.004167 }, // 0.025 kg / 6
      { rmName: 'Calcium', qty: 0.00026418 }, // (12L / 6) * 2 / 15141
      { rmName: 'Magnesium', qty: 0.00013209 }, // (12L / 6) * 1 / 15141
      { rmName: 'Sodium', qty: 0.00006605 }, // (12L / 6) * 0.5 / 15141
    ],
  },
  {
    name: '19L Refill',
    aliases: ['19L Refill Bottle', 'AquaSphere 19L Refill Bottle'],
    unit: 'bottle',
    packSize: 1,
    reorderLevel: 50,
    retailPrice: 200,
    recipe: [
      { rmName: 'Empty 19L Bottles', qty: 1 },
      { rmName: 'Big 19L Caps', qty: 1 },
      { rmName: 'Calcium', qty: 0.003170 }, // 24L * 2 / 15141
      { rmName: 'Magnesium', qty: 0.001585 }, // 24L * 1 / 15141
      { rmName: 'Sodium', qty: 0.000793 }, // 24L * 0.5 / 15141
    ],
  },
];

// ============================================================================
// WIPE ALL TRANSACTIONAL & MASTER DATA (Preserves Users)
// ============================================================================
async function wipeOldTestData() {
  console.log(`\n🧹 Performing comprehensive wipe (preserves strictly user accounts)...`);
  if (isDryRun) {
    console.log('   [DryRun] Would wipe all transactions, ledgers, items, and customers.');
    return;
  }

  // 1. Counter Sales & Items
  await prisma.aquasphereSpotSaleItem.deleteMany().catch(() => {});
  await prisma.wadaanaSpotSaleItem.deleteMany().catch(() => {});
  await prisma.aquasphereSpotSale.deleteMany().catch(() => {});
  await prisma.wadaanaSpotSale.deleteMany().catch(() => {});
  console.log('  ✓ Deleted spot sales and items');

  // 2. Counter Audit Ledgers
  await prisma.aquasphereCounterAuditLedger.deleteMany().catch(() => {});
  await prisma.wadaanaCounterAuditLedger.deleteMany().catch(() => {});
  console.log('  ✓ Deleted counter audit ledgers');

  // 3. Recipes
  await prisma.aquasphereRecipeItem.deleteMany().catch(() => {});
  await prisma.wadaanaRecipeItem.deleteMany().catch(() => {});
  console.log('  ✓ Deleted recipe items');

  // 4. Production Batches & Consumptions
  await prisma.aquasphereProductionBatchConsumption.deleteMany().catch(() => {});
  await prisma.wadaanaProductionBatchConsumption.deleteMany().catch(() => {});
  await prisma.aquasphereProductionBatch.deleteMany().catch(() => {});
  await prisma.wadaanaProductionBatch.deleteMany().catch(() => {});
  console.log('  ✓ Deleted production batches and consumptions');

  // 5. Orders, Items, Deliveries, Payments
  await prisma.aquasphereDelivery.deleteMany().catch(() => {});
  await prisma.wadaanaDelivery.deleteMany().catch(() => {});
  await prisma.aquaspherePayment.deleteMany().catch(() => {});
  await prisma.wadaanaPayment.deleteMany().catch(() => {});
  await prisma.aquasphereOrderItem.deleteMany().catch(() => {});
  await prisma.wadaanaOrderItem.deleteMany().catch(() => {});
  await prisma.aquasphereOrder.deleteMany().catch(() => {});
  await prisma.wadaanaOrder.deleteMany().catch(() => {});
  console.log('  ✓ Deleted orders, deliveries, and payments');

  // 6. Bottle Transactions
  await prisma.aquasphereBottleTransaction.deleteMany().catch(() => {});
  await prisma.wadaanaBottleTransaction.deleteMany().catch(() => {});
  console.log('  ✓ Deleted bottle transactions');

  // 7. Vendor Payments, Ledgers, Purchases
  await prisma.aquasphereVendorPayment.deleteMany().catch(() => {});
  await prisma.wadaanaVendorPayment.deleteMany().catch(() => {});
  await prisma.aquasphereVendorLedgerEntry.deleteMany().catch(() => {});
  await prisma.wadaanaVendorLedgerEntry.deleteMany().catch(() => {});
  await prisma.aquaspherePurchaseItem.deleteMany().catch(() => {});
  await prisma.wadaanaPurchaseItem.deleteMany().catch(() => {});
  await prisma.aquaspherePurchase.deleteMany().catch(() => {});
  await prisma.wadaanaPurchase.deleteMany().catch(() => {});
  console.log('  ✓ Deleted purchases and vendor ledgers');

  // 8. Inventory Transactions
  await prisma.aquasphereInventoryTransaction.deleteMany().catch(() => {});
  await prisma.wadaanaInventoryTransaction.deleteMany().catch(() => {});
  console.log('  ✓ Deleted inventory transactions');

  // 9. Expenses & Transport
  await prisma.aquasphereTransportExpense.deleteMany().catch(() => {});
  await prisma.wadaanaTransportExpense.deleteMany().catch(() => {});
  await prisma.aquasphereExpense.deleteMany().catch(() => {});
  await prisma.wadaanaExpense.deleteMany().catch(() => {});
  await prisma.aquasphereVehicle.deleteMany().catch(() => {});
  await prisma.wadaanaVehicle.deleteMany().catch(() => {});
  console.log('  ✓ Deleted expenses and vehicles');

  // 10. Vendors
  await prisma.aquasphereVendor.deleteMany().catch(() => {});
  await prisma.wadaanaVendor.deleteMany().catch(() => {});
  console.log('  ✓ Deleted vendors');

  // 11. Daily Closes & Audit Logs
  await prisma.aquasphereDailyClose.deleteMany().catch(() => {});
  await prisma.wadaanaDailyClose.deleteMany().catch(() => {});
  await prisma.aquasphereAuditLog.deleteMany().catch(() => {});
  await prisma.wadaanaAuditLog.deleteMany().catch(() => {});
  console.log('  ✓ Deleted daily closes and audit logs');

  // 12. Customers
  await prisma.aquasphereCustomer.deleteMany().catch(() => {});
  await prisma.wadaanaCustomer.deleteMany().catch(() => {});
  console.log('  ✓ Deleted customers');

  // 13. Items
  await prisma.aquasphereItem.deleteMany().catch(() => {});
  await prisma.wadaanaItem.deleteMany().catch(() => {});
  console.log('  ✓ Deleted master items');

  console.log('  🎉 All transactional and entity data wiped. Users preserved 100%.');
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

  const targetPackSize = def.packSize || 1;

  if (item) {
    if (
      item.name !== def.name ||
      item.unit !== def.unit ||
      Number(item.reorderLevel) !== def.reorderLevel ||
      item.packSize !== targetPackSize
    ) {
      console.log(`  ↺ [${prefix}] Updating "${item.name}" -> "${def.name}" (Unit: ${def.unit}, PackSize: ${targetPackSize}, Reorder: ${def.reorderLevel})`);
      if (!isDryRun) {
        item = await model.update({
          where: { id: item.id },
          data: {
            name: def.name,
            unit: def.unit,
            packSize: targetPackSize,
            reorderLevel: def.reorderLevel,
            archivedAt: null,
          }
        });
      }
    } else {
      console.log(`  ✓ [${prefix}] Reusing "${item.name}"`);
    }
  } else {
    console.log(`  + [${prefix}] Creating "${def.name}" (Type: ${type}, Unit: ${def.unit}, PackSize: ${targetPackSize}, Reorder: ${def.reorderLevel})`);
    if (!isDryRun) {
      item = await model.create({
        data: {
          name: def.name,
          type,
          unit: def.unit,
          packSize: targetPackSize,
          reorderLevel: def.reorderLevel,
          retailPrice: def.retailPrice || 0,
          cachedQty: 0,
          factoryQty: 0,
          warehouseQty: 0,
        }
      });
    } else {
      item = { id: `simulated-${def.name}`, name: def.name, type, unit: def.unit, packSize: targetPackSize, reorderLevel: def.reorderLevel };
    }
  }

  if (def.retailPrice !== undefined && Number(item.retailPrice || 0) !== def.retailPrice) {
    console.log(`  $ [${prefix}] Setting price for "${def.name}" -> Rs. ${def.retailPrice}`);
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
