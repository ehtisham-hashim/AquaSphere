# AQUA Sphere OS — Development & Feature Priority Plan

> **Compiled from:** `prototype_system_documentation.md` (prototype), `AQUA_Sphere_OS_Master_Requirements.md` (master spec), `schema.prisma` + `base-models.prisma` (data model)
> **Purpose:** Decide **what gets built first, and on which side (Owner / Admin / Production Manager / Marketing Manager / Accountant)**, for both **Aquasphere** and **Wadaana Industries** — and document every core system rule (ledgers, permissions, locking, audit) that the build order depends on.
> **Status:** v2 — expanded after gap review to cover RBAC, ledgers, financial linking, and reporting in full detail.

---

## 0. What Changed in This Update (Gap Review)

This version was produced after a review flagged things the first draft only mentioned in passing instead of documenting fully. Being straight about what was actually missing vs. already covered, since not everything flagged was accurate:

| Flagged item | Reality |
|---|---|
| Bottle Ledger System | Already present (Phase 5, §3 MM section) — but only as a bullet point. **Now has its own full section (§4.3)** with the reconciliation equation and all 6 transaction types. |
| Daily Closing Lock | Already present (Phase 7) — but under-detailed. **Now has its own section (§4.5)** with the exact lock/override mechanics. |
| Payment / Credit Ledger | Genuinely under-documented. **Added §5** (Financial System Detail) covering vendor-side and customer-side ledgers, and how Purchase→Payment and Order→Delivery→Payment actually link. |
| RBAC / Permission Matrix | Roles were described in prose per-section, but there was no single reference table. **Added §3**, pulled directly from the master spec's own permission matrix. |
| Audit Logs / Immutable Records | Missing. **Added §4.6** — this is a real, named requirement in the prototype doc's Security Features section, not an assumption. |
| Soft Delete | Missing as a named rule, though implied by "no delete customers" rules scattered around. **Added §4.7**, consolidated into one rule. |
| Order Status Lifecycle (pending → confirmed → delivered → cancelled) | **This suggestion doesn't match the actual spec.** The system uses **two independent status tracks** (delivery status and payment status computed separately from summed transactions), not one linear pipeline, and there is no "cancelled" state defined anywhere in the master doc. Documenting the *real* model in §4.2 instead of a generic one. |
| Delivery Assignment System (driver assignment) | **Already explicitly deferred** in the master doc itself (§14, listed as "future phase?") — kept in Phase 11 (Deferred Scope), not pulled forward. |
| Profit Calculation Logic | Real formula added in §5.4 (Revenue − COGS − Expenses), sourced from the spec, not invented. |
| Reports (Bottle Balance, Daily Summary, Inventory, Financial) | The master spec defines **8 report types**, all listed with their real fields in §6 (Reports Catalog) — more complete than a generic list. |
| Vertical slicing / API layer / DB schema planning | Not added as separate sections — the schema (`schema.prisma`) already exists and is generated from `base-models.prisma`; this document plans *feature and role sequencing* on top of a data model that's already built, so re-planning the DB schema here would contradict the existing workflow. |

---

## 1. Guiding Build Principles

Before listing phases, three rules decide the *order*, not just the *list*:

1. **Follow the money's real path, not role importance.**
   Money/stock actually flows: `Vendor → Purchase → Raw Material → Production → Finished Goods → Order → Delivery → Payment → Daily Close → Reports`.
   Every "downstream" module is meaningless without the "upstream" one feeding it. So we build **in data-flow order**, even though Marketing Manager (Order Desk) is the most business-critical *daily* screen.

2. **Build once on Aquasphere, clone to Wadaana.**
   The schema (`schema.prisma`) is already a 1:1 prefixed mirror (`Aquasphere*` / `Wadaana*` from the same `__Prefix__` template in `base-models.prisma`), and the master doc confirms Wadaana currently **operates identically** to Aquasphere. So: build every module fully on Aquasphere first, verify it, then stamp it out for Wadaana. Do **not** build both in parallel — that doubles bugs before either is proven.

3. **Foundation is Phase 0, invisible to all 5 sides, but blocks everyone.**
   Auth, roles, company-context switching, and the "no manual inventory edits — everything derived from transactions" engine are prerequisites for literally every screen. Nobody gets a feature before this exists.

---

## 2. High-Level Phase Roadmap

| Phase | Name | Primary Side(s) | Depends On | Key Deliverables |
|---|---|---|---|---|
| **0** | Foundation | *(none — infra)* | — | Auth + JWT sessions, 5 roles enum, permission-matrix middleware (§3), company-context routing (`aquasphere` vs `wadaana`), base navigation shell, transaction-derived inventory engine (no editable stock fields), daily-close lock table (schema only), audit-log table (schema only) |
| **1** | Owner Setup Tools | **Owner** | Phase 0 | User management, item/catalog seeding, reorder-level config, Owner dashboard skeleton |
| **2** | Purchasing & Vendors | **Accountant** (primary), Owner (oversight) | Phase 1 | Vendor CRUD, "vendor must exist first" rule, Purchase entry (mandatory bill photo), auto-increment raw material stock + vendor payable, Vendor Payment recording (§5.1) |
| **3** | Production | **Production Manager** | Phase 2 | Production batch entry, automatic deductions (exact decimal fractions), broken-bottle logging, finished-goods stock increase, PM dashboard |
| **4** | CRM & Orders | **Marketing Manager** | Phase 1 + Phase 3 | Customer CRUD (no hard delete, §4.7), search-only lookup, "add customer inline," 19L order + PET order as separate types, dual independent status tracks (§4.2), soft-block credit-limit warnings |
| **5** | Deliveries & Bottle Ledger | **Marketing Manager** (entry) | Phase 4 | Delivery completion forms, partial-delivery support, bottle return validation (soft-block), full 19L Bottle Asset Ledger with all 6 transaction types (§4.3), auto-updates to customer balance, inventory, cash |
| **6** | Financial Entry (remainder) | **Accountant** | Phase 5 | Expense entry (categorized, photo mandatory), Counter/spot sales, cash collection reports, invoice generation, customer payment recording (§5.2) |
| **7** | Admin Verification Layer | **Admin** | Phases 3–6 | View-only dashboards, Daily Closing verification + lock (§4.5), WhatsApp/portal cross-check step, audit trail visibility |
| **8** | Owner Deep Analytics | **Owner** | Phase 7 | Full profit/margin reports, all 8 report types (§6), daily-close override, bottle ledger reconciliation reports, credit-breach alert automation, inactivity alerts |
| **9** | Wadaana Mirror Rollout | **All 5 sides** (cloned) | Phases 1–8 stable | Stamp out identical modules into `Wadaana*` schema/DB, separate auth/users per division, separate branding |
| **10** | Cross-Cutting Polish | *(all sides)* | Phase 9 | Google Maps integration, mobile-first pass, order-entry speed tuning (<20s target), photo upload hardening |
| **11** | Deferred / Future Scope | — | Everything above | Wadaana specialized B2B blowing logic, **driver route assignment** (explicitly listed as future-phase in the master doc itself), public website management module, possible 4th "Super Admin" tier (pending confirmation) |

---

## 3. Role-Based Access Control — Full Permission Matrix

This is the single reference table every phase's access control gets built against. It comes directly from the master spec, not inferred — if a screen's permissions ever seem unclear, this table is the source of truth.

| Role | Access Level | Can See | Can Edit | Cannot See / Cannot Do |
|---|---|---|---|---|
| **Owner** (Super Admin) | Full System Admin | Everything, both divisions | All data, passwords, credit limits, logged inventory corrections, website settings | Nothing restricted |
| **Admin** | Supervisor (View-Only) | Inventory, daily production, daily orders, customer alerts | Only the end-of-day "Close Day" action | Profit, cost figures — cannot place orders, cannot edit any transaction |
| **Production Manager** | Operational Input | Inventory (minerals, caps, bottles, labels, shrink wrap, PETs) | Daily production counts, broken-bottle logs | Financials, sales, customer records |
| **Marketing Manager** | Operational Sales | Customer profiles, orders, inventory levels | Orders, delivery status, prices, payment methods, new customers | Cannot delete customers, cannot see profit margins |
| **Accountant** | Financial Auditor | Customers, expenses, cash collections | Expenses (with receipt photo), spot sales, cash reports | Cannot directly adjust inventory |

### 3.1 Powers That Belong to Owner Alone
- Delete customer records (the *only* role permitted to hard-delete anything — see §4.7)
- Manually override inventory counts, always as a logged adjustment with a reason, never a silent edit
- Modify any user's password
- Update website content/parameters
- Edit customer credit limits
- Reopen a day that Admin has already locked (§4.5 override)
- View and correct which inventory items a given purchase was mapped to

### 3.2 What This Means for Build Order
Permission enforcement isn't a single feature to build once — it has to be checked at **every** phase where a new screen appears, because the wrong default (e.g., an MM screen accidentally showing profit margin) is a real data leak, not just a UI bug. Each phase's "Definition of Done" (§9) includes a specific permission check for that phase's screens.

---

## 4. Core System Rules — Data Integrity, Ledgers & Locking

These are the rules that every phase's business logic has to obey. They're not features with their own phase — they're constraints baked into *every* phase from Phase 0 onward.

### 4.1 No-Manual-Edit Inventory Rule
No inventory quantity is ever directly typed in and saved. Every stock number — raw material, finished goods, bottle balances — is **calculated live from the full history of transactions** (purchases, production batches, deliveries, returns). This is the system's single most important architectural rule, and it's why the phase order in §2 matters so much: a screen that displays or edits a calculated number is worthless until the transactions that feed the calculation actually exist.

### 4.2 Order Status — Two Independent Tracks, Not One Pipeline
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

### 4.3 19L Bottle Asset Ledger (Full Detail)
Bottles are **not** ordinary consumable inventory — they're treated as a durable, reusable asset with their own ledger, separate from the raw-material/finished-goods inventory engine.

**The reconciliation equation that must always hold true:**
```
Total Owned = At Factory + With Customers + Broken
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

### 4.4 Credit & Bottle Soft-Block Philosophy (System-Wide Rule)
This one rule governs *every* limit in the system, not just credit:
```
WHEN AN ACTION WOULD EXCEED A LIMIT:
 • Show a clear warning
 • Require explicit confirmation to proceed
 • NEVER hard-block the operator
```
Applies to: credit limit exceeded, bottle return exceeding a customer's known balance, and raw material stock going below zero (operations sometimes log after the fact). One special case: a credit limit of exactly `0` means **unlimited**, not "block everything" — an easy rule to get backwards if built without reading this.

### 4.5 Daily Closing Lock — Full Mechanics
- **Who can trigger it:** Admin, after a manual checklist (stock counts look right, production counts look right, orders cross-checked against WhatsApp/portal reports from the field).
- **What it does:** Locks every transaction dated that day, for every role — no backdated edits, no new entries into a closed date.
- **The one exception:** Owner can reopen a locked day to fix a genuine mistake — but that reopening itself is a logged action, not a silent unlock.
- **Role visibility during closing:** Everyone else (PM, MM, Accountant) has **view-only** access to the day's closing summary; only Admin can actually click "Close."
- **Build dependency:** This can only be meaningfully built once Phases 3–6 exist, since there's nothing to verify or lock before then — the "button" can exist earlier as a stub, but its *enforcement* logic waits for Phase 7.

### 4.6 Audit Trail / Immutable Records
This is a named requirement, not an inferred one — the prototype documentation's Security Features section explicitly calls for:
- **Activity logging** — a record of what each user did and when
- **Immutable transaction history** — once a purchase, order, delivery, or expense is recorded, the record itself is never overwritten; corrections are new logged entries, not edits to the original
- **Change tracking** — any adjustment (like Owner's manual inventory correction, or a reopened daily close) gets its own timestamped log entry showing what changed and who changed it

**Where this belongs in the build order:** The audit-log table itself should exist from Phase 0 (schema only), since every phase from Phase 2 onward (purchases, production, orders, closings) needs to write to it. But the *screen* to browse/search the audit trail is a Phase 8 feature (Owner-level oversight tool) — there's no point building a browsing UI before there's meaningful history to browse.

### 4.7 Soft-Delete Philosophy — Nothing Is Hard-Deleted Except by Owner
Consistent with the immutability rule above: the system doesn't let operational roles permanently erase records.
- **Customers:** Can never be deleted by Admin, Marketing Manager, Production Manager, or Accountant — only **Owner** can delete a customer record, and even then it should be treated as an exceptional, logged action rather than routine cleanup.
- **Transactions (purchases, orders, deliveries, expenses):** Never deleted at all, by anyone, including Owner. Mistakes are corrected with a new, logged counter-entry — this is what makes the audit trail (§4.6) trustworthy.
- **Users:** Deactivated, not deleted, when someone leaves the company — their historical actions (orders they entered, deliveries they logged) must remain attributable.

---

## 5. Financial System Detail

### 5.1 Vendor-Side Ledger (Purchase → Payment Linking)
- A **Purchase** increases raw material stock *and* increases that vendor's outstanding payable, in the same transaction (§4.1 rule: it's calculated, not hand-typed).
- A **Vendor Payment** is a **separate, later transaction** that reduces the payable. Purchases are never assumed "paid in full" just because they were recorded — the system explicitly tracks the gap between what's been bought and what's been paid.
- This mirrors the customer side exactly (§5.2) — same pattern, same logic, applied to the two directions money moves.

### 5.2 Customer-Side Ledger (Order → Delivery → Payment Linking)
- Placing an **Order** doesn't move any money yet — it's a commitment.
- A **Delivery** record (§4.2) is what actually reduces stock and can include a cash-received amount for that specific delivery.
- **Payment status** is the sum of every payment ever logged against that order, compared to the total amount charged — never a single "paid: yes/no" flag, for the same installment-payment reason described in §4.2.
- Outstanding balance per customer, shown in the search screen (Phase 4), is a live calculation from this full history, not a stored running total.

### 5.3 Expense Categories (Categorized, Not Freeform)
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

### 5.4 Profit Calculation Logic
Profit is not a separate number someone enters — it's derived:
```
Revenue (from Orders/Deliveries)
  − COGS (raw material actually consumed per Production's auto-deduction formulas, §Phase 3)
  − Operating Expenses (§5.3)
  = Estimated Profit
```
This is exactly why the Owner's real profit dashboard can't ship before Phase 8 — every term in that formula depends on a different phase (Orders=4/5, Production=3, Expenses=6) having real data first.

---

## 6. Reports Catalog

The master spec defines 8 report types, each available at Daily / Weekly / Monthly / Yearly granularity. Listing them explicitly here (rather than folding them into "Owner Dashboard") because several of them only become buildable once a specific earlier phase is live:

| Report Type | Covers | Earliest Buildable Phase |
|---|---|---|
| Sales | Revenue breakdown | Phase 4–5 (needs Orders/Deliveries) |
| Profit | Revenue − Expenses (§5.4) | Phase 8 (needs Orders + Production + Expenses all live) |
| Expenses | Categorized spending | Phase 6 |
| Inventory | Stock movements (calculated, §4.1) | Phase 3 (raw material) / Phase 5 (finished goods + bottles) |
| Production | PET production counts | Phase 3 |
| Customer Credits | Outstanding balances (§5.2) | Phase 4–5 |
| Vendor Balances | Payables (§5.1) | Phase 2 |
| Bottle Summary | 19L ledger reconciliation (§4.3) | Phase 5 |

**Note on the Owner's live dashboard vs. this catalog:** The dashboard (§Owner, Phase 1 stub / Phase 8 full) shows a real-time snapshot; this Reports module is the historical, filterable version of the same underlying numbers. Both read from the same calculated data — there's no separate "reporting database" to maintain.

---

## 7. Per-Side Feature Priority — Full Breakdown

This section explains **every feature, for every role, in plain language** — what it actually does on screen, why it's built in this order and not another, what it depends on, and a real-world example of it being used. Read this section even if you're not a developer — it's written so an owner, a manager, or a new team member can follow it just as easily as an engineer.

Within each side, features are built in the order listed. Where a feature says "waits on Phase X," it means: even though this is the Owner's (or PM's, or MM's) screen, it cannot work correctly until some *other* role's feature has produced real data first.

---

### 👑 Owner

The Owner is the only role with unrestricted access (§3). Because everything else in the system reports up to the Owner, most of the Owner's *heavy* features (full reports, profit numbers) have to be built **last** — there's nothing to report on until other roles have entered data. What the Owner *does* get early is the power to set the whole system up.

**1. User & Role Management** — *Phase 1*
- **What it does:** A screen where the Owner creates a login for every staff member and assigns them one of the 5 roles. Owner can also deactivate a user without deleting their history (§4.7).
- **Why first:** Nobody else can log in and use *any* feature in this whole system until this exists. It's the literal front door.
- **Example:** Owner hires a new order-desk employee → creates their account → picks "Marketing Manager" → that person can now log in and only sees order/customer screens, nothing financial (per §3 permission matrix).

**2. Item/Catalog & Reorder-Level Setup** — *Phase 1*
- **What it does:** Owner defines the master list of everything the business tracks and sets the "low stock" alert threshold for each.
- **Why first:** Every other module (Purchasing, Production, Orders) refers back to this list.
- **Example:** Without this step, the Accountant's purchase form would have no dropdown of items to select — it'd be an empty form.

**3. Owner Dashboard — Basic KPIs (stub version)** — *Phase 1*
- **What it does:** A simple landing page showing today's sales, cash, and expenses at a glance.
- **Why now, not later:** Cheap to build a placeholder version early, even though it'll show mostly zeros until other roles start entering real transactions.

**4. Full Dashboard with Profit/Margin + All 8 Report Types (§6)** — *Phase 8*
- **What it does:** Sales trends, profit margins (§5.4), cash flow, customer credit exposure, vendor payables, bottle-fleet reconciliation, all sliceable by day/week/month/year.
- **Why it waits until Phase 8:** Profit can't be calculated until purchases (cost), production (usage), orders (revenue), and payments (cash) have all actually happened.

**5. Daily-Close Override Authority** — *Phase 8*
- **What it does:** Reopens a locked day to fix a genuine mistake, with the correction itself logged (§4.5, §4.6).
- **Why it waits:** No point building an override for a lock that doesn't exist yet.

**6. Audit Trail Browsing Screen** — *Phase 8*
- **What it does:** Owner-only screen to search/filter the full activity log (§4.6) — who changed what, and when.
- **Why it waits:** The underlying log table exists from Phase 0, but there's nothing meaningful to browse until several phases of real activity have accumulated.

**7. Credit-Limit Editing, Manual Inventory Adjustment (logged), Website Settings** — *Phase 8+ / deferred*
- **What it does:** Owner-only powers to change a customer's credit limit, manually correct an inventory count (always with a required reason note, §4.6), and manage public website content.
- **Why last:** Exception-handling tools, used occasionally, not daily-driver features.

---

### 🛡️ Admin

Admin is a **supervisor, not an operator** (§3) — Admin can *see* almost everything but can't create or edit daily transactions, and specifically cannot see profit or cost figures. This means Admin's entire job is to *watch other people's work and confirm it's correct*, which is exactly why Admin gets **nothing to do until Phase 7** — there's simply nothing to supervise until the other four roles have been entering real data for a while.

**1. Nothing until Phase 7 (by design)**
- **Why:** Building an Admin dashboard in Phase 1 would just be a screen showing "0 orders, 0 production, 0 stock" — not useful, and not testable.

**2. View-Only Dashboards: Stock, Production, Orders** — *Phase 7*
- **What it does:** Admin can see current stock levels, how much was produced today, and the day's order list — but every number is *read-only*.
- **Example:** Admin opens their dashboard mid-afternoon and sees "1.5L PET stock: 340 packs, 12 orders pending."

**3. Daily Closing Verification + Lock Button** — *Phase 7*
- **What it does:** The full mechanics are in §4.5 — checklist, cross-verification against WhatsApp/portal, then lock.
- **Example:** At 8pm, Admin checks that today's 45 deliveries all match what the drivers reported on WhatsApp, then locks the day.

**4. Cash Summary Without Profit Detail** — *Phase 7*
- **What it does:** Admin sees "Rs. 84,000 collected today" but never sees "Rs. 20,000 profit" — the system deliberately hides cost and margin data from this role at the query level, not just by hiding a UI element (this is a §3 permission-matrix requirement, testable, not cosmetic).

---

### 🏭 Production Manager (PM)

The PM's whole job is turning raw materials into finished goods, so their features are built right after Purchasing exists (Phase 2) — because you can't log a production batch that consumes chemicals nobody has bought yet.

**1. Raw Material Inventory View** — *Phase 2 (read-only access as soon as Purchasing exists)*
- **What it does:** PM can see current stock of chemicals, empty bottles, caps, labels, and shrink wrap — but can't edit these numbers directly (§4.1).
- **Why it slots into Phase 2:** The moment the Accountant starts recording purchases, there's real stock data worth showing the PM.

**2. Production Batch Entry — 0.5L / 1.5L Packs** — *Phase 3*
- **What it does:** PM logs "we made 200 packs of 0.5L today." This is the single most important PM action — the bottleneck feature the whole rest of the roadmap waits behind.
- **Example:** PM enters "0.5L pack: 200 made," hits submit — the system does the rest automatically (see next item).

**3. Auto-Deduction Formulas (minerals, bottles, caps, labels)** — *Phase 3*
- **What it does:** The moment a batch is submitted, the system automatically calculates and subtracts exactly how much raw material that batch used — exact decimal fractions, never rounded. 200 packs of 0.5L (12 bottles/pack = 2,400 bottles) consumes 2,400 empty bottles, 2,400 small caps, 2,400 × 6.72g of label material, and a precise fraction of mineral sets for 2,400 × 9 litres of water treated. A 1.5L pack (6 bottles) instead consumes 7.86g label per pack and mineral sets for 6 × 12L.
- **Why this has to be automatic, not manual entry:** §4.1's core rule — manual typing invites drift and error; the formula removes that risk entirely.

**4. Broken-Bottle Logging** — *Phase 3*
- **What it does:** Bottles that crack or get damaged during production are logged separately from "good" production, written off as waste rather than lost silently.

**5. Finished-Goods & Production History View** — *Phase 3*
- **What it does:** A full audit trail (§4.6) of every batch ever logged — date, quantities, materials used, breakage.

**6. PM-Specific Daily Closing** — *Phase 3, wired into the Phase 7 lock system (§4.5)*
- **What it does:** At end of shift, PM confirms their production numbers are final for the day.

---

### 📞 Marketing Manager (Order Desk)

This is the highest-traffic, most time-sensitive screen in the whole system — the spec explicitly targets **under 20 seconds per order** once the customer is found. But it can only start once customers can exist (Phase 1 setup) and finished goods exist to sell (Phase 3 production). That's why it lands at Phase 4, not Phase 1, even though it's arguably the most "visible" feature to the business.

**1. Customer Search (phone / name / ID)** — *Phase 4*
- **What it does:** A single search box — no scrolling through a customer list. Instantly shows: name, outstanding balance (§5.2), current 19L bottle balance (§4.3), last delivery date, average monthly order volume.
- **Example:** Customer calls in, MM types their phone number, and within a second sees "Ahmed — owes Rs. 1,200, holding 3 bottles, last order 4 days ago."

**2. Add-Customer-Inline Modal** — *Phase 4*
- **What it does:** If search comes up empty, a popup form opens right there in the order screen — name, phone, address, GPS pin, home photo, customer type, credit limit — without leaving the order flow.

**3. Order Creation — 19L and PET Kept as Two Separate Order Types** — *Phase 4*
- **What it does:** A single order is *either* a 19L refill order *or* a PET pack order — never mixed, because the two products have completely different downstream logic (19L consumes water/minerals at delivery time and involves bottle returns; PET consumes them at production time and has none).

**4. Credit Soft-Block Warning on Order Entry** — *Phase 4*
- **What it does:** §4.4's soft-block philosophy applied specifically to credit — a clear warning, never a hard stop.
- **Example:** A regular distributor customer is Rs. 300 over their limit but always pays on time — MM sees the warning, proceeds anyway, and the order goes through with the overage logged.

**5. Delivery Completion + Bottle Return Validation** — *Phase 5*
- **What it does:** Records what was actually delivered, how many empties came back (split good/broken, per §4.3), and cash collected. Return validation is §4.4's soft-block rule applied to bottles.
- **Example:** Customer is recorded as holding 10 bottles; the delivery form tries to log 15 returned — system warns rather than silently accepting an impossible number.

**6. Inactivity "Requires Follow-Up" Alerts** — *Phase 8*
- **What it does:** If a customer hasn't ordered in 7 days, they're automatically flagged on MM's dashboard.
- **Why it waits:** Needs enough real order history (multiple weeks) to detect a meaningful gap.

**7. Order-Speed Optimization Pass** — *Phase 10*
- **What it does:** Fewer clicks, smarter defaults, bigger touch targets — aimed at the sub-20-second target.
- **Why last:** Can't optimize the speed of a workflow that isn't finished and battle-tested yet.

---

### 💰 Accountant

The Accountant's job splits into two halves: getting materials *into* the business (Purchasing/Vendors — needed very early, Phase 2, §5.1) and tracking money *out and around* the business (Expenses/Cash — needed later, Phase 6, §5.3, once there's real sales activity to reconcile against).

**1. Vendor Management** — *Phase 2*
- **What it does:** A directory of suppliers — name, phone, notes.
- **Why first:** "Vendor must exist first" is a hard rule (§5.1) — no inline vendor creation halfway through a purchase.

**2. Purchase Entry with Mandatory Bill Photo** — *Phase 2*
- **What it does:** Selects an existing vendor and item, enters quantity/cost, must attach a bill photo before submitting.
- **Example:** Accountant buys 50kg of Calcium for Rs. 15,000, uploads the receipt photo — the system instantly adds 50kg to Calcium stock and Rs. 15,000 to what's owed that vendor (§5.1).

**3. Vendor Payment Recording** — *Phase 2*
- **What it does:** A separate transaction from the purchase itself (§5.1) — reduces the vendor's payable.

**4. Expense Entry with Mandatory Receipt Photo** — *Phase 6*
- **What it does:** Logging categorized operating costs (§5.3), each requiring a receipt photo.
- **Why it waits:** Expenses only really matter once there's real revenue (Phase 4–5) to weigh them against.

**5. Counter/Spot Sales** — *Phase 6*
- **What it does:** Walk-in customers with their own containers — litres sold, caps issued, cash collected.

**6. Cash Collection Reports + Invoice Generation** — *Phase 6*
- **What it does:** A daily summary of everything collected across orders, counter sales, and other payments, plus formal invoice generation.

**7. Accountant-Specific Daily Closing** — *Phase 6, wired into Phase 7 (§4.5)*
- **What it does:** Confirms the day's financial entries are complete and final.

---

## 8. Aquasphere vs Wadaana Sequencing

- **Now:** Wadaana is a functional clone of Aquasphere (identical UI/backend, `Wadaana*` Prisma models mirror `Aquasphere*` 1:1). **Do not build Wadaana-specific screens until Aquasphere Phases 1–8 are done and stable.**
- **Phase 9** is a *rollout*, not a rebuild: same components, re-pointed at the `wadaana` DB context, with its own isolated users/auth ("Aquasphere has its own users, Wadaana has its own users").
- **Phase 11 (deferred):** Wadaana's *actual* differentiator — Pure/Mix preform tracking, Factory→Warehouse flow, brand-specific batches for Deosani/Pivrifine/Dasani — is explicitly called out in the master doc as **later phase** work. Don't pull this forward.

---

## 9. Why Order Desk (Marketing Manager) Isn't Phase 1

It's tempting to build the Marketing Manager side first since it's the highest-visibility, most-used daily screen. But per §4.1's core rule ("no manually-edited numbers — everything calculated from transaction history"):

- An order for PET packs is meaningless if no production batch has ever created finished-goods stock.
- A 19L order references bottle ledger balances (§4.3) that don't exist until bottles are purchased/tracked as assets.
- Credit-limit warnings need a customer record — trivial — but the soft-block math (§4.4) needs at least one prior order/payment to mean anything.

So Marketing Manager's *screens* can be scaffolded early (UI can be stubbed in parallel), but its *logic* genuinely depends on Purchasing (Phase 2) and Production (Phase 3) existing first. That's why it lands at Phase 4, immediately after those two.

---

## 10. Cross-Role Dependency Chain

```
Owner (setup, §Phase 1)
   └─► Accountant (Purchasing/Vendors, §5.1)
           └─► Production Manager (consumes raw material → makes finished goods)
                   └─► Marketing Manager (sells finished goods + 19L via orders)
                           └─► Marketing Manager (Delivery + Bottle Ledger, §4.3)
                                   └─► Accountant (Expenses, Cash, Customer Payments, §5.2–5.3)
                                           └─► Admin (verifies everything, locks the day, §4.5)
                                                   └─► Owner (profit/margin reporting on locked data, §5.4, §6)
```

Every arrow above is also an audit-trail relationship (§4.6) — each transaction downstream carries a trace back to the transaction that made it possible.

---

## 11. Open Items That Will Block Specific Phases

Resolve these **before** the phase listed, or the feature will need rework:

| # | Question | Blocks Phase |
|---|----------|---------------|
| 1 | Final spelling: "Deosai" vs "Deosani" | Phase 11 (Wadaana B2B) |
| 2 | Preform weights — 0.5L Mix (27g) vs 1.5L Mix (15g), confirm not swapped | Phase 11 |
| 3 | Is "Super Admin" the same as Owner, or a 4th tier? | Phase 0 (role enum) — **resolve immediately**, changes the auth schema and the §3 permission matrix |
| 4 | Exact shrink-wrap kg per PET pack | Phase 3 (production deduction formula) |
| 5 | Why PM draws raw preform from "Warehouse" (holds finished bottles per doc) | Phase 11 |
| 6 | Shrink wrap conversion factor | Phase 3 |
| 7 | Is there any "cancelled" order state, given §4.2 defines only delivery/payment tracks with no cancellation path? | Phase 4 — worth confirming with the client before order logic is finalized |

**Recommendation:** Question #3 should be answered before Phase 0 is finalized — it changes the `Role` enum and permission matrix that every later phase builds on top of.

---

## 12. Definition of "Done" per Phase

- **Phase 0:** A user can log in, land on the correct role-specific shell (§3 permission matrix enforced, not just role name), and switch company context without losing session. Inventory tables have no directly-editable quantity field anywhere in the schema (§4.1). Audit-log table exists and captures at least login/logout events.
- **Phase 2:** A purchase cannot be submitted without selecting an existing vendor (§5.1); submitting one visibly increases raw material stock and vendor payable in the same transaction, and both are logged to the audit trail.
- **Phase 3:** Logging a production batch deducts bottles/caps/labels/minerals using exact decimal fractions (no rounding) and increases finished-goods stock automatically (§4.1).
- **Phase 4–5:** An order can be placed, found via search, delivered (fully or partially), and every downstream number (customer balance §5.2, bottle balance §4.3, inventory, cash) updates without any manual step. Delivery status and payment status are independently correct even when they diverge (§4.2).
- **Phase 6:** An expense cannot be submitted without a receipt photo and a category (§5.3); expenses appear in profit calculations but never touch inventory counts.
- **Phase 7:** Admin can view the day's numbers, cannot see profit, and clicking "Close Day" locks every entry dated that day for every role except Owner (§4.5); the lock and any later Owner override are both visible in the audit trail (§4.6).
- **Phase 8:** Profit figure matches the §5.4 formula exactly when checked against raw purchase/production/order/expense data for the same period. All 8 report types (§6) return real, correct numbers, not placeholders.
- **Phase 9:** The exact same feature set exists under the Wadaana context with fully separate data, users, and branding — zero cross-contamination with Aquasphere.

---

*This document is the working companion to `prototype_system_documentation.md` (what the prototype already does) and `AQUA_Sphere_OS_Master_Requirements.md` (what the PERN rebuild must do). Update phase status here as work lands.*

---

## 13. Completed Work Log (Phase 0 & 1 Initiation)
**Date:** July 20, 2026

**1. Authentication & Security (Phase 0)**
- Migrated frontend auth from insecure `localStorage` mock to true JWT HTTP-only cookies communicating with `/api/v1/auth/me`.
- Implemented `ProtectedRoute` and `PublicRoute` wrappers in React Router to enforce strict access control (unauthorized users are kicked to `/login`, authenticated users bypass `/login`).

**2. Layout & UI Overhaul (Phase 1)**
- Scrapped the broken CSS templates and reset `index.css` to clean Tailwind defaults, fixing extreme width constraints and giant typography.
- Built a pixel-perfect replica of the client-approved prototype layout (TopNav, Sidebar, responsive Dashboard Grid).
- Replaced harsh black borders with soft `border-slate-200` globally for a premium enterprise feel.
- Added all requested navigation modules (`Counter Sales`, `Reports`, `Users & Roles`, `Settings`).

**3. Role-Based Dashboard Isolation (Phase 1)**
- Enforced strict data isolation based on the §3 permission matrix.
- `Est. Profit` strictly hidden from everyone except `OWNER`.
- Financial metrics (Cash, Credit, Expenses) hidden from operational roles (`ADMIN`, `PRODUCTION_MANAGER`).
- Added Chemical Stock Gauges (Calcium, Magnesium, Sodium) visible only to operational and owner roles.

**Next Steps:**
- Build out the actual data-fetching layer (React Query / Axios) to populate the Dashboard KPIs from the PostgreSQL database.
- Begin **Phase 2 (Purchasing & Vendors)** to allow the system to ingest raw materials so production and orders can function.
- ⚠️ Before continuing UI polish on Orders/Customers: confirm whether product-stock numbers currently shown are real (Phase 3 doesn't exist yet) or placeholder — reconcile against §4.1 (no manual/fake inventory numbers) before Expenses/Vendors work begins.
