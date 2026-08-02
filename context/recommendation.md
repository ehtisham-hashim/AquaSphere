# AquaSphere Frontend — Technical Recommendation
> Generated: 2026-08-02 | Covers: performance, library choices, DB query reduction, Redis strategy

---

## 1. Current Stack Inventory & What to Cut

```
react 19 + vite 8 + tailwindcss 4 + framer-motion 12
+ shadcn + @base-ui/react + @radix-ui/react-slot
+ class-variance-authority + clsx + tailwind-merge
+ date-fns + lucide-react + sonner + react-router-dom 7
+ babel-plugin-react-compiler (already in use — good)
```

### Ponytail Audit Findings

| Tag | Finding | Path | Potential Cut |
|-----|---------|------|--------------|
| `yagni` | `shadcn` CLI listed as runtime dep — it is a dev/code-gen tool, not a dep | `package.json` | -1 dep |
| `native` | `date-fns` imported only for `format()` in a few places — `Intl.DateTimeFormat` / `toLocaleDateString()` already in every browser | `Dashboard.jsx`, `Vendors.jsx`, others | -1 dep, ~-30 KB gzipped |
| `shrink` | Every page declares its own `const API = API_URL` alias — 15 copies | all pages | -15 lines of noise |
| `shrink` | `getCompanyFromCookie()` called on every render inside every page component — reads localStorage + cookie each time | `Vendors.jsx`, `Purchases.jsx`, `Production.jsx`, `CounterSales.jsx`, `AdminDashboard.jsx`, `TopNav.jsx` | fix: read once in AuthContext |
| `yagni` | `setCompanyCookie` writes to 4 places: `company` cookie, `tenant` cookie, `localStorage.company`, `localStorage.tenant` — 2 redundant | `companyCookie.js` | -2 writes per login |
| `delete` | `apiInterceptor.js` also reads `import.meta.env.VITE_API_URL` a second time inside the function body — already imported via `api.js` | `apiInterceptor.js` | -1 redundant env read |
| `yagni` | `@base-ui/react` AND `@radix-ui/react-slot` both installed; only `@radix-ui/react-slot` appears used by shadcn wrappers; `@base-ui` appears unused elsewhere | `package.json` | -1 dep |
| `shrink` | `confirm()` / `window.confirm()` used in 5+ places for delete/archive — blocking native dialog, inconsistent with `sonner` toast pattern | `Vendors.jsx`, `Orders.jsx`, `AdminDashboard.jsx`, others | replace with `DeleteConfirmationModal` already in `components/ui` |
| `shrink` | `tw-animate-css` package installed but Tailwind 4 ships animation utilities natively | `package.json` | -1 dep |
| `delete` | `const [, setStats] = useState(null)` in `Production.jsx L27` — stats fetched and set but the getter is thrown away | `Production.jsx` | dead state |
| `shrink` | CSV export in `Reports.jsx` is hand-rolled 20 lines — one liner possible | `Reports.jsx:83-110` | -15 lines |
| `yagni` | `TopNav.jsx` polls `/audit-logs` every 15 s — returns full log array, filters on the client. Server should filter; or use SSE already used in Dashboard | `TopNav.jsx:65` | cut 15 s polling |
| `shrink` | `AccountantDashboard.jsx` fetches `/orders`, `/expenses`, `/spot-sales`, `/daily-close/status` then manually filters `today`-only orders on the client | `AccountantDashboard.jsx:19-54` | move filter to server query param |

**net: -4 deps, ~-80 lines possible.**

---

## 2. Recommended Library Replacements / Additions

### Drop or Downgrade

| Current | Problem | Replace With |
|---------|---------|-------------|
| `date-fns` | ~30 KB for `format()` calls only | `Intl.DateTimeFormat` / `.toLocaleDateString()` — zero bytes |
| `tw-animate-css` | Tailwind 4 covers it | Remove, use `animate-*` utilities built-in |
| `shadcn` (runtime) | It is a CLI, not a dep | Move to `devDependencies` or remove if no longer code-generating |
| `@base-ui/react` | Appears unused; overlaps with `@radix-ui` | Audit and remove if truly unused |

### Add (Targeted, No Bloat)

| Library | Why | Bundle Cost |
|---------|-----|------------|
| **`@tanstack/react-query` v5** | Solves the DB-query-on-every-route problem in one package: automatic caching, dedup, background refetch, stale-while-revalidate | ~14 KB gzipped |
| **`ioredis`** *(backend only)* | Thin, fast Redis client for Node.js — the right choice for your backend cache layer | backend only |

> **Do not add** Zustand, Redux, Jotai, or any global state manager for this codebase. React Query's cache IS the state for server data. The only client state you have (modals, tabs, forms) is fine in `useState`.

---

## 3. The DB-Query-on-Every-Route Problem

### What is happening today

Every page component does this:

```js
useEffect(() => { fetchData(); }, []);
```

On every route mount:
- `Purchases` fires 3 parallel fetches (`/purchases`, `/vendors`, `/items`)
- `Orders` fires 3 parallel fetches (`/orders`, `/customers`, `/items`)
- `CounterSales` fires 4 parallel fetches
- `AdminDashboard` fires 3 parallel fetches
- `AccountantDashboard` fires 4 parallel fetches (then filters client-side)
- `TopNav` polls `/audit-logs` every 15 seconds regardless of user activity

**Result:** Navigating between 5 tabs = 15+ DB round-trips, many fetching the same `customers` and `items` lists repeatedly.

### Fix without React Query (minimal, drop-in)

If you want to defer React Query, a tiny in-memory cache module is enough for reference data:

```js
// src/utils/cache.js  (ponytail: simple TTL map, upgrade to React Query when load grows)
const store = new Map();
export async function cachedFetch(key, fetcher, ttlMs = 60_000) {
  const hit = store.get(key);
  if (hit && Date.now() - hit.ts < ttlMs) return hit.data;
  const data = await fetcher();
  store.set(key, { data, ts: Date.now() });
  return data;
}
export function invalidate(key) { store.delete(key); }
export function invalidatePrefix(prefix) {
  for (const k of store.keys()) if (k.startsWith(prefix)) store.delete(k);
}
```

Usage (replaces raw fetch in every page):
```js
const customers = await cachedFetch('customers', () =>
  fetch(`${API_URL}/customers`, { credentials: 'include' }).then(r => r.json()).then(j => j.data)
);
```

### Fix with React Query (recommended)

Install once:
```bash
pnpm add @tanstack/react-query
```

Wrap root:
```jsx
// main.jsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000 } } });
<QueryClientProvider client={qc}><App /></QueryClientProvider>
```

Every page replaces its `useEffect + useState` fetch block with:
```js
const { data: customers } = useQuery({
  queryKey: ['customers'],
  queryFn: () => fetch(`${API_URL}/customers`, { credentials: 'include' }).then(r => r.json()).then(j => j.data)
});
```

**What this buys:**
- Navigate `Orders -> CounterSales -> Orders`: zero refetches for `customers` and `items` within the stale window
- `staleTime: 60_000` = data is fresh for 60 seconds; React Query revalidates in background on next focus
- After a mutation (add order, update vendor) call `queryClient.invalidateQueries({ queryKey: ['orders'] })` — one line, page re-fetches, cache cleared
- The TopNav polling becomes: `useQuery({ queryKey: ['audit-logs'], refetchInterval: 15_000 })` — no manual setInterval

---

## 4. Redis Cache Layer — Design & Recommended Strategy

### Why Redis, not just React Query cache

React Query caches **per browser tab**. If you have 3 users (Owner, Accountant, MM) logged in simultaneously:
- Each makes their own DB hit for the same shared data (customers, items, vendors)
- Redis is a **shared server-side cache** — one query, three users served

### Where to put Redis

```
Client -> React Query (60s in-browser stale-while-revalidate)
          | miss or stale
       Backend API Routes
          | miss
       Redis (server-side TTL cache, 2-10 min)
          | miss
       PostgreSQL / Prisma
```

### Recommended Invalidation Strategy: Write-Through Invalidation (NOT TTL-only)

> **The user concern**: "we don't want users to get outdated results"

**Do NOT rely on TTL expiry alone.** TTL means a user could see 5-minute-old data after someone else records a sale. Instead, use **invalidation on write**:

```
Write operation happens -> cache key deleted -> next read repopulates from DB
```

This gives you:
- Reads served from Redis (fast)
- Any mutation (POST/PUT/DELETE/PATCH) instantly evicts the relevant key
- Next read is a cache miss -> fresh DB data -> repopulate Redis
- User never sees stale data caused by another user's write

### Cache Key Design

```
{tenant}:customers           -> TTL 10 min, invalidated on: POST/PUT/DELETE /customers
{tenant}:vendors             -> TTL 10 min, invalidated on: POST/PUT/DELETE /vendors
{tenant}:items               -> TTL 10 min, invalidated on: POST/PUT/DELETE /items
{tenant}:orders              -> TTL 2 min,  invalidated on: POST/PUT/DELETE /orders
{tenant}:spot-sales          -> TTL 2 min,  invalidated on: POST /spot-sales
{tenant}:purchases           -> TTL 5 min,  invalidated on: POST/PUT/DELETE /purchases
{tenant}:production          -> TTL 5 min,  invalidated on: POST /production
{tenant}:expenses            -> TTL 5 min,  invalidated on: POST /expenses
{tenant}:analytics:dashboard -> TTL 30 s,   invalidated on: any sales/purchase mutation
{tenant}:audit-logs          -> TTL 30 s,   invalidated on: any write
```

The `{tenant}:` prefix is critical because you run two tenants (aquasphere / wadaana) on the same backend.

### Node.js / Prisma Middleware Pattern (recommended implementation)

```js
// backend/utils/redisCache.js
import { redis } from './redisClient.js';

export async function getOrSet(key, fetcher, ttlSeconds = 120) {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);
  const data = await fetcher();
  await redis.set(key, JSON.stringify(data), 'EX', ttlSeconds);
  return data;
}

export async function invalidate(...keys) {
  if (keys.length) await redis.del(...keys);
}

export async function invalidatePrefix(prefix) {
  const keys = await redis.keys(`${prefix}*`);
  if (keys.length) await redis.del(...keys);
}
```

Usage inside a route handler:
```js
// GET /api/v1/customers
router.get('/customers', async (req, res) => {
  const key = `${req.tenant}:customers`;
  const data = await getOrSet(key, () => prisma.customer.findMany({...}), 600);
  res.json({ success: true, data });
});

// POST /api/v1/customers  -- write-through invalidation
router.post('/customers', async (req, res) => {
  const newCustomer = await prisma.customer.create({...});
  await invalidate(`${req.tenant}:customers`);   // evict list cache
  res.json({ success: true, data: newCustomer });
});
```

### What data should NOT be cached

| Endpoint | Reason |
|---------|--------|
| `/auth/me` | Session-specific, never cache |
| `/daily-close/status` | Must be real-time lock status |
| `/analytics/dashboard/stream` (SSE) | Already streaming — Redis not needed |
| Any user-specific financial summary | Compute fresh or use very short TTL (10-15s max) |

### Dashboard SSE Note

Your `Dashboard.jsx` already uses **SSE** (`EventSource`) for real-time dashboard data — that is excellent. Keep it. Redis should back the SSE endpoint's DB queries, not replace the SSE stream.

---

## 5. Quick-Win Priority Order

| Priority | Change | Effort | Impact |
|----------|--------|--------|--------|
| 1 (HIGH) | Remove `date-fns` -> use `Intl` | 1 hr | -30 KB bundle |
| 2 (HIGH) | Remove `tw-animate-css` | 10 min | -1 dep |
| 3 (HIGH) | Move `shadcn` to devDependencies | 5 min | cleaner dep graph |
| 4 (MED)  | Add `@tanstack/react-query` + wrap root | 2 hr | eliminates duplicate route fetches |
| 5 (MED)  | Replace `useEffect fetchData` in all pages with `useQuery` | 4 hr | biggest perf win before Redis |
| 6 (MED)  | Pull `tenant` read into `AuthContext` (one read, exposed via context) | 1 hr | removes 10+ redundant cookie reads per render |
| 7 (MED)  | Replace `window.confirm()` with existing `DeleteConfirmationModal` | 2 hr | UX consistency |
| 8 (MED)  | Fix `AccountantDashboard` to pass `?date=today` server-side | 30 min | -1 full orders fetch |
| 9 (LOW)  | Add Redis `getOrSet` + invalidation middleware on backend | 1 day | shared cache across all sessions |
| 10 (LOW) | Move TopNav audit-log polling to `useQuery({ refetchInterval })` | 30 min | no manual setInterval leak |

---

## 6. React Query + Redis Together — The Full Data Flow

```
User navigates to /orders
  -> useQuery(['orders']) -- cache HIT? serve instantly (React Query, 60s stale)
  -> cache MISS? -> GET /api/v1/orders
       -> Redis HIT? -> return JSON (0 DB query)
       -> Redis MISS? -> Prisma query -> cache in Redis (120s) -> return

User adds a new order (POST /orders)
  -> Backend invalidates redis key `aquasphere:orders`
  -> Backend returns new order
  -> queryClient.invalidateQueries(['orders']) -- React Query clears in-browser cache
  -> Next render -> useQuery refetches -> Redis MISS (just invalidated) -> Prisma -> fresh data
  -> All OTHER users' next request: Redis MISS -> Prisma -> fresh -- no stale data
```

This is **cache-aside with write-invalidation** — the industry standard pattern for OLTP apps where correctness matters more than throughput.

---

## 7. Error Handling Gaps to Fix

While reviewing, these unsafe patterns were found:

- `Users.jsx:60-80` — no error handling on `submitUser()` (no try/catch, response not checked)
- `Orders.jsx:76` — `localStorage.getItem('tenant')` called directly instead of `getCompanyFromCookie()` — inconsistent
- Multiple pages use `// eslint-disable-next-line react-hooks/exhaustive-deps` to suppress dependency warnings on `fetchData` — the real fix is wrapping `fetchData` in `useCallback` or switching to React Query

---

## 8. Bundle Size Wins Summary

| Action | Bundle Before | Bundle After |
|--------|--------|-------|
| Remove `date-fns` | +30 KB gz | 0 KB |
| Remove `tw-animate-css` | +5 KB gz | 0 KB |
| Remove `@base-ui/react` (if unused) | +15 KB gz | 0 KB |
| Add `@tanstack/react-query` | 0 | +14 KB gz |
| **Net** | **+50 KB gz extra** | **-36 KB gz net** |

> React Query pays for itself: it replaces ~300+ lines of `useEffect` + loading/error state boilerplate across 18 pages.

---

*Prepared using ponytail (full), ponytail-audit, and ponytail-review mode.*
*Rule: deletion over addition. Ship the lazy version. No unrequested abstractions.*
