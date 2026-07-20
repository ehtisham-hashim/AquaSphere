# Optimization — AQUA Sphere OS

This document defines the **data structures, algorithms, and database retrieval/insertion techniques** that keep AQUA Sphere OS fast as transaction volume grows. Every decision here traces back to one of three hard constraints:

1. **20-second order target** — customer lookup + order placement must feel instant.
2. **Real-time dashboard** — owner sees today's numbers without pulling to refresh.
3. **Ledger-first architecture** — every balance is a `SUM()` over an append-only table, which gets slower as rows accumulate.

The goal is not premature optimization. It is **algorithmic choices made once at the schema level** so that O(n) problems don't become O(n²) problems six months later.

---

## 1. Core Complexity Problems

### 1.1 The Ledger SUM Problem

Every balance in this system is derived from transaction history:

```
Customer Balance     = SUM(Payment.amount) - SUM(OrderItem.qty * unitPrice)
Bottle Balance       = SUM(BottleTransaction.qty * directionMultiplier)
Inventory Level      = SUM(InventoryTransaction.qty * directionMultiplier)
Vendor Payable       = SUM(Purchase.totalCost) - SUM(VendorPayment.amount)
```

**Naive complexity:** O(n) per balance check, where n = transaction count for that entity.  
**With 10,000 transactions per customer:** A dashboard loading 50 customers' balances = 500,000 row scans.  
**With concurrent users:** Multiple operators hitting the API simultaneously multiplies this.

### 1.2 The Reconciliation Problem

The bottle ledger must verify:
```
Total Owned = At Factory + With Customers + Broken + Lost
```

**Naive approach:** 5 separate `SUM()` queries = 5 round trips.  
**Optimized approach:** Single `GROUP BY txn_type` query = 1 round trip.

### 1.3 The Report Aggregation Problem

Monthly sales report over 100,000 delivery records:

**Naive approach:** `SELECT * FROM Delivery WHERE date BETWEEN ...` then aggregate in JS.  
**Optimized approach:** `SELECT SUM(qty_delivered), SUM(cash_received) FROM Delivery WHERE ... GROUP BY date_trunc('day', delivered_at)` — aggregation pushed to the database engine.

### 1.4 The Daily Close Lock Problem

After Admin closes a day, every write must check:
```
IF transaction_date <= last_close_date THEN REJECT
```

**Naive approach:** Query `DailyClose` table on every single write.  
**Optimized approach:** In-memory cache of latest close date, refreshed on close event. API middleware checks cache first, DB only on cache miss.

---

## 2. Database Schema Optimizations (PostgreSQL)

### 2.1 Index Strategy

Indexes are the single most impactful optimization for a ledger system. But every index slows down writes. The strategy is **targeted, minimal, high-selectivity indexes** — not "index everything."

#### Composite Indexes (High Impact)

Composite indexes on multiple columns queried together. Order matters: equality filters first, then range filters.

| Index | Columns | Why | Query Pattern |
|-------|---------|-----|---------------|
| `idx_customer_phone` | `phone` (unique) | Customer search is 90% by phone | `WHERE phone = '...'` |
| `idx_customer_name_search` | `name` (text pattern) | Fallback search by name | `WHERE name ILIKE '%...%'` |
| `idx_order_customer_date` | `customer_id`, `created_at DESC` | Customer order history + pending orders | `WHERE customer_id = ? ORDER BY created_at DESC` |
| `idx_order_status_date` | `delivery_status`, `created_at` | Pending orders list for dashboard | `WHERE delivery_status IN ('pending','partial')` |
| `idx_delivery_order_date` | `order_id`, `delivered_at` | Delivery history per order | `WHERE order_id = ? ORDER BY delivered_at` |
| `idx_bottle_txn_customer_type` | `customer_id`, `txn_type`, `created_at` | Bottle balance by customer + type | `WHERE customer_id = ? AND txn_type = ?` |
| `idx_inventory_txn_item_date` | `item_id`, `created_at` | Inventory level over time | `WHERE item_id = ?` |
| `idx_payment_customer_date` | `customer_id`, `received_at` | Customer payment history | `WHERE customer_id = ? ORDER BY received_at DESC` |
| `idx_expense_date_type` | `date`, `type` | Daily expense reports | `WHERE date = ? AND type = ?` |
| `idx_production_date` | `production_date` | Production reports by date | `WHERE production_date = ?` |
| `idx_purchase_vendor_date` | `vendor_id`, `purchased_at` | Vendor payable calculation | `WHERE vendor_id = ?` |
| `idx_vendor_payment_vendor` | `vendor_id`, `paid_at` | Vendor payment history | `WHERE vendor_id = ?` |
| `idx_daily_close_date` | `closed_date` (unique) | Daily close lookup | `WHERE closed_date = ?` |

**Prisma Schema Declaration:**

```prisma
model Customer {
  id        String   @id @default(uuid())
  phone     String   @unique
  name      String
  createdAt DateTime @default(now()) @map("created_at")

  @@index([name])
  @@map("customers")
}

model Order {
  id             String   @id @default(uuid())
  customerId     String   @map("customer_id")
  deliveryStatus String   @map("delivery_status")
  createdAt      DateTime @default(now()) @map("created_at")

  @@index([customerId, createdAt(sort: Desc)])
  @@index([deliveryStatus, createdAt])
  @@map("orders")
}

model BottleTransaction {
  id         String   @id @default(uuid())
  customerId String?  @map("customer_id")
  txnType    String   @map("txn_type")
  createdAt  DateTime @default(now()) @map("created_at")

  @@index([customerId, txnType, createdAt])
  @@map("bottle_transactions")
}
```

#### Partial Indexes (Medium-High Impact)

Partial indexes only index a subset of rows, reducing write overhead and storage.

| Partial Index | Condition | Why |
|--------------|-----------|-----|
| `idx_pending_orders` | `WHERE delivery_status IN ('pending', 'partial')` | Only pending orders are queried frequently; delivered orders are archival |
| `idx_unpaid_payments` | `WHERE payment_status = 'unpaid'` | Unpaid balances drive credit alerts; paid records are rarely queried |
| `idx_active_customers` | `WHERE archived_at IS NULL` | Soft-deleted customers don't need index lookups |
| `idx_recent_deliveries` | `WHERE delivered_at > NOW() - INTERVAL '90 days'` | Dashboard only shows recent activity; older deliveries are for reports |

**PostgreSQL SQL:**

```sql
CREATE INDEX idx_pending_orders ON orders(created_at) 
  WHERE delivery_status IN ('pending', 'partial');

CREATE INDEX idx_unpaid_payments ON payments(customer_id, amount) 
  WHERE payment_status = 'unpaid';

CREATE INDEX idx_active_customers ON customers(phone, name) 
  WHERE archived_at IS NULL;
```

**Note:** Partial indexes are declared via raw SQL migrations, not Prisma schema (Prisma doesn't natively support partial index `WHERE` clauses in schema). Add them in a custom migration file after `prisma migrate dev`.

#### Covering Indexes (Medium Impact)

A covering index includes all columns needed by a query, so PostgreSQL never touches the heap (table) — it reads only the index.

**Example:** Customer snapshot for order desk (the 20-second target):

```sql
CREATE INDEX idx_customer_snapshot ON customers(phone) 
  INCLUDE (name, address, credit_limit, default_price, security_deposit);
```

This means `SELECT name, address, credit_limit, default_price, security_deposit FROM customers WHERE phone = ?` reads **only the index**, not the table. One less I/O operation per lookup.

### 2.2 Partitioning Strategy (Future-Proofing)

At current scale (small business, handful of concurrent users), partitioning is unnecessary. But the transaction tables are append-only and will grow indefinitely. Plan for it:

**Candidate tables for partitioning:**
- `InventoryTransaction` — high write volume (every production batch, every delivery)
- `BottleTransaction` — every delivery generates 2-3 rows
- `Payment` — every delivery generates a payment record
- `Delivery` — every delivery generates a row
- `Expense` — daily entries

**Partition by range on `created_at`:**

```sql
-- Monthly partitions
CREATE TABLE inventory_transactions_2026_07 
  PARTITION OF inventory_transactions
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
```

**Benefits:**
- Query a single month = scan only that partition, not the entire table
- Drop old partitions (archival) = instant, no `DELETE` overhead
- Index per partition = smaller, faster indexes

**When to implement:** When any transaction table exceeds 1 million rows. Before that, indexes are sufficient.

### 2.3 Table Structure for Fast Writes

The system is **write-heavy** (every order, delivery, production batch, expense appends rows). Optimizations for write throughput:

**1. Minimal index count on high-write tables**
- `InventoryTransaction` — only index `item_id + created_at`. No composite indexes on mutable columns.
- `BottleTransaction` — only index `customer_id + txn_type + created_at`.
- Avoid indexes on `remarks`, `notes`, or other text fields — use full-text search only if needed later.

**2. Batch inserts**
- Production batch creates 5-10 `InventoryTransaction` rows (bottles, caps, labels, minerals, finished goods). Use Prisma `createMany()` in a single transaction.
- Delivery completion creates `Delivery` + `Payment` + `BottleTransaction` (2-3 rows) + `InventoryTransaction` (1-2 rows). Wrap in `prisma.$transaction()` with row locking.

**3. No foreign key constraints on high-write paths (controversial but valid)**
- PostgreSQL foreign keys require an index lookup on the referenced table for every insert. At high volume, this adds latency.
- Alternative: enforce referential integrity in the application layer (Prisma relations + service validation), drop FK constraints on `InventoryTransaction.item_id`, `BottleTransaction.customer_id`, etc.
- **Tradeoff:** Slightly more application code, significantly faster writes. This is a standard optimization for ledger systems.
- **Keep FKs on:** `Order.customer_id` (low write volume, high read volume), `Delivery.order_id` (every delivery must have an order).

---

## 3. Algorithmic Optimizations for Balance Calculation

### 3.1 The Balance Cache Pattern (Critical)

**Problem:** Computing a customer's balance from `Payment` and `OrderItem` tables every time they place an order is O(n) and gets slower over time.

**Solution:** Maintain a **provably-correct cached balance** that is updated transactionally, not edited directly.

```
┌─────────────────────────────────────────────────────────────┐
│  BALANCE CACHE PATTERN                                       │
│                                                             │
│  1. Customer table has a `cached_balance` column            │
│  2. This column is NEVER written by the UI or controllers    │
│  3. It is ONLY updated inside the same DB transaction        │
│     that writes the Payment or Order record                  │
│  4. The update is a simple arithmetic operation:            │
│     cached_balance += new_payment_amount                     │
│     cached_balance -= new_order_amount                       │
│  5. If cache ever drifts, a nightly reconciliation job        │
│     recomputes from SUM() and corrects the cache             │
└─────────────────────────────────────────────────────────────┘
```

**Why this is safe:**
- The cache is updated in the **same atomic transaction** as the ledger entry. If the ledger insert fails, the cache update rolls back.
- The cache is **not a source of truth** — the ledger is. The cache is a performance optimization that can be rebuilt from the ledger at any time.
- This is the same pattern used by banks, stock exchanges, and accounting systems.

**Implementation:**

```javascript
// Inside deliveries.service.js — delivery completion
await prisma.$transaction(async (tx) => {
  // 1. Insert the delivery record (ledger)
  const delivery = await tx.delivery.create({ data: deliveryData });

  // 2. Insert payment record (ledger)
  await tx.payment.create({ data: paymentData });

  // 3. Update cached balance (NOT a direct edit — derived from the transaction)
  await tx.customer.update({
    where: { id: customerId },
    data: { 
      cachedBalance: { increment: paymentAmount },
      cachedBottleBalance: { increment: bottlesDelivered - bottlesReturned },
      lastDeliveryAt: new Date(),
    },
  });

  // 4. Row-lock the customer record to prevent concurrent updates
  // Prisma's `update` automatically uses SELECT FOR UPDATE
});
```

**Time complexity:** O(1) for balance lookup (reads `cachedBalance` column directly).  
**Space complexity:** O(1) extra space per customer (one decimal column).  
**Correctness guarantee:** Transactional consistency + nightly reconciliation.

### 3.2 Inventory Balance with Running Totals

Same pattern for inventory levels:

```prisma
model Item {
  id            String  @id @default(uuid())
  name          String  @unique
  cachedQty     Decimal @default(0) @map("cached_qty") // Running total
  reorderLevel  Decimal @map("reorder_level")
  // ...
}
```

On every `InventoryTransaction` insert:
```javascript
await tx.item.update({
  where: { id: itemId },
  data: { cachedQty: { increment: direction === 'IN' ? qty : -qty } },
});
```

**Low-stock alert:** Check `cachedQty <= reorderLevel` in O(1) after every inventory transaction. No `SUM()` query needed.

### 3.3 Bottle Ledger Reconciliation in One Query

Instead of 5 separate `SUM()` queries for the bottle summary:

```javascript
// BAD: 5 round trips
const atFactory = await tx.bottleTransaction.aggregate({
  where: { customerId: null, txnType: 'returned_good' },
  _sum: { qty: true },
});
const withCustomers = await tx.bottleTransaction.aggregate({
  where: { txnType: 'delivered_to_customer' },
  _sum: { qty: true },
});
// ... 3 more queries

// GOOD: 1 round trip with GROUP BY
const bottleSummary = await tx.$queryRaw`
  SELECT 
    txn_type,
    SUM(qty) as total_qty
  FROM bottle_transactions
  WHERE created_at >= ${startDate}  -- optional: date range for reports
  GROUP BY txn_type
`;

// Map to the 5 states in O(k) where k = number of txn_types (constant ≈ 6)
const summary = {
  totalOwned: 0,      // computed from purchased_new - lost
  atFactory: 0,       // returned_good + purchased_new - delivered_to_customer
  withCustomers: 0,   // delivered_to_customer - returned_good - returned_broken
  broken: 0,          // returned_broken
  lost: 0,            // lost
};

for (const row of bottleSummary) {
  switch (row.txn_type) {
    case 'delivered_to_customer': summary.withCustomers += row.total_qty; break;
    case 'returned_good': summary.atFactory += row.total_qty; break;
    case 'returned_broken': summary.broken += row.total_qty; break;
    case 'lost': summary.lost += row.total_qty; break;
    case 'purchased_new': summary.atFactory += row.total_qty; summary.totalOwned += row.total_qty; break;
  }
}

// Verify: totalOwned === atFactory + withCustomers + broken + lost
const reconciles = summary.totalOwned === (summary.atFactory + summary.withCustomers + summary.broken + summary.lost);
```

**Time complexity:** O(1) database round trip + O(k) mapping where k ≈ 6 (constant).  
**Space complexity:** O(k) = O(1).

### 3.4 Customer Search — Trie-Style Prefix Indexing

**Problem:** `WHERE name ILIKE '%john%'` cannot use a B-tree index (wildcard at start prevents index usage). Full table scan = O(n).

**Solution 1 (Immediate):** PostgreSQL `pg_trgm` extension + GIN index for fuzzy text search.

```sql
-- Enable extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN index for trigram search
CREATE INDEX idx_customer_name_trgm ON customers USING gin (name gin_trgm_ops);

-- Query (uses index)
SELECT * FROM customers WHERE name ILIKE '%john%';
```

**Time complexity:** O(log n) for prefix matches, O(m) where m = result set size for fuzzy matches.

**Solution 2 (Future):** If search volume grows, add a dedicated search column with normalized, tokenized names:

```sql
ALTER TABLE customers ADD COLUMN search_vector tsvector;
CREATE INDEX idx_customer_search ON customers USING gin (search_vector);

-- Update on insert/update via trigger
UPDATE customers SET search_vector = to_tsvector('english', name || ' ' || phone || ' ' || customer_id);
```

### 3.5 Credit Limit Check — O(1) Soft-Block

**Problem:** Before placing an order, check `(existing_balance + new_order_amount) > credit_limit`. If balance is computed from `SUM()`, this is O(n) per order.

**Solution:** Use the cached balance.

```javascript
// O(1) credit check — reads cached_balance column directly
const customer = await tx.customer.findUnique({
  where: { id: customerId },
  select: { cachedBalance: true, creditLimit: true },
});

const projectedBalance = customer.cachedBalance + newOrderAmount;
const wouldExceed = customer.creditLimit > 0 && projectedBalance > customer.creditLimit;

if (wouldExceed) {
  return {
    warning: true,
    message: `Credit limit exceeded: limit = ${customer.creditLimit}, projected = ${projectedBalance}`,
    currentBalance: customer.cachedBalance,
    limit: customer.creditLimit,
    projectedBalance,
  };
}
```

**Time complexity:** O(1) — single row lookup by primary key.

---

## 4. Prisma-Specific Optimizations

### 4.1 Single PrismaClient Instance

**Critical:** Never instantiate `new PrismaClient()` per request. Connection pool exhaustion = request timeouts.

```javascript
// backend/src/db/prisma.js
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

**Connection pool tuning for NeonDB:**

```javascript
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL + '?connection_limit=10',
    },
  },
});
```

- NeonDB free tier: 10-20 connections max
- 1 Express instance × 10 connections = 10 connections
- If scaling to multiple instances, use **PgBouncer** or **Neon serverless driver** with connection pooling

### 4.2 Select Only What You Need

**Bad:** Fetching entire rows when you only need 2 columns.

```javascript
// BAD: Transfers all columns over the wire
const customer = await prisma.customer.findUnique({ where: { id } });
// Then uses only customer.name and customer.phone
```

**Good:** Explicit `select` reduces data transfer and memory.

```javascript
// GOOD: Only fetches 2 columns
const customer = await prisma.customer.findUnique({
  where: { id },
  select: { name: true, phone: true },
});
```

**Impact:** On a table with 15 columns, `select` reduces wire transfer by ~80%.

### 4.3 Avoid N+1 Queries

**Bad:** Looping over customers and querying orders for each.

```javascript
// BAD: n+1 queries — 1 for customers, n for orders
const customers = await prisma.customer.findMany();
for (const c of customers) {
  const orders = await prisma.order.findMany({ where: { customerId: c.id } });
  // ...
}
```

**Good:** Use `include` (2 queries) or `relationLoadStrategy: 'join'` (1 query).

```javascript
// GOOD: 2 queries total (nested read)
const customers = await prisma.customer.findMany({
  include: {
    orders: {
      where: { deliveryStatus: { in: ['pending', 'partial'] } },
      orderBy: { createdAt: 'desc' },
      take: 5, // Only last 5 orders per customer
    },
  },
  take: 50, // Pagination
});
```

```javascript
// BEST: 1 query with JOIN (Prisma 5.13+)
const customers = await prisma.customer.findMany({
  relationLoadStrategy: 'join',
  include: {
    orders: { where: { deliveryStatus: 'pending' } },
  },
});
```

### 4.4 Use `createMany` for Batch Inserts

Production batch creates 5-10 inventory transactions. Don't loop `create()`:

```javascript
// BAD: 5 round trips
for (const txn of transactions) {
  await prisma.inventoryTransaction.create({ data: txn });
}

// GOOD: 1 round trip
await prisma.inventoryTransaction.createMany({
  data: transactions,
  skipDuplicates: true, // If applicable
});
```

**Note:** `createMany` does not return the created records. If you need IDs, use `createManyAndReturn` (Prisma 5.14+) or a single `create` with nested writes.

### 4.5 Raw SQL for Complex Aggregations (Dashboard/Reports)

Prisma's query builder is excellent for CRUD. For complex dashboard aggregations with multiple JOINs and GROUP BYs, raw SQL is 3-6× faster.

```javascript
// Dashboard "Today's Sales" — complex aggregation across 3 tables
const todaySales = await prisma.$queryRaw<{ total_sales: number; cash_collected: number }[]>`
  SELECT 
    COALESCE(SUM(oi.qty_ordered * oi.unit_price), 0) as total_sales,
    COALESCE(SUM(p.amount), 0) as cash_collected
  FROM orders o
  LEFT JOIN order_items oi ON oi.order_id = o.id
  LEFT JOIN payments p ON p.order_id = o.id AND p.received_at >= CURRENT_DATE
  WHERE o.created_at >= CURRENT_DATE
    AND o.company_context = ${companyContext}::text
  GROUP BY DATE(o.created_at)
`;
```

**When to use raw SQL:**
- Dashboard aggregations (daily/weekly/monthly summaries)
- Reports with 3+ table joins
- `GROUP BY` with `HAVING` clauses
- Window functions (`ROW_NUMBER()`, `RANK()`, `LEAD()`/`LAG()`)
- `UNION` queries

**When to use Prisma:**
- Simple CRUD (findUnique, create, update, delete)
- Single-table queries with filters
- Nested reads with 1-2 levels of inclusion

### 4.6 Transaction Batching with Row Locking

Delivery completion touches 4-6 tables. Must be atomic and prevent race conditions:

```javascript
await prisma.$transaction(async (tx) => {
  // 1. Lock the customer record (SELECT FOR UPDATE)
  const customer = await tx.customer.findUnique({
    where: { id: customerId },
    select: { cachedBalance: true, cachedBottleBalance: true, creditLimit: true },
  });

  // 2. Lock the order record
  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: { deliveryStatus: true, paymentStatus: true },
  });

  // 3. Validate soft-block (bottles returned <= held balance)
  if (bottlesReturnedGood + bottlesReturnedBroken > customer.cachedBottleBalance) {
    throw new SoftBlockError('Bottle return exceeds balance');
  }

  // 4. Insert delivery record
  await tx.delivery.create({ data: deliveryData });

  // 5. Insert payment record
  await tx.payment.create({ data: paymentData });

  // 6. Update bottle ledger (2-3 transactions)
  await tx.bottleTransaction.createMany({ data: bottleTxns });

  // 7. Update inventory (PET only — reduce finished goods)
  if (orderType === 'PET') {
    await tx.inventoryTransaction.createMany({ data: inventoryTxns });
    await tx.item.updateMany({
      where: { id: { in: itemIds } },
      data: { /* decrement cachedQty */ },
    });
  }

  // 8. Update customer cached balances
  await tx.customer.update({
    where: { id: customerId },
    data: {
      cachedBalance: { increment: paymentAmount - orderAmount },
      cachedBottleBalance: { 
        increment: bottlesDelivered - bottlesReturnedGood - bottlesReturnedBroken 
      },
      lastDeliveryAt: new Date(),
    },
  });

  // 9. Update order statuses (computed, but cache for quick lookup)
  await tx.order.update({
    where: { id: orderId },
    data: {
      deliveryStatus: newDeliveryStatus, // computed in service layer
      paymentStatus: newPaymentStatus,
    },
  });
}, {
  isolationLevel: 'Serializable', // Strictest — prevents phantom reads
  maxWait: 5000, // Wait up to 5s for lock
  timeout: 10000, // Transaction timeout 10s
});
```

**Isolation levels:**
- `ReadCommitted` (default): Good for most reads. Allows non-repeatable reads.
- `RepeatableRead`: Good for reports where data must be consistent across the transaction.
- `Serializable`: Required for balance updates (delivery completion, production batch) to prevent double-spending or negative balances under concurrency.

---

## 5. Caching Strategy

### 5.1 In-Memory Cache (Application Layer)

For data that changes rarely but is queried frequently:

| Data | Cache Strategy | TTL | Invalidation |
|------|---------------|-----|-------------|
| Item master list | In-memory Map | 5 minutes | On item create/update/delete |
| Customer type enum | Hardcoded | ∞ | Never |
| Expense type enum | Hardcoded | ∞ | Never |
| Daily close status | In-memory variable | Until close event | On daily close mutation |
| User role permissions | In-memory Map | 10 minutes | On user role change |
| Company context (per request) | JWT claim | Per request | N/A |

**Implementation:** Simple in-memory cache with TTL (no Redis needed at this scale).

```javascript
// backend/src/utils/cache.js
class SimpleCache<T> {
  private cache = new Map<string, { value: T; expiry: number }>();

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T, ttlSeconds: number): void {
    this.cache.set(key, { value, expiry: Date.now() + ttlSeconds * 1000 });
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidatePattern(pattern: RegExp): void {
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) this.cache.delete(key);
    }
  }
}

export const itemCache = new SimpleCache<Item[]>();
```

### 5.2 TanStack Query Caching (Frontend)

- **Item master list:** `staleTime: 5 * 60 * 1000` (5 minutes), `cacheTime: 10 * 60 * 1000` (10 minutes)
- **Customer search results:** `staleTime: 30 * 1000` (30 seconds) — balances change frequently
- **Dashboard data:** `staleTime: 15 * 1000` (15 seconds), `refetchInterval: 30 * 1000` (30 seconds) — "live" feel without WebSockets
- **Order lists:** `staleTime: 10 * 1000` (10 seconds)
- **Reports:** `staleTime: 5 * 60 * 1000` (5 minutes) — reports are point-in-time

### 5.3 Materialized Views for Reports (Database Layer)

For daily/weekly/monthly/yearly reports that scan large date ranges:

**Problem:** A monthly sales report `SUM()` over 30 days of delivery records = scanning 10,000+ rows. Running this on every report request is O(n) where n = daily transaction volume × 30.

**Solution:** Pre-compute report aggregates in a materialized view, refreshed periodically.

```sql
-- Daily sales summary (materialized view)
CREATE MATERIALIZED VIEW daily_sales_summary AS
SELECT 
  DATE(created_at) as sale_date,
  COUNT(*) as order_count,
  SUM(total_amount) as total_sales,
  SUM(cash_received) as cash_collected,
  SUM(credit_amount) as credit_sales
FROM orders
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE(created_at);

-- Index on the materialized view for fast date lookups
CREATE UNIQUE INDEX idx_daily_sales_date ON daily_sales_summary(sale_date);

-- Refresh (run via node-cron at 1 AM daily, or after daily close)
REFRESH MATERIALIZED VIEW CONCURRENTLY daily_sales_summary;
```

**Tradeoffs:**
- **Pros:** Report queries become O(1) — single row lookup by date.
- **Cons:** Data is stale until refresh. Not suitable for real-time dashboard.
- **Rule:** Use materialized views for **reports** (stale data acceptable), NOT for **dashboard** or **order desk** (need current data).

**Report-specific materialized views:**

| View | Refresh Schedule | Use Case |
|------|-----------------|----------|
| `daily_sales_summary` | Daily at 1 AM | Sales reports |
| `weekly_inventory_summary` | Daily at 1 AM | Inventory reports |
| `monthly_production_summary` | Daily at 1 AM | Production reports |
| `customer_credit_summary` | Every 6 hours | Credit reports (near-real-time) |
| `vendor_balance_summary` | Daily at 1 AM | Vendor payable reports |
| `bottle_ledger_monthly` | Daily at 1 AM | Bottle reconciliation reports |

**Prisma integration:** Materialized views are read-only. Define them as Prisma models with `@@ignore` or query via `$queryRaw`.

```prisma
model DailySalesSummary {
  saleDate       DateTime @id @map("sale_date")
  orderCount     Int      @map("order_count")
  totalSales     Decimal  @map("total_sales")
  cashCollected  Decimal  @map("cash_collected")
  creditSales    Decimal  @map("credit_sales")

  @@map("daily_sales_summary")
}
```

---

## 6. Dashboard Query Optimization

### 6.1 The "Today's Metrics" Query

The owner dashboard's most critical card loads 6 numbers: today's sales, cash collected, credit sales, expenses, profit, pending orders.

**Naive approach:** 6 separate queries = 6 round trips.

**Optimized approach:** Single raw SQL query with CTEs (Common Table Expressions) = 1 round trip.

```sql
WITH today_orders AS (
  SELECT 
    COALESCE(SUM(oi.qty_ordered * oi.unit_price), 0) as total_sales,
    COUNT(*) as order_count
  FROM orders o
  JOIN order_items oi ON oi.order_id = o.id
  WHERE o.created_at >= CURRENT_DATE
    AND o.company_context = 'aquasphere'
),
today_payments AS (
  SELECT COALESCE(SUM(amount), 0) as cash_collected
  FROM payments
  WHERE received_at >= CURRENT_DATE
    AND company_context = 'aquasphere'
),
today_expenses AS (
  SELECT COALESCE(SUM(amount), 0) as total_expenses
  FROM expenses
  WHERE date = CURRENT_DATE
    AND company_context = 'aquasphere'
),
pending_orders AS (
  SELECT COUNT(*) as pending_count
  FROM orders
  WHERE delivery_status IN ('pending', 'partial')
    AND company_context = 'aquasphere'
)
SELECT 
  t.total_sales,
  t.order_count,
  p.cash_collected,
  p.cash_collected as credit_sales, -- Simplified; actual credit = total_sales - cash_collected
  e.total_expenses,
  (t.total_sales - e.total_expenses) as estimated_profit,
  pe.pending_count
FROM today_orders t
CROSS JOIN today_payments p
CROSS JOIN today_expenses e
CROSS JOIN pending_orders pe;
```

**Time complexity:** O(n) where n = today's records only (small constant).  
**Space complexity:** O(1) result set (single row with 7 columns).

### 6.2 Low-Stock Alerts

**Naive approach:** `SELECT * FROM items WHERE cached_qty <= reorder_level` — full table scan.

**Optimized approach:** Partial index + single query.

```sql
-- Partial index: only index items that are near or below reorder level
CREATE INDEX idx_low_stock ON items(item_id, cached_qty, reorder_level) 
  WHERE cached_qty <= reorder_level * 1.2; -- 20% buffer

-- Query (uses partial index)
SELECT name, cached_qty, reorder_level, (reorder_level - cached_qty) as deficit
FROM items
WHERE cached_qty <= reorder_level
ORDER BY deficit DESC;
```

**Time complexity:** O(m) where m = number of low-stock items (typically small).  
**Space complexity:** O(m) index size (much smaller than full index).

### 6.3 Customer Inactivity Alert (1-Week Follow-Up)

**Naive approach:** `SELECT * FROM customers WHERE last_order_at < NOW() - INTERVAL '7 days'` — full table scan on every dashboard load.

**Optimized approach:** Partial index on active customers + date range.

```sql
CREATE INDEX idx_inactive_customers ON customers(id, last_order_at, name, phone)
  WHERE last_order_at < NOW() - INTERVAL '7 days' AND archived_at IS NULL;

-- Query (uses partial index)
SELECT id, name, phone, last_order_at
FROM customers
WHERE last_order_at < NOW() - INTERVAL '7 days'
  AND archived_at IS NULL
ORDER BY last_order_at
LIMIT 20;
```

**Time complexity:** O(k) where k = inactive customers (small subset).  
**Space complexity:** O(k) index size.

---

## 7. Production Batch Optimization (Wadaana)

### 7.1 Preform Deduction — Single Transaction, Bulk Insert

A Wadaana production batch deducts preform from inventory and creates finished bottles. All in one atomic transaction:

```javascript
await prisma.$transaction(async (tx) => {
  // 1. Lock preform item record (SELECT FOR UPDATE)
  const preformItem = await tx.item.findUnique({
    where: { id: preformItemId },
    select: { cachedQty: true, name: true },
  });

  // 2. Validate sufficient stock (soft-block — warn but allow)
  const newQty = preformItem.cachedQty - preformGrams;

  // 3. Deduct preform (single update, not a transaction insert)
  await tx.item.update({
    where: { id: preformItemId },
    data: { cachedQty: { decrement: preformGrams } },
  });

  // 4. Create production batch record
  const batch = await tx.productionBatch.create({ data: batchData });

  // 5. Create finished goods inventory record (IN transaction)
  await tx.inventoryTransaction.create({
    data: {
      itemId: finishedGoodsItemId,
      direction: 'IN',
      qty: batchQty,
      refType: 'production_output',
      refId: batch.id,
    },
  });

  // 6. Update finished goods cached qty
  await tx.item.update({
    where: { id: finishedGoodsItemId },
    data: { cachedQty: { increment: batchQty } },
  });
}, { isolationLevel: 'Serializable' });
```

**Key optimization:** Preform deduction uses `cachedQty` arithmetic update (O(1)), not an `InventoryTransaction` insert + `SUM()` recalculation (O(n)). The `InventoryTransaction` is still inserted for audit trail, but the live balance comes from the cache.

### 7.2 Per-Company Order Filtering

Wadaana has 3+ client companies with separate order lists. Never fetch all orders then filter in JS.

```javascript
// BAD: Fetch all orders, filter in memory
const allOrders = await prisma.wadaanaOrder.findMany();
const deosaniOrders = allOrders.filter(o => o.companyId === deosaniId);

// GOOD: Filter at database level
const deosaniOrders = await prisma.wadaanaOrder.findMany({
  where: { companyId: deosaniId },
  orderBy: { createdAt: 'desc' },
  take: 50,
});
```

**Index:** `@@index([companyId, createdAt(sort: Desc)])` on `wadaana_order` table.

---

## 8. Daily Close & Locking Optimization

### 8.1 In-Memory Close Date Cache

Checking `DailyClose` table on every write is O(1) but unnecessary. Cache the latest close date in memory:

```javascript
// backend/src/utils/daily-close-cache.js
let cachedLatestCloseDate: Date | null = null;
let cachedCloseDateExpiry = 0;

export async function getLatestCloseDate(prisma: PrismaClient): Promise<Date | null> {
  const now = Date.now();
  if (now < cachedCloseDateExpiry && cachedLatestCloseDate) {
    return cachedLatestCloseDate;
  }

  const latestClose = await prisma.dailyClose.findFirst({
    orderBy: { closedDate: 'desc' },
    select: { closedDate: true },
  });

  cachedLatestCloseDate = latestClose?.closedDate ?? null;
  cachedCloseDateExpiry = now + 60_000; // Cache for 60 seconds
  return cachedLatestCloseDate;
}

export function invalidateCloseDateCache(): void {
  cachedLatestCloseDate = null;
  cachedCloseDateExpiry = 0;
}
```

**Middleware usage:**

```javascript
// In daily-close-guard.middleware.js
const latestClose = await getLatestCloseDate(prisma);
if (latestClose && transactionDate <= latestClose) {
  throw new ForbiddenError('This date is closed. Only Owner can edit.');
}
```

**Time complexity:** O(1) for 60 seconds after first lookup, then O(1) DB lookup.  
**Correctness:** Cache invalidated immediately when Admin clicks "Close Day."

---

## 9. File Upload Optimization

### 9.1 Streaming Uploads

Expense receipts and purchase bills are photos (JPEG/PNG, typically 1-3MB). Don't buffer entire files in memory.

```javascript
// Multer config — stream to S3, don't buffer
import multer from 'multer';
import multerS3 from 'multer-s3';
import { S3Client } from '@aws-sdk/client-s3';

const s3 = new S3Client({ region: process.env.AWS_REGION });

const upload = multer({
  storage: multerS3({
    s3,
    bucket: process.env.S3_BUCKET!,
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2)}-${file.originalname}`;
      cb(null, `uploads/${req.user?.companyContext}/${uniqueName}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});
```

**Memory optimization:** Streaming upload means the server never holds the entire file in RAM. A 3MB photo streams directly to S3 with < 1MB memory footprint.

### 9.2 Image Compression

Before storing, compress images to reduce S3 costs and load times:

```javascript
import sharp from 'sharp';

// Compress and resize before upload
const compressedBuffer = await sharp(fileBuffer)
  .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
  .jpeg({ quality: 80, progressive: true })
  .toBuffer();

// Typical reduction: 3MB → 400KB (87% smaller)
```

**Note:** `sharp` is an additional dependency. Evaluate if image compression is needed for Phase 1 (dev can skip, production should add).

---

## 10. Memory & Space Complexity Summary

| Operation | Naive Complexity | Optimized Complexity | Technique |
|-----------|-----------------|---------------------|-----------|
| Customer balance lookup | O(n) transactions | O(1) | Cached balance column |
| Inventory level check | O(n) transactions | O(1) | Cached qty column |
| Bottle ledger reconcile | 5 × O(n) = O(n) | O(1) DB + O(k) mapping | GROUP BY txn_type |
| Credit limit check | O(n) | O(1) | Cached balance |
| Customer search by phone | O(n) | O(log n) | Unique B-tree index |
| Customer search by name | O(n) | O(log n) | GIN trigram index |
| Pending orders list | O(n) | O(m) where m = pending | Partial index + status filter |
| Daily sales report | O(n × 30 days) | O(1) | Materialized view |
| Dashboard "Today" | 6 × O(n) = O(n) | O(today's records) | Single CTE query |
| Low-stock alerts | O(n) items | O(m) where m = low-stock | Partial index |
| Inactive customers | O(n) customers | O(k) where k = inactive | Partial index |
| Daily close check | O(1) per request | O(1) cached | In-memory TTL cache |
| Production batch | 5 × O(n) inserts | O(1) bulk + cache update | createMany + cached qty |
| Delivery completion | 6+ round trips | 1 transaction | $transaction with row locking |
| File upload (3MB) | O(3MB) RAM | O(1MB) RAM | Streaming to S3 |

---

## 11. Monitoring & Profiling

### 11.1 Query Logging

Enable Prisma query logging in development to catch N+1 and slow queries:

```javascript
const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'stdout', level: 'error' },
    { emit: 'stdout', level: 'warn' },
  ],
});

prisma.$on('query', (e) => {
  console.log(`Query: ${e.query}`);
  console.log(`Duration: ${e.duration}ms`);
  if (e.duration > 100) {
    console.warn(`SLOW QUERY: ${e.query} (${e.duration}ms)`);
  }
});
```

**Alert threshold:** Any query > 100ms in development, > 50ms in production.

### 11.2 EXPLAIN ANALYZE

For any slow query, run `EXPLAIN ANALYZE` in PostgreSQL to verify index usage:

```sql
EXPLAIN ANALYZE 
SELECT * FROM orders 
WHERE customer_id = 'uuid' 
ORDER BY created_at DESC 
LIMIT 10;

-- Expected output: "Index Scan using idx_order_customer_date"
-- Bad output: "Seq Scan on orders" (missing index)
```

### 11.3 Connection Pool Monitoring

```javascript
// Health check endpoint
app.get('/health', async (req, res) => {
  const poolInfo = await prisma.$queryRaw`
    SELECT 
      count(*) as active_connections,
      max_connections
    FROM pg_stat_activity, pg_settings 
    WHERE name = 'max_connections'
  `;
  res.json({ pool: poolInfo[0], status: 'ok' });
});
```

---

## 12. Decision Matrix: When to Apply What

| Scenario | Technique | Effort | Impact | Phase |
|----------|-----------|--------|--------|-------|
| Customer lookup by phone | Unique index on `phone` | Low | High | 1 |
| Customer balance display | Cached balance column | Low | Critical | 1 |
| Inventory level check | Cached qty column | Low | Critical | 1 |
| Order desk customer card | Covering index on `phone` | Low | High | 1 |
| Pending orders dashboard | Partial index on status | Low | High | 1 |
| Bottle ledger reconcile | GROUP BY txn_type | Low | High | 1 |
| Delivery completion | $transaction + row locking | Medium | Critical | 1 |
| N+1 prevention | include / relationLoadStrategy | Low | High | 1 |
| Dashboard "Today" | Single CTE raw query | Medium | High | 2 |
| Daily/weekly reports | Materialized views | Medium | High | 2 |
| Customer name search | GIN trigram index | Low | Medium | 2 |
| Daily close check | In-memory cache | Low | Medium | 2 |
| High-volume transaction tables | Table partitioning | High | Medium | 3 |
| Image compression | sharp library | Low | Low | 3 |
| Read replica for reports | Neon read replica | Medium | Medium | 3 |

---

*Optimization strategy aligned with AQUA_Sphere_OS_Master_Requirements.md — July 2026*
