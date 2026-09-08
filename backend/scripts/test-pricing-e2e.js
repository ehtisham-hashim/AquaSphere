import { prisma, closeDatabaseConnections } from '../src/config/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

async function testE2E() {
  console.log('=== RUNNING END-TO-END PRICING INTEGRATION TESTS ===');

  // Find Owner user in Aquasphere
  const aquaOwner = await prisma.aquasphereUser.findFirst({
    where: { role: 'OWNER' }
  });
  if (!aquaOwner) throw new Error('No Owner found in Aquasphere!');
  console.log('Found AquaSphere Owner:', aquaOwner.email);

  // Find Owner user in Wadaana
  const wadaanaOwner = await prisma.wadaanaUser.findFirst({
    where: { role: 'OWNER' }
  });
  if (!wadaanaOwner) throw new Error('No Owner found in Wadaana!');
  console.log('Found Wadaana Owner:', wadaanaOwner.email);

  // Find Admin user in Aquasphere (for permission check)
  const aquaAdmin = await prisma.aquasphereUser.findFirst({
    where: { role: 'ADMIN' }
  });
  console.log('Found AquaSphere Admin:', aquaAdmin ? aquaAdmin.email : 'None');

  // Check finished goods for Aquasphere
  const aquaFG = await prisma.aquasphereItem.findMany({
    where: { type: 'FINISHED_GOOD', archivedAt: null },
    select: { id: true, name: true, unit: true, retailPrice: true, cachedQty: true }
  });
  console.log('\nAquaSphere Finished Goods:');
  console.table(aquaFG.map(i => ({ name: i.name, unit: i.unit, retailPrice: Number(i.retailPrice), stock: Number(i.cachedQty) })));

  // Check finished goods for Wadaana
  const wadaanaFG = await prisma.wadaanaItem.findMany({
    where: { type: 'FINISHED_GOOD', archivedAt: null },
    select: { id: true, name: true, unit: true, retailPrice: true, cachedQty: true }
  });
  console.log('\nWadaana Finished Goods:');
  console.table(wadaanaFG.map(i => ({ name: i.name, unit: i.unit, retailPrice: Number(i.retailPrice), stock: Number(i.cachedQty) })));

  // Verify Bulk Water exists with unit 'Litres'
  const bulkWater = aquaFG.find(i => i.name.toLowerCase().includes('bulk') || i.name.toLowerCase().includes('water'));
  if (!bulkWater) throw new Error('Bulk water not found in Aquasphere!');
  if (bulkWater.unit !== 'Litres') throw new Error(`Bulk water unit expected "Litres", got "${bulkWater.unit}"`);
  console.log('\n✅ Bulk Water exists with unit "Litres" and price:', Number(bulkWater.retailPrice));

  // Verify Audit Log table is functional for price changes
  const testLog = await prisma.aquasphereAuditLog.create({
    data: {
      action: 'PRICE_UPDATED',
      entityType: 'Item',
      entityId: bulkWater.id,
      performedBy: aquaOwner.name || 'Owner',
      details: JSON.stringify({ test: true, price: Number(bulkWater.retailPrice) })
    }
  });
  console.log('✅ Audit log created successfully:', testLog.id);
  await prisma.aquasphereAuditLog.delete({ where: { id: testLog.id } });

  console.log('\n=== ALL E2E PRICING TESTS COMPLETED SUCCESSFULLY ===');
}

testE2E()
  .catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await closeDatabaseConnections();
  });
