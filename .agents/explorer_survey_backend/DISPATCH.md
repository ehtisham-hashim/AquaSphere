# DISPATCH — Explorer Survey Backend

## Identity
- Archetype: teamwork_preview_explorer
- Role: Backend Logic & API Explorer
- Working directory: /home/ehtisham/Desktop/AquaSphere/.agents/explorer_survey_backend

## Task & Objective
Survey the backend layer (production formulas, items controller, production controller, and routes):
1. Read `/home/ehtisham/Desktop/AquaSphere/ORIGINAL_REQUEST.md` and `/home/ehtisham/Desktop/AquaSphere/implementation_plan.md`.
2. Inspect `backend/src/utils/productionFormulas.js`:
   - Understand how `calculateProductionBatch` currently works.
   - Analyze how to transform it into a dynamic recipe-driven calculator while maintaining 100% backward compatibility for legacy batches (`packs05L`, `packs15L`, mineral sets).
3. Inspect `backend/src/controllers/item.controller.js` and routes:
   - Check `createItem`, `updateItem`, `getItems`, and recipe associations (`recipe_items`).
   - Check transaction safety, validation of `type` ('RAW_MATERIAL' vs 'FINISHED_GOOD'), recipe payload validation (`[{ rawMaterialId, quantityPerUnit }]`).
4. Inspect `backend/src/controllers/production.controller.js`:
   - Check `createProductionBatch` and `completeProductionBatch`.
   - Trace the exact inventory deductions (`production_batch_consumptions`, `IN` transaction for finished goods, incrementing `factoryQty`).
5. Check backend linting/test setup (`package.json`, `pnpm run lint`).
6. Document findings, potential edge cases, backward compatibility risks, and recommendations in `/home/ehtisham/Desktop/AquaSphere/.agents/explorer_survey_backend/handoff.md`.
