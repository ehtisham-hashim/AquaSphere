**AQUA SPHERE OS**

Software Blueprint & Functional Specification

July 2026

# **1. Business Overview**

AQUA Sphere is a drinking water manufacturing and distribution company
with two distinct business divisions. The software must reflect the real
workflow of this business --- not a generic inventory/ERP template.

## **1.1 Division 1 --- 19L Reusable Water Bottles**

The company delivers purified water in reusable 19-litre bottles to
homes, offices, and other customers. Critically, filled 19L bottles are
never held in stock --- bottles are filled immediately at the moment of
delivery. There is therefore no \"finished goods inventory\" for this
division.

What must be tracked instead is the movement of the reusable bottles
themselves, which are a company-owned physical asset that circulates
between the factory and customers:

-   Total company-owned bottles

-   Bottles currently available at the factory

-   Bottles currently out with customers

-   Bottles broken (returned damaged, no longer usable)

-   Bottles lost (never returned, written off)

These figures must always reconcile: at-factory + with-customers +
broken always equals total company-owned (lost bottles are written off
and excluded from total-owned).

## **1.2 Division 2 --- Packaged Water (PET Bottles)**

The company also manufactures packaged drinking water in two SKUs,
produced and stored before sale --- this division does maintain finished
goods inventory:

-   0.5L PET --- sold in packs of 12 bottles

-   1.5L PET --- sold in packs of 6 bottles

## **1.3 Division 3 --- Blowing Machine**

## Raw: Pure preform, mix preform

## Bottles: Three companies: Aqua Sphere, deosai, pivrifine

## (all the sale and purchase of this division will be separate from the first two divisions. Whatever is explained for them, will be applied to this division too but separately.)

# **2. Raw Materials**

The following raw materials are purchased and consumed. Fuel is an
operating expense, not inventory.

-   0.5L Empty PET Bottles

-   1.5L Empty PET Bottles

-   Small Caps (used on both PET sizes)

-   Large Caps (used on 19L bottles, at the moment of delivery/filling)

-   Labels (purchased and consumed by weight, kg)

-   Shrink Wrap (purchased and consumed by weight, kg)

-   Mineral Sets (see Section 3 --- a bundled abstraction, not tracked
    as separate minerals)

# **3. Water & Mineral Set Calculation**

Calcium, magnesium, and sodium are not tracked as separate raw
materials. Instead the company purchases and tracks \"Mineral Sets\":

-   One Mineral Set = 2 kg Calcium + 1 kg Magnesium + 0.5 kg Sodium

-   One Mineral Set treats 13,248 litres of water

Water consumption rates per unit sold:

-   One 19L bottle sold/filled ≈ 23 litres

-   One 0.5L PET bottle produced ≈ 9 litres

-   One 1.5L PET bottle produced ≈ 12 litres

The system must calculate total water used and automatically deduct the
corresponding fraction of Mineral Sets --- no operator ever enters this
by hand.

*Decision already made: mineral set consumption must be stored as an
exact decimal fraction and never rounded. Rounding at each transaction
compounds error across thousands of transactions; exact fractions summed
over time are accurate.*

*Important timing distinction, worked out during design review: PET
water/mineral consumption happens at PRODUCTION time (bottles are made
and stored). 19L water/mineral consumption happens at DELIVERY time,
because 19L bottles are filled only when delivered, not produced in
advance. The same applies to Large Cap consumption for 19L --- it
happens at delivery, not at any \"production\" step, because there is no
19L production step.*

# **4. Production Rules (PET only)**

The operator must be able to enter only two numbers per production run:

-   Number of 0.5L PET packs produced

-   Number of 1.5L PET packs produced

Everything else is derived automatically. For every 0.5L PET pack (12
bottles) produced, the system must:

-   Reduce 0.5L empty bottle inventory by 12

-   Reduce Small Cap inventory by 12

-   Reduce Label inventory using a conversion factor (kg per pack)

-   Reduce Shrink Wrap inventory using a conversion factor (kg per pack)

-   Reduce Mineral Set inventory by the exact fraction for 12 × 9 litres

-   Increase 0.5L PET finished goods inventory by 1 pack

For every 1.5L PET pack (6 bottles) produced, the same pattern applies
using its own quantities (6 bottles, 6 caps) and 6 × 12 litres of water.

*Open item: the exact label and shrink-wrap conversion factors (kg
consumed per pack) will be provided later.*

# **5. Customer Management**

Each customer has a permanent profile, entered once and reused on every
future order:

-   Customer ID (system-generated)

-   Name

-   Phone Number (must be unique --- this is the primary lookup key on
    incoming calls)

-   Address

-   Google Maps Location (link or coordinates)

-   Customer Type: Home / Restaurant / Shop / Distributor

-   Security Deposit (in 19L bottles, if the business collects one)

-   Default Selling Price (optional --- used as a suggested default at
    order time, not locked)

-   Credit Limit (used to warn, not block, at order time --- see Section
    8)

-   Remarks (free text)

# **6. Order Management**

Every phone call creates a new order. The operator searches by phone
number or name and must see, immediately, without further clicks:

-   Customer name, phone, address

-   Outstanding balance

-   Current 19L bottle balance (how many the customer currently holds)

-   Last delivery date

-   Average monthly orders

Target: placing an order should take under 20 seconds once the customer
is found. Design the order screen around that constraint --- minimal
required fields, sensible defaults, no unnecessary navigation.

## **6.1 Order Types**

*Decision already made: 19L orders and PET orders are kept as two
separate order types --- a single order does not mix both.*

For a 19L order, the operator enters: quantity ordered, amount charged,
expected delivery date, remarks.

For a PET order, the operator enters: number of 0.5L PETs, number of
1.5L PETs, amount charged, expected delivery date, remarks.

## **6.2 Order Status**

Two independent status tracks must be maintained per order --- do not
model this as a single linear pipeline:

-   Delivery status: pending → partial → delivered

-   Payment status: unpaid → partial → paid

*Why independent: a distributor customer commonly gets delivered today
and pays over the following weeks, sometimes in installments. If
delivery and payment are modeled as one sequential status, this everyday
case can\'t be represented correctly.*

The system must maintain a live Pending Orders list (delivery status
pending or partial) visible to the operator and owner.

# **7. Delivery Completion**

When a delivery is completed, the operator opens the order and enters:

**For 19L orders:**

-   Quantity delivered

-   Empty bottles returned --- good (reusable)

-   Empty bottles returned --- broken

-   Cash received

-   Payment method

-   Remarks

**For PET orders:**

-   Delivered quantity

-   Cash received

-   Payment method

-   Remarks

On submission, the system must automatically, with no manual calculation
by the operator:

-   Update delivery status and payment status (recomputed from totals,
    not incremented)

-   Update the customer\'s bottle balance

-   Update the customer\'s outstanding balance

-   Update raw material inventory (Large Caps, Mineral Sets consumed ---
    19L only, see Section 3)

-   Update finished goods inventory (PET only --- reduce by quantity
    delivered)

-   Update cash and profit figures

-   Update the dashboard and all relevant reports

-   Update the customer\'s Last Delivery Date and Average Monthly Orders

*Business rule, must be structurally enforced: a customer can never
return more bottles than they currently hold, per the balance calculated
from their transaction history. When an operator attempts this, show a
warning with the customer\'s actual current balance and require explicit
confirmation to proceed (see Section 8 on the soft-block philosophy)
rather than silently allowing an impossible number.*

Supporting partial deliveries: a single order may have more than one
delivery record over time (e.g. driver couldn\'t carry the full order,
returns with the rest later). Delivery status and payment status must be
computed by summing all delivery/payment records against the order, not
by a single stored flag.

# **8. Purchasing & Vendor Management**

Regular inventory purchases: 19L Bottles, 0.5L Bottles, 1.5L Bottles,
Small Caps, Large Caps, Labels, Shrink Wrap, Mineral Sets.

Each purchase must automatically:

-   Increase the relevant raw material inventory

-   Increase the vendor\'s outstanding payable

-   Update financial records

Vendor payments are recorded separately from purchases and reduce the
vendor\'s payable --- purchases are not assumed to be paid in full at
the time of purchase. This mirrors the customer-side credit model
(Section 6.2 / Section 8).

19L bottle purchases (new bottles bought to grow the fleet) are recorded
in the bottle asset ledger described in Section 10, not as a regular
inventory item --- they are a durable asset, not a consumable.

# **9. Credit Limits & Soft-Block Philosophy**

*Decision already made, applies system-wide: when an action would exceed
a limit or produce a value that shouldn\'t normally be possible --- a
customer\'s credit limit, a bottle return exceeding their balance, raw
material stock going negative --- the system should show a clear warning
and require explicit confirmation to proceed. It should never hard-block
the operator. The front desk must never get stuck mid-call because of a
system restriction.*

Specifically:

-   Each customer has a Credit Limit. Before an order is placed, the
    system checks (outstanding balance + new order amount) against this
    limit. If exceeded, warn with the current balance, the limit, and
    what the new balance would be --- operator can proceed anyway.

-   If a delivery/production entry would take a raw material\'s stock
    below zero, warn but allow --- operations sometimes need to log
    something after the fact (e.g. stock physically arrived before its
    purchase was entered).

-   A credit limit of zero should be treated as \"no limit\" (unlimited
    credit) rather than \"block everything.\"

# **10. Bottle Asset Ledger**

19L bottles are reusable company property, not consumable stock. Track
them with a dedicated append-only ledger of movements (deliveries,
returns, breakage, loss, new purchases) rather than a single editable
count. Every balance shown anywhere in the app --- a customer\'s current
holding, the factory\'s on-hand count, company-wide totals --- should be
calculated by summing this ledger, never stored and edited directly.

*Decision already made: bottles are tracked in bulk (a running count per
customer), not individually serialized with barcodes/QR codes. This was
a deliberate simplification --- individual tracking would allow more
precise loss auditing but adds significant operational overhead the
business doesn\'t want right now. If this changes later, the ledger
design accommodates adding a bottle ID field without a redesign.*

The system must maintain, always reconciling:

-   Total company-owned bottles

-   Bottles at factory

-   Bottles with customers

-   Broken bottles

-   Lost bottles

Loss should not be automatically inferred from \"not yet returned\" ---
a customer may simply be holding bottles legitimately for months.
Marking a bottle lost should be a deliberate, explicit action (e.g.
after a set period of no contact, or a manual write-off), separate from
the ordinary return workflow.

# **11. Operating Expenses**

Fuel, Salaries, Electricity, Plant Rent, Vehicle Repairs, Machine
Repairs, and Miscellaneous Expenses. These reduce profit on reports and
the dashboard but must never affect inventory.

# **12. Core Design Principle: No Manually-Edited Numbers**

This is the single most important architectural constraint in the whole
system, and should govern every implementation decision:

*The system must not allow manual editing of any inventory quantity,
bottle count, or customer/vendor balance. Every such figure must be
calculated from a transaction history, never stored as a
directly-editable field. Purchases create positive inventory
transactions. Production creates negative raw-material transactions and
positive finished-goods transactions. Deliveries create negative
finished-goods transactions (PET) and bottle-ledger movements (19L).
Payments and vendor payments are their own transaction stream, separate
from the sale/purchase they relate to.*

Practical consequence for the developer: design the database so that
\"current stock\" and \"current balance\" are always derived (a SUM
query or an equivalent materialized/cached value that is provably kept
in sync with the underlying transactions) --- never a column a user
interface writes to directly. This is what makes the numbers trustworthy
over years of use and gives a full audit trail for free.

Because direct edits are disallowed, mistakes still need a way to be
corrected. Provide an explicit adjustment/reversal transaction type
(with a required reason/note) for correcting entry errors after the
fact, rather than allowing any back-door edits to the underlying
figures.

# **13. Dashboard**

The owner-facing dashboard should display, calculated live:

-   Today\'s Sales

-   Today\'s Cash Collection

-   Today\'s Credit Sales

-   Today\'s Expenses

-   Today\'s Estimated Profit

-   Pending Orders (count and list)

-   Completed Orders

-   Outstanding Customer Balances

-   Outstanding Vendor Balances

-   Raw Material Inventory (with low-stock flags against a configurable
    reorder level per item)

-   Finished Goods Inventory

-   19L Bottle Summary (all five figures from Section 10)

-   Low Stock Alerts

# **14. Reports**

Daily, Weekly, Monthly, and Yearly reports covering:

-   Sales

-   Profit

-   Expenses

-   Inventory

-   Production

-   Customer Credits

-   Vendor Balances

-   Bottle Summary

-   Pending Orders

*Not yet built in the reference implementation --- this section layers
cleanly on top of the transaction tables described in Section 15 and can
be built once the core workflows are stable.*

# **15. User Roles**

At minimum, support these roles with different visibility:

-   Operator and accountant --- order desk, customer lookup, delivery
    completion, payments, vendor balances, expenses, and reports Should
    not necessarily see profit margins.

-   Owner --- full visibility, including the dashboard, all reports, and
    profit figures. Primarily accesses via phone.

Multiple people must be able to use the system simultaneously (an
operator taking a call while the owner checks the dashboard on their
phone), so all balance-affecting actions must be safe under concurrent
use --- use database-level transactions/locking for anything that reads
a balance and then writes based on it, to prevent two simultaneous
actions producing an impossible state.

# **16. Data Model**

The following entities and fields reflect the reference
implementation\'s schema. Field names are suggestions, not requirements
--- the relationships and the transaction-log pattern are what matter.

### **Customer**

  -----------------------------------------------------------------------
  **Field**                       **Notes**
  ------------------------------- ---------------------------------------
  id                              Primary key

  name, phone (unique), address,  Profile fields
  mapsLocation                    

  customerType                    Home \| Restaurant \| Shop \|
                                  Distributor

  creditLimit                     0 = unlimited

  defaultPrice                    Optional suggested price, not locked

  remarks                         Free text
  -----------------------------------------------------------------------

### **Order**

  -----------------------------------------------------------------------
  **Field**                       **Notes**
  ------------------------------- ---------------------------------------
  id, customerId                  Primary key, foreign key

  orderType                       19L \| PET --- never mixed on one order

  deliveryStatus                  pending \| partial \| delivered ---
                                  recomputed from Delivery records

  paymentStatus                   unpaid \| partial \| paid ---
                                  recomputed from Payment records

  expectedDelivery, remarks       As entered by operator
  -----------------------------------------------------------------------

### **OrderItem**

  -----------------------------------------------------------------------
  **Field**                       **Notes**
  ------------------------------- ---------------------------------------
  id, orderId                     Primary key, foreign key

  description                     e.g. \"19L Bottle\", \"0.5L PET\"

  qtyOrdered, unitPrice           Price is snapshotted at order time ---
                                  never recalculated from a later price
                                  change
  -----------------------------------------------------------------------

### **Delivery**

  -----------------------------------------------------------------------
  **Field**                       **Notes**
  ------------------------------- ---------------------------------------
  id, orderId                     Primary key, foreign key --- an order
                                  may have more than one Delivery

  deliveredAt, qtyDelivered       

  bottlesReturnedGood,            19L orders only
  bottlesReturnedBroken           

  remarks                         
  -----------------------------------------------------------------------

### **Payment**

  -----------------------------------------------------------------------
  **Field**                       **Notes**
  ------------------------------- ---------------------------------------
  id, orderId (nullable),         A payment can be tied to an order or
  customerId                      logged generally against a customer

  amount, method, receivedAt      method: cash \| bank \| mobile wallet
                                  \| other
  -----------------------------------------------------------------------

### **BottleTransaction**

  -----------------------------------------------------------------------
  **Field**                       **Notes**
  ------------------------------- ---------------------------------------
  id, customerId (nullable)       Null customerId = factory-level
                                  movement (new purchase, write-off,
                                  adjustment)

  txnType                         delivered_to_customer \| returned_good
                                  \| returned_broken \| lost \|
                                  purchased_new \| factory_adjustment

  qty, refDeliveryId, note,       
  createdAt                       
  -----------------------------------------------------------------------

### **Item**

  -----------------------------------------------------------------------
  **Field**                       **Notes**
  ------------------------------- ---------------------------------------
  id, name (unique)               Single master table for both raw
                                  materials and finished goods

  category                        raw_material \| finished_good

  unit                            pcs \| kg \| set

  reorderLevel                    Drives the dashboard\'s low-stock alert
  -----------------------------------------------------------------------

### **InventoryTransaction**

  -----------------------------------------------------------------------
  **Field**                       **Notes**
  ------------------------------- ---------------------------------------
  id, itemId                      Primary key, foreign key

  direction                       IN \| OUT

  qty                             Decimal --- must support exact
                                  fractions (see Section 3)

  refType, refId                  purchase \| production_consume \|
                                  production_output \| sale \|
                                  adjustment, pointing back to the
                                  causing record
  -----------------------------------------------------------------------

### **ProductionBatch**

  -----------------------------------------------------------------------
  **Field**                       **Notes**
  ------------------------------- ---------------------------------------
  id, productionDate              

  qty05LProduced, qty15LProduced  The only two numbers the operator
                                  enters

  mineralSetsConsumed             Exact decimal, computed automatically
  -----------------------------------------------------------------------

### **Vendor / Purchase / VendorPayment**

  -----------------------------------------------------------------------
  **Field**                       **Notes**
  ------------------------------- ---------------------------------------
  Vendor: id, name, phone,        
  remarks                         

  Purchase: id, vendorId, itemId, Creates an inbound InventoryTransaction
  qty, unitCost, totalCost,       
  purchasedAt                     

  VendorPayment: id, vendorId,    Reduces vendor payable, mirrors
  amount, method, paidAt          customer Payment
  -----------------------------------------------------------------------

### **Expense**

  -----------------------------------------------------------------------
  **Field**                       **Notes**
  ------------------------------- ---------------------------------------
  id, type                        fuel \| salaries \| electricity \|
                                  plant_rent \| vehicle_repair \|
                                  machine_repair \| misc

  amount, date, remarks           No inventory impact
  -----------------------------------------------------------------------

### **User**

  -----------------------------------------------------------------------
  **Field**                       **Notes**
  ------------------------------- ---------------------------------------
  id, name, email (unique)        

  role                            operator \| owner \| accountant

  passwordHash                    Never store plaintext --- standard auth
                                  practice
  -----------------------------------------------------------------------

Key relationships: Customer 1---many Order; Order 1---many
OrderItem/Delivery/Payment; Customer 1---many BottleTransaction; Item
1---many InventoryTransaction/OrderItem/Purchase; Vendor 1---many
Purchase/VendorPayment.

# **17. Platform, Hosting & Non-Functional Requirements**

Decisions already made by the owner:

-   Web application (not a native desktop or mobile app) --- accessible
    from any browser, works the same on the office PC and on a phone.
    Must be genuinely mobile-responsive, not just \"technically works\"
    on a small screen --- the owner\'s primary access point is their
    phone.

-   Cloud-hosted --- accessible from anywhere with internet, no on-site
    server to maintain.

-   Multiple people must use it simultaneously (operator, owner,
    accountant) without stepping on each other\'s data.

-   Low/no ongoing cost is a priority --- favor stacks with generous
    free tiers (e.g. a managed Postgres provider + a free-tier app host)
    over anything requiring a dedicated paid server, at least until
    usage outgrows the free tier.

-   Every action a human takes should be fast --- the 20-second order
    entry target in Section 6 is the clearest expression of this, but it
    should guide the whole UI: minimal clicks, sensible defaults, large
    touch targets for phone use.

-   Every change must be traceable through transaction history
    (Section 12) --- this is both a functional and a non-functional
    requirement, since it underpins trust in the numbers.

# **18. Open Decisions for the Developer / Owner**

These were intentionally left open and should be confirmed before or
during build:

-   Exact label and shrink-wrap conversion factors (kg per PET pack) ---
    Section 4.

-   Whether the owner wants a formal price-history mechanism beyond the
    per-order-item price snapshot already specified, e.g. for generating
    historical reports at a customer\'s rate as of a past date.

-   Full detail of the Reports module (Section 14) --- the shape of
    daily/weekly/monthly/yearly rollups was not specified beyond the
    topic list; work with the owner on exact report layouts.

-   Driver/route assignment was explicitly ruled out for the current
    phase (dispatch stays informal) --- confirm this is still true
    before building anything here.

-   Whether individual bottle serialization (Section 10) will be wanted
    later --- not needed now, but worth confirming the data model leaves
    room for it.

# **19. Suggested Build Order**

This order was chosen to get the highest-frequency, highest-value
workflow (19L order-to-delivery) working end-to-end first, before
layering on back-office functionality:

-   Phase 1: Customers, Items master, core inventory ledger, 19L order
    desk + delivery + bottle ledger, PET order desk + delivery,
    dashboard basics.

-   Phase 2: Purchasing, vendors, production batches with automatic
    mineral-set/raw-material deduction, operating expenses, expanded
    dashboard (stock levels, low-stock alerts, profit).

-   Phase 3: Full reports module, price history if needed, any
    refinements to user roles/permissions.

***[Manager Points\
\
]{.underline}***\
**📄 Page 1**

**1) Purchase**

Purchase → Stock → Expense

**2) Customer Checks**

i\) Credit: 5000 / 1 month

Meaning:

-   Customer credit limit = **Rs. 5000**

-   Credit duration = **1 month**

**3) Customer Reminder**

Alert if no order placed for 1 week

Meaning:\
If a customer hasn\'t ordered for one week, the system should remind the
operator.

**4) Customer Database**

Fields:

i\) Customer ID

ii\) Phone Number

iii\) Name

iv\) Address

v\) Location

vi\) No. of Bottles

vii\) Home Picture (outside)

Meaning:\
Store a picture of the customer\'s house from outside so the delivery
driver can identify it.

**5) Customer Search**

Search by:

i\) Customer ID

ii\) Customer Name

iii\) Phone Number

**6) Bill Generation**

Invoice

Meaning:\
Generate invoices/bills.

**7) Counter Sale**

i\) Litres

ii\) Caps

iii\) Cash

iv\) Credit

This handwriting is a little unclear, but it appears to describe counter
sales and related details.

**8) Website**

aquasphere.org

(optimize)

Meaning:\
Website needs optimization.

**📄 Page 2**

**9) Blowing Machine**

Blowing Machine

Deosai

Dasani

The \"X\" between the names probably means comparison or separation.

**10) Bottle Types**

Aquasphere → Pure

Dasani → Pure + Mix

Pivrifine (or similar spelling) → Pure + Mix

The last company name is difficult to read, but it looks like
**Pivrifine/Pivrigine**.

**11) Blowing Inventory**

Factory → Warehouse

Production

Sale

More specifically:

Production:

Factory → Warehouse

Sale:

From Factory or Warehouse

Meaning:\
Track inventory movement between factory and warehouse.

**12) Preform**

Mixed Bottle

1.5L → 27g

0.5L → 13g

Pure Bottle

1.5L → 30g

0.5L → 15g

These are bottle weights.

**13) Interface (Website)**

Aquasphere Website

i\) Customers

ii\) Reviews

iii\) Work With Us

iv\) Find Us

Also social media icons are drawn.

**14)**

Shrink Wrap ?

Probably asking for confirmation.

**15)**

Data (dummy)

Meaning:\
Use dummy/sample data initially.

**16) Labels**

0.5L

1 PET

6.72 g

\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--

1.5L

1 PET

7.8 g

These appear to be label weights.

**17) Minerals**

1 Set

15140 Litres

This differs slightly from the blueprint (13,248 L), so you should
confirm which value is correct.

**18) Inventory Alerts**

i\) Labels

1.5L → 15kg

0.5L → 10kg

ii\) Wrap

10kg

iii\) Mineral

Ca

Mg

Na

iv\) Empty Bottles

1.5L → 6000

0.5L → 6000

These are reorder alert levels.

**📄 Page 3**

At the top:

PETS

1.5L → 1000

0.5L → 200

Caps

Small → 6000

Big Caps

500

19L Bottles

50

Likely initial stock examples.

**19) Minerals**

Set

×

2kg Ca

1kg Mg

0.5kg Na

15140 Litres

Again, this notes mineral set composition.

**20)**

19L Bottles

New Bottles Added

Meaning:\
Module to add newly purchased 19L bottles.

**21)**

Production Rules

9 Litres (0.5L)

12 Litres (1.5L)

This matches the production logic.

**22)**

Add New Customer Option

↓

Delete Customer

Likely CRUD functionality.

**23)**

Separate Portals/Login

for Admin Account

Admin can reset the password

with Accountant\'s permission

Some words are faint, but the main idea is separate logins.

**24)**

Daily Closing

Not Editable

by Accountant

Meaning:\
Once the day is closed, it should not be editable.

**25)**

Driver Route Assignment

Meaning:\
Assign deliveries to drivers.

**26)**

Account + Admin

↓

Dashboard

↓

Security Setup

The last word looks like \"setup.\"
