import { prisma } from '../src/config/db.js';

async function main() {
  // 1. Ensure Raw Materials Exist
  const rawMaterials = [
    { name: 'PET Bottles (500ml)', unit: 'pcs' },
    { name: 'PET Bottles (1.5L)', unit: 'pcs' },
    { name: 'Small Caps', unit: 'pcs' },
    { name: 'Large Caps', unit: 'pcs' },
    { name: 'Labels (500ml)', unit: 'pcs' },
    { name: 'Labels (1.5L)', unit: 'pcs' },
    { name: 'Shrink Wrap', unit: 'kg' },
    { name: 'Sodium', unit: 'kg' },
    { name: 'Calcium', unit: 'kg' },
    { name: 'Magnesium', unit: 'kg' }
  ];

  for (const rm of rawMaterials) {
    await prisma.aquasphereItem.upsert({
      where: { id: 'dummy-no-upsert-unique-name-so-findFirst-instead' }, // hacky, better to check
      create: { name: rm.name, type: 'RAW_MATERIAL', unit: rm.unit, cachedQty: 10000, reorderLevel: 100 },
      update: {}
    }).catch(async () => {
      const exists = await prisma.aquasphereItem.findFirst({ where: { name: rm.name } });
      if (!exists) {
        await prisma.aquasphereItem.create({ data: { name: rm.name, type: 'RAW_MATERIAL', unit: rm.unit, cachedQty: 10000, reorderLevel: 100 } });
      }
    });
  }

  // Ensure Finished Goods exist
  const fgs = [
    { name: 'AquaSphere 500ml Pack (12 bottles)', unit: 'packs' },
    { name: 'AquaSphere 1.5L Pack (6 bottles)', unit: 'packs' }
  ];

  for (const fg of fgs) {
    const exists = await prisma.aquasphereItem.findFirst({ where: { name: fg.name } });
    if (!exists) {
      await prisma.aquasphereItem.create({ data: { name: fg.name, type: 'FINISHED_GOOD', unit: fg.unit, cachedQty: 0, reorderLevel: 10 } });
    }
  }

  // Helper to map recipes
  const createRecipe = async (fgName, rmName, qty) => {
    const fg = await prisma.aquasphereItem.findFirst({ where: { name: fgName } });
    const rm = await prisma.aquasphereItem.findFirst({ where: { name: rmName } });
    
    if (fg && rm) {
      // Check if exists
      const existing = await prisma.aquasphereRecipeItem.findFirst({
        where: { finishedGoodId: fg.id, rawMaterialId: rm.id }
      });
      if (!existing) {
        await prisma.aquasphereRecipeItem.create({
          data: { finishedGoodId: fg.id, rawMaterialId: rm.id, quantityPerUnit: qty }
        });
      } else {
        await prisma.aquasphereRecipeItem.update({
          where: { id: existing.id },
          data: { quantityPerUnit: qty }
        });
      }
    }
  };

  // Recipe: 0.5L PET Pack (12 bottles)
  const fg500 = 'AquaSphere 500ml Pack (12 bottles)';
  await createRecipe(fg500, 'PET Bottles (500ml)', 12);
  await createRecipe(fg500, 'Small Caps', 12);
  await createRecipe(fg500, 'Labels (500ml)', 12);
  await createRecipe(fg500, 'Shrink Wrap', 0.05);
  await createRecipe(fg500, 'Sodium', 0.01);
  await createRecipe(fg500, 'Calcium', 0.005);
  await createRecipe(fg500, 'Magnesium', 0.002);

  // Recipe: 1.5L PET Pack (6 bottles)
  const fg1500 = 'AquaSphere 1.5L Pack (6 bottles)';
  await createRecipe(fg1500, 'PET Bottles (1.5L)', 6);
  await createRecipe(fg1500, 'Large Caps', 6);
  await createRecipe(fg1500, 'Labels (1.5L)', 6);
  await createRecipe(fg1500, 'Shrink Wrap', 0.04);
  await createRecipe(fg1500, 'Sodium', 0.012);
  await createRecipe(fg1500, 'Calcium', 0.006);
  await createRecipe(fg1500, 'Magnesium', 0.003);

  console.log('Full BOM Seeded successfully!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
