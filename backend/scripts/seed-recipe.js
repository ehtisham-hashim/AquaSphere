import { prisma } from '../src/config/db.js';

async function main() {
  const fg = await prisma.aquasphereItem.findFirst({ 
    where: { 
      OR: [
        { name: '0.5L PET Pack (12 Bottles)' },
        { name: { contains: '500ml', mode: 'insensitive' } }
      ] 
    } 
  });
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
