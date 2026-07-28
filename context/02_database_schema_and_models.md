# AquaSphere & Wadaana - Database Schema & Data Models

## 1. Database Overview

The platform uses a PostgreSQL database featuring two distinct schemas:
1. `aquasphere`: Stores operational data for AquaSphere.
2. `wadaana`: Stores operational data for Wadaana.

Both schemas share identical structural patterns with minor brand-specific field variances (such as customer product preferences and order types).

---

## 2. Models & Entities Overview

### Customer Entity (`AquasphereCustomer` / `WadaanaCustomer`)
- **Table**: `customers`
- **Purpose**: Stores customer profiles, addresses, location pins, credit limits, security deposits, and cached balances.
- **Fields**:
  - `id` (UUID, Primary Key)
  - `name` (String, indexed)
  - `phone` (String, Unique)
  - `address`, `mapLink`, `homePictureUrl` (String, optional)
  - `type` (String: Commercial / Residential / Retail)
  - `deposit` (Int, default 0 - bottle security deposit)
  - `defaultPrice` (Decimal, default 0.0)
  - `creditLimit` (Decimal, default 0.0)
  - `creditDuration` (Int, default 1 day)
  - `cachedBalance` (Decimal, default 0.0 - outstanding financial balance)
  - `cachedBottleBalance` (Int, default 0 - outstanding 19L/PET bottles with customer)
  - `lastDeliveryAt` (DateTime, optional)
  - `archivedAt` (DateTime, optional - soft delete)
  - **AquaSphere Specific Flags**: `buys19L`, `buys05LPet`, `buys15LPet`
  - **Wadaana Specific Flags**: `buysPure05L`, `buysPure15L`, `buysMix05L`, `buysMix15L`

### Item Entity (`AquasphereItem` / `WadaanaItem`)
- **Table**: `items`
- **Purpose**: Inventory catalog storing raw materials and finished goods.
- **Fields**:
  - `id` (UUID, Primary Key)
  - `name` (String)
  - `type` (`RAW_MATERIAL` | `FINISHED_GOOD`)
  - `unit` (String, e.g., 'kg', 'pcs', 'packs', 'litres')
  - `cachedQty` (Decimal, default 0.0)
  - `reorderLevel` (Decimal, default 0.0)
  - `archivedAt` (DateTime, optional)

### Inventory Transaction Entity (`AquasphereInventoryTransaction` / `WadaanaInventoryTransaction`)
- **Table**: `inventory_transactions`
- **Purpose**: Immutable ledger tracking all stock movements.
- **Fields**:
  - `id` (UUID, Primary Key)
  - `itemId` (UUID, Foreign Key -> `Item`)
  - `quantity` (Decimal)
  - `direction` (`IN` | `OUT`)
  - `reason` (String: Production, Purchase, Sale, Adjustment)
  - `refType`, `refId`, `location` (Optional metadata)

### Bottle Transaction Entity (`AquasphereBottleTransaction` / `WadaanaBottleTransaction`)
- **Table**: `bottle_transactions`
- **Purpose**: Audit trail for empty/filled bottle movements between factory and customers.
- **Fields**:
  - `id` (UUID, Primary Key)
  - `customerId` (UUID, optional Foreign Key -> `Customer`)
  - `type` (`NEW_PURCHASE` | `DELIVERED_TO_CUSTOMER` | `RETURNED_GOOD` | `RETURNED_BROKEN` | `MARKED_LOST` | `AT_FACTORY_ADJUSTMENT`)
  - `quantity` (Int)
  - `reason` (String, optional)

### Order & Delivery Entities (`Order`, `OrderItem`, `Delivery`, `Payment`)
- **Orders Table**: `orders`
  - `type`: AquaSphere (`NINETEEN_L`, `PET`) vs Wadaana (`PURE_BOTTLES`, `MIX_BOTTLES`)
  - `deliveryStatus`: `PENDING`, `PARTIAL`, `DELIVERED`, `CANCELLED`
  - `paymentStatus`: `UNPAID`, `PARTIAL`, `PAID`
- **Order Items Table**: `order_items`
  - `quantity`, `price`
- **Deliveries Table**: `deliveries`
  - `qtyDelivered`, `bottlesReturnedGood`, `bottlesReturnedBroken`, `cashReceived`, `paymentMethod`
- **Payments Table**: `payments`
  - `amount`, `type` (`CASH`, `BANK_TRANSFER`, `CHEQUE`)

### Production Entities (`ProductionBatch`, `ProductionBatchConsumption`, `RecipeItem`)
- **Production Batches Table**: `production_batches`
  - `packs05L`, `packs15L` (Good packs produced)
  - `brokenBottles05L`, `brokenBottles15L` (Wastage)
  - `batchDate`, `producedBy`, `notes`
- **Consumptions Table**: `production_batch_consumptions`
  - Exact decimal consumption per item (`quantityUsed`)
- **Recipe Items Table**: `recipe_items`
  - Configurable ratio mapping (`finishedGoodId`, `rawMaterialId`, `quantityPerUnit`)

### Vendor & Procurement Entities (`Vendor`, `Purchase`, `PurchaseItem`, `VendorPayment`, `VendorLedgerEntry`)
- **Vendors Table**: `vendors`
- **Purchases Table**: `purchases` (`invoiceNo`, `receiptUrl`, `grandTotal`, `purchaseDate`)
- **Purchase Items Table**: `purchase_items` (`quantity`, `unitPrice`, `total`)
- **Vendor Payments Table**: `vendor_payments` (`amount`)
- **Vendor Ledger Table**: `vendor_ledger_entries` (`type`: `PURCHASE` | `PAYMENT`, `amount`, `purchaseId`)

### Financial & System Control Entities (`DailyClose`, `Expense`, `SpotSale`, `User`, `AuditLog`)
- **Daily Closes Table**: `daily_closes` (`date` unique, `closedAt`, `closedById`)
- **Expenses Table**: `expenses` (`category`, `amount`, `receiptUrl`)
- **Spot Sales Table**: `spot_sales` (`litresSold`, `capsIssued`, `cashCollected`, `paymentMethod`)
- **Users Table**: `users` (`email` unique, `passwordHash`, `role`, `isActive`)
- **Audit Logs Table**: `audit_logs` (`action`, `entityType`, `entityId`, `performedBy`, `details`)

---

## 3. Core Enums

```prisma
enum Role {
  OWNER
  ADMIN
  PRODUCTION_MANAGER
  ACCOUNTANT
  MARKETING_MANAGER
}

enum ItemType {
  RAW_MATERIAL
  FINISHED_GOOD
}

enum BottleTransactionType {
  NEW_PURCHASE
  DELIVERED_TO_CUSTOMER
  RETURNED_GOOD
  RETURNED_BROKEN
  MARKED_LOST
  AT_FACTORY_ADJUSTMENT
}

enum DeliveryStatus {
  PENDING
  PARTIAL
  DELIVERED
  CANCELLED
}

enum PaymentStatus {
  UNPAID
  PARTIAL
  PAID
}
```
