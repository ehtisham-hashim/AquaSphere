# **AquaSphere OS & Wadaana ERP — New Branch Audit, Marketer Attribution System & Reports Visual Overhaul (Zero Hardcoded Data)**

**Target Environments:** Both **AquaSphere** AND **Wadaana Industries** (100% Tenant-Aware)  
**Target AI Coding Agent:** Antigravity / Gemini 3.8 Flash (Strict File Boundaries & Complete Code Blocks)

# **1\. Branch Review (feat/voice-note...) & Why You Are Seeing Missing Clarity and False Data**

## **1.1 Git Branch & Commit Audit (From Your Git Graph)**

In your Git graph (feat/voice-note... ahead of origin/main by 7 commits), Antigravity executed the following sequence of commits:

* `feat(erp): implement voice...` — Initial pass at payment methods, GST toggle, and `JAM313` customer codes.  
* `fix(schema): ensure spot_...` — Added `SpotSale` fields / enum compatibility.  
* `fix(analytics): fix invalid cr...` — Patched a query error in `analytics.controller.js`.  
* `feat(filters): implement u...` — Added basic unpaid order filters in `Orders.jsx`.  
* `feat(ui): unify customer d...` — Added debt settlement UI.  
* `fix(whatsapp): preserve W...` — Updated WhatsApp link behavior.  
* `feat(...` (`HEAD -> feat/voice-note...`) — Latest UI tweak.

*(Note: Because `feat/voice-note...` has not been merged into `origin/main` yet, the GitHub connector zip still serves `origin/main` at commit `ef922f57`, so we audited the exact underlying controllers and components to catch everything Antigravity missed or left hardcoded.)*

## **1.2 What Antigravity Missed & The 5 Hardcoded / False Data Bugs in Reports & Dashboards**

**📌 The Golden Rule of Dynamic Products (`Item.type === 'FINISHED_GOOD'`):**  
In both AquaSphere and Wadaana, all sellable products are stored dynamically in the database via ``prisma[`${prefix}Item`]`` where `type: 'FINISHED_GOOD'` (and counter items via `RAW_MATERIAL` with `sellableOnCounter: true`). Whenever an Owner or Admin adds a brand-new product in Inventory (such as `"6L Canister"`, `"300ml Event Pack"`, `"Sparkling Water"`, or a new preform like `"Sufi 1L Preform"`), **Customer Registration, Order Filters, Dashboards, and Reports must never use hardcoded if/else name lists**. Instead, they must dynamically query and iterate over `items.filter(i => i.type === 'FINISHED_GOOD' && !i.archivedAt)` and group all `OrderItem`, `SpotSaleItem`, and `ProductionBatch` records dynamically by `itemId` / `item.name`.

| Defect ID | Where It Lives | What Is Happening (Why the Data Is False or Useless) | How We Fix It (For Both AquaSphere & Wadaana) |
| :---- | :---- | :---- | :---- |
| **FALSE-01 (CRITICAL)** | `frontend/src/components/dashboard/CashSummaryTab.jsx` (Lines 65–70) | **Fake Hardcoded Multipliers:** Lines 67–68 literally calculate: `'0.5L PET Sales': summary.ordersDelivered * 2 + ' packs'`, `'1.5L PET Sales': summary.ordersDelivered + ' packs'`. Even if you only delivered 19L bottles and zero PET packs, it multiplies `ordersDelivered * 2` and displays completely fake 0.5L and 1.5L pack sales\! | Replace fake multipliers with real item quantities aggregated dynamically from `FINISHED_GOOD` items in actual delivered orders (dynamically querying active finished goods rather than hardcoded size formulas). |
| **FALSE-02 (CRITICAL)** | `backend/src/controllers/reports.controller.js` (`case 'credit'`, Lines 272–280) | **100% Hardcoded Zeros:** The Customer Credits report does **not** query the database at all\! It literally returns hardcoded `Customers With Outstanding: '0'`, `Total Exposure: 'Rs. 0'`, and `table = []`\! | Replace with a real Prisma query across `Customer`, `Order` (`UNPAID`/`PARTIAL`), and `SpotSale` (`debtAmount > 0`), showing every customer's `JAM313xxxx` ID, **Marketer Name/ID**, Order Debt, Counter Debt, and Total Balance Due. |
| **FALSE-03 (CRITICAL)** | `backend/src/controllers/reports.controller.js` (`case 'sales'`, Lines 45–90) | **3 Major Bugs:**1\. Hardcodes `o.type === 'NINETEEN_L'` and `o.type === 'PET'`. In **Wadaana** (`PURE_BOTTLES` / `MIX_BOTTLES`), `19L Revenue` is `Rs. 0` and every Wadaana order is falsely labeled `'PET Bottle'`.2. Uses `o.items[0]?.item?.name` and `o.items[0]?.quantity` — **throwing away items \#2, \#3, \#4** on multi-item orders\!3. Sums only `Delivery.cashReceived`, ignoring `Payment` settlements, `SpotSale` counter sales, and unpaid billed amounts. | Rewrite `case 'sales'` to aggregate **every**`OrderItem` across all non-cancelled orders \+ `SpotSale` records, dynamically grouped by database catalog items (`Item.type === 'FINISHED_GOOD'`) and by payment channel (`Cash`, `Bank`, `EasyPaisa`, `JazzCash`, `Cheque`). |
| **FALSE-04 (HIGH)** | `backend/src/controllers/reports.controller.js` (`case 'production'`, Lines 222–270) | **Broken Wadaana & Multi-Item Batches:** Legacy hardcoded columns fail on custom/multi-item batches or new products. Needs dynamic parsing of batch remarks JSON (`producedItems`) and consumptions. | Dynamically read `b.remarks` JSON (`producedItems`) and `ProductionBatchConsumption`, mapping yield and scrap dynamically by `FINISHED_GOOD` item. |
| **FALSE-05 (HIGH)** | `Customer` ID (`JAM313xxxx`) & Marketer Reference Across Backend & Frontend | **Zero Ownership Clarity:** Generating `JAM3130001` alone does not tell staff **which marketer** owns or referred that customer, nor can you filter customers/orders by marketer or see how much revenue/cash each marketer generated for commission payouts. | Implement a full **Marketer Attribution & ID System**: register Marketers with short IDs (`MKT-01`, `MKT-02`), link every customer to a Marketer (`JAM3130001 • MKT-01 (Ali Raza)`), show the **Marketer Badge** on Customer Table, Customer Profile, and Orders, and add a **Marketer Commissions & Sales Report** tab\! |

# **2\. How the Marketer Reference & Customer ID System Should Work (AquaSphere & Wadaana)**

To solve the exact problem you described (*"obviously well it is JAM whatever, i don't think it gives a clarity it belongs to which, or frontend shows this customer belongs to who"*), here is the clean design that works identically in **AquaSphere** and **Wadaana**:

* **Dual-Badge Identification (Sequential Customer ID \+ Marketer Ownership Badge):**  
  * **Customer ID (`customerCode`):** Auto-generated sequentially as `JAM3130001`, `JAM3130002`, `JAM3130003`...  
  * **Marketer ID & Name (`marketerId` & `marketerName`):** Every marketer in the company gets a clean ID and name in the Marketer Registry (e.g., `MKT-01 — Ali Raza (19L)`, `MKT-02 — Bilal Khan (0.5L / 1.5L PET)`, `MKT-03 — Usman (Wadaana B2B)`, or `DIRECT — Walk-in / Company Direct`).  
  * **Combined Display Format in Frontend:** Wherever a customer appears (`CustomersTable.jsx`, `CustomerDetails.jsx`, `Orders.jsx`, `AddOrderModal.jsx`, `Reports.jsx`), the UI displays two linked badges side-by-side:  
    * **`🆔 JAM3130001`**  
    * **`👤 Ref: Ali Raza (MKT-01)`** *(in an indigo/emerald pill so you know at a glance who owns this customer\!)*  
* **Instant Marketer Filtering & Commission Calculation:**  
  * On the **Customer Directory (`Customers.jsx`)** and **Orders (`Orders.jsx`)** pages, a **Marketer Filter Dropdown** (`All Marketers`, `MKT-01 • Ali Raza`, `MKT-02 • Bilal Khan`, `Direct / Unassigned`) lets you filter the entire table by marketer in 1 click.  
  * On the **Reports Page (`Reports.jsx`)**, a new **Marketer Commissions & Referrals** tab shows a complete scorecard for each marketer:  
    * Marketer ID (`MKT-01`) & Name  
    * Total Referred Customers (`JAM313xxxx` list)  
    * Units / Packs Sold dynamically grouped by catalog `FINISHED_GOOD` items  
    * Total Billed Sales vs. **Actual Cash Collected** vs. **Pending Customer Debt**

# **3\. Copy-Paste Prompts for Antigravity / Gemini 3.8 Flash (Execute in 2 Focused Prompts)**

## **PROMPT 1: Marketer Attribution & Customer Ownership System (`JAM313xxxx` \+ `MKT-xx` Badge & Filter for AquaSphere & Wadaana)**

Copy and paste this prompt into Antigravity:

````
TASK: Upgrade the Customer ID (`JAM313xxxx`) and Marketer Reference system so it is 100% clear which marketer every customer belongs to across both AquaSphere and Wadaana Industries.

STRICT BOUNDARIES:
- DO NOT alter `backend/prisma/schema.prisma`. Use `prisma[`${prefix}TenantSetting`]` (`key: 'CUSTOMER_META_REGISTRY'` and `key: 'MARKETERS_REGISTRY'`) so all 70 production customers remain untouched.

EXACT STEP-BY-STEP INSTRUCTIONS:

### 1. Backend Marketer & Customer ID Registry (`backend/src/controllers/customer.controller.js` & `customer.routes.js`)
1. Maintain two keys in `prisma[`${prefix}TenantSetting`]`:
   - `MARKETERS_REGISTRY`: stores `{ nextMarketerSeq: 1, marketers: [ { id: 'MKT-01', name: '...', phone: '...', segment: '19L / PET / Wadaana' } ] }`.
   - `CUSTOMER_META_REGISTRY`: stores `{ nextSeq: 1, byCustomerId: { [customerId]: { customerCode: 'JAM3130001', marketerId: 'MKT-01', marketerName: '...', buysPureFine05L: false, qtyPureFine05L: 0, buysPureFine15L: false, qtyPureFine15L: 0, buyerNtn: '', buyerStrn: '' } } }`.
2. Add endpoints in `customer.controller.js` and mount them in `customer.routes.js` (before `/:id` routes!):
   - `GET /api/v1/customers/marketers` (`getMarketers`): returns the list of registered marketers for the active tenant (`aquasphere` or `wadaana`), plus computed stats for each marketer (`customersCount`, `totalDebt`, `customerCodes`).
   - `POST /api/v1/customers/marketers` (`createMarketer`): accepts `{ name, phone, segment }`, auto-generates `id: `MKT-${String(nextMarketerSeq).padStart(2, '0')}`` (e.g. `MKT-01`, `MKT-02`), saves to `MARKETERS_REGISTRY`, and returns the new marketer.
3. In `ensureCustomerMeta(prefix, customersList)`:
   - Sort any customers missing a `customerCode` by `createdAt ASC` and assign `JAM3130001`, `JAM3130002`, etc.
   - For every customer, attach:
     - `customerCode` (e.g. `'JAM3130001'`)
     - `marketerId` (e.g. `'MKT-01'` or `'DIRECT'`)
     - `marketerName` (e.g. `'Ali Raza'` or `'Direct / Company'`)
     - `marketerDisplay`: `marketerId && marketerId !== 'DIRECT' ? `${marketerId} • ${marketerName}` : (marketerName || 'Direct / Unassigned')`
4. In `createCustomer` and `updateCustomer`:
   - Accept `marketerId` and `marketerName` (or `marketerRef`) from `req.body`.
   - If the user typed a new `marketerName` that doesn't exist in `MARKETERS_REGISTRY` yet, automatically register it as `MKT-xx` in `MARKETERS_REGISTRY` so it gets an official `MKT-xx` ID!
   - Save `marketerId` and `marketerName` in `CUSTOMER_META_REGISTRY.byCustomerId[customer.id]` and return them on the customer object.

### 2. Frontend Customer Registration & Edit Form (`frontend/src/components/customer/CustomerFormFields.jsx`)
1. Fetch `/api/v1/customers/marketers` when `CustomerFormFields` mounts.
2. In the **Basic Details** section, add a prominent **Customer ID & Marketer Attribution** box:
   - **Customer ID (Read-Only):** Shows `formData.customerCode || 'Auto-Generated (JAM313xxxx)'` in a monospace badge.
   - **Referred By / Marketer (Dropdown + Quick Add):**
     - A `<select name="marketerId">` listing `Direct / Company (No Marketer)` and all registered marketers (`MKT-01 — Ali Raza`, `MKT-02 — Bilal`, etc.), plus an option `+ Register New Marketer...`.

### 3. Frontend Customer Directory, Filter & Profile (`Customers.jsx`, `CustomersTable.jsx`, `CustomerDetails.jsx`)
1. In `frontend/src/pages/Customers.jsx`:
   - Add a **Marketer Filter Dropdown** (`All Marketers`, `Unassigned / Direct`, and each `MKT-xx • Name` present in the customers list) right next to the search bar so the Owner, Admin, MM, or Accountant can filter the customer list by Marketer in 1 click!
   - Also allow the search input to match `c.customerCode` (`JAM313...`), `c.marketerId` (`MKT-01`), and `c.marketerName`.
2. In `frontend/src/components/customer/CustomersTable.jsx`:
   - In the `Customer` column of each row, display **both** badges clearly:
     ```jsx
     <div className="flex flex-wrap items-center gap-1.5 mt-1">
       <span className="font-mono text-[10px] font-extrabold px-2 py-0.5 rounded bg-slate-900 text-white">
         {c.customerCode || `#${c.id.slice(0, 6).toUpperCase()}`}
       </span>
       <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
         c.marketerId && c.marketerId !== 'DIRECT'
           ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
           : 'bg-slate-100 text-slate-500 border-slate-200'
       }`}>
         👤 {c.marketerId && c.marketerId !== 'DIRECT' ? `${c.marketerId} • ${c.marketerName}` : (c.marketerName || 'Direct')}
       </span>
       <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
         {c.type}
       </span>
     </div>
     ```
3. In `frontend/src/components/customer/CustomerDetails.jsx`:
   - Under the customer's name at the top of the profile card, display two prominent pills:
     - **`🆔 ID: {c.customerCode || c.id.slice(0, 8).toUpperCase()}`**
     - **`👤 Marketer: {c.marketerId && c.marketerId !== 'DIRECT' ? `${c.marketerName} (${c.marketerId})` : 'Direct / Company'}`**
````

## **PROMPT 2: Complete Overhaul of Reports Page (`Reports.jsx` & `reports.controller.js`) & Removing All False/Hardcoded Data (AquaSphere & Wadaana)**

Copy and paste this prompt into Antigravity after Prompt 1 finishes:

```
TASK: Eliminate all hardcoded/false data in `CashSummaryTab.jsx` and `reports.controller.js`, and overhaul `frontend/src/pages/Reports.jsx` into a high-clarity, Recharts-powered visual reporting suite that works accurately for BOTH AquaSphere and Wadaana Industries.

STRICT BOUNDARIES:
- DO NOT alter `backend/prisma/schema.prisma`.
- Edit ONLY these 5 files:
  1. `frontend/src/components/dashboard/CashSummaryTab.jsx`
  2. `backend/src/controllers/reports.controller.js`
  3. `frontend/src/pages/Reports.jsx`
  4. `frontend/src/components/layout/Sidebar.jsx`
  5. `frontend/src/constants/roleAccess.js`

EXACT STEP-BY-STEP INSTRUCTIONS:

### 1. Remove Fake Hardcoded Multipliers in `frontend/src/components/dashboard/CashSummaryTab.jsx`
- Locate lines 65–72 in `CashSummaryTab.jsx` where `0.5L PET Sales` is hardcoded to `${summary.ordersDelivered * 2} packs` and `1.5L PET Sales` is hardcoded to `${summary.ordersDelivered} packs`.
- Replace those fake formulas with real counts from `summary` (`summary.delivered19L || 0`, `summary.delivered05L || 0`, `summary.delivered15L || 0`, or if item-level counts are not in `summary`, show `Orders Delivered: summary.ordersDelivered || 0`, `Pending Orders: summary.pendingOrders || 0`, `Counter Sales: summary.spotSales || 0`, `Total Orders: summary.ordersTotal || 0` for both tenants so zero fake pack numbers are ever shown!).

### 2. Rewrite `backend/src/controllers/reports.controller.js` with 100% Real Database Aggregations (Tenant-Aware for AquaSphere & Wadaana)
Update `getReportData` in `backend/src/controllers/reports.controller.js` so it supports `?period=daily|weekly|monthly|yearly|custom&month=YYYY-MM&startDate=...&endDate=...` and returns `{ kpis, chartData, secondaryBreakdown, summaryRow, table }`:


```

2. **`case 'sales'` (Sales, Payment Channels & Size Breakdown Report):**  
   * Query all non-cancelled `Order` rows (including `customer`, `items.item`, `deliveries`, `payments`) AND `SpotSale` rows (including `customer`, `items.item`) in `[start, end]`, plus `CUSTOMER_META_REGISTRY` from `TenantSetting`.  
   * Compute:  
     * **Total Billed Sales (Rs)** (including 18% GST if `remarks.includes('[GST:18%]')`)  
     * **Total Cash Collected (Rs)** (from Order Deliveries/Payments \+ Counter Sales)  
     * **Unpaid Credit Billed in Period (Rs)**  
     * **`secondaryBreakdown.byPaymentMethod`**: Exact cash collected across `CASH`, `BANK_TRANSFER`, `EASYPAISA`, `JAZZCASH`, `CHEQUE`.  
     * **`secondaryBreakdown.byProduct`**: Dynamically aggregated units, billed revenue, and pro-rated cash collected per `FINISHED_GOOD` catalog item (plus dynamic on-the-fly buckets for custom counter water/materials) returned as `Array.from(productBreakdownMap.values()).filter(p => p.qtySold > 0 || activeFinishedGoods.some(fg => fg.id === p.itemId))`.  
     * **`chartData`**: Daily time-series array `[{ label: 'Oct 01', Billed: ..., Collected: ..., Credit: ... }]` for Recharts\!  
   * Build `table` listing every Order and SpotSale with **all** items (`o.items.map(i =>` \${i.quantity}x \${i.item?.name}`).join(', ')` — never `o.items[0]`\!), Customer ID (`JAM313xxxx`), Customer Name, Marketer (`MKT-xx`), Total Bill, Paid Amount, Balance Due, Payment Method, and Date.  
3. **`case 'marketers'` (NEW TAB: Marketer Reference & Commission Report):**  
   * Load `CUSTOMER_META_REGISTRY` and `MARKETERS_REGISTRY`, plus all `Customer` rows, `Order` rows in `[start, end]`, and `Payment` rows in `[start, end]`.  
   * Group customers and their orders by `marketerId` (`MKT-01`, `MKT-02`, ..., `DIRECT`).  
   * Return:  
     * `kpis`: `Active Marketers`, `Referred Customers`, `Referred Sales (Billed)`, `Referred Cash Collected`.  
     * `chartData`: Per-marketer bar chart data `[{ label: 'MKT-01 Ali', BilledSales: ..., CashCollected: ..., UnpaidDebt: ... }]`.  
     * `table`: One row per Marketer (plus per-customer drilldown rows) showing `Marketer ID`, `Marketer Name`, `Customers Count`, `Customer IDs (JAM313...)`, `Units Sold by Finished Good`, `Total Billed (Rs)`, `Cash Collected (Rs)`, and `Outstanding Customer Debt (Rs)`.  
4. **`case 'credit'` (Fixed Customer Credit & Overdue Ledger — Replaces Hardcoded Zeros\!):**  
   * Query all non-archived `Customer` rows with unpaid/partial `orders` and unpaid `spotSales` (`debtAmount > 0`), enriched with `CUSTOMER_META_REGISTRY` (`customerCode`, `marketerId`, `marketerName`).  
   * Filter to customers where total unpaid debt \> 0\.  
   * Return real `kpis` (`Customers With Debt`, `Unpaid Orders Debt`, `Counter Credit Debt`, `Total Market Udhaar`), `chartData` (Top 10 Debtors bar chart), and `table` showing `Customer ID (JAM313...)`, `Customer Name`, `Marketer`, `Phone`, `Type`, `Unpaid Orders`, `Order Debt (Rs)`, `Counter Debt (Rs)`, and `Total Balance Due (Rs)`.  
5. **`case 'profitability'` (Real P\&L Statement for AquaSphere & Wadaana):**  
   * Include Order cash \+ SpotSale cash, Weighted Average COGS from `PurchaseItem` & `ProductionBatchConsumption`, and Operating \+ Transport `Expense` rows grouped by category.  
   * Return `chartData` showing `Revenue`, `COGS`, `Expenses`, and `Net Profit`.  
6. **`case 'production'` (Tenant-Aware Production & Breakage Report):**  
   * Dynamically read `b.remarks` JSON (`producedItems`, which stores `[{ itemId, name, quantity, unit, packSize }]` per finished good) and `b.consumptions` (linking `itemId` to `Item`), falling back to legacy columns only for historical rows, and return yield and breakage dynamically per `FINISHED_GOOD` item (`byFinishedGood: Array.from(prodItemMap.values())`).

## **3\. Overhaul `frontend/src/pages/Reports.jsx` for Immediate Visual Clarity (Recharts \+ Don Norman \+ Gestalt Grouping)**

1. Restore `Monthly Reports` (`/erp-reports`) in `Sidebar.jsx` and `roleAccess.js` for `OWNER`, `ADMIN`, and `ACCOUNTANT`.  
2. In `frontend/src/pages/Reports.jsx`:  
   * Add `'marketers'` (`Marketer Commissions`) to `REPORT_TABS`:  
     1. `Sales & Channels` (`sales`)  
     2. `Marketer Commissions` (`marketers`)  
     3. `Customer Credit (Udhaar)` (`credit`)  
     4. `Profitability (P&L)` (`profitability`)  
     5. `Production & Scrap` (`production`)  
     6. `Operating Expenses` (`expenses`)  
     7. `Inventory Health` (`inventory`)  
     8. `Vendor Payables` (`vendor`)  
     9. `19L Bottle Fleet` (`fleet` — hidden when `isWadaana` is true\!)  
   * Add a **Month Picker** (`<input type="month" />`) in the header bar next to period buttons, a **Dynamic Product Filter Dropdown** populated from `/api/v1/items?type=FINISHED_GOOD` (also added to `Orders.jsx`), a **Search Filter** input, and a **Print Report** button.  
   * Above the data table, render a **2-Column Visual Intelligence Section** whenever `reportData` loads:  
     * **Left Card (`ComposedChart` / `BarChart` via Recharts):** Visualizes `reportData.chartData` (e.g., Daily Billed vs. Collected Cash, Marketer Sales comparison, Top Debtors, or Production Good Yield vs. Scrap).  
     * **Right Card (`secondaryBreakdown` Summary Cards):** On the `sales` tab, shows two clean visual breakdown boxes:  
       1. **Cash Received by Account:** Dynamically maps over `Object.entries(reportData.secondaryBreakdown?.byPaymentMethod || {})` with percentage bars and exact PKR totals.  
       2. **Revenue & Volume by Finished Good (100% Dynamic):** Dynamically maps over `reportData.secondaryBreakdown?.byProduct || []`—rendering each `FINISHED_GOOD` item's `name`, `qtySold` (`unit`), `billedRevenue`, and `cashCollected` with a progress bar and zero hardcoded product names.  
   * At the bottom of the data table, render a bold sticky `<tfoot>` row showing `reportData.summaryRow` totals so staff never have to manually add up rows.

