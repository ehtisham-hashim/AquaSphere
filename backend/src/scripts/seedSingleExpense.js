import { prisma } from '../config/db.js';

async function seedExpense() {
  console.log('Finding owner user (owner@aquasphere.com)...');
  
  const owner = await prisma.aquasphereUser.findUnique({
    where: { email: 'owner@aquasphere.com' }
  });

  if (!owner) {
    console.error('Owner user owner@aquasphere.com not found!');
    process.exit(1);
  }

  console.log(`Found Owner user: ${owner.name} (ID: ${owner.id})`);

  const sampleExpense = await prisma.aquasphereExpense.create({
    data: {
      category: 'Fuel / Transport',
      amount: 4500,
      remarks: '50L Diesel for Delivery Van #01',
      receiptUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=500',
      createdById: owner.id,
      createdAt: new Date()
    },
    include: {
      createdBy: {
        select: { id: true, name: true, role: true }
      }
    }
  });

  console.log('Successfully seeded Expense:');
  console.log({
    id: sampleExpense.id,
    category: sampleExpense.category,
    amount: Number(sampleExpense.amount),
    remarks: sampleExpense.remarks,
    receiptUrl: sampleExpense.receiptUrl,
    createdBy: sampleExpense.createdBy?.name || owner.name,
    createdAt: sampleExpense.createdAt
  });
}

seedExpense()
  .catch((err) => {
    console.error('Error seeding expense:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
