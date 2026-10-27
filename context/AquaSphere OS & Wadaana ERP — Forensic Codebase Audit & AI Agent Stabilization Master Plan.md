# **AquaSphere OS & Wadaana ERP — Full-Stack Forensic Codebase Audit & AI Agent Stabilization Master Plan**

**Repository Audited:** `ehtisham-hashim/aquasphere` (Commit `ff5f7d3f`)  
**Total Codebase Scope:** 11,887 lines Backend (Node.js / Express / Prisma / PostgreSQL) \+ 37,361 lines Frontend (React 18 / Vite / Tailwind)  
**Target Use:** Direct Blueprint & Prompt Specification for your AI Coding Agent

# **1\. Executive Summary: Why Fixing One Thing Breaks Another**

In **AquaSphere OS & Wadaana ERP**, fixing a bug in one screen frequently disturbs an unrelated feature because of **five systemic architectural couplings**:

1. **Dual Unit Storage vs. Trading Unit Ambiguity (The "Pack vs. Bottle" Trap):** Finished goods are stored in the PostgreSQL database (`Item` model in `prisma/schema.prisma`) in **base bottles** (`unit = 'bottle'`, `packSize = 12` for 0.5L, `packSize = 6` for 1.5L), while orders (`OrderItem.quantity`) and production batches (`packs05L`, `packs15L`, `quantity`) trade in **packs**. When an AI agent edits Order Creation, Delivery, or Stock Warnings without multiplying by `packSize`, it compares *ordered packs* against *available base bottles* or deducts the wrong stock column.  
2. **Substring Name-Matching Instead of Canonical Product Codes:** Across 12+ backend and frontend files, business logic identifies products by checking `.name.toLowerCase().includes('0.5')`, `.includes('19l')`, or `.includes('empty')`. Renaming an item in the UI or adding a new product (like *Pivirifine*) silently breaks mineral dosing, bottle custody, or stock rollbacks.  
3. **Scattered Role & Permission Logic (3 Separate Sources of Truth):** Permissions are defined separately in `frontend/src/constants/roleAccess.js` (Sidebar), inline inside React page components (`const canEdit = ...`), and in `backend/src/routes/*.js` (`requireRoles(...)`). When an AI agent updates access in one place, it triggers `403 Forbidden` or broken UI buttons in another.  
4. **Inconsistent API Response Envelopes & Cache Invalidation:** Backend controllers mix `sendSuccess(res, data, 200, extra)` and `new ApiResponse(200, data, msg)`, and pagination metadata alternates between `totalPages` and `pages`. Meanwhile, `frontend/src/utils/apiCache.js` intercepts `window.fetch` and caches `GET` responses for 30 seconds based on URL regex matching—so if a mutation doesn't clear the exact related endpoint key, the UI displays stale numbers.  
5. **Dual-Table / Legacy Schema Overlaps:** Vehicle expenses are split between `Expense` (with `vehicleId`) and a legacy `TransportExpense` table; Production Batches store items in both legacy columns (`packs05L`, `packs15L`, `qtyPure05L`) and a JSON string inside `remarks` (`JSON.stringify({ producedItems })`).

# **2\. What Is Good vs. What Is Bad (Strengths & Fragilities)**

## **2.1 What Is Good (Core Architectural Strengths — DO NOT TOUCH OR REWRITE)**

| Component / Layer | File Location(s) | Why It Is Solid & Must Be Protected |
| :---- | :---- | :---- |
| **Schema-Per-Tenant PostgreSQL Isolation** | `backend/prisma/schema.prisma`, `backend/src/utils/tenant.js` | Complete physical separation between `aquasphere` and `wadaana` PostgreSQL schemas using dynamic Prisma model resolution (``prisma[`${prefix}Model`]``). Zero cross-company data leakage. |
| **Hardened Auth & Session Recovery** | `backend/src/middlewares/auth.middleware.js`, `frontend/src/context/AuthContext.jsx`, `frontend/src/utils/apiCache.js` | 60-second in-memory user verification cache prevents PostgreSQL connection pool exhaustion; `apiCache.js` automatically injects `Authorization: Bearer <token>` and `x-tenant` headers and dispatches `auth-unauthorized` on `401` to prevent blank-screen zombie sessions. |
| **Real-Time SSE Event Bus & Auto-Wakeup** | `backend/src/utils/sseBus.js`, `frontend/src/context/SSEContext.jsx` | Lightweight Server-Sent Events bus with 25-second heartbeats, sleeping-tab watchdog reconnection, and automatic cache invalidation (`EVENT_CACHE_MAP`) on mutations. |
| **Symmetrical Transaction Rollbacks on Owner Deletes** | `order.controller.js`, `spotSale.controller.js`, `purchase.controller.js`, `customer.controller.js` | When `OWNER` deletes an order, counter sale, purchase, or customer, Prisma `$transaction` blocks reverse `cachedQty`, `factoryQty`, `currentBalance`, and `cachedBottleBalance` before deleting child records. |
| **Production Safety Locks on Wipe Scripts** | `backend/.dockerignore`, `backend/clear_*.js`, `backend/scripts/wipe-database.js` | Destructive scripts are excluded from Docker builds and guarded by `ALLOW_PROD_WIPE === 'YES_WIPE_PRODUCTION_DATA'`. |
| **Client-Side Pagination & SSE Stability** | `frontend/src/hooks/usePagination.js`, `frontend/src/components/common/TablePagination.jsx` | `usePagination` clamps page bounds safely and only resets to Page 1 when `resetTrigger` (search/filter) changes, preventing background SSE events from kicking users back to Page 1\. |

## **2.2 What Is Bad / Fragile (Confirmed Bugs & Regression Traps Found in Code)**

| Bug ID | Severity | Exact File & Line Numbers | What Is Broken / Happening | Impact on Operations |
| :---- | :---- | :---- | :---- | :---- |
| **BUG-01** | **CRITICAL** | `backend/src/routes/settings.routes.js:L16` vs `backend/src/middlewares/role.middleware.js:L3` | `requireRoles(['OWNER', 'ADMIN', ...])` passes an **array** to `export const requireRoles = (...roles) =>`, making `roles` a nested array `[['OWNER', ...]]`. `roles.includes(req.user.role)` evaluates to `false` for everyone except `OWNER`. | Non-Owner roles listed on the route get `403 Forbidden` when updating operational defaults. |
| **BUG-02** | **CRITICAL** | `frontend/src/components/dashboard/AccountantDashboardView.jsx:L110` vs `backend/src/controllers/dailyClose.controller.js:L124` | `AccountantDashboardView.jsx` calls ``fetch(`${API_URL}/daily-close/status?tenant=${tenant}`)`` **without `?date=${today}`**. Backend `getDailyCloseStatus` throws `400 Bad Request: Date is required` on line 124\! | Accountant Dashboard fails every single load with HTTP 400 and always displays "Day Open" even when the day is locked and closed. |
| **BUG-03** | **HIGH** | `frontend/src/components/dashboard/AccountantDashboardView.jsx:L111, L219-L221` vs `backend/src/controllers/expense.controller.js:L23` | `AccountantDashboardView.jsx` calls `/expenses?tenant=${tenant}&date=${today}`, but `getExpenses` only filters by `startDate` and `endDate` (ignoring `date`), so it returns **all historical expenses**. Worse, lines 219–221 render `item.description` and `item.recordedBy`, which do not exist on `Expense` (`item.remarks` and `item.createdBy?.name`). | Accountant Dashboard "Today's Expense Log" shows all-time expenses instead of today's, and displays blank `—` for notes and `Admin` for every user. |
| **BUG-04** | **HIGH** | `frontend/src/components/orders/ProcessDeliveryModal.jsx:L78-L89` vs `backend/src/controllers/order.controller.js:L385-L398` | In `ProcessDeliveryModal.jsx`, `stockErrors` checks `avail < req` where `avail` is in **base bottles** (`factoryQty`) and `req` is in **packs** (`i.quantity`), without multiplying `req` by `packSize`\! Meanwhile, `order.controller.js:L110` (`createOrder` low stock warning) also compares `rItem.quantity` (packs) against `dbItem.cachedQty` (base bottles) without multiplying by `packSize`\! | If Factory Floor has 10 bottles of 0.5L PET (less than 1 pack of 12\) and an order is for 2 packs (24 bottles), the frontend modal thinks `10 >= 2` (sufficient stock\!), lets the user submit, and then the backend throws `400 Insufficient Factory Floor stock`. |
| **BUG-05** | **HIGH** | `backend/src/controllers/production.controller.js:L707-L711` (`deleteProductionBatch`) | When `completeProductionBatch` runs (`L622-L645`), it increments/decrements **both** `cachedQty` and `factoryQty`. However, when `deleteProductionBatch` rolls back a completed batch (`L707-L711`), it only reverses `cachedQty` and **completely forgets to reverse `factoryQty`**\! | Deleting a production batch leaves phantom finished goods on the Factory Floor (`factoryQty > cachedQty`) and under-counts raw materials on the Factory Floor, corrupting stock transfers and order delivery checks. |
| **BUG-06** | **HIGH** | `backend/src/controllers/spotSale.controller.js:L660-L735` (`deleteSpotSale`) | When `createSpotSale` runs (`L439-L515`), it deducts `RAW_MATERIAL` items, `WATER_REFILL` / `CUSTOM_WATER` minerals (`Calcium`, `Magnesium`, `Sodium`), and deducts finished goods across `factoryQty` and `warehouseQty`. When `deleteSpotSale` runs, it **does not restore `factoryQty` for `EXTRA_CAP`** (`L675` only increments `cachedQty`), **never restores mineral deductions**, and **dumps all restored stock into `factoryQty`** even if it was deducted from `warehouseQty`. | Deleting a counter sale causes `factoryQty + warehouseQty` to drift out of sync with `cachedQty`. |
| **BUG-07** | **HIGH** | `backend/src/routes/order.routes.js:L14-L18`, `backend/src/routes/production.routes.js:L14-L16`, `backend/src/routes/spotSale.routes.js:L28`, `backend/src/routes/transportExpense.routes.js:L11-L12` | `PROJECT_RULES.md` Section 4 mandates `checkDailyCloseLock` on all write routes touching `orders`, `production_batches`, `purchases`, `expenses`, and `spot-sales`. Currently, `checkDailyCloseLock` is **completely missing** from `order.routes.js` (all write routes), `production.routes.js` (all write routes), `spotSale.routes.js` (`DELETE /:id`), and `transportExpense.routes.js` (`POST /`, `DELETE /:id`). | Non-Owner staff can create/edit/deliver orders, log/complete production batches, or add/delete transport expenses on a date that has already been finalized and locked by Daily Close\! |
| **BUG-08** | **MEDIUM** | `backend/src/controllers/alerts.controller.js:L89` vs `backend/src/controllers/order.controller.js:L159` | `order.controller.js:L159` and `productMappings.js:L78` calculate covered 19L bottles using `SECURITY_RATE = 1000` (`Math.floor(deposit / 1000)`). However, `alerts.controller.js:L10, L89` hardcodes `const BOTTLE_COST = 1500` (`Math.floor(deposit / 1500)`). | A customer with Rs. 2,000 deposit and 2 bottles passes the order security check (2 bottles covered at Rs. 1,000/bottle), but triggers a false "Security Deposit Warning" on the Marketing Manager dashboard (which calculates only 1 bottle covered at Rs. 1,500/bottle). |
| **BUG-09** | **MEDIUM** | `backend/src/controllers/order.controller.js:L231-L242` (`updateOrder`) | `createOrder` uses `resolveOrderItems(prefix, items)` to safely resolve non-UUID item names, but `updateOrder` inserts `i.itemId` directly into `OrderItem.createMany` without calling `resolveOrderItems` and without logging to `AuditLog`. | Editing an order with a non-UUID item crashes with a Prisma Foreign Key error (`P2003`), and order edits leave zero audit trail. |
| **BUG-10** | **MEDIUM** | `frontend/src/utils/apiCache.js:L229-L244` | In `setupApiCache()`, post-mutation cache clearing maps `rawSegment` (`orders`, `production`, `purchases`, etc.), but **omits `daily-close`, `vehicles`, `transport-expenses`, `users`, `settings`, and `admin`**. Even worse, when `orders` or `expenses` mutate, `apiCache.js` does not clear `'admin'` or `'daily-close'`. | After confirming a department Daily Close or updating a Vehicle/User/Setting, cached GET responses can serve stale data for up to 30 seconds unless manually cleared. |
| **BUG-11** | **MEDIUM** | `backend/src/controllers/dailyClose.controller.js:L10` (`parseDateRange`) vs `spotSale.controller.js:L82`, `production.controller.js:L83`, `analytics.controller.js:L9` | `dailyClose.controller.js` parses dates using `setUTCHours(0,0,0,0)` (UTC midnight), whereas `analytics.controller.js`, `spotSale.controller.js`, and `production.controller.js` use `setHours(0,0,0,0)` (server local time, or UTC in Docker). Meanwhile, `spotSale.controller.js:L590` (`updateSpotSale`) checks `saleDate.setHours(0,0,0,0)` against `DailyClose.date` (which is stored at UTC midnight). | In PKT (`UTC+5`), transactions recorded between 12:00 AM and 5:00 AM PKT fall on the previous UTC day, causing mismatches between "Today's Summary" cards and Daily Close totals. |
| **BUG-12** | **LOW / DEBT** | `frontend/src/pages/Cars.jsx`, `frontend/src/pages/TransportExpenses.jsx`, `frontend/src/components/orders/NewOrderModal.jsx`, `backend/src/routes/transportExpense.routes.js` | `App.jsx` redirects `/cars` and `/transport-expenses` to `/transport` (which uses `Vehicle` \+ `Expense` with `vehicleId`), but the old `Cars.jsx`, `TransportExpenses.jsx`, `AddTransportExpenseModal.jsx`, and `NewOrderModal.jsx` files still sit in the repo. AI agents frequently get confused and edit `TransportExpenses.jsx` or `NewOrderModal.jsx` instead of `Transport.jsx` or `AddOrderModal.jsx`\! | AI agent edits the wrong file, leading to "feature didn't change" or "code broke" confusion. |

# **3\. Complete Backend & Frontend API Contract Matrix**

Your AI agent must treat this table as the **strict, immutable API contract**. Every endpoint returns `{ success: true, data: ... }`.

| Endpoint Group | Route & Method | Allowed Roles (OWNER always allowed) | Daily Close Lock | Response data Shape & Critical Contract Rules |
| :---- | :---- | :---- | :---- | :---- |
| **Auth** | `POST /api/v1/auth/login``POST /api/v1/auth/verify-owner-otp``POST /api/v1/auth/resend-owner-otp``POST /api/v1/auth/logout``GET /api/v1/auth/me` | Public (login/2FA/logout)Any Auth (`me`) | Exempt | Returns `{ user, token }` (or `{ require2FA, tempToken }`). Frontend **must** store `token` via `setAuthToken()` and attach `Authorization: Bearer <token>` \+ `x-tenant`. Never cache `/auth/*`. |
| **Items & Inventory** | `GET /api/v1/items``GET /api/v1/items/transactions``POST /api/v1/items``PUT /api/v1/items/:id``PATCH /api/v1/items/:id``POST /api/v1/items/transfer-stock``POST /api/v1/items/:id/adjust``POST /api/v1/items/:id/reconcile``PUT /api/v1/items/:id/price``PUT /api/v1/items/pricing/batch``DELETE /api/v1/items/:id` | GET: All AuthPOST/PUT: `ADMIN`, `PM`PATCH: `ADMIN`, `PM`, `MM`, `ACCOUNTANT`Transfer: `PM`Adjust/Reconcile/Price/Archive/Delete: `OWNER` | Exempt (Catalog/Stock) | `GET /items` returns **flat array** `Item[]`. **Base Unit Storage Law**: For `FINISHED_GOOD` (except Bulk Water in `Litres`), `cachedQty`, `factoryQty`, and `warehouseQty` are stored in **base bottles**, and `packSize` is the trading multiplier (`12` for 0.5L, `6` for 1.5L, `1` for 19L). Every write to `cachedQty` **must** symmetrically update `factoryQty` / `warehouseQty` and create an `InventoryTransaction` inside the same `prisma.$transaction`. |
| **Production** | `GET /api/v1/production``GET /api/v1/production/stats``POST /api/v1/production``POST /api/v1/production/:id/complete``DELETE /api/v1/production/:id` | GET: `ADMIN`, `PM`POST/Complete: `PM`DELETE: `OWNER` | **MUST ADD** `checkDailyCloseLock` on `POST`, `complete`, `DELETE` | `GET /production` returns **flat array** `ProductionBatch[]` (with optional top-level `pagination`). Completing a batch deducts raw materials (`factoryQty` & `cachedQty`) and increments finished goods (`factoryQty` & `cachedQty` by `quantity * packSize`). Deleting a completed batch **must** reverse both `cachedQty` and `factoryQty`. |
| **Customers** | `GET /api/v1/customers``GET /api/v1/customers/:id``POST /api/v1/customers``PUT /api/v1/customers/:id``PATCH /api/v1/customers/:id/restore``DELETE /api/v1/customers/:id` | GET: `ADMIN`, `ACCOUNTANT`, `MM`, `TM`POST/PUT: `ADMIN`, `MM`Restore/DELETE: `OWNER` | Exempt (CRM Profile) | `GET /customers` returns **flat array** `Customer[]` (with optional top-level `pagination`). `GET /customers/:id` returns `{ ...customer, orders, bottleTransactions, payments, auditLogs }`. |
| **Orders** | `GET /api/v1/orders``GET /api/v1/orders/:id/pdf``POST /api/v1/orders``PUT /api/v1/orders/:id``POST /api/v1/orders/:id/deliver``POST /api/v1/orders/:id/payment``DELETE /api/v1/orders/:id` | GET: `ADMIN`, `ACCOUNTANT`, `MM`, `TM`POST/PUT/Deliver/Payment: `ADMIN`, `ACCOUNTANT`, `MM`DELETE: `OWNER` (hard delete), `MM` (soft cancel) | **MUST ADD** `checkDailyCloseLock` on `POST`, `PUT`, `deliver`, `payment`, `DELETE` | `GET /orders` returns **flat array** `Order[]`. Soft-blocks (`LOW_STOCK_WARNING`, `UNUSUAL_QUANTITY`, `BOTTLE_SECURITY_EXCEEDED`) return `HTTP 200` with `{ success: false, softBlock: true, blockReason, message }`. Order quantities are in **packs** (`packSize` multiplier applies when checking/deducting `factoryQty` and `cachedQty`). |
| **Counter Sales (Spot Sales)** | `GET /api/v1/spot-sales``GET /api/v1/spot-sales/summary/today``POST /api/v1/spot-sales``PUT /api/v1/spot-sales/:id``DELETE /api/v1/spot-sales/:id` | GET/POST/PUT: `ADMIN`, `ACCOUNTANT`, `MM`DELETE: `OWNER` | Active on `POST` & `PUT`; **MUST ADD** on `DELETE` | AquaSphere only (`isWadaana` redirects to `/dashboard`). `GET /spot-sales` returns **flat array** `SpotSale[]`. Walk-in customers (`customerId == null`) cannot leave unpaid debt (`debtAmount > 0`). |
| **Purchases & Vendors** | `GET /api/v1/purchases``POST /api/v1/purchases``POST /api/v1/purchases/:id/payment``POST /api/v1/purchases/:id/approve``PUT /api/v1/purchases/:id``DELETE /api/v1/purchases/:id``GET /api/v1/vendors` (+ CRUD) | GET/POST/Payment: `ACCOUNTANT`, `ADMIN`Approve: `ACCOUNTANT`PUT/DELETE: `OWNER`Vendors GET: `ACCOUNTANT`, `ADMIN`, `MM` | Active on `purchases` writes | `GET /purchases` returns **flat array** `Purchase[]` with computed `paidAmount` and `outstandingAmount`. Raw material purchases increment `cachedQty` and `factoryQty` and create `VendorLedgerEntry` (`PURCHASE`, plus `PAYMENT` if `paymentStatus === 'PAID'`). |
| **Expenses & Fleet** | `GET /api/v1/expenses``POST /api/v1/expenses``DELETE /api/v1/expenses/:id``GET /api/v1/vehicles` (+ CRUD) | Expenses GET: `ADMIN`, `ACCOUNTANT`, `TM`Expenses Write/Delete: `ACCOUNTANT`, `TM`Vehicles: `ADMIN`, `TM` | Active on `expenses` writes | `GET /expenses` returns **flat array** `Expense[]` (merging `Purchase` records as `id: "pur_<uuid>"` when `category` includes `'Raw Materials'` and user is not `TM`). Receipt photo (`receiptUrl`) is mandatory for creating expenses. |
| **Daily Close** | `GET /api/v1/daily-close/status?date=YYYY-MM-DD``GET /api/v1/daily-close/history``POST /api/v1/daily-close/{pm,mm,tm}-confirm``POST /api/v1/daily-close/counter-audit``POST /api/v1/daily-close``POST /api/v1/daily-close/reopen` | Status/History: All AuthConfirm: `PM` / `MM` / `TM` / `ADMIN`Counter Audit & Finalize: `ADMIN`, `ACCOUNTANT`Reopen: `OWNER` | Enforces lock | `status` requires `?date=YYYY-MM-DD`. Finalizing (`POST /daily-close`) requires `CounterAuditLedger` submitted \+ `pmConfirmed`, `mmConfirmed`, and `tmConfirmed` all `true`. |
| **Analytics & Admin** | `GET /api/v1/analytics/dashboard``GET /api/v1/analytics/production-dashboard``GET /api/v1/analytics/daily-summary?date=...``GET /api/v1/admin/dashboard``GET /api/v1/admin/notification-alerts` | Analytics: All AuthAdmin routes: `OWNER`, `ADMIN`, `MM` | Exempt (Read-Only) | Provides pre-aggregated time buckets (`daily`, `yesterday`, `last3Days`, `week`, `monthly`, `yearly`) and alert feeds. |

# **4\. The "Golden Rules" for Your AI Coding Agent (Anti-Breakage Protocol)**

Whenever you give a task to your AI agent, prepend or enforce these **8 Non-Negotiable Guardrails** so it never breaks existing features:

1. **Rule 1 — Never Nest `res.json().data` Arrays:** Every list endpoint (`/customers`, `/orders`, `/items`, `/production`, `/spot-sales`, `/purchases`, `/vendors`, `/expenses`, `/vehicles`, `/users`) **must** return `{ success: true, data: [...] }` where `data` is a flat array. Pagination or cursor metadata (`pagination`, `nextCursor`, `hasMore`) must be top-level sibling properties via `sendSuccess(res, array, 200, { pagination })`.  
2. **Rule 2 — Respect the Base Unit Storage Law (`packSize`):** Finished goods in `Item` store quantities in **base bottles** (`cachedQty`, `factoryQty`, `warehouseQty`). Orders (`OrderItem.quantity`) and Production Batches (`packs05L`, `packs15L`, `quantity`) store quantities in **packs**. Whenever comparing or transferring between an Order/Batch and Item Inventory, **always multiply pack quantity by `Number(item.packSize || 1)`**.  
3. **Rule 3 — Symmetrical Ledger & Cache Updates in `prisma.$transaction`:** Never update `cachedQty` without updating `factoryQty` (or `warehouseQty`) and writing an `InventoryTransaction` row in the exact same `prisma.$transaction`. Never update `Customer.currentBalance` or `cachedBottleBalance` without a corresponding `Payment` or `BottleTransaction` row.  
4. **Rule 4 — `requireRoles` Takes Rest Parameters (`...roles`), NOT an Array:** Always call `requireRoles('OWNER', 'ADMIN')`, never `requireRoles(['OWNER', 'ADMIN'])` (or make `requireRoles` flatten arrays with `roles.flat()`).  
5. **Rule 5 — Preserve Multi-Tenant Isolation (`prefix`):** Every Prisma query in every controller must use `const prefix = getTenantPrefix(req);` and ``prisma[`${prefix}Model`]``. Never hardcode `prisma.aquasphere...` or `prisma.wadaana...` in shared endpoints.  
6. **Rule 6 — Do Not Edit Dead / Redirected Files:**  
   * Edit `frontend/src/pages/Transport.jsx` (NOT `Cars.jsx` or `TransportExpenses.jsx`).  
   * Edit `frontend/src/components/orders/AddOrderModal.jsx` (NOT `NewOrderModal.jsx`).  
   * Edit `frontend/src/utils/apiCache.js` (NOT `apiInterceptor.js`).  
7. **Rule 7 — Update `apiCache.js` Invalidations When Adding Endpoints:** If a mutation modifies state displayed on another screen, ensure `relatedMap` in `frontend/src/utils/apiCache.js` and `EVENT_CACHE_MAP` in `frontend/src/context/SSEContext.jsx` invalidate all affected endpoint keys.  
8. **Rule 8 — One Focused Phase Per Commit:** Never allow the AI agent to refactor multiple unrelated modules in a single prompt. Execute changes phase-by-phase using the Master Plan below and run verification checks after each phase.

# **5\. Phased Zero-Risk Stabilization & Fix Plan (Step-by-Step)**

This plan is ordered from **lowest blast radius / highest immediate fix value** to **structural cleanup**, ensuring zero downtime or data risk.

## **Phase 1: Immediate Zero-Risk Bug Fixes (Fixes Broken Screens & 403/400 Errors)**

* **Step 1.1 — Flatten `requireRoles` Middleware (`backend/src/middlewares/role.middleware.js`):**  
  Update `requireRoles` so it accepts both `requireRoles('OWNER', 'ADMIN')` and `requireRoles(['OWNER', 'ADMIN'])` by normalizing `const allowed = roles.flat();`. This immediately fixes **BUG-01** in `settings.routes.js` and prevents future AI agent mistakes.  
* **Step 1.2 — Fix Accountant Dashboard 400 Error & Expense Table (`frontend/src/components/dashboard/AccountantDashboardView.jsx` & `backend/src/controllers/expense.controller.js`):**  
  * In `AccountantDashboardView.jsx:L110`, pass `?date=${today}&tenant=${tenant}` to `/daily-close/status` (**BUG-02**).  
  * In `AccountantDashboardView.jsx:L111`, pass `?startDate=${today}&endDate=${today}&tenant=${tenant}` to `/expenses`, and in `L219-L221` render `item.remarks || '—'`, `'RECEIPT'`, and `item.createdBy?.name || 'Staff'` (**BUG-03**).  
  * In `expense.controller.js:L23`, also support an optional `date` query parameter (`if (req.query.date) { startDate = req.query.date; endDate = req.query.date; }`) for backward compatibility.  
* **Step 1.3 — Unify 19L Bottle Security Deposit Constant (`backend/src/controllers/alerts.controller.js`):**  
  Import `BOTTLE_19L_SPECS` from `../constants/productMappings.js` and use `BOTTLE_19L_SPECS.SECURITY_RATE` (`1000`) instead of hardcoded `1500` on line 10 (**BUG-08**).

## **Phase 2: Inventory, Pack-Size & Rollback Integrity Fixes (Fixes Stock Drift)**

* **Step 2.1 — Fix Pack-to-Bottle Multiplier in Order Low-Stock & Delivery Checks (`backend/src/controllers/order.controller.js` & `frontend/src/components/orders/ProcessDeliveryModal.jsx`):**  
  * In `order.controller.js:L109-L118` (`createOrder`), multiply `rItem.quantity * Number(dbItem.packSize || 1)` when comparing against `availableStock` (`dbItem.cachedQty`), or compare in packs (`Math.floor(availableStock / packSize)`), so PET pack orders don't falsely pass/fail low-stock checks (**BUG-04**).  
  * In `ProcessDeliveryModal.jsx:L80-L89`, multiply `Number(i.quantity || 0) * Number(i.item?.packSize || 1)` when comparing against `avail` (`factoryQty`) so the frontend modal matches the backend delivery validation (**BUG-04**).  
* **Step 2.2 — Fix `factoryQty` Rollback in `deleteProductionBatch` (`backend/src/controllers/production.controller.js:L703-L714`):**  
  When reversing `BATCH` inventory transactions in `deleteProductionBatch`, decrement/increment **both** `cachedQty` and `factoryQty` (`data: { cachedQty: { decrement: q }, factoryQty: { decrement: q } }`) so deleting a batch never leaves ghost stock on the Factory Floor (**BUG-05**).  
* **Step 2.3 — Fix `factoryQty` & `warehouseQty` Rollback in `deleteSpotSale` (`backend/src/controllers/spotSale.controller.js:L660-L735`):**  
  Instead of guessing locations from `SpotSaleItem` rows in `deleteSpotSale`, query the actual `InventoryTransaction` records created for that sale (`where: { refType: 'SPOT_SALE', refId: existing.saleNumber }`), reverse each transaction on its exact recorded `location` (`FACTORY` vs `WAREHOUSE`)—including `EXTRA_CAP` and `SPOT_SALE_MINERAL_DOSING`—and log offsetting `IN` transactions (**BUG-06**).  
* **Step 2.4 — Harden `updateOrder` with `resolveOrderItems` & Audit Logging (`backend/src/controllers/order.controller.js:L220-L253`):**  
  Run `const resolvedItems = await resolveOrderItems(prefix, items);` inside `updateOrder` before recreating `OrderItem` rows, and log `ORDER_UPDATED` via `createAuditLog` (**BUG-09**).

## **Phase 3: Daily Close Lock Enforcement & Cache Synchronization**

* **Step 3.1 — Enforce `checkDailyCloseLock` Across All Financial/Operational Write Routes (BUG-07):**  
  * Add `checkDailyCloseLock` to `backend/src/routes/order.routes.js` (`POST /`, `PUT /:id`, `POST /:id/deliver`, `POST /:id/payment`, `DELETE /:id`).  
  * Add `checkDailyCloseLock` to `backend/src/routes/production.routes.js` (`POST /`, `POST /:id/complete`, `DELETE /:id`).  
  * Add `checkDailyCloseLock` to `backend/src/routes/spotSale.routes.js` (`PUT /:id`, `DELETE /:id`).  
  * In `dailyClose.middleware.js:L40`, include `body.expectedDelivery || body.expenseDate` in `transactionDateRaw` extraction so order and expense dates are accurately checked.  
* **Step 3.2 — Complete `apiCache.js` Mutation Invalidation Map (BUG-10):**  
  In `frontend/src/utils/apiCache.js:L231-L241`, expand `relatedMap` so mutations on `orders`, `production`, `spot-sales`, `purchases`, `expenses`, `daily-close`, `vehicles`, `users`, and `settings` invalidate `'admin'`, `'daily-close'`, and `'analytics'`.

## **Phase 4: Dead Code Removal & Codebase Hygiene (Prevents Future AI Agent Confusion)**

* **Step 4.1 — Remove Orphaned / Duplicate Frontend Files (BUG-12):**  
  Delete unused files that are no longer mounted in `App.jsx`:  
  * `frontend/src/pages/Cars.jsx`  
  * `frontend/src/pages/TransportExpenses.jsx`  
  * `frontend/src/components/transport/CarsHeader.jsx`  
  * `frontend/src/components/transport/TransportExpensesHeader.jsx`  
  * `frontend/src/components/transport/TransportExpensesTable.jsx`  
  * `frontend/src/components/transport/AddTransportExpenseModal.jsx`  
  * `frontend/src/components/orders/NewOrderModal.jsx`

Update barrel exports in `frontend/src/components/transport/index.js` and `frontend/src/components/orders/index.js`.

# **6\. Copy-Paste Master Prompt for Your AI Coding Agent**

Copy and paste the prompt block below directly into your AI coding agent (Cursor / Windsurf / Claude Code / Antigravity) to execute Phases 1–4 safely without breaking any existing functionality:

```
You are tasked with executing a Zero-Risk Stabilization & Bug Fix Plan on the AquaSphere OS & Wadaana ERP repository (Node.js / Express / Prisma / PostgreSQL backend + React 18 / Vite / Tailwind frontend).
Read `PROJECT_RULES.md` first. You MUST strictly obey all multi-tenancy (`getTenantPrefix(req)` -> `prisma[`${prefix}Model`]`), Base Unit Storage (`packSize`), and flat-array response (`sendSuccess(res, arrayData, 200, extra)`) contracts. Do NOT alter `prisma/schema.prisma` or database migrations.

Execute the following 4 phases in exact order:

### PHASE 1: Fix Role Middleware, Accountant Dashboard 400 Crash, and Deposit Alert Constant
1. `backend/src/middlewares/role.middleware.js`:
   - Update `requireRoles = (...roles) =>` to flatten the roles array: `const allowedRoles = roles.flat();` and check `allowedRoles.includes(req.user.role)`. This fixes array arguments like `requireRoles(['OWNER', ...])` in `settings.routes.js`.
2. `frontend/src/components/dashboard/AccountantDashboardView.jsx`:
   - On line 110, update the daily close status fetch to include `date=${today}`:
     `fetch(`${API_URL}/daily-close/status?date=${today}&tenant=${tenant}`, { credentials: 'include' })`
   - On line 111, update the expenses fetch to pass `startDate=${today}&endDate=${today}`:
     `fetch(`${API_URL}/expenses?startDate=${today}&endDate=${today}&tenant=${tenant}`, { credentials: 'include' })`
   - On lines 219–221 in Today's Expense Log table, replace `item.description` with `item.remarks || '—'`, replace `item.paymentMethod || 'CASH'` with `item.isPurchase ? (item.paymentStatus || 'PURCHASE') : 'EXPENSE'`, and replace `item.recordedBy || 'Admin'` with `item.createdBy?.name || 'Staff'`.
3. `backend/src/controllers/expense.controller.js`:
   - In `getExpenses` (around line 23), extract `date` from `req.query`. If `date` is provided and `startDate`/`endDate` are not, treat `date` as both `startDate` and `endDate` (`start.setUTCHours(0,0,0,0)` to `end.setUTCHours(23,59,59,999)`).
4. `backend/src/controllers/alerts.controller.js`:
   - Import `BOTTLE_19L_SPECS` from `../constants/productMappings.js` and set `const BOTTLE_COST = BOTTLE_19L_SPECS.SECURITY_RATE;` (1000 instead of 1500) so MM security deposit warnings match order creation checks.

### PHASE 2: Fix Pack-Size Multipliers & Symmetrical Stock Rollbacks
1. `backend/src/controllers/order.controller.js`:
   - In `createOrder` (around lines 109–120, low stock warning), account for `packSize`:
     const packMultiplier = Number(dbItem.packSize || 1);
     const requiredBaseUnits = rItem.quantity * packMultiplier;
     const availableStock = parseFloat(dbItem.cachedQty || 0);
     if (requiredBaseUnits > availableStock) {
       const availPacks = packMultiplier > 1 ? `${Math.floor(availableStock / packMultiplier)} packs (${availableStock} bottles)` : `${availableStock}`;
       lowStockItems.push({
         name: dbItem.name,
         ordered: packMultiplier > 1 ? `${rItem.quantity} packs (${requiredBaseUnits} bottles)` : rItem.quantity,
         available: availPacks
       });
     }
   - In `updateOrder` (around lines 225–252), resolve `items` using `const resolvedItems = items?.length ? await resolveOrderItems(prefix, items) : null;` before `deleteMany`/`createMany`, and add a `createAuditLog(prefix, { action: 'ORDER_UPDATED', entityType: 'Order', entityId: id, performedBy: req.user?.name || req.user?.id || 'Staff', details: ... })` call inside the transaction.
2. `frontend/src/components/orders/ProcessDeliveryModal.jsx`:
   - In `stockErrors` calculation (around lines 78–90), multiply ordered quantity by `packSize` so packs are compared against base bottles accurately:
     const packMultiplier = Number(i.item?.packSize || 1);
     const req = Number(i.quantity || 0) * packMultiplier;
3. `backend/src/controllers/production.controller.js`:
   - In `deleteProductionBatch` (around lines 704–714), when rolling back `InventoryTransaction` records for a `COMPLETED` batch, update BOTH `cachedQty` and `factoryQty`:
     - If `t.direction === 'IN'`, decrement `cachedQty` by `q` AND decrement `factoryQty` by `q`.
     - If `t.direction === 'OUT'`, increment `cachedQty` by `q` AND increment `factoryQty` by `q`.
4. `backend/src/controllers/spotSale.controller.js`:
   - In `deleteSpotSale` (around lines 660–735), ensure `EXTRA_CAP` restoration increments both `cachedQty: { increment: lineQty }` and `factoryQty: { increment: lineQty }`. Also query any `SPOT_SALE_MINERAL_DOSING` transactions in `InventoryTransaction` for `refId: existing.saleNumber` and restore their quantities to `cachedQty` and `factoryQty`.

### PHASE 3: Daily Close Lock Enforcement & Frontend Cache Sync
1. `backend/src/middlewares/dailyClose.middleware.js`:
   - On line 43, include `body.expenseDate` and `body.expectedDelivery`:
     `let transactionDateRaw = body.date || body.batchDate || body.purchaseDate || body.expenseDate || body.deliveredAt || body.expectedDelivery;`
2. `backend/src/routes/order.routes.js`, `backend/src/routes/production.routes.js`, `backend/src/routes/spotSale.routes.js`:
   - Import `{ checkDailyCloseLock } from '../middlewares/dailyClose.middleware.js'` and attach `checkDailyCloseLock` to write routes (`POST`, `PUT`, `DELETE`) on `order.routes.js`, `production.routes.js`, and `spotSale.routes.js` (`PUT /:id`, `DELETE /:id`).
3. `frontend/src/utils/apiCache.js`:
   - In `relatedMap` (around line 231), add invalidation targets for `'daily-close'`, `'vehicles'`, `'users'`, and `'settings'`, and include `'admin'` and `'daily-close'` in the invalidation arrays for `orders`, `production`, `spot-sales`, `purchases`, and `expenses`.

### PHASE 4: Clean Up Orphaned Frontend Components
1. Remove unrouted duplicate files so future edits always target the active components:
   - Delete `frontend/src/pages/Cars.jsx` and `frontend/src/pages/TransportExpenses.jsx`
   - Delete `frontend/src/components/transport/CarsHeader.jsx`, `frontend/src/components/transport/TransportExpensesHeader.jsx`, `frontend/src/components/transport/TransportExpensesTable.jsx`, `frontend/src/components/transport/AddTransportExpenseModal.jsx`
   - Delete `frontend/src/components/orders/NewOrderModal.jsx`
   - Remove their exports from `frontend/src/components/transport/index.js` and `frontend/src/components/orders/index.js`.

### VERIFICATION STEP
- Run `node --check` on all modified backend files.
- Run `npx eslint src/` in `backend/` and `frontend/` and `pnpm run build` in `frontend/` to confirm zero syntax, import, or build errors.
```

