import { prisma } from '../src/config/db.js';

async function seedWadaanaRawMaterials() {
  console.log('🌱 Seeding Wadaana Raw Materials (Preform Only)...');

  const preforms = [
    { name: 'Pure Preform (0.5L - 15g)', unit: 'kg', reorderLevel: 100, cachedQty: 350 },
    { name: 'Pure Preform (1.5L - 30g)', unit: 'kg', reorderLevel: 100, cachedQty: 400 },
    { name: 'Mix Preform (0.5L - 13g)', unit: 'kg', reorderLevel: 100, cachedQty: 250 },
    { name: 'Mix Preform (1.5L - 27g)', unit: 'kg', reorderLevel: 100, cachedQty: 200 }
  ];

  // 1. Ensure the 4 preform types exist
  const validIds = [];
  for (const item of preforms) {
    let existing = await prisma.wadaanaItem.findFirst({
      where: { name: item.name, type: 'RAW_MATERIAL' }
    });

    if (existing) {
      existing = await prisma.wadaanaItem.update({
        where: { id: existing.id },
        data: {
          unit: item.unit,
          reorderLevel: item.reorderLevel,
          archivedAt: null
        }
      });
      console.log(`✅ Verified preform material: ${item.name}`);
    } else {
      existing = await prisma.wadaanaItem.create({
        data: {
          name: item.name,
          type: 'RAW_MATERIAL',
          unit: item.unit,
          reorderLevel: item.reorderLevel,
          cachedQty: item.cachedQty
        }
      });
      console.log(`✨ Created preform material: ${item.name}`);
    }
    validIds.push(existing.id);
  }

  // 2. Query all items currently in Wadaana database
  const allItems = await prisma.wadaanaItem.findMany();
  console.log(`Current Wadaana Items total: ${allItems.length}`);
  allItems.forEach(i => console.log(` - [${i.type}] ${i.name} (Archived: ${!!i.archivedAt})`));

  // 3. Delete ANY item that is marked as RAW_MATERIAL but is not one of our 4 preform types
  const toDelete = allItems.filter(i => i.type === 'RAW_MATERIAL' && !validIds.includes(i.id));

  if (toDelete.length > 0) {
    console.log(`🧹 Deleting ${toDelete.length} unwanted non-preform raw materials from Wadaana...`);
    for (const om of toDelete) {
      try {
        await prisma.wadaanaItem.delete({
          where: { id: om.id }
        });
        console.log(`🗑️ Deleted: ${om.name}`);
      } catch (err) {
        // If deletion fails due to foreign key constraints, archive and purge quantity
        console.log(`⚠️ Could not delete ${om.name} due to relations, archiving & zeroing out...`);
        await prisma.wadaanaItem.update({
          where: { id: om.id },
          data: { archivedAt: new Date(), cachedQty: 0 }
        });
      }
    }
  }

  console.log('🌾 Wadaana preform raw materials cleanup and seed complete!');
}

seedWadaanaRawMaterials()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
