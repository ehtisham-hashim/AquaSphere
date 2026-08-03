# AquaSphere System Architecture & Data Flow

## Overview
This document illustrates how data flows through the system after the critical fixes.

---

## Inventory Location Tracking Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        INVENTORY ITEM                            │
│  ┌────────────┬──────────────┬───────────────┐                 │
│  │ cachedQty  │  factoryQty  │ warehouseQty  │                 │
│  │  (Total)   │ (Production) │   (Storage)   │                 │
│  └────────────┴──────────────┴───────────────┘                 │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │
                    ┌─────────┴─────────┐
                    │  Updated By All   │
                    │    Transactions   │
                    └─────────┬─────────┘
                              │
            ┌─────────────────┼─────────────────┐
            │                 │                 │
            ▼                 ▼                 ▼
    ┌───────────────┐  ┌───────────────┐  ┌───────────────┐
    │   PURCHASE    │  │  PRODUCTION   │  │ COUNTER SALES │
    │               │  │               │  │               │
    │ Adds to:      │  │ Adds to:      │  │ Deducts from: │
    │ - factoryQty  │  │ - factoryQty  │  │ 1. factoryQty │
    │   OR          │  │   (finished)  │  │ 2. warehouse  │
    │ - warehouseQty│  │               │  │    (if needed)│
    │ (based on     │  │ Deducts from: │  │               │
    │  deliveredTo) │  │ - factoryQty  │  │               │
    │               │  │   (raw mat.)  │  │               │
    └───────────────┘  └───────────────┘  └───────────────┘
            │                 │                 │
            └─────────────────┼─────────────────┘
                              │
                              ▼
                ┌─────────────────────────────┐
                │   INVENTORY TRANSACTION     │
                │  ┌────────┬──────────────┐  │
                │  │ itemId │   quantity   │  │
                │  │ direction (IN/OUT)    │  │
                │  │ location (FACTORY/    │  │
                │  │          WAREHOUSE)   │  │
                │  └───────────────────────┘  │
                └─────────────────────────────┘
```

---

## Purchase Flow (FIXED)

```
┌──────────────────────────────────────────────────────────────┐
│                     PURCHASE RECORDED                         │
│  Vendor: ABC Suppliers                                        │
│  Item: 19L Empty Bottle                                       │
│  Quantity: 100                                                │
│  Delivered To: FACTORY ◄─── CRITICAL FIELD                   │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │  Purchase Controller (FIXED)  │
              │                               │
              │  IF deliveredTo = "FACTORY":  │
              │    ✅ cachedQty += 100        │
              │    ✅ factoryQty += 100       │
              │                               │
              │  IF deliveredTo = "WAREHOUSE":│
              │    ✅ cachedQty += 100        │
              │    ✅ warehouseQty += 100     │
              └───────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ Create Trans.   │
                    │ direction: IN   │
                    │ location: set   │
                    └─────────────────┘
```

### Before Fix ❌
```javascript
// OLD CODE - Only updated cachedQty
await prisma.item.update({
  where: { id: itemId },
  data: { cachedQty: { increment: qty } }
});
// factoryQty and warehouseQty remained 0!
```

### After Fix ✅
```javascript
// NEW CODE - Updates location-specific fields
const updateData = { cachedQty: { increment: qty } };
if (destination === 'FACTORY') {
  updateData.factoryQty = { increment: qty };
} else if (destination === 'WAREHOUSE') {
  updateData.warehouseQty = { increment: qty };
}
await prisma.item.update({ where: { id: itemId }, data: updateData });
```

---

## Counter Sales Stock Deduction (FIXED)

```
┌──────────────────────────────────────────────────────────────┐
│                   COUNTER SALE RECORDED                       │
│  Product: 0.5L Pack (12 bottles)                             │
│  Quantity: 5 packs                                            │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │   Find Finished Good Item     │
              │   Current Stock:              │
              │   factoryQty = 3 packs        │
              │   warehouseQty = 4 packs      │
              │   cachedQty = 7 packs         │
              └───────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │  SpotSale Controller (FIXED)  │
              │                               │
              │  Need to deduct: 5 packs      │
              │                               │
              │  Step 1: Deduct from factory  │
              │    factoryDeduct = 3          │
              │                               │
              │  Step 2: Remaining from WHse  │
              │    warehouseDeduct = 2        │
              │                               │
              │  ✅ cachedQty -= 5            │
              │  ✅ factoryQty -= 3           │
              │  ✅ warehouseQty -= 2         │
              └───────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Final Stock:   │
                    │  factoryQty = 0 │
                    │  warehouse = 2  │
                    │  cached = 2     │
                    └─────────────────┘
```

---

## Order Delivery Flow (Validated)

```
┌──────────────────────────────────────────────────────────────┐
│                     ORDER DELIVERY ATTEMPT                    │
│  Customer: ABC Restaurant                                     │
│  Items: 10 x 19L Bottles                                     │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │   Check Factory Floor Stock   │
              │   Required: 10 bottles        │
              │   Available: factoryQty       │
              └───────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
            Factory Stock < 10      Factory Stock >= 10
                    │                   │
                    ▼                   ▼
        ┌─────────────────────┐  ┌─────────────────────┐
        │  ❌ ERROR THROWN    │  │  ✅ PROCEED         │
        │                     │  │                     │
        │  "Insufficient      │  │  Deduct ONLY from:  │
        │   Factory Floor     │  │  - factoryQty       │
        │   stock. Please     │  │                     │
        │   produce more or   │  │  Leave warehouse    │
        │   transfer from     │  │  stock untouched    │
        │   warehouse"        │  │                     │
        └─────────────────────┘  └─────────────────────┘
```

---

## Dashboard Data Flow (FIXED)

### Before Fix ❌
```
┌────────────────────────────────────────────────────────────┐
│              ACCOUNTANT DASHBOARD (OLD)                     │
└────────────────────────────────────────────────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            ▼                 ▼                 ▼
    ┌───────────┐     ┌───────────┐     ┌───────────┐
    │ GET       │     │ GET       │     │ GET       │
    │ /orders   │     │ /expenses │     │ /spot-    │
    │           │     │           │     │  sales    │
    └───────────┘     └───────────┘     └───────────┘
            │                 │                 │
            └─────────────────┼─────────────────┘
                              ▼
                    ┌─────────────────┐
                    │  MANUAL FILTER  │
                    │  & CALCULATION  │
                    │  (INACCURATE)   │
                    └─────────────────┘
                              │
                              ▼
                      Shows Rs. 0 ❌
```

### After Fix ✅
```
┌────────────────────────────────────────────────────────────┐
│              ACCOUNTANT DASHBOARD (NEW)                     │
└────────────────────────────────────────────────────────────┘
                              │
                              ▼
                ┌─────────────────────────────┐
                │  GET /analytics/            │
                │       daily-summary         │
                │                             │
                │  Single optimized endpoint  │
                │  Pre-calculated values      │
                └─────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │  ANALYTICS CONTROLLER         │
              │                               │
              │  Calculates:                  │
              │  ✅ totalDeliveryAmount       │
              │  ✅ totalSpotSales            │
              │  ✅ totalCreditSales          │
              │  ✅ totalExpenses             │
              │  ✅ netCash                   │
              │  ✅ totalLitres               │
              └───────────────────────────────┘
                              │
                              ▼
                  ┌───────────────────┐
                  │  Shows Real Data  │
                  │  Rs. 15,450 ✅    │
                  └───────────────────┘
```

---

## Complete System Integration Map

```
┌────────────────────────────────────────────────────────────────────────┐
│                         AQUASPHERE SYSTEM                              │
└────────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐         ┌───────────────┐         ┌───────────────┐
│   PURCHASE    │         │  PRODUCTION   │         │    SALES      │
│   MODULE      │         │    MODULE     │         │   MODULES     │
│               │         │               │         │               │
│ • Records     │         │ • Batches     │         │ • Orders      │
│   purchases   │         │ • Consumption │         │ • Counter     │
│ • Updates     │         │ • Yield       │         │ • Delivery    │
│   inventory   │         │               │         │               │
└───────┬───────┘         └───────┬───────┘         └───────┬───────┘
        │                         │                         │
        │                         │                         │
        └─────────────┬───────────┴───────────┬─────────────┘
                      │                       │
                      ▼                       ▼
            ┌──────────────────┐    ┌──────────────────┐
            │   INVENTORY      │    │   ANALYTICS      │
            │   DATABASE       │◄───│   CONTROLLER     │
            │                  │    │                  │
            │ • cachedQty      │    │ • Aggregations   │
            │ • factoryQty     │    │ • Calculations   │
            │ • warehouseQty   │    │ • Daily Summary  │
            └──────────────────┘    └────────┬─────────┘
                      ▲                      │
                      │                      │
            ┌─────────┴─────────┐            │
            │  TRANSACTIONS     │            │
            │  • Direction      │            │
            │  • Location       │            │
            │  • Reason         │            │
            └───────────────────┘            │
                                            │
                      ┌─────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────────────────┐
        │           DASHBOARD VIEWS               │
        ├─────────────────────────────────────────┤
        │ • Accountant Dashboard (Finance)        │
        │ • Admin Dashboard (Operations)          │
        │ • Owner Dashboard (Full Access)         │
        │ • Production Dashboard (Manufacturing)  │
        │ • Marketing Dashboard (Sales)           │
        └─────────────────────────────────────────┘
```

---

## Data Validation Chain

```
┌─────────────────────────────────────────────────────────────┐
│                     DATA INTEGRITY FLOW                      │
└─────────────────────────────────────────────────────────────┘

    ┌──────────────┐
    │   USER       │  Records transaction
    │   ACTION     │  (Purchase/Sale/Production)
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │  CONTROLLER  │  Validates input
    │  VALIDATION  │  Checks business rules
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │  LOCATION    │  Determines where stock goes:
    │  ROUTING     │  • FACTORY (production floor)
    │              │  • WAREHOUSE (storage)
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │  INVENTORY   │  Updates multiple fields:
    │  UPDATE      │  • cachedQty (total)
    │              │  • factoryQty (location)
    │              │  • warehouseQty (location)
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │ TRANSACTION  │  Creates audit trail:
    │ LOG CREATED  │  • What changed
    │              │  • When it changed
    │              │  • Where it changed
    │              │  • Who changed it
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │  BROADCAST   │  Notifies dashboards:
    │  UPDATE      │  • Real-time data refresh
    │              │  • KPI recalculation
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │  DASHBOARD   │  Displays accurate data
    │  REFRESH     │  • No Rs. 0 values
    │              │  • Instant updates
    └──────────────┘
```

---

## Critical Fix Impact Summary

### Purchase Module
```
BEFORE: Only cachedQty updated → Location tracking broken ❌
AFTER:  All 3 fields updated → Accurate location tracking ✅
```

### SpotSale Module
```
BEFORE: Auto-heal only fixed cachedQty ❌
AFTER:  Auto-heal updates all location fields ✅
```

### Dashboard Module
```
BEFORE: Manual aggregation → Inaccurate Rs. 0 values ❌
AFTER:  Uses analytics API → Real-time accurate data ✅
```

### Overall System
```
BEFORE: Modules disconnected → Data inconsistency ❌
AFTER:  Fully integrated → Accurate end-to-end flow ✅
```

---

**System Status:** Fully Operational ✅
**Data Integrity:** Verified ✅
**Module Integration:** Complete ✅
**Ready for Production:** YES ✅

---

**Last Updated:** August 3, 2026
**Document Version:** 1.0.0
