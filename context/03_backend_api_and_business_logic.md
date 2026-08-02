# AquaSphere & Wadaana - Backend API & Business Logic

## 1. Express API Routing Architecture

All backend routes are mounted under the base path `/api/v1` in `backend/src/index.js`. Global middleware applies rate limiting (300 requests per 15-minute window), CORS with credentials, Helmet headers, JSON body parsing, and cookie parsing.

| Route Endpoint | Route File | Controller File | Key Capabilities |
| :--- | :--- | :--- | :--- |
| `/api/v1/auth` | `auth.routes.js` | `auth.controller.js` | Login, logout, session verification (`/me`) |
| `/api/v1/users` | `user.routes.js` | `user.controller.js` | User CRUD, role management, activation |
| `/api/v1/vendors` | `vendor.routes.js` | `vendor.controller.js` | Vendor master data & balance statement |
| `/api/v1/items` | `item.routes.js` | `item.controller.js` | Raw materials & finished goods inventory management |
| `/api/v1/production` | `production.routes.js` | `production.controller.js` | Batch execution, formula deduction, waste log |
| `/api/v1/customers` | `customer.routes.js` | `customer.controller.js` | Customer profiles, bottle & cash balances, soft delete |
| `/api/v1/orders` | `order.routes.js` | `order.controller.js` | Order creation, edit, delivery process, payment |
| `/api/v1/expenses` | `expense.routes.js` | `expense.controller.js` | Expense entry, category tracking, receipt upload |
| `/api/v1/purchases` | `purchase.routes.js` | `purchase.controller.js` | Vendor procurement, invoice recording, inventory credit |
| `/api/v1/analytics` | `analytics.routes.js` | `analytics.controller.js` | Financial KPIs, sales trends, stock alerts |
| `/api/v1/bottles` | `bottle.routes.js` | `bottle.controller.js` | Bottle ledger manual adjustments & returns |
| `/api/v1/spot-sales` | `spotSale.routes.js` | `spotSale.controller.js` | Counter sales (litres sold, caps issued, cash collected) |
| `/api/v1/daily-close` | `dailyClose.routes.js` | `dailyClose.controller.js` | Financial daily close trigger & status check |
| `/api/v1/reports` | `reports.routes.js` | `reports.controller.js` | Ledger export, PDF generation, performance summaries |
| `/api/v1/audit-logs` | `auditLog.routes.js` | `auditLog.controller.js` | System activity audit log retrieval |
| `/api/v1/admin` | `adminDashboard.routes.js` | `adminDashboard.controller.js` | Owner/Admin executive metrics & daily close control |

---

## 2. Core Business Logic & Formulas

### Production Batch Calculation (`productionFormulas.js`)
When a production batch is recorded, raw material deductions and finished goods additions are calculated using exact `Prisma.Decimal` arithmetic to avoid floating-point inaccuracies.

#### 0.5L PET Pack Specifications (12 Bottles / Pack)
- **Empty 0.5L Bottles**: 12 pcs
- **Small PET Caps**: 12 pcs
- **Labels**: 0.00672 kg (6.72g)
- **Shrink Wrap**: 0.02273 kg per pack (1 kg = 44 packs)
- **Water Consumption**: 9 Litres (6L product + 3L wash/flush allowance)

#### 1.5L PET Pack Specifications (6 Bottles / Pack)
- **Empty 1.5L Bottles**: 6 pcs
- **Small PET Caps**: 6 pcs
- **Labels**: 0.00780 kg (7.80g)
- **Shrink Wrap**: 0.025 kg per pack (1 kg = 40 packs)
- **Water Consumption**: 12 Litres (9L product + 3L wash/flush allowance)

#### Mineral Chemical Dosage (15,141 Litres Treated per Set)
For every batch, total litres processed are converted to a mineral set fraction:
$$\text{Mineral Set Fraction} = \frac{\text{Total Litres Processing}}{15,141}$$
Deductions:
- **Calcium**: $\text{Fraction} \times 2.0\text{ kg}$
- **Magnesium**: $\text{Fraction} \times 1.0\text{ kg}$
- **Sodium**: $\text{Fraction} \times 0.5\text{ kg}$

---

## 3. Critical Security & Integrity Middleware

### Daily Close Lock Middleware (`checkDailyCloseLock`)
- Inspects the incoming transaction date (`date`, `batchDate`, `purchaseDate`, or `deliveredAt`).
- Checks if a `DailyClose` record exists for that date or any later date in the active tenant schema.
- **Enforcement Rule**: If the date is closed, all write/edit operations (POST, PUT, DELETE) are rejected with HTTP 403 Forbidden, unless the authenticated user holds the `OWNER` role.

### Automatic Audit Logging
Controllers automatically write immutable logs to `AuditLog` for major business operations:
- `CUSTOMER_ADDED`, `CUSTOMER_DELETED`
- `ORDER_CREATED`, `ORDER_DELIVERED`
- `PRODUCTION_BATCH_RECORDED`
- `DAILY_CLOSE_PERFORMED`
