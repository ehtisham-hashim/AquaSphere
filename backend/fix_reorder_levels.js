import { prisma } from './src/config/db.js';

async function fixReorderLevels() {
  // Update finished goods reorder levels to 0 so they don't trigger false alerts when 0 stock
  const updatedAqua = await prisma.aquasphereItem.updateMany({
    where: {
      type: 'FINISHED_GOOD'
    },
    data: {
      reorderLevel: 0
    }
  });
  console.log('Updated AquaSphere finished goods reorder levels to 0:', updatedAqua);

  const updatedWadaana = await prisma.wadaanaItem.updateMany({
    where: {
      type: 'FINISHED_GOOD'
    },
    data: {
      reorderLevel: 0
    }
  });
  console.log('Updated Wadaana finished goods reorder levels to 0:', updatedWadaana);

  await prisma.$disconnect();
  process.exit(0);
}

fixReorderLevels();
