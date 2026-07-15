# Architecture — AQUA Sphere OS

This document defines **how** AQUA Sphere OS is built, based on what `project-requirements.md` defines it needs to **do**. The single principle every decision below serves: **no number is ever hand-edited — everything is derived from a transaction log.**

---

## 1. System Architecture

AQUA Sphere OS is a classic **3-tier web application**, kept deliberately simple (no microservices, no message queues) because the business is single-tenant and the traffic is low (a handful of concurrent staff).

```
┌─────────────────────────┐
│   Next.js 15 Frontend    │  (Vercel / free-tier host)
│  React 19 + TanStack     │
│  Query + Zustand         │
└────────────┬─────────────┘
             │ HTTPS / JSON (REST)
┌────────────▼─────────────┐
│   NestJS Backend API      │  (Railway / Render free tier)
│  Modules + Guards + DTOs  │
└────────────┬─────────────┘
             │ Prisma Client
┌────────────▼─────────────┐
│   PostgreSQL Database     │  (Neon / Supabase free tier)
└───────────────────────────┘
             │
┌────────────▼─────────────┐
│   Cloudinary (files)      │  (customer house photos, docs)
└───────────────────────────┘
```

**Why this shape:**
- **Frontend and backend are separate deployables** — Next.js talks to NestJS purely over HTTP. This lets the owner's phone (frontend) and the office PC hit the same backend safely, and lets each layer scale/redeploy independently.
- **Postgres is the single source of truth.** Every "balance" the app shows (bottle counts, customer balance, stock) is a `SUM()` over a transaction table — never a stored, editable field. This directly implements Section 12 of the requirements ("No Manually-Edited Numbers").
- **No server to manage** — everything runs on managed, free-tier-friendly platforms, matching the low-cost hosting requirement.

---

## 2. App Flow

The system flow mirrors the real front-desk phone call, end to end:

```
Phone rings → Operator searches customer (phone/name/ID)
   → Customer snapshot loads instantly:
       name, address, outstanding balance, bottle balance,
       last delivery date, avg monthly orders
   → Operator creates Order (19L OR PET — never mixed)
       → Soft-block check: credit limit vs (outstanding + new order)
       → Order saved as (delivery: pending, payment: unpaid)
   → Order appears in the live "Pending Orders" list
   → Driver delivers → Operator opens order → enters delivery:
       qty delivered, bottles returned (good/broken), cash, method
       → Soft-block check: bottles returned ≤ customer's current balance
   → System auto-creates:
       BottleTransaction(s), InventoryTransaction(s), Payment record
   → Order status recomputed (sum of deliveries / payments, not a flag)
   → Dashboard, customer balance, and reports update live
```

Production and purchasing run as parallel, simpler flows that feed the same inventory ledger:

```
Production run (PET) → operator enters pack counts only
   → system derives: -empty bottles, -caps, -labels, -shrink wrap,
      -mineral sets (exact fraction), +finished goods

Purchase → operator enters item + qty + vendor
   → +raw material inventory, +vendor payable
Vendor payment → -vendor payable (separate transaction stream)
```

---

## 3. Authentication Flow

- **JWT-based**, stateless auth — no server-side sessions, which keeps the backend horizontally simple and cheap to host.
- Two roles at login: **Operator/Accountant** and **Owner/Admin**. Role is embedded as a claim in the JWT and checked by NestJS Guards on every protected route.
- Passwords hashed with **bcrypt**; never stored or logged in plain text.
- **Access token** (short-lived, ~15 min) + **refresh token** (long-lived, httpOnly cookie) pattern, so the owner's phone session stays logged in without re-entering credentials constantly, while limiting the blast radius of a leaked access token.
- **Admin password reset requires accountant confirmation** (per manager notes) — implemented as a two-step flow: Admin initiates reset → Accountant approves via a confirmation action → new temporary password issued.
- All balance-affecting endpoints require an authenticated role; read-only dashboard endpoints are Owner-only where they expose profit.

```
Login (phone/email + password)
   → NestJS validates via bcrypt
   → Issues { accessToken, refreshToken } + role claim
Frontend stores accessToken in memory (Zustand), refreshToken in httpOnly cookie
   → Axios/Query interceptor auto-refreshes on 401
Guards on backend check role claim per route (RolesGuard + JwtAuthGuard)
```

---

## 4. Database Strategy

**Core rule: ledgers, not counters.** Every entity that represents a "balance" is backed by an append-only transaction table, and the balance itself is a derived value — either computed live via `SUM()` or kept in a cached column that is *provably* re-synced from the ledger (never written to directly by the UI).

- **PostgreSQL** as the single relational store — one database, one schema, no sharding needed at this scale.
- **Prisma ORM** for type-safe queries and migrations (`Prisma Migrate`).
- **Transaction tables drive everything:**
  - `BottleTransaction` → derives total-owned / at-factory / with-customer / broken / lost.
  - `InventoryTransaction` → derives current stock per `Item` (raw material or finished good).
  - `Payment` / `VendorPayment` → derive outstanding customer/vendor balances.
- **Database-level transactions (Prisma `$transaction`) + row locking** wrap every "read balance, then write" operation (e.g. delivery completion) to keep concurrent operator/owner usage safe, per the concurrency requirement.
- **Adjustment/reversal transaction type** exists on every ledger, carrying a mandatory `reason` field — this is the *only* sanctioned way to correct a mistake, never a direct edit.
- **Soft deletes** for Customers/Vendors/Items (an `archivedAt` field) instead of hard deletes, to keep historical orders/reports intact.
- **Daily closing**: a `DailyClose` record locks all transactions dated on/before it; the accountant role is blocked (at the API layer) from writing transactions dated before the latest close.

---

## 5. Module Architecture

NestJS is organized as one module per business domain, each with its own controller, service, and DTOs — mirroring the requirements sections directly so nothing gets lost in translation:

```
AppModule
├── AuthModule            – login, JWT, refresh, role guards
├── UsersModule           – operator/accountant/owner accounts
├── CustomersModule       – profiles, search, credit limit
├── OrdersModule          – 19L & PET orders, status computation
├── DeliveriesModule      – delivery completion, soft-block checks
├── BottleLedgerModule    – bottle asset ledger + reconciliation
├── InventoryModule       – items, stock derivation, low-stock alerts
├── ProductionModule      – PET production batches, auto-deduction
├── MineralCalcModule     – shared water/mineral-set fraction logic
├── PurchasingModule      – purchases, vendors, vendor payments
├── ExpensesModule        – operating expenses
├── DashboardModule       – live aggregate queries for the owner
├── ReportsModule         – daily/weekly/monthly/yearly rollups
├── FilesModule           – Cloudinary upload (house photos, docs)
└── SchedulerModule       – @nestjs/schedule: reminders, daily close
```

`MineralCalcModule` is deliberately pulled out as a shared service (not duplicated in Orders/Production/Deliveries) since the exact-fraction mineral math (Section 3 of requirements) is the single most error-prone calculation in the system and must live in exactly one place.

---

## 6. Folder Structure

```
aqua-sphere-os/
├── apps/
│   ├── web/                        # Next.js 15 frontend
│   │   ├── app/
│   │   │   ├── (auth)/login/
│   │   │   ├── (dashboard)/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── customers/
│   │   │   │   ├── orders/
│   │   │   │   │   ├── 19l/
│   │   │   │   │   └── pet/
│   │   │   │   ├── deliveries/
│   │   │   │   ├── bottles/         # bottle ledger views
│   │   │   │   ├── inventory/
│   │   │   │   ├── production/
│   │   │   │   ├── purchasing/
│   │   │   │   ├── expenses/
│   │   │   │   └── reports/
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── ui/                  # shadcn/ui primitives
│   │   │   ├── forms/
│   │   │   └── tables/
│   │   ├── hooks/                   # TanStack Query hooks per module
│   │   ├── store/                   # Zustand slices (session, ui)
│   │   ├── lib/                     # api client, zod schemas, utils
│   │   └── types/
│   │
│   └── api/                         # NestJS backend
│       ├── src/
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   ├── customers/
│       │   │   ├── orders/
│       │   │   ├── deliveries/
│       │   │   ├── bottle-ledger/
│       │   │   ├── inventory/
│       │   │   ├── production/
│       │   │   ├── mineral-calc/
│       │   │   ├── purchasing/
│       │   │   ├── expenses/
│       │   │   ├── dashboard/
│       │   │   ├── reports/
│       │   │   └── files/
│       │   │       (each: *.controller.ts, *.service.ts, dto/, entities/)
│       │   ├── common/
│       │   │   ├── guards/            # JwtAuthGuard, RolesGuard
│       │   │   ├── decorators/        # @Roles(), @CurrentUser()
│       │   │   ├── interceptors/
│       │   │   └── filters/
│       │   ├── prisma/
│       │   │   ├── schema.prisma
│       │   │   └── prisma.service.ts
│       │   └── main.ts
│       └── test/
│
├── packages/
│   └── shared-types/                 # DTOs/enums shared FE↔BE (optional)
│
└── prisma/migrations/
```

---

## 7. Tech Stack

| Layer | Choice |
|---|---|
| Frontend framework | Next.js 15 (App Router) |
| UI library | React 19 + TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui + Lucide icons |
| Animation | Framer Motion |
| Forms & validation | React Hook Form + Zod |
| Server state | TanStack Query |
| Global/client state | Zustand |
| Tables | TanStack Table |
| Charts | Recharts |
| Dates | date-fns |
| Backend framework | NestJS (Node.js LTS, TypeScript) |
| ORM | Prisma (+ Prisma Migrate) |
| Database | PostgreSQL |
| Auth | JWT + bcrypt |
| Uploads | Multer → Cloudinary |
| Validation (API) | class-validator + class-transformer |
| API docs | Swagger (OpenAPI) |
| Scheduled jobs | @nestjs/schedule |
| File storage | Cloudinary |
| PDF generation | PDFKit |
| Excel export | ExcelJS |

This is the confirmed stack from your tech-stack list — nothing added or substituted.

---

## 8. Naming Conventions

- **Files & folders**: `kebab-case` (`bottle-ledger.service.ts`, `order-item.dto.ts`).
- **Classes / Interfaces / DTOs**: `PascalCase` (`CreateOrderDto`, `BottleTransaction`).
- **Variables & functions**: `camelCase` (`getCustomerBalance`, `mineralFraction`).
- **Database tables (Prisma models)**: singular `PascalCase` in schema (`Customer`, `BottleTransaction`), mapped to snake_case tables via `@@map` for Postgres convention (`customer`, `bottle_transaction`).
- **Enums**: `PascalCase` type, `SCREAMING_SNAKE_CASE` members (`OrderType.NINETEEN_L`, `DeliveryStatus.PARTIAL`).
- **API routes**: plural, kebab-case resource names (`/customers`, `/orders/19l`, `/bottle-ledger`).
- **React components**: `PascalCase` (`CustomerSearchBar.tsx`); hooks prefixed `use` (`useCustomerBalance.ts`).
- **Zustand stores**: `useXStore` (`useSessionStore`).
- **Environment variables**: `SCREAMING_SNAKE_CASE`, prefixed by concern (`DATABASE_URL`, `JWT_ACCESS_SECRET`, `CLOUDINARY_API_KEY`).

---

## 9. API Structure

REST over JSON, versioned from day one (`/api/v1/...`), documented automatically via Swagger.

```
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh

GET    /api/v1/customers?search=
POST   /api/v1/customers
PATCH  /api/v1/customers/:id
DELETE /api/v1/customers/:id

POST   /api/v1/orders/19l
POST   /api/v1/orders/pet
GET    /api/v1/orders/pending
PATCH  /api/v1/orders/:id           # status recompute only, never direct edit

POST   /api/v1/deliveries           # creates delivery + triggers ledger updates
GET    /api/v1/bottle-ledger/summary
GET    /api/v1/bottle-ledger/:customerId

GET    /api/v1/inventory
POST   /api/v1/inventory/adjustments   # reason required

POST   /api/v1/production/pet-batch

POST   /api/v1/purchases
POST   /api/v1/vendor-payments

POST   /api/v1/expenses

GET    /api/v1/dashboard/summary
GET    /api/v1/reports/:period      # daily | weekly | monthly | yearly

POST   /api/v1/files/upload         # → Cloudinary, returns URL
```

**Conventions:**
- Every mutating endpoint that touches a balance returns the **recomputed balances**, not just a success flag — the frontend never re-derives numbers itself.
- Soft-block warnings come back as a structured `{ warning: true, message, currentValue, limit }` payload with a `200`, not an error — the operator can then resubmit with `confirm: true`. This keeps the "never hard-block" rule out of scattered `if` statements and into one consistent contract.
- All list endpoints support pagination + search query params, used by TanStack Table server-side pagination.

---

## 10. State Management

- **TanStack Query** owns all server state — customer records, orders, inventory, dashboard numbers. This is the single source of truth for anything from the API; it handles caching, background refetch, and optimistic updates for delivery/order actions so the UI feels instant even before the server confirms.
- **Zustand** owns only true client/UI state: current logged-in user + role, active order-desk draft (before submit), sidebar/UI toggles. It deliberately does **not** cache server data — that's Query's job, avoiding the classic bug of two sources of truth disagreeing.
- **React Hook Form + Zod** own form-local state and validation, decoupled from both of the above, with the same Zod schemas reused on the NestJS side (via class-validator equivalents) so validation rules are defined once conceptually and mirrored, not duplicated ad hoc.
- After any mutation (e.g. delivery completion), the relevant Query keys (`customer`, `order`, `bottle-ledger`, `dashboard`) are invalidated together, since one action legitimately changes many balances at once — this is enforced as a shared invalidation helper, not repeated per-mutation.

---

## 11. File Upload Strategy

- **Use case**: customer house photos (for driver identification) and any future documents (invoices, ID proofs).
- **Flow**: Frontend → `multipart/form-data` → NestJS `FilesModule` (Multer, memory storage, size/type validation) → forwarded to **Cloudinary** → Cloudinary URL saved on the `Customer` record (or relevant entity).
- **Nothing is stored on the API server's disk** — Multer only buffers in memory before handing off, which matters because the backend host is stateless/ephemeral on a free tier.
- **Validation**: image mime-types only, max size enforced both client-side (immediate feedback) and server-side (authoritative check).
- **Generated files** (invoices via PDFKit, report exports via ExcelJS) are generated on-demand in the API and streamed directly to the client — not persisted to Cloudinary, since they're reproducible from the transaction data at any time.

---

### How this maps back to the business

Every architectural choice above traces to a specific rule from the blueprint: the ledger-first database strategy implements "no manually-edited numbers" (Section 12); the soft-block API contract implements the credit/soft-block philosophy (Section 9); the shared `MineralCalcModule` implements the exact-fraction rule (Section 3); and the JWT + role-guard auth implements the operator/owner visibility split and admin-reset-needs-accountant-approval rule from the manager notes.
