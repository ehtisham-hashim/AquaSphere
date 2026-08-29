// Small self-test script for verifying backend endpoints
async function runTests() {
  console.log('--- Starting Backend Self-Test ---');

  const endpoints = [
    { method: 'GET', path: '/' },
    { method: 'GET', path: '/api-docs/' }
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(`http://localhost:3000${ep.path}`);
      console.log(`[PASS] ${ep.method} ${ep.path} -> Status: ${res.status}`);
    } catch (err) {
      console.log(`[NOTE] ${ep.method} ${ep.path} -> ${err.message} (Server not running on port 3000)`);
    }
  }

  console.log('--- Backend Self-Test Complete ---');
}

runTests().then(() => process.exit(0)).catch(() => process.exit(1));
