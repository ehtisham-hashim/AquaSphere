import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { prisma } from '../src/config/db.js';

async function repairEmptyBottleStock() {
  console.log('🔧 Starting Returnable Empty Bottle Stock & Ledger Reconciliation...');

  // 1. Ensure columns exist idempotently
  await prisma.$executeRawUnsafe(`ALTER TABLE "aquasphere"."items" ADD COLUMN IF NOT EXISTS "is_returnable" BOOLEAN NOT NULL DEFAULT false;`).catch(() => {});
  await prisma.$executeRawUnsafe(`ALTER TABLE "wadaana"."items" ADD COLUMN IF NOT EXISTS "is_returnable" BOOLEAN NOT NULL DEFAULT false;`).catch(() => {});
  await prisma.$executeRawUnsafe(`ALTER TABLE "aquasphere"."bottle_transactions" ADD COLUMN IF NOT EXISTS "item_id" TEXT;`).catch(() => {});
  await prisma.$executeRawUnsafe(`ALTER TABLE "wadaana"."bottle_transactions" ADD COLUMN IF NOT EXISTS "item_id" TEXT;`).catch(() => {});

  // 2. Locate Empty 19L Bottles and 0.5L Empty Bottles in AquaSphere
  const bottle19L = await prisma.aquasphereItem.findFirst({
    where: {
      type: 'RAW_MATERIAL',
      AND: [
        { name: { contains: '19', mode: 'insensitive' } },
        { name: { contains: 'empty', mode: 'insensitive' } }
      ]
    }
  });

  const bottle05L = await prisma.aquasphereItem.findFirst({
    where: {
      type: 'RAW_MATERIAL',
      AND: [
        { name: { contains: '0.5', mode: 'insensitive' } },
        { name: { contains: 'empty', mode: 'insensitive' } }
      ]
    }
  });

  if (!bottle19L) {
    throw new Error('❌ Could not find "Empty 19L Bottles" raw material item in AquaSphere catalog!');
  }

  console.log(`✓ Located Empty 19L Bottles (ID: ${bottle19L.id}, current cachedQty: ${bottle19L.cachedQty})`);
  if (bottle05L) {
    console.log(`✓ Located 0.5L Empty Bottles (ID: ${bottle05L.id}, current cachedQty: ${bottle05L.cachedQty})`);
  }

  // 3. Mark Empty 19L Bottles as isReturnable = true
  await prisma.aquasphereItem.update({
    where: { id: bottle19L.id },
    data: { isReturnable: true }
  });
  console.log('✓ Marked Empty 19L Bottles as isReturnable = true');

  // Ensure non-19L empty PET items are isReturnable = false
  await prisma.aquasphereItem.updateMany({
    where: {
      type: 'RAW_MATERIAL',
      id: { not: bottle19L.id },
      name: { contains: 'empty', mode: 'insensitive' }
    },
    data: { isReturnable: false }
  });

  // 4. Backfill itemId on historical BottleTransactions where itemId is null
  const backfilledAqua = await prisma.aquasphereBottleTransaction.updateMany({
    where: { itemId: null },
    data: { itemId: bottle19L.id }
  });
  console.log(`✓ Backfilled itemId on ${backfilledAqua.count} historical AquaSphere BottleTransactions`);

  // 5. Transfer misattributed BOTTLE_RETRIEVAL inventory transactions from 0.5L back to 19L
  if (bottle05L) {
    const misattributedTxns = await prisma.aquasphereInventoryTransaction.findMany({
      where: {
        itemId: bottle05L.id,
        reason: 'BOTTLE_RETRIEVAL',
        direction: 'IN'
      }
    });

    const totalMisattributed = misattributedTxns.reduce((s, t) => s + Number(t.quantity || 0), 0);

    if (totalMisattributed > 0) {
      console.log(`🔄 Transferring ${totalMisattributed} misattributed returned bottles from "${bottle05L.name}" -> "${bottle19L.name}"...`);

      await prisma.$transaction([
        prisma.aquasphereItem.update({
          where: { id: bottle05L.id },
          data: {
            cachedQty: { decrement: totalMisattributed },
            factoryQty: { decrement: totalMisattributed }
          }
        }),
        prisma.aquasphereItem.update({
          where: { id: bottle19L.id },
          data: {
            cachedQty: { increment: totalMisattributed },
            factoryQty: { increment: totalMisattributed }
          }
        }),
        prisma.aquasphereInventoryTransaction.updateMany({
          where: { id: { in: misattributedTxns.map(t => t.id) } },
          data: { itemId: bottle19L.id }
        })
      ]);

      const [fresh05L, fresh19L] = await Promise.all([
        prisma.aquasphereItem.findUnique({ where: { id: bottle05L.id }, select: { cachedQty: true, factoryQty: true } }),
        prisma.aquasphereItem.findUnique({ where: { id: bottle19L.id }, select: { cachedQty: true, factoryQty: true } })
      ]);

      console.log(`✅ Successfully transferred ${totalMisattributed} bottles!`);
      console.log(`   - 0.5L Empty Bottles: cachedQty=${fresh05L.cachedQty}, factoryQty=${fresh05L.factoryQty}`);
      console.log(`   - Empty 19L Bottles: cachedQty=${fresh19L.cachedQty}, factoryQty=${fresh19L.factoryQty}`);
    } else {
      console.log('✓ No misattributed BOTTLE_RETRIEVAL transactions found on 0.5L Empty Bottles.');
    }
  }

  console.log('🎉 Reconciliation completed successfully!');
  await prisma.$disconnect();
}

repairEmptyBottleStock().catch(err => {
  console.error('❌ Error during reconciliation:', err);
  process.exit(1);
});
