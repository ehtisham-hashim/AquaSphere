# AquaSphere & Wadaana ERP — Master Architectural & Logic Audit Plan (V2 — Post-Review Verified)
**Scope:** Base-Unit & `packSize` Architecture · Canonical Recipe Deductions · Counter Sale (`SpotSale`) Rollbacks & COGS · All 6 Role Dashboards (Owner, Admin, MM, Accountant, PM, TM) · Cross-API Data Integrity & Chart Redesign  
**Target Codebase Commit:** `bd149d9` / `5d8450d`  
**Schema & Guardrails Verified Against:** `backend/prisma/schema.prisma`, `.agents/skills/aquasphere-erp-guardrails/SKILL.md`, `backend/src/constants/productMappings.js`, and `backend/src/utils/autoMigrations.js`  
*(Note: All findings from Antigravity's 3-subagent review have been integrated and resolved below so execution can proceed with zero regressions.)*

---

## 1. Pre-Resolved Architectural Decisions (Answers to All `/grill-me` Review Points)

To save time and eliminate every edge-case risk identified during code review, the following **8 canonical rules** govern this implementation:

1. **Canonical Per-Pack / Per-Unit Recipe Storage in DB (Zero Runtime Heuristic Guessing):**
   - `RecipeItem.quantityPerUnit` in PostgreSQL strictly stores the raw material quantity required to produce **1 selling unit of the Finished Good** (`1 Pack` when `packSize > 1`, `1 Bottle` when `packSize === 1`).
   - **Why we do NOT use a runtime `rawQty < packSize` heuristic:** In `autoMigrations.js:L358, L378` and `SKILL.md` Section 2, `0.5L Labels` (`0.00672 kg/pack`) and `1.5L Labels` (`0.00780 kg/pack`) are stored in **`kg`**, not pieces. A runtime heuristic that multiplies `< packSize` items matching `'label'` would over-deduct labels by `12x` / `6x`.
   - Instead, `productionFormulas.js` (`calculateBatchDeductions`) remains **100% deterministic**:
     - `goodQty = quantity * qtyPerUnit`
     - `lossQty = !isShrinkFilm ? (isPack ? (qtyPerUnit / packSize) * wasteQuantity : qtyPerUnit * wasteQuantity) : 0`
   - And `AddEditFinishedGoodModal.jsx` provides an explicit UI toggle (**`Input Mode: Per 1 Pack (×${packSize})`** vs. **`Per 1 Single Bottle`**) that converts per-bottle inputs into canonical per-pack values **at save time**!

2. **Stop `autoMigrations.js` From Overwriting Existing User Recipes on Server Restart:**
   - Currently, `autoMigrations.js:L320-L430` runs `aquasphereRecipeItem.update` and `wadaanaRecipeItem.update` on **every server boot**, wiping out any recipe edits made by the Owner in the UI!
   - **Rule:** `autoMigrations.js` must **only seed missing recipe rows when a finished good has no recipe items** (or create missing links without overwriting `existing.quantityPerUnit`), while still cleaning up the deprecated generic shrink wrap item if present.

3. **Guard Stock Inputs When Editing `packSize` in `AddEditFinishedGoodModal.jsx`:**
   - When editing an existing item in `AddEditFinishedGoodModal.jsx`, changing `packSize` (e.g. from `1` to `12` or `12` to `6`) must **not** accidentally multiply or halve `factoryStock` and `warehouseStock` on submit unless the user explicitly changed the stock numbers.
   - **Rule:** When `packSize` is edited in `AddEditFinishedGoodModal.jsx`, keep `factoryStock` / `warehouseStock` anchored to the item's true base-bottle counts (`itemToEdit.factoryQty` and `itemToEdit.warehouseQty`) when converting between `Packs` and `Base Bottles` display modes.

4. **Preserve Treated-Water Specs (`24L / 12L / 9L`) in `productMappings.js` for Mineral Dosing:**
   - Per `backend/src/constants/productMappings.js:L10-L42`, `24.0L` (19L bottle), `12.0L` (1.5L 6-pack = `2.0L/btl`), and `9.0L` (0.5L 12-pack = `0.75L/btl`) are **Owner-specified treated water volumes (including RO/wash loss)** calibrated against `15,141L` per mineral set.
   - **Rule:** Keep `24.0L / 12.0L / 9.0L` untouched for mineral dosing (`SPOT_SALE_MINERAL_DOSING` and `calculate19LMinerals`) so mineral deductions never drop by 20.8%. If net beverage volume (`19L / 9L / 6L`) is shown in UI tooltips, keep it strictly separate from `totalWaterLitres` used for mineral dosing.

5. **Exact Schema Column (`PurchaseItem.total`) & Returnable Asset Exclusion in Recipe COGS:**
   - **Schema Column:** `AquaspherePurchaseItem` and `WadaanaPurchaseItem` (`schema.prisma:L327-L342`) use `total` and `unitPrice` (NOT `totalPrice`), and parent `purchase.status` must exclude `'CANCELLED'`.
   - **Returnable 19L Bottle Exclusion:** `19L Empty Bottle` (`isReturnable === true` or raw material matching `'19'` + `'bottle'`) is a **returnable capital asset** (covered by the Rs. 1,000 security deposit), **NOT** a single-use consumable! It must be **excluded** from per-sale Recipe COGS of `19L Bottled Water` (only `19L Cap` + `Calcium` + `Magnesium` + `Sodium` are included in per-bottle 19L COGS).
   - **Counter Sale Virtual Lines COGS:**
     - `WATER_REFILL`: COGS = `1 × 19L Cap unit cost` + `24L treated-water mineral cost` (never the `19L Empty Bottle` cost).
     - `CUSTOM_WATER`: COGS = `qty × 1L treated-water mineral cost` (never `genericFallbackItem`'s recipe cost).
     - `EXTRA_CHARGE`: COGS = `qty × Cap unit cost`.
   - **Ex-GST Gross Profit:** Compute `netSalesExGst = sales - gstAmount` so GST collected is never counted as company profit (`grossProfit = netSalesExGst - estimatedCogs`).

6. **Unified, Non-Duplicating `deleteSpotSale` Rollback (`spotSale.controller.js`):**
   - `createSpotSale` writes `refId: saleNumber` on `InventoryTransaction` rows and already has dedicated rollback loops for `EXTRA_CHARGE` (`SPOT_SALE_EXTRA_CAP`) and `SPOT_SALE_MINERAL_DOSING`.
   - **Rule:** In `deleteSpotSale`, skip `['WATER_REFILL', 'CUSTOM_WATER', 'EXTRA_CHARGE']` in the product-line loop (preventing `CUSTOM_WATER` from adding phantom bottles to `genericFallbackItem`). For physical product lines (`PACK`, `BOTTLE`, `UNIT`, `RAW_MATERIAL`), look up the `OUT` `InventoryTransaction` rows matching `{ refType: 'SPOT_SALE', refId: { in: [existing.saleNumber, existing.id].filter(Boolean) }, itemId: line.itemId, reason: { notIn: ['SPOT_SALE_MINERAL_DOSING', 'SPOT_SALE_EXTRA_CAP', 'SPOT_SALE_REFILL_CAP'] } }` to restore exact `FACTORY` vs. `WAREHOUSE` quantities (falling back to `factoryQty` only for legacy sales without location-tagged `OUT` txns), and add a dedicated reversal for `SPOT_SALE_REFILL_CAP`.

7. **Distinguish `netCashFlow` (All Channels) vs. `expectedDrawerCash` (Physical `CASH` Only):**
   - `dailyClose.controller.js:L64-L88` computes physical drawer cash (`CASH` payments + `CASH` spot sales - `Expense` - `CASH` vendor payments), whereas `analytics.controller.js` `b.cash` sums all payment methods (`CASH`, `BANK_TRANSFER`, `EASYPAISA`, `JAZZCASH`, `CHEQUE`).
   - **Rule:** `analytics.controller.js` must expose **both** `netCashFlow` (All-Channel Cash Inflow - OpEx - Vendor Payments) and `expectedDrawerCash` (Physical `CASH` Inflow - OpEx - `CASH` Vendor Payments) so Owner and Accountant see both total treasury cash flow and exact physical drawer cash matching `DailyClose`.

8. **Strict Marketing Manager RBAC (Zero Financial Rs. on MM Dashboard) & Tenant-Aware SKU Bars:**
   - Per `MarketingDashboardView.jsx:L142`, `MARKETING_MANAGER` is strictly prohibited from viewing financial revenue/cash/expense amounts in Rs.
   - **Rule:** Do **not** add `Order Revenue (Rs.)` to `MarketingDashboardView.jsx`. Keep the MM chart 100% count/volume-based (**View 1: `Delivered vs. Pending/Partial Orders Count`**; **View 2: `Units/Packs Sold by SKU`**, dynamically rendered from the tenant's actual items so both AquaSphere's `19L / 1.5L / 0.5L` and Wadaana's 6 branded SKUs work automatically). Keep the `12m` (12-Month) option on `OwnerDashboardView.jsx` (`7D | 14D | 30D | 12M`).

---

## 2. Master Summary Table of All Verified Bugs & Fixes

| ID | Area | File & Exact Line Reference | Confirmed Bug | Verified Production-Safe Fix |
| :--- | :--- | :--- | :--- | :--- |
| **BOM-01** | Catalog & `packSize` | `backend/src/controllers/item.controller.js:L203-L229` | `updateItem` (`PUT /api/v1/items/:id`) never extracts or saves `packSize`. Editing pack size in `AddEditFinishedGoodModal.jsx` silently drops the update. | Destructure `packSize` in `updateItem`, validate `Math.max(1, parseInt(packSize, 10) || 1)`, and persist to Prisma. |
| **BOM-02** | Boot Recipe Wipe | `backend/src/utils/autoMigrations.js:L318-L437` | `ensureShrinkWrapMaterials` calls `aquasphereRecipeItem.update` and `wadaanaRecipeItem.update` on **every server restart**, wiping any custom recipe changes saved by the Owner. | Change `upsertRecipe` (and Wadaana BOM loop) to **insert-if-missing only** (`if (!existing) create(...)`) so user-edited `quantityPerUnit` values are never overwritten on boot. Also ensure AquaSphere `0.5L` (`packSize: 12`) and `1.5L` (`packSize: 6`) have `packSize` healed if `<= 1`. |
| **BOM-03** | Recipe Modal & Stock Guard | `frontend/src/components/inventory/AddEditFinishedGoodModal.jsx:L50-L72, L125-L155, L355-L365` | (1) `getItems` sets `item.unit = 'bottle'`, making the modal header say `Per 1 bottle` even when `packSize = 12`, while `productionFormulas.js` multiplies `quantity (Packs) * quantityPerUnit`. (2) Changing `packSize` while `stockInputMode === 'packs'` multiplies existing stock by `newPackSize / oldPackSize` on save! | (1) When `parsedPackSize > 1`, display `Recipe Consumption — Per 1 Pack (${parsedPackSize} Bottles)` and add an input mode toggle (`Per 1 Pack` vs `Per 1 Bottle`) that converts per-bottle values to canonical per-pack values on save (`qty * parsedPackSize` for non-shrink items). (2) Anchor `factoryStock` and `warehouseStock` conversions to base bottles when `packSize` changes so stock is never corrupted. |
| **BOM-04** | Batch Modal & Name Sniffing | `CreateBatchModal.jsx:L33-L60, L113-L125, L307`, `CompleteBatchModal.jsx:L45, L113`, `LogCounterSaleForm.jsx:L24-L30` | (1) `CreateBatchModal.jsx:L39` reads `fg.recipe` (undefined) instead of `fg.recipeFinishedGoods`. (2) Hardcoded `'0.5' -> 12, '1.5' -> 6` name-sniffing in `CreateBatchModal`, `CompleteBatchModal`, `ProductionBatchTable`, `production.controller.js:L186`, and `LogCounterSaleForm.jsx:L24-L30`. | (1) Read `fg.recipeFinishedGoods` in `CreateBatchModal.jsx:L39`. (2) Remove hardcoded `'0.5' / '1.5'` packSize guessing everywhere; use `Math.max(1, Number(item.packSize) || 1)`. (3) Add explicit Scrap Mode toggle in `CompleteBatchModal.jsx` (Extra Line Breakage vs. Deduct Breakage from Output). |
| **BOM-05** | Single-Item Batch Double Count & 19L Rollback | `backend/src/controllers/production.controller.js:L223-L228, L690-L725` | (1) On `L225`, when an AquaSphere batch has 1 item (`itemsToProduce.length === 1`) and that item is `0.5L` or `1.5L`, `batchData.quantity` is set to `itemsToProduce[0].quantity` **AND** `packs05L`/`packs15L` is set, causing analytics to double-count those packs as `19L Bottles`! (2) `deleteProductionBatch` (`L690-L725`) leaves orphaned `BottleTransaction` rows for 19L batches. | (1) On `L225`, set `quantity: total19L > 0 ? total19L : (customItems.length === 1 ? customItems[0].quantity : null)`. (2) Tag `BottleTransaction` notes/reason in `completeProductionBatch` with batch ID/number and delete matching `BottleTransaction` rows (`MOVED_TO_FACTORY`, `RETURNED_BROKEN`) in `deleteProductionBatch`. |
| **CS-01** | Counter Sale Pack Policy | `frontend/src/components/counterSales/LogCounterSaleForm.jsx`, `backend/src/controllers/spotSale.controller.js` | Packed items (`packSize > 1`) must be strictly sold as full packs (`PACK`) on the counter; loose bottles are not sold. | Enforce full packs at pack rate for `packSize > 1` with inline rate override; reject loose single-bottle sales or fractional pack quantities on the counter. |
| **CS-02** | `CUSTOM_WATER` Delete Bug & Location Restore | `backend/src/controllers/spotSale.controller.js:L698-L785` | (1) `deleteSpotSale` (`L703`) skips `WATER_REFILL` and `EXTRA_CHARGE` but **forgets `CUSTOM_WATER`**, incrementing `genericFallbackItem` stock by custom water litres on delete! (2) Restores all product stock to `factoryQty` even when `createSpotSale` deducted from `warehouseQty`. | (1) Skip `['WATER_REFILL', 'CUSTOM_WATER', 'EXTRA_CHARGE']` in the product loop. (2) Restore product stock using the recorded `location` (`FACTORY` vs `WAREHOUSE`) on the `SPOT_SALE` `OUT` `InventoryTransaction` rows (`refId: { in: [existing.saleNumber, existing.id] }`, excluding mineral and extra-cap reasons so they are never double-restored). |
| **CS-03** | `WATER_REFILL` 19L Cap Deduction | `backend/src/controllers/spotSale.controller.js:L215-L240, L360-L410` | `WATER_REFILL` deducts treated-water minerals (`24L`) but **never deducts 1 × `19L Cap`** from `RAW_MATERIAL` inventory. | On `WATER_REFILL`, deduct `lineQty` from the `19L Cap` / `Large Cap` raw material (`reason: 'SPOT_SALE_REFILL_CAP'`, `refType: 'SPOT_SALE'`, `refId: saleNumber`) and reverse `SPOT_SALE_REFILL_CAP` inside `deleteSpotSale`. |
| **CS-04** | Recipe COGS Engine | `backend/src/controllers/analytics.controller.js` | No COGS calculation exists for Orders or Counter Sales. | Compute weighted-average raw material cost from `PurchaseItem` (`total / quantity`, where `purchase.status !== 'CANCELLED'`), exclude returnable `19L Empty Bottle` capex, handle `WATER_REFILL` (cap + 24L minerals) and `CUSTOM_WATER` (1L minerals) accurately, and compute `grossProfit = netSalesExGst - estimatedCogs`. |
| **DASH-01** | Owner Dashboard & Bar Chart | `OwnerDashboardView.jsx:L164-L315` & `analytics.controller.js:L270-L380` | (1) Chart labels `cash - expenses - vendorPayments` as `"Net Profit"`. (2) `OwnerDashboardView.jsx:L200` drops `vendorPayments` from `netCash`. (3) `Expenses` card hides `Purchases` and `VendorPayments`. | Expose `netCashFlow`, `expectedDrawerCash`, `estimatedCogs`, `grossProfit`, and `operatingProfit`. Redesign chart with 2 tabs (`Profitability & COGS` vs `Cash Flow & Treasury`) and `7D | 14D | 30D | 12M` range selector. |
| **DASH-02** | Marketing Manager Dashboard | `MarketingDashboardView.jsx:L88-L90, L170-L185` & `analytics.controller.js:L199` | Subtracts all-time `unprocessedOrders.length` from timeframe `bottlesSold` (`ordersCount`), showing `0 Delivered`. Chart only plots raw order count. | Track `ordersCount`, `deliveredOrdersCount`, `pendingOrdersCount`, `partialOrdersCount`, and per-SKU volume in each timeframe bucket. Keep MM chart strictly non-financial (RBAC compliant): View 1 (`Delivered vs. Pending Orders`), View 2 (`Tenant-Aware SKU Volume Sold`). |
| **DASH-03** | Admin Dashboard | `backend/src/controllers/adminDashboard.controller.js:L60-L150` & `AdminDashboardView.jsx` | (1) `totalGoodYield` sums `b.quantity || 0` (which is `0` for Wadaana and multi-item batches). (2) Queries batches by `createdAt` instead of `batchDate`. (3) Omits `SpotSale` count/revenue. | Filter batches by `batchDate`, sum `remarks.producedItems` / Wadaana columns / AquaSphere columns accurately, and include `SpotSale` count & revenue in Admin KPIs. |
| **DASH-04** | Accountant, PM & TM Dashboards | `AccountantDashboardView.jsx`, `ProductionDashboardView.jsx`, `TransportDashboardView.jsx` | (1) Accountant drops `vendorPayments` from `netCash`, reads non-existent `data.monthlyPurchases` (`Rs. 0`), and hardcodes `today` on Expense Log. (2) Production ignores `timeframe` on KPI summary and ignores `remarks.producedItems`. (3) Transport ignores `timeframe` on `todayBottlesRecovered`, truncates at `limit=50`, and shows `Bottles Returned` on Wadaana. | Fix Accountant `netCashFlow` + `expectedDrawerCash`, wire `activeData.purchases`, and pass `timeframe` date range to `/expenses`. Pass `timeframe` to `/analytics/production-dashboard` and parse `remarks.producedItems`. Hide `Bottles Returned` on Wadaana in `TransportDashboardView.jsx` and filter recoveries by `timeframe`. |

---

## 3. Detailed Code Specifications by Task

### Task 1: Catalog `packSize`, Boot Migration Safety & Recipe Modal (`BOM-01` – `BOM-05`)

#### 1.1 Fix `updateItem` in `backend/src/controllers/item.controller.js` (`L203-L229`)
Extract `packSize` from `req.body` and include it in `updateData`:
```javascript
export const updateItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    name,
    unit,
    packSize,
    reorderLevel,
    initialStock = 0,
    quantityToAdd = 0,
    currentStock,
    factoryStock,
    warehouseStock,
    recipe,
    retailPrice,
    sellableOnCounter,
    isReturnable
  } = req.body;
  const prefix = getTenantPrefix(req);
  const parsedPackSize = packSize !== undefined ? Math.max(1, parseInt(packSize, 10) || 1) : undefined;
  // ...
    const updateData = {
      ...(name && name.trim() ? { name: name.trim() } : {}),
      ...(unit ? { unit } : {}),
      ...(parsedPackSize !== undefined ? { packSize: parsedPackSize } : {}),
      ...(reorderLevel !== undefined ? { reorderLevel: parseFloat(reorderLevel) || 0 } : {}),
      ...(retailPrice !== undefined ? { retailPrice: Math.max(0, parseFloat(retailPrice) || 0) } : {}),
      ...(sellableOnCounter !== undefined ? { sellableOnCounter: Boolean(sellableOnCounter) } : {}),
      ...(isReturnable !== undefined ? { isReturnable: Boolean(isReturnable) } : {})
    };
```

#### 1.2 Stop `autoMigrations.js` (`L318-L437`) From Overwriting Existing Recipes on Restart
In `backend/src/utils/autoMigrations.js`:
1. Change `upsertRecipe` to `ensureRecipeIfMissing` so existing `RecipeItem.quantityPerUnit` values edited by the Owner are **never** overwritten on server restart:
   ```javascript
   const ensureRecipeIfMissing = async (fgId, rmId, defaultQty) => {
     if (!fgId || !rmId) return;
     const existing = await prisma.aquasphereRecipeItem.findFirst({
       where: { finishedGoodId: fgId, rawMaterialId: rmId }
     });
     // ONLY create if missing — NEVER overwrite an existing recipe item's quantityPerUnit on boot!
     if (!existing) {
       await prisma.aquasphereRecipeItem.create({
         data: { finishedGoodId: fgId, rawMaterialId: rmId, quantityPerUnit: defaultQty }
       });
     }
   };
   ```
2. Apply the same `if (!existing)` guard to the Wadaana recipe loop (`L415-L428`).
3. Also in the `for (const fg of finishedGoods)` loop in `autoMigrations.js`, ensure standard AquaSphere `0.5L` (`packSize: 12`) and `1.5L` (`packSize: 6`) items have their `packSize` healed if `Number(fg.packSize || 1) <= 1`:
   ```javascript
   if ((fgNameLower.includes('0.5') || fgNameLower.includes('500')) && Number(fg.packSize || 1) <= 1) {
     await prisma.aquasphereItem.update({ where: { id: fg.id }, data: { packSize: 12 } });
   } else if ((fgNameLower.includes('1.5') || fgNameLower.includes('1500')) && Number(fg.packSize || 1) <= 1) {
     await prisma.aquasphereItem.update({ where: { id: fg.id }, data: { packSize: 6 } });
   }
   ```

#### 1.3 Fix `AddEditFinishedGoodModal.jsx` Recipe Input Basis & Stock Protection on `packSize` Change
In `frontend/src/components/inventory/AddEditFinishedGoodModal.jsx`:
1. **Preserve True Base Stock When Changing `packSize` or Switching `stockInputMode`:**
   - Store `baseFactoryStock` and `baseWarehouseStock` in state (in base bottles) or convert `factoryStock` and `warehouseStock` whenever `packSize` or `stockInputMode` changes so editing `packSize` from `12` to `6` does **not** halve the item's physical stock on save!
   - Specifically, when `stockInputMode` is switched between `'packs'` and `'bottles'`, convert the displayed input values:
     ```javascript
     const handleStockModeSwitch = (newMode) => {
       if (newMode === stockInputMode) return;
       const pSize = Math.max(1, parseInt(packSize, 10) || 1);
       const curFac = parseFloat(factoryStock) || 0;
       const curWh = parseFloat(warehouseStock) || 0;
       if (newMode === 'bottles' && stockInputMode === 'packs') {
         setFactoryStock(String(Math.round(curFac * pSize)));
         setWarehouseStock(String(Math.round(curWh * pSize)));
       } else if (newMode === 'packs' && stockInputMode === 'bottles') {
         setFactoryStock(String(Number((curFac / pSize).toFixed(4))));
         setWarehouseStock(String(Number((curWh / pSize).toFixed(4))));
       }
       setStockInputMode(newMode);
     };
     ```
   - And when `packSize` input changes (`onChange`) while `itemToEdit` is open and `stockInputMode === 'packs'`, recalculate `factoryStock` and `warehouseStock` from the underlying base bottles (`baseFac / newPackSize`) unless the user has manually edited stock!
2. **Add Explicit Recipe Input Basis (`Per 1 Pack` vs. `Per 1 Single Bottle`) With Clean Save-Time Conversion:**
   - Add state: `const [recipeInputBasis, setRecipeInputBasis] = useState('PACK'); // 'PACK' | 'BOTTLE'` (resetting to `'PACK'` when `modal` opens, since DB stores canonical per-pack values).
   - In the Recipe header (`L355`), when `parsedPackSize > 1`:
     - Show heading: **`Recipe Consumption — ${recipeInputBasis === 'PACK' ? `Per 1 Pack (${parsedPackSize} Bottles)` : `Per 1 Single Bottle (Auto ×${parsedPackSize} on Save)`}`**.
     - Render a 2-button pill switcher: **`[Per 1 Pack (×${parsedPackSize})]`** | **`[Per 1 Bottle]`**.
     - When switching between `'PACK'` and `'BOTTLE'`, automatically divide/multiply non-shrink recipe quantities in `materialQuantities` by `parsedPackSize` so the user sees the exact numbers in their chosen basis, and on `handleSubmit`, if `recipeInputBasis === 'BOTTLE'` and `parsedPackSize > 1`, multiply by `parsedPackSize` before sending `recipe` to the backend!
     - **Result:** The database **always** stores canonical Per-Pack (`1 selling unit`) recipe quantities, and `productionFormulas.js` needs **zero runtime guessing**!

#### 1.4 Fix `CreateBatchModal.jsx`, `CompleteBatchModal.jsx`, `LogCounterSaleForm.jsx` & `production.controller.js`
1. **`CreateBatchModal.jsx:L39`**:
   Change `if (fg.recipe && Array.isArray(fg.recipe) && fg.recipe.length > 0)` to read `fg.recipeFinishedGoods`:
   ```javascript
   const recipeList = (Array.isArray(fg.recipeFinishedGoods) && fg.recipeFinishedGoods.length > 0)
     ? fg.recipeFinishedGoods
     : (Array.isArray(fg.recipe) ? fg.recipe : []);
   if (recipeList.length > 0) {
     recipeList.forEach(ingredient => {
       const rawName = ingredient.rawMaterial?.name || ingredient.rawMaterialName || ingredient.rmName || ingredient.item?.name || 'Raw Material';
       const qtyPerUnit = Number(ingredient.quantityPerUnit ?? ingredient.quantity ?? ingredient.qty ?? 0);
       // ...
   ```
2. **Remove Hardcoded `'0.5' -> 12, '1.5' -> 6` Name Sniffing Everywhere**:
   - In `CreateBatchModal.jsx:L307`, `CompleteBatchModal.jsx:L45, L113`, `ProductionBatchTable.jsx:L87, L153`, `production.controller.js:L186`, and `LogCounterSaleForm.jsx:L24-L30` (`getPackSize`), replace the name-sniffing fallback with:
     ```javascript
     const packSize = Math.max(1, Number(item?.packSize) || 1);
     ```
3. **Fix Single-Item `0.5L` / `1.5L` Batch Double-Count in `backend/src/controllers/production.controller.js:L223-L228`**:
   ```javascript
   batchData = {
     outputItemId: itemsToProduce.length === 1 ? itemsToProduce[0].outputItemId : null,
     // CRITICAL FIX: Only populate `quantity` for 19L or custom single items — never copy packs05L/packs15L into `quantity`,
     // because analytics and adminDashboard treat `batch.quantity` as 19L bottles!
     quantity: total19L > 0
       ? total19L
       : (customItems.length === 1 && total05L === 0 && total15L === 0 ? customItems[0].quantity : null),
     packs05L: total05L,
     packs15L: total15L
   };
   ```
4. **Fix 19L `BottleTransaction` Rollback in `deleteProductionBatch` (`production.controller.js:L690-L725`)**:
   - In `completeProductionBatch`, ensure `BottleTransaction` rows (`MOVED_TO_FACTORY` and `RETURNED_BROKEN`) include `batch.batchNumber || batch.id` in `reason` / `notes`.
   - In `deleteProductionBatch`, inside `if (batch.status === 'COMPLETED')`, delete matching `BottleTransaction` rows:
     ```javascript
     await tx[`${prefix}BottleTransaction`].deleteMany({
       where: {
         type: { in: ['MOVED_TO_FACTORY', 'RETURNED_BROKEN'] },
         OR: [
           { reason: { contains: id } },
           ...(batch.batchNumber ? [{ reason: { contains: batch.batchNumber } }] : [])
         ]
       }
     });
     ```
5. **Add Scrap Mode Toggle in `CompleteBatchModal.jsx` (`Backfire #5`)**:
   - Add a clear 2-option selector in `CompleteBatchModal.jsx`:
     - **`Extra Line Breakage (Default)`**: Output quantity entered (`qty`) is Net Good Output added to stock; broken bottles consume additional raw materials (`goodQty + lossQty`).
     - **`Deduct Breakage from Total Run`**: Broken bottles are subtracted from the run's good output (`netGoodOutput = maxBottles - brokenBottles`), while raw materials consumed equal the total run (`maxBottles`).

---

### Task 2: Counter Sales (`SpotSale`) Loose Toggle, `CUSTOM_WATER` Rollback & 19L Refill Caps (`CS-01` – `CS-03`)

#### 2.1 Enforce Full Packs Only for Packed SKUs in Counter Sales (`LogCounterSaleForm.jsx` & `spotSale.controller.js`)
Per `aquasphere-erp-guardrails` Section 3 (*"Walk-in Counter Sales (AquaSphere only — Wadaana has no Counter Sales): Strictly full packs (`PACK`) for packed SKUs (`packSize > 1`) at pack rate (with inline rate override); loose single bottles from packs are not sold. Single-bottle SKUs (`packSize = 1`, e.g., `19L`) sell per unit (`UNIT`) at unit rate; customer `19L` bottle refills use the separate `WATER_REFILL` line item."*):
1. Packed items (`packSize > 1`) are locked to `saleType = 'PACK'`. No Loose Bottle toggle is displayed.
2. The cashier sells full packs at the pack rate, with inline rate override supported.
3. Backend validation (`createSpotSale`) strictly rejects any `FINISHED_GOOD` with `packSize > 1` if `saleType !== 'PACK'` or if quantity is not a whole positive integer.

#### 2.2 Deduct `19L Cap` on `WATER_REFILL` in `backend/src/controllers/spotSale.controller.js`
In `createSpotSale` (`spotSale.controller.js`), when a line has `saleType === 'WATER_REFILL'` and `lineQty > 0`:
1. Find the `19L Cap` raw material (`type: 'RAW_MATERIAL'`, matching `['19l', 'cap']` or `['large', 'cap']` or `['big', 'cap']`, `archivedAt: null`).
2. If found, decrement its `cachedQty` and `factoryQty` by `lineQty` and create an `InventoryTransaction`:
   ```javascript
   await tx[`${prefix}InventoryTransaction`].create({
     data: {
       itemId: refillCapItem.id,
       quantity: lineQty,
       direction: 'OUT',
       reason: 'SPOT_SALE_REFILL_CAP',
       refType: 'SPOT_SALE',
       refId: saleNumber,
       location: 'FACTORY'
     }
   });
   ```

#### 2.3 Fix `deleteSpotSale` (`backend/src/controllers/spotSale.controller.js:L698-L785`) Without Double-Restoring Minerals or Caps
In `deleteSpotSale`:
1. **Fix `CUSTOM_WATER` & `WATER_REFILL` Cap Rollback (`L703`)**:
   ```javascript
   if (line.saleType === 'CUSTOM_WATER') {
     continue; // Never restore genericFallbackItem bottles for CUSTOM_WATER!
   }
   if (line.saleType === 'WATER_REFILL') {
     continue; // Refill cap is reversed via SPOT_SALE_REFILL_CAP transaction below
   }
   if (line.saleType === 'EXTRA_CHARGE') {
     // Keep existing EXTRA_CHARGE cap restoration block
   ```
2. **Reverse `SPOT_SALE_REFILL_CAP` Transactions (Just Like `SPOT_SALE_MINERAL_DOSING`)**:
   ```javascript
   const refillCapTxs = await tx[`${prefix}InventoryTransaction`].findMany({
     where: {
       refType: 'SPOT_SALE',
       refId: { in: [existing.saleNumber, existing.id].filter(Boolean) },
       reason: 'SPOT_SALE_REFILL_CAP',
       direction: 'OUT'
     }
   });
   for (const cTx of refillCapTxs) {
     const q = Number(cTx.quantity || 0);
     if (q > 0) {
       await tx[`${prefix}Item`].update({
         where: { id: cTx.itemId },
         data: { cachedQty: { increment: q }, factoryQty: { increment: q } }
       }).catch(() => null);
       await tx[`${prefix}InventoryTransaction`].create({
         data: {
           itemId: cTx.itemId,
           quantity: q,
           direction: 'IN',
           reason: 'SPOT_SALE_DELETED_REFILL_CAP',
           refType: 'SPOT_SALE',
           refId: existing.saleNumber || existing.id,
           location: 'FACTORY'
         }
       });
     }
   }
   ```
3. **Restore Exact `FACTORY` vs. `WAREHOUSE` Stock for Physical Product Lines (`PACK`, `BOTTLE`, `UNIT`, `RAW_MATERIAL`)**:
   Before the `for (const line of existing.items)` loop in `deleteSpotSale`, fetch all product `OUT` transactions for this sale:
   ```javascript
   const productOutTxs = await tx[`${prefix}InventoryTransaction`].findMany({
     where: {
       refType: 'SPOT_SALE',
       refId: { in: [existing.saleNumber, existing.id].filter(Boolean) },
       direction: 'OUT',
       reason: {
         notIn: ['SPOT_SALE_MINERAL_DOSING', 'SPOT_SALE_EXTRA_CAP', 'SPOT_SALE_REFILL_CAP']
       }
     }
   });
   ```
   - If `productOutTxs.length > 0`, iterate `productOutTxs` and restore each `txRow.quantity` to `warehouseQty` if `txRow.location === 'WAREHOUSE'` or `factoryQty` if `txRow.location !== 'WAREHOUSE'` (plus `cachedQty: { increment: q }`), logging the corresponding `IN` (`SPOT_SALE_DELETED`) transaction with `location: txRow.location || 'FACTORY'`.
   - Only run the legacy `for (const line of existing.items)` physical stock fallback if `productOutTxs.length === 0` (for old historical sales created before `OUT` txns were logged).

---

### Task 3: Production-Safe Recipe COGS & Dual Cash Flow Engine in `analytics.controller.js` (`CS-04`, `DASH-01`)

In `backend/src/controllers/analytics.controller.js`:
1. **Fetch Non-Cancelled `PurchaseItem` Rows & `RecipeItem` Rows**:
   ```javascript
   prisma[`${prefix}PurchaseItem`].findMany({
     where: { purchase: { status: { not: 'CANCELLED' } } },
     select: { itemId: true, quantity: true, unitPrice: true, total: true }
   }),
   prisma[`${prefix}RecipeItem`].findMany({
     include: { rawMaterial: { select: { id: true, name: true, unit: true, isReturnable: true } } }
   })
   ```
2. **Compute Weighted-Average Unit Cost per Raw Material**:
   ```javascript
   const rmCostTotals = new Map(); // rmId -> { sumTotal, sumQty }
   purchaseItems.forEach((pi) => {
     const q = parseFloat(pi.quantity || 0);
     const tot = parseFloat(pi.total || 0) || (q * parseFloat(pi.unitPrice || 0));
     if (q > 0 && tot >= 0) {
       const cur = rmCostTotals.get(pi.itemId) || { sumTotal: 0, sumQty: 0 };
       cur.sumTotal += tot;
       cur.sumQty += q;
       rmCostTotals.set(pi.itemId, cur);
     }
   });
   const rmUnitCostMap = new Map();
   for (const [rmId, { sumTotal, sumQty }] of rmCostTotals.entries()) {
     if (sumQty > 0) rmUnitCostMap.set(rmId, sumTotal / sumQty);
   }
   ```
3. **Compute Consumable Recipe COGS per Finished Good (Excluding Returnable 19L Empty Bottles!)**:
   ```javascript
   // Group recipes by finishedGoodId
   const fgConsumableUnitCogsMap = new Map(); // fgId -> COGS per 1 selling unit (1 Pack or 1 19L bottle)
   recipeItems.forEach((r) => {
     const rm = r.rawMaterial;
     if (!rm) return;
     const rmNameLower = (rm.name || '').toLowerCase();
     // CRITICAL: Exclude returnable 19L Empty Bottle (capital asset covered by deposit, NOT consumable COGS)
     const isReturnable19LBottle = Boolean(rm.isReturnable) || (rmNameLower.includes('19') && rmNameLower.includes('bottle'));
     if (isReturnable19LBottle) return;

     const unitCost = rmUnitCostMap.get(r.rawMaterialId) || 0;
     const qtyPerUnit = parseFloat(r.quantityPerUnit || 0);
     if (unitCost > 0 && qtyPerUnit > 0) {
       fgConsumableUnitCogsMap.set(
         r.finishedGoodId,
         (fgConsumableUnitCogsMap.get(r.finishedGoodId) || 0) + (qtyPerUnit * unitCost)
       );
     }
   });
   ```
   Also compute `refill19LCapCost` (unit cost of `19L Cap` raw material) and `mineralCostPerTreatedLitre` (using `BOTTLE_19L_SPECS` from `productMappings.js`: `(2 * caCost + 1 * mgCost + 0.5 * naCost) / 15141`) so `WATER_REFILL` (`refill19LCapCost + 24 * mineralCostPerTreatedLitre`), `CUSTOM_WATER` (`1 * mineralCostPerTreatedLitre`), and `EXTRA_CHARGE` (`refill19LCapCost`) have exact COGS!
4. **Update `createBucket()` & Bucket Finalization in `analytics.controller.js`**:
   In `createBucket()` (`L153`), add:
   - `netSalesExGst: 0`, `estimatedCogs: 0`, `grossProfit: 0`, `operatingProfit: 0`
   - `orderRevenue: 0`, `spotRevenue: 0`
   - `cashVendorPayments: 0`, `netCashFlow: 0`, `expectedDrawerCash: 0`
   - `ordersCount: 0`, `deliveredOrdersCount: 0`, `pendingOrdersCount: 0`, `partialOrdersCount: 0`
   - `skuVolumes: {}` (map of `itemName -> quantitySold` in selling units/packs for tenant-aware MM chart!)
   And when finalizing each bucket:
   ```javascript
   b.grossProfit = Math.round(b.netSalesExGst - b.estimatedCogs);
   b.operatingProfit = Math.round(b.grossProfit - b.expenses);
   b.netCashFlow = Math.round(b.cash - b.expenses - (b.vendorPayments || 0));
   b.expectedDrawerCash = Math.round(Math.max(0, (b.cashByMethod?.CASH || 0) - b.expenses - (b.cashVendorPayments || 0)));
   b.netCash = b.netCashFlow; // Backwards-compatible alias
   ```

---

### Task 4: Redesign Owner Dashboard KPIs & Dual-Mode Financial Chart (`OwnerDashboardView.jsx`)

In `frontend/src/components/dashboard/OwnerDashboardView.jsx`:
1. **Keep All Timeframe & Range Options (Including `12m`)**:
   - In the chart range selector, offer **`7d` (`7 Days`) | `14d` (`14 Days`) | `30d` (`30 Days`) | `12m` (`12 Months`)** (preserving the existing `12m` view!).
2. **Add 2 Chart Mode Tabs (`Profitability & COGS` vs. `Cash Flow & Treasury`)**:
   - **Tab 1 — `Profitability & COGS (Accrual)`**:
     - Bar 1: `Sales Revenue (Ex-GST)` (`#2563eb` Blue)
     - Stacked Bar 2: `Est. Recipe COGS` (`#f59e0b` Amber) + `Operating Expenses` (`#f43f5e` Rose)
     - Smooth Line: `Operating Profit (Ex-GST Rev - COGS - OpEx)` (`#10b981` Emerald)
   - **Tab 2 — `Cash Flow & Treasury (All Channels + Drawer)`**:
     - Bar 1: `Cash & Bank Inflow` (`#10b981` Emerald)
     - Stacked Bar 2: `Operating Expenses` (`#f43f5e` Rose) + `Vendor Payments Paid` (`#f59e0b` Amber)
     - Smooth Line: `Net Cash Flow` (`#6366f1` Indigo)
3. **Update the 4 Owner KPI Cards**:
   - **Card 1 (`Total Revenue`)**: `Rs. ${sales}` (Subtitle: `Ex-GST: Rs. ${netSalesExGst} • Orders: Rs. ${orderRevenue} • Counter: Rs. ${spotRevenue}`)
   - **Card 2 (`Total Cash Inflow`)**: `Rs. ${cash}` (Subtitle: `Expected Physical Drawer Cash: Rs. ${expectedDrawerCash}`)
   - **Card 3 (`Operating & Procurement Outflow`)**: `Rs. ${expenses}` OpEx (Subtitle: `Raw Material Bills: Rs. ${purchases} • Vendor Paid: Rs. ${vendorPayments}`)
   - **Card 4 (`Operating Profit & Margin`)**: `Rs. ${operatingProfit}` (Subtitle: `Est. COGS: Rs. ${estimatedCogs} • Net Cash Flow: Rs. ${netCashFlow}`)

---

### Task 5: Fix Marketing Manager (`MarketingDashboardView.jsx`) & Admin (`adminDashboard.controller.js`) Dashboards

1. **`frontend/src/components/dashboard/MarketingDashboardView.jsx` (100% RBAC Compliant — Zero Financial Rs.)**:
   - Fix KPI card counts (`L88-L90`):
     ```javascript
     const totalOrders = Number(activeData?.ordersCount ?? activeData?.bottlesSold ?? 0);
     const deliveredCount = Number(activeData?.deliveredOrdersCount ?? 0);
     const pendingCount = Number((activeData?.pendingOrdersCount ?? 0) + (activeData?.partialOrdersCount ?? 0));
     ```
   - Upgrade the Marketing Chart with a 2-tab toggle (**strictly count/volume based, zero Rs. amounts**):
     - **Tab 1 (`Order Fulfillment Pipeline`)**: Stacked Bar of `Delivered Orders` (`#10b981` Emerald) + `Pending / Partial Orders` (`#f59e0b` Amber) per day/month.
     - **Tab 2 (`Units Sold by Product`)**: Dynamically plot bars for the top SKUs in `skuVolumes` (for AquaSphere: `19L`, `1.5L Packs`, `0.5L Packs`; for Wadaana: `Pure 0.5L`, `Pure 1.5L`, `Mix 0.5L`, `Mix 1.5L`, `Pivrifine 0.5L`, `Pivrifine 1.5L`).
2. **`backend/src/controllers/adminDashboard.controller.js` (`L60-L150`)**:
   - Filter `todaysProductionBatches` by `batchDate: { gte: startDate, lte: endDate }` (instead of `createdAt`).
   - Compute `totalGoodYield` across `remarks.producedItems`, Wadaana columns (`qtyPure05L + qtyPure15L + qtyMix05L + qtyMix15L`), and AquaSphere columns.
   - Query `SpotSale` for `startDate..endDate` and include `spotSalesCount` and `spotSalesRevenue` in `kpis`.

---

### Task 6: Fix Accountant, Production & Transport Dashboards (`AccountantDashboardView.jsx`, `ProductionDashboardView.jsx`, `TransportDashboardView.jsx`)

1. **`frontend/src/components/dashboard/AccountantDashboardView.jsx`**:
   - Include `vendorPayments`, `purchases`, `netCashFlow`, and `expectedDrawerCash` inside `activeData` (`L38-L115`).
   - Fix `netCash` (`L119`) to use `activeData.netCashFlow` (`cash - expenses - vendorPayments`) and show `Expected Drawer Cash (CASH only): Rs. ${activeData.expectedDrawerCash}` alongside `Raw Material Bills: Rs. ${activeData.purchases}` and `Vendor Paid: Rs. ${activeData.vendorPayments}`.
   - Fix the broken `data.monthlyPurchases` reference to use `Number(activeData.purchases ?? data?.monthly?.purchases ?? 0)`.
   - Compute `startDate` and `endDate` (using local date formatting `YYYY-MM-DD`, not UTC `.toISOString()`) from `timeframe` in `useEffect` (`L123-L140`) and pass them to `/expenses?startDate=${startDate}&endDate=${endDate}&tenant=${tenant}`.
2. **`backend/src/controllers/analytics.controller.js` (`getProductionDashboardAnalytics`) & `ProductionDashboardView.jsx`**:
   - Pass `&timeframe=${timeframe}` from `ProductionDashboardView.jsx:L39`.
   - Filter `todaysProduction` in `getProductionDashboardAnalytics` by the active `timeframe` window (`batchDate: { gte: windowStart, lte: windowEnd }`) and parse `b.remarks` (`producedItems`) so custom finished goods are included in KPI cards and `ProductionChart.jsx`.
3. **`frontend/src/components/dashboard/TransportDashboardView.jsx`**:
   - Hide the `Bottles Returned` 19L KPI card when `isWadaana` is `true` (or replace it with `Completed Dispatches` on Wadaana).
   - Filter `todayBottlesRecovered` and `todayDeliveredCount` by the active `timeframe` date window (`startDate..endOfDay`) instead of hardcoded `todayStr`, and increase `/orders?limit=200`.

---

## 4. Final Verification Checklist for Antigravity

- [ ] `pnpm run lint` in `backend/` exits with `0`.
- [ ] `pnpm run lint` and `pnpm run build` in `frontend/` exit with `0` (respecting all React Compiler hooks/refs rules in `SKILL.md` Section 6).
- [ ] Restarting the backend server does **not** overwrite edited `RecipeItem.quantityPerUnit` rows in PostgreSQL.
- [ ] Editing `packSize` in `AddEditFinishedGoodModal.jsx` persists to PostgreSQL and does **not** corrupt `factoryQty` or `warehouseQty`.
- [ ] Single-item AquaSphere `0.5L` / `1.5L` production batches do **not** populate `batch.quantity` (19L column).
- [ ] Deleting a `CUSTOM_WATER` counter sale does **not** increment finished goods stock, and deleting a multi-location sale restores exact `FACTORY` and `WAREHOUSE` quantities without double-restoring minerals or extra caps.
- [ ] Recipe COGS uses `PurchaseItem.total` (excluding `CANCELLED` purchases) and excludes returnable `19L Empty Bottle` capex.
- [ ] `MarketingDashboardView.jsx` displays zero Rs. financial values (RBAC compliant) and renders tenant-appropriate SKU bars for both AquaSphere and Wadaana.