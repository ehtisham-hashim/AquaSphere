/**
 * Seed Test Transactions for Today
 * 
 * This script creates sample transactions for today to test the dashboard
 * 
 * Run with: node scripts/seed-test-transactions.js
 */

import { prisma } from '../src/config/db.js';

const TENANT = process.env.TENANT || 'aquasphere';
const prefix = TENANT === 'wadaana' ? 'wadaana' : 'aquasphere';

async function seedTestTransactions() {
  console.log(`\n🌱 Seeding Test Transactions for ${TENANT}...\n`);
  
  try {
    // Get first customer
    const customer = await prisma[`${prefix}Customer`].findFirst({
      where: { archivedAt: null }
    });

    if (!customer) {
      console.log('❌ No customer found. Please create a customer first.');
      return;
    }

    console.log(`✅ Using customer: ${customer.name}\n`);

    // 1. Create a Spot Sale (Counter Sale)
    console.log('💰 Creating Counter Sale...');
    const spotSale = await prisma[`${prefix}SpotSale`].create({
      data: {
        saleNumber: `CS-TEST-${Date.now()}`,
        productType: 'BOTTLE_19L',
        productQty: 3,
        litresSold: 72, // 3 x 24L
        capsIssued: 3,
        cashCollected: 1500, // Rs. 500 per bottle
        creditAmount: 0,
        paymentMethod: 'CASH',
        remarks: 'Test counter sale',
        customerId: customer.id
      }
    });
    console.log(`   ✅ Created spot sale: ${spotSale.saleNumber} - Rs. ${spotSale.cashCollected}`);

    // 2. Create an Expense
    console.log('\n📉 Creating Expense...');
    const expense = await prisma[`${prefix}Expense`].create({
      data: {
        category: 'UTILITIES',
        amount: 2500,
        remarks: 'Test expense - Electricity bill',
        receiptUrl: null
      }
    });
    console.log(`   ✅ Created expense: ${expense.category} - Rs. ${expense.amount}`);

    // 3. Create a Payment (simulating order delivery payment)
    console.log('\n💳 Creating Payment...');
    
    // First check if there's an order
    const order = await prisma[`${prefix}Order`].findFirst({
      where: { 
        customerId: customer.id,
        deliveryStatus: 'DELIVERED'
      }
    });

    if (order) {
      const payment = await prisma[`${prefix}Payment`].create({
        data: {
          orderId: order.id,
          customerId: customer.id,
          amount: 3000,
          type: 'CASH'
        }
      });
      console.log(`   ✅ Created payment: Rs. ${payment.amount} for Order ${order.id.substring(0, 8)}`);
    } else {
      console.log(`   ⚠️  No delivered order found - skipping payment`);
    }

    // 4. Create a Counter Sale with Credit
    console.log('\n💳 Creating Credit Counter Sale...');
    const creditSpotSale = await prisma[`${prefix}SpotSale`].create({
      data: {
        saleNumber: `CS-CREDIT-${Date.now()}`,
        productType: 'BOTTLE_19L',
        productQty: 2,
        litresSold: 48, // 2 x 24L
        capsIssued: 2,
        cashCollected: 500,
        creditAmount: 500, // Half cash, half credit
        paymentMethod: 'CASH',
        remarks: 'Test credit sale',
        customerId: customer.id
      }
    });
    console.log(`   ✅ Created credit sale: ${creditSpotSale.saleNumber} - Cash: Rs. ${creditSpotSale.cashCollected}, Credit: Rs. ${creditSpotSale.creditAmount}`);

    // Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ Test Transactions Created Successfully!`);
    console.log(`${'='.repeat(60)}`);
    console.log(`\n📊 Expected Dashboard Values:`);
    console.log(`   Cash from Orders:     Rs. ${order ? 3000 : 0}`);
    console.log(`   Cash from Counter:    Rs. ${1500 + 500} (${spotSale.cashCollected} + ${creditSpotSale.cashCollected})`);
    console.log(`   Credit Sales:         Rs. ${creditSpotSale.creditAmount}`);
    console.log(`   Total Expenses:       Rs. ${expense.amount}`);
    console.log(`   ─────────────────────────────────────────`);
    const netCash = (order ? 3000 : 0) + 2000 - 2500;
    console.log(`   Net Cash:             Rs. ${netCash}`);
    console.log(`\n🎯 Now refresh your dashboard to see these values!\n`);

  } catch (error) {
    console.error('\n❌ Error seeding transactions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedTestTransactions();
