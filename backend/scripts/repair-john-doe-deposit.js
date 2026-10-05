import 'dotenv/config';
import { prisma } from '../src/config/db.js';

async function repair() {
  console.log('--- Repairing John Doe deposit and debt balances ---');

  const customer = await prisma.aquasphereCustomer.findFirst({
    where: { name: { contains: 'John Doe', mode: 'insensitive' } }
  });

  if (!customer) {
    console.log('Customer John Doe not found.');
    return;
  }

  console.log(`Found John Doe (${customer.id}): Current deposit: ${customer.deposit}, currentBalance: ${customer.currentBalance}`);

  // Restore deposit to 9999 (+5100), set currentBalance to 5100 (for orders #9B130E [3380] and #D3F4DB [1720])
  const updated = await prisma.aquasphereCustomer.update({
    where: { id: customer.id },
    data: {
      deposit: 9999,
      currentBalance: 5100
    }
  });

  console.log(`Updated John Doe: New deposit: ${updated.deposit}, New currentBalance: ${updated.currentBalance}`);
  console.log('✅ Repair completed successfully.');
}

repair().catch(console.error).finally(() => process.exit());
