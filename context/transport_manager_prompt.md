# Transport Manager Feature — Coding Agent Prompt

> **Scope contract**: Touch ONLY the files listed under "Files to Create/Modify". Do not refactor, rename, reformat, or touch any file outside this list. If you discover a dependency conflict, report it and wait for instruction — do not resolve it by editing out-of-scope files.

---

## 1. Context

This is a PERN stack ERP for a multi-tenant water distribution business.
- **Backend**: Node.js (ESM) + Express + Prisma + PostgreSQL
- **Frontend**: React + Vite, Tailwind CSS v4, `lucide-react` icons, `sonner` toasts, `recharts` for charts
- **Multi-tenancy architecture**: PostgreSQL **schema-level isolation** — NOT a `companyId` column. Two schemas exist: `aquasphere` and `wadaana`. Every Prisma model is **duplicated** with a prefix (e.g. `AquasphereExpense` / `WadaanaExpense`). Controllers resolve the tenant prefix at runtime using `getTenantPrefix(req)` from `backend/src/utils/tenant.js`, then dynamically access `prisma[\`${prefix}ModelName\`]`.
- **RBAC reference files**: `frontend/src/constants/roleAccess.js` (path-based, tenant-aware matrix) and `backend/src/middlewares/role.middleware.js` (`requireRoles(...roles)`)
- **Existing roles in both schema enums**: `OWNER`, `ADMIN`, `PRODUCTION_MANAGER`, `ACCOUNTANT`, `MARKETING_MANAGER`
- **New role to add**: `TRANSPORT_MANAGER` — must be added to BOTH `AquasphereRole` and `WadaanaRole` enums

**Problem being solved**: Delivery costs (fuel + vehicle maintenance) are not factored into order pricing when customers are far away. The Transport Manager role will track vehicle expenses so these costs can be reflected accurately.

---

## 2. Critical Architecture Rules (READ BEFORE CODING)

### 2.1 Multi-Tenancy Pattern — How It ACTUALLY Works

There is **NO `Company` model** and **NO `companyId` column** anywhere. Instead:

1. The database has two PostgreSQL schemas: `aquasphere` and `wadaana`
2. Every Prisma model is defined TWICE with a prefix: `AquasphereVehicle` + `WadaanaVehicle`
3. Every enum is defined TWICE: `AquasphereTransportExpenseType` + `WadaanaTransportExpenseType`
4. Controllers determine the tenant from the request using:
   ```js
   import { getTenantPrefix } from '../utils/tenant.js';
   const prefix = getTenantPrefix(req); // returns 'aquasphere' or 'wadaana'
   ```
5. Then query dynamically:
   ```js
   const vehicles = await prisma[`${prefix}Vehicle`].findMany({ ... });
   ```

### 2.2 Backend Utility Imports (Exact Paths)

```js
import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { sendSuccess } from '../utils/response.js';
import { paginationArgs } from '../utils/pagination.js';       // NOT getPaginationParams
import { getTenantPrefix } from '../utils/tenant.js';
import { requireRoles } from '../middlewares/role.middleware.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
```

### 2.3 Response Helpers

The codebase uses TWO response patterns interchangeably. For new controllers, use `sendSuccess` (the simpler, more modern pattern):
```js
// sendSuccess(res, data, statusCode, extraFields)
import { sendSuccess } from '../utils/response.js';
return sendSuccess(res, vehicles, 200);
return sendSuccess(res, expenses, 200, { nextCursor, hasMore });
```

For errors, throw `ApiError`:
```js
throw new ApiError(400, 'Vehicle name is required');
throw new ApiError(404, 'Vehicle not found');
```

### 2.4 Pagination Utility — `paginationArgs`

The existing utility is cursor-based, exported from `backend/src/utils/pagination.js`:
```js
// Takes req.query, returns { take, skip, cursor? } to spread into Prisma findMany
export function paginationArgs(query) {
  const take = Math.min(parseInt(query.limit) || 50, 100);
  const cursor = query.cursor ? { id: query.cursor } : undefined;
  const skip = cursor ? 1 : 0;
  return { take, skip, ...(cursor && { cursor }) };
}
```

### 2.5 Frontend API Pattern

All API calls use native `fetch` with `API_URL` from `frontend/src/utils/api.js`:
```js
import { API_URL } from '../../utils/api.js';   // resolves to VITE_API_URL or '/api/v1'
import { getCompanyFromCookie } from '../../utils/companyCookie.js';

const tenant = getCompanyFromCookie();
const res = await fetch(`${API_URL}/vehicles`, {
  headers: { 'x-tenant': tenant },
  credentials: 'include'
});
const json = await res.json();
if (json.success) { /* use json.data */ }
```

### 2.6 Frontend Routing Pattern

Routes in `App.jsx` use `RoleProtectedRoute` (NOT `ProtectedRoute` with roles prop):
```jsx
<Route path="transport-expenses" element={
  <RoleProtectedRoute path="/transport-expenses">
    <TransportExpenses />
  </RoleProtectedRoute>
} />
```
`RoleProtectedRoute` internally calls `isPageAllowedForRole(user?.role, path, currentTenant)` to check the access matrix.

### 2.7 Detail Panel Pattern

This app does NOT use side-drawer panels. The `CustomerDetails` pattern is an **inline full-page swap**:
```jsx
{selectedVehicle ? (
  <VehicleDetailPanel vehicle={selectedVehicle} onClose={() => setSelectedVehicle(null)} ... />
) : (
  <CarsTable ... />
)}
```

### 2.8 Icons

All icons come from `lucide-react`. The Sidebar imports icons directly:
```js
import { Truck, Car, BarChart3, ... } from 'lucide-react';
```
Do NOT reference SVG sprites or add external icon libraries.

---

## 3. What I Want — Exact Scope

### 3.1 Database (Prisma Schema — `backend/prisma/schema.prisma`)

Add the `TRANSPORT_MANAGER` value to **both** existing role enums. Add four new models (two per schema) and four new enums (two per schema). Do NOT alter any existing model.

#### Add to Role Enums

```prisma
enum AquasphereRole {
  OWNER
  ADMIN
  PRODUCTION_MANAGER
  ACCOUNTANT
  MARKETING_MANAGER
  TRANSPORT_MANAGER          // ← ADD THIS LINE

  @@map("roles")
  @@schema("aquasphere")
}

enum WadaanaRole {
  OWNER
  ADMIN
  PRODUCTION_MANAGER
  ACCOUNTANT
  MARKETING_MANAGER
  TRANSPORT_MANAGER          // ← ADD THIS LINE

  @@map("roles")
  @@schema("wadaana")
}
```

#### New Enums (add near other enums for each schema)

```prisma
enum AquasphereTransportExpenseType {
  DAILY
  REPAIRS
  OTHER

  @@map("transport_expense_types")
  @@schema("aquasphere")
}

enum AquasphereTransportPeriod {
  MONTHLY

  @@map("transport_periods")
  @@schema("aquasphere")
}

enum WadaanaTransportExpenseType {
  DAILY
  REPAIRS
  OTHER

  @@map("transport_expense_types")
  @@schema("wadaana")
}

enum WadaanaTransportPeriod {
  MONTHLY

  @@map("transport_periods")
  @@schema("wadaana")
}
```

#### New Models — Aquasphere Schema

```prisma
model AquasphereVehicle {
  id          String    @id @default(uuid())
  name        String                             // e.g. "Suzuki Carry"
  plateNumber String    @map("plate_number")
  model       String?
  isActive    Boolean   @default(true) @map("is_active")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  expenses    AquasphereTransportExpense[]

  @@index([isActive])
  @@map("vehicles")
  @@schema("aquasphere")
}

model AquasphereTransportExpense {
  id          String                        @id @default(uuid())
  vehicleId   String                        @map("vehicle_id")
  type        AquasphereTransportExpenseType
  period      AquasphereTransportPeriod
  amount      Decimal
  note        String?
  date        DateTime                      @default(now())
  createdAt   DateTime                      @default(now()) @map("created_at")
  updatedAt   DateTime                      @updatedAt @map("updated_at")

  vehicle     AquasphereVehicle             @relation(fields: [vehicleId], references: [id])

  @@index([vehicleId, date(sort: Desc)])
  @@index([date(sort: Desc)])
  @@map("transport_expenses")
  @@schema("aquasphere")
}
```

#### New Models — Wadaana Schema

```prisma
model WadaanaVehicle {
  id          String    @id @default(uuid())
  name        String
  plateNumber String    @map("plate_number")
  model       String?
  isActive    Boolean   @default(true) @map("is_active")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  expenses    WadaanaTransportExpense[]

  @@index([isActive])
  @@map("vehicles")
  @@schema("wadaana")
}

model WadaanaTransportExpense {
  id          String                      @id @default(uuid())
  vehicleId   String                      @map("vehicle_id")
  type        WadaanaTransportExpenseType
  period      WadaanaTransportPeriod
  amount      Decimal
  note        String?
  date        DateTime                    @default(now())
  createdAt   DateTime                    @default(now()) @map("created_at")
  updatedAt   DateTime                    @updatedAt @map("updated_at")

  vehicle     WadaanaVehicle              @relation(fields: [vehicleId], references: [id])

  @@index([vehicleId, date(sort: Desc)])
  @@index([date(sort: Desc)])
  @@map("transport_expenses")
  @@schema("wadaana")
}
```

#### User Model Relations — ADD to both User models

Add a `vehicles` and `transportExpenses` relation? **NO** — the existing models (Vehicle, TransportExpense) don't have a `createdById` field for simplicity. No changes needed to User models.

> **After schema changes**: Run `npx prisma migrate dev --name add_transport_manager`

---

### 3.2 Backend — Files to Create

**All controllers must**: use `asyncHandler`, return via `sendSuccess(res, data, status, extra?)`, throw `ApiError` for errors, resolve tenant via `const prefix = getTenantPrefix(req)`, and query dynamically via `prisma[\`${prefix}Vehicle\`]`.

#### `backend/src/controllers/vehicle.controller.js`
- `getVehicles` — list all vehicles for the tenant (no pagination needed, list is small). Use `select` for fields. `orderBy: { createdAt: 'desc' }`.
- `addVehicle` — create new vehicle. Validate `name` and `plateNumber` are required.
- `updateVehicle` — update name/plate/model/isActive by `req.params.id`.
- `deleteVehicle` — soft-delete (set `isActive: false`).

#### `backend/src/controllers/transportExpense.controller.js`
- `getTransportExpenses` — use `paginationArgs(req.query)` for cursor pagination. Newest first. Optional filter by `vehicleId` (query param). Use `select` to return only: `id, date, amount, type, period, note, vehicle: { select: { name, plateNumber } }`. Return `{ data, nextCursor, hasMore }` via `sendSuccess`.
- `getExpensesByVehicle(req.params.id)` — cursor-based pagination (for infinite scroll on vehicle detail). Accept `cursor` and `limit` query params. Return `{ data: expenses, vehicle: vehicleMeta, nextCursor, hasMore }`.
- `addTransportExpense` — create expense, connect to vehicle by `vehicleId`. Validate: vehicleId required, type must be one of DAILY/REPAIRS/OTHER, amount > 0.
- `deleteTransportExpense` — hard delete by `req.params.id`.

**Reference**: follow exact pattern of `backend/src/controllers/expense.controller.js` and `backend/src/controllers/purchase.controller.js`.

#### `backend/src/routes/vehicle.routes.js`

```js
import { Router } from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';
import { getVehicles, addVehicle, updateVehicle, deleteVehicle } from '../controllers/vehicle.controller.js';

const router = Router();
router.use(verifyJWT);

router.get('/',    requireRoles('OWNER', 'TRANSPORT_MANAGER'), getVehicles);
router.post('/',   requireRoles('TRANSPORT_MANAGER'),          addVehicle);
router.put('/:id', requireRoles('TRANSPORT_MANAGER'),          updateVehicle);
router.delete('/:id', requireRoles('TRANSPORT_MANAGER'),       deleteVehicle);

export default router;
```

#### `backend/src/routes/transportExpense.routes.js`

```js
import { Router } from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';
import { getTransportExpenses, getExpensesByVehicle, addTransportExpense, deleteTransportExpense } from '../controllers/transportExpense.controller.js';

const router = Router();
router.use(verifyJWT);

router.get('/',             requireRoles('OWNER', 'TRANSPORT_MANAGER'), getTransportExpenses);
router.get('/vehicle/:id',  requireRoles('OWNER', 'TRANSPORT_MANAGER'), getExpensesByVehicle);
router.post('/',            requireRoles('TRANSPORT_MANAGER'),          addTransportExpense);
router.delete('/:id',       requireRoles('TRANSPORT_MANAGER'),          deleteTransportExpense);

export default router;
```

#### Register in `backend/src/index.js`

Add these two imports alongside existing route imports:
```js
import vehicleRoutes from './routes/vehicle.routes.js';
import transportExpenseRoutes from './routes/transportExpense.routes.js';
```

Add these two route registrations alongside existing `app.use` calls:
```js
app.use('/api/v1/vehicles', vehicleRoutes);
app.use('/api/v1/transport-expenses', transportExpenseRoutes);
```

---

### 3.3 Frontend — Files to Create

Mirror the existing expense module pattern at `frontend/src/components/expenses/`.
Create a parallel module at `frontend/src/components/transport/`.

#### Pages (new)
- `frontend/src/pages/TransportExpenses.jsx` — Transport Manager's expense view
- `frontend/src/pages/Cars.jsx` — Vehicle management page

#### Components (new, all inside `frontend/src/components/transport/`)

| File | Purpose |
|------|---------|
| `TransportExpensesHeader.jsx` | Page header with tenant-aware badge + "Add Expense" button (top-right). Mirror `ExpensesHeader.jsx` pattern exactly: conditional button rendering based on `user?.role === 'TRANSPORT_MANAGER'` (OWNER sees read-only). |
| `TransportExpensesTable.jsx` | Table of expenses, newest → oldest. Columns: Date, Vehicle, Type, Period, Amount (Rs), Note, Actions. Use same table structure/classes as `ExpensesTable.jsx`. Last column: delete icon (TRANSPORT_MANAGER only; hidden for OWNER). |
| `AddTransportExpenseModal.jsx` | Uses the app's `Modal` component from `../ui/Modal`. Form fields: dropdown(vehicle — fetched from `/api/v1/vehicles`), dropdown(type: Daily/Repairs/Other), dropdown(period: Monthly), amount input, note textarea. Submit POSTs to `/api/v1/transport-expenses`. |
| `CarsTable.jsx` | Table of vehicles: Name, Plate Number, Model, Status (Active/Inactive badge), Actions (Edit, Deactivate — TRANSPORT_MANAGER only). Table rows are **clickable** — clicking opens `VehicleDetailPanel` via parent state. |
| `CarsHeader.jsx` | Page header + "Add Car" button (top-right, TRANSPORT_MANAGER only). |
| `AddEditCarModal.jsx` | Uses `Modal` from `../ui/Modal`. Fields: Name (required), Plate Number (required, placeholder: `LHR-1234`), Model (optional). On edit, pre-fills existing values. |
| `VehicleDetailPanel.jsx` | Full inline page swap (NOT a drawer). Top: vehicle info card (name, plate, model, status). Bottom: infinite-scroll expense list. Use `IntersectionObserver` on a sentinel `<div>` at the bottom. On intersection, call `getExpensesByVehicle` with cursor from last item. Append results. Show spinner while fetching. Stop observing when API returns `hasMore: false`. Include "Back to Cars" button at top. |
| `index.js` | Barrel export of all above |

#### Key UI Details

- **Tenant-aware theming**: check `getCompanyFromCookie() === 'wadaana'` for purple vs emerald accent colors, exactly as `ExpensesHeader.jsx` does.
- **API calls**: use `fetch(\`${API_URL}/...\`, { headers: { 'x-tenant': tenant }, credentials: 'include' })`.
- **Toasts**: `import { toast } from 'sonner';` — use `toast.success()` and `toast.error()`.
- **Delete confirmations**: use `DeleteConfirmationModal` from `../ui/DeleteConfirmationModal`.
- **Loading states**: use `Loader2` from `lucide-react` with `animate-spin` class, matching existing table loading pattern.
- **Currency format**: `Rs. ${Math.round(Number(amount)).toLocaleString()}` (matching `ExpensesTable.jsx`).

---

### 3.4 Frontend — Files to Modify

#### `frontend/src/constants/roleAccess.js`

This file uses a path-based, tenant-aware access matrix. You must:

1. Add `TRANSPORT_MANAGER` to the `ROLES` constant object.
2. Add two new routes to `SIDEBAR_ROUTES`.
3. Add `TRANSPORT_MANAGER` access entries for BOTH tenants.
4. Add the two new route keys to `OWNER` and all other existing roles (set to `false` for roles that shouldn't access them).

```js
// 1. Add to ROLES object:
TRANSPORT_MANAGER: 'TRANSPORT_MANAGER',

// 2. Add to SIDEBAR_ROUTES object:
TRANSPORT_EXPENSES: '/transport-expenses',
CARS: '/cars',

// 3. In ROLE_ACCESS.aquasphere, add TRANSPORT_MANAGER entry:
[ROLES.TRANSPORT_MANAGER]: {
  [SIDEBAR_ROUTES.DASHBOARD]: true,
  [SIDEBAR_ROUTES.ORDERS]: false,
  [SIDEBAR_ROUTES.CUSTOMERS]: false,
  [SIDEBAR_ROUTES.PRODUCTION]: false,
  [SIDEBAR_ROUTES.RAW_MATERIALS]: false,
  [SIDEBAR_ROUTES.PURCHASES]: false,
  [SIDEBAR_ROUTES.VENDORS]: false,
  [SIDEBAR_ROUTES.EXPENSES]: false,
  [SIDEBAR_ROUTES.COUNTER_SALES]: false,
  [SIDEBAR_ROUTES.USERS]: false,
  [SIDEBAR_ROUTES.DAILY_CLOSE]: false,
  [SIDEBAR_ROUTES.INVENTORY]: false,
  [SIDEBAR_ROUTES.TRANSPORT_EXPENSES]: true,
  [SIDEBAR_ROUTES.CARS]: true,
},

// 4. Add to existing OWNER entry (append, don't change existing keys):
[SIDEBAR_ROUTES.TRANSPORT_EXPENSES]: true,
[SIDEBAR_ROUTES.CARS]: true,

// 5. Add to ALL other existing role entries (ADMIN, PRODUCTION_MANAGER, ACCOUNTANT, MARKETING_MANAGER) with false:
[SIDEBAR_ROUTES.TRANSPORT_EXPENSES]: false,
[SIDEBAR_ROUTES.CARS]: false,

// 6. Repeat steps 3-5 for ROLE_ACCESS.wadaana (identical structure)
```

**Do NOT change any existing role entries — only add new keys.**

#### `frontend/src/components/layout/Sidebar.jsx`

Add two new items to the `navItems` array. Import `Car` icon from `lucide-react` (the existing `Truck` icon is already imported and used for Orders):

```js
// Add to lucide-react import:
import { ..., Car } from 'lucide-react';

// Add to navItems array (after the 'Daily Close' entry):
{ icon: Truck, label: 'Transport', path: '/transport-expenses' },
{ icon: Car, label: 'Cars', path: '/cars' },
```

> **Note**: `Truck` is already imported in Sidebar.jsx (used for Orders). You may choose a different icon for Transport to avoid confusion — e.g. `Fuel` or `Route` from lucide-react. Or rename the Orders icon usage. Use your best judgment — the key constraint is: use only `lucide-react` icons, do NOT add any external icon library.

#### `frontend/src/App.jsx`

Add two new lazy imports and two new route entries.

```jsx
// Add lazy imports alongside existing ones:
const TransportExpenses = lazy(() => import('./pages/TransportExpenses'));
const Cars = lazy(() => import('./pages/Cars'));

// Add routes inside the <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}> block,
// alongside existing routes (before the catch-all):
<Route path="transport-expenses" element={<RoleProtectedRoute path="/transport-expenses"><TransportExpenses /></RoleProtectedRoute>} />
<Route path="cars" element={<RoleProtectedRoute path="/cars"><Cars /></RoleProtectedRoute>} />
```

**Do not alter any existing routes.**

#### `frontend/src/components/dashboard/OwnerDashboardView.jsx`

**Append** (do not modify existing sections) a Transport summary section at the bottom. This section should:
- Fetch transport data from `/api/v1/transport-expenses?limit=5` using `useEffect` + `fetch` (same pattern as the dashboard's existing fetches).
- Show a summary card: total transport spend this month and vehicle count (fetch from `/api/v1/vehicles`).
- Show a compact preview table (5 rows max) of recent transport expenses.
- Add a "View All →" link to `/transport-expenses` using `react-router-dom`'s `Link`.
- Wrap the entire section in a conditional check: only render if the fetch was successful and data exists.

#### `frontend/src/components/dashboard/index.js`

No changes needed (OwnerDashboardView is already exported from here).

---

## 4. UI & UX Requirements

### Design Language (match existing app style exactly)
- Use the same Tailwind classes from existing components. Key patterns:
  - **Page wrapper**: `<div className="p-6 max-w-7xl mx-auto space-y-6">`
  - **Table container**: `<div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">`
  - **Table header**: `<thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">`
  - **Table cell**: `<td className="p-4 text-slate-600 text-xs font-medium">`
  - **Primary button (Aquasphere)**: `bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-md`
  - **Primary button (Wadaana)**: `bg-[#0ea5e9] hover:bg-sky-500 text-white font-bold text-sm rounded-xl shadow-md`
  - **Secondary button**: `bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl shadow-xs`
  - **Form inputs**: `border border-slate-200 rounded-xl p-2.5 outline-none focus:border-emerald-500`
  - **Badge (active)**: `bg-emerald-50 text-emerald-700 border border-emerald-200`
  - **Badge (inactive)**: `bg-rose-50 text-rose-600 border border-rose-200`

### Pakistani data modeling for cars
Plate number placeholder: `LHR-1234` or `ABC-123`. No strict regex enforcement.

### Expense table columns
`Date | Vehicle | Type | Period | Amount (Rs) | Note | Actions`

Last column (Actions): delete icon button — visible for TRANSPORT_MANAGER only; hidden for OWNER (read-only view).

---

## 5. Performance Requirements

### Backend
- `getTransportExpenses`: use `select` (not `include`) to return only fields the frontend uses: `id, date, amount, type, period, note, vehicle: { select: { name: true, plateNumber: true } }`.
- `getExpensesByVehicle`: implement cursor-based pagination using `paginationArgs`. Accept `cursor` (expense `id`) and `limit` (default 20) as query params. Return `{ data, vehicle, nextCursor, hasMore }` via `sendSuccess`.
- Index hints are already included in the schema above: `@@index([vehicleId, date(sort: Desc)])` on TransportExpense and `@@index([isActive])` on Vehicle.

### Frontend
- `VehicleDetailPanel`: lazy-load with `React.lazy()` from the Cars page so it doesn't bloat the initial bundle.
- `TransportExpensesTable`: if row count exceeds 100, add a code comment noting that table virtualization (e.g. `@tanstack/react-virtual`) should be applied — but do NOT implement it now.
- API calls: use native `fetch` with `API_URL` from `frontend/src/utils/api.js`. Do NOT introduce axios or any new HTTP library.

---

## 6. Files to Create/Modify — Complete List

```
backend/prisma/schema.prisma                                    ← MODIFY (add TRANSPORT_MANAGER to both role enums, add 4 new models, 4 new enums)
backend/src/controllers/vehicle.controller.js                   ← CREATE
backend/src/controllers/transportExpense.controller.js           ← CREATE
backend/src/routes/vehicle.routes.js                             ← CREATE
backend/src/routes/transportExpense.routes.js                    ← CREATE
backend/src/index.js                                             ← MODIFY (add 2 imports + 2 app.use route registrations)

frontend/src/pages/TransportExpenses.jsx                         ← CREATE
frontend/src/pages/Cars.jsx                                      ← CREATE
frontend/src/components/transport/TransportExpensesHeader.jsx    ← CREATE
frontend/src/components/transport/TransportExpensesTable.jsx     ← CREATE
frontend/src/components/transport/AddTransportExpenseModal.jsx   ← CREATE
frontend/src/components/transport/CarsTable.jsx                  ← CREATE
frontend/src/components/transport/CarsHeader.jsx                 ← CREATE
frontend/src/components/transport/AddEditCarModal.jsx            ← CREATE
frontend/src/components/transport/VehicleDetailPanel.jsx         ← CREATE
frontend/src/components/transport/index.js                       ← CREATE

frontend/src/constants/roleAccess.js                             ← MODIFY (add TRANSPORT_MANAGER role + 2 new routes to matrix for BOTH tenants)
frontend/src/components/layout/Sidebar.jsx                       ← MODIFY (add 2 nav items + 1 icon import)
frontend/src/App.jsx                                             ← MODIFY (add 2 lazy imports + 2 routes)
frontend/src/components/dashboard/OwnerDashboardView.jsx         ← MODIFY (append transport summary section at bottom)
```

**Do not touch any other file.**

---

## 7. Verification Checklist

After implementation, confirm each item:

- [ ] `npx prisma migrate dev` runs without error
- [ ] Both `AquasphereRole` and `WadaanaRole` enums include `TRANSPORT_MANAGER`
- [ ] `GET /api/v1/vehicles` returns 401 for unauthenticated, 403 for non-TRANSPORT_MANAGER/OWNER
- [ ] `POST /api/v1/transport-expenses` is blocked for OWNER (read-only — 403)
- [ ] Controllers use `getTenantPrefix(req)` and `prisma[\`${prefix}Vehicle\`]` pattern — NOT `companyId`
- [ ] Cars page renders for TRANSPORT_MANAGER and OWNER; hidden from all other roles in sidebar
- [ ] Transport Expenses page renders for TRANSPORT_MANAGER and OWNER; hidden from all other roles
- [ ] Clicking a car row shows `VehicleDetailPanel` (inline swap, not a drawer)
- [ ] Scrolling to the bottom of `VehicleDetailPanel` expense list triggers infinite scroll
- [ ] "Add Expense" modal: vehicle dropdown is populated from live `/api/v1/vehicles` call
- [ ] Owner dashboard shows transport summary section without breaking existing sections
- [ ] `roleAccess.js` — no existing role boolean values were altered; only new keys were added
- [ ] AquaSphere tenant data does not appear in Wadaana context and vice versa (schema-level isolation)
- [ ] All new routes use `RoleProtectedRoute` component (not `ProtectedRoute` with roles prop)

---

## 8. What NOT to Do

- **Do NOT use `companyId`** — this app does NOT have a Company model. Use `getTenantPrefix(req)` for tenant resolution.
- Do not add any new npm packages to frontend or backend without flagging it first.
- Do not modify the general `Expenses` page or any component under `frontend/src/components/expenses/`.
- Do not change any existing route in `App.jsx`.
- Do not alter existing RBAC boolean values in `roleAccess.js` — only add new keys.
- Do not add TypeScript to any file; keep plain JS/JSX (ESM with `.js` extensions in backend).
- Do not use `include` in Prisma queries where `select` is sufficient.
- Do not seed any test data; leave seeding to the developer.
- Do not use `ProtectedRoute` with a `roles` prop — use `RoleProtectedRoute` with a `path` prop.
- Do not create a side-drawer/slide-over component — use inline page swap pattern like `CustomerDetails`.
- Do not use `cuid()` for IDs — existing models use `uuid()`.
- Do not forget `@@map("table_name")` and `@@schema("aquasphere"/"wadaana")` on every new model/enum.
- Do not forget `@map("column_name")` for multi-word column names (e.g. `plateNumber` → `@map("plate_number")`).

---

## 9. Quick Reference — Existing File Patterns to Study

Before writing code, read these files to absorb the exact conventions:

| What to Learn | File to Read |
|---|---|
| Controller pattern (tenant, response, error) | `backend/src/controllers/expense.controller.js` |
| Cursor pagination in controller | `backend/src/controllers/purchase.controller.js` |
| Route + middleware chain | `backend/src/routes/customer.routes.js` |
| Route registration in server entry | `backend/src/index.js` (import + `app.use` pattern) |
| Page component structure | `frontend/src/pages/Expenses.jsx` |
| Header component with tenant theming | `frontend/src/components/expenses/ExpensesHeader.jsx` |
| Table component with loading/empty states | `frontend/src/components/expenses/ExpensesTable.jsx` |
| Modal form with validation | `frontend/src/components/expenses/LogExpenseModal.jsx` |
| Inline detail panel (page swap) | `frontend/src/pages/Customers.jsx` (lines 80-92) |
| Role access matrix structure | `frontend/src/constants/roleAccess.js` |
| Sidebar nav items + icon imports | `frontend/src/components/layout/Sidebar.jsx` |
| App routing with RoleProtectedRoute | `frontend/src/App.jsx` |
| Dashboard data fetching pattern | `frontend/src/pages/Dashboard.jsx` |
| Owner dashboard append pattern | `frontend/src/components/dashboard/OwnerDashboardView.jsx` |
