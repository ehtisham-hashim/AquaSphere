# PROJECT_RULES.md — AquaSphere & Wadaana Platform

> Read this file fully before writing, editing, or refactoring any code in this repo.
> These rules exist to keep the codebase correct, consistent, and lean. If a change
> conflicts with a rule below, stop and flag it instead of silently deviating.

---

## 1. What This Project Is

A **multi-tenant** industrial water manufacturing, inventory, sales, and financial
platform serving two brands from one codebase:

- **AquaSphere** — 19L refillable bottles, 0.5L PET packs, 1.5L PET packs.
- **Wadaana** — Pure 0.5L/1.5L and Mix 0.5L/1.5L bottle lines.

Both brands share the same frontend and backend code. They do **not** share data —
each has its own PostgreSQL schema (`aquasphere`, `wadaana`).

Stack:
- Frontend: React 18 + Vite + React Router DOM v6 + Context API + Tailwind/vanilla CSS + Lucide icons.
- Backend: Node.js (ES Modules) + Express + Prisma ORM (v5/v6) + `@prisma/adapter-pg` + PostgreSQL.
- Auth: `jsonwebtoken` + `cookie-parser`, HTTP-only cookie session.
- Security/infra: `helmet`, `express-rate-limit` (300 req/15min), `cloudinary`, `pdfkit`.

---

## 2. Multi-Tenancy — Non-Negotiable Rules

This is the single most important architectural constraint in the whole project.
Get this wrong and data leaks between brands.

1. **Every** incoming request carries an `x-tenant` header (`aquasphere` or `wadaana`),
   injected client-side by `frontend/src/utils/apiInterceptor.js` (a `window.fetch` wrapper).
2. **Never** hardcode a tenant name in shared business logic. Always resolve tenant from
   `req.tenant`, which `verifyJWT` middleware sets from the JWT + `x-tenant` header.
3. **Every** Prisma call in shared controllers must use the dynamic model pattern:
   ```js
   const model = prisma[`${req.tenant}${ModelName}`];
   ```
   Never call `prisma.customer` or `prisma.item` directly in tenant-scoped code — always
   go through the `${prefix}${Model}` resolution.
4. Cross-tenant fallback (`OWNER`/`ADMIN` only): if a user isn't found in the requested
   schema's `users` table, `verifyJWT` checks the other schema before rejecting. Don't
   "fix" this by duplicating user accounts — that's the intended design.
5. When adding a new model or table, mirror it in **both** schemas with identical
   structure. Brand-specific fields (e.g. `buys19L` vs `buysPure05L`) are the only
   allowed divergence.
6. Client-side tenant state lives in `companyCookie.js` (cookie + localStorage, 1-year
   expiry, keys `company`/`tenant`). Don't introduce a second source of truth for
   active tenant.

---

## 3. Database & Schema Rules

- Two schemas (`aquasphere`, `wadaana`), structurally identical except brand-specific
  flags. If you touch one schema's model, mirror the change in the other unless it's
  explicitly a brand-specific field.
- `InventoryTransaction` and `BottleTransaction` are **immutable ledgers** — never
  update or delete rows in these tables. Corrections happen via new offsetting entries,
  never in-place edits.
- Money and stock quantities use `Prisma.Decimal`, never floats. Do not introduce
  `Number()`/`parseFloat()` conversions on `cachedQty`, `cachedBalance`, prices, or
  consumption values — this reintroduces the floating-point bugs the system was built
  to avoid.
- `cachedQty` / `cachedBalance` / `cachedBottleBalance` are derived caches. Any write
  path that changes underlying transactions **must** update the cache in the same
  transaction/request — never leave them to drift.
- Soft delete only for customers (`archivedAt`), and only `OWNER` can trigger it. Never
  implement a hard `DELETE` for customer records.
- Core enums (`Role`, `ItemType`, `BottleTransactionType`, `DeliveryStatus`,
  `PaymentStatus`) are fixed vocab — don't add ad-hoc string statuses; extend the enum
  properly in the schema.

---

## 4. Backend API Rules

- All routes mount under `/api/v1`. New routes follow the existing
  `routeFile.js` → `controllerFile.js` split (see table in architecture doc) — don't
  put business logic directly in route files.
- Global middleware order matters: rate limit → CORS (credentials: true) → Helmet →
  JSON body parsing → cookie parsing → `verifyJWT` → route handlers. Don't reorder or
  bypass this stack for "quick" endpoints.
- **`checkDailyCloseLock` is mandatory** on any write route touching `orders`,
  `production_batches`, `purchases`, or `expenses`. It checks the transaction's date
  field (`date`/`batchDate`/`purchaseDate`/`deliveredAt`) against `DailyClose` records
  and rejects with 403 unless the user is `OWNER`. New write endpoints on these
  entities must include this middleware — don't skip it because "it's just an edit."
- Audit logging (`AuditLog`) is required for major mutations: customer add/delete,
  order created/delivered, production batch recorded, daily close performed. Any new
  endpoint that performs an equivalent major mutation must log to `AuditLog` the same
  way — don't add a new mutation type silently.
- Production math (`productionFormulas.js`) — the constants below are business-critical
  and must never be approximated or "simplified":
  - 0.5L pack (12 bottles): 12 caps, 0.00672 kg labels, 0.02273 kg shrink wrap
    (44 packs/kg), 9L water (6L product + 3L flush).
  - 1.5L pack (6 bottles): 6 caps, 0.00780 kg labels, 0.025 kg shrink wrap
    (40 packs/kg), 12L water (9L product + 3L flush).
  - Mineral dosage: fraction = total litres / 15,141; Calcium = fraction × 2.0kg,
    Magnesium = fraction × 1.0kg, Sodium = fraction × 0.5kg.
  - Any refactor of this file must preserve exact Decimal arithmetic and these exact
    constants — write/update a test that pins these numbers before refactoring.

---

## 5. Roles & Permissions

Five roles: `OWNER`, `ADMIN`, `PRODUCTION_MANAGER`, `ACCOUNTANT`, `MARKETING_MANAGER`.

- `OWNER` is the only role that can: override a closed financial date, delete/archive a
  customer record. Never relax these two checks for any other role, even ADMIN.
- Permission checks belong in middleware/guards, not scattered `if (user.role === ...)`
  checks copy-pasted into every controller. If you find yourself pasting a role check
  a third time, extract it into a reusable `requireRole([...])` middleware.
- Frontend route/menu visibility (`Sidebar.jsx`, `ProtectedRoute`) must mirror backend
  permission rules exactly. A frontend-only permission with no backend enforcement is
  a security bug, not a feature — always enforce on the backend first.

---

## 6. Frontend Rules

- Global auth/tenant state stays in `AuthContext.jsx` + `companyCookie.js`. Don't
  introduce Redux/Zustand/new context providers for state that already has a home.
- All API calls go through `fetch` (intercepted globally by `apiInterceptor.js`).
  Don't bypass this with raw `axios` or a second fetch wrapper — the tenant header
  injection depends on the single interceptor.
- Modals follow the existing `AddXModal` / `EditXModal` / `ProcessXModal` naming and
  structure (see `orders/`, `customer/`, `rawMaterials/` components). New CRUD features
  should follow this same modal pattern rather than inventing a new UI pattern.
- Tables (`OrdersTable`, `CustomersTable`, `RawMaterialsTable`) follow a consistent
  filterable-table shape. Extract shared table logic (sorting, filtering, pagination)
  into a shared hook/component rather than re-implementing per table.

---

## 7. Code Quality & Reduction Rules (apply on every edit, not just big refactors)

These are standing rules for how this codebase should evolve — apply them whenever you
touch a file, not only during dedicated cleanup passes.

1. **Audit before big changes.** For any large refactor, get a line-count baseline
   (`wc -l` / `cloc`) and prioritize the largest files/controllers first. Don't spend
   effort shrinking a 50-line file while a 600-line controller sits untouched.
2. **Delete dead code, don't comment it out.** Unused imports, unreachable branches,
   and uncalled functions/components get removed, not commented. Use `eslint`
   (`no-unused-vars`) / `ts-prune` if available before manual review.
3. **No duplicated logic across route/controller files.** If the same auth check,
   try/catch shape, or validation logic appears in more than one controller, extract it
   into shared middleware or a utility function.
4. **No duplicated JSX or state patterns on the frontend.** Near-identical cards, list
   items, or form fields become a shared component with props. Repeated
   `useState`/`useEffect` data-fetching patterns become a custom hook (e.g. `useFetch`).
5. **Fix data flow before fixing syntax.** Before shortening lines, check for
   over-fetching (sequential queries that should be one query with joins) and
   over-processing (multiple related `useState` calls that should be one object or
   `useReducer`).
6. **Standardize responses and errors.** Backend routes should use a shared
   `sendSuccess(res, data)` / `sendError(res, err)` helper and a centralized error
   middleware — not a per-route try/catch/response block.
7. **Prefer concise idioms, but stop at clarity's edge.** Destructuring, optional
   chaining, default params, and `map`/`filter`/`reduce` are good when they replace
   multi-line logic with something obviously readable. If a one-liner needs re-reading
   twice, split it back out.
8. **Don't over-abstract either.** A factory/strategy pattern for a single
   implementation, or a config object for values that never change, is bloat in the
   other direction — flatten it.
9. **Never touch business-critical constants "for cleanliness."** Production formula
   constants (Section 4) and financial rounding logic are exempt from stylistic
   simplification — correctness over brevity there, always.

---

## 8. Before You Submit Any Change

- [ ] Does this respect tenant isolation (Section 2)? No hardcoded tenant, no
      cross-schema leakage.
- [ ] If this is a write route on orders/production/purchases/expenses, is
      `checkDailyCloseLock` applied?
- [ ] If this is a major mutation, is it logged to `AuditLog`?
- [ ] Does this preserve `Prisma.Decimal` usage for money/stock (no floats)?
- [ ] Did this introduce duplicate logic that should be extracted instead?
- [ ] Did this remove more dead code than it added complexity?
- [ ] Does frontend permission visibility match backend enforcement?
