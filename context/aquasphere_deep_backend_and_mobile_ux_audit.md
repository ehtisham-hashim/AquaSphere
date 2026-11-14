# AquaSphere & Wadaana ERP — Deep Backend Bug, Mobile Viewport & Non-Technical UI/UX Master Audit (Commit `e2c1d7c` / PR #31)

**Target Repository:** `ehtisham-hashim/AquaSphere`  
**Audited Commit:** `e2c1d7c5197b9e7fbd06e217219d49ddf21783c8` (`Merge pull request #31 from ehtisham-hashim/for-review`)  
**Scope:**
1. **Part 1 — Backend Bugs, PR #31 Regressions & Code Quality Flaws** (RBAC mismatches, broken order cancellation, Wadaana daily-close deadlock, incomplete spot-sale customer rollback, cash-drawer reconciliation discrepancies, and multi-query bottlenecks)
2. **Part 2 — Mobile Screen Breakages (`320px–430px`) & Landing Page PDF/Certificate Loader Fixes** (`CertificateLightboxModal.jsx`, `pdfViewerHelper.js`, `LandingPage.jsx`, `landing.css`, `DateRangePicker.jsx`, `AddEditFinishedGoodModal.jsx`, `AddEditPurchaseModal.jsx`, `LogCounterSaleForm.jsx`)
3. **Part 3 — Deep UI/UX Audit for Non-Technical Staff & All 6 Role Dashboards** (`OWNER`, `ADMIN`, `ACCOUNTANT`, `MARKETING_MANAGER`, `PRODUCTION_MANAGER`, `TRANSPORT_MANAGER`)
4. **Part 4 — Step-by-Step Execution Checklist & Graphify Blast-Radius Commands for Antigravity**

---

## Part 1: Backend Bugs, PR #31 Regressions & Code Quality Flaws

### `BK-01` (Critical PR #31 Incomplete Fix): Guaranteed `403 Forbidden` When `MARKETING_MANAGER` Settles Customer Debt
- **Affected Files:**
  - `frontend/src/pages/CustomerDetails.jsx` (Line `40`)
  - `frontend/src/components/customer/CustomersTable.jsx` (Line `15`)
  - `frontend/src/components/dashboard/CustomerRiskHub.jsx` (Line `25`)
  - `frontend/src/pages/Orders.jsx` (Line `225`)
  - `backend/src/routes/customer.routes.js` (Line `24`)
- **What Happened in PR #31 (`e2c1d7c`):**
  - Antigravity added `'MARKETING_MANAGER'` to `canSettleDebt` across all 4 frontend files:
    ```js
    const canSettleDebt = ['OWNER', 'ADMIN', 'ACCOUNTANT', 'MARKETING_MANAGER'].includes(userRole);
    ```
  - **However, `backend/src/routes/customer.routes.js:24` was never updated!** It still reads:
    ```js
    router.post('/:id/payment', requireRoles('OWNER', 'ADMIN', 'ACCOUNTANT'), settleCustomerLumpSumPayment);
    ```
- **Runtime Impact:**
  - `MARKETING_MANAGER` now sees the **"Pay Debt"**, **"Settle Debt"**, and **"Pay"** buttons on `Orders`, `Customers`, `CustomerDetails`, and the `CustomerRiskHub` dashboard widget. When they open `SettleCustomerDebtModal.jsx` and click **"Confirm Payment"**, the backend immediately rejects `POST /api/v1/customers/:id/payment` with **`403 Forbidden: Insufficient privileges`**.
- **Exact Fix for Antigravity:**
  - **If `MARKETING_MANAGER` SHOULD be allowed to settle customer lump-sum debt:** Add `'MARKETING_MANAGER'` to `requireRoles(...)` on `backend/src/routes/customer.routes.js:24`:
    ```js
    router.post('/:id/payment', requireRoles('OWNER', 'ADMIN', 'ACCOUNTANT', 'MARKETING_MANAGER'), checkDailyCloseLock, settleCustomerLumpSumPayment);
    ```
    *(Note: Also attach `checkDailyCloseLock` to `POST /:id/payment` so lump-sum debt payments cannot mutate cash drawer totals after the day is locked!)*
  - **If `MARKETING_MANAGER` should NOT settle lump-sum debt:** Remove `'MARKETING_MANAGER'` from `canSettleDebt` in `CustomerDetails.jsx:40`, `CustomersTable.jsx:15`, `CustomerRiskHub.jsx:25`, and `Orders.jsx:225`.

---

### `BK-02` (Critical PR #31 Missed Guard): Guaranteed `403 Forbidden` on Bottle Custody `"Retrieve / Adjust"` for `ACCOUNTANT` & `TRANSPORT_MANAGER`
- **Affected Files:**
  - `frontend/src/pages/CustomerDetails.jsx` (Lines `41`, `435–440`, `520`)
  - `frontend/src/components/dashboard/BottleCustodyWidget.jsx` (Lines `247–255`)
  - `backend/src/routes/bottle.routes.js` (Line `16`)
- **Root Cause:**
  - `POST /api/v1/bottles/transactions` (`backend/src/routes/bottle.routes.js:16`) only allows:
    ```js
    requireRoles('OWNER', 'ADMIN', 'PRODUCTION_MANAGER', 'MARKETING_MANAGER')
    ```
  - In `CustomerDetails.jsx:435–440` and `line 520` (`CustomerAlerts`), the **"Retrieve / Adjust"** button has **zero role guard**. When `ACCOUNTANT` or `TRANSPORT_MANAGER` visits `/customers/:id`, clicks **"Retrieve / Adjust"**, and submits `BottleAdjustmentModal.jsx`, the request fails with **`403 Forbidden`**.
- **Exact Fix for Antigravity:**
  - In `frontend/src/pages/CustomerDetails.jsx:41`, define:
    ```js
    const canAdjustBottles = ['OWNER', 'ADMIN', 'PRODUCTION_MANAGER', 'MARKETING_MANAGER'].includes(userRole);
    ```
  - Wrap the **"Retrieve / Adjust"** button (`lines 435–440`) with `{canAdjustBottles && (...)}` and pass `onOpenBottleModal={canAdjustBottles ? () => setShowBottleModal(true) : null}` to `<CustomerAlerts />` (`line 520`).
  - In `CustomerAlerts.jsx`, only render the alert's quick-adjust button when `typeof onOpenBottleModal === 'function'`.

---

### `BK-03` (High PR #31 Regression): Order Cancellation Was Completely Removed, Making the `"Cancelled Orders"` Tab Permanently Dead
- **Affected Files:**
  - `backend/src/routes/order.routes.js` (Line `20`)
  - `backend/src/controllers/order.controller.js` (Lines `931–950`)
  - `frontend/src/pages/Orders.jsx` (Lines `221–245`, `334`)
  - `frontend/src/components/orders/OrderActionButtons.jsx`
- **What Happened in PR #31 (`e2c1d7c`):**
  - Previously, `DELETE /api/v1/orders/:id` soft-cancelled orders (`deliveryStatus = 'CANCELLED'`) when called by `MARKETING_MANAGER`, and permanently hard-deleted orders when called by `OWNER`.
  - In PR #31, Antigravity restricted `DELETE /api/v1/orders/:id` to `requireRoles('OWNER')`, deleted the `MARKETING_MANAGER` soft-cancel branch from `order.controller.js:931`, and deleted `orderToCancel` / `confirmCancelOrder` from `Orders.jsx`.
- **Runtime Impact:**
  - **No user role in the entire system can cancel an order anymore** (`OWNER` only has permanent hard-delete, and `ADMIN`, `MARKETING_MANAGER`, and `ACCOUNTANT` cannot cancel mistakes or customer-cancelled bookings at all).
  - Meanwhile, `Orders.jsx:334` still renders the **`"Cancelled Orders"`** tab (`activeTab === 'cancelled'`), which is now permanently empty for all new orders.
- **Exact Fix for Antigravity:**
  1. Add a dedicated soft-cancel endpoint in `backend/src/routes/order.routes.js`:
     ```js
     router.patch('/:id/cancel', requireRoles('OWNER', 'ADMIN', 'ACCOUNTANT', 'MARKETING_MANAGER'), checkDailyCloseLock, cancelOrder);
     ```
  2. Implement `cancelOrder` in `backend/src/controllers/order.controller.js`:
     - Block cancellation if `order.deliveryStatus === 'DELIVERED'` or `'PARTIAL'` (or if payments/deliveries exist, require reversing them first).
     - Within a `prisma.$transaction`, set `deliveryStatus: 'CANCELLED'` and reverse any unpaid `creditAmount` from `customer.currentBalance` if `order.creditAmount > 0` was already added at order creation (note: in AquaSphere, customer balance is updated on delivery/payment, so verify whether `order.paymentStatus === 'UNPAID'` touched `currentBalance`; if `payments` exist on a `PENDING` order, refund/reverse or block until payments are removed).
  3. Restore the **"Cancel Order"** button in `OrderActionButtons.jsx` / `Orders.jsx` for `PENDING` orders when `['OWNER', 'ADMIN', 'ACCOUNTANT', 'MARKETING_MANAGER'].includes(userRole)`, keeping permanent **"Delete Order"** strictly for `OWNER`.

---

### `BK-04` (Critical Backend Bug): Wadaana Industries Can NEVER Lock Daily Close (`400 Bad Request` Deadlock)
- **Affected Files:**
  - `backend/src/controllers/dailyClose.controller.js` (Lines `46–52`)
  - `frontend/src/components/dailyClose/CounterAuditLedgerCard.jsx` (Line `91`)
- **Root Cause:**
  - In `dailyClose.controller.js:46–52` (added in PR #31), `closeDay` enforces:
    ```js
    const auditLedger = await prisma[`${prefix}CounterAuditLedger`].findUnique({
      where: { date: targetDate }
    });
    if (!auditLedger) {
      throw new ApiError(400, 'Counter Audit Ledger must be submitted and verified before daily close can be locked');
    }
    ```
  - However, in `frontend/src/components/dailyClose/CounterAuditLedgerCard.jsx:91`:
    ```js
    if (isWadaana) return null;
    ```
    Wadaana Industries (`prefix === 'wadaana'`) is a PET blow-molding plant that does **not** operate a walk-in water dispenser counter, so the UI hides `CounterAuditLedgerCard` for Wadaana!
- **Runtime Impact:**
  - When `OWNER`, `ADMIN`, or `ACCOUNTANT` tries to finalize and lock the day in **Wadaana Industries**, `closeDay` unconditionally throws **`400 Bad Request: Counter Audit Ledger must be submitted and verified before daily close can be locked`**, and there is no UI on Wadaana to submit it! Wadaana is 100% deadlocked from closing any day.
- **Exact Fix for Antigravity:**
  - In `backend/src/controllers/dailyClose.controller.js:46–52`, only require `CounterAuditLedger` when `prefix !== 'wadaana'`:
    ```js
    if (prefix !== 'wadaana') {
      const auditLedger = await prisma[`${prefix}CounterAuditLedger`].findUnique({
        where: { date: targetDate }
      });
      if (!auditLedger) {
        throw new ApiError(400, 'Counter Audit Ledger must be submitted and verified before daily close can be locked');
      }
    }
    ```

---

### `BK-05` (High Backend & Frontend Mismatch): `AccountantClose.jsx` Allows Clicking `"Finalize & Lock Day"` Before Prerequisites Are Met, and `AdminDashboardView` Omits `Transport (TM)` From Daily Close Status
- **Affected Files:**
  - `frontend/src/components/dailyClose/AccountantClose.jsx` (Lines `36–55`, `235–246`)
  - `frontend/src/components/dailyClose/AdminClose.jsx` (Lines `50–56`, `321`)
  - `frontend/src/components/dailyClose/OwnerClose.jsx` (Lines `53–59`, `371`)
  - `backend/src/controllers/adminDashboard.controller.js` (Lines `255–261`)
  - `frontend/src/components/dashboard/AdminDashboardView.jsx` (Lines `337–360`)
- **Root Cause:**
  1. In `AdminClose.jsx:53` and `OwnerClose.jsx:56`, `allDepartmentsConfirmed = pmConfirmed && mmConfirmed && tmConfirmed` is checked before calling `onCloseDay`, and the **"Finalize & Lock Day"** button is disabled until all 3 departments confirm. Furthermore, neither `AdminClose`, `OwnerClose`, nor `AccountantClose` checks whether `statusData?.auditLedger` has been submitted (`!isWadaana && !statusData?.auditLedger`), so clicking the button before saving the Counter Audit Ledger triggers an unexpected `400` error toast.
  2. In `AccountantClose.jsx:36–55` (created in PR #31), `allDepartmentsConfirmed` is **not checked at all**, nor is the button disabled when PM, MM, or TM haven't confirmed!
  3. In `adminDashboard.controller.js:255–261`, `dailyCloseStatus` returns `pmConfirmed`, `mmConfirmed`, `adminConfirmed`, but **omits `tmConfirmed: Boolean(todaysDailyClose?.tmConfirmed)`**, and `AdminDashboardView.jsx:337–360` only displays 3 rows (`Production (PM)`, `Marketing (MM)`, `Admin Final Lock`), hiding `Transport (TM)` completely!
- **Exact Fix for Antigravity:**
  1. In `AdminClose.jsx`, `OwnerClose.jsx`, and `AccountantClose.jsx`:
     - Compute `const isCounterAuditReady = isWadaana || Boolean(statusData?.auditLedger);`
     - Compute `const canLockDay = allDepartmentsConfirmed && isCounterAuditReady;`
     - Disable the **"Finalize & Lock Day"** button when `!canLockDay || submitting`, and display a clear human-readable checklist banner telling the user exactly which step is still pending (`PM Confirmation`, `MM Confirmation`, `TM Confirmation`, or `Step 1: Save Counter Audit Ledger`).
  2. In `backend/src/controllers/adminDashboard.controller.js:258`, add `tmConfirmed: Boolean(todaysDailyClose?.tmConfirmed)` and add the `Transport (TM)` row to `AdminDashboardView.jsx:350`.

---

### `BK-06` (High Data-Integrity Bug): `deleteCustomer` in `customer.controller.js` Leaves Corrupted 19L Empty Bottle Stock When Rolling Back `SpotSale`s
- **Affected Files:**
  - `backend/src/controllers/customer.controller.js` (Lines `862–896`)
  - `backend/src/controllers/spotSale.controller.js` (Lines `750–785`)
- **Root Cause:**
  - In PR #31 (`e2c1d7c`), Antigravity updated `deleteCustomer` (`customer.controller.js:862–896`) to restore `InventoryTransaction`s (`direction: 'OUT'`) when deleting a customer's `spotSales`.
  - However, when a counter sale had `emptyBottlesReturned > 0` (`RETURNED_GOOD` in `BottleTransaction`), `createSpotSale` called `creditEmptyBottlesToFactory(tx, prefix, emptyBottlesReturned)` which incremented the `19L Empty Bottle` raw material / factory stock.
  - Unlike `deleteSpotSale` (`spotSale.controller.js:765–780`), which calls `debitEmptyBottlesFromFactory` and deletes `BottleTransaction` rows linked to the spot sale, `deleteCustomer` only reverses `direction: 'OUT'` `InventoryTransaction`s and **never reverses `emptyBottlesReturned` from factory empty bottle stock**!
- **Exact Fix for Antigravity:**
  - Extract a shared helper `rollbackSpotSaleInventory(tx, prefix, spotSale)` (used by both `deleteSpotSale` in `spotSale.controller.js` and `deleteCustomer` in `customer.controller.js`) so that `emptyBottlesReturned` (`debitEmptyBottlesFromFactory`) and all `InventoryTransaction` rows are reversed identically in one place.

---

### `BK-07` (Medium Financial Math Bug): Clamped `expectedDrawerCash` (`Math.max(0, ...)`) Creates Artificial Cash Variance When Drawer Goes Negative or Uses Opening Float
- **Affected Files:**
  - `backend/src/controllers/analytics.controller.js` (Line `1017`)
  - `backend/src/controllers/dailyClose.controller.js` (Line `88`)
  - `frontend/src/components/dailyClose/DrawerReconciliationCard.jsx` (Lines `25–58`)
- **Root Cause:**
  - Both `analytics.controller.js:1017` and `dailyClose.controller.js:88` clamp `expectedDrawerCash`:
    ```js
    const expectedDrawerCash = Math.max(0, ordersCashOnly + spotSalesCashOnly - totalExpenses - totalVendorCash);
    ```
  - Meanwhile, in `DrawerReconciliationCard.jsx:25–58` (used on `AdminClose`, `OwnerClose`, and `AccountantClose`), the UI displays a 3-column math strip:
    - Column 1: `+ Cash Inflow (Orders + Counter)` = `Rs. X`
    - Column 2: `- Operating Expenses` = `Rs. Y` *(Note: This column omits `- Vendor Cash Paid`, even though `expectedCash` subtracts `vendorCashPaid`!)*
    - Column 3: `= Expected in Drawer` = `Rs. Z`
  - **Two bugs happen here:**
    1. Whenever `totalVendorCash > 0`, the numbers on `DrawerReconciliationCard` **do not add up visually**! For example, if Cash Inflow = `Rs. 10,000`, Operating Expenses = `Rs. 2,000`, and Vendor Cash Paid = `Rs. 3,000`, the card shows:
       `+ Rs. 10,000` | `- Rs. 2,000` | `= Rs. 5,000`! A non-technical Admin/Accountant immediately thinks the software cannot do `10,000 - 2,000 = 8,000`!
    2. When `Expenses + Vendor Cash Paid > Cash Inflow` (e.g., Owner paid a vendor Rs. 15,000 from safe/opening float on a slow morning), `Math.max(0, ...)` clamps Expected Cash to `Rs. 0`, hiding the net cash outflow.
- **Exact Fix for Antigravity:**
  1. In `backend/src/controllers/analytics.controller.js:1025`, include `vendorCashPaid: totalVendorCash` inside `dailySummary`.
  2. In `frontend/src/components/dailyClose/DrawerReconciliationCard.jsx:25–58`, either show a 4-pill breakdown (`+ Cash Inflow`, `- Cash Expenses`, `- Vendor Cash Paid`, `= Expected in Drawer`) or combine Column 2 as `- Cash Outflows (Expenses + Vendor Cash)` = `expenses + vendorCashPaid` with a subtitle showing the split (`Exp: Rs. X • Vendors: Rs. Y`), so `Column 1 - Column 2 === Column 3` always holds!

---

### `BK-08` (Medium Backend Code Quality & Performance): Unbounded Queries & Missing `checkDailyCloseLock` on Financial Mutation Routes
- **Affected Files:**
  - `backend/src/routes/customer.routes.js` (Line `24`: `POST /:id/payment` missing `checkDailyCloseLock`)
  - `backend/src/routes/vendor.routes.js` (`POST /:id/payments` / `DELETE /payments/:paymentId` missing `checkDailyCloseLock`)
  - `backend/src/routes/purchase.routes.js` (`POST /:id/payments` missing `checkDailyCloseLock`)
  - `frontend/src/components/dashboard/TransportDashboardView.jsx` (Line `47`: fetches `GET /api/v1/orders?limit=all` on every dashboard load and every SSE event!)
- **Root Cause:**
  1. `order.routes.js`, `spotSale.routes.js`, `expense.routes.js`, and `production.routes.js` use `checkDailyCloseLock` so staff cannot alter today's cash/inventory after Daily Close is locked. However, **Customer Lump-Sum Debt Settlement (`POST /customers/:id/payment`)** and **Vendor/Purchase Payments (`POST /vendors/:id/payments`, `POST /purchases/:id/payments`)** do **not** have `checkDailyCloseLock`! Staff can record a `CASH` customer payment or `CASH` vendor payment *after* the day is locked, mutating the locked day's cash ledger.
  2. `TransportDashboardView.jsx:47` calls `fetch(\`${API_URL}/orders?limit=all\`)` on mount and on every `ORDER_CREATED` / `ORDER_UPDATED` / `EXPENSE_LOGGED` SSE event, pulling the entire historical `Order` + `OrderItem` + `Delivery` table over the network just to count `pendingDeliveries` and `timeframeDeliveredCount` on the client!
- **Exact Fix for Antigravity:**
  1. Add `checkDailyCloseLock` to `POST /customers/:id/payment`, `POST /vendors/:id/payments`, `DELETE /vendors/payments/:paymentId`, and `POST /purchases/:id/payments`.
  2. Add a lightweight `GET /api/v1/analytics/transport-dashboard?timeframe=...` endpoint (or pass `limit=100` + server-side counts) so `TransportDashboardView.jsx` does not download thousands of historical orders over mobile data.

---

## Part 2: Mobile Screen Breakages (`320px–430px`) & Landing Page PDF/Certificate Loader Fixes

### `MOB-01` (Critical Mobile Bug): Why the PDF / Certificate Loader on the Landing Page Breaks on Mobile (`CertificateLightboxModal.jsx` & `pdfViewerHelper.js`)
- **Affected Files:**
  - `frontend/src/components/common/CertificateLightboxModal.jsx` (Lines `50–139`, `280–311`, `417–504`)
  - `frontend/src/utils/pdfViewerHelper.js` (Lines `29–45`, `75–116`)
- **Why It Breaks on Mobile Screens (4 Compounding Root Causes):**
  1. **Root Cause A — 3-Second Hard Abort Kills PDF.js Download on Mobile Networks (`pdfViewerHelper.js:34–42`):**
     ```js
     const timeoutId = setTimeout(() => {
       loadingTask.destroy().catch(() => {});
       reject(new Error('PDF load timeout'));
     }, 3000);
     ```
     On mobile 4G/LTE connections (especially in Pakistan), downloading the `pdf.worker.min.mjs` WebWorker bundle plus a multi-page scanned certificate PDF takes `3.5s–8s`. At exactly `3000ms`, `getPdfDocument()` calls `loadingTask.destroy()`, aborting the PDF download mid-flight!
  2. **Root Cause B — Mobile GPU Canvas Megapixel Overflow Causes Blank/Transparent/Squashed Canvas (`pdfViewerHelper.js:82–90` & `CertificateLightboxModal.jsx:90, 119, 466`):**
     - On modern Android/iOS phones, `window.devicePixelRatio` is `2.75` to `3.5`.
     - In `CertificateLightboxModal.jsx:90`, `targetCssWidth = Math.max(containerWidth, 900) * zoom`. Even on a `360px` phone screen, `Math.max(containerWidth, 900)` forces `targetWidth = 900 * zoom`!
     - Then `pdfViewerHelper.js:82–90` multiplies `scale = (targetWidth / baseViewport.width) * dpr` (up to `scale = 7.0`), creating a `<canvas>` pixel buffer of `~3000px × 4200px` (**12.6 to 25+ Megapixels**).
     - Mobile Chrome and Mobile Safari enforce strict GPU canvas memory limits. When the canvas exceeds the mobile GPU tile budget, `page.render()` resolves its promise **without drawing pixels** (leaving a transparent/blank `<canvas>`), and then `CertificateLightboxModal.jsx:119` sets `setIsVectorPdfLoaded(true)` — which sets **`opacity-0` on the working fallback `<img>` (`line 466`)** and **`opacity-100` on the blank `<canvas>` (`line 481`)**! The certificate literally vanishes in front of the user!
  3. **Root Cause C — Inline `style={getImageStyle()}` Applied to BOTH Wrapper `<div>` and `<canvas>` Distorts Aspect Ratio on Mobile (`CertificateLightboxModal.jsx:280–311, 455, 476`):**
     - `getImageStyle()` returns `{ maxHeight: 'calc(100vh - 210px)', maxWidth: '100%', width: 'auto', height: 'auto' }` and is applied to **both** the outer `div` (`line 455`) and the `<canvas>` (`line 476`).
     - Because the `<canvas>` has intrinsic HTML attributes `width={3000} height={4200}` while the fallback `<img>` has different natural dimensions, applying `max-height: calc(100vh - 210px)` + `max-width: 100%` to an `overflow-hidden` wrapper containing an `absolute inset-0` `<canvas>` causes the canvas and image to mismatch dimensions or squash horizontally inside the flex container on mobile viewports.
  4. **Root Cause D — Zero Touch Gestures, Overlapping Prev/Next Arrows & Desktop-Only Bottom Banner on Mobile (`CertificateLightboxModal.jsx:221–260, 417–438, 497–504`):**
     - Only `onMouseDown`, `mousemove`, `mouseup`, and `onWheel` are wired; touch drag/pinch-to-zoom is broken when zoomed in.
     - The floating `left-2 top-1/2` and `right-2 top-1/2` Prev/Next buttons sit directly on top of the certificate text on `360px` screens.
     - The bottom pill (`line 501`) says `"Drag to pan · Scroll horizontally & vertically · Double-click to toggle fit"` on a touchscreen phone!
- **Exact Fix for Antigravity:**
  1. In `frontend/src/utils/pdfViewerHelper.js`:
     - Increase the timeout in `getPdfDocument` (`line 34`) from `3000` (`3s`) to `15000` (`15s`).
     - Cap mobile canvas pixel dimensions in `renderPdfToCanvas` (`lines 81–91`) so `canvas.width * canvas.height` never exceeds `4096 * 4096` (`16.7 MP`) and cap `dpr` on mobile (`window.innerWidth < 768 ? Math.min(window.devicePixelRatio || 1, 2.0) : Math.max(window.devicePixelRatio || 1, 2.0)`).
     - In `CertificateLightboxModal.jsx:90`, change `const targetCssWidth = Math.max(containerWidth, 900) * zoom;` to `const targetCssWidth = Math.max(containerWidth, window.innerWidth < 640 ? 480 : 900) * zoom;`.
     - After `task.promise` resolves in `CertificateLightboxModal.jsx:118`, verify `canvasRef.current.width > 0 && canvasRef.current.height > 0` before setting `setIsVectorPdfLoaded(true)`.
  2. In `frontend/src/components/common/CertificateLightboxModal.jsx`:
     - Do **not** hide the `<img>` (`opacity-0`) when `zoom === 1 && fitMode !== 'width'` on mobile if the high-res `.jpg` (`cert.image`) is already loaded, OR keep `<canvas>` strictly `className="w-full h-full object-contain"` inside the single sized container instead of duplicating `style={getImageStyle()}` on both parent and child.
     - Use `100dvh` instead of `100vh` (`maxHeight: 'calc(100dvh - 180px)'`) so mobile Chrome's address bar does not clip the modal footer.
     - Enable native touch scrolling (`-webkit-overflow-scrolling: touch`, `touch-action: pan-x pan-y pinch-zoom`) on the viewport container (`line 442`) instead of blocking touch events, and hide the desktop instruction pill (`"Drag to pan · Double-click..."`) on mobile (`hidden sm:block`).

---

### `MOB-02` (High Mobile Bug): Landing Page `ProductShowcaseModal` Squeezes Content Between Side Arrows on Mobile (`LandingPage.jsx:255–392` & `landing.css:1973–2320`)
- **Affected Files:**
  - `frontend/src/pages/LandingPage.jsx` (Lines `255–392`)
  - `frontend/src/styles/landing.css` (Lines `1911–2015`, `2260–2320`)
- **Root Cause:**
  - `.lp-showcase-content` (`landing.css:1973–1984`) is a horizontal flex row (`display: flex; align-items: center; justify-content: space-between; gap: 0.75rem`) that puts the **Left Arrow Button (`32px`)**, the **Product Card Grid (`.lp-showcase-grid`)**, and the **Right Arrow Button (`32px`)** side-by-side horizontally!
  - On a `360px` mobile screen (`padding: 0.5rem`), those side-by-side prev/next buttons plus gaps eat `~90px` of horizontal width, crushing `.lp-showcase-grid` into a narrow `~250px` column!
  - Furthermore, inside `.lp-showcase-grid` on mobile (`landing.css:2268`), `grid-template-columns: 1fr` stacks `.lp-showcase-info` (the long product title, description, 2×2 spec cards, and Order CTA button) **above** `.lp-showcase-visual` (the bottle photo), so on mobile the user opens a product showcase modal and **cannot even see the bottle image without scrolling to the bottom**!
- **Exact Fix for Antigravity:**
  1. In `landing.css` (`@media (max-width: 640px)`):
     - Set `.lp-showcase-visual { order: -1; min-height: 180px; padding: 1rem; }` so the bottle image appears at the **top** of the modal on mobile.
     - Position `.lp-showcase-nav--prev` and `.lp-showcase-nav--next` as floating overlay buttons over the top visual area (`position: absolute; top: 110px; z-index: 10;`) or move them into the bottom indicator bar on `< 640px` so `.lp-showcase-grid` gets **100% of the mobile screen width**!
     - Replace `max-height: calc(100vh - 120px)` with `max-height: calc(100dvh - 96px)` so mobile Chrome's bottom navigation bar never clips the "Order This Size Now" button.

---

### `MOB-03` (High Mobile Bug): `DateRangePicker.jsx` Popover (`w-[95vw] right-0`) Overflows Off the Left Edge of Mobile Screens
- **Affected Files:**
  - `frontend/src/components/ui/DateRangePicker.jsx` (Lines `303`, `317–320`, `370–425`)
- **Root Cause:**
  - Line `317`:
    ```jsx
    <div className="absolute right-0 top-full mt-2 z-50 bg-white rounded-2xl shadow-2xl border border-slate-200/90 p-4 w-[95vw] sm:w-[500px] max-w-[500px] ...">
    ```
  - Because `DateRangePicker` is inside a `relative inline-block` container (`line 303`) that is often positioned on the **left** or **center** of a mobile toolbar (e.g., inside `Orders.jsx`, `CounterSales.jsx`, `Expenses.jsx`, `Purchases.jsx`), setting `absolute right-0 w-[95vw]` aligns the **right** edge of a `95vw`-wide popover with the trigger button's right edge — pushing `60%–70%` of the calendar popover **off the left side of the phone screen (`x < 0`)** where the user cannot see or tap it!
- **Exact Fix for Antigravity:**
  - On mobile (`< 640px`), render the `DateRangePicker` dropdown as a **centered fixed modal/bottom-sheet** (`fixed inset-x-3 top-1/2 -translate-y-1/2 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:translate-y-0 w-auto sm:w-[500px] max-h-[85dvh] overflow-y-auto z-50`) with a mobile backdrop overlay (`sm:hidden fixed inset-0 bg-slate-900/30 z-40`), so it never clips off the left or right edge of any mobile screen regardless of where the trigger button sits.

---

### `MOB-04` (High Mobile Bug): `AddEditFinishedGoodModal.jsx` Recipe Grid (`grid-cols-12`) & `AddEditPurchaseModal.jsx` Item Row (`grid-cols-12`) Crush Inputs on Mobile
- **Affected Files:**
  - `frontend/src/components/inventory/AddEditFinishedGoodModal.jsx` (Lines `498–564`)
  - `frontend/src/components/purchases/AddEditPurchaseModal.jsx` (Lines `439–513`)
- **Root Cause:**
  1. In `AddEditFinishedGoodModal.jsx:498–564`, each recipe row is a rigid `grid-cols-12` (`col-span-7` Material Name + badge + `= X/pk` hint, `col-span-2` Stock, `col-span-3` `w-20` input + `w-7` unit). On a `360px` phone (`col-span-3` is `~75px`), a `w-20` (`80px`) input + `w-7` (`28px`) unit label (`108px` total) **overflows its 3-column cell and overlaps the "In Stock" column**!
  2. In `AddEditPurchaseModal.jsx:455–509`, on mobile (`< 640px`), Qty (`col-span-4`), Unit Rate (`col-span-4`), Total Price (`col-span-3`), and Delete Button (`col-span-1`) are crammed into a single horizontal 12-column row. `col-span-3` on a `320px` inner modal width is only `72px` wide — the label `"Total Price (PKR)"` wraps into 2 lines and the PKR amount is cut off!
- **Exact Fix for Antigravity:**
  1. In `AddEditFinishedGoodModal.jsx:498–564`:
     - On `< 640px`, give the Material Name + Stock `col-span-7` (with Stock shown as a subtitle under the material name on mobile: `sm:hidden text-[10px] text-slate-400`), hide the middle `col-span-2` column on `xs` (`hidden sm:block sm:col-span-2`), and give the input column `col-span-5 sm:col-span-3` so the quantity input + unit label never overflow!
  2. In `AddEditPurchaseModal.jsx:455–509`:
     - Change the mobile spans to a clean 2-row layout on `< 640px`:
       - Row 1: Raw Material (`col-span-10 sm:col-span-4`) + Trash button (`col-span-2 sm:col-span-1 sm:order-last`)
       - Row 2: Qty (`col-span-4 sm:col-span-2`), Unit Rate (`col-span-4 sm:col-span-2`), Total Price (`col-span-4 sm:col-span-3`) with `text-[10px] sm:text-[11px] truncate` labels.

---

### `MOB-05` (Medium Mobile Bug): Cramped 3-Column Financial Strips & Non-Responsive Grids on Small Screens (`320px–375px`)
- **Affected Files:**
  - `frontend/src/components/dashboard/UnprocessedOrdersModal.jsx` (Line `41`: `grid-cols-3 gap-2.5 px-6` -> `Rs. 1,250,000` overflows card on `360px` screen)
  - `frontend/src/components/dailyClose/AdminClose.jsx` (Line `184`: `grid-cols-3 sm:grid-cols-6`) & `OwnerClose.jsx` (Line `234`: `grid-cols-3 sm:grid-cols-6`)
  - `frontend/src/components/customer/CustomerProfileCard.jsx` (Line `41`: `grid-cols-3 divide-x`)
  - `frontend/src/components/purchases/RecordPurchasePaymentModal.jsx` (Line `164`: `grid-cols-3`)
  - `frontend/src/components/layout/Sidebar.jsx` (Line `196`: `h-screen` instead of `h-[100dvh]`, causing the `"Sign Out"` button at the bottom of the mobile drawer to be hidden behind Chrome's mobile address/navigation bar!)
- **Exact Fix for Antigravity:**
  1. In `Sidebar.jsx:196`, replace `h-screen` with `h-dvh` (`height: 100dvh`) so the bottom `"WhatsApp"` toggle and `"Sign Out"` button are always visible and tappable on mobile Chrome/Safari.
  2. In `UnprocessedOrdersModal.jsx:41`, change `px-6 py-3.5 grid grid-cols-3 gap-2.5` to `px-3 sm:px-6 py-3 grid grid-cols-1 sm:grid-cols-3 gap-2`.
  3. In `AdminClose.jsx:184` and `OwnerClose.jsx:234`, change `grid-cols-3 sm:grid-cols-6` to `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6`.

---

## Part 3: Deep UI/UX Audit for Non-Technical Users & All 6 Role Dashboards

### Why Non-Technical Users (Cashiers, Plant Supervisors, Dispatchers, Owners) Find the Current UI Confusing

1. **Accounting/ERP Jargon Instead of Everyday Pakistani Plant & Market Terminology (`UX-01`):**
   - Non-technical staff do not immediately understand labels like **`"Ex-GST"`**, **`"Estimated COGS"`**, **`"68% GM"`**, **`"Unprocessed Sales"`**, **`"Cached Qty"`**, **`"Custody Adjustment"`**, or **`"Spot Sale"`**.
   - **Fix:** Pair or replace technical terms with plain business labels + 1-line helper subtitles:
     - `"Estimated COGS (68% GM)"` $\rightarrow$ **`"Production Cost (COGS)"`** with badge **`"68% Profit Margin"`**
     - `"Unprocessed Orders"` $\rightarrow$ **`"Booked — Waiting for Delivery"`**
     - `"Market Udhaar (Receivables)"` $\rightarrow$ Keep **`"Market Udhaar (Customer Credit)"`** (good!) and add a clear **`"Collect Payment"`** CTA.
     - `"Retrieve / Adjust"` (on Bottle Custody) $\rightarrow$ Split or label clearly as **`"Return Empty Bottles / Adjust Count"`**.

2. **Counter Sales (`LogCounterSaleForm.jsx`) Looks Like a Dense Spreadsheet Form Instead of a Simple Point-of-Sale (POS) Screen (`UX-02`):**
   - Look at `LogCounterSaleForm.jsx:543–628`: every single product row displays `[Icon + Name + Pack Badge + Stock in Packs & Bottles] + [Editable "Rs" Price Input Box] + [ - | Qty Input | + ] + [+1 | +5 | +10]`.
   - On a mobile phone (`360px` width), putting the **Product Title**, **Editable Price Input**, and **Quantity Stepper** on a single horizontal row causes `flex-wrap` to wrap awkwardly or crushes the product title to `70px` (`"0.5L P..."`).
   - Worse, a non-technical cashier accidentally taps the **`Rs` Price Input** right next to the `-` button when trying to tap `-` or `+`, accidentally changing the product price!
   - Furthermore, the `-` and `+` buttons are tiny **`w-6 h-6` (`24px × 24px`)** — far below the `40px–44px` minimum touch target needed for fast finger tapping at a busy water counter!
   - **Exact Fix for Antigravity (`LogCounterSaleForm.jsx`):**
     - Increase stepper buttons from `w-6 h-6` (`24px`) to **`w-8 h-8 sm:w-7 sm:h-7` (`32px` on mobile)** so cashiers never miss a tap.
     - On mobile (`< 640px`), stack each product card cleanly into **2 rows**:
       - **Top Row:** Full Product Name + Pack badge (`12/pk`) on the left, Stock badge (`24 Packs`) on the right.
       - **Bottom Row:** Rate (`Rs. 180/pk` — locked by default with a small pencil/edit tap, or compact left-aligned rate) on the left, and `[ - ] [ Qty ] [ + ]` + `[+1] [+5]` quick buttons on the right!
     - Add a sticky **Mobile Bottom Checkout Bar** (`lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 p-3 z-30 flex items-center justify-between shadow-lg`) when `cartItems.length > 0` showing `Cart: X items • Rs. Y` and a `"Jump to Checkout ↓"` button so mobile cashiers don't have to scroll past 10 products and raw materials to reach the right-hand checkout panel!

3. **All 6 Role Dashboards — Role-by-Role Deep Audit & Flaws (`DASH-01` to `DASH-06`):**

| Role Dashboard | Component File | Specific Bugs, Confusing UI & Missing Elements Found | Exact Fix for Antigravity |
| :--- | :--- | :--- | :--- |
| **1. OWNER Dashboard** | `OwnerDashboardView.jsx` | 1. **Information Overload in Card Subtitles (`lines 267, 275`):** The "Operating Expenses" card subtitle crams 3 different metrics into one tiny `12px` line (`"Transport: Rs. X • Purchases: Rs. Y (Paid: Rs. Z)"`) which truncates on mobile/tablet (`line-clamp-2`).<br>2. **Dual Timeframe Dropdowns (`lines 237, 338`):** There is a top page `TimeframeDropdown` (`Today`, `This Month`, etc.) AND a second chart dropdown (`Past 7 Days`, `Past 30 Days`, `Past 12 Months`) that do **not** sync with each other! Changing the top dropdown to `Today` leaves the chart on `Past 7 Days`, confusing the Owner.<br>3. **`CustomerRiskHub` Settle Debt (`BK-01`):** Works for Owner, but `BottleCustodyWidget` inside `CustomerRiskHub` has no direct link to filter customers with >30 days inactive bottles. | 1. Sync `chartTimeframe` automatically when the top `timeframe` changes (just like `MarketingDashboardView` and `ProductionDashboardView` already do!).<br>2. Format multi-metric KPI subtitles as clean 2-line pill pairs instead of a run-on sentence.<br>3. Pass `vendorCashPaid` to `DailyClose` reconciliation so cash numbers match 100%. |
| **2. ADMIN Dashboard** | `AdminDashboardView.jsx` & `adminDashboard.controller.js` | 1. **Broken Timeframe Labels (`AdminDashboardView.jsx:104, 113, 128, 137, 179, 250`):** Admin Dashboard has a `TimeframeDropdown` (`Today`, `Yesterday`, `This Week`, `This Month`, `This Year`), **but every single card title and table header is hardcoded to say `"Today's Orders"`, `"Today's Production Yield"`, `"Water Dispensed Today"`, `"Today's Orders Status"`, `"Today's Production Runs"`** even when `"This Month"` or `"This Year"` is selected!<br>2. **Missing `Transport (TM)` in Daily Close Card (`lines 337–360`):** Only shows `PM`, `MM`, and `Admin Final Lock` — completely omits `TM` (`tmConfirmed` is also missing from `adminDashboard.controller.js:258`)!<br>3. **No Visual Chart:** Admin is the only operational supervisor dashboard with zero visual trend chart. | 1. Replace all hardcoded `"Today's"` / `"Today"` strings in `AdminDashboardView.jsx` with dynamic `getPeriodLabel()` (`"Today's"`, `"This Week's"`, `"This Month's"`, etc.) matching `timeframe`.<br>2. Add `tmConfirmed: Boolean(todaysDailyClose?.tmConfirmed)` in `adminDashboard.controller.js:258` and render the `Transport (TM)` status row in `AdminDashboardView.jsx:350`. |
| **3. ACCOUNTANT Dashboard** | `AccountantDashboardView.jsx` | 1. **Dual Unsynced Timeframe Dropdowns (`lines 150, 274`):** Changing the top `TimeframeDropdown` (`Today`, `This Month`) does **not** update the chart's `selectedDays` dropdown (`Past 7 Days`, `Past 30 Days`).<br>2. **Missing Counter Audit & Daily Close Readiness Widget:** The Accountant is responsible for verifying the Counter Audit Ledger and locking the day (`AccountantClose.jsx`), yet `AccountantDashboardView.jsx` has **zero indicator** showing whether today's Counter Audit Ledger or Daily Close is pending or locked!<br>3. **No Direct Quick-Action Bar:** Unlike Production and Transport dashboards, Accountant Dashboard has no quick-action buttons (`"Settle Customer Debt"`, `"Record Vendor Payment"`, `"Log Expense"`, `"Daily Close"`). | 1. Sync `selectedDays` with the top `timeframe` selector.<br>2. Add a compact **Daily Close & Counter Audit Status Strip** + quick-action buttons (`/daily-close`, `/expenses`, `/purchases`, `/customers`) in the header of `AccountantDashboardView.jsx`. |
| **4. MARKETING MANAGER Dashboard** | `MarketingDashboardView.jsx` | 1. **`403 Forbidden` Trap in `CustomerRiskHub` (`BK-01`):** `MarketingDashboardView.jsx:278` mounts `<CustomerRiskHub />`, which shows the **"Settle Debt"** button to `MARKETING_MANAGER`, which fails with `403 Forbidden` on submit because `customer.routes.js:24` excludes `MARKETING_MANAGER`!<br>2. **No Quick Actions in Header (`lines 132–154`):** A Marketing Manager logging in on mobile has no `"New Order"` or `"Counter Sale"` button on their dashboard header — they must open the hamburger menu first.<br>3. **Missing Daily Close MM Confirmation Banner:** MM must confirm `mmConfirmDailyClose` every evening before the day can be locked, but their dashboard never tells them if today's **MM Daily Close Confirmation** is still pending! | 1. Fix `BK-01` in `customer.routes.js:24`.<br>2. Add **`+ New Order`** (`/orders`) and **`Counter Sale`** (`/counter-sales`) quick-action buttons to `MarketingDashboardView.jsx:150`.<br>3. Show a clickable `"MM Daily Close Pending — Verify Now →"` pill linking to `/daily-close` when `!data?.dailyClose?.mmConfirmed`. |
| **5. PRODUCTION MANAGER Dashboard** | `ProductionDashboardView.jsx` & `ProductionKPICards.jsx` | 1. **Misleading Sum of Mixed Units in `"Factory Floor Stock"` (`ProductionKPICards.jsx:68`):** Line `68` sums `finishedGoods.reduce((sum, item) => sum + Number(item.factoryQty || 0), 0)` and labels it `"Units"`. Because `item.factoryQty` is in `Packs` for `0.5L`/`1.5L` (`packSize > 1`) and `Bottles` for `19L`, adding `100 (19L bottles) + 50 (0.5L packs)` into `"150 Units"` mixes 19L bottles and PET packs without showing the breakdown in the subtitle!<br>2. **Empty State Hardcoded to `"today"` (`ProductionRecentRuns.jsx:32`):** Says `"No production runs logged today."` even when `This Month` is selected.<br>3. **`+1` Tooltip Badge on Mobile (`ProductionRecentRuns.jsx:55, 78`):** Multi-item batches hide the 2nd/3rd produced SKUs behind a `title="..."` hover badge (`+1`, `+2`) with `cursor-help` — **on mobile touchscreens, `title` tooltips cannot be hovered**, so the Production Manager cannot see what else was produced in that batch! | 1. In `ProductionKPICards.jsx:73`, show the per-SKU breakdown in the subtitle (e.g., `19L: X btl • PET: Y packs`) instead of generic `"Available at factory floor"`.<br>2. In `ProductionRecentRuns.jsx:51–85`, render all produced SKUs inline as compact badges (`flex-wrap gap-1`) instead of hiding them behind a desktop-only `title` hover tooltip!<br>3. Make the `"Pending PM Verification"` badge on `ProductionKPICards.jsx:134` a clickable `<Link to="/daily-close">` so the PM can verify in 1 tap. |
| **6. TRANSPORT MANAGER Dashboard** | `TransportDashboardView.jsx` | 1. **Downloads Entire Order History (`?limit=all`) on Every Load (`line 47`):** Slows down mobile loading as order history grows.<br>2. **Missing TM Daily Close Confirmation Status:** Transport Manager is required to confirm `tmConfirmDailyClose` every day (`dailyClose.controller.js:58`), or the entire company is blocked from locking Daily Close! Yet `TransportDashboardView.jsx` has **zero card or banner** showing whether today's TM Daily Close is confirmed or pending!<br>3. **`"Total Transport Spend"` Card (`line 299`) Mixes All-Time vs Timeframe:** The big number shows `totalTransportSpend` (sum of last 200 expenses regardless of timeframe), while the small subtitle shows `timeframeVehicleExpenses`! All other dashboards show the **selected timeframe** as the big number. | 1. Swap the primary value on the `"Transport Spend"` card (`line 305`) to show `timeframeVehicleExpenses` (`${getPeriodLabel()} Transport Spend`) as the big number, and all-time/recent total in the subtitle.<br>2. Add a **TM Daily Close Status** card/banner linking to `/daily-close` so TM knows when their daily sign-off is needed.<br>3. Replace `?limit=all` with bounded query or dashboard endpoint. |

---

## Part 4: Step-by-Step Execution Checklist & Graphify Commands for Antigravity

### Step 0: Run Graphify Blast-Radius Queries Before Editing
```bash
graphify query "settleCustomerLumpSumPayment canSettleDebt customer.routes"
graphify query "closeDay CounterAuditLedger AccountantClose AdminClose OwnerClose"
graphify query "CertificateLightboxModal renderPdfToCanvas getPdfDocument"
graphify query "AdminDashboardView MarketingDashboardView ProductionDashboardView TransportDashboardView"
```

### Step 1: Backend Fixes (`backend/src/...`)
- [ ] **`backend/src/routes/customer.routes.js:24` (`BK-01` & `BK-08`):**
  Update `POST /:id/payment` to include `'MARKETING_MANAGER'` and `checkDailyCloseLock`:
  ```js
  router.post('/:id/payment', requireRoles('OWNER', 'ADMIN', 'ACCOUNTANT', 'MARKETING_MANAGER'), checkDailyCloseLock, settleCustomerLumpSumPayment);
  ```
- [ ] **`backend/src/routes/order.routes.js` & `backend/src/controllers/order.controller.js` (`BK-03`):**
  Add `PATCH /api/v1/orders/:id/cancel` (`requireRoles('OWNER', 'ADMIN', 'ACCOUNTANT', 'MARKETING_MANAGER'), checkDailyCloseLock, cancelOrder`) to soft-cancel `PENDING` orders (`deliveryStatus: 'CANCELLED'`), keeping `DELETE /api/v1/orders/:id` strictly for `OWNER` hard-deletion.
- [ ] **`backend/src/controllers/dailyClose.controller.js:46–52` (`BK-04`):**
  Wrap the `CounterAuditLedger` check in `if (prefix !== 'wadaana') { ... }` so Wadaana Industries is not deadlocked from closing the day.
- [ ] **`backend/src/controllers/adminDashboard.controller.js:255–261` (`BK-05`):**
  Add `tmConfirmed: Boolean(todaysDailyClose?.tmConfirmed)` to `kpis.dailyCloseStatus`.
- [ ] **`backend/src/controllers/customer.controller.js:862–896` (`BK-06`):**
  Ensure `deleteCustomer` also reverses `emptyBottlesReturned` (`debitEmptyBottlesFromFactory`) and cleans up `BottleTransaction` records when rolling back `customer.spotSales`.
- [ ] **`backend/src/controllers/analytics.controller.js:1025` (`BK-07`):**
  Include `vendorCashPaid: totalVendorCash` inside `dailySummary` so `DrawerReconciliationCard.jsx` displays the complete cash drawer equation.
- [ ] **`backend/src/routes/vendor.routes.js` & `backend/src/routes/purchase.routes.js` (`BK-08`):**
  Add `checkDailyCloseLock` to `POST /vendors/:id/payments`, `DELETE /vendors/payments/:paymentId`, and `POST /purchases/:id/payments`.

### Step 2: Mobile Viewport & Landing Page PDF/Certificate Loader Fixes (`frontend/src/...`)
- [ ] **`frontend/src/utils/pdfViewerHelper.js:34–42, 81–91` (`MOB-01`):**
  - Increase `getPdfDocument` timeout from `3000` (`3s`) to `15000` (`15s`) so mobile 4G networks don't abort certificate PDF downloads.
  - Cap mobile DPR (`Math.min(window.devicePixelRatio || 1, 2.0)` on `< 768px`) and clamp max canvas pixels (`canvas.width * canvas.height <= 16_777_216`) so mobile GPUs never render a blank/transparent `<canvas>`.
- [ ] **`frontend/src/components/common/CertificateLightboxModal.jsx` (`MOB-01`):**
  - Change `Math.max(containerWidth, 900)` on `line 90` to `Math.max(containerWidth, window.innerWidth < 640 ? 480 : 900)`.
  - Remove duplicate `style={getImageStyle()}` from the inner `<canvas>` (`line 476`) so it fills its parent wrapper cleanly (`w-full h-full object-contain`) without aspect-ratio squashing.
  - Use `100dvh` instead of `100vh` (`maxHeight: 'calc(100dvh - 180px)'`), enable native touch scrolling/pinch-zoom (`touch-action: pan-x pan-y pinch-zoom`), and hide the desktop `"Drag to pan · Double-click..."` banner on mobile (`hidden sm:block`).
- [ ] **`frontend/src/styles/landing.css` & `frontend/src/pages/LandingPage.jsx` (`MOB-02`):**
  - On `@media (max-width: 640px)`, set `.lp-showcase-visual { order: -1; }` so the bottle photo is shown at the top of `ProductShowcaseModal`, and position `.lp-showcase-nav--prev` / `.lp-showcase-nav--next` as overlay buttons on the visual area so `.lp-showcase-grid` gets 100% mobile width.
- [ ] **`frontend/src/components/ui/DateRangePicker.jsx:317` (`MOB-03`):**
  - Change the dropdown container on mobile from `absolute right-0 w-[95vw]` (which clips off the left screen edge) to a centered fixed modal on mobile (`fixed inset-x-3 top-1/2 -translate-y-1/2 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:translate-y-0 w-auto sm:w-[500px] z-50`).
- [ ] **`frontend/src/components/inventory/AddEditFinishedGoodModal.jsx:498–564` & `frontend/src/components/purchases/AddEditPurchaseModal.jsx:439–513` (`MOB-04`):**
  - Make the 12-column grids responsive on `< 640px` so quantity/price inputs never overflow their cells or overlap stock columns.
- [ ] **`frontend/src/components/layout/Sidebar.jsx:196` (`MOB-05`):**
  - Replace `h-screen` with `h-dvh` (`100dvh`) so the bottom `"Sign Out"` button is never hidden behind mobile browser navigation bars.

### Step 3: Non-Technical UX & All 6 Role Dashboards (`frontend/src/...`)
- [ ] **`frontend/src/pages/CustomerDetails.jsx:41, 435–440, 520` (`BK-02`):**
  Guard the **"Retrieve / Adjust"** bottle button with `canAdjustBottles` (`OWNER`, `ADMIN`, `PRODUCTION_MANAGER`, `MARKETING_MANAGER`).
- [ ] **`frontend/src/components/dailyClose/AccountantClose.jsx`, `AdminClose.jsx`, `OwnerClose.jsx`, & `DrawerReconciliationCard.jsx` (`BK-05` & `BK-07`):**
  - Enforce `allDepartmentsConfirmed && (isWadaana || Boolean(statusData?.auditLedger))` on the `"Finalize & Lock Day"` button in `AccountantClose.jsx` (matching `AdminClose` and `OwnerClose`).
  - Show `- Vendor Cash Paid` explicitly in `DrawerReconciliationCard.jsx` so the cash drawer equation (`+ Cash Inflow - Expenses - Vendor Cash = Expected Drawer Cash`) adds up visually for non-technical staff.
- [ ] **`frontend/src/components/counterSales/LogCounterSaleForm.jsx` (`UX-02`):**
  - Enlarge mobile `-` / `+` stepper buttons from `w-6 h-6` to `w-8 h-8 sm:w-7 sm:h-7` and stack product title/stock above rate/stepper on `< 640px`.
  - Add a sticky mobile bottom `"Cart Summary & Checkout"` bar when `cartItems.length > 0`.
- [ ] **All 6 Role Dashboards (`DASH-01` to `DASH-06`):**
  - **`OwnerDashboardView.jsx` & `AccountantDashboardView.jsx`:** Sync the chart timeframe dropdown automatically when the top page `TimeframeDropdown` changes; add Daily Close status & quick actions to `AccountantDashboardView.jsx`.
  - **`AdminDashboardView.jsx`:** Replace hardcoded `"Today's"` card/table titles with dynamic `getPeriodLabel()` based on `timeframe`, and add the missing `Transport (TM)` row to the Daily Close Checklist card.
  - **`MarketingDashboardView.jsx`:** Add `+ New Order` and `Counter Sale` quick-action buttons to the header and a `"MM Daily Close Pending"` reminder link.
  - **`ProductionKPICards.jsx` & `ProductionRecentRuns.jsx`:** Render multi-SKU batch outputs as inline badges instead of desktop-only `title` hover tooltips (`+1`), and make the `"Pending PM Verification"` badge a clickable link to `/daily-close`.
  - **`TransportDashboardView.jsx`:** Show `timeframeVehicleExpenses` as the primary KPI figure on the Transport Spend card (matching the selected timeframe) and add a `"TM Daily Close Verification"` status link.
