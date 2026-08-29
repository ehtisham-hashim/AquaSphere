/**
 * Self-test verification script for testing core backend endpoints.
 * Configurable via PORT environment variable.
 *
 * @returns {Promise<void>}
 */
async function runTests() {
  console.log('--- Starting Backend Self-Test ---');
  const PORT = process.env.PORT || 3000;
  let hasFailure = false;

  const endpoints = [
    { method: 'GET', path: '/' },
    { method: 'GET', path: '/api-docs/' }
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(`http://localhost:${PORT}${ep.path}`);
      if (res.ok) {
        console.log(`[PASS] ${ep.method} ${ep.path} -> Status: ${res.status}`);
      } else {
        console.error(`[FAIL] ${ep.method} ${ep.path} -> Status: ${res.status} (Non-OK response)`);
        hasFailure = true;
      }
    } catch (err) {
      console.error(`[FAIL] ${ep.method} ${ep.path} -> ${err.message} (Server connection failed on port ${PORT})`);
      hasFailure = true;
    }
  }

  console.log('--- Backend Self-Test Complete ---');
  if (hasFailure) {
    process.exit(1);
  }
}

runTests().catch(() => process.exit(1));
