import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { prisma, closeDatabaseConnections } = await import('../src/config/db.js');

const CUSTOMER_TYPES = ['HOME', 'CORPORATE', 'COMMERCIAL', 'DISTRIBUTOR'];
const AREAS = ['Gulberg', 'DHA Phase 5', 'Model Town', 'Johar Town', 'Cantt', 'Bahria Town', 'Faisal Town', 'Cavalry Ground'];

async function seedCustomersForTenant(prefix) {
  console.log(`\n🌱 Seeding 123 customers for [${prefix}]...`);
  const modelName = `${prefix}Customer`;

  const created = [];
  for (let i = 1; i <= 123; i++) {
    const pad = String(i).padStart(3, '0');
    const phone = prefix === 'aquasphere' ? `0300123${pad}` : `0321123${pad}`;
    const name = `Test Customer ${pad} (${prefix === 'aquasphere' ? 'AS' : 'WD'})`;
    const area = AREAS[i % AREAS.length];
    const type = CUSTOMER_TYPES[i % CUSTOMER_TYPES.length];
    const currentBalance = (i % 3 === 0) ? (i * 250) : 0;
    const deposit = (i % 2 === 0) ? 1500 : 0;

    const tenantSpecific = prefix === 'aquasphere'
      ? {
          buys19L: true,
          qty19L: (i % 5) + 1,
          buys05LPet: i % 2 === 0,
          qty05LPet: (i % 2 === 0) ? 12 : 0,
          buys15LPet: i % 3 === 0,
          qty15LPet: (i % 3 === 0) ? 6 : 0,
          cachedBottleBalance: (i % 4) + 1
        }
      : {
          buysPure05L: true,
          qtyPure05L: (i % 4) + 1,
          buysPure15L: i % 2 === 0,
          qtyPure15L: (i % 2 === 0) ? 6 : 0,
          buysMix05L: i % 3 === 0,
          qtyMix05L: (i % 3 === 0) ? 12 : 0,
          buysMix15L: false,
          qtyMix15L: 0,
          cachedBottleBalance: 0
        };

    created.push(
      prisma[modelName].upsert({
        where: { phone },
        update: {
          name,
          address: `House #${i}, Street ${((i * 3) % 20) + 1}, ${area}`,
          type,
          deposit,
          currentBalance,
          creditDuration: (i % 15) + 1,
          remarks: `Auto-seeded pagination test record #${i}`,
          archivedAt: null,
          ...tenantSpecific
        },
        create: {
          name,
          phone,
          address: `House #${i}, Street ${((i * 3) % 20) + 1}, ${area}`,
          type,
          deposit,
          currentBalance,
          creditDuration: (i % 15) + 1,
          remarks: `Auto-seeded pagination test record #${i}`,
          archivedAt: null,
          ...tenantSpecific
        }
      })
    );
  }

  // Execute in batches of 25 to respect pool limits
  for (let b = 0; b < created.length; b += 25) {
    const batch = created.slice(b, b + 25);
    await prisma.$transaction(batch);
  }

  const totalCount = await prisma[modelName].count({ where: { archivedAt: null } });
  console.log(`✅ [${prefix}] seeding completed! Total active customers in database: ${totalCount}`);
}

async function main() {
  try {
    await seedCustomersForTenant('aquasphere');
    await seedCustomersForTenant('wadaana');
    console.log('\n🎉 Successfully seeded 123 customers for both AquaSphere and Wadaana!');
  } catch (err) {
    console.error('❌ Error seeding customers:', err);
    process.exit(1);
  } finally {
    await closeDatabaseConnections();
  }
}

main();
