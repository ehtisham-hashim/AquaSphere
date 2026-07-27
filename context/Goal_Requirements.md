# Goal Requirements — AQUA Sphere OS (Production Build Specification)

> **Source:** Reverse-engineered from client-approved prototype (`/home/ehtisham/Desktop/Projects/Aqua-Prototype/public/`) & validated against PERN production project (`/home/ehtisham/Desktop/Projects/AquaSphere`).  
> **Status:** 85% Client-Approved Prototype Requirement Baseline  
> **Tech Stack:** PERN (PostgreSQL, Express, React, Node.js — Pure JavaScript ES6+)  

---

## 1. Executive Summary & Core Business Rules

AQUA Sphere OS is a multi-company water business management OS handling two distinct corporate divisions:
1. **Aquasphere**: Bottled water treatment, 19L refills, and 0.5L/1.5L PET pack distribution.
2. **Badana / Wadaana Industries**: Currently operates identically to Aquasphere (frontend and backend). Specialized B2B/Blowing machine features will be integrated later.


### Non-Negotiable Business Operating Principles
1. **Zero Data Leakage**: The two workspace contexts operate in complete isolation. Data never crosses between Aquasphere and Wadaana.
2. **No Manually-Edited Balances**: Inventory counts, customer balances, vendor payables, and bottle balances are strictly calculated from transaction ledgers.
3. **Soft-Block Philosophy**: Credit breaches or bottle return overages produce clear UI warnings and require explicit confirmation, but never hard-block front-desk operators mid-call.
4. **20-Second Order Target**: Searching a customer and completing an order entry must take under 20 seconds.
5. **Vendor Must Exist First**: Purchases can only be logged against pre-existing vendors.
6. **Mandatory Receipt Uploads**: All operating expenses and raw material purchases require physical receipt/bill photo attachment.
7. **Daily Closing Locks**: Once closed by Admin/Owner for a date, transaction modifications for that date are locked for all roles except Owner override.

---

## 2. Workspace & Multi-Tenant Context System

- **Dual Workspace Toggle**: Top header selector allowing instant switching between `Aquasphere` and `Wadaana Industries`.
- **API Context Routing**: Every frontend request sends header `x-company-context: aquasphere|wadaana`.
- **Dynamic Branding**: Invoices, headers, and reports automatically reflect active company branding.

---

## 3. User Roles & Permission Matrix

| Module / Action | Owner 👑 | Admin 🛡️ | Production Manager (PM) 🏭 | Marketing Manager (MM) 📞 | Accountant 💰 |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Financial Analytics & Profit** | ✅ Full | ❌ Hidden | ❌ Hidden | ❌ Hidden | ✅ Full |
| **Customer CRM (View/Search)** | ✅ Full | ✅ Full | ❌ Hidden | ✅ Full | ✅ Full |
| **Add New Customer** | ✅ Full | ❌ View | ❌ Hidden | ✅ Full | ✅ Full |
| **Delete Customer** | ✅ Only | ❌ Forbidden | ❌ Forbidden | ❌ Forbidden | ❌ Forbidden |
| **Order Entry (<20s)** | ✅ Full | ❌ View | ❌ View | ✅ Full | ❌ View |
| **Delivery Logging & Returns** | ✅ Full | ❌ View | ❌ View | ✅ Full | ❌ View |
| **Production Batch Creation** | ✅ Full | ❌ View | ✅ Full | ❌ Hidden | ❌ Hidden |
| **Blowing Machine Operations** | ✅ Full | ❌ View | ✅ Full | ❌ Hidden | ✅ Expenses |
| **Raw Material Purchases** | ✅ Full | ❌ View | ❌ View | ❌ Hidden | ✅ Full |
| **Operating Expenses (+Photo)** | ✅ Full | ❌ View | ❌ Hidden | ❌ Hidden | ✅ Full (Photo Req) |
| **Spot / Counter Sales** | ✅ Full | ❌ View | ❌ Hidden | ❌ Hidden | ✅ Full |
| **Daily Closing Lock** | ✅ Full | ✅ Execute | ❌ Hidden | ❌ Hidden | ❌ Hidden |
| **Lock Date Override** | ✅ Only | ❌ Forbidden | ❌ Forbidden | ❌ Forbidden | ❌ Forbidden |
| **Inventory Manual Adjustment** | ✅ Logged | ❌ Forbidden | ❌ Forbidden | ❌ Forbidden | ❌ Forbidden |

---

## 4. Module-by-Module Functional Specifications

### 4.1 Dashboard Module
- **KPI Cards**: Today's Sales (Rs.), Cash Collections (Rs.), Credit Sales (Rs.), Expenses (Rs.), Estimated Profit (COGS-based), Pending Orders Count, Completed Orders Count.
- **Chemical Stock Gauges**: Visual progress bars monitoring Sodium, Calcium, Magnesium against critical reorder thresholds.
- **Role-Based Filtering**:
  - Admin & PM see operational metrics without profit/margin figures.
  - Accountant sees financial cash flows without inventory gauges.
- **Alert Center**:
  - *CRM Alerts*: Inactivity (>1 week without order) & Credit breaches.
  - *Stock Alerts*: Reorder level warnings for raw materials and caps.

### 4.2 Customer Relationship Management (CRM)
- **Instant Search**: Search by Phone Number (primary unique key), Customer Name, or Customer ID.
- **Customer Fields**: Name, Phone, Address, Google Maps Location Link, Building Exterior Photo URL, Customer Category (`Home`, `Restaurant`, `Shop`, `Distributor`), Security Deposit (19L bottle count), Credit Limit (Rs., 0 = unlimited), Credit Duration (months), Default Price (Rs.), Remarks.
- **Dynamic Ledger Balances**:
  - Current Outstanding Cash Balance (Rs.)
  - 19L Bottle Balance (held by customer)
  - Last Delivery Date & Average Monthly Orders
- **In-Workflow Quick Add**: If search returns no result during order placement, "Add New Customer" modal opens inside the order workflow and auto-selects the newly created customer upon save.

### 4.3 Order Management System
- **Speed Target**: Completed in under 20 seconds.
- **Order Types (Strictly Segregated)**:
  1. **19L Reusable Refills**: Quantity ordered, price/amount charged, expected delivery date, remarks.
  2. **PET Packed Bottles**: 0.5L PET Packs (12 bottles/pack), 1.5L PET Packs (6 bottles/pack), price/amount charged, expected delivery date, remarks.
- **Dual Independent Status Tracking**:
  - *Delivery Status*: `pending` ➔ `partial` ➔ `delivered`
  - *Payment Status*: `unpaid` ➔ `partial` ➔ `paid`
- **Credit Limit Soft-Block**: If projected outstanding exceeds credit limit, displays warning modal with current balance, order total, and projected balance. Allows operator to confirm breach and proceed.

### 4.4 Delivery & Payment Execution
- **Delivery Logging**: Select order ➔ enter delivered quantities, empty bottle returns, and cash collected.
- **19L Delivery Logic**:
  - Inputs: Qty 19L delivered, Empty bottles returned (Good), Empty bottles returned (Broken), Cash received (Rs.), Payment method (`cash`, `bank`, `mobile_wallet`), Remarks, Delivery Date.
  - Soft-block check: If `returned_good + returned_broken` > customer's held bottle balance, displays warning requiring explicit confirmation.
  - Automatic Backend Triggers:
    1. Deduct 1 Large Cap per 19L bottle delivered.
    2. Deduct Mineral Sets based on 23L water treated per bottle (23 / 15,140 mineral set).
    3. Update Bottle Asset Ledger (+Delivered to customer, -Returned good/broken).
    4. Record Payment if cash received > 0.
    5. Recompute Order delivery and payment statuses.
- **PET Delivery Logic**:
  - Inputs: Qty 05L packs delivered, Qty 15L packs delivered, Cash received, Payment method, Remarks, Delivery Date.
  - Automatic Backend Triggers: Deducts finished goods 0.5L and 1.5L PET packs from inventory.

### 4.5 Production Management (AquaSphere PET & Water)
- **Batch Entry**: Select production date, enter 0.5L PET packs produced and 1.5L PET packs produced.
- **Automatic Raw Material & Formula Deductions**:
  - **0.5L Pack (12 bottles)**: Deducts 12 empty 0.5L bottles, 12 small caps, 6.72g labels (0.00672 kg), 50g shrink wrap (0.05 kg), 108L treated water. Adds 1 pack to 0.5L PET finished goods.
  - **1.5L Pack (6 bottles)**: Deducts 6 empty 1.5L bottles, 6 small caps, 7.86g labels (0.00786 kg), 50g shrink wrap (0.05 kg), 72L treated water. Adds 1 pack to 1.5L PET finished goods.
  - **Mineral Dosing Formula**: 1 Mineral Set = 2kg Calcium + 1kg Magnesium + 0.5kg Sodium = 15,140 Litres treated water. Deducts exact decimal fraction of mineral set.

### 4.6 Blowing Division (Badana / Wadaana Industries)
- **Current State**: Wadaana's frontend and backend operate as an identical mirror of Aquasphere. The `wadaana` database schema matches the `aquasphere` schema exactly.
- **Future B2B Expansion**: Specialized blowing machine logic (preform procurement, blowing production batches for clients like Deosani/Pivrifine, and B2B sales) will be developed in a future phase.

### 4.7 Purchasing & Vendor Management
- **Pre-requisite Rule**: Purchase form CANNOT be submitted without selecting an existing vendor. No inline vendor creation permitted.
- **Purchase Log**: Select Vendor, Item, Quantity, Unit Cost, Purchase Date, Bill Photo Upload (Mandatory).
- **Auto-Effects**: Adds stock to raw material inventory (or 19L bottle asset fleet if 19L empty bottles), updates vendor payable balance.
- **Vendor Payment**: Select Vendor, Amount (Rs.), Payment Method, Date, Remarks. Reduces vendor payable liability.

### 4.8 Operating Expenses
- **Expense Categories**: Fuel, Salaries, Electricity, Plant Rent, Vehicle Repair, Machine Repair, Miscellaneous.
- **Fields**: Category, Amount (Rs.), Date, Remarks, **Receipt Photo Upload (Mandatory for Accountant)**.
- **Financial Impact**: Deducts from profit calculation, zero impact on inventory counts.

### 4.9 Spot Sales (Counter Sales)
- **Use Case**: Walk-in retail sales to non-registered customers using personal containers.
- **Fields**: Total Water Sold (Litres), Caps Issued, Cash Collected (Rs.), Assigned Credit (if any).

### 4.10 Daily Closing System
- **Closing Execution**: Admin or Owner selects date and clicks "Close Day".
- **Lock Effect**: Immutable lock preventing entry or editing of any transaction dated on or before the closed date.
- **Override**: Only Owner role can bypass closed date lock.

### 4.11 19L Bottle Asset Ledger
- **Asset Equation**: Total Owned = At Factory + With Customers + Broken + Lost.
- **Transactions**: Purchased New (+Owned, +Factory), Delivered (+Customer, -Factory), Returned Good (+Factory, -Customer), Returned Broken (+Broken, -Customer), Marked Lost (-Owned), Factory Adjustment (Owner only, logged).

### 4.12 Reporting & Analytics
- **Periods**: Daily, Weekly, Monthly, Yearly filters.
- **Reports**: Sales Report, Expense Breakdown, Profitability & COGS Analysis, Production Efficiency, Customer Outstanding Credits, Vendor Payables, 19L Fleet Reconciliation Summary.

---

## 5. Prototype vs Production Database Schema Alignment (`schema.prisma`)

We performed a comprehensive audit comparing the client-approved prototype backend (`server.js` & `db.js`) against the production Prisma schema (`backend/prisma/schema.prisma`).

### 5.1 Alignment Breakdown

| Entity / Module | Prototype Implementation | Production Schema (`schema.prisma`) | Alignment Status | Notes / Adjustments Needed |
| :--- | :--- | :--- | :---: | :--- |
| **Multi-Tenancy** | Headers `x-company-context` (`aquasphere`/`badana`) | PostgreSQL multi-schema (`aquasphere`, `wadaana`) | ✅ 100% Aligned | Perfect isolation architecture. |
| **Customers** | ID, phone, name, address, mapsLocation, homePictureUrl, customerType, creditLimit, creditDuration, defaultPrice, remarks | `AquasphereCustomer` / `WadaanaCustomer` | ✅ 95% Aligned | Add `mapsLocation` & `homePictureUrl` mapping. |
| **Orders** | `orderType` (`19L`/`PET`), `qtyOrdered`, `qty05LOrdered`, `qty15LOrdered`, `amountCharged`, `expectedDelivery` | `AquasphereOrder` + `AquasphereOrderItem` | ✅ 95% Aligned | Schema uses relational `OrderItem` table which cleanly models single or multi-item PET orders. |
| **Deliveries** | `qtyDelivered`, `bottlesReturnedGood`, `bottlesReturnedBroken`, `qty05LDelivered`, `qty15LDelivered`, `cashReceived`, `paymentMethod` | `AquasphereDelivery` | ⚠️ Needs Field Addition | Add `qty05LDelivered` and `qty15LDelivered` columns to `Delivery` model for explicit PET delivery tracking. |
| **Bottle Ledger** | `bottle_transactions` table with 6 transaction types | `AquasphereBottleTransaction` / `WadaanaBottleTransaction` | ✅ 100% Aligned | Identical transaction types (`NEW_PURCHASE`, `DELIVERED_TO_CUSTOMER`, `RETURNED_GOOD`, `RETURNED_BROKEN`, `MARKED_LOST`, `AT_FACTORY_ADJUSTMENT`). |
| **Inventory** | `inventory_transactions` (`IN`/`OUT`, `itemId`, `refType`, `refId`, `createdAt`) | `AquasphereInventoryTransaction` / `WadaanaInventoryTransaction` | ✅ 100% Aligned | Perfectly mirrors prototype ledger mechanics. |
| **Production** | `qty05LProduced`, `qty15LProduced`, `mineralSetsConsumed` | `AquasphereProductionBatch` | ⚠️ Needs Field Addition | Add explicit `qty05LProduced`, `qty15LProduced`, and `mineralSetsConsumed` columns to `ProductionBatch` model. |
| **Purchases & Vendors** | `vendor_id`, `item_id`, `qty`, `unit_cost`, `total_cost`, `receipt_url` | `AquaspherePurchase`, `AquasphereVendor`, `AquasphereVendorPayment` | ✅ 100% Aligned | Includes mandatory receipt URL. |
| **Expenses** | `category`, `amount`, `date`, `remarks`, `receiptPhoto` | `AquasphereExpense` / `WadaanaExpense` | ✅ 100% Aligned | Includes mandatory receipt URL. |
| **Wadaana / B2B** | Identical to Aquasphere for now | `Wadaana*` (Identical models) | ✅ 100% Aligned | `wadaana` schema is exactly identical to `aquasphere`. Future B2B features will be added later without disrupting current parity. |

### 5.2 Summary Recommendation
The Prisma schema (`backend/prisma/schema.prisma`) already captures **over 85-90%** of the prototype's domain models. Applying the minor field adjustments noted above in Section 5.1 will ensure 100% seamless parity between the client-approved prototype frontend and the PERN stack backend.
