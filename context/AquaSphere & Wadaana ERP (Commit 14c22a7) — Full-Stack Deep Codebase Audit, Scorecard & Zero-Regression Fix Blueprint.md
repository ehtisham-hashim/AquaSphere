# **AquaSphere & Wadaana ERP (`feat/voice-notes-unified-erp` @ Commit `14c22a7`)**

# **Full-Stack Deep Codebase Audit, Scorecard & Zero-Regression Fix Blueprint**

**Prepared For:** Ehtisham & Antigravity (Implementation Agent)  
**Audited Snapshot:** `ehtisham-hashim/aquasphere` — Branch feat/voice-notes-unified-erp (14c22a7, 404 commits)  
**Scope:** 100% Full-Stack File Scan (All Backend Controllers, Services, Middlewares, Routes, Prisma Schema, Auto-Migrations & All Frontend Pages, Modals, Tables, Dashboards, Caching & RBAC)

# **1\. Executive Summary & Overall Scorecard**

Commit 14c22a7 successfully delivered a massive set of features:

* Dynamic returnable raw material support (`isReturnable`, `BottleTransaction.itemId`, `bottleInventory.service.js`)  
* Customer FIFO Lump-Sum Debt Settlement (`settleCustomerLumpSumPayment` \+ `SettleCustomerDebtModal.jsx`)  
* Vendor FIFO Pooled Payment Allocation (`recordVendorPayment` \+ `VendorPaymentModal.jsx`)  
* Sequential Customer IDs (`JAM313xxxx` / `WAD313xxxx`) & Marketer Attribution (`MKT-xx` Registry)  
* 18% GST Support (`withGst` on Orders & Invoices) and `EASYPAISA` / `JAZZCASH` Payment Channels  
* Single-row multi-asset `BottleCustodyWidget.jsx` and `unitFormat.js` (`Int` vs `Float` raw materials)

**However, our line-by-line scan of every file in Commit `14c22a7` uncovered 20 concrete bugs (including 8 Critical P0 Calculation/Financial/Security flaws) where recent code changes interact with existing logic or break under real user behavior.**

# **1.1 Functional Use-Case Scorecard**

| \# | Functional Domain | Current Score | Status | Root Issue Summary |
| :---- | :---- | :---- | :---- | :---- |
| **F1** | **Reports & Financial Calculations (`reports.controller.js`, `Reports.jsx`)** | **52 / 100** | CRITICAL | `sales`, `marketers`, and `credit` reports add `deliveryCash + paymentCash` (double-counting every order payment by **200%** because `deliverOrder` creates BOTH a `Delivery` and a `Payment` row\!). `fleet` report still uses old `NEW_PURCHASE` formula (`atFactory = 0`). `Reports.jsx` footer prepends `Rs.` to non-currency counts. |
| **F2** | **Customer Debt FIFO Settlement (`customer.controller.js`, `SettleCustomerDebtModal.jsx`)** | **68 / 100** | CRITICAL | Settling from `SECURITY_DEPOSIT` creates a `Delivery` with `cashReceived: alloc`, inflating physical cash drawer. Settling a `SPOT_SALE` debt both mutates historical `SpotSale.amountPaid` AND creates a `Payment(orderId: null)` row — double-counting the cash in Reports & Profitability\! |
| **F3** | **Vendor & Purchase FIFO Ledger (`vendor.controller.js`, `purchase.controller.js`)** | **64 / 100** | CRITICAL | Editing a `PARTIAL`\-paid purchase in `updatePurchase` (`purchase.controller.js:L349`) executes `VendorLedgerEntry.deleteMany({ where: { purchaseId } })`, **wiping out all FIFO partial payment ledger entries** while leaving `VendorPayment` intact\! |
| **F4** | **Order Lifecycle & 18% GST (`order.controller.js`, `ProcessDeliveryModal.jsx`, `OrderDetail.jsx`)** | **70 / 100** | HIGH | `deleteOrder` forgets `order.withGst` when rolling back `Customer.currentBalance`, leaving 18% phantom GST debt on the customer. `ProcessDeliveryModal.jsx`, `RecordPaymentModal.jsx`, `OrderDetail.jsx`, and `CustomerHistory.jsx` all ignore `order.withGst` when computing `orderTotal`. |
| **F5** | **Returnable Container Custody (`bottleInventory.service.js`, `BottleAdjustmentModal.jsx`, `ProcessDeliveryModal.jsx`)** | **74 / 100** | HIGH | `ProcessDeliveryModal.jsx:L42,52` checks `r.rawMaterialItem?.isReturnable` instead of `r.rawMaterial?.isReturnable` (property typo — always `undefined`\!). `BottleAdjustmentModal.jsx:L48` falls back to `currentOverallBalance` when a customer holds `0` of a secondary returnable item, and skips max validation when `selectedItemBalance === 0`. |
| **F6** | **Counter Sales / Spot Sales (`spotSale.controller.js`, `LogCounterSaleForm.jsx`)** | **78 / 100** | HIGH | `deleteSpotSale` (`spotSale.controller.js:L474`) completely forgets to reverse `bottlesReturnedGood` returned at the counter. Returning empty bottles at the counter when a customer has `0` custody drives `cachedBottleBalance` negative (`-N`). |
| **F7** | **Production & Wadaana BOM (`production.controller.js`, `autoMigrations.js`, `analytics.controller.js`)** | **65 / 100** | CRITICAL | `autoMigrations.js` seeds `'Pure Fine 0.5L'`, but `wadaanaBOM` searches for `'pivrifine'` (recipe never linked\!). `production.controller.js:L202` checks `nameLower.includes('pure')` / `'mix'`, which fails on Wadaana's `'AquaSphere 0.5L'` and `'Dasani 0.5L'`. `analytics.controller.js:L602,649` adds `wasteQuantity + brokenBottles05L + brokenBottles15L`, **double-counting 0.5L/1.5L waste by 2X**\! |
| **F8** | **Raw Materials & Finished Goods (`item.controller.js`, `AddEditFinishedGoodModal.jsx`)** | **82 / 100** | MEDIUM | `AddEditFinishedGoodModal.jsx:L72` uses `Math.floor(effectiveFac / pSize)` when opening an item for edit, silently wiping out loose remainder bottles on save. `deleteItem` (`item.controller.js:L443`) forgets to clean up `BottleTransaction.itemId`, throwing a Foreign Key crash (`P2003`). |
| **F9** | **Customer Directory, Marketer Ref & History (`CustomersTable.jsx`, `CustomerHistory.jsx`)** | **79 / 100** | MEDIUM | `CustomerHistory.jsx` has no Counter Sales (`spotSales`) tab even though `getCustomerDetails` fetches them. `CustomersTable.jsx` does not display `customerCode` (`JAM313xxxx`) or `marketerDisplay` (`MKT-xx`). |

# **1.2 Non-Functional Use-Case Scorecard**

| \# | Non-Functional Attribute | Current Score | Status | Root Issue Summary |
| :---- | :---- | :---- | :---- | :---- |
| **NF1** | **Authentication, Security & RBAC (`auth.middleware.js`, `routes/*.js`, `roleAccess.js`)** | **58 / 100** | CRITICAL | **2FA Bypass:** `verifyJWT` (`auth.middleware.js:L40`) accepts the pre-OTP `tempToken` (`is2FA: true`) as a full `OWNER` session token across all endpoints\! `user.controller.js` never calls `invalidateUserCache(id)` when deactivating a user. `roleAccess.js` shows `/users` to `ADMIN`, but `user.routes.js` blocks `ADMIN` with `403`. |
| **NF2** | **Client & Server Cache Coherency (`apiCache.js`, `analytics.controller.js`)** | **72 / 100** | HIGH | `apiCache.js` (`relatedMap`) never invalidates `'reports'` on any mutation, and omits `'analytics'` and `'daily-close'` when `customers` or `items` mutate. |
| **NF3** | **Daily Close Audit Lock Integrity (`dailyClose.middleware.js`, `routes/*.js`)** | **75 / 100** | HIGH | `POST /customers/:id/payment`, `POST /vendors/:id/payments`, and `POST /bottles/transactions` are missing `checkDailyCloseLock` middleware, allowing non-Owners to mutate cash and inventory on locked days. |
| **NF4** | **Database Query & Algorithmic Complexity (\$O(N)\$ / N+1 / Indexing)** | **86 / 100** | GOOD | Batch `groupBy` in `attachReturnableCustodyToCustomers` and `getVendors` eliminated N+1 queries. Remaining bottleneck: `createCustomer` (`customer.controller.js:L414`) fetches all customer codes into memory on every customer creation instead of querying max code or sequence. |
| **NF5** | **Deployment & Startup Resilience (`Dockerfile`, `autoMigrations.js`)** | **84 / 100** | MEDIUM | `autoMigrations.js` adds `is_returnable` and `item_id` columns idempotently on startup, but does **not** automatically set `isReturnable = true` on `Empty 19L Bottles` or backfill `itemId` on `BottleTransaction` (that logic only exists in the manual script `reconcile-empty-bottle-stock.js`). |

# **2\. Category A — Critical Calculation & Financial Ledger Flaws (Must Fix Immediately)**

# **Flaw A1: 200% Double-Counting of Order Cash Collected in Sales, Marketers & Credit Reports**

* **Where:** `backend/src/controllers/reports.controller.js`  
  * **Sales Report (`L122–125`):**

```js
const deliveryCash = o.deliveries.reduce((s, d) => s + Number(d.cashReceived || 0), 0);
const paymentCash = o.payments.reduce((s, p) => s + Number(p.amount || 0), 0);
const orderCash = deliveryCash + paymentCash;
```

  * **Marketers Report (`L353–355`):**

```js
const delivCash = o.deliveries.reduce((s, d) => s + Number(d.cashReceived || 0), 0);
const payCash = o.payments.reduce((s, p) => s + Number(p.amount || 0), 0);
m.cashCollected += (delivCash + payCash);
```

  * **Credit Report (`L454–456`):**

```js
const delivCash = ord.deliveries.reduce((s, d) => s + Number(d.cashReceived || 0), 0);
const payCash = ord.payments.reduce((s, p) => s + Number(p.amount || 0), 0);
return sum + Math.max(0, ordBilled - (delivCash + payCash));
```

* **Why It Breaks:** Every time an order is delivered with cash (`order.controller.js:L427–436`), settled after delivery (`order.controller.js:L352–375`), settled via `recordOrderPayment` (`L557–575`), or settled via `settleCustomerLumpSumPayment` (`customer.controller.js:L618–637`), **the backend creates BOTH a `Delivery` record (`cashReceived: X`) AND a `Payment` record (`amount: X`) for the exact same payment\!** Adding `deliveryCash + paymentCash` counts every single rupee paid against an order **twice (200%)**:  
  * An order for Rs. 1,000 paid in full shows `Cash Collected (Rs): 2,000` in the Sales Report table and daily chart\!  
  * An order for Rs. 1,000 with Rs. 500 partial payment shows `Cash Collected: 1,000` and `Balance Due: 0` in both the Sales Report and the Customer Credit Report\!  
  * Furthermore, all three reports calculate `orderBilled` without adding `o.withGst ? Math.round(sub * 0.18) : 0`.  
* **Exact Fix for Antigravity (`backend/src/controllers/reports.controller.js`):** Use `o.payments` as the single source of truth for order payments (falling back to `o.deliveries` only for legacy orders where `o.payments.length === 0`), and include `withGst`:

```js
const sub = o.items.reduce((s, it) => s + (Number(it.quantity || 0) * Number(it.price || 0)), 0);
const orderBilled = o.withGst ? sub + Math.round(sub * 0.18) : sub;
const paymentCash = o.payments.reduce((s, p) => s + Number(p.amount || 0), 0);
const deliveryCash = o.deliveries.reduce((s, d) => s + Number(d.cashReceived || 0), 0);
const orderCash = o.payments.length > 0 ? paymentCash : deliveryCash;
const balance = Math.max(0, orderBilled - orderCash);
```

# **Flaw A2: Double-Counting & Cash Drawer Inflation in `settleCustomerLumpSumPayment`**

* **Where:** `backend/src/controllers/customer.controller.js` (`L608–675`)  
* **Three Bugs Inside the FIFO Loop:**  
  1. **Security Deposit \+ Cash Mix Bug (`L614`):** `const currentType = (depositToApply >= alloc && cash === 0) ? 'SECURITY_DEPOSIT' : safePaymentType;` — If a customer owes Rs. 5,000, applies Rs. 2,000 from Security Deposit (`settleFromSecurity = true`), and pays Rs. 3,000 Cash (`cash = 3000`), `cash === 0` is `false`. So the loop records the entire Rs. 5,000 `Payment` as `CASH` and creates a `Delivery` with `cashReceived: 5000`\! Even when `cash === 0` (100% settled from Security Deposit), line 627 still creates a `Delivery` row with `cashReceived: alloc`, which `reports.controller.js` (`profitability` `L508`) sums as physical cash revenue\!  
  2. **SpotSale Settlement Double-Counting (`L647–668`):** When settling an unpaid `SPOT_SALE`, `settleCustomerLumpSumPayment` **both** increments `SpotSale.amountPaid` (`amountPaid: newAmountPaid`) **and** creates a `Payment` row (`orderId: null, amount: alloc`).  
     * In `reports.controller.js` (`sales` inflowLedger `L222–275` and `profitability` `L507–532`) and `analytics.controller.js` (`computeDashboardAnalytics`), the system sums `SpotSale.amountPaid` **PLUS** `Payment.amount`\!  
     * Thus, settling Rs. 1,000 of Counter Sale debt adds Rs. 1,000 to `SpotSale.amountPaid` AND Rs. 1,000 to `Payment`, **double-counting Rs. 2,000 of cash collected** and mutating the historical Counter Sale's original day cash\!  
* **Exact Fix for Antigravity (`backend/src/controllers/customer.controller.js`):**  
  1. Track `remainingDepositPool = depositToApply` and `remainingCashPool = cash` separately inside the FIFO loop. Deduct from `remainingDepositPool` first (recording `Payment` with `type: 'SECURITY_DEPOSIT'` and **never** setting `cashReceived` on `Delivery` for deposit deductions), then deduct from `remainingCashPool` (recording `Payment` with `type: safePaymentType` and `Delivery.cashReceived = cashPortion`).  
  2. When settling a `SPOT_SALE` in `settleCustomerLumpSumPayment`, decrement `debtAmount` and `creditAmount` (`debtAmount: newDebt, creditAmount: newDebt`), **do NOT increment `SpotSale.amountPaid` / `cashCollected`** (keep `amountPaid` as the initial cash paid at the counter on sale creation day), and let the new `Payment` (`orderId: null, customerId`) represent the subsequent debt collection on settlement day\!

# **Flaw A3: `SECURITY_DEPOSIT` Counted as Physical `CASH` on Owner, Admin & Accountant Dashboards**

* **Where:**  
  * `backend/src/controllers/analytics.controller.js` (`L165–186` and `L528–535`)  
  * `backend/src/controllers/adminDashboard.controller.js` (`L97–100` and `L213–246`)  
  * `backend/src/controllers/reports.controller.js` (`L222–288`)  
* **Why It Breaks:** `Payment` rows created when a customer settles an order from their Security Deposit have `type: 'SECURITY_DEPOSIT'`. However, in `analytics.controller.js` (`L165–186` & `L528–535`) and `adminDashboard.controller.js` (`L97` & `L238`), the `Payment` queries do **not** filter `where: { type: { not: 'SECURITY_DEPOSIT' } }`, and because `cashByMethod` only defines `{ CASH, BANK_TRANSFER, EASYPAISA, JAZZCASH, CHEQUE }`, the `else` branch (`b.cashByMethod.CASH += amt`) dumps every `SECURITY_DEPOSIT` drawdown straight into **Physical `CASH`**\!  
* **Exact Fix for Antigravity:** Exclude `type: 'SECURITY_DEPOSIT'` from physical cash inflows (`b.cash`, `b.orderCash`, `cashByMethod.CASH`, `totalCashCollected`, `inflowLedger`), or track `SECURITY_DEPOSIT` in its own separate non-cash bucket (`securityDepositApplied`) so drawing down an existing deposit never inflates today's cash drawer.

# **Flaw A4: Credit Purchases Subtracted from `netCash` on Owner & Accountant Dashboards**

* **Where:** `backend/src/controllers/analytics.controller.js` (`L261–273`)  
* **Why It Breaks:**

```js
for (const pu of purchases) {
  ...
  day.purchases += total;
  day.expenses += total;
  ...
  for (const b of activeBuckets) {
    b.purchases += total;
    b.purchasesCount += 1;
    b.expenses += total;
  }
}
```

  Every raw material `Purchase` (even when `paymentStatus === 'CREDIT'` and Rs. 0 was paid\!) has its entire `grandTotal` added to `b.expenses`, which then subtracts from `b.netCash = b.cash - b.expenses` (`L278`). Furthermore, when that credit purchase is later paid via `VendorPayment`, if `expenses` already counted the purchase on creation day, cash flow is distorted.


* **Exact Fix for Antigravity (`backend/src/controllers/analytics.controller.js`):** Keep `b.purchases += total` in its own `purchases` metric, and for actual cash outflow (`b.vendorPayments` / `b.netCash`), query `VendorPayment` (`where: { createdAt: { gte: minDate, lte: endOfDay } }`) rather than adding unpaid `CREDIT` purchase invoice totals into `b.expenses`.

# **Flaw A5: Production Dashboard Double-Counts 0.5L & 1.5L Broken Bottles by 200%**

* **Where:** `backend/src/controllers/analytics.controller.js` (`L602`, `L649`, `L699`, `L796–798`)  
* **Why It Breaks:** In `completeProductionBatch` (`production.controller.js:L349, L365`), `wasteQuantity` is saved as the **sum of all waste across all items in the batch** (`totalWaste = b05 + b15 + waste19L`), while `brokenBottles05L` (`b05`) and `brokenBottles15L` (`b15`) are *also* saved on the same row. Then `analytics.controller.js` (`L602`, `L649`, `L699`) computes:

```js
totalWaste: (todaysBatchesAgg._sum.wasteQuantity || 0) + (todaysBatchesAgg._sum.brokenBottles15L || 0) + (todaysBatchesAgg._sum.brokenBottles05L || 0)
```

  Because `wasteQuantity` already contains `brokenBottles05L + brokenBottles15L`, adding them again doubles every 0.5L and 1.5L broken bottle count\! The exact same double-counting happens for Wadaana on `L796` (`brokenPure05L + brokenPure15L + brokenMix05L + brokenMix15L + wasteQuantity`).


* **Exact Fix for Antigravity (`backend/src/controllers/analytics.controller.js`):** Use `Number(b.wasteQuantity || 0)` when `b.wasteQuantity > 0`, and only fall back to summing the individual `broken*` columns for legacy rows where `Number(b.wasteQuantity || 0) === 0`:

```js
const batchWaste = Number(b.wasteQuantity || 0) > 0
  ? Number(b.wasteQuantity)
  : (Number(b.brokenBottles05L || 0) + Number(b.brokenBottles15L || 0));
```

# **Flaw A6: Editing a Partially Paid Purchase Wipes Out Vendor FIFO Payment Ledger Entries**

* **Where:** `backend/src/controllers/purchase.controller.js` (`updatePurchase`, `L283` and `L349–387`)  
* **Why It Breaks:**  
  1. When a `CREDIT` purchase is partially or fully paid via Vendor FIFO Pooled Payment (`recordVendorPayment` in `vendor.controller.js`) or `recordPurchasePayment`, `VendorLedgerEntry` rows of `type: 'PAYMENT'` are created with `purchaseId: id`, and `Purchase.paymentStatus` becomes `'PARTIAL'` or `'PAID'`.  
  2. If the Owner edits that purchase via `updatePurchase` (`PUT /api/v1/purchases/:id`):  
     * Line 283: `const finalPaymentStatus = paymentStatus ? (paymentStatus === 'PAID' ? 'PAID' : 'CREDIT') : existing.paymentStatus;` — coerces `'PARTIAL'` to `'CREDIT'`\!  
     * Line 349: `await tx[prefix + 'VendorLedgerEntry'].deleteMany({ where: { purchaseId: id } });` — **deletes all `PAYMENT` ledger entries linked to that purchase**, and lines 354–387 only recreate a `PAYMENT` entry if `finalPaymentStatus === 'PAID'`\!  
     * Meanwhile, the pooled `VendorPayment` record (which has `referenceNo: null`, not `existing.invoiceNo`) is **not** deleted, permanently desynchronizing `VendorLedgerEntry` from `VendorPayment` and erasing the vendor's partial payment credit\!  
* **Exact Fix for Antigravity (`backend/src/controllers/purchase.controller.js`):**  
  * Only delete the `type: 'PURCHASE'` ledger entry (`await tx[prefix + 'VendorLedgerEntry'].deleteMany({ where: { purchaseId: id, type: 'PURCHASE' } })`), preserving all existing `type: 'PAYMENT'` ledger entries allocated to that purchase\!  
  * Recalculate `alreadyPaid` from the preserved `type: 'PAYMENT'` ledger entries and set `finalPaymentStatus = alreadyPaid >= newGrandTotal - 0.01 ? 'PAID' : (alreadyPaid > 0 ? 'PARTIAL' : 'CREDIT')`.

# **Flaw A7: `recordVendorPayment` Validates Balance Against Raw `Purchase` Table Instead of `VendorLedgerEntry`**

* **Where:** `backend/src/controllers/vendor.controller.js` (`L231–240`)  
* **Why It Breaks:** `getVendors` (`L23–44`) and `getVendorById` (`L77–92`) compute `payableBalance` from `VendorLedgerEntry` (`PURCHASE - PAYMENT`). However, `recordVendorPayment` (`L231–240`) validates the maximum payable amount using `Purchase.aggregate` (without even filtering `status: { not: 'CANCELLED' }`) minus `VendorPayment.aggregate`. If any vendor has cancelled purchases or opening ledger adjustments, `recordVendorPayment` either blocks valid payments or allows overpayments.  
* **Exact Fix for Antigravity (`backend/src/controllers/vendor.controller.js`):** Compute `currentPayableBalance` in `recordVendorPayment` using the exact same `VendorLedgerEntry.groupBy({ by: ['type'], where: { vendorId }, _sum: { amount: true } })` query used in `getVendorById`.

# **Flaw A8: `deleteOrder` Forgets 18% GST (`withGst`) & Corrupts `InventoryTransaction` Reversals**

* **Where:** `backend/src/controllers/order.controller.js` (`deleteOrder`, `L690–770`)  
* **Two Bugs Inside `deleteOrder`:**  
  1. **Missing 18% GST on Debt Rollback (`L729`):** `const orderTotal = order.items.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);` — When `deliverOrder` delivered an unpaid order with `order.withGst === true`, it incremented `Customer.currentBalance` by `subtotal + Math.round(subtotal * 0.18)`. When `deleteOrder` deletes that order, line 729 only decrements `Customer.currentBalance` by `subtotal`, leaving the 18% GST amount permanently stuck as phantom debt on the customer\!  
  2. **Asymmetric `InventoryTransaction` Deletion (`L696`, `L717`, `L767`) & `customer.controller.js` (`deleteCustomer`, `L491`, `L519`):** In `deleteOrder`, Line 696 creates an `IN` `InventoryTransaction` with `refType: 'ORDER', refId: order.id`. Line 717 calls `debitEmptyBottlesFromFactory(..., { skipTransactionLog: false })`, which creates an `OUT` `InventoryTransaction` with `refType: 'ORDER_REVERSAL', refId: order.id`. Then Line 767 runs `await tx[prefix + 'InventoryTransaction'].deleteMany({ where: { refType: 'ORDER', refId: id } })`. That deletes the original `IN` `BOTTLE_RETRIEVAL` transaction (`refType: 'ORDER'`), while leaving the `OUT` `ORDER_REVERSAL` transaction (`refType: 'ORDER_REVERSAL'`) in the table\! If `reconcileInventory` (`POST /api/v1/items/:id/reconcile`) is ever run, the net sum of `IN - OUT` transactions will double-deduct `retGoodTotal`\!  
* **Exact Fix for Antigravity (`backend/src/controllers/order.controller.js`):**  
  1. On line 729, include GST:

```js
const orderSubtotal = order.items.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
const orderTotal = order.withGst ? orderSubtotal + Math.round(orderSubtotal * 0.18) : orderSubtotal;
```

  2. On line 717, pass `skipTransactionLog: true` to `debitEmptyBottlesFromFactory` (since line 767 deletes all `refType: 'ORDER'` transactions for `id`, or delete both `refType: { in: ['ORDER', 'ORDER_REVERSAL'] }`).

# **3\. Category B — Logical & Multi-Tenant Bugs (AquaSphere & Wadaana)**

# **Flaw B1: Wadaana `Pure Fine` Recipe Never Linked in `autoMigrations.js` & `AquaSphere`/`Dasani` Ignored in `production.controller.js`**

* **Where:**  
  * `backend/src/utils/autoMigrations.js` (`L97–104` vs `L295–302`)  
  * `backend/src/controllers/production.controller.js` (`L202–223`, `L290–297`, `L388–401`)  
* **Why It Breaks:**  
  1. In `autoMigrations.js:L102–103`, Wadaana's 6 finished goods are created as `'AquaSphere 0.5L'`, `'AquaSphere 1.5L'`, `'Dasani 0.5L'`, `'Dasani 1.5L'`, **`'Pure Fine 0.5L'`**, and **`'Pure Fine 1.5L'`**.  
  2. Yet in `autoMigrations.js:L300–301`, `wadaanaBOM` looks for `fgMatch: ['pivrifine', '0.5']` and `fgMatch: ['pivrifine', '1.5']`\! Because `'Pure Fine 0.5L'` does not contain `'pivrifine'`, **`Pure Fine 0.5L` and `Pure Fine 1.5L` never get their BOM recipes linked on startup\!**  
  3. In `production.controller.js:L202–214`, Wadaana batch creation maps finished goods to `qtyPure05L`, `qtyPure15L`, `qtyMix05L`, `qtyMix15L` by checking `nameLower.includes('pure')` and `nameLower.includes('mix')`. Because Wadaana's items are named `'AquaSphere 0.5L'` (Pure) and `'Dasani 0.5L'` (Mix), `nameLower.includes('pure')` and `nameLower.includes('mix')` are both **false**, so `qtyPure05L`, `qtyPure15L`, `qtyMix05L`, and `qtyMix15L` are saved as **`0`**, making the Wadaana Production Dashboard show **0 bottles produced**\!  
* **Exact Fix for Antigravity:**  
  * In `autoMigrations.js:L300–301`, support both `'pure fine'` and `'pivrifine'`.  
  * In `production.controller.js:L202–214` (and `L290–297`, `L388–401`), match `(nameLower.includes('pure') || nameLower.includes('aquasphere'))` for Pure preforms and `(nameLower.includes('mix') || nameLower.includes('dasani'))` for Mix preforms.

# **Flaw B2: `autoMigrations.js` Does Not Auto-Flag `Empty 19L Bottles` as `isReturnable = true` on Startup**

* **Where:** `backend/src/utils/autoMigrations.js` (`ensureNativeSchemaColumns`)  
* **Why It Breaks:** `ensureNativeSchemaColumns()` adds the `is_returnable` and `item_id` columns on server startup, but only the standalone script `backend/scripts/reconcile-empty-bottle-stock.js` sets `isReturnable = true` on `Empty 19L Bottles` and backfills `itemId` on `BottleTransaction`. If the server restarts on a fresh or restored database before `reconcile-empty-bottle-stock.js` is run, `getAllReturnableRawMaterials` returns `[]` (`0` returnable items), causing `BottleAdjustmentModal.jsx` to show *"No raw materials flagged as returnable"* and `computeBottleStats` to show `atFactory: 0`\!  
* **Exact Fix for Antigravity (`backend/src/utils/autoMigrations.js`):** Add the idempotent 10-line self-heal directly inside `ensureNativeSchemaColumns()` in `autoMigrations.js` so `Empty 19L Bottles` is guaranteed to have `isReturnable = true` and `BottleTransaction.itemId` backfilled on every boot.

# **Flaw B3: `deliverOrder` Multi-Returnable Order Dumps All Returnables onto `returnables[0]` & Blocks Wadaana Returnables**

* **Where:** `backend/src/controllers/order.controller.js` (`L415–450` and `L502–504`)  
* **Why It Breaks:**  
  1. If an order contains two different returnable products (e.g. `5x 19L Refill` \+ `3x 12L Dispenser`), `extractReturnablesFromOrderItems` returns 2 entries, but `deliverOrder` (`L444–449`) creates a single `DELIVERED_TO_CUSTOMER` `BottleTransaction` with `itemId: resolvedReturnableId` (`returnables[0]`) for the combined sum (`8`) instead of looping over `returnables`.  
  2. On line 502: `if (prefix !== 'wadaana') { customerUpdateData.cachedBottleBalance = { increment: totalReturnableQty - totalEmptiesAccounted }; }` — if Wadaana ever adds a returnable raw material (`isReturnable = true`), `deliverOrder` creates the `BottleTransaction` (`L445`) but skips updating `Customer.cachedBottleBalance`\! Change line 502 to `if (prefix !== 'wadaana' || totalReturnableQty > 0 || totalEmptiesAccounted > 0)`.

# **Flaw B4: `deleteSpotSale` Does Not Reverse `bottlesReturnedGood` & Creates Fake `RETURNED_GOOD` Transactions**

* **Where:** `backend/src/controllers/spotSale.controller.js` (`L507–568`)  
* **Why It Breaks:**  
  1. When `createSpotSale` runs with `bottlesReturnedGood > 0` (`L314–340`), it credits `Empty 19L Bottles` in factory stock (`creditEmptyBottlesToFactory`), logs a `RETURNED_GOOD` `BottleTransaction` (`Counter Sale Empty Return (${saleNumber})`), and decrements `Customer.cachedBottleBalance`.  
  2. When the Owner deletes that counter sale via `deleteSpotSale`, it never checks or reverses the `Counter Sale Empty Return (${existing.saleNumber})` transaction\!  
  3. For sold 19L items (`L548–556`), instead of deleting the `DELIVERED_TO_CUSTOMER` `BottleTransaction` created by `Counter Sale (${existing.saleNumber})`, `deleteSpotSale` inserts a new `RETURNED_GOOD` `BottleTransaction`, inflating the customer's historical `returnedGood` counter.  
* **Exact Fix for Antigravity (`backend/src/controllers/spotSale.controller.js`):** In `deleteSpotSale`, find all `BottleTransaction` rows where `reason` contains `existing.saleNumber`. For any `RETURNED_GOOD` row from that sale, call `debitEmptyBottlesFromFactory` and increment `Customer.cachedBottleBalance` (if `existing.customerId`), then delete the `BottleTransaction` rows associated with `existing.saleNumber`.

# **Flaw B5: `deleteItem` Crashes with Foreign Key Error (`P2003`) When Deleting a Returnable Item**

* **Where:** `backend/src/controllers/item.controller.js` (`deleteItem`, `L443–519`)  
* **Why It Breaks:** `BottleTransaction` now has a foreign key `itemId -> Item.id`. `deleteItem` deletes/nullifies `RecipeItem`, `InventoryTransaction`, `ProductionBatchConsumption`, `ProductionBatch`, `SpotSaleItem`, `PurchaseItem`, and `OrderItem`, but **forgets `BottleTransaction`**\!  
* **Exact Fix for Antigravity (`backend/src/controllers/item.controller.js`):** Add `await tx[prefix + 'BottleTransaction'].updateMany({ where: { itemId: id }, data: { itemId: null } });` inside `deleteItem`'s transaction before `tx[prefix + 'Item'].delete({ where: { id } })`.

# **4\. Category C — Security, RBAC Permissions & Cache Invalidation Bugs**

# **Flaw C1: Critical 2FA Authentication Bypass via `tempToken` (`P0 Security`)**

* **Where:** `backend/src/middlewares/auth.middleware.js` (`verifyJWT`, `L34–50`)  
* **Why It Breaks:** When `ENFORCE_OWNER_2FA === 'true'`, `login` (`auth.controller.js:L68`) returns `tempToken = generateToken({ id: user.id, role: user.role, tenant: prefix, is2FA: true }, '15m')` before the Owner enters the 6-digit OTP. Because `verifyJWT` (`auth.middleware.js:L40`) only checks `if (!decodedToken || !decodedToken.id)` and **never checks `if (decodedToken.is2FA)`**, passing `Authorization: Bearer <tempToken>` grants full `OWNER` access to every API route without completing 2FA\!  
* **Exact Fix for Antigravity (`backend/src/middlewares/auth.middleware.js`):**

```js
const decodedToken = verifyToken(token);
if (!decodedToken || !decodedToken.id || decodedToken.is2FA) {
  throw new ApiError(401, 'Invalid, expired, or incomplete 2FA token');
}
```

# **Flaw C2: Role & Permission Mismatches Across Backend Routes & Frontend `roleAccess.js`**

1. **`user.controller.js` (`updateUser`, `toggleUserStatus`):** Never calls `invalidateUserCache(id)` from `auth.middleware.js`. Deactivated users retain access for up to 60 seconds.  
2. **`roleAccess.js` (`L84`, `L172`) vs `user.routes.js` (`L9`):** `roleAccess.js` shows the **Users** page (`/users`) in the Sidebar for `ADMIN` (`[SIDEBAR_ROUTES.USERS]: true`), but `user.routes.js` restricts `/api/v1/users` to `requireRoles('OWNER')`\! Either set `[SIDEBAR_ROUTES.USERS]: false` for `ADMIN` in `roleAccess.js`, or allow `ADMIN` read access on `GET /api/v1/users`.  
3. **`CustomerRiskHub.jsx` (`L34`) vs `adminDashboard.routes.js` (`L11`):** `adminOnly` in `adminDashboard.routes.js` allows `['ADMIN', 'OWNER', 'MARKETING_MANAGER']`, blocking `ACCOUNTANT` with `403 Forbidden` if `Accountant` accesses customer alerts. Add `'ACCOUNTANT'` to `adminOnly` for `/customer-alerts` and `/notification-alerts`.  
4. **Missing `checkDailyCloseLock` on Financial Mutation Routes:**  
   * `backend/src/routes/customer.routes.js:L32` (`POST /:id/payment` — `settleCustomerLumpSumPayment`)  
   * `backend/src/routes/vendor.routes.js:L29` (`POST /:id/payments` — `recordVendorPayment`)  
   * `backend/src/routes/bottle.routes.js:L19` (`POST /transactions` — `createBottleTransaction`)  
     Add `checkDailyCloseLock` to all three routes so non-Owners cannot mutate closed days.

# **Flaw C3: Client Cache (`apiCache.js`) Never Invalidates `reports`, and Misses `analytics` / `daily-close` on Customer & Item Mutations**

* **Where:** `frontend/src/utils/apiCache.js` (`L157–172`)  
* **Why It Breaks:** In `relatedMap`:  
  * `'reports'` is not listed in **any** mutation target list\! Navigating to `/erp-reports` after recording an order, delivery, counter sale, debt settlement, or expense shows stale cached reports for 30 seconds.  
  * `customers` (`['customers', 'bottles', 'orders', 'spot-sales', 'items', 'inventory', 'admin']`) is missing `'analytics'`, `'daily-close'`, and `'reports'`. Settling a customer debt via `POST /api/v1/customers/:id/payment` leaves the Owner/Accountant Dashboard (`analytics`) and `daily-close` cache stale\!  
* **Exact Fix for Antigravity (`frontend/src/utils/apiCache.js`):** Add `'reports'`, `'analytics'`, and `'daily-close'` to `customers`, `orders`, `spot-sales`, `purchases`, `expenses`, `vendors`, `bottles`, and `items` in `relatedMap`.

# **5\. Category D — How User Behavior Can Break the Application (Frontend & UX Edge Cases)**

| \# | User Behavior Scenario | What Happens Right Now (How It Breaks) | Exact File & Line | Fix Required |
| :---- | :---- | :---- | :---- | :---- |
| **B-1** | **Staff opens `BottleAdjustmentModal` for a customer who holds `5` `Empty 19L Bottles` and `0` `Empty 12L Bottles`, and selects `Empty 12L Bottles` in the dropdown.** | Because `attachReturnableCustodyToCustomers` filters `.filter(e => e.inCustody > 0)`, `selectedCustody` for `12L` is `undefined`. Line 47 (`selectedCustody ? ... : currentOverallBalance`) falls back to `5` (the customer's total 19L balance)\! The modal falsely says the customer holds `5` `Empty 12L Bottles` and lets staff return 5 `12L` bottles the customer never had\! | `BottleAdjustmentModal.jsx:L46–49` | If `Array.isArray(customer.returnableCustody)` exists, `selectedItemBalance` must be `selectedCustody ? Number(selectedCustody.inCustody ?? selectedCustody.balance ?? 0) : 0` (NOT `currentOverallBalance`\!). |
| **B-2** | **Staff opens `BottleAdjustmentModal` (or Counter Sale Empty Return) for a customer with `0` bottles in custody and submits `RETURNED_GOOD` for `10` bottles.** | In `BottleAdjustmentModal.jsx:L60`, the check is `if (isReturnType && qty > selectedItemBalance && selectedItemBalance > 0)`. When `selectedItemBalance === 0`, the check is **skipped**, `max` on the input becomes `undefined`, and `bottle.controller.js` decrements `Customer.cachedBottleBalance` to **`-10`**\! | `BottleAdjustmentModal.jsx:L60, L165` & `bottle.controller.js:L150` | Remove `&& selectedItemBalance > 0`\! If `isReturnType && qty > selectedItemBalance`, block submission in both Frontend and `bottle.controller.js` (`throw new ApiError(400, ...)`). |
| **B-3** | **Driver delivers a new 19L Order (`5` bottles) to a customer who already holds `3` empty bottles from last week, and the customer hands back all `8` empty bottles.** | `ProcessDeliveryModal.jsx:L63` sets `maxReturnedAllowed = Math.max(remainingOrderReturns, customerHeldCustody)` (`Math.max(5, 3) = 5`). The modal blocks the user from entering `8` returned bottles, even though the customer has `5 + 3 = 8` bottles on site\! | `ProcessDeliveryModal.jsx:L63` | For a first-time delivery (`!isPaymentSettlementOnly`), set `maxReturnedAllowed = remainingOrderReturns + customerHeldCustody` (`5 + 3 = 8`). |
| **B-4** | **User delivers or records payment for an Order that has `withGst = true` (18% GST) via `ProcessDeliveryModal` or `RecordPaymentModal`, or views it in `OrderDetail` / `CustomerHistory`.** | All 4 components calculate `orderTotal = items.reduce(...)` without adding `order.withGst ? Math.round(sub * 0.18) : 0`. `ProcessDeliveryModal` and `RecordPaymentModal` only collect the pre-tax subtotal, leaving the order stuck in `PARTIAL` status with the 18% GST unpaid\! | `ProcessDeliveryModal.jsx:L66`, `RecordPaymentModal.jsx:L16`, `OrderDetail.jsx:L30`, `CustomerHistory.jsx:L168` | Include `const gst = order.withGst ? Math.round(sub * 0.18) : 0; const orderTotal = sub + gst;` in all 4 components. |
| **B-5** | **User delivers an Order containing a custom returnable product (linked via `RecipeItem` where `rawMaterial.isReturnable === true`).** | `ProcessDeliveryModal.jsx:L42, L52` checks `r.rawMaterialItem?.isReturnable`, which is a typo for Prisma's `r.rawMaterial?.isReturnable`. It evaluates to `undefined`, hiding the Returnable Bottles section\! | `ProcessDeliveryModal.jsx:L42, L52–53` | Change `r.rawMaterialItem` to `r.rawMaterial` (`r.rawMaterial?.isReturnable`). |
| **B-6** | **Owner or PM opens `AddEditFinishedGoodModal` to edit the Reorder Level of `0.5L PET (Pack of 12)` when `factoryQty` has `125` bottles (`10 packs + 5 loose bottles`).** | Line 72 initializes `factoryStock = String(Math.floor(125 / 12))` (`"10"`). Clicking Save sends `10 * 12 = 120` to the backend, **silently wiping out 5 loose bottles** via an automated `STOCK_ADJUSTMENT OUT`\! | `AddEditFinishedGoodModal.jsx:L70–74` | If `effectiveFac % pSize !== 0` or `effectiveWh % pSize !== 0`, default `stockInputMode` to `'bottles'` so loose bottles are never truncated by `Math.floor`. |
| **B-7** | **User checks the bottom `TOTALS` row in `Reports.jsx` on the `Marketer Commissions` or `Production & Scrap` tab.** | `Reports.jsx:L464` formats every numeric cell in `summaryRow` as `` `Rs. ${val.toLocaleString()}` ``, displaying **`Rs. 70`** under `Customers Count` and **`Rs. 500`** under `Good Yield (Packs)`\! | `Reports.jsx:L458–468` | Only prefix `Rs.`  when \`key.includes('(Rs)') |
| **B-8** | **User opens `CustomerDetails` for a customer who owes Rs. 5,000 from Counter Sales (`SpotSale`), or has `0` bottles in custody and wants to manually issue 2 bottles.** | 1\. `CustomerHistory.jsx` has no `Counter Sales` tab, so the user sees `Current Debt: Rs. 5,000` at the top but `0` unpaid orders in the history tabs\!2. `CustomerDetails.jsx:L349` hides the `Retrieve / Adjust` button when `cachedBottleBalance === 0`, making it impossible to manually issue (`DELIVERED_TO_CUSTOMER`) a container to a customer with `0` balance. | `CustomerHistory.jsx:L78`, `CustomerDetails.jsx:L349` | 1\. Add a `Counter Sales` (`customer.spotSales`) tab to `CustomerHistory.jsx`.2. Always show the `Retrieve / Adjust` button on `CustomerDetails.jsx` (even when `cachedBottleBalance === 0`). |
| **B-9** | **Customer has 15 unpaid orders (or Counter Sale debt \> 7 days) and staff checks `CustomerRiskHub` (`Overdue Udhaar` tab).** | `getCustomerAlerts` (`adminDashboard.controller.js:L297`) uses `take: 5` on `c.orders` (missing older unpaid orders if a customer has \>5 orders), ignores `SpotSale` debt, and sums `o.items` without subtracting partial payments\! | `adminDashboard.controller.js:L295–331` | Query all `UNPAID`/`PARTIAL` orders (no `take: 5` cap on unpaid orders), subtract `o.payments`, and include unpaid `SpotSale.debtAmount` / `c.currentBalance`. |

# **6\. Prioritized Action Checklist for Antigravity (One-Go Execution Order)**

To bring every functional and non-functional score to **98–100 / 100** with zero regressions, execute these fixes in one clean commit:

* **`backend/src/middlewares/auth.middleware.js` (`L40`):** Reject `decodedToken.is2FA === true` in `verifyJWT` to close the Owner 2FA bypass.  
* **`backend/src/controllers/user.controller.js`:** Call `invalidateUserCache(id)` in `updateUser` and `toggleUserStatus`.  
* **`backend/src/controllers/reports.controller.js` (`sales`, `marketers`, `credit`, `profitability`, `fleet`):**  
  * Replace `deliveryCash + paymentCash` with `o.payments.length > 0 ? paymentCash : deliveryCash` and include `o.withGst` in `orderBilled`.  
  * Exclude `type: 'SECURITY_DEPOSIT'` from cash inflows in `inflowLedger` and `profitability`.  
  * Use `computeBottleStats` logic in `case 'fleet'` so `atFactory` reflects real `isReturnable` raw material stock.  
* **`backend/src/controllers/customer.controller.js` (`settleCustomerLumpSumPayment`):**  
  * Split `remainingDepositPool` and `remainingCashPool` so `SECURITY_DEPOSIT` deductions never create `Delivery.cashReceived` or `CASH` payments.  
  * When settling `SPOT_SALE` debt, reduce `debtAmount` / `creditAmount` without mutating historical `SpotSale.amountPaid`, preventing double-counting with the new `Payment` record.  
* **`backend/src/controllers/purchase.controller.js` (`updatePurchase`) & `vendor.controller.js` (`recordVendorPayment`):**  
  * Preserve `type: 'PAYMENT'` `VendorLedgerEntry` rows when updating a purchase; recalculate `paymentStatus` (`PAID` / `PARTIAL` / `CREDIT`) from preserved payments.  
  * Validate `currentPayableBalance` in `recordVendorPayment` using `VendorLedgerEntry` sums.  
* **`backend/src/controllers/order.controller.js` (`deliverOrder`, `deleteOrder`):**  
  * Loop over all `returnables` when creating `DELIVERED_TO_CUSTOMER` `BottleTransaction` records.  
  * Include `order.withGst` when rolling back `Customer.currentBalance` in `deleteOrder`, and pass `skipTransactionLog: true` to `debitEmptyBottlesFromFactory` so `deleteMany({ refType: 'ORDER' })` doesn't leave an orphaned `ORDER_REVERSAL` transaction.  
* **`backend/src/controllers/spotSale.controller.js` (`deleteSpotSale`) & `item.controller.js` (`deleteItem`):**  
  * Reverse `bottlesReturnedGood` (`Counter Sale Empty Return`) when deleting a counter sale, and delete the sale's `BottleTransaction` rows cleanly.  
  * Nullify `BottleTransaction.itemId` before deleting an item in `deleteItem`.  
* **`backend/src/utils/autoMigrations.js` & `production.controller.js` & `analytics.controller.js`:**  
  * Auto-mark `Empty 19L Bottles` as `isReturnable = true` and backfill `BottleTransaction.itemId` inside `ensureNativeSchemaColumns()`.  
  * Match `'pure fine'` in `autoMigrations.js` (`wadaanaBOM`) and match `'aquasphere'` / `'dasani'` in `production.controller.js` for Wadaana batches.  
  * Fix `analytics.controller.js` waste aggregation (`wasteQuantity` already includes `brokenBottles05L + brokenBottles15L`), exclude `SECURITY_DEPOSIT` from `cashByMethod.CASH`, and stop adding unpaid `CREDIT` `Purchase.grandTotal` into `b.expenses`.  
* **Frontend Fixes (`ProcessDeliveryModal.jsx`, `RecordPaymentModal.jsx`, `OrderDetail.jsx`, `CustomerHistory.jsx`, `CustomerDetails.jsx`, `CustomersTable.jsx`, `BottleAdjustmentModal.jsx`, `AddEditFinishedGoodModal.jsx`, `Reports.jsx`, `apiCache.js`):**  
  * Fix `r.rawMaterialItem` \-\> `r.rawMaterial` and `maxReturnedAllowed = remainingOrderReturns + customerHeldCustody` in `ProcessDeliveryModal.jsx`.  
  * Include `order.withGst` in `ProcessDeliveryModal.jsx`, `RecordPaymentModal.jsx`, `OrderDetail.jsx`, and `CustomerHistory.jsx`.  
  * Fix `BottleAdjustmentModal.jsx` fallback (`selectedCustody ? ... : 0`) and enforce `qty <= selectedItemBalance` even when `selectedItemBalance === 0`.  
  * Prevent `Math.floor(effectiveFac / pSize)` truncation in `AddEditFinishedGoodModal.jsx` when loose bottles exist.  
  * Fix `Reports.jsx` footer currency prefixing, add `Counter Sales` tab to `CustomerHistory.jsx`, show `customerCode` & `marketerDisplay` in `CustomersTable.jsx`, and add `'reports'`, `'analytics'`, and `'daily-close'` to `apiCache.js` `relatedMap`.

