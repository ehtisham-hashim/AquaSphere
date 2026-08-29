# AquaSphere OS — Optimization Report

## Executive Summary

Backend slowdown after ~15 minutes is caused by **three compounding issues**: (1) `getItems()` runs a full-table consolidation migration (`consolidateDuplicateFinishedGoods`) on **every single GET request** (item.controller.js:100), which scans all items and performs cascading updateMany across 6 tables; (2) `getSpotSales()` runs an "auto-heal" loop querying 20 recent sales × 1 findFirst each = N+1 + writes on every GET (spotSale.controller.js:31-101); (3) `getDailyCloseHistory()` fires N sequential `aggregate` + `findMany` + `count` queries per closed day inside a `Promise.all(history.map(async ...))` (dailyClose.controller.js:341-385). Combined, these create escalating DB pressure on the **Neon Serverless PostgreSQL Free Tier** (which enforces a strict 5-connection limit). The `getTenantPrefix()` function is copy-pasted into **15 separate files** with 7 different implementations. Overall code volume can be reduced ~55-60% through shared tenant resolution, controller wrappers, and splitting 1000+ line frontend pages.

*(Note: For VPS infrastructure setup, Traefik reverse proxy configuration, Dockerfiles, and production host settings on Contabo via Dokploy, refer directly to [`context/deployment.md`](context/deployment.md)).*

---

## 1. Root Cause: Backend Slowdown

### Finding

Three "hidden work on every request" patterns drain the Neon free-tier database connection pool (max 5 connections):

| # | File | Lines | What happens on every request |
|---|------|-------|-------------------------------|
| 1 | `item.controller.js` | L100 | `consolidateDuplicateFinishedGoods()` called inside `getItems()`. Runs `findMany` on ALL items, loops groups, does `updateMany` × 6 tables per duplicate, soft-archives rows. This is a **migration task** running on every inventory page load. |
| 2 | `spotSale.controller.js` | L31-101 | "Auto-heal" block inside `getSpotSales()`. Fetches 20 recent sales, then for EACH checks `findFirst` for existing inventory transaction. If missing, creates write transactions. N+1 read + potential writes on every page load. |
| 3 | `dailyClose.controller.js` | L341-385 | `getDailyCloseHistory()` fetches up to 30 closed days, then `Promise.all(history.map(async ...))` fires 3 queries per day = **90 sequential queries** on every page load. |
| 4 | `analytics.controller.js` | L22-58 | `computeDashboardAnalytics()` fetches entire year of orders/payments/expenses/purchases/spotSales into memory, then JS-filters 30 days × 5 arrays + 12 months × 5 arrays. As data grows, this becomes a memory bomb. |
| 5 | `auth.middleware.js` | L31-46 | JWT middleware hits DB **twice** per request (primary tenant lookup + fallback tenant lookup). With 300 req/15min rate limit and 5-connection pool, this alone can saturate connections. |

### Fix

```diff
# item.controller.js — Remove from getItems, run as one-time migration script
- await consolidateDuplicateFinishedGoods(prefix);
+ // Move to backend/scripts/consolidate-items.js, run once via `node scripts/consolidate-items.js`

# spotSale.controller.js — Remove auto-heal block entirely
- // Lines 31-101: auto-heal block
+ // Move to backend/scripts/heal-spot-sales.js, run once

# dailyClose.controller.js — Replace N+1 with single aggregation query
- const historyWithStats = await Promise.all(history.map(async (day) => { ... }));
+ // Use a single SQL query with date grouping instead of N sequential queries

# auth.middleware.js — Cache user lookup per JWT for request lifetime
+ // Add LRU cache (Map<userId, {user, prefix, expiresAt}>) with 60s TTL
```

---

## 2. Database & Query Issues

### N+1 Queries Found

| Location | Pattern |
|----------|---------|
| `item.controller.js:100` | `consolidateDuplicateFinishedGoods()` loops items, does sequential `updateMany` × 6 tables per group |
| `spotSale.controller.js:38-97` | Loop over 20 sales, each does `findFirst` then conditional writes |
| `dailyClose.controller.js:341-385` | `Promise.all(history.map(async ...))` — 3 queries per day × 30 days |
| `order.controller.js:33-47` | `createOrder` loops `items` array, does `findFirst` + conditional `create` per item |
| `order.controller.js:392-406` | `deliverOrder` loops `o.items`, does `findUnique` per item for stock check |
| `production.controller.js:430-438` | Loops `deductions` and `finishedGoods` arrays, does sequential `create` + `update` per item |
| `bottle.controller.js:129-151` | `createBottleTransaction` fetches ALL bottle transactions + ALL customers just to compute a balance |
| `reports.controller.js:76` | `getReportData('profitability')` fetches ALL `PurchaseItem` records (no date filter) |
| `reports.controller.js:258` | `getReportData('fleet')` fetches ALL `BottleTransaction` records (unbounded) |

### Missing Pagination / Unbounded Queries

| File | Line | Query | Risk |
|------|------|-------|------|
| `expense.controller.js` | L39-52 | `findMany({ take: 5000 })` | Hard limit of 5000 is dangerously high |
| `analytics.controller.js` | L31-57 | 7 `findMany` calls fetching entire year of data | Memory grows linearly with business activity |
| `bottle.controller.js` | L16 | `findMany()` on ALL bottle transactions | Grows unbounded |
| `reports.controller.js` | L76 | `PurchaseItem.findMany()` — no filter | Fetches every purchase item ever |
| `reports.controller.js` | L258 | `BottleTransaction.findMany()` — no filter | Fetches every bottle transaction ever |
| `customer.controller.js` | L47-65 | `getCustomerDetails` includes ALL orders, ALL bottle transactions, ALL payments | Single customer page can pull thousands of records |
| `vendor.controller.js` | L69-86 | `getVendorById` includes ALL purchases, ALL payments, ALL ledger entries | Same unbounded issue |
| `adminDashboard.controller.js` | L43-46 | `pendingOrders` — `findMany` with no `take` | Could return all historical pending orders |

### Prisma Client Instantiation

**Current (db.js):** Single instance using `@prisma/adapter-pg` with a `pg.Pool` of `max: 5`.

**Free-Tier Assessment:** Single instance pattern is correct. Pool size of `5` is mandatory for **Neon Free Tier** (0.25 CU limit). To prevent connection pool exhaustion under 5 connections:
1. Use the Neon pooled URL (`-pooler` domain with `pgbouncer=true`).
2. Add the in-memory caches for Auth and Daily Close lock check (Section 3).
3. Set `idleTimeoutMillis: 10000` to rapidly return idle connections to Neon.

---

## 3. Middleware Optimizations

### Daily Close Lock Caching

**Current (`dailyClose.middleware.js`):** Queries DB on every write request. When `req.params.id` exists and no date in body, it makes an ADDITIONAL `findUnique` to fetch the existing record (L24-33), then queries `DailyClose.findFirst` (L42-47). That's 1-2 DB calls per write request.

**Before:**
```javascript
// L42-47 — DB hit every time
const closedRecord = await dailyCloseModel.findFirst({
  where: { date: transactionDate, adminConfirmed: true }
});
```

**After (with 60s TTL cache):**
```javascript
const lockCache = new Map();
const LOCK_TTL = 60_000;

function getCachedLock(key) {
  const entry = lockCache.get(key);
  if (entry && Date.now() - entry.ts < LOCK_TTL) return entry.value;
  lockCache.delete(key);
  return undefined;
}

// Inside middleware:
const cacheKey = `${prefix}:${transactionDate.toISOString().split('T')[0]}`;
let isLocked = getCachedLock(cacheKey);
if (isLocked === undefined) {
  const closedRecord = await dailyCloseModel.findFirst({
    where: { date: transactionDate, adminConfirmed: true }
  });
  isLocked = !!closedRecord;
  lockCache.set(cacheKey, { value: isLocked, ts: Date.now() });
}
```

### JWT Middleware

**Assessment:** Makes **2 DB round-trips per request** (L31-46). First queries `${requestedPrefix}User.findUnique`, then if not found, queries the fallback tenant. For most requests (single-tenant users), it's 1 query. For cross-tenant owners, it's 2.

**Fix:** Add in-memory LRU cache keyed by `${userId}:${prefix}` with 60s TTL. JWT decode is already pure crypto — the DB hit is for checking `isActive` status, which rarely changes.

```javascript
const userCache = new Map();
const USER_TTL = 60_000;

// Before DB query:
const cacheKey = `${decodedToken.id}:${requestedPrefix}`;
const cached = userCache.get(cacheKey);
if (cached && Date.now() - cached.ts < USER_TTL) {
  req.user = cached.user;
  req.tenant = requestedPrefix;
  return next();
}
// ... existing DB query ...
userCache.set(cacheKey, { user, ts: Date.now() });
```

### Multi-Tenancy

**Finding:** Tenant prefix resolved via `getTenantPrefix(req)` — copy-pasted 15 times across controllers with **7 different implementations** that check different combinations of `req.tenant`, `req.headers`, `req.cookies`, `req.query`. This inconsistency is a latent bug (different endpoints resolve different tenants from the same request).

**Fix:** Single `getTenantPrefix` in `utils/tenant.js`, imported everywhere. Auth middleware already sets `req.tenant` — controllers should just read `req.tenant`.

### Rate Limiting

**Assessment:** Uses in-memory store (express-rate-limit default). 300 requests / 15 minutes. Not a slowdown cause. ✅

---

## 4. Code Reduction Plan

### Backend — Target: ~55% reduction

| File | Current Lines | Target Lines | Strategy |
|------|--------------|--------------|----------|
| `order.controller.js` | 690 | ~250 | Extract delivery logic to `services/delivery.service.js`, shared `getTenantPrefix` import, extract audit helper |
| `analytics.controller.js` | 672 | ~200 | Move `computeDashboardAnalytics` to `services/analytics.service.js`, use DB aggregations instead of JS filtering |
| `item.controller.js` | 539 | ~150 | Remove `consolidateDuplicateFinishedGoods` (run-once script), shared tenant, extract reconciliation to `services/inventory.service.js` |
| `production.controller.js` | 505 | ~180 | Extract wadaana/aquasphere branches to strategy pattern or separate service files |
| `spotSale.controller.js` | 434 | ~150 | Remove auto-heal block, shared tenant, extract deduction logic |
| `dailyClose.controller.js` | 430 | ~150 | Replace N+1 history with single query, extract confirm logic to shared function |
| `purchase.controller.js` | 367 | ~150 | Shared tenant, extract validation to service |
| `customer.controller.js` | 353 | ~150 | Shared tenant, extract audit logging to helper |
| `adminDashboard.controller.js` | 330 | ~120 | Shared tenant, reuse analytics service |
| `reports.controller.js` | 299 | ~100 | Add query bounds, extract report generators |
| `vendor.controller.js` | 299 | ~120 | Shared tenant, extract ledger computation |
| `productionFormulas.js` | 228 | 228 | Keep as-is (domain-specific, well-documented) |
| `bottle.controller.js` | 225 | ~100 | Replace unbounded findMany with aggregate query |
| 15× `getTenantPrefix` copies | ~60 total | 8 | Single `utils/tenant.js` export |
| **Total backend** | **~6,900** | **~3,100** | **~55% reduction** |

### Frontend — Target: ~55% reduction

| File | Current Lines | Target Lines | Strategy |
|------|--------------|--------------|----------|
| `Production.jsx` (page) | 1,193 | ~100 | Split: ProductionPage (shell), ProductionBatchList, CreateBatchForm, CompleteBatchModal, ProductionStats (~5 files × 100) |
| `Vendors.jsx` (page) | 1,017 | ~80 | Split: VendorsPage, VendorList, VendorDetailPanel, VendorPaymentModal, AddVendorModal (~5 files × 100) |
| `ProductionDashboardView.jsx` | 602 | ~100 | Split: DashboardCards, DailyChart, RecentBatches, RawMaterialHealth |
| `AddCustomerModal.jsx` | 539 | ~100 | Extract form fields to CustomerFormFields, validation to useCustomerForm hook |
| `AddOrderModal.jsx` | 473 | ~100 | Extract to OrderFormFields, useOrderForm hook |
| `AddEditRawMaterialModal.jsx` | 460 | ~100 | Simpler form, extract fields |
| `LogCounterSaleForm.jsx` | 440 | ~100 | Extract product selector, payment section |
| `CustomerDetails.jsx` | 433 | ~100 | Split: CustomerInfo, OrderHistory, BottleLedger, PaymentHistory |
| `AdminDashboardView.jsx` | 421 | ~100 | Split: AdminKPIs, AdminOrdersTable, AdminInventory |
| `EditCustomerModal.jsx` | 415 | ~100 | Share form fields with AddCustomerModal via shared component |
| `ProcessDeliveryModal.jsx` | 410 | ~100 | Extract bottle section, payment section |
| `Orders.jsx` (page) | 424 | ~80 | Split: OrdersPage, OrdersTable (already exists), OrderFilters |
| `Purchases.jsx` (page) | 443 | ~80 | Split: PurchasesPage, PurchaseList, PurchaseDetails |
| **Total frontend** | **~12,700 (components + pages)** | **~5,700** | **~55% reduction** |

---

## 5. Modularization Plan

Files currently over 100 lines, with proposed splits:

### Backend Controllers

| Current File (lines) | Split Into |
|----------------------|------------|
| `order.controller.js` (690) | `order.controller.js` (80), `services/order.service.js` (100), `services/delivery.service.js` (100) |
| `analytics.controller.js` (672) | `analytics.controller.js` (60), `services/dashboard.service.js` (100), `services/analytics.service.js` (100) |
| `item.controller.js` (539) | `item.controller.js` (80), `services/inventory.service.js` (80), `scripts/consolidate-items.js` (90) |
| `production.controller.js` (505) | `production.controller.js` (80), `services/production.service.js` (100), `services/production-wadaana.service.js` (100) |
| `spotSale.controller.js` (434) | `spotSale.controller.js` (60), `services/spotSale.service.js` (90) |
| `dailyClose.controller.js` (430) | `dailyClose.controller.js` (60), `services/dailyClose.service.js` (90) |
| `purchase.controller.js` (367) | `purchase.controller.js` (60), `services/purchase.service.js` (90) |
| `customer.controller.js` (353) | `customer.controller.js` (60), `services/customer.service.js` (90) |
| `adminDashboard.controller.js` (330) | `adminDashboard.controller.js` (50), reuse `services/dashboard.service.js` |
| `reports.controller.js` (299) | `reports.controller.js` (50), `services/reports/` (5 files × 50) |
| `vendor.controller.js` (299) | `vendor.controller.js` (60), `services/vendor.service.js` (80) |
| `productionFormulas.js` (228) | Keep (domain formulas, well-documented) |
| `bottle.controller.js` (225) | `bottle.controller.js` (60), `services/bottle.service.js` (80) |

### Frontend Pages

| Current File (lines) | Split Into |
|----------------------|------------|
| `Production.jsx` (1,193) | `Production.jsx` (60 shell), `ProductionBatchList.jsx` (100), `CreateBatchModal.jsx` (100), `CompleteBatchModal.jsx` (100), `WadaanaProduction.jsx` (100), `AquasphereProduction.jsx` (100), `hooks/useProductionBatches.js` (40) |
| `Vendors.jsx` (1,017) | `Vendors.jsx` (60 shell), `VendorList.jsx` (80), `VendorDetailPanel.jsx` (100), `VendorPaymentModal.jsx` (100), `AddVendorModal.jsx` (80), `hooks/useVendors.js` (40) |
| `ProductionDashboardView.jsx` (602) | `ProductionDashboardView.jsx` (60), `ProductionKPICards.jsx` (80), `DailyProductionChart.jsx` (80), `RecentBatchesTable.jsx` (80), `RawMaterialHealth.jsx` (80) |

---

## 6. Quick Wins (Apply Today)

Ordered by impact, each under 30 minutes:

1. **Remove `consolidateDuplicateFinishedGoods()` from `getItems()`** — Delete line 100 of `item.controller.js`. Move to a one-time script. **Impact: Eliminates the single biggest source of slow inventory page loads.**
2. **Remove auto-heal block from `getSpotSales()`** — Delete lines 31-101 of `spotSale.controller.js`. Move to a one-time script. **Impact: Eliminates N+1 reads + writes on every counter sales page load.**
3. **Cache auth user lookup** — Add 60s in-memory cache in `auth.middleware.js`. **Impact: Cuts 1-2 DB queries from every single request.**
4. **Cache daily close lock check** — Add 60s TTL Map in `dailyClose.middleware.js`. **Impact: Eliminates 1-2 DB queries from every write request.**
5. **Extract shared `getTenantPrefix`** — Create `utils/tenant.js`, import everywhere. **Impact: Removes 15 copies of inconsistent tenant resolution.**
6. **Fix `getDailyCloseHistory()` N+1** — Replace `Promise.all(history.map(async ...))` with single grouped query. **Impact: Reduces 90 queries to 3.**
7. **Add `take: 200` to unbounded queries** — `bottle.controller.js:16`, `reports.controller.js:76,258`, `vendor.controller.js:69-86`. **Impact: Prevents memory blowout as data grows.**
8. **Bound `getCustomerDetails` includes** — Add `take: 50` to orders, bottleTransactions, payments includes. **Impact: Prevents single-customer page from pulling 1000+ records.**
9. **Fix expense query limit** — Change `take: 5000` to `take: 200` with pagination in `expense.controller.js`. **Impact: Prevents 5K record responses.**
10. **Move dashboard analytics to DB-level aggregation** — Replace in-memory year-data filtering with `_sum` / `groupBy` queries per period. **Impact: Reduces memory usage and speeds up dashboard by 5-10x.**

---

## 7. Refactored Code Snippets

### utils/tenant.js — Shared Tenant Resolver

```javascript
/**
 * Resolves tenant prefix from request.
 * Auth middleware sets req.tenant — controllers should use this.
 * Falls back to header/cookie for middleware that runs before auth.
 */
export function getTenantPrefix(req) {
  const raw = (
    req.tenant ||
    req.headers['x-tenant'] ||
    req.headers['x-company-context'] ||
    req.cookies?.tenant ||
    req.cookies?.company ||
    req.query?.tenant ||
    req.query?.company ||
    'aquasphere'
  ).toString().toLowerCase();
  return raw === 'wadaana' ? 'wadaana' : 'aquasphere';
}
```

### config/db.js — Neon Free-Tier Optimized Prisma Client Singleton

```javascript
import 'dotenv/config';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from '@prisma/client';
const { PrismaClient } = pkg;

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;

// Neon free-tier pool settings — keep pool at max 5
const pool = new Pool({
  connectionString,
  max: parseInt(process.env.DATABASE_POOL_SIZE || '5', 10),
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
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

### utils/auditLog.js — Shared Audit Logger

```javascript
import { prisma } from '../config/db.js';

export async function createAuditLog(prefix, { action, entityType, entityId, performedBy, details }) {
  try {
    await prisma[`${prefix}AuditLog`].create({
      data: { action, entityType, entityId, performedBy, details }
    });
  } catch (_) {
    // Audit log failures should never crash the request
  }
}
```

### api.js — Frontend Fetch Utility

```javascript
import { getCompanyFromCookie } from './companyCookie';

const BASE = import.meta.env.VITE_API_URL || '/api/v1';

async function request(method, path, body) {
  const tenant = getCompanyFromCookie();
  const options = {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant': tenant,
      'x-company-context': tenant,
    },
  };
  if (body !== undefined) options.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, options);
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || `Request failed: ${res.status}`);
  return json;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  del: (path) => request('DELETE', path),
};
```

### dailyCloseLockMiddleware.js — With Cache

```javascript
import { prisma } from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getTenantPrefix } from '../utils/tenant.js';

const lockCache = new Map();
const LOCK_TTL = 60_000; // 60 seconds

function getCachedLock(key) {
  const entry = lockCache.get(key);
  if (entry && Date.now() - entry.ts < LOCK_TTL) return entry.value;
  lockCache.delete(key);
  return undefined;
}

// Invalidate cache when day is closed/reopened
export function invalidateLockCache(prefix, dateStr) {
  lockCache.delete(`${prefix}:${dateStr}`);
}

export const checkDailyCloseLock = asyncHandler(async (req, res, next) => {
  const prefix = getTenantPrefix(req);

  let transactionDateRaw = req.body.date || req.body.batchDate
    || req.body.purchaseDate || req.body.deliveredAt;

  if (!transactionDateRaw && req.params.id) {
    const url = req.baseUrl || req.originalUrl || '';
    const modelMap = {
      '/orders': 'Order', '/purchases': 'Purchase',
      '/production': 'ProductionBatch', '/expenses': 'Expense',
      '/spot-sales': 'SpotSale',
    };
    for (const [route, model] of Object.entries(modelMap)) {
      if (url.includes(route)) {
        const rec = await prisma[`${prefix}${model}`]
          .findUnique({ where: { id: req.params.id }, select: { createdAt: true } })
          .catch(() => null);
        if (rec) transactionDateRaw = rec.createdAt;
        break;
      }
    }
  }

  const transactionDate = transactionDateRaw ? new Date(transactionDateRaw) : new Date();
  transactionDate.setUTCHours(0, 0, 0, 0);
  const dateStr = transactionDate.toISOString().split('T')[0];
  const cacheKey = `${prefix}:${dateStr}`;

  let isLocked = getCachedLock(cacheKey);
  if (isLocked === undefined) {
    const closedRecord = await prisma[`${prefix}DailyClose`].findFirst({
      where: { date: transactionDate, adminConfirmed: true },
    });
    isLocked = !!closedRecord;
    lockCache.set(cacheKey, { value: isLocked, ts: Date.now() });
  }

  if (isLocked && req.user.role !== 'OWNER') {
    throw new ApiError(403, 'Date is closed for editing by Admin. Contact Owner to request override.');
  }

  next();
});
```

### auth.middleware.js — With User Cache

```javascript
import { ApiError } from '../utils/ApiError.js';
import { verifyToken } from '../utils/jwtUtils.js';
import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const userCache = new Map();
const USER_TTL = 60_000;

export const verifyJWT = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.token || req.header('Authorization')?.replace('Bearer ', '');
  if (!token) throw new ApiError(401, 'Unauthorized request');

  const decoded = verifyToken(token);
  if (!decoded) throw new ApiError(401, 'Invalid or expired token');

  const rawTenant = (
    req.query?.tenant || req.query?.company ||
    req.cookies?.tenant || req.cookies?.company ||
    req.headers['x-company-context'] || req.headers['x-tenant'] ||
    'aquasphere'
  ).toString().toLowerCase();
  const requestedPrefix = rawTenant === 'wadaana' ? 'wadaana' : 'aquasphere';

  // Check cache
  const cacheKey = `${decoded.id}:${requestedPrefix}`;
  const cached = userCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < USER_TTL) {
    req.user = cached.user;
    req.tenant = requestedPrefix;
    return next();
  }

  // DB lookup (primary tenant, then fallback)
  let user = await prisma[`${requestedPrefix}User`].findUnique({
    where: { id: decoded.id },
    select: { id: true, email: true, name: true, role: true, isActive: true }
  });

  if (!user) {
    const fallback = requestedPrefix === 'wadaana' ? 'aquasphere' : 'wadaana';
    user = await prisma[`${fallback}User`].findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, name: true, role: true, isActive: true }
    });
  }

  if (!user || !user.isActive) throw new ApiError(401, 'Invalid access token or user is inactive');

  userCache.set(cacheKey, { user, ts: Date.now() });
  req.user = user;
  req.tenant = requestedPrefix;
  next();
});
```

---

## 8. Estimated Impact

| Metric | Before | After |
|--------|--------|-------|
| Avg response time (after 15 min) | ~2,000-5,000ms (degrading) | ~50-200ms (stable) |
| DB queries per `getItems()` call | 1 + consolidation sweep (~20+) | 1 |
| DB queries per `getSpotSales()` call | 20-40 (auto-heal) | 2 |
| DB queries per `getDailyCloseHistory()` | 90+ (N+1) | 3 |
| DB queries per authenticated request | 2-4 (auth + daily close) | 0-1 (cached) |
| Total backend controller files | 17 | 17 controllers + ~12 service files |
| Largest backend file (lines) | 690 (`order.controller.js`) | ≤100 |
| Largest frontend file (lines) | 1,193 (`Production.jsx`) | ≤100 |
| Backend controller code volume | ~6,900 lines | ~3,100 lines (~55% reduction) |
| Frontend pages + components | ~17,500 lines | ~8,000 lines (~55% reduction) |
| `getTenantPrefix` copies | 15 (7 variants) | 1 |
| `apiInterceptor.js` | Empty file (0 bytes) | Not needed (use `api.js` utility) |

---

## 9. Ponytail Review — Over-Engineering Findings

`item.controller.js:L10-94`: **delete** `consolidateDuplicateFinishedGoods`. 94-line migration function called on every GET. Run once as script.

`item.controller.js:L119-154`: **shrink** inventoryTransaction scan inside getItems. Replace with `cachedQty` column (already exists). 35 lines to 0.

`spotSale.controller.js:L31-101`: **delete** auto-heal block. 70-line write-on-read pattern. Run as one-time migration script.

`dailyClose.controller.js:L341-385`: **shrink** N+1 history loop. Single grouped aggregate query. 45 lines to 8.

`analytics.controller.js:L22-224`: **shrink** 200-line in-memory filtering. Replace with DB `groupBy` + `_sum`. 200 lines to ~40.

15× `getTenantPrefix` definitions: **stdlib** (project stdlib). Single shared import. 60 lines to 8.

`customer.controller.js:L232-265` + `vendor.controller.js:L252-268` + 8 other audit log blocks: **yagni** repeated audit log creation pattern. Extract `createAuditLog` helper. ~120 lines to ~15 total across files.

`user.controller.js:L11-16,31-39,58-69,83-94`: **shrink** 4 identical if/else `aquasphere`/`wadaana` branches. Use `prisma[\`${prefix}User\`]` pattern. 50 lines to 12.

`ApiResponse.js`: **yagni** wrapper class with one caller pattern. Half the controllers use `res.json({ success: true, data })`, half use `new ApiResponse(200, data, msg)`. Pick one. 9 lines + inconsistency.

`bottle.controller.js:L129-164`: **shrink** full transaction scan for balance. Replace with aggregate query. 35 lines to 5.

`reports.controller.js:L76`: **shrink** ALL PurchaseItem fetch. Add date filter. 1 line fix.

net: **~-1,800 lines possible** (backend only, not counting frontend splits).

---

## 10. Swagger / OpenAPI 3.0 Setup for Interactive API Testing

To enable full interactive testing of all endpoints (including bearer auth & tenant context header switching) directly from your browser, integrate Swagger UI:

### 10.1 Dependencies Installation
```bash
cd backend
pnpm add swagger-ui-express swagger-jsdoc
```

### 10.2 Swagger Specification Setup (`backend/src/config/swagger.js`)

```javascript
import swaggerJSDoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AquaSphere OS & Wadaana ERP API',
      version: '1.0.0',
      description: 'Multi-tenant water distribution ERP REST API documentation for AquaSphere and Wadaana Pure Water.'
    },
    servers: [
      {
        url: '/api/v1',
        description: 'Current API Server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Provide JWT token obtained from `/auth/login`'
        },
        tenantHeader: {
          type: 'apiKey',
          in: 'header',
          name: 'x-tenant',
          description: 'Tenant identifier: `aquasphere` or `wadaana`'
        }
      }
    },
    security: [
      {
        bearerAuth: [],
        tenantHeader: []
      }
    ]
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js']
};

export const swaggerSpec = swaggerJSDoc(options);
```

### 10.3 Mounting Swagger UI in `backend/src/index.js`

```javascript
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';

// Mount Swagger interactive docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'AquaSphere API Docs & Testing Console',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'none',
    filter: true
  }
}));
```

---

## 11. Morgan Logger (HTTP Request Observability)

Add `morgan` to log all incoming HTTP requests, response statuses, response times, and tenant context to identify slowdowns and track API traffic in console and server logs.

### 11.1 Installation
```bash
cd backend
pnpm add morgan
```

### 11.2 Morgan Configuration Middleware (`backend/src/middlewares/logger.middleware.js`)

```javascript
import morgan from 'morgan';

// Custom token for multi-tenant context
morgan.token('tenant', (req) => {
  return req.headers['x-tenant'] || req.headers['x-company-context'] || req.tenant || 'aquasphere';
});

// Custom token for logged-in user
morgan.token('user', (req) => {
  return req.user ? `${req.user.role}:${req.user.name || req.user.id.substring(0, 6)}` : 'anon';
});

// Development logger format (colorized, human readable)
export const devLogger = morgan(
  ':method :url :status :response-time ms - [:tenant] [:user] :res[content-length]B'
);

// Production logger format (Structured JSON for log aggregators)
export const prodLogger = morgan((tokens, req, res) => {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    method: tokens.method(req, res),
    url: tokens.url(req, res),
    status: Number(tokens.status(req, res)),
    responseTimeMs: Number(tokens['response-time'](req, res)),
    contentLength: tokens.res(req, res, 'content-length') || '0',
    tenant: tokens.tenant(req, res),
    user: tokens.user(req, res),
    ip: tokens['remote-addr'](req, res)
  });
});
```

### 11.3 Mounting Morgan in `backend/src/index.js`

```javascript
import { devLogger, prodLogger } from './middlewares/logger.middleware.js';

if (process.env.NODE_ENV === 'production') {
  app.use(prodLogger);
} else {
  app.use(devLogger);
}
```

---

## 12. Comprehensive API Testing Matrix (Positive & Negative Test Cases)

Use this test matrix for manual verification in Swagger UI or automated test scripts (e.g. Postman / Vitest).

### 12.1 Authentication & Multi-Tenancy (`/api/v1/auth`)

| Endpoint & Method | Test Type | Input / Payload / Headers | Expected Status | Expected Result / Assertion |
|-------------------|-----------|---------------------------|-----------------|-----------------------------|
| `POST /auth/login` | **Positive** | `{ email: "owner@aquasphere.pk", password: "validPassword", tenant: "aquasphere" }` | `200 OK` | Returns user profile, sets `token` HTTP-only cookie, returns JWT string. |
| `POST /auth/login` | **Negative** | `{ email: "owner@aquasphere.pk", password: "wrongPassword" }` | `401 Unauthorized` | `{ success: false, message: "Invalid credentials" }` |
| `POST /auth/login` | **Negative** | `{ email: "inactive@aquasphere.pk", password: "validPassword" }` | `401 Unauthorized` | `{ success: false, message: "Invalid credentials" }` |
| `GET /auth/me` | **Positive** | Header: `Authorization: Bearer <valid_jwt>` | `200 OK` | Returns decoded user session profile. |
| `GET /auth/me` | **Negative** | No header, no cookie | `401 Unauthorized` | `{ success: false, message: "Unauthorized request" }` |
| `GET /auth/me` | **Negative** | Expired / Tampered JWT | `401 Unauthorized` | `{ success: false, message: "Invalid or expired token" }` |

### 12.2 Customer Management (`/api/v1/customers`)

| Endpoint & Method | Test Type | Input / Payload / Headers | Expected Status | Expected Result / Assertion |
|-------------------|-----------|---------------------------|-----------------|-----------------------------|
| `GET /customers` | **Positive** | Header: `x-tenant: aquasphere`, Query: `?status=all` | `200 OK` | Returns array of max 50 customers. |
| `POST /customers` | **Positive** | `{ name: "Alpha Corp", phone: "03001234567", type: "Commercial", creditLimit: 50000, securityDeposit: 10000 }` | `201 Created` | Creates customer and generates `CUSTOMER_CREATED` audit log entry. |
| `POST /customers` | **Negative** | Missing `name` or `phone` | `400 Bad Request` | `{ success: false, message: "Name, phone, and type required" }` |
| `POST /customers` | **Negative** | Duplicate active phone: `{ phone: "03001234567" }` | `400 Bad Request` | `A customer with phone number "03001234567" already exists.` |
| `POST /customers` | **Negative** | Invalid Google Map Link: `{ mapLink: "https://badurl.com" }` | `400 Bad Request` | `Invalid Google Maps URL. Must contain maps.google.com...` |
| `DELETE /customers/:id` | **Negative** | Role: `OPERATOR` | `403 Forbidden` | `Only Owner or Marketing Manager can delete customer records` |

### 12.3 Inventory & Items (`/api/v1/items`)

| Endpoint & Method | Test Type | Input / Payload / Headers | Expected Status | Expected Result / Assertion |
|-------------------|-----------|---------------------------|-----------------|-----------------------------|
| `GET /items` | **Positive** | Query: `?type=RAW_MATERIAL` | `200 OK` | Returns raw materials with computed `cachedQty`. |
| `POST /items/transfer` | **Positive** | `{ itemId: "<id>", fromLocation: "WAREHOUSE", toLocation: "FACTORY", quantity: 50 }` | `200 OK` | Shifts 50 units from Warehouse to Factory stock atomically; logs transfer transaction. |
| `POST /items/transfer` | **Negative** | `fromLocation: "FACTORY", toLocation: "FACTORY"` | `400 Bad Request` | `From and To locations must be different` |
| `POST /items/transfer` | **Negative** | Requested transfer quantity exceeds source stock | `400 Bad Request` | `Insufficient stock at WAREHOUSE (Available: X, Requested: Y)` |
| `POST /items/reconcile/:id` | **Negative** | Non-Admin/Owner user role | `403 Forbidden` | `Only Owner or Admin can perform inventory reconciliation` |

### 12.4 Production Batches (`/api/v1/production`)

| Endpoint & Method | Test Type | Input / Payload / Headers | Expected Status | Expected Result / Assertion |
|-------------------|-----------|---------------------------|-----------------|-----------------------------|
| `POST /production` | **Positive** | `{ quantity: 100, packs05L: 10, packs15L: 5 }` | `201 Created` | Creates pending batch record. |
| `POST /production` | **Negative** | `{ quantity: -5 }` | `400 Bad Request` | `Quantities cannot be negative` |
| `POST /production` | **Negative** | `{ quantity: 0, packs05L: 0, packs15L: 0 }` | `400 Bad Request` | `Must produce at least one pack or 19L bottle` |
| `POST /production/:id/complete` | **Positive** | `{ brokenBottles05L: 2, brokenBottles15L: 1, wasteQuantity: 3 }` | `200 OK` | Deducts chemical/caps/labels from raw materials, increments finished goods in factory floor, status = `COMPLETED`. |
| `POST /production/:id/complete` | **Negative** | Batch is already completed | `400 Bad Request` | `Batch is already completed` |
| `POST /production/:id/complete` | **Negative** | Broken bottles count > produced items count | `400 Bad Request` | `Broken 0.5L bottles (X) cannot exceed produced amount (Y pcs)` |
| `POST /production/:id/complete` | **Negative** | Insufficient raw material (e.g. empty bottles or small caps) in stock | `400 Bad Request` | `Insufficient stock for <Item> (Required: X, Available: Y)` |

### 12.5 Orders & Deliveries (`/api/v1/orders`)

| Endpoint & Method | Test Type | Input / Payload / Headers | Expected Status | Expected Result / Assertion |
|-------------------|-----------|---------------------------|-----------------|-----------------------------|
| `POST /orders` | **Positive** | `{ customerId: "<id>", type: "NINETEEN_L", items: [{ itemId: "<id>", quantity: 10, price: 150 }] }` | `201 Created` | Order created in `UNPAID` and `PENDING` state. |
| `POST /orders` | **Negative** | Customer current debt + order total > credit limit (and `bypassCreditCheck: false`) | `200 OK` (Soft-block response) | `{ softBlock: true, blockReason: "BALANCE_EXCEEDED" }` |
| `POST /orders` | **Negative** | 19L bottle count exceeds security deposit value | `200 OK` (Soft-block response) | `{ softBlock: true, blockReason: "BOTTLE_SECURITY_EXCEEDED" }` |
| `POST /orders/:id/deliver` | **Positive** | `{ qtyDelivered: 10, bottlesReturnedGood: 8, bottlesReturnedBroken: 2, cashReceived: 1500 }` | `200 OK` | Deducts finished goods from factory, logs bottle transactions, updates customer debt & bottle balance, status = `DELIVERED`. |
| `POST /orders/:id/deliver` | **Negative** | Factory floor stock < required order items | `400 Bad Request` | `Cannot deliver order: Insufficient Factory Floor stock for "<Item>"...` |
| `POST /orders/:id/deliver` | **Negative** | Cash received > customer total payable debt | `400 Bad Request` | `Cash received cannot exceed total customer payable balance` |
| `POST /orders/:id/deliver` | **Negative** | Modifying/Delivering a CANCELLED order | `400 Bad Request` | Order cannot be processed |

### 12.6 Counter / Spot Sales (`/api/v1/spot-sales`)

| Endpoint & Method | Test Type | Input / Payload / Headers | Expected Status | Expected Result / Assertion |
|-------------------|-----------|---------------------------|-----------------|-----------------------------|
| `POST /spot-sales` | **Positive** | `{ productType: "PACK_05L", productQty: 5, cashCollected: 1500, creditAmount: 0 }` | `201 Created` | Generates sale # `CS-DDMMYY-XXXX`, decrements finished stock, records cash. |
| `POST /spot-sales` | **Negative** | `{ creditAmount: 500, customerId: null }` | `400 Bad Request` | `Customer selection is mandatory for credit sales (Credit Amount > 0)` |
| `POST /spot-sales` | **Negative** | Insufficient finished goods stock | `400 Bad Request` | `Cannot process Counter Sale: Insufficient finished stock...` |
| `PUT /spot-sales/:id` | **Negative** | Editing a sale whose transaction date has been finalized by Daily Close (Role: `MARKETING_MANAGER`) | `403 Forbidden` | `This sale date has been Daily Closed. Only Owner can modify records after Daily Close.` |
| `DELETE /spot-sales/:id` | **Negative** | Non-Owner attempting delete | `403 Forbidden` | `Deleting counter sales is strictly restricted to Owner.` |

### 12.7 Daily Close & Lock Enforcement (`/api/v1/daily-close`)

| Endpoint & Method | Test Type | Input / Payload / Headers | Expected Status | Expected Result / Assertion |
|-------------------|-----------|---------------------------|-----------------|-----------------------------|
| `POST /daily-close/pm-confirm` | **Positive** | `{ date: "2026-08-29" }` (Role: `PRODUCTION_MANAGER`) | `200 OK` | Sets `pmConfirmed = true` for target date. |
| `POST /daily-close/mm-confirm` | **Positive** | `{ date: "2026-08-29" }` (Role: `MARKETING_MANAGER`) | `200 OK` | Sets `mmConfirmed = true` for target date. |
| `POST /daily-close/close-day` | **Positive** | `{ date: "2026-08-29" }` (Role: `ADMIN` or `OWNER`) | `200 OK` | Sets `adminConfirmed = true`, locking date for editing across all controllers. |
| `POST /daily-close/close-day` | **Negative** | Attempting close when day is already admin-confirmed | `400 Bad Request` | `Day is already finalized by Admin` |
| `POST /daily-close/reopen` | **Negative** | Non-Owner attempting reopen | `403 Forbidden` | `Only OWNER can reopen a closed day` |
| `POST /expenses` or `POST /orders` | **Negative** | Creating a transaction with `date` set to a closed day (Role: `ADMIN` or `OPERATOR`) | `403 Forbidden` | `Date is closed for editing by Admin. Contact Owner to request override.` |

### 12.8 Expenses & Receipts (`/api/v1/expenses`)

| Endpoint & Method | Test Type | Input / Payload / Headers | Expected Status | Expected Result / Assertion |
|-------------------|-----------|---------------------------|-----------------|-----------------------------|
| `POST /expenses` | **Positive** | `{ category: "Fuel / Transport", amount: 2500, receiptUrl: "https://res.cloudinary.com/..." }` | `201 Created` | Creates expense record, updates cash calculations. |
| `POST /expenses` | **Negative** | Missing `receiptUrl` | `400 Bad Request` | `Receipt photo is mandatory — text-only entries are not allowed` |
| `POST /expenses` | **Negative** | Invalid category: `{ category: "InvalidCategory" }` | `400 Bad Request` | `Invalid Category. Must be one of: Fuel / Transport...` |
| `POST /expenses` | **Negative** | Non-positive amount: `{ amount: -100 }` | `400 Bad Request` | `Amount must be a valid integer greater than zero` |

---

## Files Not Accessible

| File | Status |
|------|--------|
| `backend/prisma/schema.prisma` | Found (1,043 lines) — not read in full due to size, but confirmed exists |
| `frontend/src/utils/apiInterceptor.js` | Empty file (0 bytes) — no monkey-patching, no closure leak risk ✅ |
