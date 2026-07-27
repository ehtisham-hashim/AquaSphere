import { prisma } from '../src/config/db.js';

async function main() {
  const fg = await prisma.aquasphereItem.findFirst({ where: { name: 'AquaSphere 500ml Pack (12 bottles)' } });
  const rm = await prisma.aquasphereItem.findFirst({ where: { name: 'PET Bottles (500ml)' } });

  if (fg && rm) {
    await prisma.aquasphereRecipeItem.upsert({
      where: {
        finishedGoodId_rawMaterialId: {
          finishedGoodId: fg.id,
          rawMaterialId: rm.id
        }
      },
      update: { quantityPerUnit: 12 },
      create: {
        finishedGoodId: fg.id,
        rawMaterialId: rm.id,
        quantityPerUnit: 12
      }
    });
    console.log('Recipe for 500ml Pack seeded!');
  } else {
    console.log('Items not found!');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
