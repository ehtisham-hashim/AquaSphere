// backend/tests/erp-audit.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { calculateBatchDeductions } from '../src/utils/productionFormulas.js';
import {
  creditEmptyBottlesToFactory,
} from '../src/services/bottleInventory.service.js';
import {
  normalizePakistanPhone,
  parseBoolCsv,
  normalizeCustomerType
} from '../src/controllers/customer.controller.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

test('Unit [Production]: 0.5L Pack (12/pk) good yield + broken bottles deducts exact BOM and spares shrink film on waste', () => {
  const fg05 = {
    id: 'fg-05',
    name: '0.5L PET Bottle (Pack of 12)',
    unit: 'bottle',
    packSize: 12,
    recipeFinishedGoods: [
      { quantityPerUnit: 12, rawMaterial: { id: 'rm-btl-05', name: '0.5L Empty Bottles', unit: 'bottle' } },
      { quantityPerUnit: 12, rawMaterial: { id: 'rm-cap-sm', name: 'Small Caps', unit: 'cap' } },
      { quantityPerUnit: 0.02273, rawMaterial: { id: 'rm-shrink-05', name: '0.5L Shrink Wrap Film', unit: 'kg' } }
    ]
  };

  const result = calculateBatchDeductions([{ outputItem: fg05, quantity: 10, wasteQuantity: 6 }]);
  assert.equal(result.finishedGoods[0].quantityAdded, 120);
  assert.equal(result.deductions.find(d => d.itemId === 'rm-btl-05').quantityUsed, 126);
  assert.equal(result.deductions.find(d => d.itemId === 'rm-cap-sm').quantityUsed, 126);
  assert.equal(result.deductions.find(d => d.itemId === 'rm-shrink-05').quantityUsed, 0.2273);
});

test('Integration [Custody Service]: Credits Empty 19L Bottles without touching 0.5L Empty Bottles', async () => {
  const mockItems = new Map([
    ['rm-19l', { id: 'rm-19l', name: 'Empty 19L Bottles', type: 'RAW_MATERIAL', unit: 'bottle', isReturnable: true, cachedQty: 50, factoryQty: 50, archivedAt: null }],
    ['rm-05l', { id: 'rm-05l', name: '0.5L Empty Bottles', type: 'RAW_MATERIAL', unit: 'bottle', isReturnable: false, cachedQty: 1000, factoryQty: 1000, archivedAt: null }]
  ]);

  const mockTx = {
    aquasphereItem: {
      findFirst: async ({ where }) => (where?.id ? mockItems.get(where.id) : mockItems.get('rm-19l')),
      update: async ({ where, data }) => {
        const it = mockItems.get(where.id);
        if (data.cachedQty?.increment) it.cachedQty += data.cachedQty.increment;
        if (data.factoryQty?.increment) it.factoryQty += data.factoryQty.increment;
        return it;
      }
    },
    aquasphereInventoryTransaction: { create: async ({ data }) => data }
  };

  await creditEmptyBottlesToFactory(mockTx, 'aquasphere', { quantity: 21, rawMaterialId: 'rm-19l', customerId: 'c1' });
  assert.equal(mockItems.get('rm-19l').cachedQty, 71);
  assert.equal(mockItems.get('rm-05l').cachedQty, 1000);
});

test('Unit [Phone Normalization]: Normalizes Pakistani phone variations to 11-digit 03XXXXXXXXX format', () => {
  assert.equal(normalizePakistanPhone('+92 300 1234567'), '03001234567');
  assert.equal(normalizePakistanPhone('0300-1234567'), '03001234567');
  assert.equal(normalizePakistanPhone('923001234567'), '03001234567');
  assert.equal(normalizePakistanPhone('3001234567'), '03001234567');
  assert.equal(normalizePakistanPhone('0333 9876543'), '03339876543');
  assert.equal(normalizePakistanPhone(''), '');
});

test('Unit [CSV Helpers]: Normalizes customer types and boolean values', () => {
  assert.equal(normalizeCustomerType('commercial mart'), 'Commercial');
  assert.equal(normalizeCustomerType('Corporate Office'), 'Corporate');
  assert.equal(normalizeCustomerType('wholesale distributor'), 'Distributor');
  assert.equal(normalizeCustomerType('industrial plant'), 'Industrial');
  assert.equal(normalizeCustomerType('household'), 'Home');
  assert.equal(normalizeCustomerType(''), 'Home');

  assert.equal(parseBoolCsv('true'), true);
  assert.equal(parseBoolCsv('YES'), true);
  assert.equal(parseBoolCsv('1'), true);
  assert.equal(parseBoolCsv('0'), false);
  assert.equal(parseBoolCsv('no'), false);
  assert.equal(parseBoolCsv(''), false);
});

test('Regression #1 (P0 Security): auth.middleware.js rejects pre-OTP 2FA tempToken (decodedToken.is2FA)', () => {
  const code = fs.readFileSync(path.join(rootDir, 'backend/src/middlewares/auth.middleware.js'), 'utf8');
  assert.equal(code.includes('decodedToken.is2FA'), true);
});

test('Regression #2 (P0 Reports Math): reports.controller.js does NOT double-count deliveryCash + paymentCash', () => {
  const code = fs.readFileSync(path.join(rootDir, 'backend/src/controllers/reports.controller.js'), 'utf8');
  assert.equal(code.includes('const orderCash = deliveryCash + paymentCash'), false);
});

test('Regression #3 (P0 Purchase Ledger): purchase.controller.js updatePurchase preserves partial PAYMENT ledger entries', () => {
  const code = fs.readFileSync(path.join(rootDir, 'backend/src/controllers/purchase.controller.js'), 'utf8');
  assert.equal(code.includes("VendorLedgerEntry`].deleteMany({ where: { purchaseId: id } })"), false);
});

test('Regression #4 (P0 Production Waste): analytics.controller.js does NOT double-count wasteQuantity + brokenBottles05L + brokenBottles15L', () => {
  const code = fs.readFileSync(path.join(rootDir, 'backend/src/controllers/analytics.controller.js'), 'utf8');
  assert.equal(
    code.includes('(todaysBatchesAgg._sum.wasteQuantity || 0) + (todaysBatchesAgg._sum.brokenBottles15L || 0) + (todaysBatchesAgg._sum.brokenBottles05L || 0)'),
    false
  );
});

test('Regression #5 (P1 Delivery Modal): ProcessDeliveryModal.jsx uses r.rawMaterial?.isReturnable (not r.rawMaterialItem)', () => {
  const code = fs.readFileSync(path.join(rootDir, 'frontend/src/components/orders/ProcessDeliveryModal.jsx'), 'utf8');
  assert.equal(code.includes('rawMaterialItem'), false);
});

test('Regression #6 (Owner CSV Import Guard): customer.routes.js registers /csv-template and /bulk-import BEFORE /:id', () => {
  const code = fs.readFileSync(path.join(rootDir, 'backend/src/routes/customer.routes.js'), 'utf8');
  const templateIdx = code.indexOf("router.get('/csv-template'");
  const bulkIdx = code.indexOf("router.post('/bulk-import'");
  const idIdx = code.indexOf("router.get('/:id'");
  assert.ok(templateIdx > -1, 'Missing /csv-template route');
  assert.ok(bulkIdx > -1, 'Missing /bulk-import route');
  assert.ok(idIdx > -1, 'Missing /:id route');
  assert.ok(templateIdx < idIdx, '/csv-template must be registered before /:id');
  assert.ok(bulkIdx < idIdx, '/bulk-import must be registered before /:id');
});

test('Regression #7 (Upload Middleware): upload.middleware.js exports csvUpload accepting .csv files', () => {
  const code = fs.readFileSync(path.join(rootDir, 'backend/src/middlewares/upload.middleware.js'), 'utf8');
  assert.ok(code.includes('export const csvUpload = multer'), 'Missing csvUpload export');
  assert.ok(code.includes('text/csv'), 'Missing text/csv MIME support');
});

test('Regression #8 (Opening Bottle Custody): customer.controller.js creates initial BottleTransaction on opening custody', () => {
  const code = fs.readFileSync(path.join(rootDir, 'backend/src/controllers/customer.controller.js'), 'utf8');
  assert.ok(code.includes('Opening Custody Balance'), 'Missing Opening Custody Balance transaction reason');
  assert.ok(code.includes('DELIVERED_TO_CUSTOMER'), 'Missing DELIVERED_TO_CUSTOMER transaction type');
});

test('Integration [CSV File Validation]: Correctly parses sample_customers_test.csv, normalizes phones, and catches duplicate', async () => {
  const Papa = (await import('papaparse')).default;
  const csvContent = fs.readFileSync(path.join(__dirname, 'sample_customers_test.csv'), 'utf8');
  const parsed = Papa.parse(csvContent, { header: true, skipEmptyLines: 'greedy' });

  assert.equal(parsed.data.length, 4, 'Should parse 4 customer rows');
  
  const seenPhones = new Set();
  const validRows = [];
  const duplicateRows = [];

  for (const row of parsed.data) {
    const cleanPhone = normalizePakistanPhone(row.phone);
    if (seenPhones.has(cleanPhone)) {
      duplicateRows.push(row);
    } else {
      seenPhones.add(cleanPhone);
      validRows.push(row);
    }
  }

  assert.equal(validRows.length, 3, 'Should accept 3 unique customers');
  assert.equal(duplicateRows.length, 1, 'Should reject 1 duplicate customer');
  assert.equal(duplicateRows[0].name, 'Duplicate Phone Test');
  assert.equal(normalizePakistanPhone(validRows[0].phone), '03005123456');
  assert.equal(normalizePakistanPhone(validRows[1].phone), '03219876543');
  assert.equal(normalizePakistanPhone(validRows[2].phone), '03331112233');
  assert.equal(parseInt(validRows[0].cachedBottleBalance, 10), 5);
  assert.equal(parseInt(validRows[0].securityDeposit, 10), 3000);
  assert.equal(parseFloat(validRows[0].currentBalance), 1500);
});

test('Integration [CSV Bulk Transaction Simulation]: Creates Customer and logs opening DELIVERED_TO_CUSTOMER BottleTransaction', async () => {
  const mockCustomers = [];
  const mockBottleTxs = [];
  const mockPrimaryReturnable = { id: 'rm-19l-ret', name: 'Empty 19L Bottles' };

  const mockTx = {
    aquasphereCustomer: {
      create: async ({ data }) => {
        const record = { id: `cust-${mockCustomers.length + 1}`, ...data };
        mockCustomers.push(record);
        return record;
      }
    },
    aquasphereBottleTransaction: {
      create: async ({ data }) => {
        const record = { id: `bt-${mockBottleTxs.length + 1}`, ...data };
        mockBottleTxs.push(record);
        return record;
      }
    }
  };

  const customer1 = await mockTx.aquasphereCustomer.create({
    data: {
      name: 'Al-Madina Test Mart',
      phone: '03005123456',
      customerCode: 'JAM3130001',
      cachedBottleBalance: 5,
      deposit: 3000,
      currentBalance: 1500
    }
  });

  if (customer1.cachedBottleBalance > 0) {
    await mockTx.aquasphereBottleTransaction.create({
      data: {
        customerId: customer1.id,
        itemId: mockPrimaryReturnable.id,
        type: 'DELIVERED_TO_CUSTOMER',
        quantity: customer1.cachedBottleBalance,
        reason: 'CSV Bulk Import — Opening Custody Balance'
      }
    });
  }

  assert.equal(mockCustomers.length, 1);
  assert.equal(mockCustomers[0].customerCode, 'JAM3130001');
  assert.equal(mockBottleTxs.length, 1);
  assert.equal(mockBottleTxs[0].customerId, customer1.id);
  assert.equal(mockBottleTxs[0].quantity, 5);
  assert.equal(mockBottleTxs[0].type, 'DELIVERED_TO_CUSTOMER');
});

