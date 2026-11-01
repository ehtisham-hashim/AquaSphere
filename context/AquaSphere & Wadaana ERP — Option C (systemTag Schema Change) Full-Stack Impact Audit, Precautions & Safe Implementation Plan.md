# **AquaSphere & Wadaana ERP — Dynamic `isReturnable` Raw Material, Recipe-Driven Custody, SpotSale & Multi-Asset Customer Ledger Master Plan**

**Core Architectural Principle:** Instead of hardcoding `"19L"` or a single magic string `systemTag: 'EMPTY_19L_BOTTLE'`, we introduce **`isReturnable Boolean @default(false) @map("is_returnable")`** on `Item` (`AquasphereItem` & `WadaanaItem`) and **`itemId String? @map("item_id")`** on `BottleTransaction` (`AquasphereBottleTransaction` & `WadaanaBottleTransaction`).  
Whenever **any** Raw Material is marked **`isReturnable = true`** (today: `Empty 19L Bottles`; tomorrow: `Empty 12L Dispenser Bottles`, `Returnable Crates`, etc.) and is included in a **Finished Good's BOM Recipe (`RecipeItem`)**:

1. **Order Delivery (`deliverOrder` & `ProcessDeliveryModal.jsx`)** automatically detects from the Finished Good's recipe which returnable raw material container(s) are being delivered and returned, and credits returned good containers directly back to that exact `rawMaterial.id` in Factory Raw Materials\!  
2. **Counter Sales / Spot Sales (`createSpotSale`, `deleteSpotSale` & `LogCounterSaleForm.jsx`)** automatically detects from the Finished Good's recipe if a returnable container is being sold, allows recording empty containers returned at the counter, updates customer custody, and credits/debits that exact `rawMaterial.id`\!  
3. **Customer Details (`CustomerDetails.jsx`), Customer Custody Ledger (`CustomerHistory.jsx`), and Bottle Adjustment Modal (`BottleAdjustmentModal.jsx`)** dynamically show **which returnable item(s)** the customer holds (e.g. `Empty 19L Bottles: 5`, and if a second returnable item is added in the future, `Empty 12L Bottles: 2`) instead of hardcoding `"19L"`\!

---

# **1\. Why Every Screen Was Previously Hardcoded (And What Was Missed)**

A full scan of the codebase revealed **14 backend and frontend files** that hardcoded `.includes('19l')`, `contains: 'empty'`, or assumed only one unnamed bottle type could ever exist in `BottleTransaction`:

| Layer | File | What Was Hardcoded / Broken | How isReturnable \+ BottleTransaction.itemId Fixes It |
| :---- | :---- | :---- | :---- |
| **Schema** | `backend/prisma/schema.prisma` | `Item` had no `isReturnable` flag; `BottleTransaction` had **no `itemId` column**, so the ledger could not distinguish between `Empty 19L Bottles` and a future second returnable item\! | Add `isReturnable Boolean @default(false) @map("is_returnable")` to `Item` and `itemId String? @map("item_id")` (referencing `Item.id`) to `BottleTransaction` in both schemas. |
| **Domain Service** | `backend/src/services/bottleInventory.service.js` | Antigravity's draft only looked up a single `'EMPTY_19L_BOTTLE'` item. | Resolves **any** `isReturnable: true` raw material directly by `itemId` OR via a Finished Good's `RecipeItem` (`where: { rawMaterial: { isReturnable: true } }`), supporting 1 or 10 returnable items automatically\! |
| **Order Controller** | `backend/src/controllers/order.controller.js` | Hardcoded `.includes('19l')` on lines 136, 290, 427, 815 and `contains: 'empty'` on lines 370, 484, 775\. | Inspects `order.items[].item.recipeFinishedGoods` for any `rawMaterial` with `isReturnable === true`. Credits/debits that exact `rawMaterial.id` and logs `BottleTransaction` with `itemId: rawMaterial.id`. |
| **Spot Sale Controller** | `backend/src/controllers/spotSale.controller.js` | 1\) Line 160 didn't include `recipeFinishedGoods`.2\) Line 420 & 710 hardcoded `.includes('19')`.3\) Had **no way** to record empty bottles returned by a customer at the walk-in counter\! | Includes `recipeFinishedGoods: { include: { rawMaterial: true } }`. Detects returnable container from recipe, supports `bottlesReturnedGood` on counter sales, and logs `BottleTransaction` with `itemId: rawMaterial.id`. |
| **Bottle Controller** | `backend/src/controllers/bottle.controller.js` | Hardcoded `contains: 'empty'` on line 155; `computeBottleStats` (`L10`) ignored `Item` stock (`At Plant` was always `0`) and couldn't group custody by returnable `itemId`. | Accepts `itemId` in `POST /api/v1/bottles/transactions` (defaulting to the primary `isReturnable: true` raw material if omitted), credits that exact `itemId`, and returns a `byItem` breakdown in `GET /api/v1/bottles/summary` and `GET /customers/:id`\! |
| **Customer Controller** | `backend/src/controllers/customer.controller.js` | `getCustomerDetails` (`L123`) didn't include `item` on `bottleTransactions` and didn't compute per-item custody balances; `deleteCustomer` (`L317`) used `contains: 'empty'`. | Includes `item: { select: { id: true, name: true, unit: true, isReturnable: true } }` on `bottleTransactions`, computes `returnableCustody: [{ itemId, name, balance }]` per customer, and reverses the exact `itemId` on `deleteCustomer`. |
| **Raw Materials UI** | `RawMaterialsTable.jsx` & `AddEditRawMaterialModal.jsx` | No checkbox to mark a Raw Material as **Returnable (`isReturnable`)**, and no badge in the table showing which raw material is a Returnable Custody Asset\! | Adds an **`isReturnable` ("Returnable Customer Custody Asset")** toggle in `AddEditRawMaterialModal.jsx` and renders a **`🔄 Returnable Custody Asset`** badge in `RawMaterialsTable.jsx`. |
| **Customer Details & Ledger UI** | `CustomerDetails.jsx`, `CustomerHistory.jsx`, `BottleAdjustmentModal.jsx` | Hardcoded `"19L Bottle Custody"` text; `CustomerHistory.jsx` (`Bottle Ledger` tab) had **no column showing which returnable item** was issued/returned; `BottleAdjustmentModal.jsx` couldn't select among multiple `isReturnable` items and forgot `clearCache('items')`\! | `CustomerDetails.jsx` shows per-item custody (`Empty 19L Bottles: 5`, plus any future returnable items); `CustomerHistory.jsx` shows the **Returnable Item** column & per-item filter; `BottleAdjustmentModal.jsx` lets you pick the `isReturnable` item (auto-selecting `Empty 19L Bottles` when there's only 1\) and invalidates `'items'` cache\! |
| **Delivery & Counter Modals** | `ProcessDeliveryModal.jsx` & `LogCounterSaleForm.jsx` | `ProcessDeliveryModal.jsx` hardcoded `.includes('19l')`; `LogCounterSaleForm.jsx` had no input for empty returnable bottles brought back during a counter sale\! | Both modals check whether any selected Finished Good has a recipe with `rawMaterial.isReturnable === true` (or `item.hasReturnableContainer`) and show the **Returnable Empty Bottles Returned** input dynamically\! |

---

# **2\. Production Safety Precautions for Schema Changes (isReturnable & BottleTransaction.itemId)**

4. **Never Use `--accept-data-loss`:** Both `isReturnable Boolean @default(false) @map("is_returnable")` on `Item` and `itemId String? @map("item_id")` on `BottleTransaction` are **100% additive and non-destructive**. Run `npx prisma db push` **without** `--accept-data-loss`.  
5. **Prevent `P2022` Crashes on Dokploy Startup (`backend/src/utils/autoMigrations.js`):**  
   Because `Dockerfile` runs `node src/index.js` without running `prisma db push`, execute these idempotent `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` statements at the very top of `ensureShrinkWrapMaterials()` in `backend/src/utils/autoMigrations.js`:

```sql
ALTER TABLE "aquasphere"."items" ADD COLUMN IF NOT EXISTS "is_returnable" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "wadaana"."items" ADD COLUMN IF NOT EXISTS "is_returnable" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "aquasphere"."bottle_transactions" ADD COLUMN IF NOT EXISTS "item_id" TEXT;
ALTER TABLE "wadaana"."bottle_transactions" ADD COLUMN IF NOT EXISTS "item_id" TEXT;
```

And automatically set `isReturnable = true` on `Empty 19L Bottles` (`AND: [{ name: contains '19' }, { name: contains 'empty' }]`) and backfill `itemId` on existing `BottleTransaction` rows\!  
---

# **3\. Complete Step-by-Step Copy-Paste Blueprint for Antigravity**

Copy and paste the following prompt blocks into Antigravity to implement the complete **`isReturnable` \+ Recipe-Driven Multi-Item Custody Architecture**:

## **PART 1: Backend Schema, Startup Auto-Migration, Domain Service & Controllers**

````
TASK: Implement the Dynamic `isReturnable` Raw Material & Recipe-Driven Customer Custody Architecture across Backend Schema, Startup Auto-Migrations, Domain Service, and Controllers (`bottle`, `order`, `spotSale`, `customer`, `item`, `adminDashboard`, `reports`).

### CRITICAL RULES:
1. Do NOT use `--accept-data-loss` when running `npx prisma db push`.
2. Add idempotent `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` statements in `backend/src/utils/autoMigrations.js` so Dokploy never crashes with `P2022`.
3. Never hardcode `name: { contains: 'empty' }` for bottle returns. Always resolve returnable raw materials via `isReturnable: true` and the Finished Good's BOM recipe (`RecipeItem`).

### STEP 1: Update `backend/prisma/schema.prisma`
1. In `AquasphereItem` and `WadaanaItem`:
   - Add `isReturnable Boolean @default(false) @map("is_returnable")`
   - Add relation `bottleTransactions AquasphereBottleTransaction[]` (on `AquasphereItem`) and `bottleTransactions WadaanaBottleTransaction[]` (on `WadaanaItem`).
   - Add `@@index([isReturnable])` on both models.
2. In `AquasphereBottleTransaction` and `WadaanaBottleTransaction`:
   - Add optional `itemId` linking to the returnable raw material `Item`:
     ```prisma
     itemId         String?              @map("item_id")
     item           AquasphereItem?      @relation(fields: [itemId], references: [id])
     ```
     (and `WadaanaItem?` on `WadaanaBottleTransaction`).
   - Add `@@index([customerId, itemId])` on both models.

### STEP 2: Update `backend/src/utils/autoMigrations.js`
At the very top of `ensureShrinkWrapMaterials()` in `backend/src/utils/autoMigrations.js`:
1. Run idempotent schema guards:
   ```js
   const ddlStatements = [
     `ALTER TABLE "aquasphere"."items" ADD COLUMN IF NOT EXISTS "is_returnable" BOOLEAN NOT NULL DEFAULT false;`,
     `ALTER TABLE "wadaana"."items" ADD COLUMN IF NOT EXISTS "is_returnable" BOOLEAN NOT NULL DEFAULT false;`,
     `ALTER TABLE "aquasphere"."bottle_transactions" ADD COLUMN IF NOT EXISTS "item_id" TEXT;`,
     `ALTER TABLE "wadaana"."bottle_transactions" ADD COLUMN IF NOT EXISTS "item_id" TEXT;`
   ];
   for (const sql of ddlStatements) {
     await prisma.$executeRawUnsafe(sql).catch(() => {});
   }
   ```
2. When locating `rm19Bottle` in `ensureShrinkWrapMaterials()`:
   - Ensure `rm19Bottle` matches both '19' and 'empty' (or '19l' and 'bottle'), and set `isReturnable: true` on `Empty 19L Bottles` (`await prisma.aquasphereItem.update({ where: { id: rm19Bottle.id }, data: { isReturnable: true } })`).
   - Ensure `0.5L Empty Bottles` and `1.5L Empty Bottles` have `isReturnable: false`.
   - Backfill any existing `aquasphereBottleTransaction` rows where `itemId: null` to set `itemId: rm19Bottle.id`.

### STEP 3: Create `backend/src/services/bottleInventory.service.js`
Create `backend/src/services/bottleInventory.service.js` to handle 1 or multiple `isReturnable` items dynamically via BOM recipes:
```js
/**
 * Dynamic Returnable Container & Custody Inventory Service
 * Supports 1 or N returnable raw materials (e.g., Empty 19L Bottles, Empty 12L Bottles, Crates)
 * linked to Finished Goods through RecipeItem (BOM).
 */

/**
 * Resolves a specific returnable raw material item by ID, or finds the primary returnable raw material.
 */
export async function resolveReturnableRawMaterial(tx, prefix, { rawMaterialId = null, finishedGoodId = null } = {}) {
  // 1. Direct lookup if rawMaterialId is explicitly provided
  if (rawMaterialId) {
    const direct = await tx[`${prefix}Item`].findFirst({
      where: { id: rawMaterialId, type: 'RAW_MATERIAL', archivedAt: null }
    });
    if (direct) return direct;
  }

  // 2. Lookup via Finished Good's BOM Recipe (any rawMaterial where isReturnable === true)
  if (finishedGoodId) {
    const recipe = await tx[`${prefix}RecipeItem`].findFirst({
      where: {
        finishedGoodId,
        rawMaterial: { type: 'RAW_MATERIAL', isReturnable: true, archivedAt: null }
      },
      include: { rawMaterial: true }
    });
    if (recipe?.rawMaterial) return recipe.rawMaterial;
  }

  // 3. Lookup primary returnable raw material in tenant catalog (isReturnable === true)
  let item = await tx[`${prefix}Item`].findFirst({
    where: { type: 'RAW_MATERIAL', isReturnable: true, archivedAt: null },
    orderBy: { createdAt: 'asc' }
  });
  if (item) return item;

  // 4. Fallback: composite name match ('19' AND 'empty') and self-heal isReturnable = true
  item = await tx[`${prefix}Item`].findFirst({
    where: {
      type: 'RAW_MATERIAL',
      archivedAt: null,
      AND: [
        { name: { contains: '19', mode: 'insensitive' } },
        { name: { contains: 'empty', mode: 'insensitive' } }
      ]
    }
  });

  if (item && !item.isReturnable) {
    item = await tx[`${prefix}Item`].update({
      where: { id: item.id },
      data: { isReturnable: true }
    }).catch(() => item);
  }

  return item;
}

/**
 * Given a list of OrderItems or SpotSaleItems, extracts all returnable raw materials
 * required by their Finished Goods' BOM recipes (or fallback to 19L name match if recipe wasn't loaded).
 * Returns Array<{ rawMaterialId, rawMaterialName, quantityIssued }>
 */
export async function extractReturnablesFromOrderItems(tx, prefix, lineItems = []) {
  const fgIds = [...new Set(lineItems.map(i => i.itemId).filter(Boolean))];
  if (fgIds.length === 0) return [];

  const recipes = await tx[`${prefix}RecipeItem`].findMany({
    where: {
      finishedGoodId: { in: fgIds },
      rawMaterial: { type: 'RAW_MATERIAL', isReturnable: true, archivedAt: null }
    },
    include: { rawMaterial: true }
  });

  const byRawMaterial = new Map();

  for (const line of lineItems) {
    const lineQty = Number(line.quantity || 0);
    if (lineQty <= 0) continue;

    const matchingRecipes = recipes.filter(r => r.finishedGoodId === line.itemId);
    if (matchingRecipes.length > 0) {
      for (const r of matchingRecipes) {
        const rm = r.rawMaterial;
        const issued = Math.round(lineQty * Number(r.quantityPerUnit || 1));
        if (issued > 0) {
          const prev = byRawMaterial.get(rm.id) || { rawMaterialId: rm.id, rawMaterialName: rm.name, unit: rm.unit || 'bottle', quantityIssued: 0 };
          prev.quantityIssued += issued;
          byRawMaterial.set(rm.id, prev);
        }
      }
    } else if ((line.item?.name || line.name || '').toLowerCase().includes('19l')) {
      // Fallback if 19L Refill recipe wasn't linked yet
      const fallbackRm = await resolveReturnableRawMaterial(tx, prefix, { finishedGoodId: line.itemId });
      if (fallbackRm) {
        const prev = byRawMaterial.get(fallbackRm.id) || { rawMaterialId: fallbackRm.id, rawMaterialName: fallbackRm.name, unit: fallbackRm.unit || 'bottle', quantityIssued: 0 };
        prev.quantityIssued += Math.round(lineQty);
        byRawMaterial.set(fallbackRm.id, prev);
      }
    }
  }

  return Array.from(byRawMaterial.values());
}

/**
 * Credits returned good empty containers back to Factory Raw Material stock and logs InventoryTransaction.
 */
export async function creditEmptyBottlesToFactory(tx, prefix, { quantity, rawMaterialId = null, finishedGoodId = null, customerId = null, orderId = null, reason = 'BOTTLE_RETRIEVAL' }) {
  const qty = Math.round(Number(quantity || 0));
  if (qty <= 0) return null;

  const item = await resolveReturnableRawMaterial(tx, prefix, { rawMaterialId, finishedGoodId });
  if (!item) return null;

  const updated = await tx[`${prefix}Item`].update({
    where: { id: item.id },
    data: {
      cachedQty: { increment: qty },
      factoryQty: { increment: qty }
    }
  });

  await tx[`${prefix}InventoryTransaction`].create({
    data: {
      itemId: item.id,
      quantity: qty,
      direction: 'IN',
      reason,
      refType: orderId ? 'ORDER' : 'CUSTOMER',
      refId: orderId || customerId || 'SYSTEM',
      location: 'FACTORY'
    }
  });

  return updated;
}

/**
 * Debits/reverses returned empty containers from Factory Raw Material stock (used on Order/Customer delete rollback).
 */
export async function debitEmptyBottlesFromFactory(tx, prefix, { quantity, rawMaterialId = null, finishedGoodId = null, customerId = null, orderId = null, reason = 'BOTTLE_RETRIEVAL_REVERSAL', skipTransactionLog = false }) {
  const qty = Math.round(Number(quantity || 0));
  if (qty <= 0) return null;

  const item = await resolveReturnableRawMaterial(tx, prefix, { rawMaterialId, finishedGoodId });
  if (!item) return null;

  const updated = await tx[`${prefix}Item`].update({
    where: { id: item.id },
    data: {
      cachedQty: { decrement: qty },
      factoryQty: { decrement: qty }
    }
  });

  if (!skipTransactionLog) {
    await tx[`${prefix}InventoryTransaction`].create({
      data: {
        itemId: item.id,
        quantity: qty,
        direction: 'OUT',
        reason,
        refType: orderId ? 'ORDER_REVERSAL' : 'CUSTOMER_REVERSAL',
        refId: orderId || customerId || 'SYSTEM',
        location: 'FACTORY'
      }
    });
  }

  return updated;
}

/**
 * Computes per-item returnable custody breakdown for a customer from their BottleTransactions.
 */
export async function getCustomerReturnableCustodyBreakdown(tx, prefix, customerId, fallbackTotalBalance = 0) {
  const [returnableItems, txns] = await Promise.all([
    tx[`${prefix}Item`].findMany({
      where: { type: 'RAW_MATERIAL', isReturnable: true, archivedAt: null },
      orderBy: { createdAt: 'asc' }
    }),
    tx[`${prefix}BottleTransaction`].findMany({
      where: { customerId },
      include: { item: { select: { id: true, name: true, unit: true, isReturnable: true } } },
      orderBy: { createdAt: 'asc' }
    })
  ]);

  const primaryItem = returnableItems[0] || null;
  const map = new Map();

  for (const ri of returnableItems) {
    map.set(ri.id, {
      itemId: ri.id,
      name: ri.name,
      unit: ri.unit || 'bottle',
      delivered: 0,
      returnedGood: 0,
      returnedBroken: 0,
      lost: 0,
      inCustody: 0
    });
  }

  for (const t of txns) {
    const targetId = t.itemId || primaryItem?.id || 'DEFAULT_19L';
    const targetName = t.item?.name || primaryItem?.name || 'Empty 19L Bottles';
    if (!map.has(targetId)) {
      map.set(targetId, { itemId: targetId, name: targetName, unit: 'bottle', delivered: 0, returnedGood: 0, returnedBroken: 0, lost: 0, inCustody: 0 });
    }
    const entry = map.get(targetId);
    const q = Number(t.quantity || 0);
    if (t.type === 'DELIVERED_TO_CUSTOMER') {
      entry.delivered += q;
      entry.inCustody += q;
    } else if (t.type === 'RETURNED_GOOD') {
      entry.returnedGood += q;
      entry.inCustody -= q;
    } else if (t.type === 'RETURNED_BROKEN') {
      entry.returnedBroken += q;
      entry.inCustody -= q;
    } else if (t.type === 'MARKED_LOST') {
      entry.lost += q;
      entry.inCustody -= q;
    }
  }

  const list = Array.from(map.values()).map(e => ({ ...e, inCustody: Math.max(0, e.inCustody) }));
  const sumCustody = list.reduce((s, e) => s + e.inCustody, 0);

  // If customer had an opening cachedBottleBalance without transactions, attribute remainder to primary returnable item
  if (fallbackTotalBalance > sumCustody && list.length > 0) {
    list[0].inCustody += (fallbackTotalBalance - sumCustody);
  }

  return list;
}
```

### STEP 4: Update Controllers (`bottle`, `order`, `spotSale`, `customer`, `item`)
1. **`backend/src/controllers/bottle.controller.js`**:
   - In `getBottleTransactions`: include `item: { select: { id: true, name: true, unit: true, isReturnable: true } }` alongside `customer`.
   - In `createBottleTransaction`:
     - Accept optional `itemId` (the returnable `RAW_MATERIAL` ID) from `req.body`.
     - Resolve the target returnable item via `const retItem = await resolveReturnableRawMaterial(tx, prefix, { rawMaterialId: itemId });`.
     - Save `itemId: retItem?.id || null` on `tx[\`${prefix}BottleTransaction\`].create(...)`.
     - When `type === 'RETURNED_GOOD'`, call `await creditEmptyBottlesToFactory(tx, prefix, { quantity: qty, rawMaterialId: retItem?.id, customerId, reason: 'BOTTLE_RETRIEVAL' });`.
   - In `computeBottleStats`:
     - Query all `RAW_MATERIAL` items where `isReturnable: true` (`returnableItems`).
     - Compute `atFactory` from the sum of `factoryQty` (or `cachedQty`) of `returnableItems` when `totalPurchased === 0`, and return `returnableItems: returnableItems.map(i => ({ id: i.id, name: i.name, cachedQty: Number(i.cachedQty || 0), factoryQty: Number(i.factoryQty || 0), warehouseQty: Number(i.warehouseQty || 0) }))` in `GET /api/v1/bottles/summary`!
2. **`backend/src/controllers/order.controller.js`**:
   - In `getOrders`: inside `items: { include: { item: { include: { recipeFinishedGoods: { include: { rawMaterial: true } } } } } }`, include the recipe so the frontend `ProcessDeliveryModal.jsx` knows which order items contain an `isReturnable: true` raw material!
   - In `deliverOrder` (both Case 1 and Case 2) and `deleteOrder`:
     - Use `extractReturnablesFromOrderItems(tx, prefix, o.items)` to determine the returnable raw material(s) and total returnable quantity on the order (`returnables`).
     - Log `BottleTransaction` rows with `itemId: primaryReturnable?.rawMaterialId || null` and `orderId: o.id`.
     - When `retGood > 0`, call `creditEmptyBottlesToFactory(tx, prefix, { quantity: retGood, rawMaterialId: primaryReturnable?.rawMaterialId, orderId: o.id, customerId: o.customerId })`.
     - In `deleteOrder`, call `debitEmptyBottlesFromFactory(tx, prefix, { quantity: retGoodTotal, rawMaterialId: primaryReturnable?.rawMaterialId, orderId: order.id, customerId: order.customerId, skipTransactionLog: true })`.
3. **`backend/src/controllers/spotSale.controller.js` (Spot Sale Returnable Custody!)**:
   - In `createSpotSale`:
     - Accept optional `bottlesReturnedGood = 0` from `req.body`.
     - When fetching `dbItems` (line 160), include `recipeFinishedGoods: { include: { rawMaterial: true } }`.
     - Inside the transaction, instead of checking `const is19L = currentItem.name.toLowerCase().includes('19')` (line 420), check if `currentItem.recipeFinishedGoods` contains a `rawMaterial` with `isReturnable === true` (or fallback via `extractReturnablesFromOrderItems`):
       - For each `isReturnable` raw material in the sold finished good's recipe:
         - Issue `issuedQty = Math.round(baseUnitsDeduct * Number(recipe.quantityPerUnit || 1))` into `BottleTransaction` (`type: 'DELIVERED_TO_CUSTOMER', itemId: rm.id, customerId: customerId || null, reason: \`Counter Sale (\${saleNumber})\``).
         - If `customerId` is present, increment `Customer.cachedBottleBalance` by `issuedQty`.
     - If `Number(bottlesReturnedGood) > 0`:
       - Credit the returned empty bottles back to Factory Raw Materials via `await creditEmptyBottlesToFactory(tx, prefix, { quantity: Number(bottlesReturnedGood), customerId, reason: \`Counter Sale Empty Return (\${saleNumber})\` })`.
       - Log a `RETURNED_GOOD` `BottleTransaction` and decrement `Customer.cachedBottleBalance` by `Number(bottlesReturnedGood)`!
   - In `deleteSpotSale`:
     - Use `extractReturnablesFromOrderItems` to reverse the exact `itemId` on `BottleTransaction` and `Customer.cachedBottleBalance`.
4. **`backend/src/controllers/customer.controller.js`**:
   - In `getCustomerDetails` (`L123`):
     - Update `bottleTransactions` select to include `itemId: true, item: { select: { id: true, name: true, unit: true, isReturnable: true } }`.
     - Call `const returnableCustody = await getCustomerReturnableCustodyBreakdown(prisma, prefix, id, Number(customer.cachedBottleBalance || 0));` and return `returnableCustody` inside the `GET /api/v1/customers/:id` response!
   - In `deleteCustomer` (`L317`):
     - Replace `name: { contains: 'empty' }` with `debitEmptyBottlesFromFactory(tx, prefix, { quantity: retGoodTotal, customerId: id, skipTransactionLog: true })`.
5. **`backend/src/controllers/item.controller.js`**:
   - In `getItems`: include `recipeFinishedGoods: { include: { rawMaterial: true } }`, and attach a computed helper flag `hasReturnableContainer: Boolean(item.recipeFinishedGoods?.some(r => r.rawMaterial?.isReturnable))` and `returnableRawMaterials: item.recipeFinishedGoods?.filter(r => r.rawMaterial?.isReturnable).map(r => r.rawMaterial) || []` onto each `FINISHED_GOOD` item!
   - In `createItem` and `updateItem`: accept `isReturnable` boolean (`Boolean(req.body.isReturnable)`) and save it on `Item`.
````

## **PART 2: Frontend Updates (RawMaterials, CustomerDetails, CustomerHistory, BottleAdjustmentModal, ProcessDeliveryModal, LogCounterSaleForm, apiCache)**

````
TASK: Update all Frontend components so `isReturnable` Raw Materials, Multi-Item Customer Custody Ledgers, Order Delivery Returns, and Counter Sale (Spot Sale) Returns work dynamically for 1 or N returnable items without hardcoding "19L".

### STEP 1: Raw Materials UI (`AddEditRawMaterialModal.jsx` & `RawMaterialsTable.jsx`)
1. `frontend/src/components/rawMaterials/AddEditRawMaterialModal.jsx`:
   - Add state `const [isReturnable, setIsReturnable] = useState(false);` initialized in `useEffect` from `Boolean(editingItem?.isReturnable)`.
   - Right above the "Sellable on Walk-In Counter (POS)" box, add a clean **"Returnable Customer Custody Container (`isReturnable`)"** toggle box:
     ```jsx
     <div className="p-3.5 bg-sky-50/60 border border-sky-200/80 rounded-xl">
       <label className="text-xs font-bold text-slate-800 flex items-center gap-2 cursor-pointer">
         <input
           type="checkbox"
           checked={isReturnable}
           onChange={(e) => setIsReturnable(e.target.checked)}
           className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
         />
         <span>🔄 Returnable Customer Custody Asset (isReturnable)</span>
       </label>
       <p className="text-[11px] text-slate-500 mt-0.5 ml-6">
         When included in a Finished Good's recipe (like Empty 19L Bottles), delivering that product tracks customer custody and returning good empties credits this raw material automatically.
       </p>
     </div>
     ```
   - Pass `isReturnable` in the `POST /api/v1/items` and `PATCH /api/v1/items/:id` request bodies.
2. `frontend/src/components/rawMaterials/RawMaterialsTable.jsx`:
   - In `getBadge(m)` (pass the whole item `m`), if `m.isReturnable` is `true`, render:
     `<span className="inline-flex items-center gap-1 bg-sky-50 text-sky-700 border border-sky-200 text-xs px-2.5 py-0.5 rounded-full font-bold">🔄 Returnable Custody Asset</span>`

### STEP 2: Customer Profile & Multi-Item Custody Ledger (`CustomerDetails.jsx`, `CustomerHistory.jsx`, `BottleAdjustmentModal.jsx`)
1. `frontend/src/components/customer/CustomerDetails.jsx`:
   - Instead of hardcoding '19L Bottle Custody', label the card **`Returnable Custody`**.
   - Read `const custodyItems = (c.returnableCustody || []).filter(ri => ri.inCustody > 0);`.
   - Display total custody (`${c.cachedBottleBalance || 0} Held`), and if `custodyItems.length > 0`, render a mini pill for each returnable item held by the customer (e.g., `Empty 19L Bottles: 5`, `Empty 12L Bottles: 2`).
   - Always show the **`Retrieve / Adjust`** button whenever `(c.cachedBottleBalance || 0) > 0` or `custodyItems.length > 0` (or allow opening `BottleAdjustmentModal` to issue/adjust returnables).
2. `frontend/src/components/customer/CustomerHistory.jsx` (`Tab 4: Bottle Ledger`):
   - Rename tab label from 'Bottle Ledger' to **`'Returnable Custody Ledger'`**.
   - Add a **Returnable Item Filter** pill bar above the table if more than 1 distinct `tx.item?.name` exists in `bottleTransactions`.
   - Update the table columns to:
     1) `Date & Time`
     2) **`Returnable Item`** (`tx.item?.name || 'Empty 19L Bottles'` rendered as a bold sky badge)
     3) `Transaction Type` (`Delivered to Customer`, `Returned (Good) -> Credited to Stock`, `Returned (Broken)`, `Marked Lost`)
     4) `Quantity Change` (`+X` / `-X`)
     5) `Reason / Order Ref`
3. `frontend/src/components/customer/BottleAdjustmentModal.jsx`:
   - Fetch `/api/v1/items?type=RAW_MATERIAL` (filtering `i.isReturnable === true`) on mount, and combine with `customer.returnableCustody || []`.
   - Add state `const [selectedItemId, setSelectedItemId] = useState('');` (defaulting to the first `isReturnable` item, e.g., `Empty 19L Bottles`).
   - Show a **"Returnable Container Type"** `<select>` dropdown listing all `isReturnable: true` raw materials (along with how many of that specific item the customer currently holds in custody!).
   - Pass `itemId: selectedItemId || undefined` in `POST /api/v1/bottles/transactions`.
   - Call `clearCache('items'); clearCache('bottles'); clearCache('customers'); clearCache('inventory');` after saving!
4. `frontend/src/utils/apiCache.js`:
   - Add `bottles: ['bottles', 'items', 'customers', 'analytics', 'admin']` to `relatedMap`.

### STEP 3: Order Delivery & Counter Sale Returnable Support (`ProcessDeliveryModal.jsx` & `LogCounterSaleForm.jsx`)
1. `frontend/src/components/orders/ProcessDeliveryModal.jsx`:
   - Instead of checking only `i.item?.name?.toLowerCase().includes('19l')`, check if an order item has a returnable raw material in its recipe:
     ```js
     const isReturnableOrderItem = (oi) => 
       Boolean(oi.item?.hasReturnableContainer) ||
       Boolean(oi.item?.recipeFinishedGoods?.some(r => r.rawMaterial?.isReturnable)) ||
       Boolean(oi.item?.name?.toLowerCase().includes('19l'));
     ```
   - Use `isReturnableOrderItem` to compute `qtyReturnableOrdered` and display the **Returnable Empty Bottles Returned (Good / Broken)** section with the exact name of the returnable raw material (e.g., `Empty 19L Bottles Returned`).
2. `frontend/src/components/counterSales/LogCounterSaleForm.jsx`:
   - Check if any item in `cartItems` is a `FINISHED_GOOD` that uses a returnable container (`item.hasReturnableContainer` or `item.recipeFinishedGoods?.some(r => r.rawMaterial?.isReturnable)` or `item.name.toLowerCase().includes('19')`).
   - When a returnable Finished Good is in the counter cart, show a compact **"Empty Returnable Bottles Returned at Counter"** stepper input (`bottlesReturnedGood`, defaulting to `0`, with a `"Same as Sold"` quick button).
   - Pass `bottlesReturnedGood` in the `handleMultiItemSubmit` payload to `POST /api/v1/spot-sales` so counter sales can both issue custody AND receive returned empties into Factory Raw Material stock!
````

## **PART 3: Safe Ledger Repair Script (backend/scripts/reconcile-empty-bottle-stock.js)**

```js
import { prisma } from '../src/config/db.js';

async function repairEmptyBottleStock() {
  console.log('🔧 Starting Returnable Empty Bottle Stock & Schema Tag Repair...');

  // 1. Ensure columns exist
  await prisma.$executeRawUnsafe(`ALTER TABLE "aquasphere"."items" ADD COLUMN IF NOT EXISTS "is_returnable" BOOLEAN NOT NULL DEFAULT false;`).catch(() => {});
  await prisma.$executeRawUnsafe(`ALTER TABLE "aquasphere"."bottle_transactions" ADD COLUMN IF NOT EXISTS "item_id" TEXT;`).catch(() => {});

  // 2. Locate Empty 19L Bottles and 0.5L Empty Bottles
  const bottle19L = await prisma.aquasphereItem.findFirst({
    where: {
      type: 'RAW_MATERIAL',
      AND: [
        { name: { contains: '19', mode: 'insensitive' } },
        { name: { contains: 'empty', mode: 'insensitive' } }
      ]
    }
  });

  const bottle05L = await prisma.aquasphereItem.findFirst({
    where: {
      type: 'RAW_MATERIAL',
      AND: [
        { name: { contains: '0.5', mode: 'insensitive' } },
        { name: { contains: 'empty', mode: 'insensitive' } }
      ]
    }
  });

  if (!bottle19L) {
    throw new Error('Could not find "Empty 19L Bottles" raw material item!');
  }

  // 3. Mark Empty 19L Bottles as isReturnable = true, and 0.5L/1.5L as false
  await prisma.aquasphereItem.update({
    where: { id: bottle19L.id },
    data: { isReturnable: true }
  });
  await prisma.aquasphereItem.updateMany({
    where: { type: 'RAW_MATERIAL', id: { not: bottle19L.id }, name: { contains: 'empty', mode: 'insensitive' } },
    data: { isReturnable: false }
  });

  // 4. Backfill itemId on all historical BottleTransactions where itemId is null
  await prisma.aquasphereBottleTransaction.updateMany({
    where: { itemId: null },
    data: { itemId: bottle19L.id }
  });

  // 5. Find misattributed BOTTLE_RETRIEVAL inventory transactions on 0.5L Empty Bottles
  if (bottle05L) {
    const misattributedTxns = await prisma.aquasphereInventoryTransaction.findMany({
      where: {
        itemId: bottle05L.id,
        reason: 'BOTTLE_RETRIEVAL',
        direction: 'IN'
      }
    });

    const totalMisattributed = misattributedTxns.reduce((s, t) => s + Number(t.quantity || 0), 0);

    if (totalMisattributed > 0) {
      console.log(`🔄 Moving ${totalMisattributed} misattributed returned bottles from "${bottle05L.name}" -> "${bottle19L.name}"...`);
      await prisma.$transaction([
        prisma.aquasphereItem.update({
          where: { id: bottle05L.id },
          data: {
            cachedQty: { decrement: totalMisattributed },
            factoryQty: { decrement: totalMisattributed }
          }
        }),
        prisma.aquasphereItem.update({
          where: { id: bottle19L.id },
          data: {
            cachedQty: { increment: totalMisattributed },
            factoryQty: { increment: totalMisattributed }
          }
        }),
        prisma.aquasphereInventoryTransaction.updateMany({
          where: { id: { in: misattributedTxns.map(t => t.id) } },
          data: { itemId: bottle19L.id }
        })
      ]);
      console.log(`✅ Successfully transferred ${totalMisattributed} bottles (cachedQty & factoryQty) to "${bottle19L.name}"!`);
    } else {
      console.log('✓ No misattributed BOTTLE_RETRIEVAL transactions found on 0.5L Empty Bottles.');
    }
  }

  await prisma.$disconnect();
}

repairEmptyBottleStock().catch(err => {
  console.error(err);
  process.exit(1);
});
```

---

# **8\. Raw Material Varieties: Discrete (`Int`) vs. Continuous (`Float` / `kg` / `litres`) Handling**

## **8.1 Why This Matters in AquaSphere & Wadaana**

In both tenants' catalogs, `RAW_MATERIAL` items fall into two distinct physical measurement categories:

6. **Discrete Countable Units (`Int`):** `Empty 19L Bottles`, `0.5L Empty Bottles`, `1.5L Empty Bottles`, `19L Bottle Caps`, `Pet Bottles Caps`, `Shrink Wrap Rolls` (when counted by `pcs`, `bottle`, `cap`, `jar`, `crate`, `bag`, `box`, `pack`).  
7. **Continuous Weight / Volume Units (`Float` / `Decimal`):** `0.5L Shrink Wrap Film` (`kg`), `1.5L Shrink Wrap Film` (`kg`), `Labels` (`kg`), `Calcium` (`kg`), `Magnesium` (`kg`), `Sodium` (`kg`), and Wadaana `Preforms` (`kg`).

### **Three Critical Bugs Found in the Current Codebase**

8. **AddEditFinishedGoodModal.jsx (Line 362\) Rounds Float kg Stock to 0:**  
   Currently, the Recipe (BOM) Builder displays available raw material stock using:  
   `In Stock: {Math.round(Number(mat.cachedQty || 0)).toLocaleString()} {mat.unit}`  
   If `Sodium` or `0.5L Shrink Wrap Film` has `0.45 kg` in stock, `Math.round(0.45)` renders **In Stock: 0 kg**\! Even worse, when a 12-pack recipe deducts `0.02273 kg` of Shrink Wrap Film per pack, the remaining decimal balance is masked by `Math.round`.  
9. **Prisma Decimal String Serialization ("100.0000") in AddEditRawMaterialModal.jsx:**  
   Because `Item.cachedQty` and `Item.reorderLevel` are `Decimal` columns in PostgreSQL, Prisma serializes them with trailing zeros. Editing an integer raw material like `Empty 19L Bottles` without normalizing shows `100.0000` in the input box, while editing a `kg` raw material requires `step="any"` (up to 4 decimal places) rather than integer stepping.  
10. **isReturnable Must Be Restricted Strictly to Discrete Countable Units (Int):**  
    Because `Customer.cachedBottleBalance` and `BottleTransaction.quantity` are `Int` columns representing physical containers held by a customer, a continuous bulk raw material measured in `kg` or `litres` (such as `Calcium` or `Shrink Wrap Film`) can **never** be marked **`isReturnable = true`**.

## **8.2 Shared Unit Classification Utility (`frontend/src/utils/unitFormat.js`)**

Create a small shared utility in `frontend/src/utils/unitFormat.js` (and mirror the unit check in `backend/src/controllers/item.controller.js`):

```js
// frontend/src/utils/unitFormat.js
const CONTINUOUS_UNITS = new Set([
  'kg', 'kgs', 'kilogram', 'kilograms',
  'g', 'gm', 'gram', 'grams',
  'mg', 'l', 'ltr', 'litre', 'litres', 'liter', 'liters', 'ml'
]);

export const isContinuousUnit = (unit = '') => {
  return CONTINUOUS_UNITS.has(String(unit).trim().toLowerCase());
};

export const isDiscreteUnit = (unit = '') => {
  return !isContinuousUnit(unit);
};

/**
 * Formats Raw Material quantities cleanly:
 * - Discrete units (bottle, cap, pcs): whole integers (e.g. 1,250)
 * - Continuous units (kg, litres): up to 3 decimal places without trailing zeros (e.g. 14.375 or 0.45)
 */
export const formatRawMaterialQty = (qty, unit = '') => {
  const num = Number(qty || 0);
  if (Number.isNaN(num)) return '0';
  if (isContinuousUnit(unit)) {
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    });
  }
  return Math.round(num).toLocaleString();
};
```

## **8.3 Enforcing `Int` vs. `Float` Across All 4 Raw Material Touchpoints**

| File | Current Flaw | Exact Fix to Apply |
| :---- | :---- | :---- |
| **`frontend/src/components/rawMaterials/AddEditRawMaterialModal.jsx`** | Allows any unit with any step; does not guard `isReturnable` against `kg`/`litres`. | 1\. Add unit dropdown/presets (`bottle`, `pcs`, `cap`, `roll`, `kg`, `litre`, `gram`, `pack`, `box`) or validate free text.2\. If `isContinuousUnit(formData.unit)` is true (`kg`, `litre`, `gram`), automatically uncheck and disable the **`isReturnable`** toggle with a helper note: *"Returnable customer custody assets must use a countable unit (bottle, pcs, jar, crate) — not kg or litres."*3\. Set `step={isContinuousUnit(formData.unit) ? "0.001" : "1"}` on the **Initial Stock** and **Reorder Level** inputs, and parse `Number(editingItem.cachedQty)` cleanly on edit open. |
| **`backend/src/controllers/item.controller.js`** (`createItem` & `updateItem`) | Accepts `isReturnable: true` without validating `unit` or `stock`. | If `Boolean(isReturnable)` is true and `CONTINUOUS_UNITS.has(String(unit).toLowerCase())`, return `400 Bad Request: "Returnable items must use a discrete countable unit (e.g., bottle, pcs, crate), not weight/volume (kg/litres)."` Also enforce `Math.round(Number(stock))` for discrete units while preserving `parseFloat(stock)` for continuous `kg`/`litre` units. |
| **`frontend/src/components/inventory/AddEditFinishedGoodModal.jsx`** (Line 362\) | Uses `Math.round(Number(mat.cachedQty || 0))` in the Recipe Builder `In Stock` badge, rounding `0.45 kg` to `0 kg`. | Replace `Math.round(Number(mat.cachedQty || 0)).toLocaleString()` with `formatRawMaterialQty(mat.cachedQty, mat.unit)` so `kg` raw materials display exact decimals (`0.45 kg`) and discrete units (`bottle`, `cap`) display integers (`150 bottle`). |
| **`frontend/src/components/rawMaterials/RawMaterialsTable.jsx`** | Displays `Number(item.cachedQty).toLocaleString()` directly. | Use `formatRawMaterialQty(item.cachedQty, item.unit)` and `formatRawMaterialQty(item.reorderLevel, item.unit)` for consistent display across desktop rows and mobile cards. |

---

# **9\. Dashboard Custody Widget (`BottleCustodyWidget.jsx` & `CustomerRiskHub.jsx`): One Row Per Customer \+ Direct Dashboard Retrieval**

## **9.1 The Architectural Requirement**

On the main Dashboard (`CustomerRiskHub.jsx` → `BottleCustodyWidget.jsx`):

11. **No Hardcoded "19L Bottles" Tab Label:** Rename the tab in `CustomerRiskHub.jsx` (Line 157\) from `19L Bottles` to **Returnable Custody** (and update the subtitle from `"19L Empty Bottles Held by Customers"` to `"Returnable Containers Held by Customers"`).  
12. **Strictly ONE Row Per Customer (Never Duplicate Customer Rows\!):**  
    \- If a customer holds **5 `Empty 19L Bottles`** and **2 `Empty 12L Bottles`** (total \= 7), that customer must appear as **ONE single row** in `BottleCustodyWidget.jsx` — never two separate rows\!  
    \- Inside that single customer row, the **Unreturned Containers** cell displays the total (`7 Held`) alongside compact inline per-item breakdown badges (`Empty 19L Bottles: 5` • `Empty 12L Bottles: 2`).  
13. **1-Click "Retrieve" Directly from the Dashboard Must Work End-to-End:**  
    \- Clicking **Retrieve** on a customer's row in `BottleCustodyWidget.jsx` opens `BottleAdjustmentModal.jsx` for that customer.  
    \- **Critical Discovery from Codebase Scan:** `BottleCustodyWidget.jsx` fetches `GET /api/v1/customers` (NOT `GET /api/v1/customers/:id`\!). If `returnableCustody` (`[{ itemId, name, unit, inCustody }]`) is only returned by `getCustomerDetails` (`GET /customers/:id`), then opening `BottleAdjustmentModal` from the Dashboard would not know which specific returnable items that customer holds\!

## **9.2 Backend Fix: Batch-Attach `returnableCustody` in `getCustomers` (`backend/src/controllers/customer.controller.js`)**

In `getCustomers` (`GET /api/v1/customers`), after fetching the customer list, perform **one single `groupBy` query** across `BottleTransaction` for all returned customers whose `cachedBottleBalance > 0` (zero N+1 queries\!):

```js
// Inside getCustomers (backend/src/controllers/customer.controller.js)
// 1. Fetch all returnable raw materials once
const returnableItems = await getAllReturnableRawMaterials(prisma, prefix);
const returnableMap = new Map(returnableItems.map(item => [item.id, item]));
const defaultReturnable = returnableItems[0] || null;

// 2. Find customers with positive custody balance
const customerIdsWithCustody = customers
  .filter(c => Number(c.cachedBottleBalance || 0) > 0)
  .map(c => c.id);

const custodyByCustomer = new Map();

if (customerIdsWithCustody.length > 0) {
  let txGroups = [];
  try {
    txGroups = await prisma[`${prefix}BottleTransaction`].groupBy({
      by: ['customerId', 'itemId', 'type'],
      where: { customerId: { in: customerIdsWithCustody } },
      _sum: { quantity: true }
    });
  } catch (err) {
    // P2022 fallback before itemId migration runs
    txGroups = await prisma[`${prefix}BottleTransaction`].groupBy({
      by: ['customerId', 'type'],
      where: { customerId: { in: customerIdsWithCustody } },
      _sum: { quantity: true }
    });
  }

  for (const row of txGroups) {
    const cid = row.customerId;
    const resolvedId = row.itemId || defaultReturnable?.id || 'legacy-19l';
    const itemMeta = returnableMap.get(resolvedId) || defaultReturnable || {
      id: resolvedId,
      name: 'Empty 19L Bottles',
      unit: 'bottle'
    };

    if (!custodyByCustomer.has(cid)) {
      custodyByCustomer.set(cid, new Map());
    }
    const custItemMap = custodyByCustomer.get(cid);
    if (!custItemMap.has(resolvedId)) {
      custItemMap.set(resolvedId, {
        itemId: itemMeta.id,
        name: itemMeta.name,
        unit: itemMeta.unit || 'bottle',
        issued: 0,
        returned: 0,
        inCustody: 0
      });
    }

    const entry = custItemMap.get(resolvedId);
    const qty = Number(row._sum?.quantity || 0);
    if (row.type === 'ISSUED') entry.issued += qty;
    else if (['RETURNED_GOOD', 'RETURNED_DAMAGED', 'LOST'].includes(row.type)) {
      entry.returned += qty;
    }
    entry.inCustody = Math.max(0, entry.issued - entry.returned);
  }
}

// 3. Attach returnableCustody array to each customer DTO
const enrichedCustomers = customers.map(c => {
  const itemMap = custodyByCustomer.get(c.id);
  const returnableCustody = itemMap
    ? Array.from(itemMap.values()).filter(entry => entry.inCustody > 0)
    : [];
  return {
    ...c,
    returnableCustody
  };
});
```

## **9.3 Frontend Fix: `BottleCustodyWidget.jsx` & `CustomerRiskHub.jsx`**

### **1\. `frontend/src/components/dashboard/CustomerRiskHub.jsx`**

14. **Line 132:** Update alert banner text from `19L Bottles Held` to `Returnable Containers Held`.  
15. **Line 157:** Update the tab label from `19L Bottles` to `Returnable Custody`.

### **2\. `frontend/src/components/dashboard/BottleCustodyWidget.jsx`**

16. Keep **strictly one row per customer** (`custodyCustomers.map(c => ...)` where `key={c.id}`).  
17. In the **Unreturned Containers** column (`td`), display the customer's total custody count plus inline pills for each item in `c.returnableCustody`:

```js
<td className="px-4 py-3 text-right">
  <div className="inline-flex flex-col items-end gap-1">
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${badgeColor}`}>
      {bottles} Total
    </span>
    {Array.isArray(c.returnableCustody) && c.returnableCustody.length > 0 && (
      <div className="flex flex-wrap justify-end gap-1">
        {c.returnableCustody.map(asset => (
          <span
            key={asset.itemId}
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
          >
            {asset.name}: {asset.inCustody}
          </span>
        ))}
      </div>
    )}
  </div>
</td>
```

18. When the user clicks **Retrieve** on that row:  
19. `setRetrievalCustomer(c)` passes the enriched customer object (including `c.returnableCustody`) directly into `<BottleAdjustmentModal isOpen={!!retrievalCustomer} onClose={() => setRetrievalCustomer(null)} customer={retrievalCustomer} onSuccess={fetchData} />`.  
20. Inside `BottleAdjustmentModal.jsx`:  
21. The modal populates the **Returnable Asset Selector** with `customer.returnableCustody` (or all returnable items when `type === 'ISSUED'`).  
22. When `type` is `RETURNED_GOOD`, `RETURNED_DAMAGED`, or `LOST`, it caps the maximum quantity input to **that specific selected item's `inCustody` balance** (`selectedAsset.inCustody`), preventing a user from returning 5 `Empty 12L Bottles` when the customer only holds 2 `Empty 12L Bottles` and 5 `Empty 19L Bottles`\!  
23. On submit (`POST /api/v1/bottles/transactions` with `{ customerId, itemId, type, quantity, notes }`), `bottle.controller.js` credits the exact `itemId` (`Empty 19L Bottles` or `Empty 12L Bottles`) in `Item.cachedQty` \+ `Item.factoryQty`, logs the `InventoryTransaction`, and `BottleAdjustmentModal.jsx` clears `items`, `bottles`, `customers`, `analytics`, and `admin` caches before calling `onSuccess()` (`fetchData()`), so the Dashboard's **At Plant**, **In Market**, customer row badges, and the **Raw Materials** table all update instantaneously\!