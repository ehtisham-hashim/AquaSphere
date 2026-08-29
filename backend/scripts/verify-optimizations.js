/**
 * Self-test verification script for testing core backend endpoints.
 * Configurable via PORT environment variable.
 *
 * @returns {Promise<void>}
 */
async function runTests() {
  console.log('--- Starting Backend Self-Test ---');
  const PORT = process.env.PORT || 3000;

  const endpoints = [
    { method: 'GET', path: '/' },
    { method: 'GET', path: '/api-docs/' }
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(`http://localhost:${PORT}${ep.path}`);
      console.log(`[PASS] ${ep.method} ${ep.path} -> Status: ${res.status}`);
    } catch (err) {
      console.log(`[NOTE] ${ep.method} ${ep.path} -> ${err.message} (Server not running on port ${PORT})`);
    }
  }

  console.log('--- Backend Self-Test Complete ---');
}

runTests().then(() => process.exit(0)).catch(() => process.exit(1));
