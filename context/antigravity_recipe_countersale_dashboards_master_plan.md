# AquaSphere & Wadaana ERP — Master Architectural & Logic Audit Plan for Antigravity
**Scope:** Base-Unit & `packSize` Display Architecture · Pure Recipe-Driven Raw Material Deductions · Counter Sale (`SpotSale`) Flow & COGS · All 6 Role Dashboards (Owner, Admin, MM, Accountant, PM, TM) · Cross-API Data Integrity & Chart Redesign  
**Target Commit Audited:** `e56d134` (`feat(perf): instant mobile navigation, viewport shielding, SWR zero-delay state hydration across ERP, and graphify AST graph`)  
**Graphify AST Corpus Baseline:** `1,327 nodes` · `4,287 edges` · `123 communities` (`graphify-out/graph.json` & `graphify-out/GRAPH_REPORT.md`)  
*(Note: The `/erp-reports` page redesign is intentionally queued for a separate phase and excluded from this execution plan.)*

---

## 1. Core Architectural Law & Graphify Blast-Radius Map

### 1.1 The Core System Design Law (AquaSphere Packs vs. Wadaana Single Bottles)
1. **Why Base Units + `packSize` Exist**:
   - **AquaSphere** operates and sells in **Packs (`PETs`)** for multi-bottle products (`0.5L` = 12 bottles/pack, `1.5L` = 6 bottles/pack) and single bottles for `19L` (`packSize = 1`). They do not sell single loose `0.5L` or `1.5L` bottles in normal operations.
   - **Wadaana** operates and sells strictly in **Single Bottles** (`packSize = 1`).
   - **The Middle-Way Storage & Display Rule**: All `FINISHED_GOOD` stock (`cachedQty`, `factoryQty`, `warehouseQty`) is stored in **Base Units (`bottles`)** in PostgreSQL, and `packSize`'s primary UI role on Inventory/Stock views is to display **Packs = `cachedQty / packSize`** for packed products (`packSize > 1`) while showing individual bottles when `packSize === 1`.
   - **Pure Recipe-Driven Deductions**: Raw material consumption during production must be driven **100% by the Finished Good's database recipe (`RecipeItem.quantityPerUnit`)** — never by hardcoded fallback weights or name-sniffing heuristics.

### 1.2 Why This Design Choice Currently Backfires in 5 Specific Places (And How We Fix It)

While the core design ("Base units in DB, `units / packSize` for Pack display on UI, and deductions strictly from the recipe") is clean and sound, **five implementation bugs in the current codebase break this law**:

1. **Backfire #1 — `updateItem` (`item.controller.js:L186`) Silently Drops `packSize` on Edit**:
   - `createItem` saves `packSize`, and `autoMigrations.js` seeds several items with `packSize: 1`.
   - However, `updateItem` (`PUT /api/v1/items/:id`, `item.controller.js:L186-L208`) **never destructures `packSize` from `req.body` and never writes `packSize` to Prisma**!
   - **How it backfires:** When you edit a Finished Good in `AddEditFinishedGoodModal.jsx` and change `Pack Size` from `1` to `12` (or `6` to `8`), the database silently ignores the change and keeps `packSize = 1`! Then `FinishedGoodsSummaryCards.jsx` divides by `1` (showing raw bottles instead of Packs), while `CreateBatchModal.jsx:L307` guesses `12` from the product name `'0.5'`, causing a total mismatch between Production and Inventory!

2. **Backfire #2 — `getItems` (`item.controller.js:L32`) Overwrites `item.unit = 'bottle'`, Tricking the User in `AddEditFinishedGoodModal.jsx:L357`**:
   - In `item.controller.js:L32`, `getItems` overwrites `item.unit = 'bottle'` on every `FINISHED_GOOD` before sending it to the frontend.
   - When you open `AddEditFinishedGoodModal.jsx` to edit `0.5L PET` (`packSize = 12`), the modal sets `unit = 'bottle'` and displays:
     > **`Recipe Consumption (Per 1 bottle)`**  
     > *"Enter raw materials needed to produce exactly 1 bottle"*
   - **How it backfires:** In `productionFormulas.js:L44`, `calculateBatchDeductions` computes:
     ```js
     const goodQty = quantity * qtyPerUnit; // where `quantity` is PACKS produced!
     ```
     Because `quantity` is **Packs** (e.g., `10 Packs`), `productionFormulas.js` expects `qtyPerUnit` to be the recipe for **1 Full Pack** (e.g., `12` preforms/bottles, `12` caps, `12` labels, `0.02273 kg` shrink wrap).
     If you follow the modal's misleading `Per 1 bottle` label and enter `1` bottle and `1` cap (or if you enter a recipe for `packSize = 1` and later change `packSize` to `12`), `productionFormulas.js` deducts **`10` bottles instead of `120` bottles** (a **12x under-deduction**)!
   - **The Fix:**
     - In `AddEditFinishedGoodModal.jsx`, never let `getItems`'s `unit = 'bottle'` overwrite the recipe header for packed items! When `Number(packSize) > 1`, label the recipe section clearly and allow entering/viewing recipe quantities either **Per 1 Pack (`${packSize} Bottles`)** or **Per 1 Single Bottle** (auto-normalizing so `productionFormulas.js` always deducts the exact raw materials for all `quantity * packSize` bottles produced, regardless of `packSize`!).

3. **Backfire #3 — Frontend Name-Sniffing Fallbacks vs. Backend Strict `fg.packSize` (`CreateBatchModal.jsx:L307` vs. `productionFormulas.js:L21`)**:
   - `CreateBatchModal.jsx:L307`, `CompleteBatchModal.jsx:L45`, and `production.controller.js:L186` use a hardcoded name fallback:
     `Number(fg.packSize) > 1 ? Number(fg.packSize) : (nameLower.includes('0.5') ? 12 : (nameLower.includes('1.5') ? 6 : 1))`
   - Meanwhile, `productionFormulas.js:L21`, `order.controller.js:L165, L513, L621`, `spotSale.controller.js:L217`, and `FinishedGoodsSummaryCards.jsx:L34` strictly use `Number(item.packSize) || 1` with **no** name fallback!
   - **How it backfires:** If `fg.packSize` is `1` in the DB for a product with `0.5` in its name, `CreateBatchModal` tells the operator `10 PETs = 120 bottles`, `production.controller.js` writes `totalBottles: 120` into `remarks`, and then `completeProductionBatch` (`productionFormulas.js:L21`) adds only **`10` bottles** to `cachedQty`!
   - **The Fix:** Remove all hardcoded `'0.5' ? 12 : '1.5' ? 6` name-guessing across the entire app, fix `updateItem` so `packSize` is always saved in the DB, and add a one-time startup migration in `autoMigrations.js` to ensure AquaSphere's standard `0.5L` (`packSize = 12`) and `1.5L` (`packSize = 6`) items have their true `packSize` stored in PostgreSQL.

4. **Backfire #4 — `CreateBatchModal.jsx:L39` Checks `fg.recipe` Instead of `fg.recipeFinishedGoods`**:
   - `GET /api/v1/items` returns the recipe array under `fg.recipeFinishedGoods`, **never `fg.recipe`**.
   - On `CreateBatchModal.jsx:L39` (Wadaana preform consumption preview), it checks `if (fg.recipe && Array.isArray(fg.recipe))`, which is always `undefined`, so it **ignores your database recipe** and falls back to hardcoded gram numbers in `preformHelper.js`!

5. **Backfire #5 — Scrap (`wasteQuantity`) Semantics in `CompleteBatchModal.jsx` vs. `productionFormulas.js:L25 & L44`**:
   - In `productionFormulas.js:L25 & L44`:
     - `baseUnitsAdded = Math.round(quantity * packSize)` adds `100%` of `quantity` to Finished Goods stock.
     - `totalQtyUsed = goodQty + lossQty` deducts raw materials for `quantity` **PLUS** `wasteQuantity`.
   - **How it backfires if not labeled clearly:** If an operator produced `100` total bottles on the shift and `5` broke during filling (so only `95` good bottles went into stock), entering `100` in `CreateBatchModal` and `5` in `CompleteBatchModal` will add **`100` good bottles** to stock and deduct **`105` preforms/caps**!
   - **The Fix:** In `CompleteBatchModal.jsx`, give the operator an explicit toggle or live preview showing:
     - **Mode A (Default — Additional Line Scrap):** `Good Output to Stock: 100Packs (1,200 btl) + Extra Line Breakage: 5 btl = 1,205 Raw Materials Consumed`
     - **Mode B (Deduct Breakage from Batch Output):** `Total Run: 1,200 btl - 5 Broken = 1,195 Net Good Bottles Added to Stock (1,200 Raw Materials Consumed)`.

---

### 1.3 Master Summary of All Flaws Across Recipes, Counter Sales & Dashboards

| ID | Domain | Severity | File & Line Reference | Root Cause Summary |
| :--- | :--- | :--- | :--- | :--- |
| **BOM-01** | `packSize` Persistence | **CRITICAL** | `backend/src/controllers/item.controller.js:L186-L208` | `updateItem` (`PUT /api/v1/items/:id`) never destructures or saves `packSize`. Editing a finished good's pack size in `AddEditFinishedGoodModal.jsx` silently drops the change. |
| **BOM-02** | Recipe & `packSize` Deduction | **CRITICAL** | `backend/src/utils/productionFormulas.js:L21-L57` & `AddEditFinishedGoodModal.jsx:L50, L357` | `getItems` forces `item.unit = 'bottle'` on all finished goods, so `AddEditFinishedGoodModal.jsx` displays `Recipe Consumption (Per 1 bottle)`. Yet `productionFormulas.js:L44` multiplies `quantity (Packs) * qtyPerUnit`. If a recipe is entered per bottle (e.g. `1` bottle, `1` cap) or if `packSize` is changed later, raw materials are under-deducted by `packSize` (`12x` or `6x`)! |
| **BOM-03** | Recipe Preview & Name Fallback | **HIGH** | `frontend/src/components/production/CreateBatchModal.jsx:L39, L113-L120, L307` | (1) `L39` checks `fg.recipe` instead of `fg.recipeFinishedGoods`, ignoring DB recipes on Wadaana preform preview. (2) `L307` guesses `packSize` from item name (`0.5` -> `12`) when `fg.packSize === 1`, desyncing UI from `productionFormulas.js:L21`. |
| **BOM-04** | 19L Batch Delete Rollback | **HIGH** | `backend/src/controllers/production.controller.js:L425-L497` | `deleteProductionBatch` (`L474-L490`) reverses `InventoryTransaction` and `ProductionBatchConsumption` but leaves orphaned `BottleTransaction` rows (`MOVED_TO_FACTORY`, `RETURNED_BROKEN`), corrupting 19L bottle custody. |
| **CS-01** | Counter Sales Delete Bug | **CRITICAL** | `backend/src/controllers/spotSale.controller.js:L516-L560` | `deleteSpotSale` skips `WATER_REFILL` and `EXTRA_CHARGE` on `L516`, **but forgets `CUSTOM_WATER`**! Because `CUSTOM_WATER` attaches `genericFallbackItem.id` on creation (`L429`), deleting a `50 Litre` custom water sale adds `+50 bottles` to finished goods inventory! Also, `deleteSpotSale` dumps 100% of restored stock into `factoryQty` even when `createSpotSale` deducted from `warehouseQty`. |
| **CS-02** | Counter Sales Litres & Caps | **HIGH** | `backend/src/controllers/spotSale.controller.js:L193-L220` & `LogCounterSaleForm.jsx:L157` | (1) `WATER_REFILL` (19L counter refill) hardcodes `24.0L` instead of `19.0L`, and `0.5L` / `1.5L` hardcode `9.0L` / `12.0L` instead of deriving litres from bottle volume $\times$ base bottles (`6.0L` for 12x0.5L, `9.0L` for 6x1.5L). (2) `WATER_REFILL` does not deduct a 19L Cap from `RAW_MATERIAL` stock when refilling a bottle at the counter. (3) Optional Loose-vs-Pack toggle when clearing loose remainder bottles (`+loose btl`). |
| **CS-03** | Recipe COGS Logging | **HIGH** | `backend/src/controllers/spotSale.controller.js` & `analytics.controller.js` | Neither `SpotSale` nor `Order` computes Recipe Cost of Goods Sold (**COGS**) from raw material purchase prices (`PurchaseItem` weighted-average unit cost $\times$ `RecipeItem.quantityPerUnit`), leaving the Owner blind to gross margin and true accrual profit. |
| **DASH-01** | Owner Dashboard & Bar Graph | **CRITICAL** | `frontend/src/components/dashboard/OwnerDashboardView.jsx:L164, L222-L315` & `analytics.controller.js:L270-L380` | **Why the current Bar Graph is nonsense:** (1) It labels `netCash = cashCollected - expenses - vendorPayments` as **`Net Profit`** (so paying a supplier Rs. 500k on Monday makes Monday look like a `-Rs. 480k` loss!). (2) It crams 90 ultra-thin bars (`30 days × 3 bars + 1 line`) into one chart, mixing Accrual (`Sales Revenue`) and Cash (`Cash Inflow`). (3) The `Expenses` KPI card (`activeData.expenses`) excludes Raw Material `Purchases`, contradicting `/expenses` (`Expenses.jsx`). (4) `OwnerDashboardView.jsx:L164` computes `netCash = activeData.cash - activeData.expenses` (ignoring `vendorPayments`), contradicting `analytics.controller.js:L341` and `dailyClose.controller.js:L84`! |
| **DASH-02** | Marketing (MM) Dashboard & Graph | **CRITICAL** | `frontend/src/components/dashboard/MarketingDashboardView.jsx:L88-L90, L170-L185` & `analytics.controller.js:L199, L386` | `pendingCount` is taken from `data.unprocessedOrders.length` (all-time pending orders), while `totalOrders` (`activeData.bottlesSold`) is the selected timeframe's order count. Subtracting `deliveredCount = Math.max(0, totalOrders - pendingCount)` yields **`0 Delivered`** whenever today's order count is less than all-time pending orders! And the MM bar chart only plots raw invoice count (`1, 2, 0`) instead of **Delivered vs. Pending Orders/Revenue** and **Product Volume Breakdown**. |
| **DASH-03** | Admin Dashboard | **HIGH** | `backend/src/controllers/adminDashboard.controller.js:L60, L131-L140` & `AdminDashboardView.jsx` | (1) `totalGoodYield` only sums `b.quantity || 0`, which is `null` (`0`) whenever a batch produces multiple items (`itemsToProduce.length > 1`) or Wadaana columns (`qtyPure05L`, etc.), displaying **`0 units`** produced! (2) Counter Sales (`SpotSale`) revenue/count is missing from Admin KPIs. |
| **DASH-04** | Accountant, PM & TM Dashboards | **HIGH** | `AccountantDashboardView.jsx:L119-L135`, `ProductionDashboardView.jsx:L39`, `TransportDashboardView.jsx:L135-L155` | (1) `AccountantDashboardView.jsx:L126` hardcodes `startDate=${today}&endDate=${today}` on the Expense Log table, ignoring `TimeframeDropdown`, and omits `VendorPayment` cash outflows from `Net Cash`. (2) `ProductionDashboardView.jsx` KPI cards (`todaysProduction`) ignore `TimeframeDropdown`, and `ProductionChart.jsx` ignores custom finished goods (`remarks.producedItems`). (3) `TransportDashboardView.jsx` ignores `timeframe` on `todayBottlesRecovered`. |

---

## 2. Deep-Dive Area 1: Making Recipe Deductions & `packSize` 100% Bulletproof

### 2.1 How the Fixed Recipe & `packSize` Engine Works

To honor your exact design law (**Base Units in DB, `units / packSize` for Pack display on UI, and deductions strictly from the recipe regardless of `packSize`**):

1. **Every Finished Good Has an Explicit `packSize` Saved on Create AND Update (`BOM-01`)**:
   - `packSize = 1`: Single-bottle items (`19L Bottled Water`, and all Wadaana bottles).
   - `packSize > 1`: Multi-bottle Packs (`0.5L PET` with `packSize = 12`, `1.5L PET` with `packSize = 6`, or any custom pack size like `8` or `24`).
   - All frontend and backend files read `Number(item.packSize) || 1` directly from the database — **zero hardcoded name guessing**.

2. **Eliminating the `Per 1 bottle` vs. `Per 1 Pack` Trap in `AddEditFinishedGoodModal.jsx` & `productionFormulas.js` (`BOM-02`)**:
   - Why did recipes break before? Because `getItems` (`item.controller.js:L32`) overwrote `item.unit = 'bottle'`, making `AddEditFinishedGoodModal.jsx:L357` say `Recipe Consumption (Per 1 bottle)` even when `packSize = 12`, while `productionFormulas.js:L44` multiplied `quantity (Packs) * qtyPerUnit`!
   - **The Bulletproof Fix in `productionFormulas.js` (`calculateBatchDeductions`)**:
     When a batch produces `quantity` units of `outputItem` (where `quantity` is **Packs** if `packSize > 1`, or **Bottles** if `packSize === 1`), the total good base bottles added to inventory is:
     $$\text{baseUnitsAdded} = \text{quantity} \times \text{packSize}$$
     Now look at each recipe ingredient `r` (`qtyPerUnit = Number(r.quantityPerUnit)`):
     - If `packSize > 1` (e.g., `packSize = 12`):
       - What if the recipe for a discrete countable raw material (`Preform`, `Empty Bottle`, `Cap`, `Label` with unit `pcs`/`bottle`/`cap`) was entered as **`1`** (per 1 bottle) vs. **`12`** (per 1 pack)?
       - Look how easy it is to make `productionFormulas.js` handle **both** without ever under-deducting:
         - If `isDiscreteContainerPiece` (preform, empty bottle, cap, label) has `qtyPerUnit === 1` on an item with `packSize > 1`, it clearly means **1 piece per bottle** (`packSize` pieces per pack)! So `perBottleQty = 1`, and `perPackQty = packSize`!
         - Otherwise, `qtyPerUnit` is already the **Per-Pack (`packSize` bottles)** recipe quantity (`perPackQty = qtyPerUnit`, and `perBottleQty = qtyPerUnit / packSize`)!
       - Even better: in `AddEditFinishedGoodModal.jsx`, we add a clear **Recipe Input Mode Toggle** when `packSize > 1`:
         - **`Per 1 Pack (${packSize} Bottles)`** vs. **`Per 1 Single Bottle (Auto ×${packSize} per Pack)`**
         - When stored in the database (`RecipeItem.quantityPerUnit`), we normalize or clearly display both `Per Bottle` and `Per Pack (×${packSize})` right next to each input box!
         - And if the user changes `Pack Size` from `12` to `6` (or `8`) inside `AddEditFinishedGoodModal.jsx`, the modal automatically scales any pack-based recipe quantities by `newPackSize / oldPackSize` so changing `packSize` **never** breaks raw material deductions!

### 2.2 Exact Code Fixes for Area 1 (`BOM-01` – `BOM-04`)

#### Fix 1A: Save `packSize` in `updateItem` (`backend/src/controllers/item.controller.js:L174-L210`)
```javascript
// backend/src/controllers/item.controller.js — inside updateItem
export const updateItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    name,
    unit,
    packSize, // <-- EXTRACT packSize!
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
    ...(parsedPackSize !== undefined ? { packSize: parsedPackSize } : {}), // <-- PERSIST packSize!
    ...(reorderLevel !== undefined ? { reorderLevel: parseFloat(reorderLevel) || 0 } : {}),
    ...(retailPrice !== undefined ? { retailPrice: Math.max(0, parseFloat(retailPrice) || 0) } : {}),
    ...(sellableOnCounter !== undefined ? { sellableOnCounter: Boolean(sellableOnCounter) } : {}),
    ...(isReturnable !== undefined ? { isReturnable: Boolean(isReturnable) } : {})
  };
```

#### Fix 1B: Pack-Size-Safe Recipe Deduction in `backend/src/utils/productionFormulas.js`
```javascript
// backend/src/utils/productionFormulas.js
/**
 * Resolves both `perPackQty` (for 1 produced unit/pack) and `perBottleQty` (for 1 base bottle)
 * from a RecipeItem, guaranteeing accurate raw material deductions regardless of packSize.
 */
export function resolveRecipeQuantities(recipeItem, packSize = 1) {
  const rawQty = Number(recipeItem?.quantityPerUnit ?? recipeItem?.qty ?? recipeItem?.quantity ?? 0);
  const effectivePackSize = Number(packSize) > 1 ? Number(packSize) : 1;
  if (rawQty <= 0) return { perUnitQty: 0, perBottleQty: 0 };

  if (effectivePackSize <= 1) {
    return { perUnitQty: rawQty, perBottleQty: rawQty };
  }

  const rmName = (recipeItem.rawMaterial?.name || recipeItem.rawMaterialName || '').toLowerCase();
  const rmUnit = (recipeItem.rawMaterial?.unit || '').toLowerCase();
  const isDiscreteOnePerBottleItem =
    ['bottle', 'bottles', 'cap', 'caps', 'pcs', 'piece', 'pieces', 'label', 'labels'].includes(rmUnit) ||
    rmName.includes('bottle') ||
    rmName.includes('cap') ||
    rmName.includes('label') ||
    rmName.includes('preform');

  // If a discrete bottle/cap/label item has quantityPerUnit < effectivePackSize (e.g. 1 bottle/cap per bottle),
  // treat rawQty as per-1-bottle and scale per-pack by effectivePackSize!
  // If rawQty >= effectivePackSize (e.g. 12 bottles/caps entered per 12-pack), treat rawQty as per-pack.
  if (isDiscreteOnePerBottleItem && rawQty < effectivePackSize) {
    return {
      perUnitQty: rawQty * effectivePackSize,
      perBottleQty: rawQty
    };
  }

  return {
    perUnitQty: rawQty,
    perBottleQty: rawQty / effectivePackSize
  };
}

export function calculateBatchDeductions(productionRuns = []) {
  const deductionsMap = new Map();
  const wasteMap = new Map();
  const finishedGoods = [];

  for (const run of productionRuns) {
    const { outputItem, quantity = 0, wasteQuantity = 0 } = run;
    if (!outputItem || (quantity <= 0 && wasteQuantity <= 0)) continue;

    const packSize = Number(outputItem.packSize) > 1 ? Number(outputItem.packSize) : 1;

    // Base units (bottles) added to finished goods inventory:
    // On Inventory UI, this is displayed as `cachedQty / packSize` Packs!
    const baseUnitsAdded = Math.round(quantity * packSize);
    const is19L = (outputItem.name || '').toLowerCase().includes('19l');

    finishedGoods.push({
      itemId: outputItem.id,
      name: outputItem.name,
      quantityAdded: baseUnitsAdded,
      unit: outputItem.unit || 'bottle',
      is19L,
      netGoodPacks: quantity,
      wasteBottles: wasteQuantity
    });

    const recipes = outputItem.recipeFinishedGoods || [];
    for (const r of recipes) {
      const rm = r.rawMaterial;
      if (!rm) continue;

      const rmNameLower = (rm.name || '').toLowerCase();
      const isShrinkFilm = rmNameLower.includes('shrink') || rmNameLower.includes('film') || rmNameLower.includes('wrap');

      const { perUnitQty, perBottleQty } = resolveRecipeQuantities(r, packSize);

      // Good output consumes perUnitQty * quantity (which equals perBottleQty * baseUnitsAdded)
      const goodQty = quantity * perUnitQty;

      // Broken individual bottles consume preforms/bottles/caps/minerals per bottle, but NOT shrink wrap
      let lossQty = 0;
      if (wasteQuantity > 0 && !isShrinkFilm) {
        lossQty = perBottleQty * wasteQuantity;
      }

      const totalQtyUsed = Number((goodQty + lossQty).toFixed(4));
      const unit = rm.unit || 'pcs';

      const existing = deductionsMap.get(rm.id) || {
        itemId: rm.id,
        name: rm.name,
        quantityUsed: 0,
        goodQty: 0,
        lossQty: 0,
        unit
      };
      existing.quantityUsed = Number((existing.quantityUsed + totalQtyUsed).toFixed(4));
      existing.goodQty = Number((existing.goodQty + goodQty).toFixed(4));
      existing.lossQty = Number((existing.lossQty + lossQty).toFixed(4));
      deductionsMap.set(rm.id, existing);

      if (lossQty > 0) {
        const existingWaste = wasteMap.get(rm.id) || {
          itemId: rm.id,
          name: rm.name,
          quantityLost: 0,
          unit
        };
        existingWaste.quantityLost = Number((existingWaste.quantityLost + lossQty).toFixed(4));
        wasteMap.set(rm.id, existingWaste);
      }
    }
  }

  return {
    deductions: Array.from(deductionsMap.values()),
    finishedGoods,
    wasteItems: Array.from(wasteMap.values())
  };
}
```

#### Fix 1C: Fix `AddEditFinishedGoodModal.jsx` Recipe Header & Auto-Scaling When `packSize` Changes
In `frontend/src/components/inventory/AddEditFinishedGoodModal.jsx`:
1. When `itemToEdit` is loaded (`L50-L53`), if `Number(itemToEdit.packSize) > 1`, set `setUnit('packs')` (not `'bottle'`, which `getItems` forced onto `itemToEdit.unit`!).
2. When the user changes `Pack Size` from `oldPackSize` to `newPackSize` in the modal, offer or automatically scale pack-level recipe quantities (`newQty = (oldQty / oldPackSize) * newPackSize`) and show a clear badge in the Recipe table header:
   - When `parsedPackSize > 1`:
     **`Recipe Consumption — Per 1 Pack (${parsedPackSize} Bottles)`** *(with a live helper subtitle next to each input showing `= ${qty / parsedPackSize} ${mat.unit} per bottle`)*.
   - When `parsedPackSize === 1`:
     **`Recipe Consumption — Per 1 Bottle`**.

#### Fix 1D: Fix `CreateBatchModal.jsx` (`L39` & `L113-L125`) & Remove Name-Guessing Fallbacks
In `frontend/src/components/production/CreateBatchModal.jsx`:
1. On `L33-L45` (Wadaana `preformConsumption`), read `fg.recipeFinishedGoods` (which `GET /api/v1/items` actually returns) instead of only `fg.recipe`:
   ```javascript
   const recipeList = (Array.isArray(fg.recipeFinishedGoods) && fg.recipeFinishedGoods.length > 0)
     ? fg.recipeFinishedGoods
     : (Array.isArray(fg.recipe) ? fg.recipe : []);
   ```
   And extract `const rawName = ingredient.rawMaterial?.name || ingredient.rawMaterialName || 'Raw Material'` and `const qtyPerUnit = Number(ingredient.quantityPerUnit ?? ingredient.quantity ?? 0)`.
2. On `L113-L125` (`rawMaterialShortages`), use the exact same `resolveRecipeQuantities(r, packSize)` logic so the modal's shortage check matches `productionFormulas.js` 100%.
3. On `L307` (`CreateBatchModal.jsx`), `CompleteBatchModal.jsx:L45, L113`, `ProductionBatchTable.jsx:L87, L153`, and `production.controller.js:L186`:
   Use `const packSize = Math.max(1, Number(fg?.packSize) || 1);` (and ensure `autoMigrations.js` sets `packSize = 12` for AquaSphere `0.5L` and `packSize = 6` for AquaSphere `1.5L` if any legacy row has `packSize = 1`).

#### Fix 1E: Roll Back 19L `BottleTransaction` Rows in `deleteProductionBatch` (`production.controller.js:L474-L497`)
When deleting a completed batch, also delete the `BottleTransaction` records (`MOVED_TO_FACTORY` and `RETURNED_BROKEN`) created by that batch so 19L bottle custody never drifts.

---

## 3. Deep-Dive Area 2: Counter Sale (`SpotSale`) Flow, Stock Integrity & COGS Logging

### 3.1 Fixing the Critical `CUSTOM_WATER` Delete Inventory Corruption & Warehouse Split Rollback (`CS-01`)

**The Bug in `backend/src/controllers/spotSale.controller.js:L502-L625` (`deleteSpotSale`):**
1. **Inventory Corruption on `CUSTOM_WATER` Delete (`L516`)**:
   When a `CUSTOM_WATER` counter sale (e.g., `100 Litres` of loose water for Rs. 500) is created (`L429`), Prisma requires a non-null `itemId` on `SpotSaleItem`, so `createSpotSale` attaches `genericFallbackItem.id` (the first `FINISHED_GOOD` in the database, e.g., `19L Bottled Water`).
   When `deleteSpotSale` runs (`L516`):
   ```javascript
   if (line.saleType === 'WATER_REFILL' || line.saleType === 'EXTRA_CHARGE') {
     continue;
   }
   ```
   **`CUSTOM_WATER` is missing from Line 516!** So deleting a `100 Litre` `CUSTOM_WATER` sale treats it as `100 bottles` of `genericFallbackItem` and **adds `+100 bottles` to finished goods inventory**!
2. **Warehouse Stock Lost on `deleteSpotSale` (`L539-L556`)**:
   In `createSpotSale` (`L304-L350`), if `factoryQty` only had `2` packs and the sale needed `10` packs, it deducted `2` from `FACTORY` and `8` from `WAREHOUSE`.
   In `deleteSpotSale` (`L542`), it blindly increments `factoryQty` by `10` instead of restoring `2` to `FACTORY` and `8` to `WAREHOUSE`!

**The Fix in `backend/src/controllers/spotSale.controller.js` (`deleteSpotSale`):**
```javascript
// 1. Skip ALL virtual/non-stock lines in deleteSpotSale:
if (['WATER_REFILL', 'CUSTOM_WATER', 'EXTRA_CHARGE'].includes(line.saleType)) {
  continue;
}
```
And when creating `InventoryTransaction` records in `createSpotSale` (`L320, L343`), set `refType: 'SPOT_SALE', refId: spotSale.id` with `location: 'FACTORY'` or `'WAREHOUSE'`. Then in `deleteSpotSale`, query `InventoryTransaction` by `{ refType: 'SPOT_SALE', refId: id, direction: 'OUT' }` and restore the exact quantities to `factoryQty` vs. `warehouseQty`!

### 3.2 Fixing Water Litre Multipliers, 19L Refill Cap Deduction & Optional Loose-Remainder Sale (`CS-02`)

1. **Accurate Water Litres Calculation (`spotSale.controller.js:L193-L220` & `analytics.controller.js:L182-L194`)**:
   - Currently, `spotSale.controller.js:L196-L202` and `analytics.controller.js:L186` hardcode:
     - `19L` $\rightarrow$ `24.0` litres (for a 19L bottle!)
     - `1.5L` $\rightarrow$ `12.0` litres (even though a 6-pack of 1.5L is `6 × 1.5 = 9.0L`!)
     - `0.5L` $\rightarrow$ `9.0` litres (even though a 12-pack of 0.5L is `12 × 0.5 = 6.0L`!)
   - **Fix**: Compute litres dynamically from `bottleVolumeLitres × baseBottlesSold`:
     - `19L` bottle or `WATER_REFILL` = `19.0L` per bottle
     - `1.5L` bottle = `1.5L` per base bottle (`9.0L` per 6-pack)
     - `0.5L` bottle = `0.5L` per base bottle (`6.0L` per 12-pack)
     - `CUSTOM_WATER` = `1.0L` per unit
2. **Deducting 19L Cap on Counter `WATER_REFILL` (`spotSale.controller.js:L215`)**:
   - When a customer brings their own 19L bottle to the counter for a `WATER_REFILL`, the plant caps it with a new **19L Cap / Seal**.
   - In `createSpotSale`, when `lineType === 'WATER_REFILL'`, increment `totalCaps += lineQty` and (if a `19L Cap` raw material exists in `Item` with `cachedQty > 0`) deduct `lineQty` caps from `RAW_MATERIAL` stock and log an `OUT` `InventoryTransaction` (`refType: 'SPOT_SALE'`).
3. **Optional Pack vs. Loose Bottle Toggle in `LogCounterSaleForm.jsx` (`L269-L295`)**:
   - By default, AquaSphere packed items (`packSize > 1`) always default to **`PACK`** (`x12` or `x6`).
   - However, if partial breakage or manual stock adjustments ever leave loose remainder bottles (`+loose btl` shown on `CounterSalesStockBar.jsx`) or a walk-in customer buys loose bottles, adding a small `[Pack (×12)] / [Loose Btl]` pill toggle in `LogCounterSaleForm.jsx` lets the cashier sell either full packs (`saleType: 'PACK'`) or loose bottles (`saleType: 'BOTTLE'`) cleanly.

### 3.3 End-to-End Recipe COGS (Cost of Goods Sold) & Margin Logging (`CS-03`)

To give the Owner and Accountant a complete picture of **Revenues vs. COGS vs. Operating Expenses**:
1. In `backend/src/controllers/analytics.controller.js`, query `PurchaseItem` and `RecipeItem` inside `getDashboardAnalytics`:
   - Compute the weighted-average unit cost for each `RAW_MATERIAL` from `PurchaseItem`:
     $$\text{rawMaterialUnitCost}(rmId) = \frac{\sum \text{PurchaseItem.totalPrice}}{\sum \text{PurchaseItem.quantity}}$$
   - Compute the **Recipe COGS per Pack/Unit** and **per Base Bottle** for each `FINISHED_GOOD` using `resolveRecipeQuantities(r, fg.packSize)`:
     $$\text{unitCogs}(fg) = \sum_{r \in \text{Recipe}} \left(\text{perUnitQty}(r) \times \text{rawMaterialUnitCost}(r.\text{rawMaterialId})\right)$$
     $$\text{bottleCogs}(fg) = \frac{\text{unitCogs}(fg)}{\text{packSize}}$$
2. Accumulate `estimatedCogs` across every **Route Order (`Order`)** and **Counter Sale (`SpotSale`)** in every timeframe bucket (`today`, `yesterday`, `last3Days`, `weekly`, `monthly`, `yearly`, and `dailyFinancials`) so the Owner Dashboard displays:
   - **Total Revenue** (`Order Revenue` + `Counter Sales Revenue`)
   - **Estimated Recipe COGS** (Raw materials consumed in sold goods: preforms/bottles, caps, labels, shrink wrap, minerals)
   - **Gross Profit & Gross Margin %** ($\text{Revenue} - \text{Estimated COGS}$)
   - **Operating Expenses (OpEx)** (Fuel, Salaries, Electricity, Maintenance from `Expense`)
   - **True Operating Profit (Accrual)** ($\text{Revenue} - \text{Estimated COGS} - \text{Operating Expenses}$)
   - **Net Drawer Cash Flow** ($\text{Cash Collected} - \text{Operating Expenses} - \text{Vendor Payments Paid}$)

---

## 4. Deep-Dive Area 3: Role Dashboards & Bar Graph Redesign (Owner, Admin, MM, Accountant, PM, TM)

### 4.1 Owner Dashboard (`OwnerDashboardView.jsx` & `analytics.controller.js`) — Why the Bar Graph Was Nonsense & How to Fix It (`DASH-01`)

#### 4 Reasons the Current Owner Bar Chart & KPIs Are Broken:
1. **Fake "Net Profit" Line (`analytics.controller.js:L368 & L378` & `OwnerDashboardView.jsx:L229`)**:
   - The chart calculates `netCash = cashCollected - (expenses + vendorPayments)` and labels it **`'Net Profit'`**!
   - **Why that is nonsense:** Paying a supplier Rs. 400,000 for preforms on Monday is a **Cash Outflow for Inventory**, NOT a single-day operating loss! Plotting `cashCollected - expenses - vendorPayments` as `'Net Profit'` makes Monday plunge to `-Rs. 385,000` (flattening the entire Y-axis scale for the rest of the month), while Tuesday through Sunday show artificially inflated profit because Recipe COGS isn't deducted when goods are sold!
2. **KPI Card `Expenses` vs. `/expenses` Page Contradiction (`OwnerDashboardView.jsx:L199`)**:
   - On `/expenses` (`Expenses.jsx`), the total includes **Operating `Expense` + Raw Material `Purchase`**.
   - On `OwnerDashboardView.jsx:L199`, `activeData.expenses` ONLY sums the `Expense` table and hides `activeData.purchases` (`Purchase`) and `activeData.vendorPayments` (`VendorPayment`)!
3. **Frontend vs. Backend `netCash` Mismatch (`OwnerDashboardView.jsx:L164`)**:
   - `OwnerDashboardView.jsx:L164` calculates `const netCash = Number(activeData.cash || 0) - Number(activeData.expenses || 0)` (ignoring `vendorPayments`), whereas `analytics.controller.js:L341` and `dailyClose.controller.js:L84` subtract `vendorPayments`!
4. **30-Day × 3-Bar Visual Clutter (`OwnerDashboardView.jsx:L290-L315`)**:
   - Plotting 3 side-by-side bars (`Sales Revenue`, `Cash Inflow`, `Expenses`) + 1 line across 30 days crams 90 thin bars onto the canvas and mixes Accrual metrics (`Sales Revenue`) with Cash metrics (`Cash Inflow`) on the same cluster.

#### The Redesign for `OwnerDashboardView.jsx` & `analytics.controller.js`:
1. **Upgrade the 4 Executive Financial KPI Cards (`OwnerDashboardView.jsx`)**:
   - **Card 1 — Total Revenue (`activeData.sales`)**:
     - Subtitle: `Orders: Rs. X • Counter: Rs. Y`
   - **Card 2 — Cash Inflow & Drawer Net (`activeData.cash`)**:
     - Subtitle: `Net Cash (after OpEx & Vendor Paid): Rs. ${netCash}` (matches `DailyClose` expected cash!)
   - **Card 3 — Operating & Procurement Spend (`activeData.expenses`)**:
     - Primary value: `Rs. ${expenses}` (Operating Expenses)
     - Subtitle: `Raw Material Bills: Rs. ${purchases} • Vendor Paid: Rs. ${vendorPayments}`
   - **Card 4 — Operating Profit & COGS (`activeData.operatingProfit`)**:
     - Primary value: `Rs. ${operatingProfit}` (`Revenue - Est. COGS - OpEx`)
     - Subtitle: `Est. Recipe COGS: Rs. ${estimatedCogs} (Gross Margin: ${grossMarginPct}%)`
2. **Replace the Nonsense Bar Chart with a Clean, 2-Mode Executive Chart (`OwnerDashboardView.jsx`)**:
   - Add a **Mode Toggle (`Profitability & COGS` | `Cash Flow & Treasury`)** and a **Window Selector (`7D` | `14D` | `30D`, default `14D`)** in the chart header:
     - **Tab 1: `Profitability & COGS (Accrual P&L)`** (Default):
       - Stacked Bar 1 (`stackId="rev"`): `Order Revenue` (`#2563eb` Blue) + `Counter Revenue` (`#06b6d4` Cyan)
       - Stacked Bar 2 (`stackId="cost"`): `Est. Recipe COGS` (`#f59e0b` Amber) + `Operating Expenses` (`#f43f5e` Rose)
       - Smooth Line: `True Operating Profit (Revenue - COGS - OpEx)` (`#10b981` Emerald, `strokeWidth={2.5}`)
     - **Tab 2: `Cash Flow & Treasury (Drawer In vs. Out)`**:
       - Bar 1: `Cash Collected (Orders + Counter)` (`#10b981` Emerald)
       - Stacked Bar 2 (`stackId="out"`): `Operating Expenses` (`#f43f5e` Rose) + `Vendor Payments Paid` (`#f59e0b` Amber)
       - Smooth Line: `Net Cash Flow` (`#6366f1` Indigo, `strokeWidth={2.5}`)

---

### 4.2 Marketing Manager Dashboard (`MarketingDashboardView.jsx` & `analytics.controller.js`) (`DASH-02`)

#### Why the Current MM Dashboard & Bar Chart Are Broken:
1. **`0 Delivered` Mathematical Bug (`MarketingDashboardView.jsx:L88-L90`)**:
   ```javascript
   const pendingCount = Number(data?.unprocessedOrders?.length || 0);
   const totalOrders = Number(activeData?.bottlesSold || 0);
   const deliveredCount = Math.max(0, totalOrders - pendingCount);
   ```
   `data.unprocessedOrders` is **all-time pending orders**, while `activeData.bottlesSold` is the **selected timeframe's order count**. Whenever today's order count (`e.g. 2`) is smaller than all-time pending orders (`e.g. 5`), `deliveredCount` displays **`0 Delivered`** — even if both of today's orders were delivered!
2. **Useless Single-Bar Chart (`MarketingDashboardView.jsx:L170-L185`)**:
   Plots only raw order count (`1, 2, 0`) without showing **Delivered vs. Pending Orders**, **Order Revenue**, or **Packs/Bottles Sold by Product (`19L`, `1.5L`, `0.5L`)**.

#### The Fix for `analytics.controller.js` & `MarketingDashboardView.jsx`:
1. In `analytics.controller.js` (`createBucket()` and `orders.forEach`), track per-bucket:
   - `ordersCount`, `deliveredOrdersCount`, `pendingOrdersCount`, `partialOrdersCount`
   - `orderRevenue`, `spotRevenue`
   - `units19L`, `packs15L`, `packs05L`
2. In `MarketingDashboardView.jsx`:
   - Read `activeData.ordersCount`, `activeData.deliveredOrdersCount`, and `activeData.pendingOrdersCount` directly for the KPI cards!
   - Upgrade the Marketing Bar Chart with a 2-view toggle:
     - **`Fulfillment & Revenue`**: Stacked Bar of `Delivered Orders` (`#10b981`) + `Pending/Partial Orders` (`#f59e0b`) on left Y-axis, and `Order Revenue (Rs.)` Line (`#2563eb`) on right Y-axis.
     - **`Product Volume Sold`**: Grouped Bars of `19L Bottles` (`#2563eb`), `1.5L Packs` (`#8b5cf6`), and `0.5L Packs` (`#06b6d4`).

---

### 4.3 Admin Dashboard (`AdminDashboardView.jsx` & `adminDashboard.controller.js`) (`DASH-03`)

1. **Fix Multi-Item & Wadaana Batch Yield Showing `0 units` (`adminDashboard.controller.js:L131-L140`)**:
   - Currently, `todaysProductionBatches.forEach` only sums `b.quantity || 0`, which is `null` whenever a batch has multiple items (`remarks.producedItems`) or uses Wadaana columns (`qtyPure05L`, `qtyPure15L`, `qtyMix05L`, `qtyMix15L`).
   - Fix `adminDashboard.controller.js` to parse `b.remarks` (`producedItems`) and fallback to summing Wadaana/AquaSphere columns so `totalProductionYield` is always accurate.
2. **Include Counter Sales (`SpotSale`) in Admin KPIs**:
   - Query `SpotSale` for `startDate..endDate` in `adminDashboard.controller.js` and return `spotSalesCount` and `spotSalesRevenue` alongside `todaysOrdersCount` and `todaysRevenue`.

---

### 4.4 Accountant, Production & Transport Dashboards (`DASH-04`)

1. **`AccountantDashboardView.jsx` (`L119-L135`)**:
   - Use `activeData.netCash` (`cash - expenses - vendorPayments`) on the `Net Cash` KPI card so it matches `DailyClose` expected cash, and display `Vendor Paid: Rs. ${activeData.vendorPayments}` and `Raw Material Bills: Rs. ${activeData.purchases}` on the Expenses card subtitle.
   - Update `fetchTodayExpenses` (`L125-L127`) to pass `startDate` and `endDate` derived from the active `timeframe` instead of hardcoding `today`.
2. **`ProductionDashboardView.jsx` & `analytics.controller.js` (`L585-L750`)**:
   - Pass `&timeframe=${timeframe}` to `/analytics/production-dashboard` and filter `todaysProduction` by the selected `timeframe` window (`TODAY`, `YESTERDAY`, `LAST_3_DAYS`, `1_WEEK`, `1_MONTH`, `1_YEAR`) instead of hardcoding `todayStart`.
   - Parse `b.remarks` (`producedItems`) in `getProductionDashboardAnalytics` so custom finished goods are counted in KPI totals and `ProductionChart.jsx`.
3. **`TransportDashboardView.jsx` (`L145-L155`)**:
   - Filter `todayBottlesRecovered` by the selected `timeframe` date window (`startDate..endOfDay`) instead of hardcoded `todayStr`.

---

## 5. Step-by-Step Implementation Checklist for Antigravity

> **Execution Order for Antigravity:** Complete Tasks 1 through 6 sequentially, then run `npm run lint` in `backend/` and `npm run lint && npm run build` in `frontend/`, followed by `graphify update .`.

- [ ] **Task 1 (Catalog `packSize` & Recipe Engine)**:
  - Update `backend/src/controllers/item.controller.js` (`updateItem`) to destructure and save `packSize`.
  - Update `backend/src/utils/autoMigrations.js` to ensure AquaSphere standard `0.5L` (`packSize = 12`) and `1.5L` (`packSize = 6`) items have their true `packSize` in DB if `packSize <= 1`.
  - Update `backend/src/utils/productionFormulas.js` with `resolveRecipeQuantities(r, packSize)` so raw materials are always deducted accurately based on the recipe regardless of `packSize`.
  - Update `frontend/src/components/inventory/AddEditFinishedGoodModal.jsx` so packed items (`packSize > 1`) clearly show `Per 1 Pack (${packSize} Bottles)` with per-bottle helper equivalents and optional auto-scaling when `packSize` changes.
  - Update `frontend/src/components/production/CreateBatchModal.jsx` (`L39` & `L113-L125`) to read `fg.recipeFinishedGoods` and use `resolveRecipeQuantities`, and remove hardcoded `'0.5' ? 12 : 6` name-sniffing fallbacks.
  - Update `backend/src/controllers/production.controller.js` (`deleteProductionBatch`) to roll back `BottleTransaction` rows created by the batch.
- [ ] **Task 2 (Counter Sales Flow & Rollback Integrity)**:
  - Fix `backend/src/controllers/spotSale.controller.js:L516` (`deleteSpotSale`) to skip `CUSTOM_WATER` (`['WATER_REFILL', 'CUSTOM_WATER', 'EXTRA_CHARGE'].includes(line.saleType)`) and restore stock to exact `FACTORY` vs `WAREHOUSE` locations from `InventoryTransaction`.
  - Fix water litre multipliers in `spotSale.controller.js` and `analytics.controller.js` (`19.0L` for 19L/Refill, `1.5L * baseBottles` for 1.5L, `0.5L * baseBottles` for 0.5L).
  - Deduct `1` 19L Cap from `RAW_MATERIAL` stock on `WATER_REFILL` counter sales.
  - Add `[Pack (×N)] / [Loose Btl (1)]` toggle on packed items in `frontend/src/components/counterSales/LogCounterSaleForm.jsx`.
- [ ] **Task 3 (Recipe COGS Engine in Analytics)**:
  - In `backend/src/controllers/analytics.controller.js`, compute weighted-average raw material unit cost from `PurchaseItem`, derive per-pack/per-bottle Recipe COGS for each `FINISHED_GOOD`, and populate `estimatedCogs`, `grossProfit`, `operatingProfit`, `orderRevenue`, `spotRevenue`, `ordersCount`, `deliveredOrdersCount`, `pendingOrdersCount`, `units19L`, `packs15L`, and `packs05L` across all timeframe buckets and `dailyFinancials`.
- [ ] **Task 4 (Owner Dashboard & Dual-Mode Bar Chart)**:
  - Update `frontend/src/components/dashboard/OwnerDashboardView.jsx` KPI cards and replace the single 30-day chart with the 2-mode **`Profitability & COGS (Accrual)`** vs. **`Cash Flow & Treasury (Drawer)`** chart with `7D / 14D / 30D` range selector.
- [ ] **Task 5 (Marketing Manager & Admin Dashboards)**:
  - Fix `frontend/src/components/dashboard/MarketingDashboardView.jsx` `deliveredCount` / `pendingCount` timeframe math and upgrade the MM chart with **`Fulfillment & Revenue`** and **`Product Volume Sold`** views.
  - Fix `backend/src/controllers/adminDashboard.controller.js` multi-item/Wadaana batch yield calculation and include `SpotSale` metrics in `AdminDashboardView.jsx`.
- [ ] **Task 6 (Accountant, Production & Transport Dashboards)**:
  - Fix `AccountantDashboardView.jsx` `netCash` (`cash - expenses - vendorPayments`) and make its Expense Log table reactive to `TimeframeDropdown`.
  - Make `ProductionDashboardView.jsx` (`getProductionDashboardAnalytics`) and `TransportDashboardView.jsx` reactive to `TimeframeDropdown` and include `remarks.producedItems` in production totals.