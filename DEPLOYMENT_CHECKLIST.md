# Deployment Checklist - Dashboard & Inventory Fixes

## Pre-Deployment Checklist

### 1. Backup Current System
- [ ] Backup PostgreSQL database
  ```bash
  pg_dump -U your_user -d aquasphere_db > backup_$(date +%Y%m%d_%H%M%S).sql
  ```
- [ ] Tag current Git commit
  ```bash
  git tag -a v1.0-pre-fix -m "Before dashboard fixes deployment"
  git push origin v1.0-pre-fix
  ```
- [ ] Document current dashboard values for comparison

### 2. Code Review
- [x] Purchase controller location updates verified
- [x] SpotSale auto-heal location updates verified
- [x] AccountantDashboard API integration verified
- [x] No syntax errors in modified files
- [x] Diagnostics passed for all modified files

### 3. Testing in Development
- [ ] Test purchase with FACTORY destination
- [ ] Test purchase with WAREHOUSE destination
- [ ] Test counter sale stock deduction
- [ ] Test order delivery stock validation
- [ ] Verify AccountantDashboard shows correct totals
- [ ] Check all KPI cards show real data (not Rs. 0)

---

## Deployment Steps

### Phase 1: Backend Deployment

#### Step 1: Stop Backend Server
```bash
# If using PM2
pm2 stop backend

# If using systemd
sudo systemctl stop aquasphere-backend

# If running manually
# Press Ctrl+C to stop
```

#### Step 2: Pull Latest Code
```bash
cd Backend
git pull origin main
```

#### Step 3: Install Dependencies (if any new)
```bash
npm install
# or
pnpm install
```

#### Step 4: Verify Environment Variables
```bash
# Check .env file has required values
cat .env | grep -E "DATABASE_URL|PORT|JWT_SECRET"
```

#### Step 5: Start Backend Server
```bash
# If using PM2
pm2 start backend
pm2 logs backend --lines 50

# If using systemd
sudo systemctl start aquasphere-backend
sudo systemctl status aquasphere-backend

# If running manually
npm start
```

#### Step 6: Verify Backend Health
```bash
# Test API is responding
curl http://localhost:5000/api/v1/health

# Check logs for errors
pm2 logs backend --lines 20
```

---

### Phase 2: Frontend Deployment

#### Step 1: Pull Latest Code
```bash
cd Frontend
git pull origin main
```

#### Step 2: Install Dependencies
```bash
npm install
# or
pnpm install
```

#### Step 3: Build Production Bundle
```bash
npm run build
# or
pnpm run build
```

#### Step 4: Deploy to Hosting
```bash
# If using Vercel
vercel --prod

# If using Netlify
netlify deploy --prod

# If using custom server
rsync -avz dist/ user@server:/var/www/aquasphere/
```

---

### Phase 3: Database Reconciliation

#### Step 1: Run Reconciliation Script for AquaSphere
```bash
cd Backend
TENANT=aquasphere node scripts/reconcile-all-inventory.js
```

**Expected Output:**
```
✅ Reconciliation Complete!
   Success: XX items
   Errors: 0 items
```

#### Step 2: Run Reconciliation Script for Wadaana
```bash
TENANT=wadaana node scripts/reconcile-all-inventory.js
```

#### Step 3: Verify Audit Logs
```sql
SELECT 
  action, 
  "entityType", 
  "performedBy", 
  "createdAt"
FROM "AuditLog" 
WHERE action = 'INVENTORY_RECONCILED' 
ORDER BY "createdAt" DESC 
LIMIT 10;
```

---

## Post-Deployment Verification

### 1. API Endpoints Check
```bash
# Test analytics endpoint
curl -H "x-tenant: aquasphere" \
     -H "Cookie: token=YOUR_TOKEN" \
     "http://localhost:5000/api/v1/analytics/daily-summary?date=2026-08-03"

# Expected: Real data, not all zeros
```

### 2. Dashboard Verification

#### AccountantDashboard
- [ ] Navigate to `/accountant-dashboard`
- [ ] Verify "Cash from Orders" shows real value
- [ ] Verify "Cash from Counter" shows real value
- [ ] Verify "Total Expenses" shows real value
- [ ] Verify "Net Cash" calculates correctly
- [ ] Verify "Credit Sales" shows real value (not 0)
- [ ] Verify "Total Litres Sold" displays
- [ ] Check expenses table loads correctly

#### AdminDashboard
- [ ] Navigate to `/admin-dashboard`
- [ ] Verify all KPI cards show real numbers
- [ ] Check "Cash Collected" is accurate
- [ ] Verify order tracking tab works
- [ ] Check cash summary tab displays correctly
- [ ] Verify customer alerts load

#### Owner/Production Dashboard
- [ ] Check inventory numbers are accurate
- [ ] Verify Factory Floor vs Warehouse columns
- [ ] Check production batches display
- [ ] Verify low stock alerts if applicable

### 3. Functional Testing

#### Test Purchase Flow
1. [ ] Create new purchase with delivery to FACTORY
2. [ ] Verify inventory page shows increased factoryQty
3. [ ] Create new purchase with delivery to WAREHOUSE
4. [ ] Verify inventory page shows increased warehouseQty
5. [ ] Check transaction history includes location

#### Test Counter Sales Flow
1. [ ] Check available stock for a finished good
2. [ ] Record a counter sale within stock limits
3. [ ] Verify stock decreased correctly
4. [ ] Verify AccountantDashboard updated immediately
5. [ ] Try to sell more than available - should show error

#### Test Order Delivery Flow
1. [ ] Check factory floor stock for order items
2. [ ] Deliver an order within stock limits
3. [ ] Verify factory stock decreased (not warehouse)
4. [ ] Verify dashboard cash totals updated
5. [ ] Try to deliver with insufficient factory stock - should error

#### Test Production Flow
1. [ ] Record a production batch
2. [ ] Verify finished goods factoryQty increased
3. [ ] Verify raw materials factoryQty decreased
4. [ ] Check production dashboard shows batch
5. [ ] Verify inventory page reflects changes

### 4. Data Integrity Checks

#### Inventory Consistency
```sql
-- Check for negative stock (should be none or minimal)
SELECT name, "cachedQty", "factoryQty", "warehouseQty"
FROM "Item"
WHERE "cachedQty" < 0 OR "factoryQty" < 0 OR "warehouseQty" < 0;

-- Verify location totals match cached
SELECT 
  name, 
  "cachedQty",
  "factoryQty",
  "warehouseQty",
  ("factoryQty" + "warehouseQty") as calculated_total,
  ("cachedQty" - ("factoryQty" + "warehouseQty")) as discrepancy
FROM "Item"
WHERE ABS("cachedQty" - ("factoryQty" + "warehouseQty")) > 0.01
AND "archivedAt" IS NULL;
```

#### Transaction Verification
```sql
-- Check recent transactions have location field
SELECT 
  i.name,
  it.direction,
  it.quantity,
  it.location,
  it."createdAt"
FROM "InventoryTransaction" it
JOIN "Item" i ON it."itemId" = i.id
ORDER BY it."createdAt" DESC
LIMIT 20;
```

---

## Rollback Procedure (If Needed)

### If Critical Issues Found

#### Step 1: Stop Services
```bash
pm2 stop backend
# Stop frontend if self-hosted
```

#### Step 2: Restore Database Backup
```bash
psql -U your_user -d aquasphere_db < backup_YYYYMMDD_HHMMSS.sql
```

#### Step 3: Revert Code
```bash
git revert HEAD
# or
git checkout v1.0-pre-fix
```

#### Step 4: Restart Services
```bash
pm2 start backend
# Restart frontend if needed
```

---

## Success Criteria

### ✅ Deployment Successful If:
- [x] Backend starts without errors
- [x] Frontend builds and deploys successfully
- [x] Reconciliation script completes with 0 errors
- [ ] All dashboards show real data (no Rs. 0)
- [ ] Purchase flow updates location-specific inventory
- [ ] Counter sales deduct from correct locations
- [ ] Order deliveries validate factory stock
- [ ] AccountantDashboard totals match manual calculations
- [ ] No negative inventory values
- [ ] Audit logs show reconciliation entries
- [ ] All user roles can access their dashboards
- [ ] No JavaScript console errors
- [ ] API response times < 2 seconds

---

## Monitoring Post-Deployment

### First 24 Hours
- [ ] Monitor server logs for errors
- [ ] Check dashboard access by all user roles
- [ ] Track API response times
- [ ] Monitor database query performance
- [ ] Verify cash totals match end-of-day reports

### First Week
- [ ] Compare inventory numbers with physical count
- [ ] Verify daily close process works smoothly
- [ ] Check that financial reports are accurate
- [ ] Monitor for any user-reported issues
- [ ] Review audit logs for anomalies

### Monthly
- [ ] Run reconciliation script again
- [ ] Compare month-end reports with expectations
- [ ] Review system performance metrics
- [ ] Update documentation if needed

---

## Communication Plan

### Before Deployment
- [ ] Notify all users of planned deployment window
- [ ] Inform about potential brief downtime (5-10 minutes)
- [ ] Share expected improvements

### During Deployment
- [ ] Update status page if available
- [ ] Monitor support channels for issues
- [ ] Keep technical team on standby

### After Deployment
- [ ] Announce successful deployment
- [ ] Share summary of improvements:
  - ✅ Dashboard now shows accurate real-time data
  - ✅ Inventory location tracking fixed
  - ✅ All modules properly connected
  - ✅ Calculations verified and accurate
- [ ] Provide support contact for any issues
- [ ] Share this verification checklist with team leads

---

## Support Contacts

- **Technical Lead:** [Name/Contact]
- **Database Admin:** [Name/Contact]
- **System Admin:** [Name/Contact]
- **Emergency Contact:** [Number]

---

## Notes & Observations

### Deployment Date: _______________
### Deployed By: _______________
### Deployment Duration: _______________

### Issues Encountered:
```
[Document any issues here]
```

### Resolution Steps Taken:
```
[Document resolutions here]
```

### Additional Changes Made:
```
[Document any additional changes here]
```

---

**Checklist Status:** Ready for Deployment ✅
**Last Updated:** August 3, 2026
**Version:** 1.0.0
