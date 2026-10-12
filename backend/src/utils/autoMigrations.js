import { prisma } from '../config/db.js';

/**
 * Ensures 0.5L and 1.5L shrink wrap films are separately registered and linked to recipes.
 * Idempotent: safe to run on every server startup.
 */
export async function ensureShrinkWrapMaterials() {
  try {
    const shrinkItems = await prisma.aquasphereItem.findMany({
      where: {
        type: 'RAW_MATERIAL',
        name: { contains: 'Shrink', mode: 'insensitive' }
      }
    });

    let item05 = shrinkItems.find(i => i.name.toLowerCase().includes('0.5'));
    let item15 = shrinkItems.find(i => i.name.toLowerCase().includes('1.5'));
    const genericShrink = shrinkItems.find(i => !i.name.toLowerCase().includes('0.5') && !i.name.toLowerCase().includes('1.5'));

    // If generic shrink wrap exists and 0.5L does not, rename generic to preserve stock history
    if (!item05 && genericShrink) {
      console.log(`[AutoMigrate] Renaming generic "${genericShrink.name}" (${genericShrink.id}) to "0.5L Shrink Wrap Film"...`);
      item05 = await prisma.aquasphereItem.update({
        where: { id: genericShrink.id },
        data: {
          name: '0.5L Shrink Wrap Film',
          unit: 'kg',
          packSize: 1,
          reorderLevel: 10,
          archivedAt: null
        }
      });
      console.log('[AutoMigrate] ✅ Successfully renamed to 0.5L Shrink Wrap Film');
    } else if (!item05) {
      console.log('[AutoMigrate] Creating "0.5L Shrink Wrap Film"...');
      item05 = await prisma.aquasphereItem.create({
        data: {
          name: '0.5L Shrink Wrap Film',
          type: 'RAW_MATERIAL',
          unit: 'kg',
          packSize: 1,
          reorderLevel: 10,
          cachedQty: 50,
          factoryQty: 50,
          warehouseQty: 0
        }
      });
      await prisma.aquasphereInventoryTransaction.create({
        data: {
          itemId: item05.id,
          quantity: 50,
          direction: 'IN',
          reason: 'INITIAL_STOCK',
          location: 'FACTORY',
          refType: 'MANUAL',
          refId: 'AUTO_SEED_05L_SHRINK'
        }
      }).catch(() => {});
      console.log('[AutoMigrate] ✅ Created 0.5L Shrink Wrap Film');
    }

    // Ensure 1.5L exists
    if (!item15) {
      console.log('[AutoMigrate] Creating "1.5L Shrink Wrap Film"...');
      item15 = await prisma.aquasphereItem.create({
        data: {
          name: '1.5L Shrink Wrap Film',
          type: 'RAW_MATERIAL',
          unit: 'kg',
          packSize: 1,
          reorderLevel: 15,
          cachedQty: 50,
          factoryQty: 50,
          warehouseQty: 0
        }
      });
      await prisma.aquasphereInventoryTransaction.create({
        data: {
          itemId: item15.id,
          quantity: 50,
          direction: 'IN',
          reason: 'INITIAL_STOCK',
          location: 'FACTORY',
          refType: 'MANUAL',
          refId: 'AUTO_SEED_15L_SHRINK'
        }
      }).catch(() => {});
      console.log('[AutoMigrate] ✅ Created 1.5L Shrink Wrap Film');
    }

    // Archive generic shrink if it exists separately
    if (genericShrink && genericShrink.id !== item05?.id && genericShrink.id !== item15?.id && !genericShrink.archivedAt) {
      console.log(`[AutoMigrate] Archiving redundant "${genericShrink.name}"...`);
      await prisma.aquasphereItem.update({
        where: { id: genericShrink.id },
        data: { archivedAt: new Date() }
      });
    }

    // Ensure all finished goods recipes are correctly linked
    const rawMaterials = await prisma.aquasphereItem.findMany({
      where: { type: 'RAW_MATERIAL', archivedAt: null }
    });
    const finishedGoods = await prisma.aquasphereItem.findMany({
      where: { type: 'FINISHED_GOOD', archivedAt: null }
    });

    const findRm = (terms) => rawMaterials.find(r => terms.every(t => r.name.toLowerCase().includes(t.toLowerCase())));

    const rm05Shrink = item05;
    const rm15Shrink = item15;
    const rmSmallCaps = findRm(['small', 'cap']);
    const rmBigCaps = findRm(['19l', 'cap']) || findRm(['large', 'cap']);
    const rm05Bottle = findRm(['0.5', 'bottle']) || findRm(['500', 'bottle']);
    const rm15Bottle = findRm(['1.5', 'bottle']) || findRm(['1500', 'bottle']);
    const rm19Bottle = findRm(['19', 'bottle']);
    const rm05Label = findRm(['0.5', 'label']) || findRm(['500', 'label']);
    const rm15Label = findRm(['1.5', 'label']) || findRm(['1500', 'label']);
    const rmCalcium = findRm(['calcium']) || findRm(['ca']);
    const rmMagnesium = findRm(['magnesium']) || findRm(['mg']);
    const rmSodium = findRm(['sodium']) || findRm(['na']);

    const upsertRecipe = async (fgId, rmId, qty) => {
      if (!fgId || !rmId) return;
      const existing = await prisma.aquasphereRecipeItem.findFirst({
        where: { finishedGoodId: fgId, rawMaterialId: rmId }
      });
      if (existing) {
        await prisma.aquasphereRecipeItem.update({
          where: { id: existing.id },
          data: { quantityPerUnit: qty }
        });
      } else {
        await prisma.aquasphereRecipeItem.create({
          data: { finishedGoodId: fgId, rawMaterialId: rmId, quantityPerUnit: qty }
        });
      }
    };

    for (const fg of finishedGoods) {
      const fgNameLower = fg.name.toLowerCase();

      // 0.5L PET Pack
      if (fgNameLower.includes('0.5') || fgNameLower.includes('500')) {
        // Clean up wrong shrink wrap references
        if (genericShrink && genericShrink.id !== rm05Shrink?.id) {
          await prisma.aquasphereRecipeItem.deleteMany({
            where: { finishedGoodId: fg.id, rawMaterialId: genericShrink.id }
          });
        }
        if (rm15Shrink) {
          await prisma.aquasphereRecipeItem.deleteMany({
            where: { finishedGoodId: fg.id, rawMaterialId: rm15Shrink.id }
          });
        }

        // Apply full 0.5L formula
        if (rm05Shrink) await upsertRecipe(fg.id, rm05Shrink.id, 0.02273); // 44 packs / kg
        if (rmSmallCaps) await upsertRecipe(fg.id, rmSmallCaps.id, 12);     // 12 caps / pack
        if (rm05Bottle) await upsertRecipe(fg.id, rm05Bottle.id, 12);       // 12 bottles / pack
        if (rm05Label) await upsertRecipe(fg.id, rm05Label.id, 0.00672);    // 6.72g / pack
        if (rmCalcium) await upsertRecipe(fg.id, rmCalcium.id, 0.00118884);
        if (rmMagnesium) await upsertRecipe(fg.id, rmMagnesium.id, 0.00059436);
        if (rmSodium) await upsertRecipe(fg.id, rmSodium.id, 0.00029724);
      } 
      // 1.5L PET Pack
      else if (fgNameLower.includes('1.5') || fgNameLower.includes('1500')) {
        // Clean up wrong shrink wrap references
        if (genericShrink && genericShrink.id !== rm15Shrink?.id) {
          await prisma.aquasphereRecipeItem.deleteMany({
            where: { finishedGoodId: fg.id, rawMaterialId: genericShrink.id }
          });
        }
        if (rm05Shrink) {
          await prisma.aquasphereRecipeItem.deleteMany({
            where: { finishedGoodId: fg.id, rawMaterialId: rm05Shrink.id }
          });
        }

        // Apply full 1.5L formula
        if (rm15Shrink) await upsertRecipe(fg.id, rm15Shrink.id, 0.02500); // 40 packs / kg
        if (rmSmallCaps) await upsertRecipe(fg.id, rmSmallCaps.id, 6);      // 6 caps / pack
        if (rm15Bottle) await upsertRecipe(fg.id, rm15Bottle.id, 6);        // 6 bottles / pack
        if (rm15Label) await upsertRecipe(fg.id, rm15Label.id, 0.00780);    // 7.80g / pack
        if (rmCalcium) await upsertRecipe(fg.id, rmCalcium.id, 0.001585);
        if (rmMagnesium) await upsertRecipe(fg.id, rmMagnesium.id, 0.000793);
        if (rmSodium) await upsertRecipe(fg.id, rmSodium.id, 0.000396);
      }
      // 19L Refill Bottle
      else if (fgNameLower.includes('19')) {
        if (rm19Bottle) await upsertRecipe(fg.id, rm19Bottle.id, 1);
        if (rmBigCaps) await upsertRecipe(fg.id, rmBigCaps.id, 1);
        if (rmCalcium) await upsertRecipe(fg.id, rmCalcium.id, 0.003170);
        if (rmMagnesium) await upsertRecipe(fg.id, rmMagnesium.id, 0.001585);
        if (rmSodium) await upsertRecipe(fg.id, rmSodium.id, 0.000793);
      }
    }

    // Verify Wadaana Preform Recipes
    try {
      const wadaanaRMs = await prisma.wadaanaItem.findMany({
        where: { type: 'RAW_MATERIAL', archivedAt: null }
      });
      const wadaanaFGs = await prisma.wadaanaItem.findMany({
        where: { type: 'FINISHED_GOOD', archivedAt: null }
      });

      const findWadaanaRm = (terms) => wadaanaRMs.find(r => terms.every(t => r.name.toLowerCase().includes(t.toLowerCase())));

      const wadaanaBOM = [
        { fgMatch: ['aquasphere', '0.5'], rmMatch: ['pure', '0.5'], qty: 0.015 },
        { fgMatch: ['aquasphere', '1.5'], rmMatch: ['pure', '1.5'], qty: 0.030 },
        { fgMatch: ['dasani', '0.5'], rmMatch: ['mix', '0.5'], qty: 0.013 },
        { fgMatch: ['dasani', '1.5'], rmMatch: ['mix', '1.5'], qty: 0.027 },
        { fgMatch: ['pivrifine', '0.5'], rmMatch: ['pure', '0.5', 'white'], qty: 0.015 },
        { fgMatch: ['pivrifine', '1.5'], rmMatch: ['pure', '1.5', 'white'], qty: 0.030 }
      ];

      for (const mapping of wadaanaBOM) {
        const fg = wadaanaFGs.find(f => mapping.fgMatch.every(t => f.name.toLowerCase().includes(t.toLowerCase())));
        const rm = findWadaanaRm(mapping.rmMatch) || findWadaanaRm(mapping.rmMatch.slice(0, 2));
        if (fg && rm) {
          const existing = await prisma.wadaanaRecipeItem.findFirst({
            where: { finishedGoodId: fg.id, rawMaterialId: rm.id }
          });
          if (existing) {
            await prisma.wadaanaRecipeItem.update({
              where: { id: existing.id },
              data: { quantityPerUnit: mapping.qty }
            });
          } else {
            await prisma.wadaanaRecipeItem.create({
              data: { finishedGoodId: fg.id, rawMaterialId: rm.id, quantityPerUnit: mapping.qty }
            });
          }
        }
      }
    } catch (_wErr) {
      // Non-fatal if Wadaana items table is unseeded
    }

    console.log('[AutoMigrate] ✅ All production BOM formulas (shrink wrap, caps, bottles, labels, minerals, preforms) verified.');
  } catch (err) {
    console.error('[AutoMigrate] Error verifying production BOM recipes:', err);
  }
}
