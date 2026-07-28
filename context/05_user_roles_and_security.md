# AquaSphere & Wadaana - User Roles & System Security

## 1. System User Roles

The platform defines 5 distinct role levels in the database (`AquasphereRole` / `WadaanaRole` enums):

1. **`OWNER`**: Full executive authority across all domains in both AquaSphere and Wadaana tenants. Possesses sole privilege to override closed financial dates and permanently archive/delete customer records.
2. **`ADMIN`**: Managerial authority over operations, sales, customers, production, and accounting. Cannot override closed financial dates or delete customer records.
3. **`PRODUCTION_MANAGER`**: Dedicated access to production batch entry, raw material inventory monitoring, recipe tracking, and wastage logging.
4. **`ACCOUNTANT`**: Dedicated access to financial management, daily closes, vendor payables, expenses, customer credit limits, and financial reports.
5. **`MARKETING_MANAGER`**: Dedicated access to customer order generation, customer onboarding, and delivery tracking (`MMOrders.jsx`).

---

## 2. Role Permissions & Access Control Matrix

| Feature Domain | OWNER | ADMIN | PRODUCTION_MANAGER | ACCOUNTANT | MARKETING_MANAGER |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Executive Dashboard** | Yes | Yes | No | Partial | No |
| **User Management** | Full | View/Edit | No | No | No |
| **Customer Management** | Full | Add/Edit | View Only | View/Edit | Add/Edit |
| **Delete Customer** | **Owner Only** | No | No | No | No |
| **Order Placement & Edit** | Full | Full | View Only | Full | Full |
| **Process Order Delivery** | Full | Full | No | Full | Full |
| **Production Batches** | Full | Full | Full | View Only | No |
| **Vendor Procurement** | Full | Full | View Only | Full | No |
| **Expenses & Payables** | Full | Full | No | Full | No |
| **Perform Daily Close** | Full | Full | No | Full | No |
| **Override Closed Date** | **Owner Only** | No | No | No | No |
| **Audit Logs View** | Full | Full | No | View Only | No |

---

## 3. Security Implementation Details

### Authentication Flow (`auth.controller.js` & `auth.middleware.js`)
1. User authenticates via `POST /api/v1/auth/login` with `email`, `password`, and target `tenant`.
2. Passwords are verified against stored hashes using `bcryptjs`.
3. Upon success, a signed JWT token is issued containing user `id`, `email`, and `role`.
4. The token is attached as an `httpOnly` cookie (`token`) and returned in response payloads.
5. Outbound requests are validated by `verifyJWT` middleware.

### Cross-Tenant Administrative Switching
To allow owners and admins to manage both AquaSphere and Wadaana without needing separate accounts:
- If a user is not found in the requested schema user table, `verifyJWT` checks the secondary schema user table.
- Once identity is verified, operations proceed against the requested tenant schema context (`req.tenant`).

### Rate Limiting & HTTP Security
- **Express Rate Limit**: Applied globally to `/api/` endpoints (max 300 requests per 15 minutes).
- **Helmet Middleware**: Secures HTTP headers against XSS, clickjacking, and MIME sniffing.
- **CORS Policy**: Strictly restricted to origin configured in `process.env.FRONTEND_URL` (default `http://localhost:5173`) with `credentials: true`.
