import 'dotenv/config';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from '@prisma/client';
const { PrismaClient } = pkg;

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;

// Neon-optimised pool settings — prevents "Connection terminated unexpectedly"
const pool = new Pool({
  connectionString,
  max: parseInt(process.env.DATABASE_POOL_SIZE || '5', 10), // keep low for Neon free tier
  idleTimeoutMillis: 10000, // close idle connections after 10s
  connectionTimeoutMillis: 10000, // fail fast if can't connect in 10s
  allowExitOnIdle: true     // allow process to exit when pool is idle
});

// Reconnect on unexpected termination
pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err.message);
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn']
});

export async function closeDatabaseConnections() {
  await prisma.$disconnect();
  await pool.end();
}
