# Project Requirements — AQUA Sphere OS

## 1. Project Overview

AQUA Sphere OS is a custom business management system for AQUA Sphere, a drinking water manufacturing and distribution company. The company runs three business divisions:

1. **19L Reusable Water Bottles** — delivered to homes, offices, restaurants, shops, and distributors. Bottles are refilled at the moment of delivery, so there is no finished-goods stock for this division — instead, the company must track the reusable bottles themselves as they move between the factory and customers.
2. **Packaged Water (PET Bottles)** — 0.5L and 1.5L bottles, produced in advance and stored as finished goods until sold.
3. **Blowing Machine Division** — production of preform-based bottles for three companies (Aqua Sphere, Deosai, Pivrifine), tracked completely separately from Divisions 1 and 2.

Today, the business runs on manual records and phone calls. AQUA Sphere OS replaces this with one web-based system that the front-desk operator, the accountant, and the owner can all use — at the same time — to manage customers, orders, deliveries, inventory, production, purchasing, expenses, and reporting.

The system is being built as a simple, honest reflection of how this business actually works — not a generic off-the-shelf inventory or ERP template.

## 2. Business Goals

- Replace manual/phone-based order-taking with a system that shows the operator everything they need about a customer in one glance.
- Make every number in the system (inventory, bottle counts, customer balances, vendor balances) trustworthy — calculated from real transaction history, never manually typed in and edited.
- Give the owner a live, accurate picture of the business (sales, cash, profit, stock, bottles) from a phone, at any time.
- Reduce mistakes and disputes around 19L bottle counts, which are the company's own physical assets and easy to lose track of.
- Keep front-desk operations fast — an order should take under 20 seconds to place once the customer is found.
- Keep running costs low by using cloud services with generous free tiers rather than dedicated paid servers, at least in the early stages.

## 3. What to Build

- A cloud-hosted, mobile-responsive web application usable from a phone or an office PC.
- Customer profile management (create, search, view, edit, delete).
- Order management for two separate order types: 19L orders and PET orders.
- Delivery completion workflow that updates bottle balances, inventory, cash, and customer balances automatically.
- A bottle asset ledger for the 19L bottles (total owned, at factory, with customers, broken, lost).
- Raw material inventory tracking with automatic deductions tied to production and delivery.
- Automatic water and mineral-set consumption calculations (no manual math by any operator).
- PET production batch entry (operator enters only pack quantities; everything else is derived).
- Purchasing and vendor management, including partial vendor payments.
- Operating expense tracking (fuel, salaries, electricity, rent, repairs, etc.).
- An owner-facing live dashboard (sales, cash, profit, pending orders, stock levels, bottle summary).
- Daily/weekly/monthly/yearly reports across sales, profit, expenses, inventory, production, and balances.
- Role-based access for Operator/Accountant vs. Owner.
- Support for multiple people using the system at the same time without data conflicts.
- A soft-block system: warn on risky actions (credit limit exceeded, more bottles returned than held, stock going negative) but never hard-stop the operator mid-call.

## 4. What NOT to Build (for now)

- No individual bottle serialization (barcodes/QR codes per bottle) — bottles are tracked in bulk counts per customer. The data model should leave room to add this later, but it is not needed now.
- No driver/route assignment or dispatch planning — deliveries stay informally assigned for this phase.
- No native mobile app (iOS/Android) — a responsive web app is sufficient.
- No on-site server or self-hosted infrastructure — the system must be cloud-hosted.
- No manual editing of any inventory count, bottle count, or balance field anywhere in the system — every figure must come from a transaction record.
- No mixing of 19L and PET items within a single order — they remain two separate order types.
- No automatic "lost bottle" detection — marking a bottle lost must always be a deliberate, manual action.
- Full reports module detail, exact label/shrink-wrap conversion factors, and formal price-history are open items — not required for the first build phase (see Section 10, Future Scope).

## 5. Target Users

- **Front-desk operator** — takes phone orders, looks up customers, records deliveries and payments, checks pending orders.
- **Accountant** — handles vendor payments, expenses, and financial records; generally should not see profit margins.
- **Owner** — oversees the whole business, mainly through the dashboard and reports, primarily from a phone.
- **Customers** (indirect users) — homes, restaurants, shops, and distributors who place recurring 19L and PET orders. They do not log into the system directly; they interact with the operator by phone.

## 6. User Roles

| Role | Access |
|---|---|
| **Operator / Accountant** | Order desk, customer lookup, delivery completion, payments, purchasing, vendor balances, expenses, and reports. Does **not** necessarily see profit margins. |
| **Owner / Admin** | Full visibility — dashboard, all reports, profit figures, and system/security setup. Can reset an accountant's password, with the accountant's permission. Primarily accesses the system from a phone. |

The system must support at least these two role levels, with separate logins, and must allow multiple people to work in the system at the same time safely.

## 7. Core Features

1. **Customer Management** — permanent customer profiles (ID, name, phone as unique lookup key, address, map location, type, deposit, default price, credit limit, remarks, and an optional photo of the house for the delivery driver). Create, search (by ID/name/phone), edit, and delete.
2. **Order Management** — fast phone-order entry for 19L and PET orders separately, with two independent status tracks per order: delivery status (pending → partial → delivered) and payment status (unpaid → partial → paid).
3. **Delivery Completion** — recording quantity delivered, bottles returned (good/broken), cash received, and payment method; this single action automatically updates bottle balances, customer balances, inventory, cash/profit figures, and the dashboard.
4. **Bottle Asset Ledger** — an append-only log of every bottle movement (delivery, return, breakage, loss, new purchase), from which all bottle balances (total owned, at factory, with customers, broken, lost) are always calculated, never stored as an editable number.
5. **Raw Material & Mineral Set Tracking** — automatic, exact-fraction deduction of raw materials and mineral sets at the correct time (production time for PET, delivery time for 19L).
6. **Production Batches** — operator enters only the number of 0.5L and 1.5L packs produced; the system derives all raw material deductions and finished-goods increases.
7. **Purchasing & Vendor Management** — recording purchases (which increase stock and vendor payables) and vendor payments (which reduce payables) as separate transaction types.
8. **Operating Expenses** — fuel, salaries, electricity, rent, repairs, and miscellaneous expenses, which affect profit but never inventory.
9. **Credit & Soft-Block Warnings** — warnings (not hard blocks) when a credit limit would be exceeded, when a bottle return exceeds a customer's held balance, or when raw material stock would go negative.
10. **Dashboard** — live view of today's sales, cash collection, credit sales, expenses, profit estimate, pending/completed orders, outstanding balances, inventory levels with low-stock flags, and the 19L bottle summary.
11. **Reports** — daily, weekly, monthly, and yearly views of sales, profit, expenses, inventory, production, customer credit, vendor balances, bottle summary, and pending orders.
12. **Counter Sales** — direct, walk-in sales recorded by litres, caps, and cash/credit.
13. **Invoicing** — generating a bill/invoice for an order.
14. **Customer Reminders** — an alert when a customer hasn't placed an order in a set period (e.g. one week), so the operator can follow up.
15. **Daily Closing** — once a day is closed, its records become locked and cannot be edited by the accountant.

## 8. Functional Requirements

### Customers
- Store: Customer ID (auto-generated), name, phone number (unique), address, map link/coordinates, customer type (Home / Restaurant / Shop / Distributor), security deposit (in 19L bottles), default selling price (optional, suggested only), credit limit, remarks, and an optional exterior house photo.
- Search customers by ID, name, or phone number.
- On finding a customer, immediately display: name, phone, address, outstanding balance, current 19L bottle balance, last delivery date, and average monthly orders — all without extra clicks.
- Support full create/edit/delete of customer records.

### Orders
- Two distinct order types — 19L and PET — that are never mixed within one order.
- 19L order fields: quantity ordered, amount charged, expected delivery date, remarks.
- PET order fields: number of 0.5L PETs, number of 1.5L PETs, amount charged, expected delivery date, remarks.
- Maintain two independent statuses per order — delivery status and payment status — each recomputed from the underlying delivery/payment records, not stored as a single flag.
- Maintain a live "Pending Orders" list (delivery status pending or partial), visible to both operator and owner.
- Support multiple partial deliveries against a single order over time.

### Deliveries
- On delivery completion, capture: quantity delivered, (for 19L) good and broken bottles returned, cash received, payment method, and remarks.
- Automatically recompute delivery status and payment status, update the customer's bottle balance and outstanding balance, deduct raw materials (Large Caps and Mineral Sets for 19L), reduce finished-goods inventory (for PET), update cash/profit figures, update the customer's last delivery date and average monthly orders, and refresh the dashboard and reports.
- Enforce that a customer cannot return more bottles than their calculated current balance — show a warning with their actual balance and require explicit confirmation before allowing it.

### Inventory & Bottle Ledger
- Raw materials tracked: 0.5L and 1.5L empty PET bottles, small caps, large caps, labels (by kg), shrink wrap (by kg), and mineral sets. Fuel is an expense, not inventory.
- Mineral Sets: 1 set = 2kg Calcium + 1kg Magnesium + 0.5kg Sodium, and treats a fixed volume of water (value to be confirmed with the owner — see Section 10).
- Water use per unit: ~23L per 19L bottle filled, ~9L per 0.5L PET bottle, ~12L per 1.5L PET bottle. Mineral set consumption must always be calculated as an exact decimal fraction, never rounded.
- PET raw-material and mineral consumption happens at production time; 19L Large Cap and mineral consumption happens at delivery time (since 19L bottles are never produced ahead of time).
- The 19L bottle asset ledger is append-only; total owned, at-factory, with-customers, and broken figures must always reconcile, and lost bottles are written off only through a deliberate manual action.
- No inventory quantity, bottle count, or balance is ever directly editable — all figures are calculated from transaction history. Mistakes are corrected via an explicit adjustment/reversal transaction with a required reason.
- Configurable low-stock reorder levels per item, shown as alerts on the dashboard.

### Production (PET only)
- Operator enters only: number of 0.5L packs produced and number of 1.5L packs produced.
- The system automatically derives and applies: empty bottle deduction, cap deduction, label and shrink-wrap deduction (via conversion factors), mineral set deduction (exact fraction), and finished-goods increase.

### Purchasing & Vendors
- Recording a purchase automatically increases the relevant raw material inventory and the vendor's outstanding payable.
- Vendor payments are recorded separately from purchases and reduce the payable — purchases are not assumed paid in full at purchase time.
- New 19L bottle purchases (fleet growth) go into the bottle asset ledger, not regular inventory, since bottles are a durable asset.

### Credit & Warnings (Soft-Block Philosophy)
- Before placing an order, check (existing outstanding balance + new order amount) against the customer's credit limit; if exceeded, warn with current balance, limit, and new balance, but allow the operator to proceed.
- A credit limit of zero means "no limit," not "block everything."
- If any transaction would take raw material stock below zero, warn but still allow it to be recorded.
- The system should never hard-block the operator mid-call.

### Dashboard & Reporting
- Live dashboard: today's sales, cash collection, credit sales, expenses, estimated profit, pending/completed orders, outstanding customer and vendor balances, raw material and finished-goods inventory with low-stock flags, and the full 19L bottle summary.
- Daily, weekly, monthly, and yearly reports covering sales, profit, expenses, inventory, production, customer credit, vendor balances, bottle summary, and pending orders.
- Once a day is closed, its records cannot be edited by the accountant.

### Access & Concurrency
- Separate logins for Operator/Accountant and Owner/Admin roles.
- Admin can reset an accountant's password with the accountant's permission.
- Multiple users must be able to work at the same time without producing an impossible or conflicting state — any action that reads a balance and then writes to it must be handled safely at the database level (transactions/locking).

## 9. Non-Functional Requirements

- **Platform**: Web application only, not native mobile or desktop, genuinely mobile-responsive (the owner's primary access point is a phone).
- **Hosting**: Cloud-hosted, accessible from anywhere, no on-site server to maintain.
- **Cost**: Favor low/no-cost hosting (e.g. a managed Postgres free tier plus a free-tier app host) until usage outgrows it.
- **Performance/UX**: Every operator action should be fast — placing an order should take under 20 seconds once the customer is found; large touch targets and minimal clicks for phone use.
- **Data integrity**: Every change must be traceable through transaction history — this underpins trust in every number the system shows.
- **Concurrency**: The system must behave correctly when multiple people (operator, owner, accountant) use it at the same time.
- **Auditability**: No back-door edits to balances or inventory — only transactions and explicit, reasoned adjustments.
- **Security**: Role-based access control, with admin-level password reset requiring accountant permission.

## 10. Future Scope

The following are intentionally deferred and should be revisited later:

- Exact label and shrink-wrap conversion factors (kg consumed per PET pack) — to be provided by the owner.
- Confirming the correct mineral-set water-treatment volume — the written blueprint says 13,248 litres per set, but handwritten notes say 15,140 litres; this discrepancy must be resolved with the owner before go-live.
- A formal price-history mechanism beyond the per-order-item price snapshot, e.g. generating historical reports at a customer's rate as of a past date.
- Full detail of the Reports module — exact layouts for daily/weekly/monthly/yearly rollups, to be worked out with the owner once core workflows are stable.
- Driver/route assignment and delivery dispatch planning.
- Individual bottle serialization (barcode/QR per bottle) for more precise loss auditing, if the business decides it's worth the added overhead later.
- Company website (aquasphere.org) optimization and a public-facing site with customer info, reviews, "work with us," and "find us" sections.
- Full build-out of Division 3 (Blowing Machine) — production, inventory, and sales tracking for Aqua Sphere, Deosai, and Pivrifine, kept fully separate from Divisions 1 and 2.

### Suggested Build Order

- **Phase 1**: Customers, item master, core inventory ledger, 19L order desk + delivery + bottle ledger, PET order desk + delivery, basic dashboard.
- **Phase 2**: Purchasing, vendors, production batches with automatic raw-material/mineral deduction, operating expenses, expanded dashboard (stock levels, low-stock alerts, profit).
- **Phase 3**: Full reports module, price history (if needed), and refinements to user roles/permissions.
