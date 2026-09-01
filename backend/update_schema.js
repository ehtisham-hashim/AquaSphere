const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// Replace function to add indexes before @@map
function addIndexBeforeMap(modelMapName, indexStrings) {
  const mapStr = `@@map("${modelMapName}")`;
  const indexesStr = indexStrings.map(idx => `  ${idx}`).join('\n');
  
  if (schema.includes(indexesStr)) return; // Already added
  
  schema = schema.replace(
    new RegExp(`\\s*@@map\\("${modelMapName}"\\)`),
    `\n${indexesStr}\n  @@map("${modelMapName}")`
  );
}

// Aquasphere
addIndexBeforeMap('items', ['@@index([name])', '@@index([type])']);
addIndexBeforeMap('vendors', ['@@index([name])']);
addIndexBeforeMap('users', ['@@index([role])', '@@index([is_active])']);
addIndexBeforeMap('orders', ['@@index([delivery_status, payment_status])']);
addIndexBeforeMap('spot_sales', ['@@index([customer_id, created_at(sort: Desc)])']);

// Wadaana
// But wait, the Wadaana maps might be the same. 
// e.g. @@map("items") @@schema("wadaana")
// If they have the same @@map, my regex will only replace the first one.
// Let's use schema specific replacement.
