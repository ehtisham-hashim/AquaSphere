# AquaSphere & Wadaana - Frontend Structure & Component Architecture

## 1. Application Routing & Page Map

The frontend application (`frontend/src/App.jsx`) uses React Router DOM v6 with route protection components (`ProtectedRoute`, `PublicRoute`).

```
App
 ├── AuthProvider (AuthContext.jsx)
 └── BrowserRouter
      ├── PublicRoute: /login (Login.jsx)
      └── ProtectedRoute: MainLayout.jsx
           ├── Index Route (/) -> DashboardRoleWrapper
           │    ├── OWNER -> AdminDashboard.jsx
           │    ├── ADMIN -> AdminDashboard.jsx
           │    ├── ACCOUNTANT -> AccountantDashboard.jsx
           │    └── Default -> Dashboard.jsx
           ├── /vendors -> Vendors.jsx
           ├── /purchases -> Purchases.jsx
           ├── /raw-materials -> RawMaterials.jsx
           ├── /production -> Production.jsx
           ├── /customers -> Customers.jsx
           ├── /orders -> Orders.jsx
           ├── /mm-orders -> MMOrders.jsx (Marketing Manager Orders)
           ├── /expenses -> Expenses.jsx
           ├── /counter-sales -> CounterSales.jsx
           ├── /users -> Users.jsx
           ├── /bottle-ledger -> BottleLedger.jsx
           └── /reports -> Reports.jsx
```

---

## 2. Layout & Global Component Tree

### Core Layout Component (`MainLayout.jsx`)
Encapsulates `Sidebar` and `TopNav` around page content.

### Top Navigation (`TopNav.jsx`)
- **Brand / Tenant Selector**: Displays active company badge (`AquaSphere` vs `Wadaana`). Switches active context dynamically via `setCompanyCookie(tenant)`.
- **Daily Financial Close Action**: Prompts the user with `DailyCloseModal` to lock system entries for the date.
- **Audit Logs Modal Launcher**: Displays `AuditLogsModal` for activity review.

### Sidebar Navigation (`Sidebar.jsx`)
Displays navigation items tailored to the logged-in user's role (`OWNER`, `ADMIN`, `PRODUCTION_MANAGER`, `ACCOUNTANT`, `MARKETING_MANAGER`).

---

## 3. Feature Components & Modals

### Dashboard Modules (`frontend/src/components/dashboard/`)
- `FinancialOverview.jsx`: Revenue, expenses, net profit, and receivables tiles.
- `CashSummaryTab.jsx`: Cash collected vs outstanding customer balances.
- `InventoryStatusTab.jsx`: Real-time raw material and finished goods stock levels.
- `OrderTrackingTab.jsx`: Pending vs delivered order counters.
- `PurchasingPayables.jsx`: Outstanding vendor payables summary.
- `CustomerAlertsTab.jsx`: Overdue credit limit / duration warnings.
- `LowStockWarning.jsx`: Instant warning banner when items drop below reorder levels.

### Order Management Modules (`frontend/src/components/orders/`)
- `OrdersTable.jsx`: Filterable data table for orders.
- `AddOrderModal.jsx` / `NewOrderModal.jsx`: Create order dialog with customer selection & price defaults.
- `EditOrderModal.jsx`: Edit order items prior to delivery.
- `ProcessDeliveryModal.jsx`: Record delivered quantities, empty bottle returns (good/broken), and cash collected.

### Customer Management Modules (`frontend/src/components/customer/`)
- `CustomersTable.jsx`: List of active customers with balance and bottle counts.
- `AddCustomerModal.jsx` / `AddCustomerInlineModal.jsx`: Form with Google Maps link validation and brand-specific product checkboxes.
- `CustomerProfileCard.jsx`: Profile view showing delivery history, credit limits, and bottle ledger.

### Raw Material & Production Modules (`frontend/src/components/rawMaterials/`)
- `RawMaterialsTable.jsx` & `RawMaterialsHeader.jsx`: Raw materials inventory view.
- `AddEditRawMaterialModal.jsx`: Create/edit raw material items and reorder thresholds.

---

## 4. State Management & API Interception

### Auth Context (`AuthContext.jsx`)
- Manages authentication state (`user`, `loading`).
- Executes automatic verification on initial load via `GET /api/v1/auth/me`.
- Implements `login(email, password, tenant)` and `logout()`.

### API Request Interceptor (`apiInterceptor.js`)
- Monkey-patches `window.fetch` to ensure all API calls targeting the backend include the HTTP header `'x-tenant': tenant`.

### Tenant Storage (`companyCookie.js`)
- Persists selected brand in cookies (`company`, `tenant`) and `localStorage`.
