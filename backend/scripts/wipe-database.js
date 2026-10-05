import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { prisma, closeDatabaseConnections } from '../src/config/db.js';

/**
 * Standalone Database Wipe Script
 * Usage:
 *   node scripts/wipe-database.js
 *   node scripts/wipe-database.js --keep-users
 */
async function wipeDatabase() {
  const keepUsers = process.argv.includes('--keep-users');
  console.log(`\n🧹 Starting Standalone Database Wipe (keepUsers: ${keepUsers})...\n`);

  const prefixes = ['aquasphere', 'wadaana'];

  for (const prefix of prefixes) {
    const label = prefix === 'aquasphere' ? 'AquaSphere' : 'Wadaana';
    console.log(`🗑️  Wiping ${label} tables...`);

    // 1. Counter Sales & Items
    await prisma[`${prefix}SpotSaleItem`]?.deleteMany().catch(() => {});
    await prisma[`${prefix}SpotSale`]?.deleteMany().catch(() => {});
    await prisma[`${prefix}CounterAuditLedger`]?.deleteMany().catch(() => {});

    // 2. Orders, Deliveries, Payments
    await prisma[`${prefix}Delivery`]?.deleteMany().catch(() => {});
    await prisma[`${prefix}Payment`]?.deleteMany().catch(() => {});
    await prisma[`${prefix}OrderItem`]?.deleteMany().catch(() => {});
    await prisma[`${prefix}Order`]?.deleteMany().catch(() => {});

    // 3. Bottles & Custody
    await prisma[`${prefix}BottleTransaction`]?.deleteMany().catch(() => {});

    // 4. Production & Recipes
    await prisma[`${prefix}ProductionBatchConsumption`]?.deleteMany().catch(() => {});
    await prisma[`${prefix}ProductionBatch`]?.deleteMany().catch(() => {});
    await prisma[`${prefix}RecipeItem`]?.deleteMany().catch(() => {});

    // 5. Purchases & Vendors
    await prisma[`${prefix}PurchaseItem`]?.deleteMany().catch(() => {});
    await prisma[`${prefix}VendorPayment`]?.deleteMany().catch(() => {});
    await prisma[`${prefix}VendorLedgerEntry`]?.deleteMany().catch(() => {});
    await prisma[`${prefix}Purchase`]?.deleteMany().catch(() => {});

    // 6. Inventory Transactions
    await prisma[`${prefix}InventoryTransaction`]?.deleteMany().catch(() => {});

    // 7. Transport & Expenses
    await prisma[`${prefix}TransportExpense`]?.deleteMany().catch(() => {});
    await prisma[`${prefix}Expense`]?.deleteMany().catch(() => {});
    await prisma[`${prefix}Vehicle`]?.deleteMany().catch(() => {});

    // 8. Daily Closes & Audit Logs
    await prisma[`${prefix}DailyClose`]?.deleteMany().catch(() => {});
    await prisma[`${prefix}AuditLog`]?.deleteMany().catch(() => {});

    // 9. Customers & Vendors
    await prisma[`${prefix}Customer`]?.deleteMany().catch(() => {});
    await prisma[`${prefix}Vendor`]?.deleteMany().catch(() => {});

    // 10. Master Items
    await prisma[`${prefix}Item`]?.deleteMany().catch(() => {});

    // 11. Users (unless --keep-users is specified)
    if (!keepUsers) {
      await prisma[`${prefix}User`]?.deleteMany().catch(() => {});
      console.log(`   ✓ ${label} users wiped`);
    }

    console.log(`   ✓ ${label} all tables cleared.`);
  }

  console.log('\n✅ Database wipe finished successfully!\n');
  await closeDatabaseConnections();
}

wipeDatabase().catch((err) => {
  console.error('❌ Wipe failed:', err);
  process.exit(1);
});
