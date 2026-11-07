# **AquaSphere & Wadaana ERP — Full-Stack UI/UX, Logical, Security & Performance Audit \+ Antigravity Execution Playbook (with Graphify Blast-Radius Map)**

**Target Audience:** This document is written as an authoritative, zero-ambiguity execution specification for **Antigravity**. Every issue discovered across our full-repository scan of ehtisham-hashim/aquasphere (Frontend React \+ Vite \+ Tailwind v4, Backend Express \+ Prisma \+ PostgreSQL) is paired with:

> 1. **Exact File Path & Line Numbers**  
> 2. **Graphify Blast-Radius Map (graphify affected \--depth 2\)** so Antigravity knows every upstream/downstream file impacted before editing  
> 3. **Root Cause Explanation**  
> 4. **Exact Copy-Paste Code Fix & Regression Guardrails**

## **0\. Mandatory Graphify Protocol & Core Codebase Invariants for Antigravity**

Before modifying any file, Antigravity MUST run or check the **Graphify** dependency graph (graphify-out/graph.json — 401 nodes, 1,135 edges, 56 communities) and obey these **5 non-negotiable invariants**:

> * **Invariant 1 — Preserve Original Component Prop Contracts**:  
  * MainLayout.jsx passes isOpen, onClose, isCollapsed to \<Sidebar /\>, and passes onMobileMenuClick, onToggleCollapse, isCollapsed to \<TopNav /\>. Never rename these props.  
  * ExpensesTable.jsx is shared by **BOTH** pages/Expenses.jsx AND pages/Transport.jsx (Vehicle Expenses tab). It accepts { filteredExpenses, loading, selectedCategory, setSelectedCategory, search, setSearch, userName, categories, onDeleteExpense, canDelete }. Never rename these props or Transport.jsx will break\!  
> * **Invariant 2 — Global window.fetch Interceptor in apiCache.js**:  
  * frontend/src/utils/apiCache.js exports setupApiCache() (called in main.jsx) and clearCache(pattern) (re-exported by utils/api.js and imported by 26 files).  
  * All components call standard fetch(...), which is intercepted by setupApiCache() in apiCache.js. Never remove setupApiCache() or clearCache() from apiCache.js.  
> * **Invariant 3 — Strict Flat-Array Backend API Contract**:  
  * All backend list endpoints MUST return { success: true, data: \[...\], ...meta } where json.data is a flat array (Array.isArray(json.data) \=== true).  
> * **Invariant 4 — Multi-Tenant Isolation (aquasphere vs wadaana)**:  
  * Every API call must include headers: { 'x-tenant': tenant } and credentials: 'include'.  
> * **Invariant 5 — Public /reports vs Protected /erp-reports**:  
  * /reports is the public Lab Test Reports page (outside MainLayout); /erp-reports is the internal ERP Reports & Analytics page (inside MainLayout).

### **Master Graphify Blast-Radius Reference Table**

| File Path | Graphify Degree | Direct & Depth-2 Affected Files (graphify affected)   |
| :---- | :---- | :---- |
| frontend/src/utils/apiCache.js | 26 edges | main.jsx, api.js, SSEContext.jsx, AuthContext.jsx, BottleCustodyWidget.jsx, ProcessDeliveryModal.jsx, BulkImportCustomersModal.jsx, BottleAdjustmentModal.jsx, VendorPaymentModal.jsx, CounterSales.jsx, and globally intercepts window.fetch across all 15 ERP pages. |
| frontend/src/components/layout/MainLayout.jsx | 6 edges | App.jsx, Sidebar.jsx, TopNav.jsx, RouteErrorBoundary.jsx, and all 15 protected ERP routes rendered inside \<Outlet /\>. |
| frontend/src/components/layout/TopNav.jsx | 8 edges | MainLayout.jsx, AuthContext.jsx, TenantContext.jsx, roleAccess.js, adminDashboard.controller.js (/admin/notification-alerts). |
| frontend/src/components/layout/Sidebar.jsx | 22 edges | MainLayout.jsx, versionCheck.js, whatsapp.js, roleAccess.js, and dynamic import() edges to all 15 ERP pages in PREFETCH\_MAP. |
| frontend/src/components/expenses/ExpensesTable.jsx | 8 edges | components/expenses/index.js → **BOTH** pages/Expenses.jsx AND pages/Transport.jsx (Vehicle Expenses tab). |
| frontend/src/pages/Transport.jsx | 14 edges | App.jsx, Sidebar.jsx, CarsTable.jsx, AddEditCarModal.jsx, VehicleDetailPanel.jsx, ExpensesSummaryCards.jsx, ExpensesTable.jsx, LogExpenseModal.jsx, expense.controller.js, vehicle.controller.js. |
| backend/src/routes/events.routes.js & sseBus.js | 29 edges | backend/src/index.js, SSEContext.jsx, and all 14 backend controllers calling broadcastEvent(). |
| backend/src/routes/analytics.routes.js | 12 edges | analytics.controller.js, alerts.controller.js, Dashboard.jsx, OwnerDashboardView.jsx, AccountantDashboardView.jsx, MarketingDashboardView.jsx, ProductionDashboardView.jsx, CustomerRiskHub.jsx, AlertsSection.jsx, dailyCloseService.js. |

## ---

**1\. UI & UX Issues (Mobile Layout, Disappearing Navbar, Touch & Visual Bugs)**

### **\[UI-01\] Navbar (TopNav) Disappears on Mobile & Stuck Error Boundary Across Navigation**

> * **Files Affected**:  
  * frontend/src/components/layout/MainLayout.jsx (Lines 31–51)  
  * frontend/src/components/layout/TopNav.jsx (Lines 132–178)  
  * frontend/src/components/common/RouteErrorBoundary.jsx (Lines 19–55)  
> * **Graphify Blast Radius**: Affects all 15 authenticated ERP pages inside MainLayout.  
> * **Root Causes**:  
  1. MainLayout.jsx:L31 & L37 uses h-screen (100vh) instead of h-dvh (100dvh). On mobile browsers (iOS Safari / Android Chrome), 100vh exceeds the visible viewport when the browser address bar is visible.  
  2. TopNav.jsx:L132 renders \<header className="h-14 ... sticky top-0 z-20"\> without shrink-0 (flex-shrink: 0\) or w-full min-w-0, and MainLayout.jsx:L43 renders \<main className="flex-1 overflow-y-auto ..."\> without overflow-x-hidden min-w-0 max-w-full. When a child page (like Expenses.jsx or Transport.jsx) has wide horizontal elements, the flex container overflows or compresses TopNav.  
  3. MainLayout.jsx:L45 mounts \<RouteErrorBoundary\> without key={location.pathname}, and App.jsx:L71 wraps \<Routes\> in an outer \<RouteErrorBoundary\> outside MainLayout. If a page throws a render error, RouteErrorBoundary.state.hasError stays true even when the user clicks another page in Sidebar, locking the UI until a full page reload\!  
> * **Exact Instructions for Antigravity**:  
  1. In MainLayout.jsx:  
     * Import useLocation from 'react-router-dom' and get const location \= useLocation();.  
     * Change the outer wrapper class (Line 31\) to: "flex h-dvh min-h-dvh w-full max-w-full overflow-hidden bg-slate-50 text-slate-900 font-sans antialiased".  
     * Change the inner column class (Line 37\) to: "flex-1 flex flex-col h-dvh min-h-dvh overflow-hidden min-w-0 max-w-full".  
     * Change \<main\> class (Line 43\) to: "flex-1 overflow-y-auto overflow-x-hidden px-3.5 py-4 sm:px-6 sm:py-6 min-w-0 max-w-full" and add min-w-0 to \<div className="max-w-7xl mx-auto w-full min-w-0"\>.  
     * Add key={location.pathname} to \<RouteErrorBoundary key={location.pathname}\> so navigating via the Sidebar automatically resets any error state.  
  2. In TopNav.jsx:  
     * Change \<header\> class (Line 132\) to include shrink-0 w-full min-w-0 z-30: "h-14 shrink-0 w-full min-w-0 border-b border-slate-200/90 bg-white/95 backdrop-blur-xs flex items-center justify-between gap-2 px-3.5 sm:px-6 sticky top-0 z-30 shadow-2xs".  
     * Add min-w-0 flex-1 to the left container (Line 133), shrink-0 to the mobile menu button (Line 135), min-w-0 to the title div (Line 151\) with truncate on \<h1\> and \<p\>, and shrink-0 to the right-side action container (Line 157).

### **\[UI-02\] Transport.jsx (Vehicle Expenses Tab) 7-Button Time Horizon Strip Overflows Mobile Screens by 200px+**

> * **File & Lines**: frontend/src/pages/Transport.jsx (Lines 232, 339–359).  
> * **Graphify Blast Radius**: Transport.jsx (/transport — default tab is expenses).  
> * **Root Cause**: At Line 343, the 7 timeframe buttons (YESTERDAY, LAST3DAYS, DAILY, WEEKLY, MONTHLY, YEARLY, LIFETIME) sit inside \<div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5"\> with no overflow-x-auto, no flex-wrap, and no shrink-0 on buttons. This forces a minimum width of \~560px, breaking 360px–414px mobile screens.  
> * **Exact Instructions for Antigravity**:  
  * In Transport.jsx:L232, change \<div className="space-y-4"\> to \<div className="space-y-4 min-w-0 max-w-full overflow-x-hidden"\>.  
  * In Transport.jsx:L341-L358, add min-w-0 max-w-full to the wrapper and overflow-x-auto max-w-full no-scrollbar to the button strip, with shrink-0 whitespace-nowrap on each button (or replace the 7-button strip with \<TimeframeDropdown /\> to match ExpensesHeader.jsx).

### **\[UI-03\] Expenses.jsx & ExpensesTable.jsx Horizontal Flex Overflow on Mobile**

> * **File & Lines**: frontend/src/pages/Expenses.jsx (Line 125\) and frontend/src/components/expenses/ExpensesTable.jsx (Lines 21–24, 54).  
> * **Graphify Blast Radius**: ExpensesTable.jsx affects **both** Expenses.jsx and Transport.jsx.  
> * **Root Cause**: Neither Expenses.jsx:L125 (\<div className="space-y-4"\>) nor ExpensesTable.jsx:L21 (\<div className="space-y-3"\>) sets min-w-0 max-w-full. Inside a flex layout, children default to min-width: auto, allowing the 10-category filter bar and table container to stretch the parent width on mobile.  
> * **Exact Instructions for Antigravity**:  
  * In Expenses.jsx:L125, change \<div className="space-y-4"\> to \<div className="space-y-4 min-w-0 max-w-full overflow-x-hidden"\>.  
  * In ExpensesTable.jsx:L21, change \<div className="space-y-3"\> to \<div className="space-y-3 min-w-0 max-w-full"\> and add w-full max-w-full min-w-0 to .table-container (Line 54).

### **\[UI-04\] TopNav.jsx Activity Alerts Popover Clips Off Mobile Screen & Lacks Click-Outside Close**

> * **File & Lines**: frontend/src/components/layout/TopNav.jsx (Lines 159–185).  
> * **Root Cause**:  
  1. The Bell button is positioned to the left of the Company Badge and Sign Out button. Its dropdown uses absolute right-0 mt-2 w-72 sm:w-96, which extends 288px to the left of the Bell icon and clips off the left edge of 320px–360px mobile screens.  
  2. There is no mousedown click-outside listener on the alerts dropdown, so tapping anywhere outside the menu does not close it.  
> * **Exact Instructions for Antigravity**:  
  * Add a const alertsMenuRef \= useRef(null); and a mousedown useEffect listener in TopNav.jsx to close showAlertsMenu when clicking outside.  
  * Change the dropdown positioning class at Line 174 from "absolute right-0 mt-2 w-72 sm:w-96 ..." to "fixed sm:absolute right-2 sm:right-0 left-2 sm:left-auto top-14 sm:top-auto sm:mt-2 sm:w-96 ...".  
  * Also change the company badge dot at Line 245 from \${isWadaana ? 'bg-purple-600' : 'bg-brand'} to bg-brand (since \--brand is already defined as Electric Sky Blue \#0284c7 for Wadaana in index.css:L35).

### **\[UI-05\] Purchases.jsx Flashes "No Purchase Records Found" Empty State During Initial Load**

> * **File & Lines**: frontend/src/pages/Purchases.jsx (Lines 24–78) and frontend/src/components/purchases/PurchasesTable.jsx (Lines 22–36).  
> * **Graphify Blast Radius**: Purchases.jsx → PurchasesTable.jsx.  
> * **Root Cause**: Unlike every other ERP page, Purchases.jsx has **no loading state**\! While GET /purchases is in-flight on initial mount, purchases is \[\], so PurchasesTable.jsx:L22 immediately renders the empty state card (*"No Purchase Records Found — Record First Purchase"*) for 1–2 seconds before the table rows pop in.  
> * **Exact Instructions for Antigravity**:  
  * Add const \[loading, setLoading\] \= useState(true); and const hasLoadedRef \= useRef(false); in Purchases.jsx.  
  * Pass loading={loading} to \<PurchasesTable /\> and render a spinner/skeleton when loading && purchases.length \=== 0 before checking \!purchases \|\| purchases.length \=== 0\.

### **\[UI-06\] Login.jsx 2FA "Step 3 • Verified" Water Bottle Animation Never Renders**

> * **File & Lines**: frontend/src/pages/Login.jsx (Lines 88–95, 403–469) & frontend/src/context/AuthContext.jsx (Lines 113–138) & frontend/src/App.jsx (Lines 61–65).  
> * **Root Cause**: In Login.jsx:L88-L95, when verifyOwnerOtp resolves with result.success \=== true, AuthContext.jsx:L131 has already called setUser(data.data.user). Because /login is wrapped in \<PublicRoute\> (if (user) return \<Navigate to="/dashboard" replace /\>;), React unmounts \<Login /\> in the same render frame, so setIsVerifiedEffect(true) (Lines 403–469) is never seen by the user\!  
> * **Exact Instructions for Antigravity**: If the water-bottle verification animation is desired, delay calling setUser(...) by 900ms via a callback or remove the dead 65-line SVG modal block from Login.jsx:L403-L469.

### **\[UI-07\] Native Blocking window.confirm() Dialogs in Customers.jsx, CustomerDetails.jsx, and RawMaterials.jsx**

> * **File & Lines**:  
  * frontend/src/pages/Customers.jsx:L101 (window.confirm on restore customer)  
  * frontend/src/components/customer/CustomerDetails.jsx:L82 (window.confirm on delete customer)  
  * frontend/src/pages/RawMaterials.jsx:L83 (confirm on archive/restore material)  
> * **Exact Instructions for Antigravity**: Replace those three native browser window.confirm() calls with the existing \<DeleteConfirmationModal /\> component from components/ui for visual consistency across desktop and mobile.

## ---

**2\. Logical & Business-Rule Bugs**

### **\[LOGIC-01\] Null-Unsafe ex.category.toLowerCase() and ex.category.replace() Crash Expenses & Transport Routes**

> * **File & Lines**:  
  * frontend/src/pages/Expenses.jsx (Lines 59, 81\)  
  * frontend/src/pages/Transport.jsx (Lines 186, 211\)  
  * frontend/src/components/expenses/ExpensesTable.jsx (Line 96\)  
> * **Graphify Blast Radius**: Expenses.jsx, Transport.jsx, ExpensesTable.jsx.  
> * **Root Cause**: ex.category.toLowerCase() and ex.category.replace(...) assume ex.category is always a non-null string. If any record has category \== null (e.g., a legacy TransportExpense record which uses ex.type), it throws a fatal TypeError during render/filter, crashing the page into RouteErrorBoundary.  
> * **Exact Instructions for Antigravity**:  
  * In Expenses.jsx:L58-L60: use const cat \= String(ex.category \|\| ex.type \|\| 'Miscellaneous'); before calling .toLowerCase() or .replace().  
  * In Transport.jsx:L186 & L211: use String(ex.category \|\| ex.type \|\| '').  
  * In ExpensesTable.jsx:L96: render {ex.category \|\| ex.type \|\| 'Miscellaneous'}.

### **\[LOGIC-02\] Transport Expense Category Mismatch Between Transport.jsx, TransportDashboardView.jsx, and expense.controller.js**

> * **File & Lines**:  
  * frontend/src/pages/Transport.jsx (Lines 170–176)  
  * frontend/src/components/dashboard/TransportDashboardView.jsx (Lines 59–60)  
  * backend/src/controllers/expense.controller.js (Lines 37 vs 302\)  
> * **Graphify Blast Radius**: Transport.jsx, TransportDashboardView.jsx, expense.controller.js, constants/expenses.js.  
> * **Root Cause**:  
  1. TransportDashboardView.jsx:L59-L60 filters transport expenses using \['Fuel / Transport', 'Fuel', 'Vehicle Repairs', 'Vehicle Repair', 'Maintenance'\].includes(e.category) \|\| Boolean(e.vehicleId).  
  2. Transport.jsx:L173 filters using ONLY \['Fuel / Transport', 'Fuel', 'Vehicle Repairs', 'Vehicle Repair'\].includes(ex.category) — omitting 'Maintenance' and Boolean(ex.vehicleId)\! As a result, vehicle-linked expenses or maintenance expenses appear on the Transport Dashboard KPI cards but disappear when the user clicks through to /transport\!  
  3. In backend/src/controllers/expense.controller.js, getExpenses (Line 37\) allows 'Maintenance' for TRANSPORT\_MANAGER, but createExpense (Line 302\) omits 'Maintenance' from TM\_ALLOWED\_CATEGORIES\!  
> * **Exact Instructions for Antigravity**:  
  * In Transport.jsx:L170-L176, update the filter to:  
    `const transportExpenses = useMemo(() => {`  
      `const TRANSPORT_CATS = ['Fuel / Transport', 'Fuel', 'Vehicle Repairs', 'Vehicle Repair', 'Maintenance'];`  
      `return expenses.filter(ex => TRANSPORT_CATS.includes(ex.category) || Boolean(ex.vehicleId));`  
    `}, [expenses]);`  
  * In backend/src/controllers/expense.controller.js:L302, add 'Maintenance' to TM\_ALLOWED\_CATEGORIES.

### **\[LOGIC-03\] CarsTable.jsx Blocks OWNER and ADMIN from Editing or Deactivating Vehicles**

> * **File & Lines**: frontend/src/components/transport/CarsTable.jsx (Line 19\) vs frontend/src/pages/Transport.jsx (Line 229\) vs backend/src/routes/vehicle.routes.js (Lines 9–12).  
> * **Graphify Blast Radius**: CarsTable.jsx ← Transport.jsx.  
> * **Root Cause**: Transport.jsx:L229 sets canManageCars \= user?.role \=== 'TRANSPORT\_MANAGER' \|\| user?.role \=== 'OWNER', and backend/src/routes/vehicle.routes.js allows 'OWNER', 'ADMIN', 'TRANSPORT\_MANAGER'. However, CarsTable.jsx:L19 hardcodes const canManage \= user?.role \=== 'TRANSPORT\_MANAGER';\! This hides the Edit and Active/Inactive toggle buttons from the OWNER\!  
> * **Exact Instructions for Antigravity**: In CarsTable.jsx:L19, change const canManage \= user?.role \=== 'TRANSPORT\_MANAGER'; to:  
>   `const canManage = ['OWNER', 'ADMIN', 'TRANSPORT_MANAGER'].includes(user?.role);`

### **\[LOGIC-04\] Users.jsx Ignores API Errors on Create, Update & Status Toggle (Silent Failure)**

> * **File & Lines**: frontend/src/pages/Users.jsx (Lines 71–103).  
> * **Graphify Blast Radius**: Users.jsx → backend/src/controllers/user.controller.js.  
> * **Root Cause**: submitUser (Lines 71–93) and toggleStatus (Lines 95–103) call await fetch(...) without inspecting res.ok or await res.json(), never show any toast.error or toast.success, and unconditionally close the modal (setIsModalOpen(false)) even when the backend returns 400 Bad Request or 409 Conflict (duplicate email).  
> * **Exact Instructions for Antigravity**: Import { toast } from 'sonner' in Users.jsx, parse const json \= await res.json(); in both submitUser and toggleStatus, show toast.error(json.message \|\| 'Operation failed') and keep the modal open if \!res.ok \|\| \!json.success, and show toast.success(...) on success.

### **\[LOGIC-05\] Vendors.jsx Resets loading \= true on Every Live SSE Event**

> * **File & Lines**: frontend/src/pages/Vendors.jsx (Lines 47–73).  
> * **Graphify Blast Radius**: Vendors.jsx ← SSEContext.jsx (PURCHASE\_CREATED, EXPENSE\_LOGGED, VENDOR\_UPDATED).  
> * **Root Cause**: fetchVendors in Vendors.jsx:L48 unconditionally sets setLoading(true) at the start of every call, and Line 73 passes useLiveEvent(\['PURCHASE\_CREATED', 'EXPENSE\_LOGGED', 'VENDOR\_UPDATED'\], fetchVendors). Whenever any user logs an expense or purchase anywhere in the plant, anyone viewing the Vendors page has their entire table replaced by a loading spinner\!  
> * **Exact Instructions for Antigravity**: Add const hasLoadedRef \= useRef(false); in Vendors.jsx, change signature to const fetchVendors \= useCallback(async (isBackground \= false) \=\> { if (\!isBackground && \!hasLoadedRef.current) setLoading(true); ... hasLoadedRef.current \= true; }, \[...\]), and pass () \=\> fetchVendors(true) to useLiveEvent.

### **\[LOGIC-06\] Missing Explicit x-tenant Header in AccountantDashboardView.jsx & AddOrderModal.jsx**

> * **File & Lines**:  
  * frontend/src/components/dashboard/AccountantDashboardView.jsx (Lines 126–127)  
  * frontend/src/components/orders/AddOrderModal.jsx (Line 67\)  
> * **Exact Instructions for Antigravity**: Add headers: { 'x-tenant': tenant } (and activeTenant in AddOrderModal.jsx:L67) to those fetch() calls so they do not rely solely on cookie fallback during multi-tenant switching.

## ---

**3\. Security Vulnerabilities**

### **\[SEC-01\] Unauthenticated SSE Stream Endpoint (Information Disclosure)**

> * **File & Lines**: backend/src/routes/events.routes.js (Lines 1–10) & backend/src/utils/sseBus.js (Lines 8–41).  
> * **Graphify Blast Radius**: events.routes.js → sseBus.js ← SSEContext.jsx.  
> * **Vulnerability**: events.routes.js mounts router.get('/stream', streamEvents) without verifyJWT\! Any unauthenticated external client can open /api/v1/events/stream?tenant=aquasphere and listen to live operational events. Note that SSEContext.jsx:L98 *already* sends both credentials cookies and \&token=\${encodeURIComponent(token)}, and verifyJWT in auth.middleware.js:L27 *already* reads req.cookies?.token \|\| req.header('Authorization') \|\| req.query?.token\!  
> * **Exact Instructions for Antigravity**:  
>   `// In backend/src/routes/events.routes.js:`  
>   `import { Router } from 'express';`  
>   `import { streamEvents } from '../utils/sseBus.js';`  
>   `import { verifyJWT } from '../middlewares/auth.middleware.js';`

>   `const router = Router();`  
>   `router.use(verifyJWT);`

>   `router.get('/stream', streamEvents);`  
>   `router.get('/', streamEvents);`

>   `export default router;`

### **\[SEC-02\] Owner 2FA OTP Printed in Plaintext to Server Logs & Missing Brute-Force Rate Limit**

> * **File & Lines**: backend/src/controllers/auth.controller.js (Lines 97, 150–175, 216\) & backend/src/routes/auth.routes.js (Lines 1–12).  
> * **Graphify Blast Radius**: auth.controller.js ← auth.routes.js.  
> * **Vulnerability**:  
  1. Lines 97 and 216 execute console.log(\`\[2FA OTP\] Code generated and sent to Owner (...): \${otp}\`), leaking the Owner's 6-digit 2FA OTP into container stdout logs.  
  2. POST /api/v1/auth/login and POST /api/v1/auth/verify-owner-otp are only covered by the global max: 3000 requests / 15 min limiter in backend/src/index.js:L44, allowing 3,000 password or 6-digit OTP guesses per 15 minutes from a single IP.  
> * **Exact Instructions for Antigravity**:  
  * In auth.controller.js:L97 & L216, remove : \${otp} from the console.log statement.  
  * In auth.routes.js, add an express-rate-limit middleware (windowMs: 15 \* 60 \* 1000, max: 15\) on /login, /verify-owner-otp, and /resend-owner-otp.

### **\[SEC-03\] Missing Role-Based Access Control (requireRoles) on /api/v1/analytics/\* Routes**

> * **File & Lines**: backend/src/routes/analytics.routes.js (Lines 1–18).  
> * **Graphify Blast Radius**: analytics.routes.js → analytics.controller.js ← Dashboard.jsx, OwnerDashboardView.jsx, AccountantDashboardView.jsx, MarketingDashboardView.jsx, ProductionDashboardView.jsx, CustomerRiskHub.jsx, AlertsSection.jsx, dailyCloseService.js.  
> * **Vulnerability**: analytics.routes.js only applies router.use(verifyJWT) without requireRoles(...). A TRANSPORT\_MANAGER or PRODUCTION\_MANAGER can query /api/v1/analytics/purchasing-summary or /api/v1/analytics/daily-summary to view confidential company cash balances and vendor payables.  
> * **Exact Instructions for Antigravity**:  
  * Carefully check which frontend roles call each analytics endpoint (from our Graphify map) before adding requireRoles:  
    * /dashboard & /dashboard/stream: called by Dashboard.jsx for OWNER, ADMIN, ACCOUNTANT, MARKETING\_MANAGER → requireRoles('OWNER', 'ADMIN', 'ACCOUNTANT', 'MARKETING\_MANAGER').  
    * /purchasing-summary: called by Dashboard.jsx only for OWNER, ADMIN, ACCOUNTANT → requireRoles('OWNER', 'ADMIN', 'ACCOUNTANT').  
    * /daily-summary: called by dailyCloseService.js for OWNER, ADMIN, ACCOUNTANT → requireRoles('OWNER', 'ADMIN', 'ACCOUNTANT').  
    * /production-dashboard & /production-loss: called by ProductionDashboardView.jsx and ProductionScrapLossWidget.jsx (used in OwnerDashboardView and ProductionDashboardView) → requireRoles('OWNER', 'ADMIN', 'PRODUCTION\_MANAGER', 'ACCOUNTANT').  
    * /bottle-custody & /mm-alerts: called by CustomerRiskHub.jsx and AlertsSection.jsx → requireRoles('OWNER', 'ADMIN', 'ACCOUNTANT', 'MARKETING\_MANAGER').

### **\[SEC-04\] Unthrottled Public Contact Form SMTP Trigger & Unvalidated JSON Body Size**

> * **File & Lines**: backend/src/routes/landingPage.routes.js (Line 15), backend/src/controllers/landingPage.controller.js (Lines 62–145), and backend/src/index.js (Line 85).  
> * **Vulnerability**:  
  1. POST /api/landing-page/contact is public and triggers sendContactInquiryEmail \+ file writes to contactInquiries.json with no dedicated rate limiter.  
  2. app.use(express.json()) in backend/src/index.js:L85 has no explicit payload limit.  
> * **Exact Instructions for Antigravity**: Add rateLimit({ windowMs: 15 \* 60 \* 1000, max: 5 }) to router.post('/contact', ...) in landingPage.routes.js, and set app.use(express.json({ limit: '2mb' })) in backend/src/index.js:L85.

### **\[SEC-05\] State-Mutating Endpoint Mounted with router.all('/sync-shrink-wrap')**

> * **File & Lines**: backend/src/routes/adminDashboard.routes.js (Line 29).  
> * **Exact Instructions for Antigravity**: Change router.all('/sync-shrink-wrap', syncShrinkWrap); to router.post('/sync-shrink-wrap', requireRoles('OWNER', 'ADMIN'), syncShrinkWrap);.

## ---

**4\. Performance, Mobile Navigation Latency & Memory Bottlenecks**

### **\[PERF-01\] Mobile Touch Navigation Stalls Because Sidebar.jsx Only Prefetches on Desktop onMouseEnter**

> * **File & Lines**: frontend/src/components/layout/Sidebar.jsx (Lines 35–75, 151–165).  
> * **Graphify Blast Radius**: Sidebar.jsx → all 15 lazy page chunks in App.jsx.  
> * **Root Cause**: safePrefetch(item.path) is only bound to onMouseEnter and onFocus. Mobile touch devices do not trigger onMouseEnter before a tap, so tapping a sidebar link downloads the JS chunk over the mobile network while showing \<PageLoader /\>.  
> * **Exact Instructions for Antigravity**:  
  1. In Sidebar.jsx:L156-L157, add onTouchStart={() \=\> safePrefetch(item.path)} and onPointerDown={() \=\> safePrefetch(item.path)} to \<NavLink\>.  
  2. Add a useEffect inside Sidebar that uses window.requestIdleCallback (or a 600ms timeout fallback) to sequentially call safePrefetch(item.path) for all navItems.filter(item \=\> isPageAllowedForRole(user?.role, item.path, tenant)) after initial mount, and immediately when isOpen becomes true on mobile.

### **\[PERF-02\] apiCache.js Stops Serving Stale-While-Revalidate After 30 Seconds (Forcing Blocking Refetches on Route Switch)**

> * **File & Lines**: frontend/src/utils/apiCache.js (Lines 9, 188–242).  
> * **Graphify Blast Radius**: Globally intercepts window.fetch for all 15 ERP pages and 26 directly connected modules.  
> * **Root Cause**:  
  * Look at frontend/src/utils/apiCache.js:L9 & L188:  
    `const DEFAULT_TTL = 30 * 1000; // 30 seconds`  
    `...`  
    `if (cached && now - cached.timestamp < ttl) {`  
      `// Stale-While-Revalidate: If data is older than 3s, refresh in background without blocking UI`  
      `if (now - cached.timestamp > 3000 && !inFlight.has(cacheKey)) { ... }`  
      `return new Response(cached.body, ...);`  
    `}`  
  * Because if (cached && now \- cached.timestamp \< ttl) uses ttl \= 30000 (30 seconds), **Stale-While-Revalidate only works between 3 seconds and 30 seconds\!** As soon as an entry is 30.1 seconds old, apiCache.js ignores the cached entry completely and blocks the UI on a full cold network fetch\!  
> * **Exact Instructions for Antigravity**:  
  * In frontend/src/utils/apiCache.js, define const MAX\_STALE\_TTL \= 10 \* 60 \* 1000; // 10 minutes alongside DEFAULT\_TTL \= 60 \* 1000;.  
  * Change Line 188 from if (cached && now \- cached.timestamp \< ttl) to if (cached && now \- cached.timestamp \< MAX\_STALE\_TTL). When now \- cached.timestamp \> 5000, trigger the background revalidation promise and immediately return new Response(cached.body, ...)\! Because all mutations and SSE events already call clearCache(...), serving in-memory SWR up to 10 minutes makes every single page transition across the entire ERP instantaneous (\<1ms response time)\!

### **\[PERF-03\] CounterSales.jsx Re-Renders the Entire POS Page & History Table Every 1 Second (60x/min)**

> * **File & Lines**: frontend/src/pages/CounterSales.jsx (Lines 39, 47–50).  
> * **Graphify Blast Radius**: CounterSales.jsx → CounterSalesHeader, CounterSalesStockBar, CounterSalesMetrics, LogCounterSaleForm, CounterSalesHistoryTable, CounterSaleReceiptModal.  
> * **Root Cause**: CounterSales.jsx:L47-L50 runs setInterval(() \=\> setLiveDateTime(new Date()), 1000\) at the top-level page state, forcing React to reconcile the entire POS form, stock bar, metrics grid, and paginated history table every 1 second.  
> * **Exact Instructions for Antigravity**: Change the interval in CounterSales.jsx:L48 from 1000 (1 second) to 30000 (30 seconds, since only hours/minutes or date are displayed) or move the clock state inside the small timestamp badge in LogCounterSaleForm.jsx.

### **\[PERF-04\] BottleCustodyWidget.jsx Hardcodes 'x-no-cache': '1' & cache: 'no-store' on Full Customer List**

> * **File & Lines**: frontend/src/components/dashboard/BottleCustodyWidget.jsx (Lines 23–33).  
> * **Graphify Blast Radius**: BottleCustodyWidget.jsx ← CustomerRiskHub.jsx ← OwnerDashboardView.jsx & MarketingDashboardView.jsx.  
> * **Root Cause**: Every time the Owner or Marketing Manager opens /dashboard, BottleCustodyWidget.jsx bypasses apiCache.js with 'x-no-cache': '1' and downloads the entire /customers table and /bottles/summary from scratch. Since useLiveEvent(\['CUSTOMER\_UPDATED', 'ORDER\_CREATED', 'ORDER\_UPDATED', 'BOTTLE\_UPDATED', 'INVENTORY\_CHANGED'\], loadData) and apiCache.js already invalidate cache on any mutation, bypassing the cache on every mount is completely redundant and slows down Dashboard mounting on mobile.  
> * **Exact Instructions for Antigravity**: Remove 'x-no-cache': '1' and cache: 'no-store' from BottleCustodyWidget.jsx:L25-L31 so it benefits from apiCache.js Stale-While-Revalidate.

### **\[PERF-05\] Uncapped GET /expenses & Purchase Merge in Expenses.jsx, Transport.jsx & expense.controller.js**

> * **File & Lines**: frontend/src/pages/Expenses.jsx (Line 36), frontend/src/pages/Transport.jsx (Line 146), and backend/src/controllers/expense.controller.js (Lines 201–246).  
> * **Graphify Blast Radius**: Expenses.jsx, Transport.jsx, expense.controller.js.  
> * **Root Cause**: Calling GET /expenses without ?limit= causes expense.controller.js to load all historical Expense rows and all historical Purchase rows from PostgreSQL, map and merge them in Node.js memory, and sort in *O((E+P) log(E+P))*.  
> * **Exact Instructions for Antigravity**:  
  * In Expenses.jsx:L36 and Transport.jsx:L146, pass ?limit=500 (fetch(\`\${API}/expenses?limit=500\`, ...)).  
  * In backend/src/controllers/expense.controller.js:L212-L227, cap the uncapped fallback queries with take: 500 so no caller can accidentally trigger an unbounded full-table memory dump.

### **\[PERF-06\] TopNav.jsx Polls /admin/notification-alerts Every 15 Seconds Even When Browser Tab Is Hidden**

> * **File & Lines**: frontend/src/components/layout/TopNav.jsx (Lines 77–97).  
> * **Exact Instructions for Antigravity**: Inside fetchAuditAlerts in TopNav.jsx:L80, add if (typeof document \!== 'undefined' && document.visibilityState \!== 'visible') return;, increase polling interval from 15000 (15s) to 45000 (45s), and subscribe to useLiveEvent(\['CUSTOMER\_UPDATED', 'INVENTORY\_CHANGED', 'ORDER\_UPDATED'\], fetchAuditAlerts) so alerts update in real time via SSE without hammering the server.

## ---

**5\. Copy-Paste Execution Checklist for Antigravity**

Send the following prompt directly to Antigravity after pulling the latest branch:  
Read the audit instructions in this document and execute the fixes in 4 atomic commits:

1\. **Commit 1 (Layout & UI/UX Shielding)**: Update MainLayout.jsx (h-dvh min-h-dvh, overflow-x-hidden min-w-0, \<RouteErrorBoundary key={location.pathname}\>), TopNav.jsx (shrink-0 w-full min-w-0 z-30, mobile-safe alerts dropdown positioning \+ click-outside handler, bg-brand tenant dot), Expenses.jsx & ExpensesTable.jsx (min-w-0 max-w-full overflow containment, preserve all original props), Transport.jsx (scrollable/wrapping 7-button Time Horizon strip on mobile), and Purchases.jsx (add loading state so empty state does not flash on mount).

2\. **Commit 2 (Mobile Instant Navigation & Performance)**: Update Sidebar.jsx (add onTouchStart/onPointerDown prefetching \+ requestIdleCallback background chunk preloader for allowed routes), apiCache.js (extend window.fetch Stale-While-Revalidate window to MAX\_STALE\_TTL \= 10 \* 60 \* 1000 while revalidating after 5s in background), CounterSales.jsx (change live clock interval from 1000ms to 30000ms), BottleCustodyWidget.jsx (remove x-no-cache bypass), and bound GET /expenses?limit=500 in Expenses.jsx, Transport.jsx, and expense.controller.js.

3\. **Commit 3 (Logical & Role Consistency Fixes)**: Fix null-unsafe ex.category in Expenses.jsx, Transport.jsx, and ExpensesTable.jsx; unify 'Maintenance' and Boolean(ex.vehicleId) filtering across Transport.jsx and expense.controller.js; allow OWNER and ADMIN in CarsTable.jsx:L19; add error handling and toasts in Users.jsx:L71-L103; prevent Vendors.jsx from flashing a full-table spinner on background SSE events; and add missing x-tenant headers in AccountantDashboardView.jsx and AddOrderModal.jsx.

4\. **Commit 4 (Backend Security Hardening)**: Add router.use(verifyJWT) to backend/src/routes/events.routes.js; remove plaintext \${otp} from console.log in auth.controller.js and add strict rate-limiting (15 req / 15 min) on /login, /verify-owner-otp, and /resend-owner-otp in auth.routes.js; add role guards (requireRoles) to backend/src/routes/analytics.routes.js; add rate-limiting to POST /api/landing-page/contact; and change router.all('/sync-shrink-wrap') to router.post in adminDashboard.routes.js.