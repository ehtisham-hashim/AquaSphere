# AQUA Sphere OS — Development & Feature Priority Plan

> **Compiled from:** `prototype_system_documentation.md`, `AQUA_Sphere_OS_Master_Requirements.md`, `Goal_Requirements.md`, `architecture.md`, `project-requirements.md`, `phases.md`, `rules.md`, `optimization.md`, `design.md`
> **Purpose:** Complete per-role feature breakdown for both Aquasphere and Wadaana Industries, with build sequencing, dependencies, and exit criteria. This is the single source of truth for what gets built when and for whom.
> **Status:** v3 — Comprehensive rebuild covering all 5 roles across both divisions, aligned with completed Phase 0 (Auth) and Phase 1 (Owner Setup + Dashboard Shell)
> **Last Updated:** 2026-07-23

---

## Table of Contents

1. [What Changed in This Update](#1-what-changed-in-this-update)
2. [Guiding Build Principles](#2-guiding-build-principles)
3. [High-Level Phase Roadmap](#3-high-level-phase-roadmap)
4. [Role-Based Access Control — Full Permission Matrix](#4-role-based-access-control--full-permission-matrix)
5. [Core System Rules](#5-core-system-rules)
6. [Financial System Detail](#6-financial-system-detail)
7. [Reports Catalog](#7-reports-catalog)
8. [Per-Side Feature Priority — Full Breakdown](#8-per-side-feature-priority--full-breakdown)
   - [Owner](#owner)
   - [Admin](#admin)
   - [Production Manager](#production-manager)
   - [Marketing Manager](#marketing-manager)
   - [Accountant](#accountant)
9. [Aquasphere vs Wadaana Sequencing](#9-aquasphere-vs-wadaana-sequencing)
10. [Cross-Role Dependency Chain](#10-cross-role-dependency-chain)
11. [Open Items That Will Block Specific Phases](#11-open-items-that-will-block-specific-phases)
12. [Definition of Done per Phase](#12-definition-of-done-per-phase)
13. [Completed Work Log](#13-completed-work-log)

---

## 1. What Changed in This Update

This v3 rebuild was produced after a comprehensive review of all project documents to ensure every requirement, rule, and architectural decision is reflected in the build plan. Key changes from v2:

| Change | Reason |
|---|---|
| **Complete per-role breakdown for all 5 roles** | Previous version had gaps in Admin and PM feature lists; now every role has exhaustive feature coverage |
| **Wadaana Industries explicitly mapped** | Previous version deferred Wadaana to Phase 9; now current Wadaana (mirror clone) is tracked alongside Aquasphere in every phase, with future B2B features flagged |
| **Dual independent status tracks documented** | Order status model (delivery vs payment) was under-documented; now fully specified with real-world examples |
| **Bottle Ledger reconciliation equation enforced** | The 5-variable equation is now a build-time assertion, not just a design note |
| **Credit limit `0 = unlimited` rule** | Added as a hardcoded business rule to prevent misimplementation |
| **Expense photo mandate** | Every expense entry MUST have a receipt photo — text-only is disallowed |
| **Vendor-must-exist-first rule** | No inline vendor creation in purchase forms — enforced at API level |
| **Daily close lock mechanics** | Full mechanics specified: who can trigger, what it locks, Owner override, audit trail |
| **Mineral precision mandate** | Exact decimal fractions, no rounding at transaction time — specified as a testable exit criterion |
| **Soft-block vs hard-block distinction** | Every limit check returns `warning` payload with `200`, never a 4xx error |
| **Completed work log updated** | Phase 0 (Auth) and Phase 1 (Owner Setup + Dashboard Shell) marked complete with specific deliverables |

---

## 2. Guiding Build Principles

Three rules decide the *order*, not just the *list*:

1. **Follow the money's real path, not role importance.**
   Money/stock actually flows: `Vendor → Purchase → Raw Material → Production → Finished Goods → Order → Delivery → Payment → Daily Close → Reports`.
   Every "downstream" module is meaningless without the "upstream" one feeding it. Build **in data-flow order**, even though Marketing Manager (Order Desk) is the most business-critical *daily* screen.

2. **Build once on Aquasphere, clone to Wadaana.**
   The schema is a 1:1 prefixed mirror (`Aquasphere*` / `Wadaana*` from the same `__Prefix__` template in `base-models.prisma`), and the master doc confirms Wadaana currently **operates identically** to Aquasphere. Build every module fully on Aquasphere first, verify it, then stamp it out for Wadaana. Do **not** build both in parallel — that doubles bugs before either is proven.

3. **Foundation is Phase 0, invisible to all 5 sides, but blocks everyone.**
   Auth, roles, company-context switching, and the "no manual inventory edits — everything derived from transactions" engine are prerequisites for literally every screen. Nobody gets a feature before this exists.

---

## 3. High-Level Phase Roadmap

| Phase | Name | Primary Side(s) | Depends On | Key Deliverables |
|---|---|---|---|---|
| **0** | Foundation | *(none — infra)* | — | Auth + JWT sessions, 5 roles enum, permission-matrix middleware (§4), company-context routing (`aquasphere` vs `wadaana`), base navigation shell, transaction-derived inventory engine (no editable stock fields), daily-close lock table (schema only), audit-log table (schema only) |
| **1** | Owner Setup Tools | **Owner** | Phase 0 | User management, item/catalog seeding, reorder-level config, Owner dashboard skeleton, Wadaana context shell |
| **2** | Purchasing & Vendors | **Accountant** (primary), Owner (oversight) | Phase 1 | Vendor CRUD, "vendor must exist first" rule, Purchase entry (mandatory bill photo), auto-increment raw material stock + vendor payable, Vendor Payment recording (§6.1) |
| **3** | Production | **Production Manager** | Phase 2 | Production batch entry, automatic deductions (exact decimal fractions), broken-bottle logging, finished-goods stock increase, PM dashboard |
| **4** | CRM & Orders | **Marketing Manager** | Phase 1 + Phase 3 | Customer CRUD (no hard delete, §5.7), search-only lookup, "add customer inline," 19L order + PET order as separate types, dual independent status tracks (§5.2), soft-block credit-limit warnings |
| **5** | Deliveries & Bottle Ledger | **Marketing Manager** (entry) | Phase 4 | Delivery completion forms, partial-delivery support, bottle return validation (soft-block), full 19L Bottle Asset Ledger with all 6 transaction types (§5.3), auto-updates to customer balance, inventory, cash |
| **6** | Financial Entry (remainder) | **Accountant** | Phase 5 | Expense entry (categorized, photo mandatory), Counter/spot sales, cash collection reports, invoice generation, customer payment recording (§6.2) |
| **7** | Admin Verification Layer | **Admin** | Phases 3–6 | View-only dashboards, Daily Closing verification + lock (§5.5), WhatsApp/portal cross-check step, audit trail visibility |
| **8** | Owner Deep Analytics | **Owner** | Phase 7 | Full profit/margin reports, all 8 report types (§7), daily-close override, bottle ledger reconciliation reports, credit-breach alert automation, inactivity alerts |
| **9** | Wadaana Mirror Rollout | **All 5 sides** (cloned) | Phases 1–8 stable | Stamp out identical modules into `Wadaana*` schema/DB, separate auth/users per division, separate branding (purple header) |
| **10** | Cross-Cutting Polish | *(all sides)* | Phase 9 | Google Maps integration, mobile-first pass, order-entry speed tuning (<20s target), photo upload hardening, dark mode polish |
| **11** | Deferred / Future Scope | — | Everything above | Wadaana specialized B2B blowing logic (Pure/Mix preform, Factory→Warehouse, per-company orders for Deosani/Pivrifine), **driver route assignment** (explicitly listed as future-phase in master doc), public website management module, possible 4th "Super Admin" tier (pending confirmation) |

---

## 4. Role-Based Access Control — Full Permission Matrix

Single reference table every phase's access control gets built against. Comes directly from the master spec — if a screen's permissions ever seem unclear, this table is the source of truth.

| Role | Access Level | Can See | Can Edit | Cannot See / Cannot Do |
|---|---|---|---|---|
| **Owner** (Super Admin) | Full System Admin | Everything, both divisions | All data, passwords, credit limits, logged inventory corrections, website settings | Nothing restricted |
| **Admin** | Supervisor (View-Only) | Inventory, daily production, daily orders, customer alerts | Only the end-of-day "Close Day" action | Profit, cost figures — cannot place orders, cannot edit any transaction |
| **Production Manager** | Operational Input | Inventory (minerals, caps, bottles, labels, shrink wrap, PETs) | Daily production counts, broken-bottle logs | Financials, sales, customer records |
| **Accountant** | Financial Auditor | Customers, expenses, cash collections | Expenses (with receipt photo), spot sales, cash reports | Cannot directly adjust inventory |
| **Marketing Manager** | Operational Sales | Customer profiles, orders, inventory levels | Orders, delivery status, prices, payment methods, new customers | Cannot delete customers, cannot see profit margins |

### 4.1 Powers That Belong to Owner Alone
- Delete customer records (the *only* role permitted to hard-delete anything — see §5.7)
- Manually override inventory counts, always as a logged adjustment with a reason, never a silent edit
- Modify any user's password
- Update website content/parameters
- Edit customer credit limits
- Reopen a day that Admin has already locked (§5.5 override)
- View and correct which inventory items a given purchase was mapped to
- View profit/margin figures (hidden from all other roles)

### 4.2 What This Means for Build Order
Permission enforcement isn't a single feature to build once — it has to be checked at **every** phase where a new screen appears, because the wrong default (e.g., an MM screen accidentally showing profit margin) is a real data leak, not just a UI bug. Each phase's "Definition of Done" (§12) includes a specific permission check for that phase's screens.

---

## 5. Core System Rules — Data Integrity, Ledgers & Locking

These rules are not features with their own phase — they're constraints baked into *every* phase from Phase 0 onward.

### 5.1 No-Manual-Edit Inventory Rule
No inventory quantity is ever directly typed in and saved. Every stock number — raw material, finished goods, bottle balances — is **calculated live from the full history of transactions** (purchases, production batches, deliveries, returns). This is the system's single most important architectural rule, and it's why the phase order in §3 matters so much: a screen that displays or edits a calculated number is worthless until the transactions that feed the calculation actually exist.

### 5.2 Order Status — Two Independent Tracks, Not One Pipeline
Unlike a typical e-commerce "pending → confirmed → delivered → cancelled" flow, this system tracks **delivery status and payment status separately, and each is recomputed by summing all related records**, not stored as a single flag:

```
DELIVERY STATUS              PAYMENT STATUS
───────────────              ──────────────
pending  ──────┐           unpaid  ──────┐
     │         │                │         │
     ▼         │                ▼         │
partial  ──────┤           partial ──────┤
     │         │                │         │
     ▼         │                ▼         │
delivered ◄────┘           paid    ◄────┘
```

**Why:** A distributor can be fully delivered today and still pay off the balance in installments over the following weeks — collapsing this into one linear status would make that impossible to represent accurately. A single order can also have **more than one delivery record** over time (partial deliveries), and both statuses are always the *sum* of those records, never a single stored value that could drift out of sync.

There is intentionally no "cancelled" state defined in the spec — if this is needed operationally, it's an open question to raise with the client before Phase 4, not something to assume.

### 5.3 19L Bottle Asset Ledger (Full Detail)
Bottles are **not** ordinary consumable inventory — they're treated as a durable, reusable asset with their own ledger, separate from the raw-material/finished-goods inventory engine.

**The reconciliation equation that must always hold true:**
```
Total Owned = At Factory + With Customers + Broken + Lost
```
- Lost bottles are subtracted from Total Owned (a deliberate write-off, never inferred automatically just because a bottle "wasn't returned")
- Every return is split explicitly into Good Returns vs Broken Returns at the point of entry

**The 6 transaction types that can move the ledger:**

| Transaction Type | Description | Effect |
|---|---|---|
| `delivered_to_customer` | 19L bottle delivered filled | −Factory, +Customer |
| `returned_good` | Empty bottle returned, reusable | +Factory, −Customer |
| `returned_broken` | Empty bottle returned, damaged | +Broken, −Customer |
| `lost` | Bottle written off as lost | −Total Owned |
| `purchased_new` | New bottles bought to grow the fleet | +Total Owned, +Factory |
| `factory_adjustment` | Manual correction — **Owner only** | Logged with mandatory reason |

New bottle purchases (growing the fleet) are recorded **in this ledger**, not as a regular raw-material purchase — buying 50 new 19L bottles is a capital-asset transaction, not a consumable restock.

**Where this lives in the build order:** Phase 5, immediately after Order/Delivery entry exists (Phase 4), because every ledger transaction type above is triggered by a delivery or return event.

### 5.4 Credit & Bottle Soft-Block Philosophy (System-Wide Rule)
This one rule governs *every* limit in the system, not just credit:
```
WHEN AN ACTION WOULD EXCEED A LIMIT:
 • Show a clear warning
 • Require explicit confirmation to proceed
 • NEVER hard-block the operator
```
Applies to: credit limit exceeded, bottle return exceeding a customer's known balance, and raw material stock going below zero (operations sometimes log after the fact). One special case: a credit limit of exactly `0` means **unlimited**, not "block everything" — an easy rule to get backwards if built without reading this.

### 5.5 Daily Closing Lock — Full Mechanics
- **Who can trigger it:** Admin, after a manual checklist (stock counts look right, production counts look right, orders cross-checked against WhatsApp/portal reports from the field).
- **What it does:** Locks every transaction dated that day, for every role — no backdated edits, no new entries into a closed date.
- **The one exception:** Owner can reopen a locked day to fix a genuine mistake — but that reopening itself is a logged action, not a silent unlock.
- **Role visibility during closing:** Everyone else (PM, MM, Accountant) has **view-only** access to the day's closing summary; only Admin can actually click "Close."
- **Build dependency:** This can only be meaningfully built once Phases 3–6 exist, since there's nothing to verify or lock before then — the "button" can exist earlier as a stub, but its *enforcement* logic waits for Phase 7.

### 5.6 Audit Trail / Immutable Records
Named requirement from the prototype documentation's Security Features section:
- **Activity logging** — a record of what each user did and when
- **Immutable transaction history** — once a purchase, order, delivery, or expense is recorded, the record itself is never overwritten; corrections are new logged entries, not edits to the original
- **Change tracking** — any adjustment (like Owner's manual inventory correction, or a reopened daily close) gets its own timestamped log entry showing what changed and who changed it

**Where this belongs in the build order:** The audit-log table itself should exist from Phase 0 (schema only), since every phase from Phase 2 onward (purchases, production, orders, closings) needs to write to it. But the *screen* to browse/search the audit trail is a Phase 8 feature (Owner-level oversight tool) — there's no point building a browsing UI before there's meaningful history to browse.

### 5.7 Soft-Delete Philosophy — Nothing Is Hard-Deleted Except by Owner
Consistent with the immutability rule above: the system doesn't let operational roles permanently erase records.
- **Customers:** Can never be deleted by Admin, Marketing Manager, Production Manager, or Accountant — only **Owner** can delete a customer record, and even then it should be treated as an exceptional, logged action rather than routine cleanup.
- **Transactions (purchases, orders, deliveries, expenses):** Never deleted at all, by anyone, including Owner. Mistakes are corrected with a new, logged counter-entry — this is what makes the audit trail (§5.6) trustworthy.
- **Users:** Deactivated, not deleted, when someone leaves the company — their historical actions (orders they entered, deliveries they logged) must remain attributable.

---

## 6. Financial System Detail

### 6.1 Vendor-Side Ledger (Purchase → Payment Linking)
- A **Purchase** increases raw material stock *and* increases that vendor's outstanding payable, in the same transaction (§5.1 rule: it's calculated, not hand-typed).
- A **Vendor Payment** is a **separate, later transaction** that reduces the payable. Purchases are never assumed "paid in full" just because they were recorded — the system explicitly tracks the gap between what's been bought and what's been paid.
- This mirrors the customer side exactly (§6.2) — same pattern, same logic, applied to the two directions money moves.

### 6.2 Customer-Side Ledger (Order → Delivery → Payment Linking)
- Placing an **Order** doesn't move any money yet — it's a commitment.
- A **Delivery** record (§5.2) is what actually reduces stock and can include a cash-received amount for that specific delivery.
- **Payment status** is the sum of every payment ever logged against that order, compared to the total amount charged — never a single "paid: yes/no" flag, for the same installment-payment reason described in §5.2.
- Outstanding balance per customer, shown in the search screen (Phase 4), is a live calculation from this full history, not a stored running total.

### 6.3 Expense Categories (Categorized, Not Freeform)
Every expense must be logged against one of these fixed categories, each requiring a mandatory receipt photo (or a photo of a handwritten paper ledger with typed details added underneath — text-only entries are disallowed entirely):

| Category | Covers |
|---|---|
| Fuel | Vehicle fuel costs |
| Salaries | Employee wages |
| Electricity | Plant electricity bills |
| Plant Rent | Facility rental |
| Vehicle Repair | Maintenance and repairs |
| Machine Repair | Equipment maintenance |
| Miscellaneous | Everything else operational |

**Rule:** Expenses reduce profit on reports and dashboards, but **never touch inventory** — they're a purely financial record, which is exactly why they're built in Phase 6, decoupled from the inventory-driving Purchasing module in Phase 2.

### 6.4 Profit Calculation Logic
Profit is not a separate number someone enters — it's derived:
```
Revenue (from Orders/Deliveries)
  − COGS (raw material actually consumed per Production's auto-deduction formulas, §Phase 3)
  − Operating Expenses (§6.3)
  = Estimated Profit
```
This is exactly why the Owner's real profit dashboard can't ship before Phase 8 — every term in that formula depends on a different phase (Orders=4/5, Production=3, Expenses=6) having real data first.

---

## 7. Reports Catalog

The master spec defines 8 report types, each available at Daily / Weekly / Monthly / Yearly granularity. Listing them explicitly here (rather than folding them into "Owner Dashboard") because several of them only become buildable once a specific earlier phase is live:

| Report Type | Covers | Earliest Buildable Phase |
|---|---|---|
| Sales | Revenue breakdown | Phase 4–5 (needs Orders/Deliveries) |
| Profit | Revenue − Expenses (§6.4) | Phase 8 (needs Orders + Production + Expenses all live) |
| Expenses | Categorized spending | Phase 6 |
| Inventory | Stock movements (calculated, §5.1) | Phase 3 (raw material) / Phase 5 (finished goods + bottles) |
| Production | PET production counts | Phase 3 |
| Bottle Summary | 19L ledger reconciliation (§5.3) | Phase 5 |

---

## 8. Per-Side Feature Priority — Full Breakdown

This section explains **every feature, for every role, in plain language** — what it actually does on screen, why it's built in this order and not another, what it depends on, and a real-world example of it being used.

---

### 👑 OWNER

The Owner is the only role with unrestricted access. Most heavy features (reports, profit) are built last — nothing to report until other roles enter data. What the Owner gets early is the power to set everything up.

**Feature 1: User & Role Management** — *Phase 1*
- Creates logins for all 5 staff roles. Can deactivate users without deleting history.
- **Example:** Hires new order-desk employee → creates account → picks "Marketing Manager" → they log in and only see order/customer screens.
- **Fields:** Name, Email (unique), Phone, Role, Password (bcrypt), Is Active.
- **Wadaana:** Same screen, completely separate user pool — zero shared accounts.
- **Owner-only powers:** Delete customers, override inventory (logged), edit passwords, update website, edit credit limits, reopen locked days, view purchase mappings.

**Feature 2: Item/Catalog & Reorder-Level Setup** — *Phase 1*
- Defines master list of everything tracked + sets low-stock alert thresholds.
- **Aquasphere items:** Calcium, Magnesium, Sodium, 0.5L/1.5L Empty Bottles, Small/Large Caps, 0.5L/1.5L Labels, Shrink Wrap, 0.5L/1.5L PET Finished Goods, 19L Empty Bottles (asset ledger).
- **Reorder thresholds:** Sodium 3kg, Calcium 10kg, Magnesium 5kg, Empty Bottles 6,000 units, Labels 10-15kg, Caps 6,000 units, Large Caps 500 units, 19L Bottles 50 units.

**Feature 3: Owner Dashboard — Basic KPIs** — *Phase 1*
- Shows today's sales, cash, expenses at a glance. Chemical stock gauges visible.
- **Role filtering:** `Est. Profit` **strictly hidden from everyone except Owner**. Admin/PM see ops metrics without profit. Accountant sees cash flows without inventory gauges.
- **KPI Cards:** Sales, Cash Collections, Credit Sales, Expenses, Estimated Profit (OWNER ONLY), Pending Orders, Completed Orders.
- **Alert Center:** CRM alerts (inactivity >1 week, credit breaches), stock alerts (reorder warnings).

**Feature 4: Full Dashboard + All 8 Reports** — *Phase 8*
- Sales trends, profit margins, cash flow, credit exposure, vendor payables, bottle reconciliation. Sliceable by day/week/month/year.
- **8 Reports:** Sales, Profit, Expenses, Inventory, Production, Customer Credits, Vendor Balances, Bottle Summary.
- **Wadaana:** Same reports, pulling from Wadaana schema — zero data mixing.

**Feature 5: Daily-Close Override** — *Phase 8*
- Reopens locked days with logged reason. Every override creates audit trail entry.

**Feature 6: Audit Trail Browser** — *Phase 8*
- Owner-only screen to search/filter full activity log. Searchable by user, date, action type, entity.

**Feature 7: Credit-Limit Editing** — *Phase 8+*
- Change customer credit limits. Special case: 0 = **unlimited**, not "block everything."

**Feature 8: Manual Inventory Adjustment (logged)** — *Phase 8+*
- Correct inventory counts with required reason note. Creates adjustment transaction, never direct field edit.

**Feature 9: Website Settings** — *Phase 8+ / deferred*
- Manage aquasphere.org content: Customers, Reviews, Work With Us, Find Us sections.

---

### 🛡️ ADMIN

Admin is a **supervisor, not an operator** — can see almost everything but cannot create/edit daily transactions, and specifically **cannot see profit or cost figures**. Gets nothing until Phase 7 because there's nothing to supervise before then.

**Feature 1: Nothing until Phase 7 (by design)**
- Building Admin dashboard in Phase 1 would show "0 orders, 0 production, 0 stock" — useless and untestable.

**Feature 2: View-Only Dashboards** — *Phase 7*
- Sees stock levels, production totals, order lists — all **read-only**.
- **Example:** "1.5L PET stock: 340 packs, 12 orders pending."
- **Visible:** Inventory counts, daily production, daily orders, customer alerts, cash collections.
- **Hidden (API-enforced, not CSS):** Profit, cost, raw material cost metrics, transaction editing.

**Feature 3: Daily Closing Verification + Lock** — *Phase 7*
- **Process:** Check stock → Check production → Cross-verify orders (WhatsApp + Portal) → Click "Close Day."
- **Lock effect:** No backdated edits, no new entries into closed date. Only Owner can override.
- **After lock:** API rejects edits from MM, PM, Accountant, Admin for that date.
- **Admin password reset:** Requires accountant confirmation — two-step flow.

**Feature 4: Cash Summary (No Profit)** — *Phase 7*
- Sees "Rs. 84,000 collected today" but **never** "Rs. 20,000 profit." Hidden at query level, not just UI.

**Feature 5: Customer Alert Monitoring (Read-Only)** — *Phase 7*
- Sees credit breaches and inactivity alerts but cannot act — alerts are for Marketing Manager to follow up.

---

### 🏭 PRODUCTION MANAGER (PM)

Turns raw materials into finished goods. Built after Purchasing (Phase 2) because you can't consume chemicals nobody bought.

**Feature 1: Raw Material Inventory View** — *Phase 2 (read-only)*
- Sees chemical stock, empty bottles, caps, labels, shrink wrap — **cannot edit directly**.
- **Low-stock alerts:** Visual gauges when stock falls below thresholds.
- **Cannot see:** Financials, sales, customer records, profit margins.

**Feature 2: Production Batch Entry** — *Phase 3*
- Logs "made 200 packs of 0.5L today." **Only enters pack quantities — system does the rest.**
- **Fields:** Production date, 0.5L packs produced, 1.5L packs produced.

**Feature 3: Auto-Deduction Formulas** — *Phase 3*
- Automatic exact-decimal subtraction of all raw materials. **Never rounded.**

**0.5L Pack (12 bottles) deductions:**
| Item | Per Pack | For 200 packs |
|---|---|---|
| 0.5L Empty Bottles | 12 units | 2,400 bottles |
| Small Caps | 12 units | 2,400 caps |
| Labels | 6.72g | 1,344g |
| Shrink Wrap | 50g | 10,000g |
| Mineral Sets | 108L/15,140L = 0.007133... | 1.4266... sets |
| Water Treated | 108L | 21,600L |
| **Finished Goods** | **+1 pack** | **+200 packs** |

**1.5L Pack (6 bottles) deductions:**
| Item | Per Pack | For 100 packs |
|---|---|---|
| 1.5L Empty Bottles | 6 units | 600 bottles |
| Small Caps | 6 units | 600 caps |
| Labels | 7.86g | 786g |
| Shrink Wrap | 50g | 5,000g |
| Mineral Sets | 72L/15,140L = 0.004755... | 0.4755... sets |
| Water Treated | 72L | 7,200L |
| **Finished Goods** | **+1 pack** | **+100 packs** |

**Mineral Set:** 2kg Calcium + 1kg Magnesium + 0.5kg Sodium = **15,140 Litres**. Exact decimal fractions, no rounding.

**Feature 4: Broken-Bottle Logging** — *Phase 3*
- Logs cracked/damaged bottles separately. Deducts from "At Factory," adds to "Broken" in bottle ledger.

**Feature 5: Production History View** — *Phase 3*
- Full audit trail: date, quantities, materials used, breakage. Read-only.

**Feature 6: PM Daily Closing** — *Phase 3*
- Confirms production numbers final for the day. **Note:** PM confirms, but only Admin clicks "Close Day."

---

### 📞 MARKETING MANAGER (Order Desk)

Highest-traffic, most time-sensitive screen. Target: **under 20 seconds per order** once customer is found. Built at Phase 4 (not Phase 1) because it needs customers (Phase 1) and finished goods (Phase 3) first.

**Feature 1: Customer Search** — *Phase 4*
- **Single search box** — no scrolling through lists. Search by phone (primary), name, or customer ID.
- **Instant display:** Name, outstanding balance, 19L bottle balance, last delivery date, average monthly orders.
- **Example:** Types phone number → sees "Ahmed — owes Rs. 1,200, holding 3 bottles, last order 4 days ago."

**Feature 2: Add-Customer-Inline Modal** — *Phase 4*
- If search empty, popup opens **inside order flow** without leaving the screen.
- **Fields:** Name, Phone (unique, required), Address, GPS Pin, Home Photo, Customer Type (home/restaurant/shop/distributor), Credit Limit (0=unlimited), Credit Duration, Default Price, Security Deposit, Remarks.
- **On save:** Returns to order with customer auto-selected.
- **Cannot delete customers** — only Owner can.

**Feature 3: Order Creation — Two Separate Types** — *Phase 4*
- **Never mixed:** One order is either 19L OR PET, never both.

**19L Order:** Quantity ordered, Amount charged, Expected delivery, Remarks.

**PET Order:** 0.5L packs, 1.5L packs, Amount charged, Expected delivery, Remarks.

**Target:** Under 20 seconds once customer found.

**Feature 4: Credit Soft-Block Warning** — *Phase 4*
- Warns if order pushes customer over credit limit. **Never hard-blocks.**
- **Special case:** Credit limit = 0 means **unlimited** — skip check.
- **Returns:** `200` with `{ warning: true, currentBalance, limit, projectedBalance }` — never 4xx.

**Feature 5: Pending Orders List** — *Phase 4*
- Live list of `pending`/`partial` orders. Visible to MM and Owner.
- **Daily Cleanliness:** All today's orders must be closed by end-of-day. Uncleared orders escalate to Owner/Admin dashboard.

**Feature 6: Delivery Completion + Bottle Return Validation** — *Phase 5*

**19L Delivery:** Qty delivered, Good returns, Broken returns, Cash received, Payment method, Remarks.

**PET Delivery:** Qty delivered, Cash received, Payment method, Remarks.

**8 Auto-Updates on submission (no manual step):**
1. Recompute delivery + payment statuses
2. Update customer bottle balance
3. Update customer outstanding balance
4. Deduct Large Caps + Mineral Sets (19L only)
5. Reduce finished goods (PET only)
6. Update cash and profit
7. Update dashboard and reports
8. Update customer last delivery date + avg monthly orders

**Bottle Return Soft-Block:** If returns > held balance, show WARNING with actual balance, require EXPLICIT CONFIRMATION. Never silently allow impossible numbers.

**Feature 7: Partial Deliveries** — *Phase 5*
- Single order can have multiple delivery records over time.
- **Example:** Orders 100 PET packs. Delivery 1: 40 packs. Delivery 2: 35 packs. Delivery 3: 25 packs.
- Status computed from sum of all deliveries/payments vs order total.

**Feature 8: Inactivity Alerts** — *Phase 8*
- Customer hasn't ordered in 7 days → flagged on MM dashboard as "Requires Follow-Up."

**Feature 9: Order-Speed Optimization** — *Phase 10*
- Fewer clicks, smarter defaults, bigger touch targets. Target: <20 seconds.

---

### 💰 ACCOUNTANT

Two halves: getting materials IN (Purchasing/Vendors, Phase 2) and tracking money OUT (Expenses/Cash, Phase 6).

**Feature 1: Vendor Management** — *Phase 2*
- Directory: Name, Phone, Remarks.
- **Critical rule:** Vendor MUST exist before purchase. No inline creation in purchase form.
- **Correct flow:** Add vendor → appears in dropdown → select in purchase → complete.

**Feature 2: Purchase Entry (Mandatory Bill Photo)** — *Phase 2*
- **Fields:** Vendor (dropdown, must exist), Item, Quantity, Unit Cost, Total Cost (computed), Purchase Date, **Bill Photo (mandatory)**.
- **Example:** Buys 50kg Calcium for Rs. 15,000, uploads receipt → system adds 50kg to stock + Rs. 15,000 to vendor payable.
- **Auto-effects:** Increase inventory, increase vendor payable, log to audit trail.
- **19L Bottles:** New bottle purchases go to **bottle asset ledger** (capital asset), NOT regular inventory.

**Feature 3: Vendor Payment Recording** — *Phase 2*
- Separate transaction from purchase. Reduces vendor payable.
- **Fields:** Vendor, Amount, Payment method, Date, Remarks.
- **Mirrors customer payment model:** Purchases NOT assumed paid in full.

**Feature 4: Expense Entry (Mandatory Receipt Photo)** — *Phase 6*
- **Categories:** Fuel, Salaries, Electricity, Plant Rent, Vehicle Repair, Machine Repair, Miscellaneous.
- **Fields:** Category, Amount, Date, Remarks, **Receipt Photo (mandatory)**.
- **Alternative:** Upload handwritten ledger photo, transcribe details below.
- **Text-only entries DISALLOWED** — every expense MUST have a photo.
- **Rule:** Expenses reduce profit but **never touch inventory**.

**Feature 5: Counter/Spot Sales** — *Phase 6*
- Walk-in customers with personal containers.
- **Fields:** Water sold (Litres), Caps issued, Cash collected, Credit (if applicable).
- **Not regular orders** — no customer record, no delivery tracking.

**Feature 6: Cash Reports + Invoice Generation** — *Phase 6*
- Daily summary: cash from orders + counter sales. Cross-verifies with delivery records.
- **Invoice:** Formal bill with company branding (Green Aquasphere / Purple Wadaana).

**Feature 7: Accountant Daily Closing** — *Phase 6*
- Confirms financial entries complete. **Accountant confirms, Admin clicks "Close Day."** After close, Accountant cannot edit (only Owner can override).

---t it does:** A daily summary of everything collected across orders, counter sales, and other payments, plus formal invoice generation.
- **Cross-verifies all entries** — Accountant checks that cash collected matches delivery records.

**7. Accountant-Specific Daily Closing** — *Phase 6, wired into Phase 7 (§5.5)*
- **What it does:** Confirms the day's financial entries are complete and final.
- **Note:** Accountant can confirm, but only Admin can actually click "Close Day" to lock. After Admin closes, Accountant cannot edit that date's records (only Owner can override).

---

## 9. Aquasphere vs Wadaana Sequencing

- **Now:** Wadaana is a functional clone of Aquasphere (identical UI/backend, `Wadaana*` Prisma models mirror `Aquasphere*` 1:1). **Do not build Wadaana-specific screens until Aquasphere Phases 1–8 are done and stable.**
- **Phase 9** is a *rollout*, not a rebuild: same components, re-pointed at the `wadaana` DB context, with its own isolated users/auth ("Aquasphere has its own users, Wadaana has its own users").
- **Phase 11 (deferred):** Wadaana's *actual* differentiator — Pure/Mix preform tracking, Factory→Warehouse flow, brand-specific batches for Deosani/Pivrifine/Dasani — is explicitly called out in the master doc as **later phase** work. Don't pull this forward.

**Wadaana Context Switching:**
- Top header selector: "Would you like to enter Wadaana or Aquasphere?"
- Persistent header shows `[Active Workspace: Aquasphere | Wadaana Industries]`
- Company context stored in JWT claim + API header (`X-Company-Context: aquasphere | wadaana`)
- Invoices and alerts dynamically render branding matching the active context (Green for Aquasphere, Purple `#7C3AED` for Wadaana)
- **No browser localStorage/sessionStorage** for business-critical data

---

## 10. Cross-Role Dependency Chain

```
Owner (setup, §Phase 1)
   └─► Accountant (Purchasing/Vendors, §6.1)
           └─► Production Manager (consumes raw material → makes finished goods)
                   └─► Marketing Manager (sells finished goods + 19L via orders)
                           └─► Marketing Manager (Delivery + Bottle Ledger, §5.3)
                                   └─► Accountant (Expenses, Cash, Customer Payments, §6.2–6.3)
                                           └─► Admin (verifies everything, locks the day, §5.5)
                                                   └─► Owner (profit/margin reporting on locked data, §6.4, §7)
```

Every arrow above is also an audit-trail relationship (§5.6) — each transaction downstream carries a trace back to the transaction that made it possible.

---

## 11. Open Items That Will Block Specific Phases

Resolve these **before** the phase listed, or the feature will need rework:

| # | Question | Blocks Phase |
|---|---|---|
| 1 | Final spelling: "Deosai" vs "Deosani" | Phase 11 (Wadaana B2B) |
| 2 | Preform weights — 0.5L Mix (27g) vs 1.5L Mix (15g), confirm not swapped | Phase 11 |
| 3 | Is "Super Admin" the same as Owner, or a 4th tier? | Phase 0 (role enum) — **resolve immediately**, changes the auth schema and the §4 permission matrix |
| 4 | Exact shrink-wrap kg per PET pack | Phase 3 (production deduction formula) — currently using 50g (0.05kg) as placeholder |
| 5 | Why PM draws raw preform from "Warehouse" (holds finished bottles per doc) | Phase 11 |
| 6 | Shrink wrap conversion factor (confirmed or needs revision) | Phase 3 |
| 7 | Is there any "cancelled" order state, given §5.2 defines only delivery/payment tracks with no cancellation path? | Phase 4 — worth confirming with the client before order logic is finalized |

**Recommendation:** Question #3 should be answered before Phase 0 is finalized — it changes the `Role` enum and permission matrix that every later phase builds on top of.

---

## 12. Definition of Done per Phase

- **Phase 0:** A user can log in, land on the correct role-specific shell (§4 permission matrix enforced, not just role name), and switch company context without losing session. Inventory tables have no directly-editable quantity field anywhere in the schema (§5.1). Audit-log table exists and captures at least login/logout events. JWT stored in httpOnly cookies, never localStorage.
- **Phase 1:** Owner can create users, assign roles, seed items with reorder levels, and see a dashboard shell with role-based filtering (profit hidden from non-Owner). Wadaana context shell exists with identical structure but separate data.
- **Phase 2:** A purchase cannot be submitted without selecting an existing vendor (§6.1); submitting one visibly increases raw material stock and vendor payable in the same transaction, and both are logged to the audit trail. Vendor payment recording reduces payable correctly.
- **Phase 3:** Logging a production batch deducts bottles/caps/labels/minerals using exact decimal fractions (no rounding) and increases finished-goods stock automatically (§5.1). Broken bottles are logged separately. PM can view inventory but cannot see financials or customer records.
- **Phase 4–5:** An order can be placed, found via search, delivered (fully or partially), and every downstream number (customer balance §6.2, bottle balance §5.3, inventory, cash) updates without any manual step. Delivery status and payment status are independently correct even when they diverge (§5.2). Bottle return validation soft-blocks with warning, never hard-blocks. Credit limit = 0 is treated as unlimited.
- **Phase 6:** An expense cannot be submitted without a receipt photo and a category (§6.3); expenses appear in profit calculations but never touch inventory counts. Counter sales can be logged. Cash reports reconcile with delivery records.
- **Phase 7:** Admin can view the day's numbers, cannot see profit, and clicking "Close Day" locks every entry dated that day for every role except Owner (§5.5); the lock and any later Owner override are both visible in the audit trail (§5.6). Admin is strictly view-only — cannot place orders or edit transactions.
- **Phase 8:** Profit figure matches the §6.4 formula exactly when checked against raw purchase/production/order/expense data for the same period. All 8 report types (§7) return real, correct numbers, not placeholders. Owner can override closed days with logged reason.
- **Phase 9:** The exact same feature set exists under the Wadaana context with fully separate data, users, and branding — zero cross-contamination with Aquasphere. Purple header branding for Wadaana.
- **Phase 10:** Order entry consistently achieves <20 second target. Mobile responsive on all screens. Dark mode toggle works across all modules. Photo upload hardened with validation.

---

## 13. Completed Work Log

### Phase 0 & 1 — Completed (July 20–23, 2026)

**1. Authentication & Security (Phase 0)**
- Migrated frontend auth from insecure `localStorage` mock to true JWT HTTP-only cookies communicating with `/api/v1/auth/me`.
- Implemented `ProtectedRoute` and `PublicRoute` wrappers in React Router to enforce strict access control (unauthorized users kicked to `/login`, authenticated users bypass `/login`).
- Implemented 5-role JWT hierarchy: Owner, Admin, Production Manager, Accountant, Marketing Manager.
- Company context routing: `x-company-context` header sent with every request.
- Daily-close lock table and audit-log table created in schema.

**2. Layout & UI Overhaul (Phase 1)**
- Scrapped broken CSS templates and reset `index.css` to clean Tailwind defaults, fixing extreme width constraints and giant typography.
- Built pixel-perfect replica of client-approved prototype layout (TopNav, Sidebar, responsive Dashboard Grid).
- Replaced harsh black borders with soft `border-slate-200` globally for premium enterprise feel.
- Added all requested navigation modules (`Counter Sales`, `Reports`, `Users & Roles`, `Settings`).
- Dark mode support implemented via CSS variables and Tailwind `dark:` variant.
- Division branding: Green (`#059669`) for Aquasphere, Purple (`#7C3AED`) for Wadaana header.

**3. Role-Based Dashboard Isolation (Phase 1)**
- Enforced strict data isolation based on the §4 permission matrix.
- `Est. Profit` strictly hidden from everyone except `OWNER`.
- Financial metrics (Cash, Credit, Expenses) hidden from operational roles (`ADMIN`, `PRODUCTION_MANAGER`).
- Added Chemical Stock Gauges (Calcium, Magnesium, Sodium) visible only to operational and owner roles.
- Owner can create users, assign roles, and manage the system.

**4. Wadaana Context Shell (Phase 1)**
- Wadaana workspace toggle implemented in header.
- Separate user pools for Aquasphere and Wadaana — zero shared accounts.
- Wadaana dashboard shell mirrors Aquasphere with purple branding.
- Database schemas (`aquasphere` and `wadaana`) are 1:1 mirrors.

**Next Steps:**
- **Phase 2 (Purchasing & Vendors):** Build Vendor CRUD, Purchase entry with mandatory bill photo, auto-increment raw material stock + vendor payable.
- **Phase 3 (Production):** Build production batch entry with automatic raw material deductions (exact decimal fractions), broken-bottle logging.
- ⚠️ Before continuing: confirm whether product-stock numbers currently shown on dashboard are real (Phase 3 doesn't exist yet) or placeholder — reconcile against §5.1 (no manual/fake inventory numbers) before Expenses/Vendors work begins.
- ⚠️ Resolve open item #3 (Super Admin vs Owner) before finalizing role enum in auth schema.

---

*This document is the working companion to `AQUA_Sphere_OS_Master_Requirements.md` (what to build), `architecture.md` (how it's shaped), `rules.md` (how to write it), and `phases.md` (when to build it). Update phase status here as work lands.*
