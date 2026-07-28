# AQUA Sphere OS — Codebase Summary & Comprehensive Developer Guide

**Target Audience:** Autonomous Coding Agents & Senior Engineers  
**Date:** 2026-07-28  
**Project:** AQUA Sphere OS (Aquasphere 19L/PET + Wadaana Industries B2B Blowing Machine)  

---

## 1. Executive Summary

AQUA Sphere OS is a PERN-stack (PostgreSQL NeonDB + Express + React Vite + Node) multi-tenant ERP system for a dual water purification and bottling business:
1. **Aquasphere**: Retail 19L home/office delivery & PET bottled water production.
2. **Wadaana Industries**: B2B PET bottle blowing factory (Preforms -> Blown Empty PET Bottles) & mineral water distribution.

### Current Codebase Status
- **Overall Completion:** ~60% (Phases 1–5 core flows scaffolded and functional; advanced operations, reports, & B2B expansion pending).
- **Database Schema:** 100% complete (22 tables across `aquasphere` and `wadaana` PostgreSQL schemas with Prisma ORM).
- **Core Workflows Implemented:** Auth JWT cookies, Customer CRM, Item Master, Production Batch Logging, Order Entry & Delivery Processing, Bottle Ledger, Expense & Purchase Recording, Spot Sales, Daily Close Lock, Admin & Owner Dashboards.

---

## 2. Tech Stack & System Architecture

### Backend Stack (`/backend`)
- **Runtime & Server:** Node.js (ES Modules), Express.js.
- **Database & ORM:** PostgreSQL (NeonDB) with Prisma ORM v6 (`prisma.config.ts`, `prisma/schema.prisma`).
- **Security & Headers:** `cors`, `helmet`, `cookie-parser`, `express-rate-limit`, JWT (`jsonwebtoken`), `bcryptjs`.
- **Media Uploads:** Cloudinary + Multer memory storage (`cloudinaryUpload.js`).

### Frontend Stack (`/frontend`)
- **Build Tooling:** React 18, Vite, React Router DOM v6.
- **Styling:** Vanilla CSS design system (`index.css`) + TailwindCSS v4 + Lucide React icons.
- **State & Interceptor:** `AuthContext.jsx`, `apiInterceptor.js` (global `fetch` monkey-patching for tenant headers).

---

## 3. Dual-Schema Multi-Tenancy Architecture

The database utilizes PostgreSQL native multi-schema isolation:
- Schema `aquasphere`: `customers`, `items`, `inventory_transactions`, `bottle_transactions`, `orders`, `order_items`, `deliveries`, `payments`, `production_batches`, `vendors`, `purchases`, `expenses`, `daily_closes`, `users`, `spot_sales`, `audit_logs`.
- Schema `wadaana`: Mirror tables for Wadaana context (`WadaanaCustomer`, `WadaanaOrder`, etc.).

### Context Header Routing
- Requests carry tenant header identifying active workspace.
- Middleware and controllers map `req.headers['x-tenant']` (or `x-company-context`) to model prefix:
  ```js
  const prefix = (req.headers['x-tenant'] || 'aquasphere').toLowerCase() === 'wadaana' ? 'wadaana' : 'aquasphere';
  // Dynamic Prisma call:
  await prisma[`${prefix}Customer`].findMany(...);
  ```

---

## 4. Architectural Approach: `src/companies/` vs `src/pages/`

### The Recommended Hybrid Approach
Having a `src/companies/` directory is useful for separating domain-specific modules between Aquasphere and Wadaana Industries without cluttering generic pages.

```
frontend/src/
├── pages/                    <-- Shared / Generic ERP Pages
│   ├── Login.jsx
│   ├── Users.jsx
│   ├── Expenses.jsx
│   ├── Vendors.jsx
│   └── Reports.jsx
├── companies/
│   ├── aquasphere/           <-- Aquasphere-Specific Features
│   │   ├── BottleLedger.jsx  (19L asset management)
│   │   └── RetailOrders.jsx  (19L & PET home delivery)
│   └── wadaana/              <-- Wadaana B2B-Specific Features
│       ├── PreformInventory.jsx (Pure vs Mix preforms)
│       ├── BlowingMachine.jsx   (Blowing production batches)
│       └── B2BCreditAlerts.jsx  (7-day credit & 30-day repeat alerts)
```

**Implementation Guideline:**
- Shared pages live in `src/pages/` and adjust via React context (`isWadaana`).
- Company-unique business workflows live inside `src/companies/aquasphere/` and `src/companies/wadaana/`.
- Avoid copying identical code into both company folders; extract common UI tables/modals into `src/components/`.

---

## 5. Master Business Formulas & Reorder Alert Levels (Owner Handwritten Specifications)

### A. Aquasphere Production & Water Formulas

1. **Label Consumption:**
   - **0.5L PET:** $0.56\text{ g}$ per bottle $\rightarrow 6.72\text{ g}$ per PET pack ($12\text{ bottles}$).
   - **1.5L PET:** $1.30\text{ g}$ per bottle $\rightarrow 7.80\text{ g}$ per PET pack ($6\text{ bottles}$).

2. **Mineral Set Dosage:**
   - $2\text{ kg Calcium (Ca)} + 1\text{ kg Magnesium (Mg)} + 0.5\text{ kg Sodium (Na)} = 15,141\text{ Litres treated water}$.

3. **Water Consumption (Production + Wash/Flush):**
   - **19L Bottle:** $24\text{L}$ total water per bottle ($19\text{L fill} + 5\text{L wash/flush}$).
   - **0.5L PET Pack (12 bottles):** $9\text{L}$ total water used.
   - **1.5L PET Pack (6 bottles):** $12\text{L}$ total water used.

4. **Caps & Bottles per Pack:**
   - **0.5L Pack:** $12\text{ small caps}$, $12\text{ empty 0.5L bottles}$.
   - **1.5L Pack:** $6\text{ small caps}$, $6\text{ empty 1.5L bottles}$.

5. **Aquasphere Inventory Reorder Alert Levels:**
   - **Labels:** 1.5L = $15\text{ kg}$, 0.5L = $10\text{ kg}$.
   - **Shrink Wrap:** $10\text{ kg}$.
   - **Minerals:** $\text{Ca} = 10\text{ kg}$, $\text{Mg} = 5\text{ kg}$, $\text{Na} = 3\text{ kg}$.
   - **Empty Bottles:** 1.5L = $6,000\text{ pcs}$, 0.5L = $6,000\text{ pcs}$.
   - **Finished PET Packs:** 1.5L = $1,000\text{ packs}$, 0.5L = $200\text{ packs}$.
   - **Caps:** Small = $6,000\text{ pcs}$, Large (Big 19L) = $500\text{ pcs}$.
   - **19L Bottles at Factory Threshold:** $50\text{ bottles}$.

---

### B. Wadaana Industries (Blowing Machine Division) Formulas & Schema Mapping

Wadaana operates as the **PET Bottle Blowing Factory**, converting raw PET preforms into blown empty bottles (`PURE_BOTTLES` or `MIX_BOTTLES`) for B2B clients and internal supply.

1. **Preform Consumption Weights:**
   - **Mixed Preform Bottles (`WadaanaOrderType.MIX_BOTTLES`):**
     - $1.5\text{L bottle} = 27\text{g preform}$
     - $0.5\text{L bottle} = 13\text{g preform}$
   - **Pure Preform Bottles (`WadaanaOrderType.PURE_BOTTLES`):**
     - $1.5\text{L bottle} = 30\text{g preform}$
     - $0.5\text{L bottle} = 15\text{g preform}$

2. **Customer Purchasing Schema Flags (`WadaanaCustomer`):**
   - `buysPure05L`, `buysPure15L` (Pure preform blown bottles).
   - `buysMix05L`, `buysMix15L` (Mix preform blown bottles).

3. **Wadaana Alert & Credit Rules:**
   - **Pure Preform Alert Level:** $100\text{ kg}$ (0.5L + 1.5L preform stock).
   - **Mix Preform Alert Level:** $100\text{ kg}$ (0.5L + 1.5L preform stock).
   - **Total Blown Bottle Stock (Factory + Warehouse):** Alert if total drops below $5,000\text{ pcs}$.
   - **B2B Customer Credit Alerts:**
     - Trigger alert if previous bill unpaid for $> 7\text{ days}$.
     - Trigger alert if order not repeated for $> 30\text{ days}$.

---

## 6. Comprehensive Audit Findings (Critical Flaws & Gaps)

### 🔴 Critical Flaws

1. **Water Consumption Formula Mismatch (Undercalculating Mineral Usage)**:
   - Frontend `Production.jsx` and backend `productionFormulas.js` use `6L` for 0.5L pack and `9L` for 1.5L pack.
   - Owner spec requires **9L** for 0.5L pack and **12L** for 1.5L pack (accounting for wash/flush/production loss).
   - *Impact:* Mineral set deductions are undercalculated by 33–50%.

2. **Tenant Isolation Vulnerability in Auth Middleware**:
   - `verifyJWT` searches `AquasphereUser` first, then falls back to `WadaanaUser`.
   - `req.user` attaches without validating if user belongs to requested `x-tenant` header.
   - *Impact:* Cross-tenant header manipulation risk.

3. **Client-Side Only Role Permission Checks**:
   - UI permissions (`canViewFinancials`) rely on React render conditions.
   - Backend `role.middleware.js` is not wired to all sensitive financial API endpoints.

4. **`cachedBalance` & Direct State Mutations**:
   - Direct mutations (`cachedQty: { decrement }`, `cachedBalance: { increment }`) without transaction ledger reconciliation CLI scripts.

### 🟡 Major Gaps

5. **Wadaana Feature Differentiation Missing**:
   - `wadaana/Production.jsx` is identical to `aquasphere/Production.jsx`. Needs Pure/Mix preform blowing logic (13g/15g/27g/30g) and removal of 19L Bottle Ledger / Counter Sales from Wadaana views.

6. **Enum Incompleteness in `DeliveryStatus`**:
   - `AquasphereDeliveryStatus` & `WadaanaDeliveryStatus` enums currently lack `PARTIAL` status (`PENDING | DELIVERED | CANCELLED`).

7. **Bottle Fleet Summary Calculation Defect**:
   - In `reports.controller.js`, running global sum `withCustomers -= t.quantity` does not calculate per-customer balances, risking negative counts.

8. **Undocumented SSE Endpoint**:
   - Real-time stream endpoint `/api/v1/analytics/dashboard/stream` powers live dashboard but is omitted from `architecture.md`.

### 🟠 Medium Gaps

9. **Empty Bottle Raw Material Deduction**: Production batch must deduct empty PET bottle stock alongside caps, labels, shrink wrap, and minerals.
10. **PM Daily Confirmation Persistence**: "PM Confirms Today" UI button does not store state to backend `DailyClose` or production batch.
11. **Daily Close Guard Enforcement**: `checkDailyCloseLock` middleware must be attached to all mutating routes (expenses, purchases, spot sales, customer edits).
12. **Invoice Generation (PDF)**: Server-side PDF generation endpoint (`/orders/:id/pdf`) is missing.
13. **Integration Test Coverage**: Automated tests missing for mineral calculation accuracy and delivery transaction cascades.

---

## 7. Action Plan & Roadmap Priorities

| Priority | Action Item | Target Location | Description |
| :--- | :--- | :--- | :--- |
| **P0** | Fix Water Consumption Math | `productionFormulas.js`, `Production.jsx`, `order.controller.js` | Update water to 9L (0.5L pack), 12L (1.5L pack), 24L (19L bottle). |
| **P0** | Enum Update: Add `PARTIAL` | `schema.prisma` | Add `PARTIAL` to `DeliveryStatus` enum in both schemas. |
| **P0** | Security: Enforce `role.middleware` & Tenant Lock | `auth.middleware.js`, `routes/*.js` | Enforce role check on all financial routes & matching tenant JWT claim. |
| **P1** | Daily Close Guard Middleware | `dailyClose.middleware.js`, `routes/*.js` | Attach `checkDailyCloseLock` to expenses, purchases, spot sales, customer edits. |
| **P1** | Fix Bottle Fleet Report Math | `reports.controller.js` | Compute net customer bottle balance per customer rather than naive global sum. |
| **P1** | Add Empty Bottle Production Deductions | `productionFormulas.js` | Deduct empty 0.5L (12 pcs) and 1.5L (6 pcs) bottles from raw inventory. |
| **P2** | Wadaana Preform & Blowing Division UI/API | `wadaana/`, `production.controller.js` | Implement Pure ($15\text{g}/30\text{g}$) vs Mix ($13\text{g}/27\text{g}$) preform blowing & 7d/30d B2B alerts. Remove 19L ledger from Wadaana. |
| **P2** | Reconcile Ledger CLI Script | `backend/scripts/reconcile-ledgers.js` | CLI tool to re-derive cached stock and balances from transaction ledgers. |
| **P3** | Invoice PDF Generation Endpoint | `backend/src/utils/pdfGenerator.js`, `order.controller.js` | Server-side invoice PDF generation using PDFKit. |
| **P3** | Document SSE Endpoint | `context/architecture.md` | Add `/api/v1/analytics/dashboard/stream` specs. |
| **P3** | Automated Integration Tests | `backend/tests/` | Add test coverage for mineral calculations & transaction cascades. |

---
*End of Summary Guide.*
