/**
 * Inventory Reconciliation Script
 * 
 * This script reconciles inventory for ALL items by calling the reconciliation endpoint.
 * It ensures factoryQty and warehouseQty match the actual transaction history.
 * 
 * Run with: node scripts/reconcile-all-inventory.js
 */

import { prisma } from '../src/config/db.js';

const TENANT = process.env.TENANT || 'aquasphere'; // Change to 'wadaana' if needed
const prefix = TENANT === 'wadaana' ? 'wadaana' : 'aquasphere';

async function reconcileAllInventory() {
  console.log(`\n🔄 Starting Inventory Reconciliation for ${TENANT}...\n`);
  
  try {
    // Get all non-archived items
    const items = await prisma[`${prefix}Item`].findMany({
      where: { archivedAt: null },
      orderBy: { name: 'asc' }
    });

    console.log(`📦 Found ${items.length} items to reconcile\n`);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const item of items) {
      try {
        console.log(`⏳ Reconciling: ${item.name} (${item.type || 'N/A'})...`);

        // Fetch all inventory transactions for this item
        const transactions = await prisma[`${prefix}InventoryTransaction`].findMany({
          where: { itemId: item.id },
          orderBy: { createdAt: 'asc' }
        });

        // Calculate expected quantities
        let expectedCached = 0;
        let expectedFactory = 0;
        let expectedWarehouse = 0;

        for (const tx of transactions) {
          const qty = Number(tx.quantity || 0);
          const location = tx.location?.toUpperCase();
          
          if (tx.direction === 'IN') {
            expectedCached += qty;
            if (location === 'FACTORY') {
              expectedFactory += qty;
            } else if (location === 'WAREHOUSE') {
              expectedWarehouse += qty;
            } else {
              // Legacy transactions without location - default to factory
              expectedFactory += qty;
            }
          } else if (tx.direction === 'OUT') {
            expectedCached -= qty;
            if (location === 'FACTORY') {
              expectedFactory -= qty;
            } else if (location === 'WAREHOUSE') {
              expectedWarehouse -= qty;
            } else {
              // Legacy transactions without location - deduct from factory first
              expectedFactory -= qty;
            }
          }
        }

        // Current values
        const currentCached = Number(item.cachedQty || 0);
        const currentFactory = Number(item.factoryQty || 0);
        const currentWarehouse = Number(item.warehouseQty || 0);

        // Check if reconciliation is needed
        const needsUpdate = 
          currentCached !== expectedCached ||
          currentFactory !== expectedFactory ||
          currentWarehouse !== expectedWarehouse;

        if (needsUpdate) {
          // Update the item
          await prisma[`${prefix}Item`].update({
            where: { id: item.id },
            data: {
              cachedQty: expectedCached,
              factoryQty: expectedFactory,
              warehouseQty: expectedWarehouse
            }
          });

          // Create audit log
          await prisma[`${prefix}AuditLog`].create({
            data: {
              action: 'INVENTORY_RECONCILED',
              entityType: 'ITEM',
              entityId: item.id,
              performedBy: 'SYSTEM_RECONCILIATION_SCRIPT',
              details: JSON.stringify({
                itemName: item.name,
                before: {
                  cached: currentCached,
                  factory: currentFactory,
                  warehouse: currentWarehouse
                },
                after: {
                  cached: expectedCached,
                  factory: expectedFactory,
                  warehouse: expectedWarehouse
                },
                transactionCount: transactions.length
              })
            }
          });

          console.log(`   ✅ UPDATED - Cached: ${currentCached} → ${expectedCached}, Factory: ${currentFactory} → ${expectedFactory}, Warehouse: ${currentWarehouse} → ${expectedWarehouse}`);
          successCount++;
        } else {
          console.log(`   ✓ Already accurate - Cached: ${currentCached}, Factory: ${currentFactory}, Warehouse: ${currentWarehouse}`);
          successCount++;
        }
      } catch (err) {
        console.error(`   ❌ ERROR: ${err.message}`);
        errorCount++;
        errors.push({ item: item.name, error: err.message });
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ Reconciliation Complete!`);
    console.log(`   Success: ${successCount} items`);
    console.log(`   Errors: ${errorCount} items`);
    console.log(`${'='.repeat(60)}\n`);

    if (errors.length > 0) {
      console.log('❌ Errors encountered:');
      errors.forEach(e => console.log(`   - ${e.item}: ${e.error}`));
    }

  } catch (error) {
    console.error('\n❌ Fatal Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

reconcileAllInventory();
