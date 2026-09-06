# Implementation Plan: Dynamic Custom Raw Materials & Finished Goods (BOM)

Introduce dynamic creation of custom Raw Materials and custom Finished Goods with a visual Bill of Materials (Recipe Builder) in AquaSphere and Wadaana, replacing hardcoded product logic with a flexible, relational catalog.

---

## User Review Required

> [!IMPORTANT]
> **No breaking database migrations required.** The Prisma schema already defines `AquasphereItem` / `WadaanaItem` and `AquasphereRecipeItem` / `WadaanaRecipeItem`, as well as `outputItemId` in production batches. We will maintain backward compatibility so all historical batch records and legacy 0.5L / 1.5L / 19L data remain valid.

> [!NOTE]
> **Mineral Set & Water Treatment for Custom Finished Goods**: In AquaSphere, standard water products (0.5L, 1.5L, 19L) calculate mineral set (Calcium, Magnesium, Sodium) based on total litres treated. For custom finished goods, the owner can either define exact raw material recipe quantities directly in the Recipe Builder (recommended for custom products) or link them to a standard water volume.

---

## Proposed Architecture & Changes

```
┌────────────────────────────────────────────────────────┐
│                   Dynamic Catalog                      │
│                                                        │
│  [Raw Materials]                  [Finished Goods]     │
│  • Empty Bottles                  • 0.5L PET Pack      │
│  • Caps, Labels, Shrink Wrap      • 1.5L PET Pack      │
│  • Custom Material (e.g. 6L Cap)  • Custom FG (6L Pack)│
└──────────────┬───────────────────────────▲─────────────┘
               │                           │
               │      recipe_items         │
               └────(quantityPerUnit)──────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────┐
│                   Production Batch                     │
│  outputItemId: "custom-6l-id", quantity: 50 packs      │
│                                                        │
│  Formula / Controller:                                 │
│  1. Look up recipe_items for outputItemId              │
│  2. Required = quantity * quantityPerUnit              │
│  3. Validate stock & deduct raw materials              │
│  4. Add +50 packs to Finished Goods stock              │
└────────────────────────────────────────────────────────┘
```

---

### Database Layer

#### [MODIFY] [backend/prisma/schema.prisma](file:///home/ehtisham/Desktop/AquaSphere/backend/prisma/schema.prisma)
* Verify relation fields: `AquasphereItem` already has `recipeFinishedGoods` and `recipeRawMaterials`.
* Ensure `AquasphereProductionBatch` and `WadaanaProductionBatch` allow `outputItemId` to link directly to `AquasphereItem` / `WadaanaItem` without requiring hardcoded column values for new batches.
* Legacy columns (`packs05L`, `packs15L`, `qtyPure05L`, etc.) remain intact and nullable/defaulted to preserve existing historical batch rows.

#### [MODIFY] [backend/scripts/seed-full-bom.js](file:///home/ehtisham/Desktop/AquaSphere/backend/scripts/seed-full-bom.js)
* Ensure all standard AquaSphere and Wadaana finished goods have their initial default recipes seeded into `recipe_items` (`0.5L Pack`, `1.5L Pack`, `19L Refill`, and Wadaana preforms).

---

### Backend Layer

#### [MODIFY] [backend/src/utils/productionFormulas.js](file:///home/ehtisham/Desktop/AquaSphere/backend/src/utils/productionFormulas.js)
* Transform `calculateProductionBatch` into a recipe-driven calculator:
  * For dynamic batches (`outputItemId` + `quantity`):
    * Read the finished good's `recipeFinishedGoods` relations.
    * Compute required raw material deductions: `quantityPerUnit * netQuantity`.
    * If the product has water volume specs, compute mineral set fractions dynamically.
  * Maintain fallback logic for legacy batch payloads (`packs05L`, `packs15L`, `quantity`) so existing routes/tests don't break.

#### [MODIFY] [backend/src/controllers/item.controller.js](file:///home/ehtisham/Desktop/AquaSphere/backend/src/controllers/item.controller.js)
* Update `createItem`:
  * Accept `type` (`'RAW_MATERIAL'` or `'FINISHED_GOOD'`).
  * If `type === 'FINISHED_GOOD'` and `recipe` array is provided (`[{ rawMaterialId, quantityPerUnit }]`):
    * Create the finished good item.
    * Create associated `recipe_items` in the same Prisma transaction.
* Update `updateItem`:
  * Allow updating item metadata (name, unit, reorderLevel) and syncing recipe items if updated.
* Ensure `getItems` returns items with their active recipes (`recipeFinishedGoods: { include: { rawMaterial: true } }`).

#### [MODIFY] [backend/src/controllers/production.controller.js](file:///home/ehtisham/Desktop/AquaSphere/backend/src/controllers/production.controller.js)
* `createProductionBatch`:
  * Accept `{ outputItemId, quantity, batchDate, notes }` in addition to legacy fields.
  * Validate that `outputItemId` exists and is a `FINISHED_GOOD`.
* `completeProductionBatch`:
  * For generic batches:
    * Fetch batch and its `outputItem` including `recipeFinishedGoods`.
    * Calculate deductions using the recipe.
    * Verify available raw material stock.
    * Deduct raw materials, record into `production_batch_consumptions`, log `IN` transaction for finished good, and increment `factoryQty`.

---

### Frontend Layer

#### [MODIFY] [frontend/src/components/rawMaterials/AddEditRawMaterialModal.jsx](file:///home/ehtisham/Desktop/AquaSphere/frontend/src/components/rawMaterials/AddEditRawMaterialModal.jsx)
* Refine custom raw material creation:
  * Clear section for "Add Custom Raw Material": Name, Unit (`pcs`, `kg`, `litres`, `rolls`), Reorder Level, Initial Stock.
  * Fix existing ESLint dependency warning (`presetsList`).
  * Ensure custom items immediately reflect in the raw materials table on save.

#### [NEW] [frontend/src/components/inventory/AddEditFinishedGoodModal.jsx](file:///home/ehtisham/Desktop/AquaSphere/frontend/src/components/inventory/AddEditFinishedGoodModal.jsx)
* Modal for creating/editing Finished Goods:
  * **Basic Details:** Product Name (e.g., *"6L Canister (Pack of 2)"*), Unit (e.g., *"packs"*, *"bottles"*), Reorder Level, Initial Stock.
  * **Visual Recipe Builder:**
    * Dropdown to select existing Raw Materials (`type === 'RAW_MATERIAL'`).
    * Number input for quantity required per unit of finished good.
    * "+ Add Ingredient" button to add multiple rows.
    * Dynamic validation (prevent duplicate raw material selections in same recipe, require positive quantities).
  * Submits payload with `{ name, type: 'FINISHED_GOOD', unit, reorderLevel, initialStock, recipe: [...] }`.

#### [MODIFY] [frontend/src/pages/Inventory.jsx](file:///home/ehtisham/Desktop/AquaSphere/frontend/src/pages/Inventory.jsx)
* Add **"Add Finished Good"** action button in the header toolbar (accessible to `OWNER` / `ADMIN`).
* Wire state to open `AddEditFinishedGoodModal`.
* Refresh finished goods list upon successful creation.

#### [MODIFY] [frontend/src/components/inventory/FinishedGoodsSummaryCards.jsx](file:///home/ehtisham/Desktop/AquaSphere/frontend/src/components/inventory/FinishedGoodsSummaryCards.jsx)
* Replace hardcoded cards (`0.5L`, `1.5L`, `19L`) with dynamic cards:
  * Renders a card for every active finished good from `items` (including default and custom ones).
  * Shows total units, factory qty, warehouse qty, and stock status badge (Normal, Low Stock, Out of Stock).

#### [MODIFY] [frontend/src/components/production/CreateBatchModal.jsx](file:///home/ehtisham/Desktop/AquaSphere/frontend/src/components/production/CreateBatchModal.jsx)
* Upgrade batch creation to support any finished good:
  * **Finished Good Selector:** Dropdown listing all available finished goods.
  * **Batch Quantity:** Input for quantity to produce.
  * **Live Bill of Materials (BOM) Calculator:**
    * When product and quantity are selected, dynamically display required raw materials.
    * Live indicator comparing required vs. current stock (Green checkmark if sufficient, Red warning if short).
  * Supports legacy batch input if needed.

#### [MODIFY] [frontend/src/components/production/ProductionBatchTable.jsx](file:///home/ehtisham/Desktop/AquaSphere/frontend/src/components/production/ProductionBatchTable.jsx)
* Update table headers and rows:
  * Display Product Name (`batch.outputItem?.name` or legacy summary).
  * Display Produced Quantity with units.
  * Show status badges, batch date, and verification actions cleanly.

#### [MODIFY] [frontend/src/components/production/CompleteBatchModal.jsx](file:///home/ehtisham/Desktop/AquaSphere/frontend/src/components/production/CompleteBatchModal.jsx)
* Adapt breakage/waste input dynamically based on the product being completed.

---

## Verification Plan

### 1. Code Quality & Linting
Run `pnpm run lint` in both backend and frontend to ensure zero ESLint errors:
```bash
cd /home/ehtisham/Desktop/AquaSphere/backend && pnpm run lint
cd /home/ehtisham/Desktop/AquaSphere/frontend && pnpm run lint
```

### 2. Automated API Testing via cURL
Test the full end-to-end lifecycle on the local backend:
1. **Login as Owner** and obtain JWT cookie/token.
2. **Create Custom Raw Material**:
   ```bash
   curl -X POST http://localhost:5000/api/items \
     -H "Content-Type: application/json" \
     -H "x-tenant: aquasphere" \
     -b cookies.txt \
     -d '{"name": "6L Bottle Preform", "type": "RAW_MATERIAL", "unit": "pcs", "reorderLevel": 50, "initialStock": 500}'
   ```
3. **Create Custom Finished Good with Recipe**:
   ```bash
   curl -X POST http://localhost:5000/api/items \
     -H "Content-Type: application/json" \
     -H "x-tenant: aquasphere" \
     -b cookies.txt \
     -d '{"name": "6L Canister (Pack of 2)", "type": "FINISHED_GOOD", "unit": "packs", "reorderLevel": 10, "recipe": [{"rawMaterialId": "<rawMaterialId>", "quantityPerUnit": 2}]}'
   ```
4. **Create Production Batch for the Custom Item**:
   ```bash
   curl -X POST http://localhost:5000/api/production \
     -H "Content-Type: application/json" \
     -H "x-tenant: aquasphere" \
     -b cookies.txt \
     -d '{"outputItemId": "<finishedGoodId>", "quantity": 50, "notes": "Test Custom Batch"}'
   ```
5. **Complete Production Batch**:
   ```bash
   curl -X POST http://localhost:5000/api/production/<batchId>/complete \
     -H "Content-Type: application/json" \
     -H "x-tenant: aquasphere" \
     -b cookies.txt \
     -d '{"wasteQuantity": 2}'
   ```
6. **Verify Stock Deductions & Additions**:
   * Raw material stock decreased by `50 * 2 = 100 pcs`.
   * Finished good stock increased by `48 packs` (net after waste).
   * Inventory transaction records logged.

### 3. Manual Verification
* Navigate to Raw Materials $\rightarrow$ Add Custom Raw Material $\rightarrow$ verify in table.
* Navigate to Inventory $\rightarrow$ Add Finished Good with Recipe $\rightarrow$ verify new card appears.
* Navigate to Production $\rightarrow$ Record Batch for the new Finished Good $\rightarrow$ observe live ingredient stock checks $\rightarrow$ complete batch $\rightarrow$ confirm stock reflected across pages.
