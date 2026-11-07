# Full-Stack UI/UX, Logical, Security & Performance Hardening Plan (V2 — Corrected & Verified)

## Goal Description
Implement all remaining security hardening, role-based access control, business logic edge-cases, and UI/UX quality improvements, while **fixing the subtle cache, mobile drawer contention, and lint flaws discovered in Commit `e56d134` and the V1 Plan**.

---

## Critique of V1 Plan & Decisions (Why V2 Was Needed)

1. **Decision #1 (Preserving Phase 1 & 2 Cache Architecture) — Right Goal, 2 Bugs in `e56d134` Fixed in V2**:
   - **Empty-Array Spinner Bug (`cached.data.length > 0`)**: In commit `e56d134`, `Expenses.jsx`, `Orders.jsx`, `Customers.jsx`, `Production.jsx`, `Inventory.jsx`, and `Vendors.jsx` initialize `loading` using `!(cached?.success && Array.isArray(cached.data) && cached.data.length > 0)`. If a tenant legitimately has `0` records (`cached.data = []`), `cached.data.length > 0` is `false`, forcing `loading = true` and flashing a spinner on every visit! V2 changes this check to `!(cached?.success && Array.isArray(cached.data))`.
   - **Mobile Drawer Network Stampede (`Sidebar.jsx:L148`)**: In commit `e56d134`, opening the mobile drawer (`isOpen === true`) calls `safePrefetch(item.path, tenant)` for all allowed links at once, firing **6 simultaneous full-table API requests** (`/orders`, `/customers`, `/production`, `/inventory`, `/vendors`, `/expenses`) over mobile 4G at the same time as JS chunk downloads. V2 splits `safePrefetch(path, currentTenant, warmApi = true)` so opening the drawer (`isOpen`) only preloads JS chunks (`warmApi = false`), while touching/hovering a specific link (`onTouchStart`, `onPointerDown`, `onMouseEnter`) warms that route's API endpoint only if not already cached.

2. **Decision #2 (Analytics RBAC & `Dashboard.jsx` Guard) — Expanded to Save 20+ Wasted Queries for `ADMIN` & `ACCOUNTANT`**:
   - V1 only skipped `/analytics/dashboard` for `PRODUCTION_MANAGER` and `TRANSPORT_MANAGER`. However, `AdminDashboardView.jsx` takes **zero props** (it fetches `/admin/dashboard`, `/admin/cash-summary`, and `/admin/customer-alerts`), and `AccountantDashboardView.jsx` ignores `summary` (`/analytics/purchasing-summary`). V2 guards `fetchDashboard` to run only for `['OWNER', 'ACCOUNTANT', 'MARKETING_MANAGER']` and `fetchSummary` to run only for `['OWNER']`.

3. **Decision #3 (`DeleteConfirmationModal` `variant` Prop) — Added 2 Missed `confirm()` Calls**:
   - V1 listed `Customers.jsx`, `CustomerDetails.jsx`, and `RawMaterials.jsx`, but missed `Vendors.jsx:L177` (archive/restore vendor) and `CounterSales.jsx:L153` (delete counter sale). V2 replaces all 5 native `confirm()` / `window.confirm()` dialogs.

4. **Decision #4 (Remove Dead 2FA SVG in `Login.jsx`) — Fixed ESLint Breakage**:
   - Removing the `isVerifiedEffect` SVG modal block in `Login.jsx` without removing `CheckCircle2` from `import { ... } from 'lucide-react'` on Line 4 breaks `npm run lint` (`no-unused-vars`). V2 removes `CheckCircle2` from Line 4 as well.

5. **3 Additional Technical Bugs Caught in V1 Plan**:
   - **Missing `'Maintenance'` in `frontend/src/constants/expenses.js`**: V1 added `'Maintenance'` to `expense.controller.js` and `Transport.jsx`, but forgot to add `'Maintenance'` to `TRANSPORT_EXPENSE_CATEGORIES` in `frontend/src/constants/expenses.js:L19` (which feeds `LogExpenseModal.jsx` and `Transport.jsx`'s filter pills!).
   - **`authLimiter` Shared Office Wi-Fi Lockout**: V1 used a flat `max: 15` per IP on `/login` without `skipSuccessfulRequests: true`. Since all 6 factory roles across both companies share one office Wi-Fi IP, 15 successful logins/switches in 15 minutes would lock out the plant. V2 adds `skipSuccessfulRequests: true` so only failed attempts count.
   - **Trailing `?` Cache Key Mismatch in `Purchases.jsx`**: `Purchases.jsx:L60` calls `fetch('${API}/purchases?${qParams.toString()}')`, which produces `"/api/v1/purchases?"` (with a trailing `?`) when filters are empty, causing `peekCachedData('${API}/purchases')` to miss! V2 normalizes the URL when `qParams.toString()` is empty.

---

## Proposed Changes

### Component 1: Backend Security Hardening

#### [MODIFY] `backend/src/routes/events.routes.js`
- Mount `verifyJWT` before the SSE stream routes:
```javascript
import { Router } from 'express';
import { streamEvents } from '../utils/sseBus.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();
router.use(verifyJWT);

router.get('/stream', streamEvents);
router.get('/', streamEvents);

export default router;
```

#### [MODIFY] `backend/src/controllers/auth.controller.js`
- In `login` (L97) and `resendOwnerOtp` (L216), remove `: ${otp}` from stdout log statements:
```javascript
console.log(`[2FA OTP] Code generated and sent to Owner (${recipients.join(', ')})`);
// and in resendOwnerOtp:
console.log(`[2FA OTP Resend] Code generated and sent to Owner (${recipients.join(', ')})`);
```

#### [MODIFY] `backend/src/routes/auth.routes.js`
- Apply `authLimiter` (`max: 20, skipSuccessfulRequests: true` so shared office Wi-Fi logins are never throttled, only failed password/OTP attempts) and `otpResendLimiter` (`max: 5`):
```javascript
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  skipSuccessfulRequests: true,
  message: { success: false, message: 'Too many failed authentication attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

const otpResendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many OTP resend requests. Please wait before requesting another code.' },
  standardHeaders: true,
  legacyHeaders: false
});

router.post('/login', authLimiter, login);
router.post('/verify-owner-otp', authLimiter, verifyOwnerOtp);
router.post('/resend-owner-otp', otpResendLimiter, resendOwnerOtp);
```

#### [MODIFY] `backend/src/routes/analytics.routes.js`
- Import `requireRoles` and enforce role guards per route:
```javascript
import { Router } from 'express';
import { getDashboardAnalytics, streamDashboardAnalytics, getPurchasingSummary, getProductionDashboard, getDailySummary, getBottleCustody, getProductionLoss } from '../controllers/analytics.controller.js';
import { getMMAlerts } from '../controllers/alerts.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';

const router = Router();
router.use(verifyJWT);

router.get('/dashboard', requireRoles('OWNER', 'ADMIN', 'ACCOUNTANT', 'MARKETING_MANAGER'), getDashboardAnalytics);
router.get('/dashboard/stream', requireRoles('OWNER', 'ADMIN', 'ACCOUNTANT', 'MARKETING_MANAGER'), streamDashboardAnalytics);
router.get('/purchasing-summary', requireRoles('OWNER', 'ADMIN', 'ACCOUNTANT'), getPurchasingSummary);
router.get('/daily-summary', requireRoles('OWNER', 'ADMIN', 'ACCOUNTANT'), getDailySummary);
router.get('/production-dashboard', requireRoles('OWNER', 'ADMIN', 'PRODUCTION_MANAGER', 'ACCOUNTANT'), getProductionDashboard);
router.get('/production-loss', requireRoles('OWNER', 'ADMIN', 'PRODUCTION_MANAGER', 'ACCOUNTANT'), getProductionLoss);
router.get('/bottle-custody', requireRoles('OWNER', 'ADMIN', 'ACCOUNTANT', 'MARKETING_MANAGER'), getBottleCustody);
router.get('/mm-alerts', requireRoles('OWNER', 'ADMIN', 'ACCOUNTANT', 'MARKETING_MANAGER'), getMMAlerts);

export default router;
```

#### [MODIFY] `backend/src/routes/landingPage.routes.js`
- Add `contactLimiter` (`max: 5` per 15 minutes) on `POST /contact`.

#### [MODIFY] `backend/src/index.js`
- Enforce explicit 2MB body limit on `express.json({ limit: '2mb' })` (L85).

#### [MODIFY] `backend/src/routes/adminDashboard.routes.js`
- Change `router.all('/sync-shrink-wrap', syncShrinkWrap)` to `router.post('/sync-shrink-wrap', syncShrinkWrap)` (L29).

---

### Component 2: Cache Hydration Correctness, Mobile Drawer Contention & Business Logic

#### [MODIFY] `Expenses.jsx`, `Orders.jsx`, `Customers.jsx`, `Production.jsx`, `Inventory.jsx`, `Vendors.jsx`
- Fix empty-array cache hydration check: replace `!(cached?.success && Array.isArray(cached.data) && cached.data.length > 0)` with `!(cached?.success && Array.isArray(cached.data))`, and initialize `hasLoadedRef` from `Boolean(cached?.success && Array.isArray(cached.data))` so tenants with `0` records do not flash loading spinners on every route switch.
- In `Vendors.jsx:L83`: change `useLiveEvent(['PURCHASE_CREATED', 'EXPENSE_LOGGED', 'VENDOR_UPDATED'], fetchVendors)` to `useLiveEvent(['PURCHASE_CREATED', 'EXPENSE_LOGGED', 'VENDOR_UPDATED'], () => fetchVendors(true))`.

#### [MODIFY] `frontend/src/components/layout/Sidebar.jsx`
- Import `peekCachedData` from `../../utils/apiCache`.
- Update `safePrefetch(path, currentTenant, warmApi = true)` so `API_WARM_MAP` (including `'/purchases': '${API_URL}/purchases'`) only fires when `warmApi === true` and `!peekCachedData(warmUrl, { headers: { 'x-tenant': currentTenant } })`.
- In the `isOpen` `useEffect` (L148), call `safePrefetch(item.path, tenant, false)` so opening the mobile menu drawer preloads JS chunks without triggering a 6-request API stampede.

#### [MODIFY] `frontend/src/constants/expenses.js`, `backend/src/controllers/expense.controller.js`, `frontend/src/pages/Transport.jsx`, `frontend/src/components/expenses/ExpensesHeader.jsx`
- In `frontend/src/constants/expenses.js:L19`: add `'Maintenance'` to `TRANSPORT_EXPENSE_CATEGORIES`:
  ```javascript
  export const TRANSPORT_EXPENSE_CATEGORIES = [
    'Fuel / Transport',
    'Vehicle Repairs',
    'Maintenance'
  ];
  ```
- In `backend/src/controllers/expense.controller.js:L306`: add `'Maintenance'` to `TM_ALLOWED_CATEGORIES` in `createExpense`.
- In `frontend/src/pages/Transport.jsx`:
  - Hydrate `vehicles` (`${API_URL}/vehicles`) and `expenses` (`${API_URL}/expenses?limit=500`) using `peekCachedData`, and fetch `${API_URL}/expenses?limit=500` in `fetchExpenses` (L146).
  - Update `transportExpenses` memo (L170) to include `'Maintenance'` and `Boolean(ex.vehicleId)`:
    ```javascript
    const transportExpenses = useMemo(() => {
      const TRANSPORT_CATS = ['Fuel / Transport', 'Fuel', 'Vehicle Repairs', 'Vehicle Repair', 'Maintenance'];
      return expenses.filter(ex => TRANSPORT_CATS.includes(ex.category) || Boolean(ex.vehicleId));
    }, [expenses]);
    ```
  - Make `handleExportCSV` (L211) null-safe: `String(ex?.category || ex?.type || 'MISC').replace(/"/g, '""')`.
- In `frontend/src/components/expenses/ExpensesHeader.jsx:L23`: include `'TRANSPORT_MANAGER'` in `canLogExpense`.

#### [MODIFY] `frontend/src/components/transport/CarsTable.jsx`
- Allow `OWNER` and `ADMIN` alongside `TRANSPORT_MANAGER` (L19):
  ```javascript
  const canManage = ['OWNER', 'ADMIN', 'TRANSPORT_MANAGER'].includes(user?.role);
  ```

#### [MODIFY] `frontend/src/pages/Users.jsx`
- Add `toast` notifications and `if (!res.ok || !json.success)` error handling in `submitUser` and `toggleStatus`.

#### [MODIFY] `frontend/src/pages/Dashboard.jsx`
- Guard `fetchDashboard` to run only for `['OWNER', 'ACCOUNTANT', 'MARKETING_MANAGER']`, and guard `fetchSummary` to run only for `user?.role === 'OWNER'`.

#### [MODIFY] `frontend/src/components/dashboard/AccountantDashboardView.jsx` & `frontend/src/components/orders/AddOrderModal.jsx`
- Add explicit `headers: { 'x-tenant': tenant }` (and `activeTenant` in `AddOrderModal.jsx:L60`).

---

### Component 3: UI/UX Polish, Non-Blocking Modals & Render Optimization

#### [MODIFY] `frontend/src/components/ui/DeleteConfirmationModal.jsx`
- Add `variant = 'danger'` prop (`'danger' | 'primary'`). Render emerald/brand badge + `CheckCircle2` icon + `btn-primary` button when `variant === 'primary'`.

#### [MODIFY] `Customers.jsx`, `CustomerDetails.jsx`, `RawMaterials.jsx`, `Vendors.jsx`, `CounterSales.jsx`
- Replace all 5 native `confirm()` / `window.confirm()` calls with `<DeleteConfirmationModal />` (`variant="primary"` for restore actions, `variant="danger"` for archive/delete actions).

#### [MODIFY] `frontend/src/pages/Login.jsx`
- Remove the dead 2FA water-bottle SVG modal block (L403–L469), `isVerifiedEffect` state (L27), `setIsVerifiedEffect(true)` (L95), and remove `CheckCircle2` from the `lucide-react` import on Line 4.

#### [MODIFY] `frontend/src/pages/Purchases.jsx` & `frontend/src/components/purchases/PurchasesTable.jsx`
- Normalize URL in `fetchPurchases`:
  ```javascript
  const qs = qParams.toString();
  const url = qs ? `${API}/purchases?${qs}` : `${API}/purchases`;
  ```
- Hydrate `purchases`, `vendors`, and `materials` with `peekCachedData`, add `loading` state and `hasLoadedRef`, and pass `loading={loading}` to `<PurchasesTable />`.
- In `PurchasesTable.jsx`, render a loading state when `loading && (!purchases || purchases.length === 0)` before rendering the "No Purchase Records Found" empty state.

#### [MODIFY] `frontend/src/components/layout/TopNav.jsx`
- Add `alertsMenuRef` click-outside listener to close `showAlertsMenu`.
- Remove frozen `const [now] = useState(...)` (L63) and compare `snoozeTime > Date.now()` inside `activeAlerts` (L127).
- Change company badge dot (L245) to `bg-brand`.
- In `fetchAuditAlerts`, check `document.visibilityState === 'visible'`, change interval to `45000`, and subscribe to `useLiveEvent(['CUSTOMER_UPDATED', 'ORDER_UPDATED', 'INVENTORY_CHANGED'], fetchAuditAlerts)`.

#### [MODIFY] `frontend/src/pages/CounterSales.jsx` & `frontend/src/components/counterSales/LogCounterSaleForm.jsx`
- Remove `liveDateTime` state and the 1-second `setInterval` from `CounterSales.jsx` (L41, L47–50, L315).
- Render an isolated `<LiveClock />` component at `LogCounterSaleForm.jsx:L480`.

#### [MODIFY] `frontend/src/components/dashboard/BottleCustodyWidget.jsx`
- Remove `'x-no-cache': '1'` and `cache: 'no-store'` from `loadData` fetches (L25–31).
