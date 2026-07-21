# AQUA Sphere OS — Development & Feature Priority Plan

> **Compiled from:** `SYSTEM_DOCUMENTATION.md` (prototype), `AQUA_Sphere_OS_Master_Requirements.md` (master spec), `schema.prisma` + `base-models.prisma` (data model)
> **Purpose:** Decide **what gets built first, and on which side (Owner / Admin / Production Manager / Marketing Manager / Accountant)**, for both **Aquasphere** and **Wadaana Industries**.
> **Status:** Draft roadmap — ready for team review before sprint planning.

---

## 1. Guiding Build Principles

Before listing phases, three rules decide the *order*, not just the *list*:

1. **Follow the money's real path, not role importance.**
   Money/stock actually flows: `Vendor → Purchase → Raw Material → Production → Finished Goods → Order → Delivery → Payment → Daily Close → Reports`.
   Every "downstream" module is meaningless without the "upstream" one feeding it. So we build **in data-flow order**, even though Marketing Manager (Order Desk) is the most business-critical *daily* screen.

2. **Build once on Aquasphere, clone to Wadaana.**
   The schema (`schema.prisma`) is already a 1:1 prefixed mirror (`Aquasphere*` / `Wadaana*` from the same `__Prefix__` template in `base-models.prisma`), and the master doc confirms Wadaana currently **operates identically** to Aquasphere (§5.1). So: build every module fully on Aquasphere first, verify it, then stamp it out for Wadaana. Do **not** build both in parallel — that doubles bugs before either is proven.

3. **Foundation is Phase 0, invisible to all 5 sides, but blocks everyone.**
   Auth, roles, company-context switching, and the "no manual inventory edits — everything derived from transactions" engine (§6.1) are prerequisites for literally every screen. Nobody gets a feature before this exists.

---

## 2. High-Level Phase Roadmap

| Phase | Name | Primary Side(s) | Depends On | Key Deliverables |
|---|---|---|---|---|
| **0** | Foundation | *(none — infra)* | — | Auth + JWT sessions, 5 roles enum, company-context middleware (`aquasphere` vs `wadaana` DB routing), base navigation shell, transaction-derived inventory engine (no editable stock fields), daily-close lock table (schema only, no UI yet) |
| **1** | Owner Setup Tools | **Owner** | Phase 0 | User management (create/deactivate users per division), item/catalog seeding (chemicals, bottles, caps, labels, shrink wrap, preforms), reorder-level config (§6.5), Owner dashboard skeleton |
| **2** | Purchasing & Vendors | **Accountant** (primary), Owner (oversight) | Phase 1 | Vendor CRUD, "vendor must exist first" purchase rule (§10.1), Purchase entry with mandatory bill photo, auto-increment raw material stock + vendor payable, Vendor Payment recording |
| **3** | Production | **Production Manager** | Phase 2 (needs raw material in stock to consume) | Production batch entry (0.5L / 1.5L PET packs), automatic deductions (bottles, caps, labels, mineral sets — exact decimal fractions, §6.4), broken-bottle logging, finished-goods stock increase, PM dashboard/inventory view |
| **4** | CRM & Orders | **Marketing Manager** | Phase 1 (customers can exist independently) + Phase 3 (PET stock must exist for PET orders to make sense) | Customer CRUD (no delete), phone/name/ID search, "add customer inline" during order flow, 19L order + PET order (kept as separate order types, §7.4), dual independent status tracks (delivery vs payment, §7.5), soft-block credit-limit warnings |
| **5** | Deliveries & Bottle Ledger | **Marketing Manager** (entry) | Phase 4 | Delivery completion forms, partial-delivery support, bottle return validation (soft-block, §7.9), 19L Bottle Asset Ledger (Total Owned = Factory + Customer + Broken, §9.2), auto-updates to customer balance, inventory, cash, dashboard (§7.7) |
| **6** | Financial Entry (remainder) | **Accountant** | Phase 5 (deliveries generate the cash to record) | Expense entry (photo mandatory, §11.2), Counter/spot sales (litres, caps, cash), cash collection reports, invoice generation |
| **7** | Admin Verification Layer | **Admin** | Phases 3–6 (needs real data to supervise) | View-only dashboards (stock, production, orders — no profit/cost), Daily Closing verification workflow + lock (§4.2), WhatsApp/portal cross-check step |
| **8** | Owner Deep Analytics | **Owner** | Phase 7 | Full profit/margin reports, all report types (§12.2), daily-close override, bottle ledger reconciliation reports, credit-breach alert automation (WhatsApp/email, §8.3), inactivity alerts (§8.4) |
| **9** | Wadaana Mirror Rollout | **All 5 sides** (cloned) | Phases 1–8 fully stable on Aquasphere | Stamp out identical modules into `Wadaana*` schema/DB, separate auth/users per division, separate branding on invoices/alerts (§2.2) |
| **10** | Cross-Cutting Polish | *(all sides)* | Phase 9 | Google Maps integration for delivery routing, mobile-first responsiveness pass, order-entry speed tuning (<20s target, §7.1), photo upload hardening |
| **11** | Deferred / Future Scope | — | Everything above | Wadaana specialized B2B blowing logic (Pure/Mix preforms, Deosani/Pivrifine/Dasani-specific batches — §5.2), driver route assignment, public website management module, possible 4th "Super Admin" tier (pending confirmation, §14.1) |

---

## 3. Per-Side Feature Priority — Full Breakdown

This section explains **every feature, for every role, in plain language** — what it actually does on screen, why it's built in this order and not another, what it depends on, and a real-world example of it being used. Read this section even if you're not a developer — it's written so an owner, a manager, or a new team member can follow it just as easily as an engineer.

Within each side, features are built in the order listed. Where a feature says "waits on Phase X," it means: even though this is the Owner's (or PM's, or MM's) screen, it cannot work correctly until some *other* role's feature has produced real data first.

---

### 👑 Owner

The Owner is the only role with unrestricted access. Because everything else in the system reports up to the Owner, most of the Owner's *heavy* features (full reports, profit numbers) have to be built **last** — there's nothing to report on until other roles have entered data. What the Owner *does* get early is the power to set the whole system up.

**1. User & Role Management** — *Phase 1*
- **What it does:** A screen where the Owner creates a login for every staff member and assigns them one of the 5 roles (Owner, Admin, Production Manager, Marketing Manager, Accountant). Owner can also deactivate a user (e.g., someone leaves the company) without deleting their history.
- **Why first:** Nobody else can log in and use *any* feature in this whole system until this exists. It's the literal front door.
- **Example:** Owner hires a new order-desk employee → creates their account → picks "Marketing Manager" → that person can now log in and only sees order/customer screens, nothing financial.

**2. Item/Catalog & Reorder-Level Setup** — *Phase 1*
- **What it does:** Owner defines the master list of everything the business tracks — chemicals (Sodium, Calcium, Magnesium), empty bottles (0.5L, 1.5L, 19L), caps, labels, shrink wrap, preforms — and sets the "low stock" alert threshold for each (e.g., alert when Calcium drops below 10kg).
- **Why first:** Every other module (Purchasing, Production, Orders) refers back to this list. You can't buy "Calcium" or produce "0.5L PET packs" if those items don't exist in the system yet. This is the dictionary everyone else reads from.
- **Example:** Without this step, the Accountant's purchase form would have no dropdown of items to select — it'd be an empty form.

**3. Owner Dashboard — Basic KPIs (stub version)** — *Phase 1*
- **What it does:** A simple landing page for the Owner showing today's sales, cash, and expenses at a glance — just enough to confirm the system is alive and recording something.
- **Why now, not later:** It's cheap to build a placeholder version early, even though it'll show mostly zeros until other roles start entering real transactions. It gives the team something to point at during early demos.

**4. Full Dashboard with Profit/Margin + All Report Types** — *Phase 8*
- **What it does:** The real version — sales trends, profit margins (revenue minus cost of goods), cash flow, customer credit exposure, vendor payables, bottle-fleet reconciliation, all sliceable by day/week/month/year.
- **Why it waits until Phase 8:** Profit can't be calculated until purchases (cost), production (usage), orders (revenue), and payments (cash) have all actually happened. Building this earlier would just show fake or empty charts — worse than not having it at all, because it could be mistaken for real data.
- **Example:** "This month's profit margin on 0.5L PET was 18%" — that number only exists once real purchases, production, and sales for that month are in the database.

**5. Daily-Close Override Authority** — *Phase 8*
- **What it does:** Normally, once Admin "closes" a day, nobody can add or edit entries for that date. The Owner is the *one* exception — they can reopen a locked day to fix a genuine mistake (with the correction logged).
- **Why it waits:** This is a safety-valve feature on top of the daily-closing system, which itself only gets built in Phase 7. No point building an override for a lock that doesn't exist yet.

**6. Credit-Limit Editing, Manual Inventory Adjustment (logged), Website Settings** — *Phase 8+ / deferred*
- **What it does:** Owner-only powers to change a customer's credit limit, manually correct an inventory count when a physical stock-take finds a mismatch (always with a required reason note — never a silent edit), and manage the public website content.
- **Why last:** These are exception-handling tools, used occasionally, not daily-driver features. They're valuable but not urgent — the system needs to be running smoothly on its automatic calculations first, and website management is a separate concern entirely (marketing/PR, not day-to-day operations).

---

### 🛡️ Admin

Admin is a **supervisor, not an operator** — per the spec, Admin can *see* almost everything but can't create or edit daily transactions, and specifically cannot see profit or cost figures. This means Admin's entire job is to *watch other people's work and confirm it's correct*, which is exactly why Admin gets **nothing to do until Phase 7** — there's simply nothing to supervise until the other four roles have been entering real data for a while.

**1. Nothing until Phase 7 (by design)**
- **Why:** Building an Admin dashboard in Phase 1 would just be a screen showing "0 orders, 0 production, 0 stock" — not useful, and not testable. It's better to wait until the Marketing Manager, Production Manager, and Accountant sides are live and generating real daily activity.

**2. View-Only Dashboards: Stock, Production, Orders** — *Phase 7*
- **What it does:** Admin can see current stock levels, how much was produced today, and the day's order list — but every number is *read-only*. No edit buttons, no "profit" column anywhere on the screen.
- **Why now:** By Phase 7, Purchasing (Phase 2), Production (Phase 3), and Orders/Deliveries (Phase 4–5) are all live, so there's real, meaningful data to display.
- **Example:** Admin opens their dashboard mid-afternoon and sees "1.5L PET stock: 340 packs, 12 orders pending" — a real operational snapshot, not fabricated numbers.

**3. Daily Closing Verification + Lock Button** — *Phase 7*
- **What it does:** At the end of the day, Admin runs through a short checklist — stock numbers look right, production numbers look right, orders are all accounted for (cross-checked against WhatsApp reports from the field) — then clicks **"Close Day."** This locks every transaction dated that day so nobody (except Owner) can edit or backdate entries into it anymore.
- **Why this is Admin's job, not Owner's:** The spec treats this as a supervisory checkpoint — a second pair of eyes confirming the day's books are honest before they're sealed. It's the system's core anti-fraud/anti-mistake control.
- **Example:** At 8pm, Admin checks that today's 45 deliveries all match what the drivers reported on WhatsApp, then locks the day. Tomorrow, nobody can quietly go back and change yesterday's numbers.

**4. Cash Summary Without Profit Detail** — *Phase 7*
- **What it does:** Admin sees "Rs. 84,000 collected today" but never sees "Rs. 20,000 profit" — the system deliberately hides cost and margin data from this role at the query level, not just by hiding a UI element.
- **Why grouped with Phase 7:** It's part of the same view-only dashboard build — same data source, same restriction logic, makes sense to ship together.

---

### 🏭 Production Manager (PM)

The PM's whole job is turning raw materials into finished goods, so their features are built right after Purchasing exists (Phase 2) — because you can't log a production batch that consumes chemicals nobody has bought yet.

**1. Raw Material Inventory View** — *Phase 2 (read-only access as soon as Purchasing exists)*
- **What it does:** PM can see current stock of chemicals, empty bottles, caps, labels, and shrink wrap — but can't edit these numbers directly, only see them.
- **Why it slots into Phase 2:** The moment the Accountant starts recording purchases, there's real stock data worth showing the PM. This is a small, low-risk feature to ship early so the PM team can start getting familiar with the screen before batch-logging (the harder feature) is ready.

**2. Production Batch Entry — 0.5L / 1.5L Packs** — *Phase 3*
- **What it does:** PM logs "we made 200 packs of 0.5L today" and "150 packs of 1.5L." This is the single most important PM action — it's the trigger for everything else in this section.
- **Why this is the core Phase 3 feature:** Without this, there's no finished-goods stock for the Marketing Manager to sell in Phase 4. This is the bottleneck feature the whole rest of the roadmap waits behind.
- **Example:** PM enters "0.5L pack: 200 made" at the end of a shift, hits submit — the system does the rest automatically (see next item).

**3. Auto-Deduction Formulas (minerals, bottles, caps, labels)** — *Phase 3*
- **What it does:** The moment a batch is submitted, the system automatically calculates and subtracts exactly how much raw material that batch used — using exact decimal fractions, never rounded (per the spec's "no cumulative drift" rule). For example: 200 packs of 0.5L (12 bottles/pack = 2,400 bottles) consumes 2,400 empty bottles, 2,400 small caps, 2,400 × 6.72g of label material, and a precise fraction of a mineral set based on 2,400 × 9 litres of water treated.
- **Why this has to be automatic, not manual entry:** The master spec's #1 architectural rule is "no manually-edited inventory numbers — everything calculated from transaction history." If PM had to manually type in "used 2,400 bottles," human error (or dishonesty) could silently corrupt stock counts. The formula removes that risk entirely.
- **Example:** PM doesn't do any math — they just enter "200 packs made," and the system quietly does 12 different subtractions correctly, every time.

**4. Broken-Bottle Logging** — *Phase 3*
- **What it does:** During production, some bottles crack or get damaged. PM logs these separately from "good" production so they're written off as waste, not lost silently.
- **Why bundled into Phase 3:** It's a small side-feature of the same batch-entry screen — same form, one extra field, no reason to split it into its own phase.

**5. Finished-Goods & Production History View** — *Phase 3*
- **What it does:** PM (and later, Admin/Owner) can look back and see "on July 15th, we made 180 packs of 0.5L, using X kg of minerals, with 4 broken bottles" — a full audit trail of every batch ever logged.
- **Why last within Phase 3:** It's a reporting layer on top of batch entry — needs batch entry to exist first before there's any history to show.

**6. PM-Specific Daily Closing** — *Phase 3, wired into the Phase 7 lock system*
- **What it does:** At end of shift, PM confirms their production numbers are final for the day (similar spirit to Admin's day-lock, but scoped to just the production side).
- **Why it's listed here but tied to Phase 7:** The *button* can exist early, but it only becomes meaningful once the overall daily-close locking mechanism (built in Phase 7) is in place to actually enforce "no more edits after this point."

---

### 📞 Marketing Manager (Order Desk)

This is the highest-traffic, most time-sensitive screen in the whole system — the spec explicitly targets **under 20 seconds per order** once the customer is found. But it can only start once customers can exist (Phase 1 setup) and finished goods exist to sell (Phase 3 production). That's why it lands at Phase 4, not Phase 1, even though it's arguably the most "visible" feature to the business.

**1. Customer Search (phone / name / ID)** — *Phase 4*
- **What it does:** A single search box — no scrolling through a customer list. Type a phone number, name, or ID, and the matching customer's profile pops up instantly: name, balance owed, how many 19L bottles they're currently holding, last delivery date, and average monthly order volume.
- **Why search-only, no browse list:** The spec is explicit about this — for a business fielding phone orders all day, scrolling through hundreds of customers wastes time. Search is faster and matches how the order desk actually works (someone calls, gives their number, done).
- **Example:** Customer calls in, MM types their phone number, and within a second sees "Ahmed — owes Rs. 1,200, holding 3 bottles, last order 4 days ago."

**2. Add-Customer-Inline Modal** — *Phase 4*
- **What it does:** If the search comes up empty (new customer), a small popup form opens *right there in the order screen* — name, phone, address, GPS pin, home photo, customer type, credit limit — without leaving the order flow. Once saved, the order screen auto-selects the new customer and MM continues placing the order.
- **Why it matters:** Without this, a new customer's first-ever call would require MM to abandon the order screen, go create a customer somewhere else, then come back and start the order over. That's slow and error-prone — this keeps it as one continuous flow.

**3. Order Creation — 19L and PET Kept as Two Separate Order Types** — *Phase 4*
- **What it does:** MM enters product, quantity, price, and expected delivery date. Critically, a single order is *either* a 19L refill order *or* a PET pack order — never mixed. Each has its own simple form matched to what it needs (19L needs bottle-return tracking later; PET doesn't).
- **Why they're kept separate, not combined:** The two products have completely different downstream logic — 19L consumes water/minerals at *delivery* time and involves bottle returns; PET consumes them at *production* time and has no return logic. Merging them into one order type would force every order form to carry fields that only make sense for one product, slowing down data entry and inviting mistakes.

**4. Credit Soft-Block Warning on Order Entry** — *Phase 4*
- **What it does:** If placing this order would push a customer over their credit limit, MM sees a clear warning showing their current balance, the limit, and what the new balance would be — but MM can still confirm and proceed. The system never hard-blocks the order.
- **Why soft-block, not hard-block:** The spec is explicit — "the front desk must never get stuck mid-call because of a system restriction." A hard block could lose a sale or damage a customer relationship over a temporary/small overage; a warning still protects the business while trusting the human to make the judgment call.
- **Example:** A regular distributor customer is Rs. 300 over their limit but always pays on time — MM sees the warning, decides to proceed anyway, and the order goes through with the overage logged.

**5. Delivery Completion + Bottle Return Validation** — *Phase 5*
- **What it does:** When a driver returns from a delivery, MM (or whoever logs it) records: how many bottles/packs were actually delivered, how many empty 19L bottles came back (split into "good" vs "broken"), and how much cash was collected. The system checks the returned-bottle count against what that customer is actually known to be holding — if someone tries to return more bottles than the customer has, it warns and requires explicit confirmation before accepting it.
- **Why this is Phase 5, one step after order creation:** An order has to exist before it can be delivered. This is literally the next step in the same workflow, so it's the very next phase.
- **Example:** Customer is recorded as holding 10 bottles; the delivery form tries to log 15 returned — system stops and asks "are you sure? this customer's recorded balance is only 10" rather than silently accepting a number that breaks the bottle-ledger math.

**6. Inactivity "Requires Follow-Up" Alerts** — *Phase 8*
- **What it does:** If a customer hasn't ordered anything in 7 days, they automatically get flagged on the MM's dashboard as needing a follow-up call.
- **Why it waits until Phase 8:** This needs a background rule that watches order history over time — it only becomes meaningful once there's enough real order history (multiple weeks) to actually detect a gap. Building it in Phase 4 would have nothing to check against yet.

**7. Order-Speed Optimization Pass** — *Phase 10*
- **What it does:** A dedicated round of UI polish — fewer clicks, smarter defaults (e.g., pre-filling last order's product/price), bigger touch targets for phone use — specifically aimed at hitting the sub-20-second target.
- **Why last:** You can't optimize the speed of a workflow that isn't finished and battle-tested yet. This phase assumes Phases 4–5 are already working correctly, and now it's just about making a working feature *fast*.

---

### 💰 Accountant

The Accountant's job splits into two halves: getting materials *into* the business (Purchasing/Vendors — needed very early, Phase 2) and tracking money *out and around* the business (Expenses/Cash — needed later, Phase 6, once there's real sales activity to reconcile against).

**1. Vendor Management** — *Phase 2*
- **What it does:** A simple directory of suppliers — name, phone, notes. Nothing fancy.
- **Why first for the Accountant:** Per the spec's hard rule, "a purchase can only be recorded against a vendor that already exists — no inline vendor creation halfway through a purchase." So vendors must exist before the very next feature (Purchasing) can function at all.

**2. Purchase Entry with Mandatory Bill Photo** — *Phase 2*
- **What it does:** Accountant selects an existing vendor, selects an item (from the Owner's Phase 1 catalog), enters quantity and unit cost, and **must** attach a photo of the physical bill/receipt before the form can be submitted — no text-only purchase entries allowed.
- **Why this is Phase 2's centerpiece:** This is the very first way raw material stock enters the system at all. Nothing downstream — Production, Orders, anything — has real inventory to work with until purchases start flowing in.
- **Example:** Accountant buys 50kg of Calcium from "ABC Chemicals" for Rs. 15,000, snaps a photo of the paper receipt, uploads it — the system instantly adds 50kg to Calcium stock and adds Rs. 15,000 to what's owed to ABC Chemicals.

**3. Vendor Payment Recording** — *Phase 2*
- **What it does:** Recorded as a separate transaction from the purchase itself — paying a vendor doesn't automatically happen at purchase time (purchases aren't assumed "paid in full"). This reduces that vendor's outstanding payable.
- **Why grouped with Purchase Entry:** Same screen family, same data (vendor payables) — makes sense to build together in the same sprint.

**4. Expense Entry with Mandatory Receipt Photo** — *Phase 6*
- **What it does:** Logging operating costs — fuel, salaries, electricity, plant rent, vehicle/machine repairs, miscellaneous — each one requiring a photo of the receipt (or a photo of a handwritten paper ledger with typed details added below it). These expenses reduce profit on reports but **never touch inventory** — they're a purely financial record.
- **Why it waits until Phase 6, not grouped with Purchasing in Phase 2:** Expenses only really matter once there's real revenue (from Phase 4–5 orders/deliveries) to weigh them against. Also, technically, Purchasing (Phase 2) is more urgent because Production (Phase 3) can't function without it — Expenses have no such downstream dependency, so they can safely wait.

**5. Counter/Spot Sales** — *Phase 6*
- **What it does:** Walk-in customers who show up with their own containers (not standard bottles) — Accountant logs litres sold, caps issued, and cash collected on the spot.
- **Why grouped with Expenses:** Both are "Accountant's daily cash-desk" features, naturally built in the same batch of work once the core order/delivery pipeline (Phase 4–5) is stable.

**6. Cash Collection Reports + Invoice Generation** — *Phase 6*
- **What it does:** A daily summary of everything collected in cash across orders, counter sales, and any other payments, plus the ability to generate a formal invoice for a customer/order.
- **Why last in this group:** It's a reporting layer that reads from everything else (Purchases, Expenses, Counter Sales, Orders) — needs all of that data flowing before it can summarize anything meaningfully.

**7. Accountant-Specific Daily Closing** — *Phase 6, wired into Phase 7*
- **What it does:** Similar concept to PM's daily closing — Accountant confirms their financial entries for the day are complete and final.
- **Why tied to Phase 7:** Same reasoning as PM's — the button can exist early, but only becomes a *real lock* once Admin's overall daily-closing mechanism (Phase 7) is built to actually enforce it.

---

## 4. Aquasphere vs Wadaana Sequencing

- **Now:** Wadaana is a functional clone of Aquasphere (§5.1 confirms identical UI/backend, `Wadaana*` Prisma models mirror `Aquasphere*` 1:1). **Do not build Wadaana-specific screens until Aquasphere Phases 1–8 are done and stable.**
- **Phase 9** is a *rollout*, not a rebuild: same components, re-pointed at the `wadaana` DB context, with its own isolated users/auth per §2.2 ("Aquasphere has its own users, Wadaana has its own users").
- **Phase 11 (deferred):** Wadaana's *actual* differentiator — Pure/Mix preform tracking, Factory→Warehouse flow, brand-specific batches for Deosani/Pivrifine/Dasani — is explicitly called out in the master doc as **later phase** work (§5.2). Don't pull this forward; it adds real complexity (weight-based deductions, brand mapping) that the current Wadaana mirror doesn't need to launch.

---

## 5. Why Order Desk (Marketing Manager) Isn't Phase 1

It's tempting to build the Marketing Manager side first since it's the highest-visibility, most-used daily screen. But per the schema and master doc's own rule (§6.1, "no manually-edited numbers — everything calculated from transaction history"):

- An order for PET packs is meaningless if no production batch has ever created finished-goods stock.
- A 19L order references bottle ledger balances that don't exist until bottles are purchased/tracked as assets.
- Credit-limit warnings need a customer record — trivial — but the *soft-block math* needs at least one prior order/payment to mean anything.

So Marketing Manager's *screens* can be scaffolded early (UI can be stubbed in parallel), but its *logic* genuinely depends on Purchasing (Phase 2) and Production (Phase 3) existing first. That's why it lands at Phase 4, immediately after those two.

---

## 6. Cross-Role Dependency Chain

```
Owner (setup)
   └─► Accountant (Purchasing/Vendors)
           └─► Production Manager (consumes raw material → makes finished goods)
                   └─► Marketing Manager (sells finished goods + 19L via orders)
                           └─► Marketing Manager (Delivery + Bottle Ledger)
                                   └─► Accountant (Expenses, Cash, Invoices)
                                           └─► Admin (verifies everything, locks the day)
                                                   └─► Owner (profit/margin reporting on locked data)
```

---

## 7. Open Items That Will Block Specific Phases

Pulled from the master doc's §14 — resolve these **before** the phase listed, or the feature will need rework:

| # | Question | Blocks Phase |
|---|----------|---------------|
| 1 | Final spelling: "Deosai" vs "Deosani" | Phase 11 (Wadaana B2B) |
| 2 | Preform weights — 0.5L Mix (27g) vs 1.5L Mix (15g), confirm not swapped | Phase 11 |
| 3 | Is "Super Admin" the same as Owner, or a 4th tier? | Phase 0 (role enum) — **resolve immediately**, changes the auth schema |
| 4 | Exact shrink-wrap kg per PET pack | Phase 3 (production deduction formula) |
| 5 | Why PM draws raw preform from "Warehouse" (holds finished bottles per doc) | Phase 11 |
| 6 | Shrink wrap conversion factor | Phase 3 |

**Recommendation:** Question #3 should be answered before Phase 0 is finalized — it changes the `Role` enum and permission matrix that every later phase builds on top of.

---

## 8. Definition of "Done" per Phase

- **Phase 0:** A user can log in, land on the correct role-specific shell, and switch company context without losing session. Inventory tables have no directly-editable quantity field anywhere in the schema.
- **Phase 2:** A purchase cannot be submitted without selecting an existing vendor; submitting one visibly increases raw material stock and vendor payable in the same transaction.
- **Phase 3:** Logging a production batch deducts bottles/caps/labels/minerals using exact decimal fractions (no rounding) and increases finished-goods stock automatically.
- **Phase 4–5:** An order can be placed, found via search, delivered (fully or partially), and every downstream number (customer balance, bottle balance, inventory, cash) updates without any manual step.
- **Phase 7:** Admin can view the day's numbers, cannot see profit, and clicking "Close Day" locks every entry dated that day for every role except Owner.
- **Phase 9:** The exact same feature set exists under the Wadaana context with fully separate data, users, and branding — zero cross-contamination with Aquasphere.

---

*This document is the working companion to `SYSTEM_DOCUMENTATION.md` (what the prototype already does) and `AQUA_Sphere_OS_Master_Requirements.md` (what the PERN rebuild must do). Update phase status here as work lands.*
