# DISPATCH — Explorer Survey DB

## Identity
- Archetype: teamwork_preview_explorer
- Role: Database & Schema Explorer
- Working directory: /home/ehtisham/Desktop/AquaSphere/.agents/explorer_survey_db

## Task & Objective
Survey the database layer and seed scripts for AquaSphere and Wadaana:
1. Read `/home/ehtisham/Desktop/AquaSphere/ORIGINAL_REQUEST.md` and `/home/ehtisham/Desktop/AquaSphere/implementation_plan.md`.
2. Inspect `/home/ehtisham/Desktop/AquaSphere/backend/prisma/schema.prisma`:
   - Inspect `AquasphereItem`, `WadaanaItem`, `AquasphereRecipeItem`, `WadaanaRecipeItem`, `AquasphereProductionBatch`, `WadaanaProductionBatch`, `AquasphereInventoryTransaction`, etc.
   - Verify existing relations (`recipeFinishedGoods`, `recipeRawMaterials`, `outputItemId`, etc.).
   - Check nullability and defaults of legacy columns (`packs05L`, `packs15L`, `qtyPure05L`, etc.).
3. Inspect `/home/ehtisham/Desktop/AquaSphere/backend/scripts/seed-full-bom.js` and other seed files in `backend/prisma/seed.js` or `backend/scripts/`.
   - See how standard recipes and items are seeded.
   - Determine what needs updating or creating to ensure full BOM recipes are seeded for AquaSphere & Wadaana.
4. Document all findings, schema constraints, and clear recommendations in `/home/ehtisham/Desktop/AquaSphere/.agents/explorer_survey_db/handoff.md`.

## 2026-09-03T14:33:38Z
You are the Database & Schema Explorer.
Your working directory is: /home/ehtisham/Desktop/AquaSphere/.agents/explorer_survey_db
Read your task instructions at: /home/ehtisham/Desktop/AquaSphere/.agents/explorer_survey_db/DISPATCH.md
Also read:
- /home/ehtisham/Desktop/AquaSphere/ORIGINAL_REQUEST.md
- /home/ehtisham/Desktop/AquaSphere/implementation_plan.md

Investigate:
1. `backend/prisma/schema.prisma` (relations, outputItemId, recipe_items, legacy columns).
2. Existing seed scripts (`backend/scripts/seed-full-bom.js`, `backend/prisma/seed.js`, etc.).

Write your comprehensive findings and recommendations to `/home/ehtisham/Desktop/AquaSphere/.agents/explorer_survey_db/handoff.md` and report back when finished.

