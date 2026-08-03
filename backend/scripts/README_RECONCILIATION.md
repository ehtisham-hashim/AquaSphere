# Inventory Reconciliation Script Guide

## Purpose
This script fixes inventory discrepancies by recalculating `cachedQty`, `factoryQty`, and `warehouseQty` based on the complete transaction history for each item.

## When to Use
- ✅ After deploying the location-based inventory fixes
- ✅ When dashboard shows incorrect inventory numbers
- ✅ After data migration or database restoration
- ✅ When factory/warehouse quantities don't match expectations
- ✅ As part of monthly/quarterly inventory audit

## How to Run

### For AquaSphere Tenant
```bash
cd Backend
TENANT=aquasphere node scripts/reconcile-all-inventory.js
```

### For Wadaana Tenant
```bash
cd Backend
TENANT=wadaana node scripts/reconcile-all-inventory.js
```

### Run for Both Tenants
```bash
cd Backend
TENANT=aquasphere node scripts/reconcile-all-inventory.js
TENANT=wadaana node scripts/reconcile-all-inventory.js
```

## What It Does

1. **Fetches All Items** - Gets all non-archived items from the database
2. **Analyzes Transactions** - Reads complete transaction history for each item
3. **Calculates Expected Values**:
   - `cachedQty` = Total IN - Total OUT
   - `factoryQty` = Factory IN - Factory OUT
   - `warehouseQty` = Warehouse IN - Warehouse OUT
4. **Compares & Updates** - If current values don't match expected, updates the item
5. **Creates Audit Logs** - Records all changes for accountability

## Output Example

```
🔄 Starting Inventory Reconciliation for aquasphere...

📦 Found 45 items to reconcile

⏳ Reconciling: 19L Empty Bottle (RAW_MATERIAL)...
   ✅ UPDATED - Cached: 150 → 148, Factory: 150 → 148, Warehouse: 0 → 0

⏳ Reconciling: 0.5L PET Bottle Pack (FINISHED_GOOD)...
   ✓ Already accurate - Cached: 85, Factory: 60, Warehouse: 25

⏳ Reconciling: Large 19L Cap (RAW_MATERIAL)...
   ✅ UPDATED - Cached: 200 → 195, Factory: 200 → 195, Warehouse: 0 → 0

============================================================
✅ Reconciliation Complete!
   Success: 45 items
   Errors: 0 items
============================================================
```

## Safety Features

- ✅ **Read-Only Analysis** - Checks before updating
- ✅ **Audit Trail** - Every change logged with before/after values
- ✅ **Error Handling** - Continues even if one item fails
- ✅ **Detailed Reporting** - Shows exactly what changed

## Troubleshooting

### Script Fails to Start
**Error:** `Cannot find module '../src/config/db.js'`
**Solution:** Make sure you're in the `Backend` directory when running

### Database Connection Error
**Error:** `Error connecting to database`
**Solution:** 
1. Check that `.env` file has correct `DATABASE_URL`
2. Verify PostgreSQL is running
3. Test connection: `npx prisma db pull`

### Permission Denied
**Error:** `EACCES: permission denied`
**Solution:** Run with proper permissions or use `sudo` (not recommended in production)

### Transactions Not Found
**Output:** `Already accurate - Cached: 0, Factory: 0, Warehouse: 0`
**Meaning:** Item has no transaction history (newly created or never used)
**Action:** No action needed - this is normal for unused items

## Verification After Running

### Check Audit Logs
```sql
SELECT * FROM "AuditLog" 
WHERE action = 'INVENTORY_RECONCILED' 
ORDER BY "createdAt" DESC 
LIMIT 20;
```

### Verify Specific Item
```sql
SELECT 
  name, 
  "cachedQty", 
  "factoryQty", 
  "warehouseQty" 
FROM "Item" 
WHERE name LIKE '%19L%';
```

### Check Dashboard
1. Go to Inventory page
2. Verify stock numbers match expectations
3. Check Factory Floor vs Warehouse columns

## Best Practices

1. **Backup First** - Always backup database before running in production
2. **Test Environment** - Run in staging/test environment first
3. **Off-Peak Hours** - Run during low-traffic times if possible
4. **Monitor Results** - Review audit logs after completion
5. **Regular Schedule** - Run monthly as part of inventory audit

## Support

If you encounter issues:
1. Check the console output for specific error messages
2. Review audit logs in database
3. Verify transaction history is complete
4. Contact system administrator if problems persist

## Technical Details

### Database Models Used
- `Item` - Main inventory items
- `InventoryTransaction` - Transaction history
- `AuditLog` - Change tracking

### Fields Updated
- `cachedQty` - Total quantity across all locations
- `factoryQty` - Quantity on factory floor (ready for sale/production)
- `warehouseQty` - Quantity in warehouse (storage)

### Transaction Types Processed
- **IN**: Purchases, Production, Returns, Transfers IN
- **OUT**: Sales, Deliveries, Waste, Transfers OUT

### Location Handling
- `FACTORY` - Adds/removes from factoryQty
- `WAREHOUSE` - Adds/removes from warehouseQty
- `null` (legacy) - Defaults to FACTORY for backward compatibility

---

**Last Updated:** August 3, 2026
**Script Version:** 1.0.0
**Compatibility:** Node.js 18+, Prisma 5+
