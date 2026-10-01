---
name: aquasphere-erp-guardrails
description: Core architectural standards and anti-corruption rules for AquaSphere OS & Wadaana ERP. Covers Dokploy deployment flags, base unit inventory mathematics, pack trading scopes, single-location raw material tracking, and financial payment decoupling.
---

# AquaSphere & Wadaana ERP Architectural Guardrails

## 1. Automated Dokploy & Container Deployment
- Whenever editing `backend/Dockerfile` or deployment entrypoints, `npx prisma db push` MUST include the `--accept-data-loss` flag:
  ```dockerfile
  CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node src/index.js"]
  ```
- Dokploy deployments are non-interactive. Omitting `--accept-data-loss` causes Prisma to wait for confirmation or crash with exit code 1.

## 2. Base Unit Storage Law
- Database items are stored strictly in physical base units:
  - Bottles / Finished Goods: `unit = 'bottle'`
  - Resin / Preforms / Minerals / Film / Labels: `unit = 'kg'`
  - Caps: `unit = 'cap'`
- Never create separate DB items for "Packs" vs "Loose Bottles".
- `packSize` (e.g., 12 for 0.5L PET, 6 for 1.5L PET, 1 for 19L) is an integer multiplier used exclusively in UI rendering and cart calculations:
  - $\text{Full Packs} = \lfloor \frac{\text{cachedQty}}{\text{packSize}} \rfloor$
  - $\text{Loose Bottles} = \text{cachedQty} \pmod{\text{packSize}}$

## 3. Trading Scope Rules
- **Walk-in Counter Sales**: Dual controls enabled. Cashier can sell full packs (at pack rate) and single loose bottles (at bottle rate), with inline rate editing.
- **Customer Delivery Orders**: Strictly full packs / PETs only. Loose single bottles are strictly prohibited from delivery orders. Line items support inline contract rate overrides.

## 4. Single-Location Raw Materials
- Raw materials (bottles, caps, labels, shrink film, minerals) exist exclusively at the factory plant (`cachedQty`). Do not split into warehouse quantities.
- Only finished goods have Factory and Warehouse stock splits ($\text{Total} = \text{factoryQty} + \text{warehouseQty}$).

## 5. Payment vs. Physical Delivery Decoupling
- Never mix payment status with delivery status.
- Dedicated endpoint `POST /orders/:id/payment` records payments and updates debt ledgers without modifying `deliveryStatus` or decrementing inventory stock.
- Physical stock decrement occurs solely in `POST /orders/:id/deliver` when the driver actually dispatches the order.

## 6. React Compiler / ESLint Lint Rules (Hard Lessons)
These rules caused failed builds during the `feat/erp-unified-upgrade` session and must be respected:

- **No `ref.current = x` during render**: Always update refs inside `useEffect`, never directly in render:
  ```jsx
  // ✅ CORRECT
  useEffect(() => { cbRef.current = cb; }, [cb]);
  // ❌ WRONG — triggers React Compiler violation
  cbRef.current = cb; // in render body
  ```
- **No `Date.now()` during render**: Wrap in `useState` initializer:
  ```jsx
  // ✅ CORRECT
  const [nowTime] = useState(() => Date.now());
  // ❌ WRONG
  const nowTime = Date.now(); // in render body
  ```
- **Hooks before early returns**: Always call `usePagination`, `useLiveEvent`, and other hooks BEFORE any `if (...) return null` guards:
  ```jsx
  // ✅ CORRECT
  const pagination = usePagination(items, 50);
  if (!items.length) return null; // guard after hooks
  // ❌ WRONG
  if (!items.length) return null; // guard before hooks
  const pagination = usePagination(items, 50);
  ```
- **`no-useless-assignment`**: Don't initialize a variable to a default that is always immediately reassigned:
  ```jsx
  // ✅ CORRECT
  let x;
  if (cond) x = 'a'; else x = 'b';
  // ❌ WRONG
  let x = 'default';
  if (cond) x = 'a'; // 'default' is never used
  ```

## 7. Global SSE Architecture Pattern
- Single `EventSource` per tenant at application root (`SSEProvider` in `App.jsx`).
- Endpoint: `GET /api/v1/events/stream?tenant=X` — heartbeat ping every 25s, no separate per-page streams.
- `useLiveEvent(eventType | eventType[], callback)` — stable callback via `cbRef` updated in `useEffect`.
- Backend controllers emit events after successful DB writes using `broadcastEvent(tenantPrefix, 'EVENT_TYPE', data)`.
- Standard event names: `ORDER_UPDATED`, `INVENTORY_CHANGED`, `PRODUCTION_UPDATED`, `CUSTOMER_UPDATED`, `EXPENSE_LOGGED`, `COUNTER_SALE_CREATED`, `DAILY_CLOSE_CHANGED`, `PURCHASE_CREATED`, `VEHICLE_UPDATED`.

## 8. Multi-Subagent Coordination Rules
Lessons from the erp-unified-upgrade session with DeepCoder subagents:

- **Assign strict file territories**: Backend subagent owns `backend/` exclusively; frontend subagent owns `frontend/` exclusively. Never let two subagents touch the same file.
- **Gemini credit exhaustion**: When Gemini credits die mid-session, DeepCoder subagents stall silently. Kill them (`manage_subagents kill`) and continue work directly in the parent agent on Claude.
- **Verify with build+lint**: Always confirm with `pnpm run lint` (backend, exit 0) and `pnpm run build` (frontend, exit 0) before committing. Do not assume subagent output is lint-clean.
- **Commit only after verification**: Run both lint and build, fix any issues, then commit. Do not commit stale or partial state from stalled subagents.

## 9. Seed Script Protocol
- `node backend/scripts/seed-production-bom.js --wipe` must be run after schema changes.
- The `--wipe` flag deletes all transactional and master entity data (preserving only User accounts) and re-seeds clean catalogs.
- Always verify the script exits with `✅ SEED COMPLETED SUCCESSFULLY` before proceeding.
- Prisma schema changes require `npx prisma db push --accept-data-loss` first.

