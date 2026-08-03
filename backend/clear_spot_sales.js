import { prisma } from './src/config/db.js';

async function main() {
  console.log('Starting spot sales cleanup...');

  // Clear Aquasphere Spot Sales
  const resAqua = await prisma.aquasphereSpotSale.deleteMany({});
  console.log(`Deleted ${resAqua.count} Aquasphere spot sales records.`);

  // Clear Wadaana Spot Sales
  const resWad = await prisma.wadaanaSpotSale.deleteMany({});
  console.log(`Deleted ${resWad.count} Wadaana spot sales records.`);

  console.log('Spot sales cleanup complete!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
