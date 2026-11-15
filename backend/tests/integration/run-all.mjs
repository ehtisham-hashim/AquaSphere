// backend/tests/integration/run-all.mjs
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const suites = [
  { name: 'Suite 1: Procurement, Raw Material Inflow & Vendor AP', file: '01-procurement-vendor-ap.test.mjs' },
  { name: 'Suite 2: Production BOM Deductions, Yield & Scrap Sparing', file: '02-production-bom-yield-scrap.test.mjs' },
  { name: 'Suite 3: Walk-in Counter Sales, Base Units & Cash Drawer', file: '03-counter-sales-cash-drawer.test.mjs' },
  { name: 'Suite 4: Delivery Orders, Custody Float & Debt Clearance', file: '04-delivery-order-custody-debt.test.mjs' },
  { name: 'Suite 5: Transport Vehicle Expenses & Daily Close Lock Guards', file: '05-transport-fleet-daily-close-lock.test.mjs' },
  { name: 'Suite 6: Unified Cross-Page Ripple Invariants Across 7 Pages', file: '06-cross-page-ripple-invariants.test.mjs' },
  { name: 'Suite 7: Wadaana Tenant Isolation & Loose Bottle Trading', file: '07-wadaana-tenant-isolation.test.mjs' }
];

console.log('\n========================================================================');
console.log('🚀 LIVE POSTGRESQL INTEGRATION TEST RUNNER (NEON PRODUCTION DATABASE)');
console.log('========================================================================\n');

const runSuite = (suite) => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const suitePath = path.join(__dirname, suite.file);
    console.log(`▶ Running ${suite.name} (${suite.file})...`);

    const child = spawn(process.execPath, [suitePath], {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '../..')
    });

    child.on('close', (code) => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      if (code === 0) {
        console.log(`✔ ${suite.name} completed in ${elapsed}s\n`);
        resolve({ ...suite, elapsed, passed: true });
      } else {
        console.error(`✖ ${suite.name} failed with exit code ${code} (${elapsed}s)\n`);
        resolve({ ...suite, elapsed, passed: false, code });
      }
    });

    child.on('error', (err) => {
      console.error(`✖ ${suite.name} encountered spawn error:`, err);
      reject(err);
    });
  });
};

const runAll = async () => {
  const overallStart = Date.now();
  const results = [];

  for (const suite of suites) {
    const res = await runSuite(suite);
    results.push(res);
  }

  const overallElapsed = ((Date.now() - overallStart) / 1000).toFixed(2);
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;

  console.log('\n========================================================================');
  console.log('📊 LIVE POSTGRESQL INTEGRATION TEST SUMMARY');
  console.log('========================================================================');
  console.log(`Total Suites Run : ${suites.length}`);
  console.log(`Suites Passed    : ${passedCount}`);
  console.log(`Suites Failed    : ${failedCount}`);
  console.log(`Total Duration   : ${overallElapsed}s\n`);

  results.forEach(r => {
    const mark = r.passed ? '✔' : '✖';
    console.log(`  ${mark} ${r.name.padEnd(65)} [${r.elapsed}s]`);
  });

  console.log('========================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
};

runAll().catch(err => {
  console.error('Fatal runner error:', err);
  process.exit(1);
});
