# AquaSphere OS — Production Deployment Guide (Dokploy on Contabo VPS)

## Table of Contents

- [1. Architecture & Free-Tier Stack Overview](#1-architecture--free-tier-stack-overview)
- [2. Contabo VPS Provisioning & Dokploy Setup](#2-contabo-vps-provisioning--dokploy-setup)
- [3. Backend Dockerization & Configuration](#3-backend-dockerization--configuration)
- [4. Traefik Reverse Proxy & Network Configuration](#4-traefik-reverse-proxy--network-configuration)
- [5. Database Connection (Neon Free Tier Optimization)](#5-database-connection-neon-free-tier-optimization)
- [6. Frontend Deployment (Dokploy or Vercel)](#6-frontend-deployment-dokploy-or-vercel)
- [7. Multi-Tenant Cookies & CORS Configuration](#7-multi-tenant-cookies--cors-configuration)
- [8. Process Lifecycle & Graceful Shutdown](#8-process-lifecycle--graceful-shutdown)
- [9. Production Environment Variables Checklist](#9-production-environment-variables-checklist)
- [10. Maintenance, Backups & Security Checklist](#10-maintenance-backups--security-checklist)

---

## 1. Architecture & Free-Tier Stack Overview

AquaSphere OS is architected to run with high stability and near-zero infrastructure cost by pairing **Contabo VPS + Dokploy** with managed free-tier cloud services:

```
                  ┌───────────────────────────────────────────────────────────┐
                  │                      CONTABO VPS                          │
                  │                                                           │
                  │   ┌───────────────────────────────────────────────────┐   │
                  │   │           Traefik Reverse Proxy (Dokploy)         │   │
                  │   │       (Auto Let's Encrypt SSL, Port 80/443)       │   │
                  │   └───────────────┬───────────────────────────┬───────┘   │
                  │                   │                           │           │
                  │      ┌────────────▼─────────────┐   ┌─────────▼────────┐  │
                  │      │  Backend API Container   │   │  Frontend React  │  │
                  │      │    (Node 20 Express)     │   │   (Vite Static)  │  │
                  │      └────────────┬─────────────┘   └──────────────────┘  │
                  └───────────────────┼───────────────────────────────────────┘
                                      │
              ┌───────────────────────┴───────────────────────┐
              │                                               │
    ┌─────────▼───────────────┐                     ┌─────────▼─────────────┐
    │    Neon PostgreSQL      │                     │  Cloudinary Storage   │
    │  (Serverless Free Tier) │                     │      (Free Tier)      │
    │  • Max 5 Pool Conn      │                     │  • Direct Memory-to-  │
    │  • pgBouncer Pooling    │                     │    Cloud Streaming    │
    └─────────────────────────┘                     └───────────────────────┘
```

| Layer | Provider / Host | Plan / Tier | Cost |
| :--- | :--- | :--- | :--- |
| **Server (Host)** | **Contabo Cloud VPS 4** | 4 vCPU, 8 GB RAM, 100 GB NVMe | ~$6/month |
| **PaaS / Orchestration** | **Dokploy (Self-Hosted)** | Open-Source Docker Manager | $0/month |
| **Backend API** | Dokploy Docker Container | Node.js 20 LTS (Express 5) | $0 (runs on VPS) |
| **Frontend UI** | Dokploy Static / Vercel | React 19 + Vite | $0 (free tier) |
| **Database** | **Neon PostgreSQL** | Serverless Free Tier (0.25 Compute) | $0 (free tier) |
| **File Storage** | **Cloudinary** | Free Tier (25 GB credits/mo) | $0 (free tier) |
| **Total Monthly Cost** | | | **~$6 / month** |

---

## 2. Contabo VPS Provisioning & Dokploy Setup

### 2.1 Initial Server Setup (Ubuntu 24.04 LTS)

SSH into your freshly provisioned Contabo VPS:

```bash
ssh root@<YOUR_CONTABO_IP>
```

Update system packages and configure basic firewall:

```bash
apt update && apt upgrade -y
apt install -y curl ufw git htop fail2ban

# Configure UFW firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP (Traefik)
ufw allow 443/tcp   # HTTPS (Traefik)
ufw allow 3000/tcp  # Dokploy Dashboard (Default setup port)
ufw --force enable
```

### 2.2 Install Dokploy

Run the official one-line Dokploy installation script:

```bash
curl -sSL https://dokploy.com/install.sh | sh
```

Once installation finishes, open your browser and navigate to:
`http://<YOUR_CONTABO_IP>:3000`

Create your initial administrative account and configure your domain name (e.g. `dokploy.yourdomain.com`).

---

## 3. Backend Dockerization & Configuration

### 3.1 Production Multi-Stage Dockerfile

Create `backend/Dockerfile` in your repository:

```dockerfile
# Step 1: Dependencies & Prisma Generation
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json pnpm-lock.yaml* ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY prisma ./prisma/
RUN pnpm prisma generate
COPY . .

# Step 2: Minimal Production Image
FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src
COPY --from=builder /app/package.json ./package.json

# Non-root user for security
USER node
EXPOSE 3000

# Run migrations automatically then start Express server
CMD ["sh", "-c", "npx prisma migrate deploy && node src/index.js"]
```

### 3.2 Deploying in Dokploy Dashboard

1. Open Dokploy $\rightarrow$ **Projects** $\rightarrow$ Create Project `AquaSphere`.
2. Click **Add Service** $\rightarrow$ **Application** $\rightarrow$ select your GitHub Repository.
3. Set **Build Type**: `Dockerfile`.
4. Set **Dockerfile Path**: `backend/Dockerfile`.
5. Set **Context Path**: `backend`.
6. Add **Domain**: `api.aquasphere.yourdomain.com` with **Certificate**: `Let's Encrypt`.
7. Set **Container Port**: `3000`.

---

## 4. Traefik Reverse Proxy & Network Configuration

Dokploy uses **Traefik** to route external HTTPS traffic to your containers. To prevent reverse-proxy errors:

### 4.1 Express Proxy Trust Setting (`backend/src/index.js`)

Express must trust Traefik's proxy headers. If missing, `express-rate-limit` will identify Traefik's internal IP (`172.18.0.x`) for all users, locking out every employee simultaneously after 300 requests:

```javascript
// backend/src/index.js
app.set('trust proxy', 1);
```

### 4.2 Server-Sent Events (SSE) Buffering Fix (`analytics.controller.js`)

Traefik buffers HTTP responses by default. For the live dashboard SSE stream (`/api/v1/analytics/dashboard/stream`) to stay connected without hanging or dropping:

```javascript
// backend/src/controllers/analytics.controller.js
export const streamDashboardAnalytics = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Tells Traefik not to buffer stream packets

  cachedDashboardData[prefix] = await computeDashboardAnalytics(prefix);
  res.write(`data: ${JSON.stringify({ success: true, data: cachedDashboardData[prefix] })}\n\n`);

  sseClients[prefix].push(res);

  const heartbeat = setInterval(() => res.write(':heartbeat\n\n'), 30000);
  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients[prefix] = sseClients[prefix].filter(client => client !== res);
  });
});
```

---

## 5. Database Connection (Neon Free Tier Optimization)

Because we are on the **Neon Serverless Free Tier**, we must obey Neon's connection limits and network behavior:

### 5.1 Neon Connection Pooler URL

Neon provides two connection strings:
1. **Direct Connection**: `ep-xyz.region.aws.neon.tech/aquasphere` (Bypasses pooler, strictly max 5 connections).
2. **Pooled Connection (pgBouncer)**: `ep-xyz-pooler.region.aws.neon.tech/aquasphere` (Recommended for production).

Always use the **Pooled URL** in your Dokploy `DATABASE_URL` environment variable:

```env
DATABASE_URL=postgresql://user:password@ep-xyz-pooler.region.aws.neon.tech/aquasphere?sslmode=require&pgbouncer=true
```

### 5.2 Neon-Optimized `db.js` Setup

```javascript
// backend/src/config/db.js
import 'dotenv/config';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from '@prisma/client';
const { PrismaClient } = pkg;

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;

// Neon free tier: keep max connections at 5 to stay strictly within limits
const pool = new Pool({
  connectionString,
  max: parseInt(process.env.DATABASE_POOL_SIZE || '5', 10),
  idleTimeoutMillis: 10000,        // Close idle connections after 10s
  connectionTimeoutMillis: 10000,  // Fail fast if connection cannot be acquired
  allowExitOnIdle: true
});

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
```

---

## 6. Frontend Deployment (Dokploy or Vercel)

### Option A: Deploy on Dokploy (Self-Hosted on Same VPS)

1. In Dokploy, click **Add Service** $\rightarrow$ **Application**.
2. Select GitHub repo, set **Root Directory**: `frontend`.
3. Set **Build Type**: `Nixpacks` or `Static Vite`.
4. Build Command: `pnpm run build`.
5. Publish Directory: `dist`.
6. Set Domain: `app.aquasphere.yourdomain.com`.
7. Add Environment Variable:
   ```env
   VITE_API_URL=https://api.aquasphere.yourdomain.com/api/v1
   ```

### Option B: Deploy on Vercel (Free Tier)

1. Connect GitHub repository to Vercel.
2. Root Directory: `frontend`.
3. Framework Preset: `Vite`.
4. Environment Variables:
   ```env
   VITE_API_URL=https://api.aquasphere.yourdomain.com/api/v1
   ```
5. Custom Domain: `app.aquasphere.yourdomain.com`.

---

## 7. Multi-Tenant Cookies & CORS Configuration

### 7.1 Cross-Subdomain Cookie Configuration (`backend/src/controllers/auth.controller.js`)

When frontend (`app.yourdomain.com`) and backend (`api.yourdomain.com`) are on different subdomains:

```javascript
const isProduction = process.env.NODE_ENV === 'production';

const cookieOptions = {
  httpOnly: true,
  secure: isProduction, // Requires HTTPS (Traefik SSL)
  sameSite: isProduction ? 'none' : 'lax', // 'none' is mandatory for cross-subdomain fetch
  maxAge: 24 * 60 * 60 * 1000 // 1 day
};
```

### 7.2 Backend CORS Setup (`backend/src/index.js`)

```javascript
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://app.aquasphere.yourdomain.com',
  'http://localhost:5173'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true
}));
```

---

## 8. Process Lifecycle & Graceful Shutdown

Dokploy sends a `SIGTERM` signal before killing containers during redeployments. Without graceful shutdown, active transactions are abruptly severed, leaving locked rows or dirty states.

Add this handler in `backend/src/index.js`:

```javascript
// backend/src/index.js
import { closeDatabaseConnections } from './config/db.js';

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

const shutdown = async (signal) => {
  console.log(`Received ${signal}. Gracefully closing connections...`);
  server.close(async () => {
    await closeDatabaseConnections();
    console.log('HTTP server and Database connection pool closed.');
    process.exit(0);
  });

  // Force close if lingering queries exceed 10s
  setTimeout(() => {
    console.error('Shutdown timeout exceeded. Forcing exit.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
```

---

## 9. Production Environment Variables Checklist

Set these environment variables inside Dokploy for the **Backend Service**:

| Variable | Example Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables production optimizations & logs |
| `PORT` | `3000` | Internal container port exposed to Traefik |
| `DATABASE_URL` | `postgresql://user:pass@ep-xyz-pooler.region.aws.neon.tech/aquasphere?sslmode=require&pgbouncer=true` | Pooled Neon PostgreSQL connection string |
| `DATABASE_POOL_SIZE` | `5` | Set to 5 for Neon free tier |
| `JWT_SECRET` | `super_secure_random_64_char_secret_key` | Secret for signing auth tokens |
| `FRONTEND_URL` | `https://app.aquasphere.yourdomain.com` | Allowed CORS frontend origin |
| `CLOUDINARY_CLOUD_NAME`| `aquasphere-cdn` | Cloudinary tenant account |
| `CLOUDINARY_API_KEY` | `123456789012345` | Cloudinary API Key |
| `CLOUDINARY_API_SECRET`| `abcdefghijklmnopqrstuvwxyz` | Cloudinary API Secret |

---

## 10. Maintenance, Backups & Security Checklist

### 10.1 Automated Neon Database Backup Script (Contabo Cron)

Even on Neon free tier, keep daily off-site backups saved directly to your Contabo VPS disk storage (100 GB NVMe available):

Create `/root/backup-db.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/root/db_backups"
mkdir -p $BACKUP_DIR
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="$BACKUP_DIR/aquasphere_$TIMESTAMP.sql.gz"

# Dump using direct Neon connection (replace with your direct URL)
pg_dump "postgresql://user:pass@ep-xyz.region.aws.neon.tech/aquasphere?sslmode=require" | gzip > $FILENAME

# Keep only last 14 days of backups
find $BACKUP_DIR -name "aquasphere_*.sql.gz" -mtime +14 -exec rm {} \;
echo "Backup created: $FILENAME"
```

Make executable and add to crontab:

```bash
chmod +x /root/backup-db.sh
(crontab -l 2>/dev/null; echo "0 2 * * * /root/backup-db.sh >> /var/log/cron-backup.log 2>&1") | crontab -
```

### 10.2 Day 1 Production Verification

Once deployed:
1. **Health Check**: Visit `https://api.aquasphere.yourdomain.com/` $\rightarrow$ should return `{ status: "ok" }`.
2. **Swagger Console**: Visit `https://api.aquasphere.yourdomain.com/api-docs` $\rightarrow$ verify all endpoints respond properly.
3. **Live Dashboard SSE**: Open browser DevTools $\rightarrow$ Network $\rightarrow$ inspect `/api/v1/analytics/dashboard/stream` $\rightarrow$ verify packets stream continuously with status `200` without connection drops.
4. **Log Inspection**: In Dokploy dashboard $\rightarrow$ **Logs** $\rightarrow$ verify Morgan production logs output cleanly formatted JSON entries.
