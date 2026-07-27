import { prisma } from '../src/config/db.js';

async function main() {
  console.log('Seeding database with dummy data...');

  // Clean up
  await prisma.aquasphereDelivery.deleteMany();
  await prisma.aquaspherePayment.deleteMany();
  await prisma.aquasphereOrderItem.deleteMany();
  await prisma.aquasphereOrder.deleteMany();
  await prisma.aquaspherePurchase.deleteMany();
  await prisma.aquasphereProductionBatch.deleteMany();
  await prisma.aquasphereExpense.deleteMany();
  await prisma.aquasphereCustomer.deleteMany();
  await prisma.aquasphereVendor.deleteMany();
  await prisma.aquasphereItem.deleteMany();

  // 1. Create Items
  const rawMaterial = await prisma.aquasphereItem.create({
    data: { name: 'PET Bottles (500ml)', type: 'RAW_MATERIAL', cachedQty: 1000, reorderLevel: 200 }
  });
  const finishedGood = await prisma.aquasphereItem.create({
    data: { name: 'AquaSphere 500ml Pack (12 bottles)', type: 'FINISHED_GOOD', cachedQty: 50, reorderLevel: 10 }
  });
  const finishedGood19L = await prisma.aquasphereItem.create({
    data: { name: '19L Refill', type: 'FINISHED_GOOD', cachedQty: 100, reorderLevel: 20 }
  });

  // 2. Create Vendors
  const vendor1 = await prisma.aquasphereVendor.create({
    data: { name: 'Plastics Supplier Co.' }
  });
  const vendor2 = await prisma.aquasphereVendor.create({
    data: { name: 'Label Makers Inc.' }
  });

  // 3. Create Customers
  const customer1 = await prisma.aquasphereCustomer.create({
    data: { 
      name: 'Ahmed Khan', phone: '03001234567', type: 'Home', address: 'DHA Phase 5, Lahore', 
      creditLimit: 5000, cachedBalance: 0, cachedBottleBalance: 4 
    }
  });
  const customer2 = await prisma.aquasphereCustomer.create({
    data: { 
      name: 'Cafe Zouk', phone: '03009876543', type: 'Restaurant', address: 'MM Alam Road, Lahore', 
      creditLimit: 20000, cachedBalance: 5000, cachedBottleBalance: 15 
    }
  });
  const customer3 = await prisma.aquasphereCustomer.create({
    data: { 
      name: 'Ali Raza', phone: '03211112222', type: 'Corporate', address: 'Gulberg III, Lahore', 
      creditLimit: 15000, cachedBalance: 0, cachedBottleBalance: 10 
    }
  });

  // 4. Create Purchases
  const purchase1 = await prisma.aquaspherePurchase.create({
    data: { vendorId: vendor1.id, itemId: rawMaterial.id, quantity: 500, price: 15000, receiptUrl: 'http://example.com/receipt1' }
  });

  // 5. Create Production Batch
  const batch1 = await prisma.aquasphereProductionBatch.create({
    data: { outputItemId: finishedGood.id, quantity: 20 }
  });

  // 6. Create Expense
  const expense1 = await prisma.aquasphereExpense.create({
    data: { category: 'Fuel for Delivery Van', amount: 3500, receiptUrl: '' }
  });

  // 7. Create Orders
  // Pending Order
  const order1 = await prisma.aquasphereOrder.create({
    data: { customerId: customer1.id, type: 'NINETEEN_L', deliveryStatus: 'PENDING', paymentStatus: 'UNPAID', remarks: 'Deliver in evening' }
  });
  await prisma.aquasphereOrderItem.create({ data: { orderId: order1.id, itemId: finishedGood19L.id, quantity: 2, price: 200 } });

  // Delivered Order
  const order2 = await prisma.aquasphereOrder.create({
    data: { customerId: customer2.id, type: 'PET', deliveryStatus: 'DELIVERED', paymentStatus: 'PAID', remarks: 'Urgent' }
  });
  await prisma.aquasphereOrderItem.create({ data: { orderId: order2.id, itemId: finishedGood.id, quantity: 5, price: 600 } });
  await prisma.aquasphereDelivery.create({ data: { orderId: order2.id, qtyDelivered: 5, bottlesReturnedGood: 0, bottlesReturnedBroken: 0, cashReceived: 3000, paymentMethod: 'CASH' } });
  await prisma.aquaspherePayment.create({ data: { orderId: order2.id, customerId: customer2.id, amount: 3000, type: 'CASH' } });

  // Cancelled Order
  const order4 = await prisma.aquasphereOrder.create({
    data: { customerId: customer1.id, type: 'NINETEEN_L', deliveryStatus: 'CANCELLED', paymentStatus: 'UNPAID', remarks: 'Customer was not home' }
  });
  await prisma.aquasphereOrderItem.create({ data: { orderId: order4.id, itemId: finishedGood19L.id, quantity: 1, price: 200 } });

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
