/**
 * Dynamic Returnable Container & Custody Inventory Service
 * Supports 1 or N returnable raw materials (e.g., Empty 19L Bottles, Empty 12L Bottles, Crates)
 * linked to Finished Goods through RecipeItem (BOM).
 */

/**
 * Retrieves all active returnable raw materials for a tenant.
 */
export async function getAllReturnableRawMaterials(tx, prefix) {
  return await tx[`${prefix}Item`].findMany({
    where: { type: 'RAW_MATERIAL', isReturnable: true, archivedAt: null },
    orderBy: { createdAt: 'asc' }
  });
}

/**
 * Resolves a specific returnable raw material item by ID, via a finished good's BOM recipe,
 * or finds the primary returnable raw material.
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
 * Returns Array<{ rawMaterialId, rawMaterialName, unit, quantityIssued }>
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
          const prev = byRawMaterial.get(rm.id) || {
            rawMaterialId: rm.id,
            rawMaterialName: rm.name,
            unit: rm.unit || 'bottle',
            quantityIssued: 0
          };
          prev.quantityIssued += issued;
          byRawMaterial.set(rm.id, prev);
        }
      }
    } else if ((line.item?.name || line.name || '').toLowerCase().includes('19l')) {
      // Fallback if 19L Refill recipe wasn't linked yet
      const fallbackRm = await resolveReturnableRawMaterial(tx, prefix, { finishedGoodId: line.itemId });
      if (fallbackRm) {
        const prev = byRawMaterial.get(fallbackRm.id) || {
          rawMaterialId: fallbackRm.id,
          rawMaterialName: fallbackRm.name,
          unit: fallbackRm.unit || 'bottle',
          quantityIssued: 0
        };
        prev.quantityIssued += Math.round(lineQty);
        byRawMaterial.set(fallbackRm.id, prev);
      }
    }
  }

  return Array.from(byRawMaterial.values());
}

/**
 * Credits returned good empty containers back to Factory Raw Material stock and logs InventoryTransaction.
 * Adheres to Single-Location Raw Materials Law (cachedQty === factoryQty).
 */
export async function creditEmptyBottlesToFactory(tx, prefix, {
  quantity,
  rawMaterialId = null,
  finishedGoodId = null,
  customerId = null,
  orderId = null,
  reason = 'BOTTLE_RETRIEVAL'
}) {
  const qty = Math.round(Number(quantity || 0));
  if (qty <= 0) return null;

  const item = await resolveReturnableRawMaterial(tx, prefix, { rawMaterialId, finishedGoodId });
  if (!item) {
    console.warn(`[bottleInventory] Could not find returnable raw material item for tenant ${prefix}`);
    return null;
  }

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
export async function debitEmptyBottlesFromFactory(tx, prefix, {
  quantity,
  rawMaterialId = null,
  finishedGoodId = null,
  customerId = null,
  orderId = null,
  reason = 'BOTTLE_RETRIEVAL_REVERSAL',
  skipTransactionLog = false
}) {
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
    getAllReturnableRawMaterials(tx, prefix),
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
      map.set(targetId, {
        itemId: targetId,
        name: targetName,
        unit: 'bottle',
        delivered: 0,
        returnedGood: 0,
        returnedBroken: 0,
        lost: 0,
        inCustody: 0
      });
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

  const list = Array.from(map.values()).map(e => {
    const custody = Math.max(0, e.inCustody);
    return { ...e, inCustody: custody, balance: custody };
  });
  const sumCustody = list.reduce((s, e) => s + e.inCustody, 0);

  // If customer had an opening cachedBottleBalance without transactions, attribute remainder to primary returnable item
  if (fallbackTotalBalance > sumCustody && list.length > 0) {
    const diff = fallbackTotalBalance - sumCustody;
    list[0].inCustody += diff;
    list[0].balance += diff;
  }

  return list;
}
