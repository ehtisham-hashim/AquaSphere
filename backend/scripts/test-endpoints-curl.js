import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const BASE_URL = 'http://localhost:3000';

async function runCurlTests() {
  const { prisma } = await import('../src/config/db.js');

  console.log('\n======================================================');
  console.log('🧪 RUNNING FULL CURL API TEST SUITE (POSITIVE & NEGATIVE)');
  console.log('======================================================\n');

  // 1. Log in via API to get genuine token (Owner)
  const testEmail = process.env.TEST_EMAIL || process.env.TEST_AUTH_EMAIL;
  const testPassword = process.env.TEST_PASSWORD || process.env.TEST_AUTH_PASSWORD;
  const testCompany = process.env.TEST_COMPANY || process.env.TEST_AUTH_COMPANY;

  if (!testEmail || !testPassword || !testCompany) {
    console.error('❌ Missing required test environment variables: TEST_EMAIL, TEST_PASSWORD, TEST_COMPANY');
    process.exit(1);
  }

  let token = null;
  try {
    const loginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword, company: testCompany })
    });
    const loginJson = await loginRes.json();
    if (!loginJson.data?.token) {
      console.error('❌ Could not obtain login token:', loginJson);
      process.exit(1);
    }
    token = loginJson.data.token;
  } catch (err) {
    console.error('❌ Login request failed:', err.message);
    process.exit(1);
  }

  console.log('🔑 Authenticated successfully as AquaSphere Owner (Full Access Token)\n');

  // Get sample data IDs for testing
  const sampleCustomer = await prisma.aquasphereCustomer.findFirst({ where: { archivedAt: null } });
  const sampleVendor = await prisma.aquasphereVendor.findFirst({ where: { archivedAt: null } });
  const sampleItem = await prisma.aquasphereItem.findFirst({ where: { archivedAt: null } });

  let passed = 0;
  let failed = 0;

  function runTest({ name, type, curlCmd, expectedStatus }) {
    try {
      const output = execSync(curlCmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
      const statusCode = parseInt(output.slice(-3), 10);
      const responseBody = output.slice(0, -3);

      const isPass = statusCode === expectedStatus;
      if (isPass) {
        passed++;
        console.log(`✅ [PASS] [${type.toUpperCase()}] ${name} -> Status: ${statusCode}`);
      } else {
        failed++;
        console.log(`❌ [FAIL] [${type.toUpperCase()}] ${name} -> Status: ${statusCode} (Expected: ${expectedStatus})`);
        console.log(`   Response: ${responseBody.slice(0, 160)}`);
      }
    } catch (err) {
      failed++;
      console.log(`❌ [FAIL] [${type.toUpperCase()}] ${name} -> Error: ${err.message}`);
    }
  }

  const tests = [
    // 1. PUBLIC / SYSTEM
    {
      name: 'GET / (Health Check)',
      type: 'positive',
      expectedStatus: 200,
      curlCmd: `curl -s -w "%{http_code}" "${BASE_URL}/"`
    },
    {
      name: 'GET /nonexistent-route (Not Found)',
      type: 'negative',
      expectedStatus: 404,
      curlCmd: `curl -s -w "%{http_code}" "${BASE_URL}/api/v1/unknown-endpoint"`
    },

    // 2. AUTH
    {
      name: 'POST /api/v1/auth/login (Positive)',
      type: 'positive',
      expectedStatus: 200,
      curlCmd: `curl -s -w "%{http_code}" -X POST "${BASE_URL}/api/v1/auth/login" -H "Content-Type: application/json" -d '${JSON.stringify({ email: testEmail, password: testPassword, company: testCompany }).replace(/'/g, "'\\''")}'`
    },
    {
      name: 'POST /api/v1/auth/login (Negative: Invalid Credentials)',
      type: 'negative',
      expectedStatus: 401,
      curlCmd: `curl -s -w "%{http_code}" -X POST "${BASE_URL}/api/v1/auth/login" -H "Content-Type: application/json" -d '{"email":"invalid@test.com","password":"wrong"}'`
    },
    {
      name: 'POST /api/v1/auth/login (Negative: Missing Fields)',
      type: 'negative',
      expectedStatus: 400,
      curlCmd: `curl -s -w "%{http_code}" -X POST "${BASE_URL}/api/v1/auth/login" -H "Content-Type: application/json" -d '{}'`
    },
    {
      name: 'POST /api/v1/auth/logout (Positive)',
      type: 'positive',
      expectedStatus: 200,
      curlCmd: `curl -s -w "%{http_code}" -X POST "${BASE_URL}/api/v1/auth/logout"`
    },

    // 3. USERS
    {
      name: 'GET /api/v1/users (Negative: Unauthorized without token)',
      type: 'negative',
      expectedStatus: 401,
      curlCmd: `curl -s -w "%{http_code}" "${BASE_URL}/api/v1/users"`
    },
    {
      name: 'GET /api/v1/users (Negative: Missing company query param)',
      type: 'negative',
      expectedStatus: 400,
      curlCmd: `curl -s -w "%{http_code}" "${BASE_URL}/api/v1/users" -H "Authorization: Bearer ${token}" -H "x-tenant: aquasphere"`
    },
    {
      name: 'GET /api/v1/users?company=aquasphere (Positive: Authorized)',
      type: 'positive',
      expectedStatus: 200,
      curlCmd: `curl -s -w "%{http_code}" "${BASE_URL}/api/v1/users?company=aquasphere" -H "Authorization: Bearer ${token}" -H "x-tenant: aquasphere"`
    },

    // 4. CUSTOMERS
    {
      name: 'GET /api/v1/customers (Negative: Unauthorized)',
      type: 'negative',
      expectedStatus: 401,
      curlCmd: `curl -s -w "%{http_code}" "${BASE_URL}/api/v1/customers"`
    },
    {
      name: 'GET /api/v1/customers (Positive: Authorized)',
      type: 'positive',
      expectedStatus: 200,
      curlCmd: `curl -s -w "%{http_code}" "${BASE_URL}/api/v1/customers" -H "Authorization: Bearer ${token}" -H "x-tenant: aquasphere"`
    },
    {
      name: 'GET /api/v1/customers/:id (Positive: Existing ID)',
      type: 'positive',
      expectedStatus: 200,
      curlCmd: `curl -s -w "%{http_code}" "${BASE_URL}/api/v1/customers/${sampleCustomer?.id || 'none'}" -H "Authorization: Bearer ${token}" -H "x-tenant: aquasphere"`
    },
    {
      name: 'GET /api/v1/customers/:id (Negative: Non-existent ID)',
      type: 'negative',
      expectedStatus: 404,
      curlCmd: `curl -s -w "%{http_code}" "${BASE_URL}/api/v1/customers/00000000-0000-0000-0000-000000000000" -H "Authorization: Bearer ${token}" -H "x-tenant: aquasphere"`
    },
    {
      name: 'POST /api/v1/customers (Negative: Validation failure, missing name)',
      type: 'negative',
      expectedStatus: 400,
      curlCmd: `curl -s -w "%{http_code}" -X POST "${BASE_URL}/api/v1/customers" -H "Authorization: Bearer ${token}" -H "x-tenant: aquasphere" -H "Content-Type: application/json" -d '{"phone":"03001112223"}'`
    },

    // 5. VENDORS
    {
      name: 'GET /api/v1/vendors (Positive: Authorized)',
      type: 'positive',
      expectedStatus: 200,
      curlCmd: `curl -s -w "%{http_code}" "${BASE_URL}/api/v1/vendors" -H "Authorization: Bearer ${token}" -H "x-tenant: aquasphere"`
    },
    {
      name: 'GET /api/v1/vendors/:id (Positive: Existing ID)',
      type: 'positive',
      expectedStatus: 200,
      curlCmd: `curl -s -w "%{http_code}" "${BASE_URL}/api/v1/vendors/${sampleVendor?.id || 'none'}" -H "Authorization: Bearer ${token}" -H "x-tenant: aquasphere"`
    },
    {
      name: 'GET /api/v1/vendors/:id (Negative: Non-existent ID)',
      type: 'negative',
      expectedStatus: 404,
      curlCmd: `curl -s -w "%{http_code}" "${BASE_URL}/api/v1/vendors/00000000-0000-0000-0000-000000000000" -H "Authorization: Bearer ${token}" -H "x-tenant: aquasphere"`
    },
    {
      name: 'POST /api/v1/vendors (Negative: Validation failure, missing name)',
      type: 'negative',
      expectedStatus: 400,
      curlCmd: `curl -s -w "%{http_code}" -X POST "${BASE_URL}/api/v1/vendors" -H "Authorization: Bearer ${token}" -H "x-tenant: aquasphere" -H "Content-Type: application/json" -d '{"phone":"03001234567"}'`
    },

    // 6. ITEMS
    {
      name: 'GET /api/v1/items (Positive: Authorized)',
      type: 'positive',
      expectedStatus: 200,
      curlCmd: `curl -s -w "%{http_code}" "${BASE_URL}/api/v1/items" -H "Authorization: Bearer ${token}" -H "x-tenant: aquasphere"`
    },
    {
      name: 'GET /api/v1/items/:id (Positive: Existing ID)',
      type: 'positive',
      expectedStatus: 200,
      curlCmd: `curl -s -w "%{http_code}" "${BASE_URL}/api/v1/items/${sampleItem?.id || 'none'}" -H "Authorization: Bearer ${token}" -H "x-tenant: aquasphere"`
    },
    {
      name: 'POST /api/v1/items (Negative: Validation failure, missing name)',
      type: 'negative',
      expectedStatus: 400,
      curlCmd: `curl -s -w "%{http_code}" -X POST "${BASE_URL}/api/v1/items" -H "Authorization: Bearer ${token}" -H "x-tenant: aquasphere" -H "Content-Type: application/json" -d '{}'`
    },

    // 7. PRODUCTION
    {
      name: 'GET /api/v1/production (Positive: Batches list)',
      type: 'positive',
      expectedStatus: 200,
      curlCmd: `curl -s -w "%{http_code}" "${BASE_URL}/api/v1/production" -H "Authorization: Bearer ${token}" -H "x-tenant: aquasphere"`
    },
    {
      name: 'GET /api/v1/production/stats (Positive)',
      type: 'positive',
      expectedStatus: 200,
      curlCmd: `curl -s -w "%{http_code}" "${BASE_URL}/api/v1/production/stats" -H "Authorization: Bearer ${token}" -H "x-tenant: aquasphere"`
    },

    // 8. PURCHASES
    {
      name: 'GET /api/v1/purchases (Positive: Purchases list)',
      type: 'positive',
      expectedStatus: 200,
      curlCmd: `curl -s -w "%{http_code}" "${BASE_URL}/api/v1/purchases" -H "Authorization: Bearer ${token}" -H "x-tenant: aquasphere"`
    },
    {
      name: 'POST /api/v1/purchases (Negative: Validation failure, missing items)',
      type: 'negative',
      expectedStatus: 400,
      curlCmd: `curl -s -w "%{http_code}" -X POST "${BASE_URL}/api/v1/purchases" -H "Authorization: Bearer ${token}" -H "x-tenant: aquasphere" -H "Content-Type: application/json" -d '{}'`
    },

    // 9. ORDERS
    {
      name: 'GET /api/v1/orders (Positive: Orders list)',
      type: 'positive',
      expectedStatus: 200,
      curlCmd: `curl -s -w "%{http_code}" "${BASE_URL}/api/v1/orders" -H "Authorization: Bearer ${token}" -H "x-tenant: aquasphere"`
    },
    {
      name: 'POST /api/v1/orders (Negative: Validation failure, missing customer)',
      type: 'negative',
      expectedStatus: 400,
      curlCmd: `curl -s -w "%{http_code}" -X POST "${BASE_URL}/api/v1/orders" -H "Authorization: Bearer ${token}" -H "x-tenant: aquasphere" -H "Content-Type: application/json" -d '{}'`
    },

    // 10. EXPENSES
    {
      name: 'GET /api/v1/expenses (Positive: Expenses list)',
      type: 'positive',
      expectedStatus: 200,
      curlCmd: `curl -s -w "%{http_code}" "${BASE_URL}/api/v1/expenses" -H "Authorization: Bearer ${token}" -H "x-tenant: aquasphere"`
    },
    {
      name: 'POST /api/v1/expenses (Negative: Validation failure, missing amount)',
      type: 'negative',
      expectedStatus: 400,
      curlCmd: `curl -s -w "%{http_code}" -X POST "${BASE_URL}/api/v1/expenses" -H "Authorization: Bearer ${token}" -H "x-tenant: aquasphere" -H "Content-Type: application/json" -d '{"category":"Fuel"}'`
    },

    // 11. SPOT SALES / COUNTER SALES
    {
      name: 'GET /api/v1/spot-sales (Positive: Spot sales list)',
      type: 'positive',
      expectedStatus: 200,
      curlCmd: `curl -s -w "%{http_code}" "${BASE_URL}/api/v1/spot-sales" -H "Authorization: Bearer ${token}" -H "x-tenant: aquasphere"`
    },
    {
      name: 'POST /api/v1/spot-sales (Negative: Credit sale without customer)',
      type: 'negative',
      expectedStatus: 400,
      curlCmd: `curl -s -w "%{http_code}" -X POST "${BASE_URL}/api/v1/spot-sales" -H "Authorization: Bearer ${token}" -H "x-tenant: aquasphere" -H "Content-Type: application/json" -d '{"productType":"CUSTOM","productQty":1,"creditAmount":500}'`
    },

    // 12. BOTTLE FLEET TRACKING
    {
      name: 'GET /api/v1/bottles/summary (Positive)',
      type: 'positive',
      expectedStatus: 200,
      curlCmd: `curl -s -w "%{http_code}" "${BASE_URL}/api/v1/bottles/summary" -H "Authorization: Bearer ${token}" -H "x-tenant: aquasphere"`
    },
    {
      name: 'GET /api/v1/bottles/transactions (Positive)',
      type: 'positive',
      expectedStatus: 200,
      curlCmd: `curl -s -w "%{http_code}" "${BASE_URL}/api/v1/bottles/transactions" -H "Authorization: Bearer ${token}" -H "x-tenant: aquasphere"`
    },

    // 13. DAILY CLOSE
    {
      name: 'GET /api/v1/daily-close/status (Positive with date param)',
      type: 'positive',
      expectedStatus: 200,
      curlCmd: `curl -s -w "%{http_code}" "${BASE_URL}/api/v1/daily-close/status?date=2026-08-29" -H "Authorization: Bearer ${token}" -H "x-tenant: aquasphere"`
    },
    {
      name: 'GET /api/v1/daily-close/status (Negative: missing date param)',
      type: 'negative',
      expectedStatus: 400,
      curlCmd: `curl -s -w "%{http_code}" "${BASE_URL}/api/v1/daily-close/status" -H "Authorization: Bearer ${token}" -H "x-tenant: aquasphere"`
    },
    {
      name: 'GET /api/v1/daily-close/history (Positive)',
      type: 'positive',
      expectedStatus: 200,
      curlCmd: `curl -s -w "%{http_code}" "${BASE_URL}/api/v1/daily-close/history" -H "Authorization: Bearer ${token}" -H "x-tenant: aquasphere"`
    },

    // 14. ANALYTICS & DASHBOARD
    {
      name: 'GET /api/v1/analytics/dashboard (Positive)',
      type: 'positive',
      expectedStatus: 200,
      curlCmd: `curl -s -w "%{http_code}" "${BASE_URL}/api/v1/analytics/dashboard" -H "Authorization: Bearer ${token}" -H "x-tenant: aquasphere"`
    },
    {
      name: 'GET /api/v1/analytics/production-dashboard (Positive)',
      type: 'positive',
      expectedStatus: 200,
      curlCmd: `curl -s -w "%{http_code}" "${BASE_URL}/api/v1/analytics/production-dashboard" -H "Authorization: Bearer ${token}" -H "x-tenant: aquasphere"`
    },
    {
      name: 'GET /api/v1/analytics/purchasing-summary (Positive)',
      type: 'positive',
      expectedStatus: 200,
      curlCmd: `curl -s -w "%{http_code}" "${BASE_URL}/api/v1/analytics/purchasing-summary" -H "Authorization: Bearer ${token}" -H "x-tenant: aquasphere"`
    },

    // 15. REPORTS
    {
      name: 'GET /api/v1/reports/sales (Positive)',
      type: 'positive',
      expectedStatus: 200,
      curlCmd: `curl -s -w "%{http_code}" "${BASE_URL}/api/v1/reports/sales" -H "Authorization: Bearer ${token}" -H "x-tenant: aquasphere"`
    },
    {
      name: 'GET /api/v1/reports/expenses (Positive)',
      type: 'positive',
      expectedStatus: 200,
      curlCmd: `curl -s -w "%{http_code}" "${BASE_URL}/api/v1/reports/expenses" -H "Authorization: Bearer ${token}" -H "x-tenant: aquasphere"`
    },
    {
      name: 'GET /api/v1/reports/invalid_report_type (Negative: Unsupported type)',
      type: 'negative',
      expectedStatus: 400,
      curlCmd: `curl -s -w "%{http_code}" "${BASE_URL}/api/v1/reports/invalid_report_type" -H "Authorization: Bearer ${token}" -H "x-tenant: aquasphere"`
    },

    // 16. AUDIT LOGS
    {
      name: 'GET /api/v1/audit-logs (Positive)',
      type: 'positive',
      expectedStatus: 200,
      curlCmd: `curl -s -w "%{http_code}" "${BASE_URL}/api/v1/audit-logs" -H "Authorization: Bearer ${token}" -H "x-tenant: aquasphere"`
    },

    // 17. ADMIN DASHBOARD & ALERTS
    {
      name: 'GET /api/v1/admin/dashboard (Positive)',
      type: 'positive',
      expectedStatus: 200,
      curlCmd: `curl -s -w "%{http_code}" "${BASE_URL}/api/v1/admin/dashboard" -H "Authorization: Bearer ${token}" -H "x-tenant: aquasphere"`
    },
    {
      name: 'GET /api/v1/admin/cash-summary (Positive)',
      type: 'positive',
      expectedStatus: 200,
      curlCmd: `curl -s -w "%{http_code}" "${BASE_URL}/api/v1/admin/cash-summary" -H "Authorization: Bearer ${token}" -H "x-tenant: aquasphere"`
    },
    {
      name: 'GET /api/v1/admin/customer-alerts (Positive)',
      type: 'positive',
      expectedStatus: 200,
      curlCmd: `curl -s -w "%{http_code}" "${BASE_URL}/api/v1/admin/customer-alerts" -H "Authorization: Bearer ${token}" -H "x-tenant: aquasphere"`
    }
  ];

  for (const test of tests) {
    runTest(test);
  }

  console.log('\n======================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${tests.length})`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runCurlTests();
