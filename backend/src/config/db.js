import 'dotenv/config';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from '@prisma/client';
const { PrismaClient } = pkg;

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;

// Neon-optimised pool settings — keeps connections warm and avoids reconnection penalty
const pool = new Pool({
  connectionString,
  max: parseInt(process.env.DATABASE_POOL_SIZE || '15', 10), // Allow up to 15 concurrent connections
  idleTimeoutMillis: 60000, // Keep idle connections alive for 60s to prevent constant SSL cold-starts
  connectionTimeoutMillis: 10000, // 10s connection timeout
  allowExitOnIdle: false,
  keepAlive: true
});

// Reconnect on unexpected termination
pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err.message);
});

// Keep-alive ping every 4 minutes to prevent Neon serverless scale-to-zero cold starts
if (process.env.DATABASE_URL) {
  setInterval(async () => {
    try {
      await pool.query('SELECT 1');
    } catch {
      // Ignore background keepalive errors
    }
  }, 4 * 60 * 1000).unref();
}

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn']
});

export async function closeDatabaseConnections() {
  await prisma.$disconnect();
  await pool.end();
}
