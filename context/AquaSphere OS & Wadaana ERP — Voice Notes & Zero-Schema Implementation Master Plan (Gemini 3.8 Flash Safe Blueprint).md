# **AquaSphere OS & Wadaana ERP — Voice Notes (1–11) Zero-Schema Implementation Master Plan**

**Target Model:** Gemini 3.8 Flash (Strict Boundary & Zero-Regression Edition)  
Repository: ehtisham-hashim/aquasphere  
Database Rule: ZERO changes to backend/prisma/schema.prisma (No migrations, no new tables, no enum changes)  
**Coexistence Rule:** Safe to execute **before or after** your colleague pushes the *Forensic Codebase Audit & Stabilization Plan* changes.

# **1\. Critical Guardrails for Gemini 3.8 Flash (Read Before Running Any Prompt)**

Lightweight models frequently break working features because they guess database columns, overwrite entire files, or touch unrelated modules. Every prompt in this document enforces **7 Hard Boundaries**:

| Boundary ID | The Trap That Breaks Code | Mandatory Zero-Schema Rule |
| :---- | :---- | :---- |
| **BOUNDARY-1** | **Prisma `PaymentType` Enum Crash (Voice Note 1\)** | In `prisma/schema.prisma`, `AquaspherePaymentType` and `WadaanaPaymentType` are **strict PostgreSQL Enums** containing ONLY `CASH`, `BANK_TRANSFER`, `CHEQUE`, `SECURITY_DEPOSIT`. Passing `'EASYPAISA'` or `'JAZZCASH'` into `Payment.create({ data: { type } })` **will crash the backend with a Prisma 500 error**. Always map `'EASYPAISA'` and `'JAZZCASH'` to `'BANK_TRANSFER'` inside `Payment.type`, while storing the exact string (`'EASYPAISA'` or `'JAZZCASH'`) in `Delivery.paymentMethod` (`String`), `SpotSale.paymentMethod` (`String`), `VendorPayment.paymentMethod` (`String`), and `AuditLog.details`. |
| **BOUNDARY-2** | **Zero Schema Alterations (Voice Notes 4, 5, 7, 10\)** | Do **NOT** edit `backend/prisma/schema.prisma`. Use the existing `AquasphereTenantSetting` / `WadaanaTenantSetting` (`key: String @unique, value: Json`) tables and `Order.remarks` / `Customer.remarks` to persist sequential Customer IDs (`JAM3130001`), Wadaana's 6 product preferences, customer NTN/STRN tax fields, and Order GST status (`[GST:18%]`). |
| **BOUNDARY-3** | **Coexistence with Colleague's Stabilization Fixes** | Your colleague is updating `role.middleware.js`, `ProcessDeliveryModal.jsx` (`packSize` multiplier), `order.controller.js` (`packSize` low-stock check & `updateOrder`), `AccountantDashboardView.jsx`, `order.routes.js` (`checkDailyCloseLock`), and deleting dead files (`NewOrderModal.jsx`, `Cars.jsx`, `TransportExpenses.jsx`). **Never overwrite an entire controller file**—only edit the exact functions specified in each module below, and preserve any `packSize` multipliers or `checkDailyCloseLock` middlewares if already present. |
| **BOUNDARY-4** | **Flat-Array API Envelope Contract** | Every list endpoint (`/orders`, `/customers`, `/items`, `/expenses`, etc.) **must** return `{ success: true, data: [...] }` where `data` is a flat array via `sendSuccess(res, array, 200, extra)`. Never nest arrays inside `data: { orders: [...] }`. |
| **BOUNDARY-5** | **Base Unit Storage Law (`packSize`)** | `Item.cachedQty`, `Item.factoryQty`, and `Item.warehouseQty` store **base bottles** (`packSize = 12` for 0.5L, `packSize = 6` for 1.5L, `packSize = 1` for 19L), whereas `OrderItem.quantity` stores **packs**. Whenever converting packs to inventory stock, multiply by \`Number(item.packSize |
| **BOUNDARY-6** | **Multi-Tenant Dynamic Model Resolution** | Always use `const prefix = getTenantPrefix(req);` and `prisma[\`\${prefix}Model\`\]`. Never hardcode` prisma.aquasphere...`or`prisma.wadaana...\`. |
| **BOUNDARY-7** | **One Module Per Prompt** | Feed Gemini 3.8 Flash **only ONE Module Prompt at a time** (Modules A through H below). Run `node --check` on backend files and `pnpm run build` in `frontend/` after each module before moving to the next. |

# **1.5 Blast Radius & Cross-Module Impact Matrix (Why Changing One File Affects Others)**

Before editing any payment, order, customer, or Wadaana product code, Gemini 3.8 Flash must account for these **5 hidden cross-file dependencies** discovered in the codebase:

# **1.6 Forensic Audit: Why Finished Goods Show in Decimals & How Production Raw Material / Breakage Deductions Actually Work**

## **A. Your 1-Month-Ago Production & Broken Bottle Formula Is 100% Intact (productionFormulas.js)**

In `backend/src/utils/productionFormulas.js` (`L16–84`), your production math works **exactly** as you designed it:

1. **Finished Goods Output Is Always Whole Packs:**  
   * `const baseUnitsAdded = Math.round(quantity * packSize);`  
   * When you produce **1 pack** of `0.5L PET` (`packSize = 12`) and enter **2 broken bottles** (`wasteQuantity = 2`), the system adds **exactly 12 base bottles (= 1 full pack, zero decimals)** to `Item.cachedQty` and `Item.factoryQty`.  
2. **Broken Bottles Are Deducted Exclusively from Raw Materials (Excluding Shrink Wrap):**  
   * Good output deducts `quantity * qtyPerUnit` (e.g., 12 bottles, 12 caps, 0.00672 kg labels, 0.02273 kg shrink wrap, plus minerals).  
   * Broken bottles (`wasteQuantity = 2`) check `if (wasteQuantity > 0 && !isShrinkFilm)` (`L46`) and deduct `(qtyPerUnit / packSize) * wasteQuantity` from Empty Bottles (+2), Small Caps (+2), Labels, and Minerals—while **never** deducting shrink wrap film for broken bottles.

## **B. Who Was the Culprit Behind Decimal Finished Goods? (3 Exact Causes Found)**

Your production code did **not** cause the decimals. The decimals on Finished Goods came from **three specific places**:

1. **Culprit \#1 — Counter Sales (Spot Sales) Selling Single Bottles \+ The .loose String Formatter (FinishedGoodsSummaryCards.jsx:L16 & L49 and CounterSalesStockBar.jsx:L9 & L79):**  
   * When Counter Sales (`spotSale.controller.js:L228–231`) sells a **Single Bottle** (`saleType === 'BOTTLE'`, e.g., 2 single 0.5L bottles instead of a 12-bottle pack), it deducts `2` base bottles from `0.5L PET`. If you had 1 pack (`12` bottles), `cachedQty` becomes `10` bottles.  
   * Then, `FinishedGoodsSummaryCards.jsx` (`L14–16`) and `CounterSalesStockBar.jsx` (`L7–9`) run:

```js
const packs = Math.floor(qty / packSize);
const loose = Math.round(qty % packSize);
return `${packs.toLocaleString()}${loose > 0 ? `.${loose}` : ''} Pk`;
```

   * Because it joins `packs` and `loose` with a **dot (.)**, `1 pack + 5 loose bottles` is printed as **1.5 Packs**, and `0 packs + 10 loose bottles` is printed as **0.10 Packs**—making it look like a decimal number\!  
2. **Culprit \#2 — The Migration Script backend/scripts/heal-spot-sales.js (L57–61):**  
   * Look at lines 57–61 of `backend/scripts/heal-spot-sales.js`:

```js
if (normalizedType.includes('SINGLE_05L')) {
  qtyToDeduct = qtyToDeduct / 12; // Deducted 0.0833333 bottles!
} else if (normalizedType.includes('SINGLE_15L')) {
  qtyToDeduct = qtyToDeduct / 6;  // Deducted 0.1666667 bottles!
}
```

   * Whoever wrote `heal-spot-sales.js` forgot that `Item.cachedQty` is stored in **base bottles**, not packs, so dividing by `12` or `6` injected actual floating-point decimals (`0.0833`, `0.1667`) into `cachedQty` and `factoryQty`\!  
3. **Culprit \#3 — Non-Multiple reorderLevel in backend/scripts/seed-production-bom.js (L134 & L151):**  
   * `seed-production-bom.js` seeded `0.5L PET` with `reorderLevel: 200` (bottles) and `1.5L PET` with `reorderLevel: 500` (bottles). Since `200 % 12 = 8` and `500 % 6 = 2`, the card alert badge prints **Alert: 16.8 Pk** and **Alert: 83.2 Pk**\!

## **C. How to Fix the Decimal Display Permanently (Add to Module C)**

* In `FinishedGoodsSummaryCards.jsx` and `CounterSalesStockBar.jsx`, never format packs and loose bottles with a decimal dot (`${packs}.${loose}`). Instead:  
  * Round `total` to the nearest integer bottle (`Math.round(total)`), and if `loose > 0`, display **\${packs} Packs (+\${loose} Btl)** (or if only full packs are traded, round to whole packs), and set `reorderLevel` in multiples of `packSize` (`200 * 12 = 2400` bottles \= `200 Packs`).  
* Disable/fix the `/ 12` and `/ 6` division in `backend/scripts/heal-spot-sales.js` so it deducts `1` base bottle per single bottle sold.

| Area Changed | Hidden Side Effect / Trap in Codebase | How This Plan Prevents Breakage |
| :---- | :---- | :---- |
| **1\. Customer Overdue Balance (`Customer.currentBalance`)** | `Customer.currentBalance` is incremented in **3 separate places**: (a) `deliverOrder` in `order.controller.js:L436`, (b) `createSpotSale` in `spotSale.controller.js:L557` (`debtAmount`), and (c) initial `currentBalance` in `createCustomer`. However, `createOrder` does **not** increment `currentBalance` until delivery, and `SpotSale` had **zero settlement endpoint**\! | Our unified FIFO settlement (`POST /api/v1/customers/:id/payment`) settles **both** unpaid `Order` rows (`UNPAID`/`PARTIAL`) **and** unpaid `SpotSale` rows (`debtAmount > 0`), creates `Payment` \+ `Delivery` records per settled order, decrements `SpotSale.debtAmount` & `creditAmount`, and deterministically syncs `Customer.currentBalance`. |
| **2\. SpotSale Cash Double-Counting Trap** | `analytics.controller.js` (`L179-215`) and `dailyClose.controller.js` (`L68-74`) calculate daily cash by summing `Payment.amount`**PLUS**`SpotSale.cashCollected`. If settling an old SpotSale increments `SpotSale.cashCollected` AND creates a `Payment` row, cash is double-counted if settled on the same day\! | When settling `SpotSale` debt, increment `SpotSale.amountPaid` and decrement `SpotSale.debtAmount` and `SpotSale.creditAmount` (so the Counter Sales UI badge turns `Cash / Paid in Full`), leave `SpotSale.cashCollected` as the initial counter cash, and record the new cash collection in `Payment` (`orderId: null, customerId`). |
| **3\. Owner Delete Rollbacks (`deleteOrder` & `deleteSpotSale`)** | When `OWNER` deletes a delivered `Order` (`order.controller.js:L593`) or a `SpotSale` (`spotSale.controller.js:L713`), it reverses unpaid debt from `Customer.currentBalance`. | Because FIFO settlement attaches `Payment` rows directly to each settled `orderId` and decrements `SpotSale.debtAmount`, subsequent Owner deletes only reverse any *remaining* unpaid balance and never drive `Customer.currentBalance` negative. |
| **4\. Overdue Alerts Truncation (`adminDashboard.controller.js`)** | `getCustomerAlerts` (`L278`) and `getNotificationAlerts` (`L383`) used `orders: { take: 5 }`. If a customer had 10–20 unpaid orders (Voice Note 4\) or unpaid `SpotSale` debt, orders \#6–\#20 and counter debts were ignored\! | Remove `take: 5` on unpaid order queries in `adminDashboard.controller.js`, include unpaid `spotSales`, and use `Customer.currentBalance` \+ all unpaid orders/spotSales. |
| **5\. Wadaana Hardcoded Product Names (Voice Note 10\)** | While `AddOrderModal.jsx` fetches dynamic `FINISHED_GOOD` items from `/api/v1/items`, **5 other files** hardcode generic `"0.5L Pure / 1.5L Pure / 0.5L Mix / 1.5L Mix"`: `wadaanaProducts.js`, `AddCustomerInlineModal.jsx`, `EditOrderModal.jsx`, `CustomersTable.jsx`, and `CustomerDetails.jsx`. Worse, `EditOrderModal.jsx` checks `name.includes('pure')` or `includes('mix')`, dumping `AquaSphere`, `Dasani`, and `Pure Fine` into `"OTHER FINISHED GOODS"`\! | Update all 6 files (`wadaanaProducts.js`, `CustomerFormFields.jsx`, `AddCustomerInlineModal.jsx`, `EditOrderModal.jsx`, `CustomersTable.jsx`, `CustomerDetails.jsx`) so Wadaana's 6 products (`AquaSphere 0.5L & 1.5L`, `Dasani 0.5L & 1.5L`, `Pure Fine 0.5L & 1.5L`) are consistent across Customer Registration, Inline Customer Creation, Order Booking, Order Editing, and Customer Profiles. |

# **1.7 Production Database Strategy (70 Live Customers): How Industry Teams Update PostgreSQL \+ Prisma Safely Without Losing a Single Row**

## **1\. Why You Do NOT Need to Create a New DB and Copy Data Over**

In PostgreSQL, you only dump-and-restore into a brand-new database when changing cloud providers or doing a destructive table rewrite. For adding enum values (`EASYPAISA`, `JAZZCASH`) or adding new optional columns (`customer_code`, `with_gst`, `buys_pure_fine_05l`), PostgreSQL supports **in-place, non-destructive DDL** (`ALTER TYPE ... ADD VALUE IF NOT EXISTS` and `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`) that executes in **\< 5 milliseconds** with **zero data loss** and **zero downtime** for your 70 customers.

## **2\. Why Prisma Sometimes Scares Developers (The "Drift" Trap)**

3. Your repository only has one initial migration folder (`prisma/migrations/20260719062154_init`), meaning later schema changes were applied via `prisma db push`.  
4. If someone runs `npx prisma migrate dev` against production, Prisma detects "drift" and asks to **reset (wipe)** the database. **Never run `prisma migrate dev` against production.**  
5. Furthermore, your `backend/Dockerfile` only runs `RUN npx prisma generate` during build and starts `CMD ["node", "src/index.js"]`—it does not run `prisma db push` automatically when deployed on Dokploy/Render.

## **3\. The Industry-Grade 3-Step Production Workflow for Your Exact Setup (Dockerfile \+ autoMigrations.js)**

If you want to add `EASYPAISA` and `JAZZCASH` directly to the PostgreSQL enums (`AquaspherePaymentType` & `WadaanaPaymentType`) so `Payment.type` stores them natively:

### **Step A — Always Take a 2-Second Backup First (Golden Insurance Rule)**

Before deploying any change, run this one-liner from your local terminal (or server shell) using your production `DATABASE_URL`:

```sh
pg_dump --format=custom --no-owner --no-acl "$DATABASE_URL" -f aquasphere_prod_backup_$(date +%F_%H%M).dump
```

*(For 70 customers, this `.dump` file is \~1–2 MB, takes 2 seconds, and can restore the entire database anytime via `pg_restore -d "$DATABASE_URL" file.dump`.)*

### **Step B — Add the Enum Values to backend/prisma/schema.prisma**

Update `AquaspherePaymentType` and `WadaanaPaymentType` in `backend/prisma/schema.prisma` so `npx prisma generate` (which runs automatically inside your `Dockerfile`) teaches the Prisma Client about `EASYPAISA` and `JAZZCASH`:

```
enum AquaspherePaymentType {
  CASH
  BANK_TRANSFER
  CHEQUE
  SECURITY_DEPOSIT
  EASYPAISA
  JAZZCASH

  @@map("payment_types")
  @@schema("aquasphere")
}

enum WadaanaPaymentType {
  CASH
  BANK_TRANSFER
  CHEQUE
  SECURITY_DEPOSIT
  EASYPAISA
  JAZZCASH

  @@map("payment_types")
  @@schema("wadaana")
}
```

### **Step C — Auto-Apply the Non-Destructive Enum Update on Server Startup (backend/src/utils/autoMigrations.js)**

Because `backend/src/index.js` (`L138`) already calls `await ensureShrinkWrapMaterials()` on every server boot, add this safe, idempotent SQL block at the very top of `ensureShrinkWrapMaterials()` in `backend/src/utils/autoMigrations.js`:

```js
export async function ensurePaymentMethodEnums() {
  const statements = [
    `ALTER TYPE "aquasphere"."payment_types" ADD VALUE IF NOT EXISTS 'EASYPAISA';`,
    `ALTER TYPE "aquasphere"."payment_types" ADD VALUE IF NOT EXISTS 'JAZZCASH';`,
    `ALTER TYPE "wadaana"."payment_types" ADD VALUE IF NOT EXISTS 'EASYPAISA';`,
    `ALTER TYPE "wadaana"."payment_types" ADD VALUE IF NOT EXISTS 'JAZZCASH';`
  ];
  for (const sql of statements) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch (_err) {
      // Safe no-op if value already exists
    }
  }
}
```

And call `await ensurePaymentMethodEnums();` at the start of `ensureShrinkWrapMaterials()`.

6. **Why this is 100% bulletproof:**  
   * `ADD VALUE IF NOT EXISTS` in PostgreSQL **cannot delete or alter existing rows**—your 70 customers and all historical payments remain untouched.  
   * When you push to `main` and Dokploy builds the Docker image, `npx prisma generate` updates the Prisma Client, and the moment the container starts, `ensurePaymentMethodEnums()` adds `EASYPAISA` and `JAZZCASH` to PostgreSQL automatically before the first user request arrives\!

# **2\. Master Mapping: All 11 Voice Notes & Media (Image 12 & PDF 13\) to Zero-Schema Solutions**

| Voice Note / Media | Business Requirement | Zero-Schema Technical Solution | Exact Files Allowed to Touch |
| :---- | :---- | :---- | :---- |
| **Voice Note 1** | Add **EasyPaisa** and **JazzCash** alongside Cash, Bank, and Cheque for nightly account reconciliation. | Store exact method (`CASH`, `BANK_TRANSFER`, `CHEQUE`, `EASYPAISA`, `JAZZCASH`) in `Delivery.paymentMethod`, `SpotSale.paymentMethod`, `VendorPayment.paymentMethod`, and `AuditLog.details`. Map `EASYPAISA`/`JAZZCASH` to `'BANK_TRANSFER'` when inserting into `Payment.type` enum. Create a 0-qty `Delivery` settlement row in `recordOrderPayment` and `deliverOrder` (Case 1\) so every order payment records its exact channel in `Delivery.paymentMethod`. | `backend/src/controllers/order.controller.js`, `frontend/src/components/orders/ProcessDeliveryModal.jsx`, `frontend/src/components/orders/RecordPaymentModal.jsx`, `frontend/src/components/counterSales/LogCounterSaleForm.jsx`, `frontend/src/components/vendors/VendorPaymentModal.jsx` |
| **Voice Note 2** | Add **"Cash Received" breakdown by channel** (Cash, Bank, EasyPaisa, JazzCash, Cheque) AND **revenue/cash breakdown by bottle size** (19L, 1.5L, 0.5L). Keep Daily/Monthly/Yearly toggles intact. | In `analytics.controller.js` (`computeDashboardAnalytics` & `getDailySummary`) and `adminDashboard.controller.js` (`getAdminCashSummary`), aggregate cash by channel (`CASH`, `BANK_TRANSFER`, `EASYPAISA`, `JAZZCASH`, `CHEQUE`) from `Delivery`, `SpotSale`, and fallback `Payment` rows, and aggregate sales & collected cash by bottle size (`19L`, `1.5L`, `0.5L`). Render breakdown cards in Dashboard & Cash Summary views without altering `TimeframeDropdown`. | `backend/src/controllers/analytics.controller.js`, `backend/src/controllers/adminDashboard.controller.js`, `frontend/src/components/dashboard/OwnerDashboardView.jsx`, `frontend/src/components/dashboard/AccountantDashboardView.jsx`, `frontend/src/components/dashboard/CashSummaryTab.jsx` |
| **Voice Note 3** | Dedicated **Unpaid Orders list view** across all sizes (0.5L, 1.5L, 19L) with filters for **Customer Type** (Home, Commercial, Industrial, Corporate, Distributor) and **Product Size** (0.5L, 1.5L, 19L). | Enhance `frontend/src/pages/Orders.jsx` `'Unpaid Orders'` tab with a **Product Size Filter** (`All Sizes`, `19L`, `1.5L`, `0.5L`), add `Industrial` to Customer Type filters/forms, and show per-order \+ customer total unpaid balance columns. | `frontend/src/pages/Orders.jsx`, `frontend/src/components/customer/CustomerFormFields.jsx` |
| **Voice Note 4 & Image 12** | **Running Balance Ledger:** Invoice must show `Current Bill + Previous Unpaid Balance = Total Balance Due`. Consolidate customer balance and allow **1-click lump-sum payment** clearing across multiple unpaid orders. | 1\. In `OrderInvoiceModal.jsx`, `receiptFormatter.js`, and `pdfGenerator.js`, compute `previousUnpaidBalance` from the customer's unpaid balance excluding the current order, and render: `Current Bill + Previous Unpaid Balance = Total Payable`, `Amount Paid`, and `Total Balance Due`. 2\. Add `POST /api/v1/customers/:id/payment` in `customer.controller.js` that settles all `UNPAID`/`PARTIAL` orders oldest-first (FIFO) in a single transaction and decrements `Customer.currentBalance`. | `backend/src/controllers/customer.controller.js`, `backend/src/routes/customer.routes.js`, `frontend/src/components/orders/OrderInvoiceModal.jsx`, `frontend/src/components/orders/RecordPaymentModal.jsx`, `frontend/src/utils/receiptFormatter.js`, `backend/src/utils/pdfGenerator.js`, `frontend/src/components/customer/CustomerDetails.jsx` |
| **Voice Note 5** | Re-enable sequential auto-generated **Customer IDs** (`JAM3130001`, `JAM3130002`, ...) upon registration \+ track marketer reference for commissions. | Store a sequential counter and customer metadata map in `TenantSetting` (`key: 'CUSTOMER_META_REGISTRY'`). Auto-assign `JAM3130001`, `JAM3130002`, ... to existing customers (by `createdAt ASC`) and new customers in `customer.controller.js`, and attach `customerCode` and `marketerRef` to every customer object returned by the API. Display `JAM313xxxx` badge and Marketer Reference field in Customer UI. | `backend/src/controllers/customer.controller.js`, `frontend/src/components/customer/CustomerFormFields.jsx`, `frontend/src/components/customer/CustomersTable.jsx`, `frontend/src/components/customer/CustomerDetails.jsx` |
| **Voice Note 6** | **Automated Month-End Billing / Statement:** View cumulative unpaid balance for every customer for the month and send **consolidated month-end invoice images** via WhatsApp. | Add a **"Month-End Unpaid Statements"** tab in `Orders.jsx` that aggregates all unpaid/partial orders per customer for the selected month, and dispatches a rendered PNG statement image via `shareOrSendReceiptWhatsApp` showing all monthly deliveries \+ total accumulated balance due. | `frontend/src/pages/Orders.jsx`, `frontend/src/utils/receiptFormatter.js` |
| **Voice Note 7, Image 12 & PDF 13** | **18% GST Support & FBR Sales Tax Invoice:** Option to toggle 18% GST on order creation and on invoice modal; persist GST so 18% tax-inclusive total is recorded in sales, customer balance, and cash records; match PDF 13 FBR template (STRN `E208741-4`, Buyer NTN/STRN, Meezan Bank `PK32MEZN0003340115746668`). | Store `[GST:18%]` tag in `Order.remarks` (and `ORDER_GST_REGISTRY` in `TenantSetting`). Add `PATCH /api/v1/orders/:id/gst` to toggle GST on existing orders and adjust `Customer.currentBalance` by the 18% tax delta if delivered. Use a shared `getOrderTotalWithGst(order)` calculation across backend & frontend, and format GST invoices with full FBR tax columns and Meezan Bank IBAN. | `backend/src/controllers/order.controller.js`, `backend/src/routes/order.routes.js`, `backend/src/controllers/analytics.controller.js`, `backend/src/controllers/dailyClose.controller.js`, `backend/src/utils/pdfGenerator.js`, `frontend/src/components/orders/AddOrderModal.jsx`, `frontend/src/components/orders/OrderInvoiceModal.jsx`, `frontend/src/utils/receiptFormatter.js` |
| **Voice Note 8 & Image 12** | **Restore Direct WhatsApp Chat Navigation with Image:** Clicking "Send WhatsApp" must open the customer's direct chat (`923...`) instead of the generic contact picker, while sending the invoice image. | In `frontend/src/utils/receiptFormatter.js` (`shareOrSendReceiptWhatsApp`), remove the `navigator.share({ files })` intercept (which strips the phone number and opens the generic OS contact picker). Always copy the rendered PNG invoice image to the clipboard (or download fallback) and immediately call `openWhatsAppWeb(phone, '', { preserveClipboard: true })` to open the customer's direct WhatsApp chat. | `frontend/src/utils/receiptFormatter.js` |
| **Voice Note 9** | **Strict Tenant Isolation Between AquaSphere & Wadaana Owner Portals:** Logging into AquaSphere must never allow cross-access to Wadaana Industries in the same session. | 1\. In `backend/src/middlewares/auth.middleware.js`, remove the cross-tenant `OWNER` fallback block (lines 57–95) and enforce `decodedToken.tenant === requestedPrefix`. 2\. In `frontend/src/components/layout/TopNav.jsx`, remove the header company switcher buttons (`AQ / WD`). 3\. In `AuthContext.jsx`, lock active cookie tenant to `user.tenant`. | `backend/src/middlewares/auth.middleware.js`, `backend/src/controllers/auth.controller.js`, `frontend/src/components/layout/TopNav.jsx`, `frontend/src/context/AuthContext.jsx` |
| **Voice Note 10** | **Wadaana Customer Registration 6 Product Options:** Show the exact 6 products (`AquaSphere 0.5L & 1.5L`, `Dasani 0.5L & 1.5L`, `Pure Fine 0.5L & 1.5L`) instead of generic "Pure & Mix". | Update `WADAANA_BOTTLE_CATALOG` in `frontend/src/constants/wadaanaProducts.js` to define all 6 products. In `customer.controller.js`, map the first 4 to `buysPure05L/15L` & `buysMix05L/15L` and persist all 6 in `TenantSetting` (`CUSTOMER_META_REGISTRY`) so all 6 are saved and returned without altering `WadaanaCustomer` schema. | `frontend/src/constants/wadaanaProducts.js`, `backend/src/controllers/customer.controller.js`, `frontend/src/components/customer/CustomersTable.jsx`, `frontend/src/components/customer/CustomerDetails.jsx` |
| **Voice Note 11** | **Editable Finished Goods Inventory Stock:** Provide a clear option to edit finished product inventory in both AquaSphere and Wadaana (just like raw materials). | 1\. In `FinishedGoodsSummaryCards.jsx`, add a visible **`Edit Stock`** button (`Edit2` icon) on every finished good card. 2\. In `Inventory.jsx`, allow `OWNER`, `ADMIN`, and `PRODUCTION_MANAGER` to open `AddEditFinishedGoodModal.jsx`. 3\. In `AddEditFinishedGoodModal.jsx`, support editing stock in **Base Bottles or Packs** (multiplying by `packSize` when saving to `factoryStock`/`warehouseStock`) including resetting stock to `0`. | `frontend/src/components/inventory/FinishedGoodsSummaryCards.jsx`, `frontend/src/pages/Inventory.jsx`, `frontend/src/components/inventory/AddEditFinishedGoodModal.jsx`, `backend/src/controllers/item.controller.js` |

# **3\. Step-by-Step Copy-Paste Prompts for Gemini 3.8 Flash (Modules A–H)**

Feed the following **8 isolated modules** to Gemini 3.8 Flash **one module at a time**. Do not combine them into a single prompt.

# **MODULE A: Voice Note 9 — Strict Tenant Isolation (AquaSphere vs. Wadaana Session Lock)**

Copy-Paste Prompt for Module A:t  
TASK: Fix the tenant isolation and session leak issue between AquaSphere and Wadaana Industries (Voice Note 9).  
STRICT BOUNDARIES:

* ONLY edit these 4 files:  
  1. backend/src/middlewares/auth.middleware.js  
  2. backend/src/controllers/auth.controller.js  
  3. frontend/src/components/layout/TopNav.jsx  
  4. frontend/src/context/AuthContext.jsx  
* DO NOT touch prisma/schema.prisma or any other file.

EXACT INSTRUCTIONS:

1. In `backend/src/middlewares/auth.middleware.js`:  
   * Inside `verifyJWT`:  
     After `const requestedPrefix = getTenantPrefix(req);`, verify that the JWT's tenant matches `requestedPrefix`:const tokenTenant \= (decodedToken.tenant \|\| 'aquasphere').toLowerCase();  
       
     if (tokenTenant \!== requestedPrefix) {  
       
       throw new ApiError(401, 'Session belongs to a different company tenant. Please log in with credentials for this company.');  
       
     }  
       
   * DELETE the entire fallback tenant lookup block (`if (!user) { const fallbackPrefix = ... }`) so a user logged into `aquasphere` can NEVER resolve or bind to a `wadaana` account (and vice versa).  
   * Ensure `user` is looked up strictly in `prisma[\`\${requestedPrefix}User\`\].findUnique({ where: { id: decodedToken.id }, select: { id: true, email: true, name: true, role: true, isActive: true } })`. If` \!user \|\| \!user.isActive`, throw` new ApiError(401, 'Invalid access token or user is inactive')\`.  
   * Attach `tenant: requestedPrefix` onto the cached user object (`const userWithTenant = { ...user, tenant: requestedPrefix };`).  
2. In `backend/src/controllers/auth.controller.js`:  
   * In `getMe`, return `user: { ...req.user, tenant: req.tenant || req.user?.tenant || 'aquasphere' }`.  
3. In `frontend/src/components/layout/TopNav.jsx`:  
   * Remove the header tenant switcher buttons (`canSwitchTenant` / `handleTenantSwitch` block that renders the `AquaSphere` and `Wadaana Ind.` toggle buttons in the top navbar). Instead, display a static read-only company badge showing `isWadaana ? 'Wadaana Ind.' : 'AquaSphere'`.  
4. In `frontend/src/context/AuthContext.jsx`:  
   * Inside `verifyUser()`, when `response.ok` and `data?.data?.user` is returned:  
     If `data.data.user.tenant` exists, call `setCompanyCookie(data.data.user.tenant)` so the frontend tenant state is strictly locked to the authenticated JWT's tenant.

\#\# MODULE B: Voice Note 8 — Direct WhatsApp Chat Navigation with Invoice Image

\*\*Copy-Paste Prompt for Module B:\*\*

\`\`\`text

TASK: Fix "Send WhatsApp" so it opens the customer's direct WhatsApp chat window using their stored phone number while keeping the rendered invoice image ready to paste/attach (Voice Note 8).

STRICT BOUNDARIES:

\- ONLY edit \`frontend/src/utils/receiptFormatter.js\`.

\- DO NOT edit any backend files or \`prisma/schema.prisma\`.

EXACT INSTRUCTIONS:

1\. In \`frontend/src/utils/receiptFormatter.js\`, locate \`export async function shareOrSendReceiptWhatsApp({ phone \= '', text \= '', receiptData \= null, elementId \= null, filename \= 'AquaSphere\_Receipt.png' })\`.

2\. Remove or bypass the \`navigator.share({ files: \[file\] })\` block whenever \`phone\` is provided\! Why: \`navigator.share\` does not support a recipient phone number and forces the user into a generic contact picker instead of opening the customer's direct chat.

3\. Update \`shareOrSendReceiptWhatsApp\` so that:

   \- It renders \`canvas\` via \`renderReceiptToCanvas(receiptData)\` (or \`html2canvas\` fallback) and creates the PNG \`blob\`.

   \- It writes the PNG \`blob\` directly to the system clipboard using \`navigator.clipboard.write(\[new ClipboardItem({ 'image/png': blob })\])\`.

   \- If clipboard write fails (e.g., browser permissions), it calls \`downloadCanvasAsImage(canvas, filename)\` so the PNG file is downloaded.

   \- It ALWAYS calls \`openWhatsAppWeb(phone, '', { preserveClipboard: true })\` which normalizes \`phone\` (e.g. \`03456789012\` \-\> \`923456789012\`) and navigates directly to that customer's WhatsApp chat (\`whatsapp://send?phone=92...\` or \`https\://web.whatsapp.com/send?phone=92...\`).

   \- Returns \`{ success: true, method: copiedToClipboard ? 'clipboard' : 'download' }\`.

# **MODULE C: Voice Note 11 — Editable Finished Goods Inventory Stock (AquaSphere & Wadaana)**

**Copy-Paste Prompt for Module C:**TASK: Enable editing finished goods inventory stock in both AquaSphere and Wadaana Industries (Voice Note 11).

STRICT BOUNDARIES:

\- ONLY edit these 3 files:

  1\. \`frontend/src/components/inventory/FinishedGoodsSummaryCards.jsx\`

  2\. \`frontend/src/pages/Inventory.jsx\`

  3\. \`frontend/src/components/inventory/AddEditFinishedGoodModal.jsx\`

\- DO NOT touch \`prisma/schema.prisma\`.

\- Respect the Base Unit Storage Law (\`packSize\`): \`Item.factoryQty\`, \`Item.warehouseQty\`, and \`Item.cachedQty\` in the database are stored in \*\*base bottles\*\*, while packed items (\`packSize \> 1\`) display in \*\*Packs\*\*.

EXACT INSTRUCTIONS:

1\. In \`frontend/src/pages/Inventory.jsx\`:

   \- Update \`const canAddFinishedGood \= isOwner \|\| user?.role \=== 'ADMIN' \|\| user?.role \=== 'PRODUCTION\_MANAGER';\` so Owner, Admin, and Production Manager can edit finished goods stock (matching \`PUT /api/v1/items/:id\` permissions in \`item.routes.js\`).

2\. In \`frontend/src/components/inventory/FinishedGoodsSummaryCards.jsx\`:

   \- Import \`Edit2\` from \`'lucide-react'\`.

   \- Next to the status badge / delete button on each card (around lines 60–88), add an explicit, clearly visible \*\*Edit Stock\*\* button whenever \`onEditItem\` is provided:

     \`\`\`jsx

     {onEditItem && (

       \<button

         type="button"

         onClick={(e) \=\> {

           e.stopPropagation();

           onEditItem(item);

         }}

         className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-brand hover:text-white border border-slate-200 transition"

         title="Edit Finished Good Stock & Recipe"

       \>

         \<Edit2 size={12} /\>

         \<span\>Edit Stock\</span\>

       \</button\>

     )}

     \`\`\`

3\. In \`frontend/src/components/inventory/AddEditFinishedGoodModal.jsx\`:

   \- Remember that the backend (\`item.controller.js\`) forces \`item.unit \= 'bottle'\` and stores \`factoryQty\` and \`warehouseQty\` in \*\*base bottles\*\*, while \`packSize\` is \`12\` (for 0.5L) or \`6\` (for 1.5L) or \`1\` (for 19L / Wadaana preforms).

   \- Add a stock input mode toggle inside the modal when \`parseInt(packSize, 10\) \> 1\`: allow the user to enter stock in \*\*Packs\*\* (default when \`packSize \> 1\`) or \*\*Base Bottles\*\*.

   \- When \`itemToEdit\` loads:

     \- If \`itemToEdit.packSize \> 1\`, initialize \`factoryStock\` to \`String(Number(effectiveFac) / Number(itemToEdit.packSize))\` and \`warehouseStock\` to \`String(Number(effectiveWh) / Number(itemToEdit.packSize))\` in Packs mode (or exact bottles in Bottles mode).

   \- In \`handleSubmit\`:

     \- Multiply the entered \`factoryStock\` and \`warehouseStock\` by \`packMultiplier\` (\`stockInputMode \=== 'packs' && parsedPackSize \> 1 ? parsedPackSize : 1\`) before sending \`factoryStock\` and \`warehouseStock\` in the \`PUT /items/:id\` or \`POST /items\` JSON body\!

     \- Add a quick \`"Reset Stock to 0"\` button inside the "Adjust Stock by Location" box so the Owner/Admin can zero out dummy finished goods stock in 1 click.

# **MODULE D: Voice Notes 5 & 10 — Sequential Customer IDs (JAM3130001) \+ Fixing All Hardcoded Wadaana Product Screens**

**Why Wadaana Looked Hardcoded:**\- In `AddOrderModal.jsx`, order items are fetched from `/api/v1/items?type=FINISHED_GOOD` (which shows the 6 seeded items: `AquaSphere 0.5L`, `AquaSphere 1.5L`, `Dasani 0.5L`, `Dasani 1.5L`, `Pure Fine 0.5L`, `Pure Fine 1.5L` — unless the Wadaana DB wasn't seeded yet).  
\- **However**, `frontend/src/constants/wadaanaProducts.js`, `frontend/src/components/customer/AddCustomerInlineModal.jsx`, `frontend/src/components/orders/EditOrderModal.jsx`, `frontend/src/components/customer/CustomersTable.jsx`, `frontend/src/components/customer/CustomerDetails.jsx`, and `frontend/src/components/customer/CustomerProfileCard.jsx`**were hardcoded** to generic `0.5L Pure / 1.5L Pure / 0.5L Mix / 1.5L Mix`\!

**Copy-Paste Prompt for Module D:**

````c
TASK:
1. Auto-generate sequential Customer IDs (`JAM3130001`, `JAM3130002`, ...) upon customer registration and support Marketer Reference tracking for commissions (Voice Note 5).
2. Replace all hardcoded generic Wadaana "Pure / Mix" product options across Customer Registration, Inline Customer Modal, Edit Order Modal, and Customer Profile views with the exact 6 Wadaana products (`AquaSphere 0.5L`, `AquaSphere 1.5L`, `Dasani 0.5L`, `Dasani 1.5L`, `Pure Fine 0.5L`, `Pure Fine 1.5L`), and ensure Wadaana's 6 finished goods are auto-seeded in `autoMigrations.js` if missing (Voice Note 10).

STRICT BOUNDARIES:
- DO NOT alter `backend/prisma/schema.prisma`.
- ONLY edit these 8 files:
  1. `frontend/src/constants/wadaanaProducts.js`
  2. `backend/src/utils/autoMigrations.js`
  3. `backend/src/controllers/customer.controller.js`
  4. `frontend/src/components/customer/CustomerFormFields.jsx`
  5. `frontend/src/components/customer/AddCustomerInlineModal.jsx`
  6. `frontend/src/components/customer/CustomersTable.jsx`
  7. `frontend/src/components/customer/CustomerDetails.jsx`
  8. `frontend/src/components/orders/EditOrderModal.jsx`

EXACT INSTRUCTIONS:
1. In `frontend/src/constants/wadaanaProducts.js`:
   Replace `WADAANA_BOTTLE_CATALOG` with the exact 6 Wadaana products:
   ```js
   export const WADAANA_BOTTLE_CATALOG = [
     {
       id: 'AQUASPHERE_05L',
       name: 'AquaSphere 0.5L',
       displayName: 'AquaSphere 0.5L',
       category: 'AQUASPHERE',
       categoryLabel: 'AQUASPHERE BOTTLES (PURE BLUE)',
       grammage: '15g',
       customerBuyField: 'buysPure05L',
       customerQtyField: 'qtyPure05L',
       defaultPrice: 15,
       unit: 'Bottles'
     },
     {
       id: 'AQUASPHERE_15L',
       name: 'AquaSphere 1.5L',
       displayName: 'AquaSphere 1.5L',
       category: 'AQUASPHERE',
       categoryLabel: 'AQUASPHERE BOTTLES (PURE BLUE)',
       grammage: '30g',
       customerBuyField: 'buysPure15L',
       customerQtyField: 'qtyPure15L',
       defaultPrice: 30,
       unit: 'Bottles'
     },
     {
       id: 'DASANI_05L',
       name: 'Dasani 0.5L',
       displayName: 'Dasani 0.5L',
       category: 'DASANI',
       categoryLabel: 'DASANI BOTTLES (MIX BLUE)',
       grammage: '13g',
       customerBuyField: 'buysMix05L',
       customerQtyField: 'qtyMix05L',
       defaultPrice: 13,
       unit: 'Bottles'
     },
     {
       id: 'DASANI_15L',
       name: 'Dasani 1.5L',
       displayName: 'Dasani 1.5L',
       category: 'DASANI',
       categoryLabel: 'DASANI BOTTLES (MIX BLUE)',
       grammage: '27g',
       customerBuyField: 'buysMix15L',
       customerQtyField: 'qtyMix15L',
       defaultPrice: 27,
       unit: 'Bottles'
     },
     {
       id: 'PUREFINE_05L',
       name: 'Pure Fine 0.5L',
       displayName: 'Pure Fine 0.5L',
       category: 'PURE_FINE',
       categoryLabel: 'PURE FINE BOTTLES (PURE WHITE)',
       grammage: '15g',
       customerBuyField: 'buysPureFine05L',
       customerQtyField: 'qtyPureFine05L',
       defaultPrice: 15,
       unit: 'Bottles'
     },
     {
       id: 'PUREFINE_15L',
       name: 'Pure Fine 1.5L',
       displayName: 'Pure Fine 1.5L',
       category: 'PURE_FINE',
       categoryLabel: 'PURE FINE BOTTLES (PURE WHITE)',
       grammage: '30g',
       customerBuyField: 'buysPureFine15L',
       customerQtyField: 'qtyPureFine15L',
       defaultPrice: 30,
       unit: 'Bottles'
     }
   ];
   ```

2. In `backend/src/utils/autoMigrations.js`:
   Inside the `Verify Wadaana Preform Recipes` `try` block (around line 197), ensure that if any of the 6 Wadaana `FINISHED_GOOD` items (`AquaSphere 0.5L`, `AquaSphere 1.5L`, `Dasani 0.5L`, `Dasani 1.5L`, `Pure Fine 0.5L`, `Pure Fine 1.5L`) do not exist in `prisma.wadaanaItem`, they are automatically created with `type: 'FINISHED_GOOD', unit: 'bottle', packSize: 1` (and if legacy generic `'0.5L Pure Preform Bottle'` items exist, rename/map them cleanly) so `AddOrderModal.jsx` and `EditOrderModal.jsx` always display the exact 6 products.

3. In `backend/src/controllers/customer.controller.js`:
   - Add a helper `syncCustomerMetaRegistry(prefix, customersList, updatesById = null)` using `prisma[\`${prefix}TenantSetting\`]` with `key: 'CUSTOMER_META_REGISTRY'`.
   - Structure of `setting.value`:
     `{ nextSeq: 1, byCustomerId: { [id]: { customerCode: 'JAM3130001', marketerRef: '', buysPureFine05L: false, qtyPureFine05L: 0, buysPureFine15L: false, qtyPureFine15L: 0, buyerNtn: '', buyerStrn: '' } } }`.
   - For any customer without a `customerCode`, assign `JAM313${String(nextSeq++).padStart(4, '0')}` in chronological order of `createdAt`.
   - In `createCustomer` and `updateCustomer`: save the Prisma-supported columns (`buysPure05L`, `buysPure15L`, `buysMix05L`, `buysMix15L`) to `prisma[\`${prefix}Customer\`]`, and save `marketerRef`, `buysPureFine05L`, `qtyPureFine05L`, `buysPureFine15L`, `qtyPureFine15L`, `buyerNtn`, `buyerStrn` into `CUSTOMER_META_REGISTRY`.
   - In `getCustomers` and `getCustomerDetails`: merge the registry fields onto every returned customer object, and allow `search` in `getCustomers` to match `customerCode` (e.g. `JAM3130001`) or `marketerRef`.

4. In `frontend/src/components/customer/CustomerFormFields.jsx` and `frontend/src/components/customer/AddCustomerInlineModal.jsx`:
   - Use `CustomerFormFields` (or `getTenantCatalog('wadaana')`) in both modals so both display all 6 Wadaana products (`AquaSphere 0.5L`, `AquaSphere 1.5L`, `Dasani 0.5L`, `Dasani 1.5L`, `Pure Fine 0.5L`, `Pure Fine 1.5L`).
   - Add `<option value="Industrial">Industrial</option>` to Customer Type.
   - Add a `Marketer / Reference` input (`name="marketerRef"`) and show the auto-generated `Customer ID` (`JAM313xxxx`).

5. In `frontend/src/components/customer/CustomersTable.jsx` and `frontend/src/components/customer/CustomerDetails.jsx`:
   - Render `c.customerCode` badge (e.g., `JAM3130001`) next to customer name.
   - For Wadaana (`isWadaana`), render product badges as `AquaSphere 0.5L`, `AquaSphere 1.5L`, `Dasani 0.5L`, `Dasani 1.5L`, `Pure Fine 0.5L`, `Pure Fine 1.5L`.

6. In `frontend/src/components/orders/EditOrderModal.jsx`:
   - Fix Wadaana category classification (lines 34–49): check `nameLower.includes('dasani') || nameLower.includes('mix')` for `'MIX'` (`'DASANI / MIX BOTTLES'`) and `nameLower.includes('aquasphere') || nameLower.includes('pure') || nameLower.includes('pivrifine')` for `'PURE'` (`'AQUASPHERE & PURE FINE BOTTLES'`) so Wadaana's 6 products are grouped properly instead of falling into `'OTHER FINISHED GOODS'`.
````

# **MODULE E: Voice Notes 1 & 2 — Payment Methods (EasyPaisa & JazzCash) \+ Cash & Size Breakdowns**

**Copy-Paste Prompt for Module E:**TASK:

1\. Add EasyPaisa and JazzCash to all Payment Method selectors while keeping \`Payment.type\` enum-safe (Voice Note 1).

2\. Add "Cash Received" breakdown by payment channel (Cash, Bank, EasyPaisa, JazzCash, Cheque) AND revenue/cash breakdown by bottle size (19L, 1.5L, 0.5L) to the sales/cash records while keeping Daily, Monthly, and Yearly view toggles unchanged (Voice Note 2).

STRICT BOUNDARIES:

\- DO NOT alter \`backend/prisma/schema.prisma\`.

\- CRITICAL ENUM RULE: \`AquaspherePaymentType\` and \`WadaanaPaymentType\` only allow \`CASH\`, \`BANK\_TRANSFER\`, \`CHEQUE\`, \`SECURITY\_DEPOSIT\`. Whenever inserting into \`prisma\[\\\`\${prefix}Payment\\\`\]\`, convert \`'EASYPAISA'\` or \`'JAZZCASH'\` to \`'BANK\_TRANSFER'\`:

  \`const safePaymentEnum \= \['EASYPAISA', 'JAZZCASH', 'ONLINE'\].includes(paymentMethod) ? 'BANK\_TRANSFER' : (\['CASH', 'BANK\_TRANSFER', 'CHEQUE', 'SECURITY\_DEPOSIT'\].includes(paymentMethod) ? paymentMethod : 'CASH');\`

\- Store the exact \`paymentMethod\` string (\`'CASH'\`, \`'BANK\_TRANSFER'\`, \`'CHEQUE'\`, \`'EASYPAISA'\`, \`'JAZZCASH'\`) in \`Delivery.paymentMethod\` and \`AuditLog.details\`.

EXACT INSTRUCTIONS:

1\. In \`backend/src/controllers/order.controller.js\`:

   \- Add helper at top:

     \`\`\`js

     const toSafePaymentType \= (method) \=\> {

       const m \= String(method \|\| 'CASH').toUpperCase();

       if (m \=== 'EASYPAISA' \|\| m \=== 'JAZZCASH' \|\| m \=== 'ONLINE') return 'BANK\_TRANSFER';

       if (\['CASH', 'BANK\_TRANSFER', 'CHEQUE', 'SECURITY\_DEPOSIT'\].includes(m)) return m;

       return 'CASH';

     };

     \`\`\`

   \- In \`deliverOrder\`:

     \- In CASE 1 (already delivered, settling payment): currently a \`Delivery\` row is only created \`if (retGood \> 0 \|\| retBroken \> 0)\`. Change that condition to \`if (retGood \> 0 \|\| retBroken \> 0 \|\| cash \> 0)\` so that settling cash on an already-delivered order ALWAYS records \`cashReceived: cash, paymentMethod\` in \`Delivery\`\!

     \- Replace \`type: paymentMethod \=== 'SECURITY\_DEPOSIT' ? 'CASH' : paymentMethod\` in \`Payment.create\` (both CASE 1 and CASE 2\) with \`type: toSafePaymentType(paymentMethod)\`.

   \- In \`recordOrderPayment\`:

     \- Use \`type: toSafePaymentType(paymentMethod)\` in \`Payment.create\`.

     \- When \`cash \> 0\`, also create a \`Delivery\` settlement record (\`qtyDelivered: 0, bottlesReturnedGood: 0, bottlesReturnedBroken: 0, cashReceived: cash, paymentMethod: String(paymentMethod \|\| 'CASH').toUpperCase(), remarks: remarks \|\| 'Payment Settlement'\`) so \`Delivery.paymentMethod\` tracks the exact channel (\`EASYPAISA\`, \`JAZZCASH\`, etc.)\!

2\. In Frontend Payment Method Dropdowns (\`frontend/src/components/orders/ProcessDeliveryModal.jsx\`, \`frontend/src/components/orders/RecordPaymentModal.jsx\`, \`frontend/src/components/counterSales/LogCounterSaleForm.jsx\`, \`frontend/src/components/vendors/VendorPaymentModal.jsx\`):

   \- Update the \`\<select\>\` options for payment method to include all 5 options:

     \`\`\`jsx

     \<option value="CASH"\>Cash\</option\>

     \<option value="BANK\_TRANSFER"\>Bank Transfer\</option\>

     \<option value="EASYPAISA"\>EasyPaisa\</option\>

     \<option value="JAZZCASH"\>JazzCash\</option\>

     \<option value="CHEQUE"\>Cheque\</option\>

     \`\`\`

3\. In \`backend/src/controllers/analytics.controller.js\` (\`computeDashboardAnalytics\` & \`getDailySummary\`) and \`backend/src/controllers/adminDashboard.controller.js\` (\`getAdminCashSummary\`):

   \- In \`computeDashboardAnalytics\`:

     \- In the \`orders\` query \`select\`, include \`deliveries: { select: { cashReceived: true, paymentMethod: true, deliveredAt: true } }\` and \`payments: { select: { amount: true, type: true, createdAt: true } }\`.

     \- In \`payments\` query \`select\`, include \`type: true, orderId: true\`.

     \- In \`spotSales\` query \`select\`, include \`paymentMethod: true, items: { select: { saleType: true, quantity: true, subtotal: true, item: { select: { name: true } } } }\`.

     \- Inside \`createMetricBucket()\`, add:

       \`\`\`js

       cashByMethod: { CASH: 0, BANK\_TRANSFER: 0, EASYPAISA: 0, JAZZCASH: 0, CHEQUE: 0 },

       salesBySize: { '19L': 0, '1.5L': 0, '0.5L': 0 },

       cashBySize: { '19L': 0, '1.5L': 0, '0.5L': 0 }

       \`\`\`

     \- Classify item size by name (\`n.includes('19')\` \-\> \`'19L'\`, \`n.includes('1.5') \|\| n.includes('1500')\` \-\> \`'1.5L'\`, \`n.includes('0.5') \|\| n.includes('500')\` \-\> \`'0.5L'\`).

     \- For each order, add each item's \`price \* quantity\` to \`b.salesBySize\[sizeKey\]\`.

     \- For each order delivery/payment and spot sale, accumulate collected cash into \`b.cashByMethod\[normalizedMethod\]\` (\`CASH\`, \`BANK\_TRANSFER\`, \`EASYPAISA\`, \`JAZZCASH\`, \`CHEQUE\`) and pro-rate collected order cash across the order's item sizes into \`b.cashBySize\[sizeKey\]\`.

   \- Also return \`cashByMethod\`, \`salesBySize\`, and \`cashBySize\` in \`getDailySummary\` and \`getAdminCashSummary\`.

4\. In \`frontend/src/components/dashboard/OwnerDashboardView.jsx\`, \`frontend/src/components/dashboard/AccountantDashboardView.jsx\`, and \`frontend/src/components/dashboard/CashSummaryTab.jsx\`:

   \- Preserve the existing \`TimeframeDropdown\` (Daily, Yesterday, Last 3 Days, 1 Week, 1 Month, 1 Year) unchanged.

   \- Add two clean, responsive breakdown panels that react to the selected timeframe:

     1\) \*\*"Cash Received by Account / Channel"\*\*: 5 mini-cards showing exact amounts received via \*\*Cash\*\*, \*\*Bank Transfer\*\*, \*\*EasyPaisa\*\*, \*\*JazzCash\*\*, and \*\*Cheque\*\*.

     2\) \*\*"Sales & Cash Received by Bottle Size"\*\*: 3 cards showing \*\*19 Litre\*\*, \*\*1.5 Litre\*\*, and \*\*0.5 Litre\*\* revenue and cash collected (so marketing performance for 19L vs. 1.5L/0.5L can be compared directly).

# **MODULE F: Voice Note 4 & Image 12 — Single "Pay Debt" Button Across Customer Details & Owner/Admin/MM Dashboards \+ Unified Pool Settlement (Orders \+ SpotSales)**

**How the Unified Debt Pool (Orders \+ SpotSales) Works:**  
**1\. How SpotSale (Counter Sale) Debt Works in the Codebase:**  
\- In `prisma/schema.prisma`, `SpotSale` has `totalAmount`, `amountPaid`, `cashCollected`, `debtAmount`, and `creditAmount`.  
\- When a customer buys on credit or partial payment at the counter (`createSpotSale` in `spotSale.controller.js:L555`), `debtAmount` and `creditAmount` store the unpaid balance (`totalAmount - amountPaid`), and `Customer.currentBalance` is incremented by `debtAmount`.  
\- In `CounterSalesHistoryTable.jsx`, the status badge checks `debtAmount`: if `debtAmount === 0`, it shows green **Cash (Paid in Full)**; if `debtAmount > 0 && amountPaid > 0`, it shows amber **Partial**; if `amountPaid === 0`, it shows red **Credit**.  
**2\. How the Unified Debt Pool Settlement Works (`POST /api/v1/customers/:id/payment`):**  
\- When you click **Pay Debt** (from Customer Details, Customers Table, or the Owner / Admin / Marketing Manager Dashboard) and enter **any payment amount** (partial or full):  
  \- The backend pools **all unpaid/partially paid `Order` rows (`UNPAID` / `PARTIAL`)** AND **all unpaid/partially paid `SpotSale` rows (`debtAmount > 0`)** for that customer into one chronological queue (oldest first).  
  \- As it walks through the pool with the entered payment amount:  
    \- **If the amount fully covers an `Order`:** it records a `Payment` row (`orderId: ord.id`), records a 0-qty `Delivery` settlement row with the chosen `paymentMethod` (`CASH`, `BANK_TRANSFER`, `EASYPAISA`, `JAZZCASH`, `CHEQUE`), and updates `Order.paymentStatus` to **`'PAID'`**.  
    \- **If the amount partially covers an `Order`:** it records the partial `Payment` \+ `Delivery` row and updates `Order.paymentStatus` to **`'PARTIAL'`**.  
    \- **If the amount covers a `SpotSale` (full or partial):** it increments `SpotSale.amountPaid`, decrements `SpotSale.debtAmount` and `SpotSale.creditAmount` (so the Counter Sale status automatically turns **`Cash / Paid`** or **`Partial`**), and records a `Payment` row (`orderId: null, customerId`) for today's cash ledger.  
    \- Finally, it updates `Customer.currentBalance` to the exact remaining unpaid debt.  
**3\. Zero-Breakage Precaution for Gemini 3.8 Flash:**  
\- Instead of writing 150 lines of modal JSX inside 4 different existing files (which causes lightweight models to break brackets/imports), Gemini 3.8 Flash will create **ONE standalone component**: `frontend/src/components/customer/SettleCustomerDebtModal.jsx`.  
\- Then it only adds a simple **`Pay Debt`** button to `CustomerDetails.jsx`, `CustomersTable.jsx`, `CustomerRiskHub.jsx` (used by both **Owner Dashboard** and **Marketing Manager Dashboard**), and `AdminDashboardView.jsx` (used by **Admin Dashboard**).

**Copy-Paste Prompt for Module F:**

````
TASK: Implement the Single "Pay Debt" Button and Unified Debt Pool Settlement (Orders + Counter Sales / SpotSales) across Customer Details, Customers Table, and the Owner, Admin, and Marketing Manager Dashboards (Voice Note 4 & Image 12).

STRICT BOUNDARIES:
- DO NOT alter `backend/prisma/schema.prisma`.
- Create 1 new file:
  - `frontend/src/components/customer/SettleCustomerDebtModal.jsx`
- Edit ONLY these 8 existing files:
  1. `backend/src/controllers/customer.controller.js`
  2. `backend/src/routes/customer.routes.js`
  3. `backend/src/controllers/order.controller.js`
  4. `backend/src/controllers/adminDashboard.controller.js`
  5. `frontend/src/components/orders/OrderInvoiceModal.jsx`
  6. `frontend/src/utils/receiptFormatter.js`
  7. `frontend/src/components/customer/CustomerDetails.jsx`
  8. `frontend/src/components/customer/CustomersTable.jsx`
  9. `frontend/src/components/dashboard/CustomerRiskHub.jsx`
  10. `frontend/src/components/dashboard/AdminDashboardView.jsx`

EXACT STEP-BY-STEP INSTRUCTIONS:

### STEP 1: Backend Unified Pool Settlement (`customer.controller.js` & `customer.routes.js`)
1. In `backend/src/controllers/customer.controller.js`:
   - In `getCustomerDetails` (around line 97), add `spotSales` inside the `include` object of `prisma[\`${prefix}Customer\`].findUnique`:
     ```js
     spotSales: {
       include: {
         items: { include: { item: { select: { id: true, name: true, unit: true } } } }
       },
       orderBy: { createdAt: 'desc' }
     },
     ```
   - Add and export `settleCustomerLumpSumPayment` at the bottom of `backend/src/controllers/customer.controller.js`:
     ```js
     export const settleCustomerLumpSumPayment = asyncHandler(async (req, res) => {
       const { id: customerId } = req.params;
       const prefix = getTenantPrefix(req);
       const { amount = 0, paymentMethod = 'CASH', settleFromSecurity = false, remarks = '' } = req.body;

       const cash = parseFloat(amount || 0);
       const normMethod = String(paymentMethod || 'CASH').toUpperCase();
       const safePaymentEnum = ['EASYPAISA', 'JAZZCASH', 'ONLINE'].includes(normMethod)
         ? 'BANK_TRANSFER'
         : (['CASH', 'BANK_TRANSFER', 'CHEQUE', 'SECURITY_DEPOSIT'].includes(normMethod) ? normMethod : 'CASH');

       if ((isNaN(cash) || cash <= 0) && !settleFromSecurity) {
         throw new ApiError(400, 'Payment amount must be greater than 0');
       }

       const result = await prisma.$transaction(async (tx) => {
         const customer = await tx[`${prefix}Customer`].findUnique({
           where: { id: customerId }
         });
         if (!customer) throw new ApiError(404, 'Customer not found');

         // Fetch all non-cancelled unpaid/partial orders and unpaid spot sales oldest-first (FIFO)
         const [openOrders, openSpotSales] = await Promise.all([
           tx[`${prefix}Order`].findMany({
             where: {
               customerId,
               deliveryStatus: { not: 'CANCELLED' },
               paymentStatus: { in: ['UNPAID', 'PARTIAL'] }
             },
             include: { items: true, payments: true },
             orderBy: { createdAt: 'asc' }
           }),
           tx[`${prefix}SpotSale`].findMany({
             where: {
               customerId,
               OR: [{ debtAmount: { gt: 0 } }, { creditAmount: { gt: 0 } }]
             },
             orderBy: { createdAt: 'asc' }
           })
         ]);

         // Build unified chronological FIFO pool of all unpaid Orders + SpotSales
         const obligations = [];
         for (const ord of openOrders) {
           const sub = (ord.items || []).reduce((s, i) => s + (parseFloat(i.price || 0) * Number(i.quantity || 0)), 0);
           const hasGst = typeof ord.remarks === 'string' && ord.remarks.includes('[GST:18%]');
           const ordTotal = hasGst ? sub + Math.round(sub * 0.18) : sub;
           const ordPaid = (ord.payments || []).reduce((s, p) => s + parseFloat(p.amount || 0), 0);
           const ordDue = Math.max(0, ordTotal - ordPaid);
           if (ordDue > 0) {
             obligations.push({ kind: 'ORDER', record: ord, total: ordTotal, paid: ordPaid, due: ordDue, createdAt: new Date(ord.createdAt) });
           }
         }
         for (const ss of openSpotSales) {
           const ssDue = Math.max(0, Number(ss.debtAmount || ss.creditAmount || 0));
           if (ssDue > 0) {
             obligations.push({ kind: 'SPOT_SALE', record: ss, due: ssDue, createdAt: new Date(ss.createdAt) });
           }
         }
         obligations.sort((a, b) => a.createdAt - b.createdAt);

         const totalObligationsDue = obligations.reduce((s, o) => s + o.due, 0);
         const currentCustomerDebt = Math.max(Number(customer.currentBalance || 0), totalObligationsDue);

         const availableDeposit = Math.max(0, Number(customer.deposit || 0));
         const depositToApply = settleFromSecurity ? Math.min(availableDeposit, currentCustomerDebt) : 0;
         let remainingPool = cash + depositToApply;

         if (remainingPool <= 0) {
           throw new ApiError(400, 'No payment or security deposit available to apply');
         }

         const settledOrders = [];
         const settledSpotSales = [];

         for (const ob of obligations) {
           if (remainingPool <= 0) break;
           const alloc = Math.min(remainingPool, ob.due);
           if (alloc <= 0) continue;

           if (ob.kind === 'ORDER') {
             const ord = ob.record;
             const newPaid = ob.paid + alloc;
             const newStatus = newPaid >= ob.total ? 'PAID' : 'PARTIAL';

             await tx[`${prefix}Payment`].create({
               data: {
                 orderId: ord.id,
                 customerId,
                 amount: alloc,
                 type: depositToApply >= alloc && cash === 0 ? 'SECURITY_DEPOSIT' : safePaymentEnum
               }
             });

             await tx[`${prefix}Delivery`].create({
               data: {
                 orderId: ord.id,
                 qtyDelivered: 0,
                 bottlesReturnedGood: 0,
                 bottlesReturnedBroken: 0,
                 cashReceived: alloc,
                 paymentMethod: normMethod,
                 remarks: remarks ? `Debt Pool Settlement: ${remarks}` : 'Debt Pool Settlement (FIFO)'
               }
             });

             await tx[`${prefix}Order`].update({
               where: { id: ord.id },
               data: { paymentStatus: newStatus }
             });

             settledOrders.push({ id: ord.id, allocated: alloc, newStatus });
           } else if (ob.kind === 'SPOT_SALE') {
             const ss = ob.record;
             const newDebt = Math.max(0, ob.due - alloc);
             const newAmountPaid = Number(ss.amountPaid || ss.cashCollected || 0) + alloc;

             await tx[`${prefix}SpotSale`].update({
               where: { id: ss.id },
               data: {
                 amountPaid: newAmountPaid,
                 debtAmount: newDebt,
                 creditAmount: newDebt,
                 remarks: `${ss.remarks ? ss.remarks + ' | ' : ''}Settled Rs. ${alloc} (${normMethod})`
               }
             });

             await tx[`${prefix}Payment`].create({
               data: {
                 orderId: null,
                 customerId,
                 amount: alloc,
                 type: depositToApply >= alloc && cash === 0 ? 'SECURITY_DEPOSIT' : safePaymentEnum
               }
             });

             settledSpotSales.push({ id: ss.id, saleNumber: ss.saleNumber, allocated: alloc, remainingDebt: newDebt });
           }

           remainingPool -= alloc;
         }

         if (remainingPool > 0) {
           await tx[`${prefix}Payment`].create({
             data: {
               orderId: null,
               customerId,
               amount: remainingPool,
               type: safePaymentEnum
             }
           });
         }

         const totalApplied = cash + depositToApply;
         const newCustomerBalance = Math.max(0, currentCustomerDebt - totalApplied);

         const updatedCustomer = await tx[`${prefix}Customer`].update({
           where: { id: customerId },
           data: {
             currentBalance: newCustomerBalance,
             ...(depositToApply > 0 ? { deposit: { decrement: depositToApply } } : {})
           }
         });

         await createAuditLog(prefix, {
           action: 'CUSTOMER_DEBT_SETTLED',
           entityType: 'Customer',
           entityId: customerId,
           performedBy: req.user?.name || req.user?.id || 'Staff',
           details: JSON.stringify({
             amountPaid: cash,
             depositApplied: depositToApply,
             paymentMethod: normMethod,
             previousDebt: currentCustomerDebt,
             newBalance: newCustomerBalance,
             settledOrdersCount: settledOrders.length,
             settledSpotSalesCount: settledSpotSales.length,
             settledOrders,
             settledSpotSales,
             remarks
           })
         });

         return { customer: updatedCustomer, settledOrders, settledSpotSales, newCustomerBalance };
       }, { maxWait: 10000, timeout: 30000 });

       broadcastDashboardUpdate(prefix);
       broadcastEvent(prefix, 'CUSTOMER_UPDATED', { customerId });
       broadcastEvent(prefix, 'ORDER_UPDATED');
       broadcastEvent(prefix, 'COUNTER_SALE_CREATED');
       return sendSuccess(res, result, 200, { message: 'Customer debt settled successfully' });
     });
     ```

2. In `backend/src/routes/customer.routes.js`:
   - Import `settleCustomerLumpSumPayment` from `../controllers/customer.controller.js`.
   - Add route:
     `router.post('/:id/payment', requireRoles('OWNER', 'ADMIN', 'ACCOUNTANT', 'MARKETING_MANAGER'), settleCustomerLumpSumPayment);`

3. In `backend/src/controllers/adminDashboard.controller.js`:
   - In `getCustomerAlerts` (around line 268):
     Remove `take: 5` on `orders` (use `where: { deliveryStatus: { not: 'CANCELLED' } }`) and include `spotSales: { where: { debtAmount: { gt: 0 } }, select: { id: true, saleNumber: true, debtAmount: true, createdAt: true } }`.
     Update the `unpaidBillOver7Days` loop so ANY customer with `Number(c.currentBalance || 0) > 0` OR unpaid orders/spotSales is included, setting `unpaidAmount: Math.max(unpaidSum + spotUnpaidSum, Number(c.currentBalance || 0))`, `currentBalance: Number(c.currentBalance || 0)`, `unpaidOrdersCount`, and `unpaidSpotSalesCount`.

### STEP 2: Create Standalone Modal `frontend/src/components/customer/SettleCustomerDebtModal.jsx`
Create `frontend/src/components/customer/SettleCustomerDebtModal.jsx` with the following complete code:
```jsx
import { useState, useEffect, useMemo } from 'react';
import { X, DollarSign, CheckCircle2, Loader2, ShoppingBag, Store } from 'lucide-react';
import { toast } from 'sonner';
import { API_URL } from '../../utils/api';
import { clearCache } from '../../utils/apiCache';
import { useTenant } from '../../context/TenantContext';

export default function SettleCustomerDebtModal({ customer, isOpen, onClose, onSuccess }) {
  const { tenant } = useTenant();
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [settleFromSecurity, setSettleFromSecurity] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !customer?.id) return;
    setLoading(true);
    fetch(`${API_URL}/customers/${customer.id}`, {
      headers: { 'x-tenant': tenant },
      credentials: 'include'
    })
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data) {
          setDetails(json.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen, customer?.id, tenant]);

  const poolSummary = useMemo(() => {
    const c = details || customer || {};
    const openOrders = (c.orders || []).filter(
      o => o.deliveryStatus !== 'CANCELLED' && (o.paymentStatus === 'UNPAID' || o.paymentStatus === 'PARTIAL')
    );
    const openSpotSales = (c.spotSales || []).filter(
      s => Number(s.debtAmount || s.creditAmount || 0) > 0
    );

    const obligations = [];
    let ordersDueTotal = 0;
    let spotDueTotal = 0;

    openOrders.forEach(o => {
      const sub = (o.items || []).reduce((s, i) => s + (Number(i.price || 0) * Number(i.quantity || 0)), 0);
      const hasGst = typeof o.remarks === 'string' && o.remarks.includes('[GST:18%]');
      const total = hasGst ? sub + Math.round(sub * 0.18) : sub;
      const paid = (o.payments || []).reduce((s, p) => s + Number(p.amount || 0), 0);
      const due = Math.max(0, total - paid);
      if (due > 0) {
        ordersDueTotal += due;
        obligations.push({ kind: 'ORDER', id: o.id, label: `Order #${o.id.slice(0, 6).toUpperCase()}`, due, createdAt: new Date(o.createdAt) });
      }
    });

    openSpotSales.forEach(s => {
      const due = Math.max(0, Number(s.debtAmount || s.creditAmount || 0));
      if (due > 0) {
        spotDueTotal += due;
        obligations.push({ kind: 'SPOT_SALE', id: s.id, label: `Counter ${s.saleNumber || s.id.slice(0, 6).toUpperCase()}`, due, createdAt: new Date(s.createdAt) });
      }
    });

    obligations.sort((a, b) => a.createdAt - b.createdAt);

    const totalDebt = Math.max(
      Number(c.currentBalance || c.unpaidAmount || 0),
      ordersDueTotal + spotDueTotal
    );

    return {
      totalDebt,
      ordersCount: openOrders.length,
      ordersDueTotal,
      spotCount: openSpotSales.length,
      spotDueTotal,
      obligations,
      deposit: Number(c.deposit || 0)
    };
  }, [details, customer]);

  useEffect(() => {
    if (poolSummary.totalDebt > 0 && !amount) {
      setAmount(String(poolSummary.totalDebt));
    }
  }, [poolSummary.totalDebt]);

  if (!isOpen || !customer) return null;

  const enteredCash = Math.max(0, parseFloat(amount || 0) || 0);
  const depositApplied = settleFromSecurity ? Math.min(poolSummary.deposit, poolSummary.totalDebt) : 0;
  const totalPoolPayment = enteredCash + depositApplied;

  // Compute live preview of how many orders & spot sales get PAID vs PARTIAL
  let rem = totalPoolPayment;
  let ordersPaidCount = 0;
  let ordersPartialCount = 0;
  let spotClearedCount = 0;
  for (const ob of poolSummary.obligations) {
    if (rem <= 0) break;
    const alloc = Math.min(rem, ob.due);
    if (ob.kind === 'ORDER') {
      if (alloc >= ob.due) ordersPaidCount++;
      else if (alloc > 0) ordersPartialCount++;
    } else {
      if (alloc > 0) spotClearedCount++;
    }
    rem -= alloc;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (totalPoolPayment <= 0) {
      toast.error('Please enter a valid payment amount greater than 0.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/customers/${customer.id}/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant': tenant
        },
        credentials: 'include',
        body: JSON.stringify({
          amount: enteredCash,
          paymentMethod,
          settleFromSecurity,
          remarks
        })
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to settle customer debt');
      }

      clearCache('customers');
      clearCache('orders');
      clearCache('spot-sales');
      clearCache('admin');
      clearCache('analytics');

      const sOrd = json.data?.settledOrders?.length || 0;
      const sSpot = json.data?.settledSpotSales?.length || 0;
      toast.success(
        `Settled Rs. ${totalPoolPayment.toLocaleString()}! Updated ${sOrd} order(s) and ${sSpot} counter sale(s).`
      );
      if (onSuccess) onSuccess(json.data);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Error settling debt');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[70]">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <DollarSign size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Pay & Settle Customer Debt</h3>
              <p className="text-xs text-slate-500 font-medium">{customer.name} • {customer.phone}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Unified Debt Pool Summary */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
              <span className="font-bold text-slate-600 uppercase text-[10px]">Total Payable Debt Pool</span>
              <span className="font-mono font-black text-base text-rose-600">
                Rs. {poolSummary.totalDebt.toLocaleString()}
              </span>
            </div>

            {loading ? (
              <div className="flex items-center gap-2 text-slate-400 py-1">
                <Loader2 size={13} className="animate-spin" /> Loading unpaid orders & counter sales...
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <div className="bg-white p-2 rounded-lg border border-slate-200/80 flex items-center gap-2">
                  <ShoppingBag size={14} className="text-amber-600 shrink-0" />
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Unpaid Orders ({poolSummary.ordersCount})</div>
                    <div className="font-mono font-bold text-slate-800">Rs. {poolSummary.ordersDueTotal.toLocaleString()}</div>
                  </div>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200/80 flex items-center gap-2">
                  <Store size={14} className="text-purple-600 shrink-0" />
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Counter Credit ({poolSummary.spotCount})</div>
                    <div className="font-mono font-bold text-slate-800">Rs. {poolSummary.spotDueTotal.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Amount Input */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-bold text-slate-700">Amount Received (PKR) *</label>
              {poolSummary.totalDebt > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(String(poolSummary.totalDebt))}
                  className="text-[11px] font-bold text-emerald-600 hover:underline"
                >
                  Pay Full Debt (Rs. {poolSummary.totalDebt.toLocaleString()})
                </button>
              )}
            </div>
            <input
              type="number"
              step="any"
              min="0"
              required={!settleFromSecurity}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter lump-sum amount..."
              className="input-base font-mono font-bold text-sm text-slate-900"
            />
          </div>

          {/* Payment Method (Voice Note 1) */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="select-base text-xs font-semibold"
            >
              <option value="CASH">Cash</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="EASYPAISA">EasyPaisa</option>
              <option value="JAZZCASH">JazzCash</option>
              <option value="CHEQUE">Cheque</option>
            </select>
          </div>

          {/* Live FIFO Settlement Preview */}
          {totalPoolPayment > 0 && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                <span>Automatic FIFO Settlement Preview:</span>
              </div>
              <p className="text-[11px] text-emerald-800">
                Marks <strong>{ordersPaidCount}</strong> order(s) as <strong>PAID</strong>
                {ordersPartialCount > 0 ? `, ${ordersPartialCount} order as PARTIAL` : ''}
                {spotClearedCount > 0 ? `, settles ${spotClearedCount} Counter Sale(s)` : ''}.
                Remaining Balance: <strong className="font-mono">Rs. {Math.max(0, poolSummary.totalDebt - totalPoolPayment).toLocaleString()}</strong>
              </p>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1">Remarks (Optional)</label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Cleared lump-sum via EasyPaisa / Cash"
              className="input-base text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button type="button" onClick={onClose} className="btn-secondary text-xs py-2 px-4">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary text-xs py-2 px-5 flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700"
            >
              {submitting && <Loader2 size={13} className="animate-spin" />}
              {submitting ? 'Settling...' : 'Confirm & Pay Debt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### STEP 3: Add the Single "Pay Debt" Button to All 4 Screens (Customer Details, Customers Table, Owner/MM Dashboard, Admin Dashboard)
1. **`frontend/src/components/customer/CustomerDetails.jsx`**:
   - Import `SettleCustomerDebtModal from './SettleCustomerDebtModal';` and add `const [isPayDebtOpen, setIsPayDebtOpen] = useState(false);`.
   - Inside the `Current Debt` card (around line 348, right next to `WhatsApp Reminder`), when `currentBalance > 0`, render:
     ```jsx
     <button
       type="button"
       onClick={() => setIsPayDebtOpen(true)}
       className="mt-1.5 px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold inline-flex items-center gap-1 shadow-2xs transition"
     >
       <DollarSign size={11} />
       <span>Pay Debt</span>
     </button>
     ```
   - Render `<SettleCustomerDebtModal customer={c} isOpen={isPayDebtOpen} onClose={() => setIsPayDebtOpen(false)} onSuccess={() => { /* re-fetch customer details */ }} />` at the bottom of `CustomerDetails.jsx`.

2. **`frontend/src/components/customer/CustomersTable.jsx`**:
   - Import `SettleCustomerDebtModal from './SettleCustomerDebtModal';` and `DollarSign` from `'lucide-react'`. Add `const [debtCustomer, setDebtCustomer] = useState(null);`.
   - In the `Actions` column of each customer row, when `parseFloat(c.currentBalance || 0) > 0`, add:
     ```jsx
     <button
       type="button"
       onClick={(e) => { e.stopPropagation(); setDebtCustomer(c); }}
       className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1 transition"
       title="Pay & Settle All Unpaid Orders / Counter Debt"
     >
       <DollarSign size={12} /> Pay Debt
     </button>
     ```
   - Mount `<SettleCustomerDebtModal customer={debtCustomer} isOpen={Boolean(debtCustomer)} onClose={() => setDebtCustomer(null)} onSuccess={() => window.location.reload()} />` outside the table.

3. **`frontend/src/components/dashboard/CustomerRiskHub.jsx` (Powers BOTH Owner Dashboard & Marketing Manager Dashboard)**:
   - Import `SettleCustomerDebtModal from '../customer/SettleCustomerDebtModal';` and `DollarSign` from `'lucide-react'`.
   - Add state `const [debtCustomer, setDebtCustomer] = useState(null);`.
   - In `Tab 2: Overdue Invoices` (`activeTab === 'overdue'`, around line 274), inside the `Action` `<td>` right next to the `Remind` button, add:
     ```jsx
     <button
       type="button"
       onClick={() => setDebtCustomer(c)}
       className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1 mr-1.5 transition"
       title="Settle customer overdue orders and counter sales"
     >
       <DollarSign size={12} />
       <span>Pay Debt</span>
     </button>
     ```
   - Mount `<SettleCustomerDebtModal customer={debtCustomer} isOpen={Boolean(debtCustomer)} onClose={() => setDebtCustomer(null)} onSuccess={fetchRiskData} />` at the bottom of `CustomerRiskHub.jsx`.

4. **`frontend/src/components/dashboard/AdminDashboardView.jsx` (Powers Admin Dashboard)**:
   - Import `SettleCustomerDebtModal from '../customer/SettleCustomerDebtModal';`.
   - Add state `const [debtCustomer, setDebtCustomer] = useState(null);`.
   - In `Tab 4: Customer Alerts -> Unpaid Bills > 7 Days` (around line 303), add a **`Pay Debt`** button on each row (`onClick={() => setDebtCustomer(c)}`) and mount `<SettleCustomerDebtModal customer={debtCustomer} isOpen={Boolean(debtCustomer)} onClose={() => setDebtCustomer(null)} onSuccess={fetchData} />`.

### STEP 4: Running Balance on Invoices (`order.controller.js`, `OrderInvoiceModal.jsx`, `receiptFormatter.js`)
- In `order.controller.js` (`getOrders`), attach `previousUnpaidBalance` (the customer's unpaid balance across all other orders and spot sales) to each order.
- In `OrderInvoiceModal.jsx` and `receiptFormatter.js`, display `Current Bill`, `Previous Unpaid Balance`, `Total Payable`, `Amount Paid`, and `TOTAL BALANCE DUE`.
````

# **MODULE G: Voice Note 7 & PDF 13 — 18% GST Persistence, FBR Sales Tax Invoice & Ledger Integration**

**Copy-Paste Prompt for Module G:**TASK: Implement full 18% GST support across Order Creation, Order Invoice Toggle, FBR Sales Tax Invoice layout (matching PDF 13), and Sales/Cash/Customer Balance records without altering \`prisma/schema.prisma\` (Voice Note 7 & PDF 13).

STRICT BOUNDARIES:

\- DO NOT alter \`backend/prisma/schema.prisma\`.

\- Persist order GST status using the marker \`\[GST:18%\]\` inside \`Order.remarks\` (and \`withGst\` boolean computed on read).

\- ONLY edit these 6 files:

  1\. \`backend/src/controllers/order.controller.js\`

  2\. \`backend/src/routes/order.routes.js\`

  3\. \`backend/src/controllers/analytics.controller.js\`

  4\. \`frontend/src/components/orders/AddOrderModal.jsx\`

  5\. \`frontend/src/components/orders/OrderInvoiceModal.jsx\`

  6\. \`backend/src/utils/pdfGenerator.js\`

EXACT INSTRUCTIONS:

1\. Shared GST Helper Logic (in \`order.controller.js\` and \`analytics.controller.js\`):

   \- Define:

     \`\`\`js

     export const hasOrderGst \= (order) \=\> Boolean(order?.withGst \|\| (typeof order?.remarks \=== 'string' && order.remarks.includes('\[GST:18%\]')));

     export const getOrderSubtotal \= (order) \=\> (order?.items \|\| \[\]).reduce((sum, i) \=\> sum \+ (parseFloat(i.price \|\| 0\) \* Number(i.quantity \|\| 0)), 0);

     export const getOrderTotal \= (order) \=\> {

       const sub \= getOrderSubtotal(order);

       return hasOrderGst(order) ? sub \+ Math.round(sub \* 0.18) : sub;

     };

     \`\`\`

   \- Use \`getOrderTotal(o)\` instead of raw \`o.items.reduce(...)\` everywhere \`orderTotal\` is computed in \`order.controller.js\` (\`createOrder\`, \`deliverOrder\`, \`recordOrderPayment\`, \`deleteOrder\`) and \`analytics.controller.js\` (\`computeDashboardAnalytics\`).

2\. In \`backend/src/controllers/order.controller.js\` & \`backend/src/routes/order.routes.js\`:

   \- In \`createOrder\`: accept \`withGst\` boolean from \`req.body\`. If \`withGst\` is true, prepend \`\[GST:18%\] \` to \`remarks\` before saving.

   \- Add endpoint \`PATCH /api/v1/orders/:id/gst\` (\`toggleOrderGst\` in \`order.controller.js\`):

     \- Accepts \`{ withGst: Boolean }\`.

     \- Inside \`prisma.\$transaction\`:

       \- Reads existing order (with \`items\`, \`payments\`, \`customer\`).

       \- Computes \`wasGst \= hasOrderGst(order)\` and \`sub \= getOrderSubtotal(order)\`.

       \- Updates \`remarks\` to add or remove \`\[GST:18%\]\`.

       \- If \`wasGst \!== Boolean(withGst)\` and \`order.deliveryStatus \=== 'DELIVERED'\`:

         \- Computes \`gstDelta \= Math.round(sub \* 0.18)\`.

         \- Increments (if enabling GST) or decrements (if disabling GST) \`Customer.currentBalance\` by \`gstDelta\`.

       \- Re-evaluates \`paymentStatus\` (\`PAID\` / \`PARTIAL\` / \`UNPAID\`) against the new \`getOrderTotal\` and updates the order.

     \- Broadcasts \`ORDER\_UPDATED\`, \`CUSTOMER\_UPDATED\`, and \`broadcastDashboardUpdate(prefix)\`.

3\. In \`frontend/src/components/orders/AddOrderModal.jsx\`:

   \- Add a \*\*"With 18% GST (FBR Sales Tax Invoice)"\*\* toggle switch in the Order Items / Summary section.

   \- When enabled, display \`Subtotal\`, \`18% GST Amount\`, and \`GST-Inclusive Order Total\`, and pass \`withGst: true\` in \`POST /api/v1/orders\`.

4\. In \`frontend/src/components/orders/OrderInvoiceModal.jsx\` and \`backend/src/utils/pdfGenerator.js\`:

   \- Initialize \`const \[withGst, setWithGst\] \= useState(() \=\> Boolean(order?.withGst \|\| order?.remarks?.includes('\[GST:18%\]')));\`.

   \- When the user clicks \*\*"With 18% GST & STRN"\*\* or \*\*"Customer Care"\*\* in \`OrderInvoiceModal.jsx\`, call \`PATCH \${API\_URL}/orders/\${order.id}/gst\` with \`{ withGst: nextVal }\` so the GST selection is saved to the backend ledger and reflected in Sales, Customer Debt, and Daily Cash records\!

   \- When \`withGst\` is true, render the official FBR details from PDF 13:

     \- Seller: \`AQUA SPHERE — SALES TAX INVOICE\`, Rawalpindi, \`NTN / STRN: E208741-4\`, \`Phone: 051-5454438 / 0300-9149143\`

     \- Item table & totals showing: \`Value Excl. Tax\`, \`Sales Tax (18%)\`, and \`Grand Total (Incl. 18% GST)\`

     \- Bank Settlement Footer: \`Meezan Bank — IBAN: PK32MEZN0003340115746668\`

# **MODULE H: Voice Notes 3 & 6 — Unpaid Orders Product Size Filter \+ Month-End Consolidated Statements & WhatsApp Dispatch**

**Copy-Paste Prompt for Module H:**TASK:

1\. Enhance the Unpaid Orders view in \`Orders.jsx\` so staff can immediately see all pending/unpaid orders across \`0.5L\`, \`1.5L\`, and \`19L\` and filter by both \*\*Customer Type\*\* (\`Home\`, \`Commercial\`, \`Industrial\`, \`Corporate\`, \`Distributor\`) and \*\*Product Size\*\* (\`0.5L\`, \`1.5L\`, \`19L\`) (Voice Note 3).

2\. Add a \*\*"Month-End Unpaid Statements"\*\* tab in \`Orders.jsx\` that displays the cumulative unpaid balance for every customer for the selected month and allows sending consolidated month-end invoice images via WhatsApp (Voice Note 6).

STRICT BOUNDARIES:

\- DO NOT alter \`backend/prisma/schema.prisma\` or any backend file.

\- ONLY edit these 2 files:

  1\. \`frontend/src/pages/Orders.jsx\`

  2\. \`frontend/src/utils/receiptFormatter.js\`

EXACT INSTRUCTIONS:

1\. In \`frontend/src/pages/Orders.jsx\`:

   \- Add state \`const \[productSizeFilter, setProductSizeFilter\] \= useState('ALL');\` (\`'ALL'\`, \`'19L'\`, \`'1.5L'\`, \`'0.5L'\`).

   \- Add a Product Size \`\<select\>\` or pill bar right next to the Client Type filter (\`All Products\`, \`19 Litre (19L)\`, \`1.5 Litre (1.5L)\`, \`0.5 Litre (0.5L)\`).

   \- In \`filteredOrders\`, when \`productSizeFilter \!== 'ALL'\`, check if \`o.items\` contains an item matching that size (\`19L\` \-\> \`name.includes('19')\`, \`1.5L\` \-\> \`name.includes('1.5') \|\| name.includes('1500')\`, \`0.5L\` \-\> \`name.includes('0.5') \|\| name.includes('500')\`).

   \- Ensure \`clientTypes\` always includes \`'Home'\`, \`'Commercial'\`, \`'Industrial'\`, \`'Corporate'\`, \`'Distributor'\`.

   \- Add a 6th tab to \`tabs\`: \`'Month-End Statements'\`.

   \- When \`activeTab \=== 'Month-End Statements'\`:

     \- Show a Month selector (\`YYYY-MM\`, defaulting to current month) and Customer Type / Product Size filters.

     \- Group all unpaid/partial orders (and customers with \`currentBalance \> 0\`) by customer.

     \- For each customer row, display:

       \- Customer ID (\`customerCode\` / \`\#ID\`), Name, Phone, Customer Type

       \- Unpaid Orders Count in Month \+ Breakdown of quantities delivered (\`19L\`, \`1.5L\`, \`0.5L\`)

       \- Month Unpaid Bill \+ Prior Carryover \= \*\*Total Consolidated Balance Due\*\*

       \- Action Buttons:

         1\) \*\*"Settle Balance"\*\* (opens lump-sum payment modal)

         2\) \*\*"Send Month-End Invoice (WhatsApp)"\*\* (calls \`shareOrSendMonthlyStatementWhatsApp\` in \`receiptFormatter.js\` to render the consolidated monthly invoice image and open the customer's direct WhatsApp chat\!)

2\. In \`frontend/src/utils/receiptFormatter.js\`:

   \- Add \`export async function shareOrSendMonthlyStatementWhatsApp({ customer, orders, monthLabel, isWadaana \= false, withGst \= false })\`:

     \- Aggregates all unpaid items across \`orders\` for that customer in \`monthLabel\`.

     \- Builds a \`receiptData\` object with \`subtitle: \\\`CONSOLIDATED MONTH-END INVOICE (\${monthLabel})\\\`\`, itemized lines, \`Monthly Unpaid Subtotal\`, \`Previous Carryover\`, and \`TOTAL BALANCE DUE\`.

     \- Calls \`shareOrSendReceiptWhatsApp({ phone: customer?.phone, receiptData, filename: \\\`MonthEnd\_Statement\_\${customer?.name \|\| 'Customer'}.png\\\` })\`.

# **MODULE I: Dedicated Monthly Reports & Visual Intelligence Page (/erp-reports) Using Don Norman, Gestalt Laws & Recharts**

## **Architectural Decision: Dashboard vs. Dedicated Reports Page**

* **Why Both Work Together (Don Norman's Progressive Disclosure & Hick's Law):**  
  1. Cramming 8 monthly report tables into `OwnerDashboardView.jsx` causes severe scroll and cognitive overload.  
  2. Instead, keep the Dashboard as a fast daily/monthly operational cockpit (with the compact Payment Channel & Bottle Size cards from **Module E**), and upgrade the **existing /erp-reports page (frontend/src/pages/Reports.jsx & backend/src/controllers/reports.controller.js)**—which is already wired in `App.jsx` (`L137`) but was missing from `Sidebar.jsx` and had incomplete backend queries\!  
* **Design Principles Applied to Reports.jsx:**  
  1. **Gestalt Law of Common Region & Proximity:** Every report tab is structured into 3 clear horizontal bands:  
     * **Band 1 (Filter & Action Bar):** Month Selector (`YYYY-MM`) \+ Period Toggle (`Daily`, `Weekly`, `Monthly`, `Yearly`, `Custom`) \+ **Export CSV** & **Print A4 Report**.  
     * **Band 2 (Executive KPIs & Recharts Visuals — Gestalt Similarity & Figure-Ground):** 4 high-contrast KPI cards paired with a purpose-built Recharts visualization (`ComposedChart` / `BarChart` / `PieChart`) so trends and anomalies are visible at a glance before reading rows.  
     * **Band 3 (Granular Audit Ledger \+ Sticky Totals Row — Don Norman's Visibility & Feedback):** Searchable table with a bold bottom totals row so the Owner/Accountant never has to mentally sum columns.

**Copy-Paste Prompt for Module I:**

````
TASK:
1. Fix the decimal pack display in `FinishedGoodsSummaryCards.jsx`, `CounterSalesStockBar.jsx`, and `backend/scripts/heal-spot-sales.js`.
2. Restore the `/erp-reports` ("Monthly Reports") link in `Sidebar.jsx` and `roleAccess.js` (for `OWNER`, `ADMIN`, `ACCOUNTANT`).
3. Upgrade `backend/src/controllers/reports.controller.js` and `frontend/src/pages/Reports.jsx` into a complete, Recharts-powered Monthly Reports & Executive Intelligence suite following Don Norman's design principles and Gestalt grouping laws.

STRICT BOUNDARIES:
- DO NOT alter `backend/prisma/schema.prisma`.
- ONLY edit these 6 files:
  1. `frontend/src/components/inventory/FinishedGoodsSummaryCards.jsx`
  2. `frontend/src/components/counterSales/CounterSalesStockBar.jsx`
  3. `frontend/src/constants/roleAccess.js`
  4. `frontend/src/components/layout/Sidebar.jsx`
  5. `backend/src/controllers/reports.controller.js`
  6. `frontend/src/pages/Reports.jsx`

EXACT INSTRUCTIONS:

1. Fix Decimal Pack Formatting (`FinishedGoodsSummaryCards.jsx` & `CounterSalesStockBar.jsx`):
   - Replace `${packs.toLocaleString()}${loose > 0 ? `.${loose}` : ''}` with:
     - Main number: `${packs.toLocaleString()} Packs` (and if `loose > 0`, show a small pill `+{loose} Btl` next to it instead of `.loose`!).
   - In `formatQty(qty, packSize, unit)`:
     ```js
     const formatQty = (qty, packSize, unit) => {
       const rounded = Math.round(Number(qty || 0));
       if (packSize <= 1) return `${rounded.toLocaleString()} ${unit}`;
       const packs = Math.floor(rounded / packSize);
       const loose = rounded % packSize;
       return loose > 0 ? `${packs.toLocaleString()} Pk (+${loose} btl)` : `${packs.toLocaleString()} Pk`;
     };
     ```

2. Enable `/erp-reports` in `frontend/src/constants/roleAccess.js` and `frontend/src/components/layout/Sidebar.jsx`:
   - In `roleAccess.js`: add `REPORTS: '/erp-reports'` to `SIDEBAR_ROUTES`, and set `[SIDEBAR_ROUTES.REPORTS]: true` for `OWNER`, `ADMIN`, and `ACCOUNTANT` in both `aquasphere` and `wadaana`.
   - In `Sidebar.jsx`: add `{ icon: BarChart3, label: 'Monthly Reports', path: '/erp-reports' }` to `navItems` and `PREFETCH_MAP`.

3. Upgrade `backend/src/controllers/reports.controller.js` (`getReportData`):
   - Support an optional `month` query parameter (`YYYY-MM`, e.g. `2026-10`): when `month` is passed, set `start = new Date(year, monthIndex, 1, 0, 0, 0)` and `end = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999)`.
   - Enhance each `reportType` so it returns `{ kpis, chartData, secondaryChartData, summaryTotals, table }`:
     - `sales`:
       - Query all non-cancelled `Order` rows (with `items.item`, `deliveries`, `payments`, `customer`) AND `SpotSale` rows in `[start, end]`.
       - Compute revenue & cash collected broken down by:
         1) Payment Channel (`secondaryChartData`): `Cash`, `Bank Transfer`, `EasyPaisa`, `JazzCash`, `Cheque`.
         2) Product / Bottle Size (`chartData` by day/date): `19L`, `1.5L`, `0.5L`, `Counter Water` (or Wadaana's 6 products).
         3) GST vs. Non-GST Sales: Total Excl. Tax, 18% GST Billed, Total Incl. Tax.
       - Fix the `table` mapping so multi-item orders list ALL items (`o.items.map(i => `${i.quantity}x ${i.item?.name}`).join(', ')`), Order Bill, Paid Amount, Unpaid Balance, Payment Channel, and Date.
     - `profitability`:
       - Return `chartData` comparing Daily/Weekly `Revenue`, `Raw Material COGS`, `Factory Expenses`, `Transport Expenses`, and `Net Profit`.
     - `production`:
       - Parse `remarks` JSON (`producedItems` and `lossDetails.wasteItems`) so `chartData` and `table` show exact Packs/Bottles produced per product, Broken Bottles count, and exact Raw Material consumed vs. lost due to breakage.
     - `credit` (Previously empty `table = []`!):
       - Query all active customers with `orders` (unpaid/partial), `spotSales` (`debtAmount > 0`), and `payments` in `[start, end]`.
       - Return `kpis` (`Customers With Debt`, `Total Unpaid Orders Debt`, `Total Counter Credit Debt`, `Total Market Udhaar`), `chartData` (top 10 debtors / debt by Customer Type: `Home`, `Commercial`, `Industrial`, `Corporate`, `Distributor`), and `table` listing each customer's ID (`JAM313xxxx`), Name, Phone, Type, Marketer Reference, Unpaid Orders Count, Counter Credit, and Total Balance Due.

4. Upgrade `frontend/src/pages/Reports.jsx` (Don Norman + Gestalt + Recharts UI):
   - Add a Month Picker (`<input type="month" />`) alongside the `Daily / Weekly / Monthly / Yearly / Custom` segmented control, plus a Print A4 Report button (using `printReceiptElement` with `{ format: 'a4', title: ... }`) next to Export CSV.
   - Use Gestalt Common Region to render a Visual Analytics Band above the table using `ResponsiveContainer`, `ComposedChart`, `BarChart`, `Bar`, `Line`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, and `Legend` from `'recharts'`:
     - On `sales`: Left chart (8 cols) = Daily Revenue by Bottle Size (`19L`, `1.5L`, `0.5L`); Right card (4 cols) = Cash Received by Channel (`Cash`, `Bank`, `EasyPaisa`, `JazzCash`, `Cheque`) with visual progress bars.
     - On `profitability`, `expenses`, `production`, `credit`, `vendor`, `fleet`: Render the corresponding Recharts bar/composed chart from `reportData.chartData`.
   - Add a quick search filter bar above the report table and a bold `<tfoot>` summary row at the bottom of the table.
````

# **4\. Verification & Post-Implementation Checklist**

After running each module above with Gemini 3.8 Flash, run these 3 commands in the terminal before committing:\# 1\. Verify zero syntax errors in backend controllers/middlewares

node \--check backend/src/middlewares/auth.middleware.js

node \--check backend/src/controllers/order.controller.js

node \--check backend/src/controllers/customer.controller.js

node \--check backend/src/controllers/analytics.controller.js

\# 2\. Verify schema.prisma was NOT modified

git diff backend/prisma/schema.prisma

\# 3\. Verify frontend production build succeeds with zero broken imports

cd frontend && pnpm run build  
