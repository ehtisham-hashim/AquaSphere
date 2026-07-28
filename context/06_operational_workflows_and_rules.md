# AquaSphere & Wadaana - Operational Workflows & Business Rules

## 1. Customer Onboarding & Credit Rules

### Registration & Validation
1. **Required Fields**: Customer Name, Unique Phone Number, and Customer Type (Commercial / Residential / Retail).
2. **Google Maps Validation**: If a `mapLink` is provided, `isValidGoogleMapsUrl` ensures it matches valid Google Maps domain formats (`maps.google.com`, `google.com/maps`, `goo.gl`, `maps.app.goo.gl`).
3. **Product Preferences**:
   - **AquaSphere**: Select flags for `buys19L`, `buys05LPet`, `buys15LPet`.
   - **Wadaana**: Select flags for `buysPure05L`, `buysPure15L`, `buysMix05L`, `buysMix15L`.
4. **Security Deposit**: Stores initial bottle deposit amounts (`deposit`).
5. **Credit Limits & Duration**: Set default price per unit, credit limit (PKR), and credit duration (days). Overdue balances trigger warnings on `CustomerAlertsTab`.

---

## 2. Order Lifecycle & Delivery Execution

```
[Order Created] ---> [Status: PENDING / Payment: UNPAID]
        |
        v
[Delivery Processed] (ProcessDeliveryModal)
        |
        +---> Enter Delivered Qty
        +---> Record Returned Empty Bottles (Good / Broken)
        +---> Record Cash Received & Payment Method
        |
        v
[Updates Executed]:
  - Order Status -> DELIVERED / PARTIAL
  - Customer Cached Balance -> Updated (+ Amount Due - Cash Received)
  - Customer Bottle Balance -> Updated (+ Delivered - Returned Good/Broken)
  - Bottle Transaction Logged -> TYPE: DELIVERED_TO_CUSTOMER / RETURNED_GOOD / RETURNED_BROKEN
```

---

## 3. Production Batch Execution Workflow

1. **Production Form Entry**: Production Manager inputs the number of 0.5L packs (`packs05L`) and 1.5L packs (`packs15L`) produced, along with any bottle breakage (`brokenBottles05L`, `brokenBottles15L`).
2. **Automated Consumption Engine**: `productionFormulas.js` calculates exact decimal quantities:
   - Deducts empty PET bottles, caps, labels, shrink wrap, and water volume.
   - Calculates mineral chemical dosage based on total processed litres ($\text{Total Litres} / 15,141$).
3. **Inventory Updates**:
   - Decrements raw material stock levels (`cachedQty` in `Item`).
   - Increments finished goods stock levels for 0.5L and 1.5L packs.
   - Logs transaction entries in `InventoryTransaction`.
   - Records batch entry in `ProductionBatch` and `ProductionBatchConsumption`.

---

## 4. Bottle Ledger & Return Accounting

The bottle ledger tracks empty bottle assets (specifically 19L refillable bottles) to eliminate asset loss.

### Transaction Types (`BottleTransactionType`)
- `NEW_PURCHASE`: Factory acquires new empty bottles from vendors.
- `DELIVERED_TO_CUSTOMER`: Bottles dispatched to customer.
- `RETURNED_GOOD`: Intact empty bottles returned by customer to factory.
- `RETURNED_BROKEN`: Damaged bottles returned by customer (logged as loss).
- `MARKED_LOST`: Unrecoverable customer bottles written off.
- `AT_FACTORY_ADJUSTMENT`: Manual stock reconciliation at factory warehouse.

---

## 5. Vendor Procurement & Payables Ledger

1. **Purchase Entry**: Record vendor invoice (`invoiceNo`, `receiptUrl`), select purchased items, quantities, and unit prices.
2. **Stock & Ledger Updates**:
   - Raw material stock (`cachedQty`) is credited immediately.
   - Creates `Purchase` and `PurchaseItem` records.
   - Creates a `VendorLedgerEntry` of type `PURCHASE`.
3. **Vendor Payments**: Recording a payment creates a `VendorPayment` record and a `VendorLedgerEntry` of type `PAYMENT`, reducing net outstanding vendor payable balance.

---

## 6. Daily Financial Close & System Lock

```
[Accountant / Admin clicks 'Daily Close']
                   |
                   v
[DailyClose Record Inserted for Selected Date]
                   |
                   v
[System Lock Activated]
  - All POST / PUT / DELETE operations on Orders, Production, Purchases,
    and Expenses matching or preceding closed date are BLOCKED.
  - Returns 403 Forbidden for non-Owner roles.
  - OWNER role can perform overrides or manage closed dates.
```
