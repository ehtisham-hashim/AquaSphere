# AquaSphere & Wadaana ERP — Full-Stack Controller & Frontend-to-Backend Connection Audit (`694ed8a`)

**Target Commit:** `694ed8a7147241470ea6f6754f92c89f607b25f7` (`main`, post-PR #30 merge)  
**Scope:** End-to-end audit of all **21 backend route modules**, **21 backend controllers**, **6 middlewares**, **143 frontend JSX components/pages**, and **3,625 lines of `fetch()` invocations** cross-referenced against **`graphify-out/graph.json`** (`1,384` AST nodes, `4,241` edges).

---

## Executive Summary & Severity Matrix

| ID | Severity | Category | Component / Button / Feature | Backend Route & Controller | Failure Mode |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ERR-01** | **CRITICAL** | Route Param Mismatch | `POST /api/v1/items/:id/reconcile` | `item.routes.js:44` → `item.controller.js:481` (`reconcileInventory`) | Route defines `:id`, controller destructures `req.params.itemId` (`undefined`), causing a guaranteed Prisma crash / `404` on every call. |
| **ERR-02** | **CRITICAL** | Role Guard `403` | **Counter Sales → "Manage Counter Supplies" → "Add New Raw Material"** (`ACCOUNTANT`, `MARKETING_MANAGER`) | `ManageCounterSuppliesModal.jsx:126` → `POST /api/v1/items` (`item.routes.js:37`) | Modal is enabled for `ACCOUNTANT` & `MARKETING_MANAGER`, but `POST /items` only allows `OWNER`, `ADMIN`, `PRODUCTION_MANAGER` → returns `403 Forbidden`. |
| **ERR-03** | **CRITICAL** | Role Guard `403` | **"Pay Debt" / "Settle Debt" / "Pay" Button** on `MarketingDashboardView`, `CustomersTable`, `CustomerDetails`, & `Orders` (`MARKETING_MANAGER`, `TRANSPORT_MANAGER`) | `SettleCustomerDebtModal.jsx:132` → `POST /api/v1/customers/:id/payment` (`customer.routes.js:24`) | Button is rendered with no role guard, but backend only allows `OWNER`, `ADMIN`, `ACCOUNTANT` → `MARKETING_MANAGER` & `TRANSPORT_MANAGER` hit `403 Forbidden` on submit. |
| **ERR-04** | **CRITICAL** | Role Guard `403` | **Customer Profile → "Edit Customer" & "Retrieve / Adjust Bottles" Buttons** (`ACCOUNTANT`, `TRANSPORT_MANAGER`) | `CustomerDetails.jsx:39,435` → `PUT /api/v1/customers/:id` (`customer.routes.js:23`) & `POST /api/v1/bottles/transactions` (`bottle.routes.js:16`) | `CustomerDetails.jsx` shows "Edit Customer" & "Retrieve / Adjust" to `ACCOUNTANT` & `TRANSPORT_MANAGER`, but `PUT /customers/:id` (`OWNER`, `ADMIN`, `MM`) and `POST /bottles/transactions` (`OWNER`, `ADMIN`, `PM`, `MM`) reject them with `403 Forbidden`. |
| **ERR-05** | **CRITICAL** | Silent Background `403` | **Expenses → "+ Log Expense" Modal Open** (`ACCOUNTANT`) | `LogExpenseModal.jsx:48` → `GET /api/v1/vehicles` (`vehicle.routes.js:9`) | Every time `ACCOUNTANT` opens `LogExpenseModal`, it unconditionally fetches `GET /vehicles`, which only allows `OWNER`, `ADMIN`, `TRANSPORT_MANAGER` → throws `403 Forbidden` and leaves vehicle selector empty. |
| **ERR-06** | **CRITICAL** | RBAC Data Leak & Route Mismatch | **Reports & Analytics Suite (`/erp-reports` vs `/analytics`)** (`MARKETING_MANAGER`) | `Reports.jsx:18-63`, `roleAccess.js:270`, `reports.routes.js:10` → `reports.controller.js:109` | 1) `MARKETING_MANAGER` is allowed into `GET /reports/:reportType` with no per-tab guard, exposing **Profitability (P&L)**, **COGS**, **Operating Expenses**, and **Vendor Payables**. 2) Navigating to `/analytics` redirects `MARKETING_MANAGER` away because `roleAccess.js:270` only checks `/erp-reports`. |
| **ERR-07** | **HIGH** | Financial Calculation Mismatch | **Daily Close → `DrawerReconciliationCard` ("Expected in Drawer" vs Locked `expectedCash`)** (`OWNER`, `ADMIN`, `ACCOUNTANT`) | `OwnerClose.jsx:34`, `AdminClose.jsx:34`, `AccountantClose.jsx:22` vs `analytics.controller.js:1006-1008` & `dailyClose.controller.js:64-88` | Frontend computes `netCash = totalDeliveryAmount + totalSpotSales - totalExpenses` (including Bank, EasyPaisa, JazzCash, Cheque, Security Deposit, and ignoring `totalVendorCash`), whereas `closeDay` locks physical `CASH`-only minus `expenses` minus `vendorCashPaid`. |
| **ERR-08** | **HIGH** | Broken UI Feature / Dead Form | **Daily Close (`AccountantClose.jsx`)** (`ACCOUNTANT`) | `AccountantClose.jsx:10-103` vs `dailyClose.routes.js:22-31` | Backend authorizes `ACCOUNTANT` for `POST /daily-close` and `GET/POST /daily-close/counter-audit`, but `AccountantClose.jsx` renders editable `actualCash`/`notes` inputs with **no submit button** and omits `CounterAuditLedgerCard`. |
| **ERR-09** | **HIGH** | Data Corruption / Report Pollution | **Counter Sales (`WATER_REFILL`, `CUSTOM_WATER`, `EXTRA_CHARGE`)** | `spotSale.controller.js:567-588` → `reports.controller.js:206-228` | `createSpotSale` assigns `prisma.item.findFirst()` (a random item/raw material) as `targetItemId` for non-catalog lines, and `reports.controller.js` (`sales` report) aggregates all `SpotSaleItem` rows by `it.itemId` without filtering `saleType`, inflating random product sales. |
| **ERR-10** | **HIGH** | Unit / `packSize` Mismatch | **Finished Goods Inventory → "Transfer Stock" Modal (`StockTransferModal.jsx`)** | `StockTransferModal.jsx:18-57` → `POST /api/v1/items/transfer-stock` (`item.controller.js:557`) | Summary cards display stock in **Packs** (`100 Pk`), but `StockTransferModal` displays raw `factoryQty` (base bottles) with fallback label `'packs'` and sends raw `quantity` without `Packs vs Bottles` conversion, splitting inventory into fractional packs + loose bottles. |
| **ERR-11** | **MEDIUM** | File Upload Rejection (`400/500`) | **Purchases → "+ Log Purchase" Receipt Upload (`AddEditPurchaseModal.jsx`)** | `AddEditPurchaseModal.jsx:387` → `POST /api/v1/purchases/upload-receipt` (`upload.middleware.js:7`) | Frontend `<input accept="image/*,application/pdf">` invites users to select PDFs or HEIC images, which `upload.middleware.js` (`ALLOWED_MIME_TYPES`) immediately rejects. |
| **ERR-12** | **MEDIUM** | Ledger / Stock Orphan Bug | **Delete Customer (`DELETE /api/v1/customers/:id`)** (`OWNER`) | `customer.controller.js:862-866` (`deleteCustomer`) | Restores inventory and cleans up `InventoryTransaction`s for `customer.orders`, but deletes `customer.spotSales` without restoring deducted stock or deleting `refType: 'SPOT_SALE'` `InventoryTransaction` rows. |
| **ERR-13** | **MEDIUM** | Role Lockout & Destructive Fallback | **1) Raw Materials Page (`ADMIN`, `PRODUCTION_MANAGER`), 2) Transport "+ Add Vehicle" (`ADMIN`), 3) Orders "Edit" (`ADMIN`, `ACCOUNTANT`) & `DELETE /orders/:id` (`ADMIN`)** | `RawMaterials.jsx:17`, `Transport.jsx:248`, `Orders.jsx:849`, `order.routes.js:15` → `order.controller.js:658` | Frontend hides buttons from roles explicitly authorized by backend routes; and in `deleteOrder` (`order.controller.js:658`), `ADMIN` is allowed by route middleware and falls through to the `OWNER`-only permanent hard-delete branch. |
| **ERR-14** | **LOW** | Stale SWR Cache & UI Badge Bug | **1) `SSEContext.jsx` Missing Events, 2) `ProductPricing.jsx` "Save Rates" Counter** | `SSEContext.jsx:10-39`, `ProductPricing.jsx:310` | 1) `VENDOR_UPDATED` and `BOTTLE_UPDATED` are broadcast by backend but missing from `KNOWN_EVENTS` & `EVENT_CACHE_MAP` in `SSEContext.jsx`. 2) `ProductPricing.jsx:310` displays `Save Rates (${Object.keys(editedPrices).length})` instead of `dirtyItems.length`. |

---

## Detailed Findings, Graphify Blast Radius & Exact Code Fixes

---

### ERR-01: `reconcileInventory` Route Parameter Mismatch (`:id` vs `req.params.itemId`) & Role Guard Conflict

#### Graphify Blast Radius
- **AST Nodes:** `backend_src_routes_item_routes` → `backend_src_controllers_item_controller_reconcileinventory`
- **Files Affected:**
  - `backend/src/routes/item.routes.js` (Line 44)
  - `backend/src/controllers/item.controller.js` (Lines 480–486)

#### Root Cause
1. In `backend/src/routes/item.routes.js:44`, the route is registered as:
   ```javascript
   router.post('/:id/reconcile', requireRoles('OWNER'), reconcileInventory);
   ```
2. In `backend/src/controllers/item.controller.js:481`, `reconcileInventory` destructures `itemId` instead of `id`:
   ```javascript
   const { itemId } = req.params; // <-- ALWAYS undefined!
   ```
   When Prisma executes `prisma[\`${prefix}Item\`].findUnique({ where: { id: itemId } })` with `id: undefined`, Prisma throws a runtime validation crash (`500`) or `404 Item not found`.
3. Furthermore, line 483 of `item.controller.js` checks `if (!['OWNER', 'ADMIN'].includes(req.user?.role))`, whereas `item.routes.js:44` blocks `ADMIN` with `requireRoles('OWNER')`.

#### Exact Fix
In **`backend/src/controllers/item.controller.js` (Lines 480–488)**:
```javascript
export const reconcileInventory = asyncHandler(async (req, res) => {
  const itemId = req.params.id || req.params.itemId;
  const { actualPhysicalCount, location = 'FACTORY', notes } = req.body;
  const userRole = req.user?.role;

  if (!['OWNER', 'ADMIN'].includes(userRole)) {
    throw new ApiError(403, 'Only Owner or Admin can perform inventory reconciliation');
  }
```
And in **`backend/src/routes/item.routes.js` (Line 44)** (align with controller or keep `OWNER`, `ADMIN`):
```javascript
router.post('/:id/reconcile', requireRoles('OWNER', 'ADMIN'), reconcileInventory);
```

---

### ERR-02: Counter Sales `ManageCounterSuppliesModal` "Add New Raw Material" Fails with `403 Forbidden` for `ACCOUNTANT` & `MARKETING_MANAGER`

#### Graphify Blast Radius
- **AST Nodes:** `frontend_src_pages_countersales` → `frontend_src_components_countersales_managecountersuppliesmodal_managecountersuppliesmodal` → `backend_src_routes_item_routes` → `backend_src_controllers_item_controller_createitem`
- **Files Affected:**
  - `frontend/src/pages/CounterSales.jsx` (Lines 37, 294–299)
  - `frontend/src/components/counterSales/ManageCounterSuppliesModal.jsx` (Lines 120–143)
  - `backend/src/routes/item.routes.js` (Line 37)

#### Root Cause
1. In `CounterSales.jsx:37`, `canCreate = ['OWNER', 'ADMIN', 'ACCOUNTANT', 'MARKETING_MANAGER'].includes(userRole)`. All four roles see the **"Manage Counter Supplies"** button in `CounterSalesHeader.jsx:31`.
2. Inside `ManageCounterSuppliesModal.jsx`, toggling existing supplies uses `PATCH /api/v1/items/:id` (which allows `OWNER`, `ADMIN`, `PRODUCTION_MANAGER`, `MARKETING_MANAGER`, `ACCOUNTANT` on `item.routes.js:39`).
3. However, `ManageCounterSuppliesModal.jsx:120-143` also has an **"Add New Raw Material" → "Save & Enable on Counter"** form that sends `POST /api/v1/items`.
4. In `backend/src/routes/item.routes.js:37`:
   ```javascript
   router.post('/', requireRoles('OWNER', 'ADMIN', 'PRODUCTION_MANAGER'), createItem);
   ```
   When `ACCOUNTANT` or `MARKETING_MANAGER` clicks **"Save & Enable on Counter"**, the backend responds with `403 Forbidden: Insufficient privileges`.

#### Exact Fix
Either:
1. **Option A (Strict Catalog RBAC — Recommended):** Hide the "+ Add New Raw Material" creation sub-form inside `ManageCounterSuppliesModal.jsx` for roles that cannot create catalog items (`!['OWNER', 'ADMIN', 'PRODUCTION_MANAGER'].includes(user?.role)`), while keeping the toggle & counter price controls active for `ACCOUNTANT` and `MARKETING_MANAGER`.
2. **Option B (Allow Counter Supply Creation):** If `ACCOUNTANT` and `MARKETING_MANAGER` should be allowed to create counter raw materials, add `'MARKETING_MANAGER', 'ACCOUNTANT'` to `router.post('/', ...)` in `backend/src/routes/item.routes.js:37` and restrict them in `createItem` (`item.controller.js:116`) to `type === 'RAW_MATERIAL' && availableOnCounter === true`.

---

### ERR-03: "Pay Debt" / "Settle Debt" (`SettleCustomerDebtModal`) Fails with `403 Forbidden` for `MARKETING_MANAGER` & `TRANSPORT_MANAGER`

#### Graphify Blast Radius
- **AST Nodes:**
  - `frontend_src_components_dashboard_marketingdashboardview_marketingdashboardview` → `frontend_src_components_dashboard_customerriskhub_customerriskhub`
  - `frontend_src_components_customer_customerstable_customerstable`
  - `frontend_src_components_customer_customerdetails_customerdetails`
  - `frontend_src_pages_orders_orders`
  - `frontend_src_components_customer_settlecustomerdebtmodal_settlecustomerdebtmodal` → `backend_src_routes_customer_routes` (`POST /api/v1/customers/:id/payment`)
- **Files Affected:**
  - `frontend/src/components/dashboard/CustomerRiskHub.jsx` (Lines 309–317)
  - `frontend/src/components/customer/CustomersTable.jsx` (Lines 189–202)
  - `frontend/src/components/customer/CustomerDetails.jsx` (Lines 360–368)
  - `frontend/src/pages/Orders.jsx` (Lines 683–690)
  - `backend/src/routes/customer.routes.js` (Line 24)

#### Root Cause
1. In `backend/src/routes/customer.routes.js:24`:
   ```javascript
   router.post('/:id/payment', requireRoles('OWNER', 'ADMIN', 'ACCOUNTANT'), recordCustomerPayment);
   ```
   Only `OWNER`, `ADMIN`, and `ACCOUNTANT` can record a lump-sum customer debt payment (`SettleCustomerDebtModal`).
2. However, on the frontend, the **"Pay" / "Pay Debt" / "Settle Debt"** button is rendered unconditionally (with zero role check!) in four places:
   - `CustomerRiskHub.jsx:309-317` (which is mounted directly on **`MarketingDashboardView.jsx:278`**!)
   - `CustomersTable.jsx:189-202` (visible to `MARKETING_MANAGER` and `TRANSPORT_MANAGER`)
   - `CustomerDetails.jsx:360-368` (visible to `MARKETING_MANAGER` and `TRANSPORT_MANAGER`)
   - `Orders.jsx:683-690` (`Month-End Statements` tab, visible to `MARKETING_MANAGER` and `TRANSPORT_MANAGER`)
3. Note that in `order.routes.js:13-14`, `POST /orders/:id/deliver` and `POST /orders/:id/payment` allow `('OWNER', 'ADMIN', 'ACCOUNTANT', 'MARKETING_MANAGER')`, whereas `customer.routes.js:24` (`POST /customers/:id/payment`) omits `MARKETING_MANAGER` (and `TRANSPORT_MANAGER` is strictly read-only on orders/customers).

#### Exact Fix
1. **In `backend/src/routes/customer.routes.js:24`:** If `MARKETING_MANAGER` is allowed to settle customer payments (consistent with `order.routes.js:13-14`), add `'MARKETING_MANAGER'`, OR if only `OWNER`, `ADMIN`, `ACCOUNTANT` may settle debt, keep `requireRoles('OWNER', 'ADMIN', 'ACCOUNTANT')`.
2. **In `CustomerRiskHub.jsx`, `CustomersTable.jsx`, `CustomerDetails.jsx`, and `Orders.jsx`:** Gate the **"Pay Debt" / "Settle Debt" / "Pay"** button with `canSettleDebt`:
   ```javascript
   const canSettleDebt = ['OWNER', 'ADMIN', 'ACCOUNTANT'].includes(user?.role); // (+ 'MARKETING_MANAGER' if permitted)
   ```
   This guarantees `TRANSPORT_MANAGER` (and `MARKETING_MANAGER` if restricted) never sees a dead button that fails with `403`.

---

### ERR-04: `CustomerDetails.jsx` Exposes "Edit Customer" & "Retrieve / Adjust" Buttons to Roles Blocked by Backend (`403 Forbidden`)

#### Graphify Blast Radius
- **AST Nodes:**
  - `frontend_src_components_customer_customerdetails_customerdetails` → `frontend_src_components_customer_editcustomermodal_editcustomermodal` → `backend_src_controllers_customer_controller_updatecustomer`
  - `frontend_src_components_customer_customerdetails_customerdetails` → `frontend_src_components_customer_bottleadjustmentmodal_bottleadjustmentmodal` → `backend_src_routes_bottle_routes`
- **Files Affected:**
  - `frontend/src/components/customer/CustomerDetails.jsx` (Lines 39, 307–321, 434–439, 516–520)
  - `backend/src/routes/customer.routes.js` (Lines 11, 23)
  - `backend/src/routes/bottle.routes.js` (Line 16)

#### Root Cause
1. **"Edit Customer" Button (`CustomerDetails.jsx:39`):**
   ```javascript
   const canEdit = isOwner || ['MARKETING_MANAGER', 'ADMIN', 'ACCOUNTANT', 'TRANSPORT_MANAGER', 'MM'].includes(userRole);
   ```
   When `ACCOUNTANT` or `TRANSPORT_MANAGER` clicks **"Edit Customer"** and submits `EditCustomerModal`, it calls `PUT /api/v1/customers/:id` (and `POST /api/v1/customers/upload-picture` if a photo is attached).
   In `backend/src/routes/customer.routes.js:11, 23`:
   ```javascript
   router.post('/upload-picture', requireRoles('OWNER', 'ADMIN', 'MARKETING_MANAGER'), ...);
   router.put('/:id', requireRoles('OWNER', 'ADMIN', 'MARKETING_MANAGER'), updateCustomer);
   ```
   Both `ACCOUNTANT` and `TRANSPORT_MANAGER` receive **`403 Forbidden: Insufficient privileges`**.
2. **"Retrieve / Adjust" Bottle Custody Button (`CustomerDetails.jsx:434-439` & `CustomerAlerts.jsx`):**
   The **"Retrieve / Adjust"** button opens `BottleAdjustmentModal.jsx`, which submits `POST /api/v1/bottles/transactions`.
   In `backend/src/routes/bottle.routes.js:16`:
   ```javascript
   router.post('/transactions', requireRoles('OWNER', 'ADMIN', 'PRODUCTION_MANAGER', 'MARKETING_MANAGER'), recordBottleTransaction);
   ```
   When `ACCOUNTANT` or `TRANSPORT_MANAGER` clicks **"Retrieve / Adjust"** and submits, the backend rejects with **`403 Forbidden`**.

#### Exact Fix
In **`frontend/src/components/customer/CustomerDetails.jsx`**:
```javascript
const canEdit = ['OWNER', 'ADMIN', 'MARKETING_MANAGER'].includes(userRole);
const canAdjustBottles = ['OWNER', 'ADMIN', 'PRODUCTION_MANAGER', 'MARKETING_MANAGER'].includes(userRole);
```
And only render the **"Retrieve / Adjust"** button (`line 434`) and `onOpenBottleModal` in `<CustomerAlerts />` (`line 519`) when `canAdjustBottles` is `true`.

---

### ERR-05: `LogExpenseModal.jsx` Triggers `403 Forbidden` on `GET /api/v1/vehicles` Whenever `ACCOUNTANT` Opens "Log Expense"

#### Graphify Blast Radius
- **AST Nodes:** `frontend_src_components_expenses_logexpensemodal_logexpensemodal` → `backend_src_routes_vehicle_routes` → `backend_src_controllers_vehicle_controller_getvehicles`
- **Files Affected:**
  - `frontend/src/components/expenses/LogExpenseModal.jsx` (Lines 45–60)
  - `backend/src/routes/vehicle.routes.js` (Line 9)

#### Root Cause
1. `ACCOUNTANT` has full access to `/expenses` and can log expenses (`POST /api/v1/expenses` allows `OWNER`, `ADMIN`, `ACCOUNTANT`, `TRANSPORT_MANAGER`).
2. Whenever `LogExpenseModal.jsx` opens (`useEffect` at lines 45–60), it unconditionally runs:
   ```javascript
   fetch(`${API}/vehicles`, { headers: { 'x-tenant': tenant }, credentials: 'include' })
   ```
   so the user can optionally attach a vehicle to a Fuel/Repair expense.
3. However, `backend/src/routes/vehicle.routes.js:9` is:
   ```javascript
   router.get('/', requireRoles('OWNER', 'ADMIN', 'TRANSPORT_MANAGER'), getVehicles);
   ```
   `ACCOUNTANT` is missing from `GET /api/v1/vehicles`! Every time an Accountant opens `LogExpenseModal`, the browser logs a `403 Forbidden` network error and the Vehicle dropdown is empty.

#### Exact Fix
In **`backend/src/routes/vehicle.routes.js` (Line 9)**, allow `ACCOUNTANT` read access to the vehicle list so they can tag vehicle expenses:
```javascript
router.get('/', requireRoles('OWNER', 'ADMIN', 'TRANSPORT_MANAGER', 'ACCOUNTANT'), getVehicles);
```

---

### ERR-06: RBAC Financial Leak in `Reports.jsx` / `reports.controller.js` (`MARKETING_MANAGER`) & `/analytics` Route Fallback Mismatch

#### Graphify Blast Radius
- **AST Nodes:**
  - `frontend_src_app` → `frontend_src_constants_roleaccess_ispageallowedforrole`
  - `frontend_src_pages_reports` → `backend_src_routes_reports_routes` → `backend_src_controllers_reports_controller_getreportdata`
- **Files Affected:**
  - `frontend/src/constants/roleAccess.js` (Lines 268–273)
  - `frontend/src/pages/Reports.jsx` (Lines 18–28, 60–63)
  - `backend/src/controllers/reports.controller.js` (Lines 109–120)

#### Root Cause
1. **Financial Data Leak to `MARKETING_MANAGER`:**
   - Per system RBAC guardrails (enforced in `analytics.controller.js:24-75` via `sanitizeMarketingDashboardData`), `MARKETING_MANAGER` must **not** see company Net Profit, Recipe COGS, Operating Expenses, or Supplier/Vendor Payables.
   - However, in `Reports.jsx:18-28`, `ALL_REPORT_TABS` includes `profitability` (`Profitability (P&L)`), `expenses` (`Operating Expenses`), and `vendor` (`Vendor Payables`), and `availableTabs` (`lines 60-63`) only filters by `aquasphereOnly`, **never by `user?.role`**!
   - On the backend (`reports.routes.js:10` & `reports.controller.js:109`), `MARKETING_MANAGER` is permitted on `GET /api/v1/reports/:reportType` with no restriction on `reportType`. Thus `MARKETING_MANAGER` can click **Profitability (P&L)**, **Operating Expenses**, and **Vendor Payables** and view/export all sensitive financial data.
2. **`/analytics` vs `/erp-reports` Route Guard Mismatch:**
   - In `App.jsx:130-131`, both `/analytics` and `/erp-reports` mount `<Reports />`.
   - In `roleAccess.js:27`, `SIDEBAR_ROUTES.REPORTS` is `'/erp-reports'`. If `MARKETING_MANAGER` visits `/analytics`, `isPageAllowedForRole('MARKETING_MANAGER', '/analytics')` falls through to line 271 (`return role === ROLES.OWNER || role === ROLES.ADMIN || role === ROLES.ACCOUNTANT;`) and returns `false`!

#### Exact Fix
1. **In `frontend/src/constants/roleAccess.js` (Line 268):**
   ```javascript
   export function isPageAllowedForRole(role, pathname) {
     if (!role || !ROLE_ACCESS[role]) return false;
     const normalizedPath = pathname === '/analytics' ? SIDEBAR_ROUTES.REPORTS : pathname;
     if (Object.prototype.hasOwnProperty.call(ROLE_ACCESS[role], normalizedPath)) {
       return Boolean(ROLE_ACCESS[role][normalizedPath]);
     }
     return role === ROLES.OWNER || role === ROLES.ADMIN || role === ROLES.ACCOUNTANT;
   }
   ```
2. **In `frontend/src/pages/Reports.jsx` (Lines 18–28 & 60–63):**
   Add `allowedRoles` to `ALL_REPORT_TABS` and filter by `user?.role`:
   ```javascript
   const ALL_REPORT_TABS = [
     { id: 'sales', label: 'Sales & Collections', icon: TrendingUp, roles: ['OWNER', 'ADMIN', 'ACCOUNTANT', 'MARKETING_MANAGER'] },
     { id: 'marketers', label: 'Marketer Commissions', icon: Award, roles: ['OWNER', 'ADMIN', 'ACCOUNTANT', 'MARKETING_MANAGER'] },
     { id: 'credit', label: 'Customer Credit (Udhaar)', icon: Users, roles: ['OWNER', 'ADMIN', 'ACCOUNTANT', 'MARKETING_MANAGER'] },
     { id: 'profitability', label: 'Profitability (P&L)', icon: DollarSign, roles: ['OWNER', 'ACCOUNTANT'] },
     { id: 'production', label: 'Production & Scrap', icon: Settings, roles: ['OWNER', 'ADMIN', 'ACCOUNTANT'] },
     { id: 'expenses', label: 'Operating Expenses', icon: AlertCircle, roles: ['OWNER', 'ADMIN', 'ACCOUNTANT'] },
     { id: 'inventory', label: 'Inventory Health', icon: Package, roles: ['OWNER', 'ADMIN', 'ACCOUNTANT'] },
     { id: 'vendor', label: 'Vendor Payables', icon: Truck, roles: ['OWNER', 'ADMIN', 'ACCOUNTANT'] },
     { id: 'fleet', label: '19L Bottle Fleet', icon: Package, aquasphereOnly: true, roles: ['OWNER', 'ADMIN', 'ACCOUNTANT', 'MARKETING_MANAGER'] }
   ];
   ```
3. **In `backend/src/controllers/reports.controller.js` (Line 111):**
   Enforce the same role restriction server-side:
   ```javascript
   const MM_ALLOWED_REPORTS = ['sales', 'marketers', 'credit', 'fleet'];
   if (req.user?.role === 'MARKETING_MANAGER' && !MM_ALLOWED_REPORTS.includes(reportType)) {
     throw new ApiError(403, 'Access denied: Marketing Manager cannot access financial P&L, expense, or vendor reports.');
   }
   ```

---

### ERR-07: Daily Close `DrawerReconciliationCard` Expected Cash Formula Mismatch vs Backend `closeDay` & `getDailySummary`

#### Graphify Blast Radius
- **AST Nodes:**
  - `frontend_src_components_dailyclose_ownerclose_ownerclose`
  - `frontend_src_components_dailyclose_adminclose_adminclose`
  - `frontend_src_components_dailyclose_accountantclose_accountantclose`
  - `frontend_src_components_dailyclose_drawerreconciliationcard_drawerreconciliationcard`
  - `backend_src_controllers_analytics_controller_getdailysummary`
  - `backend_src_controllers_dailyclose_controller_closeday`
- **Files Affected:**
  - `frontend/src/components/dailyClose/OwnerClose.jsx` (Lines 27–39)
  - `frontend/src/components/dailyClose/AdminClose.jsx` (Lines 27–39)
  - `frontend/src/components/dailyClose/AccountantClose.jsx` (Lines 16–27)
  - `frontend/src/components/dailyClose/DrawerReconciliationCard.jsx` (Lines 23–25)
  - `backend/src/controllers/analytics.controller.js` (Lines 962–1014)
  - `backend/src/controllers/dailyClose.controller.js` (Lines 64–95)

#### Root Cause
1. In `OwnerClose.jsx:33-38`, `AdminClose.jsx:33-38`, and `AccountantClose.jsx:21-26`, the frontend maps `fetchDailySummary` (`GET /api/v1/analytics/daily-summary`) as:
   ```javascript
   setSummary({
     ordersCash: d.totalDeliveryAmount || 0,
     spotSalesCash: d.totalSpotSales || 0,
     expenses: d.totalExpenses || 0,
     netCash: (d.totalDeliveryAmount || 0) + (d.totalSpotSales || 0) - (d.totalExpenses || 0),
     ...
   });
   ```
2. **Bug A:** In `analytics.controller.js:962-1008` (`getDailySummary`), `totalDeliveryAmount` and `totalSpotSales` sum **ALL payment methods** (`CASH`, `BANK_TRANSFER`, `EASYPAISA`, `JAZZCASH`, `CHEQUE`, `SECURITY_DEPOSIT`), NOT physical cash! Furthermore, the frontend ignores `d.totalVendorCash` and `d.netCash`.
3. **Bug B:** When the user clicks **"Finalize & Lock Day"**, `closeDay` in `backend/src/controllers/dailyClose.controller.js:64-88` computes `expectedCash` using **ONLY physical `CASH` payments** (`type: 'CASH'` / `paymentMethod: 'CASH'`) minus `totalExpenses` minus `vendorCashPaid`!
4. Consequently, if any customer paid via Bank Transfer, EasyPaisa, JazzCash, or Security Deposit, or if any vendor was paid in cash:
   - Before locking, `DrawerReconciliationCard` displays a **wrong `Expected in Drawer`** (inflated by digital transfers and unadjusted for vendor cash).
   - The user types their physical cash count to match what they see or what's in the drawer, and upon clicking **"Finalize & Lock Day"**, the backend computes a completely different `expectedCash` and records a false **Shortage / Overage variance**!

#### Exact Fix
1. **In `backend/src/controllers/analytics.controller.js` (`getDailySummary`, Lines 962–1014):**
   Compute physical `CASH`-only totals alongside total collections so `getDailySummary` matches `closeDay` 1-to-1:
   ```javascript
   const ordersCashOnly = payments
     .filter(p => (p.type || 'CASH').toUpperCase() === 'CASH')
     .reduce((sum, p) => sum + Number(p.amount || 0), 0);

   const spotSalesCashOnly = spotSales
     .filter(s => (s.paymentMethod || 'CASH').toUpperCase() === 'CASH')
     .reduce((sum, s) => sum + Number(s.amountPaid !== undefined && s.amountPaid !== null ? s.amountPaid : s.cashCollected || 0), 0);

   const expectedDrawerCash = (ordersCashOnly + spotSalesCashOnly) - totalExpenses - totalVendorCash;
   ```
   Return `ordersCashOnly`, `spotSalesCashOnly`, `totalVendorCash`, and `expectedDrawerCash` in `getDailySummary`.
2. **In `OwnerClose.jsx`, `AdminClose.jsx`, and `AccountantClose.jsx`:**
   Use `d.ordersCashOnly ?? d.totalDeliveryAmount`, `d.spotSalesCashOnly ?? d.totalSpotSales`, `d.totalVendorCash || 0`, and `d.expectedDrawerCash ?? d.netCash` so the pre-close `DrawerReconciliationCard` matches the post-close locked `expectedCash` to the exact Rupee.

---

### ERR-08: `AccountantClose.jsx` Renders Editable Inputs with No Submit Action & Omits `CounterAuditLedgerCard`

#### Graphify Blast Radius
- **AST Nodes:** `frontend_src_components_dailyclose_accountantclose_accountantclose` → `backend_src_routes_dailyclose_routes`
- **Files Affected:**
  - `frontend/src/components/dailyClose/AccountantClose.jsx` (Lines 10–103)
  - `backend/src/routes/dailyClose.routes.js` (Lines 22–31)

#### Root Cause
1. In `backend/src/routes/dailyClose.routes.js:22-31`, `ACCOUNTANT` is explicitly authorized for:
   - `GET /api/v1/daily-close/counter-audit` (`requireRoles('OWNER', 'ADMIN', 'ACCOUNTANT', 'MARKETING_MANAGER')`)
   - `POST /api/v1/daily-close/counter-audit` (`requireRoles('OWNER', 'ADMIN', 'ACCOUNTANT', 'MARKETING_MANAGER')`)
   - `POST /api/v1/daily-close` (`closeDay`, `requireRoles('OWNER', 'ADMIN', 'ACCOUNTANT')`)
2. Yet in `frontend/src/components/dailyClose/AccountantClose.jsx`:
   - It renders `<DrawerReconciliationCard>` with editable `actualCash` and `notes` inputs (`disabled={isClosed}`), **but has no submit button or `submitClose` handler** — anything the Accountant types into `actualCash` or `notes` is completely dead!
   - It also omits `<CounterAuditLedgerCard selectedDate={selectedDate} isClosed={isClosed} />`, preventing the Accountant from viewing or verifying the physical counter bottle audit on `/daily-close`.

#### Exact Fix
In **`frontend/src/components/dailyClose/AccountantClose.jsx`**:
1. Import and render `<CounterAuditLedgerCard selectedDate={selectedDate} isClosed={isClosed} />` (matching `AdminClose.jsx:103`).
2. Either wire up the **"Finalize & Lock Day"** button using `submitClose` from `useDailyClose(selectedDate)` (since `dailyClose.routes.js:31` explicitly authorizes `ACCOUNTANT`), or pass `disabled={true}` to `DrawerReconciliationCard` if Accountant is intended to be view-only on cash lock.

---

### ERR-09: `createSpotSale` Assigns Arbitrary `findFirst` Fallback Item to `WATER_REFILL` / `CUSTOM_WATER` / `EXTRA_CHARGE`, Corrupting the Sales Report

#### Graphify Blast Radius
- **AST Nodes:** `backend_src_controllers_spotsale_controller_createspotsale` → `backend_src_controllers_reports_controller_getreportdata`
- **Files Affected:**
  - `backend/src/controllers/spotSale.controller.js` (Lines 567–588)
  - `backend/src/controllers/reports.controller.js` (Lines 206–228)

#### Root Cause
1. In `backend/src/controllers/spotSale.controller.js:567-588`, because `SpotSaleItem.itemId` is a required foreign key in Prisma, when a counter sale includes `WATER_REFILL`, `CUSTOM_WATER`, or `EXTRA_CHARGE` without a catalog `itemId`, lines 570–575 run:
   ```javascript
   if (!genericFallbackItem) {
     genericFallbackItem = await tx[`${prefix}Item`].findFirst({
       where: { archivedAt: null }
     });
   }
   targetItemId = genericFallbackItem?.id;
   ```
   `findFirst({ where: { archivedAt: null } })` with no `type` filter returns whichever row happens to be first in the table (often a `RAW_MATERIAL` like `0.5L Preform` or a random finished good).
2. Then in `backend/src/controllers/reports.controller.js:206-228` (`sales` report → **"Sales Volume by Finished Good"** card on `Reports.jsx:387-409`), the controller iterates over `spotSales`:
   ```javascript
   spotSales.forEach(s => {
     s.items.forEach(it => {
       const pid = it.itemId;
       ...
       productSalesMap.get(pid).qtySold += q;
       productSalesMap.get(pid).billedRevenue += rev;
     });
   });
   ```
   Because it does **not** check `it.saleType`, every `WATER_REFILL` (where `it.itemId` is `19L Refill Bottle`), `CUSTOM_WATER` (where `it.quantity` is Litres!), and `EXTRA_CHARGE` gets added into `productSalesMap` under `it.itemId`! For example, selling 50 Litres of `CUSTOM_WATER` adds `+50` units to whichever item `findFirst` picked!

#### Exact Fix
1. **In `backend/src/controllers/reports.controller.js` (Lines 206–228):**
   Skip `EXTRA_CHARGE` and separate `WATER_REFILL` / `CUSTOM_WATER` from physical bottle sales in `productSalesMap`:
   ```javascript
   spotSales.forEach(s => {
     s.items.forEach(it => {
       const st = String(it.saleType || 'UNIT').toUpperCase();
       if (st === 'EXTRA_CHARGE') return;
       if (st === 'CUSTOM_WATER' || st === 'WATER_REFILL') {
         const waterKey = `__COUNTER_${st}__`;
         if (!productSalesMap.has(waterKey)) {
           productSalesMap.set(waterKey, {
             itemId: waterKey,
             name: st === 'WATER_REFILL' ? '19L Water Refill (Counter)' : 'Custom Loose Water (Litres)',
             unit: st === 'WATER_REFILL' ? 'refill' : 'Litre',
             packSize: 1,
             qtySold: 0,
             billedRevenue: 0
           });
         }
         const entry = productSalesMap.get(waterKey);
         entry.qtySold += Number(it.quantity || 0);
         entry.billedRevenue += Number(it.totalPrice || (Number(it.quantity || 0) * Number(it.unitPrice || 0)));
         return;
       }
       // Existing physical product logic...
   ```

---

### ERR-10: `StockTransferModal.jsx` Transfers Base Bottles Instead of Packs While Displaying Misleading Unit Labels

#### Graphify Blast Radius
- **AST Nodes:** `frontend_src_pages_inventory` → `frontend_src_components_inventory_stocktransfermodal_stocktransfermodal` → `backend_src_controllers_item_controller_transferstock`
- **Files Affected:**
  - `frontend/src/components/inventory/StockTransferModal.jsx` (Lines 18–57, 137–159)

#### Root Cause
1. In the database, `factoryQty`, `warehouseQty`, and `cachedQty` for finished goods are stored in **base bottles** (e.g., `1200` bottles = `100` packs of 12 for `0.5L PET`).
2. `FinishedGoodsSummaryCards.jsx` displays `100 Packs` (`Factory: 100 Pk | Warehouse: 0 Pk`).
3. However, when the user opens `StockTransferModal.jsx`, it displays raw `availableAtSource` (`1,200 bottle`) with no pack breakdown, and when the user types `40` (intending 40 Packs), it sends `quantity: 40` (40 individual bottles = `3 Pk + 4 loose btl`) to `POST /api/v1/items/transfer-stock`.

#### Exact Fix
In **`frontend/src/components/inventory/StockTransferModal.jsx`**, add a `transferUnit` toggle (`'PACK'` vs `'BOTTLE'` when `packSize > 1`, defaulting to `'PACK'`) just like `AddEditFinishedGoodModal.jsx`:
```javascript
const packSize = Math.max(1, Number(selectedItem?.packSize || 1));
const isPackItem = packSize > 1;
const effectiveTransferMultiplier = (isPackItem && transferMode === 'PACK') ? packSize : 1;
const baseQtyToTransfer = (parseFloat(quantity) || 0) * effectiveTransferMultiplier;
```
Validate `baseQtyToTransfer <= availableAtSource` and send `quantity: baseQtyToTransfer` in the `POST /items/transfer-stock` body.

---

### ERR-11: `AddEditPurchaseModal.jsx` File Input Accepts `application/pdf`, Which Backend `upload.middleware.js` Rejects

#### Graphify Blast Radius
- **AST Nodes:** `frontend_src_components_purchases_addeditpurchasemodal_addeditpurchasemodal` → `backend_src_routes_purchase_routes` → `backend_src_middlewares_upload_middleware_filefilter`
- **Files Affected:**
  - `frontend/src/components/purchases/AddEditPurchaseModal.jsx` (Lines 130–145, 387)
  - `backend/src/middlewares/upload.middleware.js` (Lines 7–15)

#### Root Cause
In `AddEditPurchaseModal.jsx:387`:
```jsx
<input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleUploadReceipt} />
```
And `handleUploadReceipt` (`lines 130-145`) does not validate `file.type` before uploading. When the user selects a `.pdf` (or `.heic`) file, `POST /api/v1/purchases/upload-receipt` hits `upload.middleware.js:7` (`ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']`) and fails with `Invalid file type. Only JPEG, JPG, PNG, and WEBP images are accepted.`

#### Exact Fix
In **`frontend/src/components/purchases/AddEditPurchaseModal.jsx` (Lines 130–145 & 387)**, match `VendorPaymentModal.jsx:139-144, 376`:
```jsx
<input
  type="file"
  accept="image/jpeg,image/jpg,image/png,image/webp"
  className="hidden"
  onChange={handleUploadReceipt}
/>
```
And add the client-side MIME check in `handleUploadReceipt` before sending the `FormData`.

---

### ERR-12: `deleteCustomer` (`customer.controller.js`) Deletes Customer `SpotSale`s Without Restoring Stock or Cleaning Up `InventoryTransaction`s

#### Graphify Blast Radius
- **AST Nodes:** `backend_src_controllers_customer_controller_deletecustomer`
- **Files Affected:**
  - `backend/src/controllers/customer.controller.js` (Lines 790–875)

#### Root Cause
When `OWNER` permanently deletes a customer (`DELETE /api/v1/customers/:id`), `deleteCustomer` (`customer.controller.js:808-854`) reverses inventory deductions and deletes `InventoryTransaction` rows for all delivered `customer.orders`. However, for `customer.spotSales` (`lines 862-866`), it simply runs:
```javascript
if (spotSaleIds.length > 0) {
  await tx[`${prefix}SpotSaleItem`].deleteMany({ where: { spotSaleId: { in: spotSaleIds } } });
  await tx[`${prefix}SpotSale`].deleteMany({ where: { id: { in: spotSaleIds } } });
}
```
It never restores the finished-goods/raw-material stock deducted by those counter sales, and leaves orphaned `InventoryTransaction` rows (`refType: 'SPOT_SALE', refId: { in: spotSaleIds }`) in the database.

#### Exact Fix
In **`backend/src/controllers/customer.controller.js` (Lines 862–866)**, before deleting `SpotSaleItem` and `SpotSale`, query `tx[\`${prefix}InventoryTransaction\`].findMany({ where: { refType: 'SPOT_SALE', refId: { in: spotSaleIds } } })`, reverse each `OUT` / `IN` stock delta on `Item` (`factoryQty` / `warehouseQty` / `cachedQty`), and delete those `InventoryTransaction` rows.

---

### ERR-13: Role Guard Discrepancies Across `RawMaterials.jsx`, `Transport.jsx`, `Orders.jsx`, and `order.controller.js` (`deleteOrder`)

#### Graphify Blast Radius
- **AST Nodes:**
  - `frontend_src_pages_rawmaterials_rawmaterials`
  - `frontend_src_pages_transport`
  - `frontend_src_pages_orders` → `backend_src_controllers_order_controller_deleteorder`
- **Files Affected:**
  - `frontend/src/pages/RawMaterials.jsx` (Lines 16–19)
  - `frontend/src/pages/Transport.jsx` (Line 248)
  - `frontend/src/pages/Orders.jsx` (Lines 849, 866)
  - `backend/src/routes/order.routes.js` (Line 15) & `backend/src/controllers/order.controller.js` (Lines 658–680)

#### Root Cause & Exact Fixes
1. **`RawMaterials.jsx:16-19` Lockout for `ADMIN` & `PRODUCTION_MANAGER`:**
   - Backend `item.routes.js:37-39` allows `OWNER`, `ADMIN`, `PRODUCTION_MANAGER` to create and edit items (`POST /items`, `PUT /items/:id`), and `Inventory.jsx:23` sets `canAddFinishedGood = isOwner || user?.role === 'ADMIN' || user?.role === 'PRODUCTION_MANAGER'`.
   - Yet `RawMaterials.jsx:16-18` sets `const isOwner = user?.role === 'OWNER'; const canEditMaterial = isOwner;`, locking `ADMIN` and `PRODUCTION_MANAGER` into read-only mode on `/raw-materials`.
   - **Fix in `RawMaterials.jsx:17`:**
     ```javascript
     const canEditMaterial = ['OWNER', 'ADMIN', 'PRODUCTION_MANAGER'].includes(user?.role);
     ```
2. **`Transport.jsx:248` Hides "+ Add Vehicle" Button from `ADMIN`:**
   - `CarsTable.jsx:18` (`['OWNER', 'ADMIN', 'TRANSPORT_MANAGER']`) and `vehicle.routes.js:10-11` (`requireRoles('OWNER', 'ADMIN', 'TRANSPORT_MANAGER')`) allow `ADMIN` to add and edit vehicles, but `Transport.jsx:248` sets `const canManageCars = user?.role === 'TRANSPORT_MANAGER' || user?.role === 'OWNER';`.
   - **Fix in `Transport.jsx:248`:**
     ```javascript
     const canManageCars = ['OWNER', 'ADMIN', 'TRANSPORT_MANAGER'].includes(user?.role);
     ```
3. **`Orders.jsx:849` Hides "Edit" Order Button from `ADMIN` & `ACCOUNTANT`, and `order.controller.js:658` Allows `ADMIN` to Trigger Permanent Hard-Delete:**
   - `order.routes.js:12` allows `OWNER`, `ADMIN`, `ACCOUNTANT`, `MARKETING_MANAGER` to `PUT /orders/:id`, but `Orders.jsx:849` only shows the `Edit` button to `(isOwner || isMarketingManager)`.
   - In `order.routes.js:15`, `DELETE /orders/:id` allows `('OWNER', 'ADMIN', 'MARKETING_MANAGER')`. In `order.controller.js:658`, `deleteOrder` checks `if (userRole === 'MARKETING_MANAGER') { /* soft cancel */ }` and then falls straight into the `OWNER` permanent database delete block! If `ADMIN` calls `DELETE /orders/:id`, it permanently deletes the order instead of soft-cancelling it.
   - **Fix in `backend/src/controllers/order.controller.js:658`:**
     ```javascript
     if (userRole !== 'OWNER') {
       // Non-owner roles (MARKETING_MANAGER, ADMIN) can only soft-cancel pending orders
     ```

---

### ERR-14: `SSEContext.jsx` Missing `VENDOR_UPDATED` & `BOTTLE_UPDATED` Cache Invalidation + `ProductPricing.jsx` Button Counter Bug

#### Graphify Blast Radius
- **AST Nodes:** `frontend_src_context_ssecontext`, `frontend_src_pages_productpricing_productpricing`
- **Files Affected:**
  - `frontend/src/context/SSEContext.jsx` (Lines 10–39)
  - `frontend/src/pages/ProductPricing.jsx` (Line 310)

#### Root Cause & Exact Fixes
1. **`SSEContext.jsx` Missing Events:**
   - Backend controllers (`vendor.controller.js`, `purchase.controller.js`, `bottle.controller.js`) emit `'VENDOR_UPDATED'` and `'BOTTLE_UPDATED'` over SSE.
   - However, `SSEContext.jsx:10-39` omits both from `EVENT_CACHE_MAP` and `KNOWN_EVENTS`, so `apiCache.js` is not invalidated when unmounted components miss those events.
   - **Fix in `frontend/src/context/SSEContext.jsx`:**
     Add `'VENDOR_UPDATED': ['vendors', 'purchases', 'analytics', 'reports']` and `'BOTTLE_UPDATED': ['bottles', 'customers', 'inventory', 'items', 'analytics']` to `EVENT_CACHE_MAP`, and add `'VENDOR_UPDATED'`, `'BOTTLE_UPDATED'` to `KNOWN_EVENTS`.
2. **`ProductPricing.jsx:310` Button Label Shows Total Items Instead of Modified Items:**
   - Line 310 renders:
     ```jsx
     <span>{savingAll ? 'Saving...' : `Save Rates (${Object.keys(editedPrices).length})`}</span>
     ```
     Because `editedPrices` is initialized with all items on load (`lines 103-107`), `Object.keys(editedPrices).length` always equals `items.length` (e.g., `Save Rates (5)` even when 0 items were modified).
   - **Fix in `frontend/src/pages/ProductPricing.jsx:310`:**
     ```jsx
     <span>{savingAll ? 'Saving...' : `Save Rates (${dirtyItems.length})`}</span>
     ```

---

## Verification Checklist for Antigravity

- [ ] **Step 1 (`item.controller.js` & `item.routes.js`):** Fix `const itemId = req.params.id || req.params.itemId;` in `reconcileInventory` (`ERR-01`) and align `ManageCounterSuppliesModal.jsx` raw material creation role guard (`ERR-02`).
- [ ] **Step 2 (`CustomerRiskHub.jsx`, `CustomersTable.jsx`, `CustomerDetails.jsx`, `Orders.jsx`, `vehicle.routes.js`):** Align role guards on `SettleCustomerDebtModal` (`ERR-03`), `EditCustomerModal` / `BottleAdjustmentModal` (`ERR-04`), and add `'ACCOUNTANT'` to `GET /api/v1/vehicles` (`ERR-05`).
- [ ] **Step 3 (`Reports.jsx`, `reports.controller.js`, `roleAccess.js`):** Filter `ALL_REPORT_TABS` by role, block `MARKETING_MANAGER` from `profitability`, `expenses`, and `vendor` report endpoints, and normalize `/analytics` in `isPageAllowedForRole` (`ERR-06`).
- [ ] **Step 4 (`analytics.controller.js`, `OwnerClose.jsx`, `AdminClose.jsx`, `AccountantClose.jsx`):** Return physical `CASH`-only drawer figures in `getDailySummary` to match `closeDay` (`ERR-07`) and add `<CounterAuditLedgerCard />` + submit/read-only alignment in `AccountantClose.jsx` (`ERR-08`).
- [ ] **Step 5 (`reports.controller.js`, `StockTransferModal.jsx`, `AddEditPurchaseModal.jsx`, `customer.controller.js`):** Separate `WATER_REFILL`/`CUSTOM_WATER`/`EXTRA_CHARGE` in the Sales Report (`ERR-09`), add `PACK` vs `BOTTLE` mode to `StockTransferModal.jsx` (`ERR-10`), remove `application/pdf` from `AddEditPurchaseModal.jsx` (`ERR-11`), and reverse `SpotSale` stock in `deleteCustomer` (`ERR-12`).
- [ ] **Step 6 (`RawMaterials.jsx`, `Transport.jsx`, `order.controller.js`, `SSEContext.jsx`, `ProductPricing.jsx`):** Apply role button fixes (`ERR-13`) and SSE cache / dirty counter fixes (`ERR-14`), then run `npm run lint` and `npm run build` in `frontend/`.
