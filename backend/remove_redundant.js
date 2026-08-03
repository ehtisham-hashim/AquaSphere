import { prisma } from './src/config/db.js';

async function removeRedundant() {
  try {
    const redundantPET = await prisma.aquasphereItem.findFirst({
      where: {
        type: 'RAW_MATERIAL',
        name: { contains: 'PET Bottles' },
        unit: 'kg'
      }
    });

    if (redundantPET) {
      console.log('Found redundant PET item:', redundantPET);
      
      const correctPET = await prisma.aquasphereItem.findFirst({
        where: {
          type: 'RAW_MATERIAL',
          name: redundantPET.name,
          unit: 'pcs'
        }
      });
      
      if (correctPET) {
        console.log('Found correct PET item:', correctPET);
        
        // Migrate Production Batch Consumptions
        await prisma.aquasphereProductionBatchConsumption.updateMany({
          where: { itemId: redundantPET.id },
          data: { itemId: correctPET.id }
        });
        console.log('Migrated Production Consumptions');
        
        // Delete redundant item and its direct dependencies
        await prisma.aquasphereInventoryTransaction.deleteMany({ where: { itemId: redundantPET.id } });
        await prisma.aquaspherePurchaseItem.deleteMany({ where: { itemId: redundantPET.id } });
        await prisma.aquasphereItem.delete({ where: { id: redundantPET.id } });
        
        console.log(`Deleted redundant item ${redundantPET.name} (${redundantPET.unit}) ID: ${redundantPET.id}`);
      } else {
        console.log('Could not find corresponding pcs item to migrate to.');
      }
    } else {
      console.log('No redundant PET item found.');
    }
    
    const shrink = await prisma.aquasphereItem.findFirst({
      where: {
        type: 'RAW_MATERIAL',
        name: { contains: 'Shrink Wrap' },
        unit: 'kg'
      }
    });
    
    if (shrink) {
      console.log('Found redundant Shrink Wrap:', shrink);
      const correctShrink = await prisma.aquasphereItem.findFirst({
        where: {
          type: 'RAW_MATERIAL',
          name: shrink.name,
          unit: 'rolls'
        }
      });
      
      if (correctShrink) {
        await prisma.aquasphereProductionBatchConsumption.updateMany({
          where: { itemId: shrink.id },
          data: { itemId: correctShrink.id }
        });
        
        await prisma.aquasphereInventoryTransaction.deleteMany({ where: { itemId: shrink.id } });
        await prisma.aquaspherePurchaseItem.deleteMany({ where: { itemId: shrink.id } });
        await prisma.aquasphereItem.delete({ where: { id: shrink.id } });
        console.log(`Deleted redundant item ${shrink.name} (${shrink.unit}) ID: ${shrink.id}`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

removeRedundant();
