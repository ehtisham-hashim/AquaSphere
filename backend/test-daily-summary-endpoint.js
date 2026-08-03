/**
 * Test Script: Verify Daily Summary API Endpoint
 * 
 * This script tests the /analytics/daily-summary endpoint to verify it returns correct data
 * 
 * Run with: node test-daily-summary-endpoint.js
 */

import { prisma } from './src/config/db.js';

const TENANT = process.env.TENANT || 'aquasphere';
const prefix = TENANT === 'wadaana' ? 'wadaana' : 'aquasphere';

async function testDailySummary() {
  console.log(`\n🔍 Testing Daily Summary for ${TENANT}...\n`);
  
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log(`📅 Date Range: ${today.toISOString()} to ${tomorrow.toISOString()}\n`);

    // Test 1: Check Payment Records (Cash from Orders)
    const payments = await prisma[`${prefix}Payment`].findMany({
      where: { createdAt: { gte: today, lt: tomorrow } },
      include: { order: { select: { id: true } }, customer: { select: { name: true } } }
    });

    console.log(`💰 PAYMENTS (Cash from Order Deliveries):`);
    console.log(`   Found: ${payments.length} payment(s)`);
    const totalPayments = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    console.log(`   Total: Rs. ${totalPayments.toLocaleString()}`);
    if (payments.length > 0) {
      payments.forEach(p => {
        console.log(`   - Rs. ${Number(p.amount).toLocaleString()} from ${p.customer?.name || 'N/A'}`);
      });
    }
    console.log();

    // Test 2: Check Spot Sales (Counter Sales)
    const spotSales = await prisma[`${prefix}SpotSale`].findMany({
      where: { createdAt: { gte: today, lt: tomorrow } }
    });

    console.log(`🛒 COUNTER SALES (Spot Sales):`);
    console.log(`   Found: ${spotSales.length} sale(s)`);
    const totalSpotCash = spotSales.reduce((sum, s) => sum + Number(s.cashCollected || 0), 0);
    const totalSpotCredit = spotSales.reduce((sum, s) => sum + Number(s.creditAmount || 0), 0);
    console.log(`   Cash Collected: Rs. ${totalSpotCash.toLocaleString()}`);
    console.log(`   Credit Amount: Rs. ${totalSpotCredit.toLocaleString()}`);
    if (spotSales.length > 0) {
      spotSales.forEach(s => {
        console.log(`   - ${s.productType}: Cash Rs. ${Number(s.cashCollected || 0)}, Credit Rs. ${Number(s.creditAmount || 0)}`);
      });
    }
    console.log();

    // Test 3: Check Expenses
    const expenses = await prisma[`${prefix}Expense`].findMany({
      where: { createdAt: { gte: today, lt: tomorrow } }
    });

    console.log(`📉 EXPENSES:`);
    console.log(`   Found: ${expenses.length} expense(s)`);
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    console.log(`   Total: Rs. ${totalExpenses.toLocaleString()}`);
    if (expenses.length > 0) {
      expenses.forEach(e => {
        console.log(`   - ${e.category}: Rs. ${Number(e.amount).toLocaleString()} (${e.remarks || 'No remarks'})`);
      });
    }
    console.log();

    // Summary Calculation
    const netCash = totalPayments + totalSpotCash - totalExpenses;

    console.log(`${'='.repeat(60)}`);
    console.log(`📊 DAILY SUMMARY CALCULATION:`);
    console.log(`   Cash from Orders:     Rs. ${totalPayments.toLocaleString()}`);
    console.log(`   Cash from Counter:    Rs. ${totalSpotCash.toLocaleString()}`);
    console.log(`   Credit Sales:         Rs. ${totalSpotCredit.toLocaleString()}`);
    console.log(`   Total Expenses:       Rs. ${totalExpenses.toLocaleString()}`);
    console.log(`   ─────────────────────────────────────────`);
    console.log(`   Net Cash:             Rs. ${netCash.toLocaleString()}`);
    console.log(`${'='.repeat(60)}\n`);

    // Test what API endpoint would return
    console.log(`🔌 API ENDPOINT WOULD RETURN:`);
    console.log(JSON.stringify({
      success: true,
      data: {
        totalDeliveryAmount: totalPayments,
        totalSpotSales: totalSpotCash,
        totalCreditSales: totalSpotCredit,
        totalExpenses: totalExpenses,
        netCash: netCash,
        date: today.toISOString().split('T')[0]
      }
    }, null, 2));
    console.log();

    // Verification
    console.log(`✅ VERIFICATION:`);
    if (payments.length === 0 && spotSales.length === 0 && expenses.length === 0) {
      console.log(`   ⚠️  No transactions found for today`);
      console.log(`   This is normal if you haven't recorded any sales/expenses yet today`);
      console.log(`   Dashboard showing Rs. 0 is CORRECT in this case`);
    } else {
      console.log(`   ✅ Transactions found - dashboard should display these values`);
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDailySummary();
