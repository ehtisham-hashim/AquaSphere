import { prisma, closeDatabaseConnections } from '../src/config/db.js';

async function testPricingLogic() {
  console.log('=== TESTING PRICING BACKEND LOGIC ===');

  // Test 1: AquaSphere finished goods check
  const aquaFG = await prisma.aquasphereItem.findMany({
    where: { type: 'FINISHED_GOOD', archivedAt: null }
  });
  console.log('AquaSphere Finished Goods count:', aquaFG.length);
  const bulkWater = aquaFG.find(i => i.name.toLowerCase().includes('bulk') || i.name.toLowerCase().includes('water'));
  if (!bulkWater) {
    throw new Error('Bulk water not found in Aquasphere!');
  }
  console.log('Bulk water found:', bulkWater.name, 'Price:', bulkWater.retailPrice, 'Unit:', bulkWater.unit);

  // Test 2: Wadaana finished goods check
  const wadaanaFG = await prisma.wadaanaItem.findMany({
    where: { type: 'FINISHED_GOOD', archivedAt: null }
  });
  console.log('Wadaana Finished Goods count:', wadaanaFG.length);
  wadaanaFG.forEach(i => {
    console.log(`- ${i.name}: Rs ${i.retailPrice} (${i.unit})`);
  });

  // Test 3: Update price simulation on Wadaana
  const testWadaanaItem = wadaanaFG[0];
  const originalPrice = Number(testWadaanaItem.retailPrice);
  const newPrice = originalPrice + 5;

  await prisma.wadaanaItem.update({
    where: { id: testWadaanaItem.id },
    data: { retailPrice: newPrice }
  });
  const reloadedWadaana = await prisma.wadaanaItem.findUnique({ where: { id: testWadaanaItem.id } });
  if (Number(reloadedWadaana.retailPrice) !== newPrice) {
    throw new Error(`Price update failed for Wadaana! Expected ${newPrice}, got ${reloadedWadaana.retailPrice}`);
  }
  console.log(`✅ Wadaana price update verified: ${testWadaanaItem.name} Rs ${originalPrice} -> Rs ${newPrice}`);

  // Revert test update
  await prisma.wadaanaItem.update({
    where: { id: testWadaanaItem.id },
    data: { retailPrice: originalPrice }
  });
  console.log(`✅ Wadaana price reverted to Rs ${originalPrice}`);

  // Test 4: Update price simulation on Aquasphere (Bulk Water)
  const origWaterPrice = Number(bulkWater.retailPrice);
  await prisma.aquasphereItem.update({
    where: { id: bulkWater.id },
    data: { retailPrice: 12 }
  });
  const reloadedWater = await prisma.aquasphereItem.findUnique({ where: { id: bulkWater.id } });
  if (Number(reloadedWater.retailPrice) !== 12) {
    throw new Error('Bulk water price update failed!');
  }
  console.log(`✅ Aquasphere bulk water price update verified: Rs ${origWaterPrice} -> Rs 12`);

  // Revert
  await prisma.aquasphereItem.update({
    where: { id: bulkWater.id },
    data: { retailPrice: origWaterPrice }
  });
  console.log(`✅ Aquasphere bulk water price reverted to Rs ${origWaterPrice}`);

  console.log('=== ALL PRICING BACKEND TESTS PASSED ===');
}

testPricingLogic()
  .catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await closeDatabaseConnections();
  });
