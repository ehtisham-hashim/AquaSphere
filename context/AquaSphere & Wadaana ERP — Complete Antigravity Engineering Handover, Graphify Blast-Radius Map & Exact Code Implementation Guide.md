# **AquaSphere & Wadaana ERP — Complete Antigravity Engineering Handover, Graphify Blast-Radius Map & Exact Code Implementation Guide**

**Purpose of this Document:** This is a self-contained, zero-ambiguity engineering handover and execution prompt designed to be fed directly to **Antigravity** (or any autonomous coding agent). It contains all deep architectural knowledge, Graphify dependency & blast-radius mappings (401 nodes, 1,135 edges, 56 communities), root-cause diagnoses, PERN/React complexity audits, non-negotiable domain invariants, and the **exact file-by-file code changes** required to fix the mobile navigation delay and disappearing navbar on Expenses without breaking any connected module.

## **1\. Non-Negotiable Codebase Invariants (Read Before Touching Any File)**

Before Antigravity modifies any file in ehtisham-hashim/aquasphere, it **MUST** enforce these 6 architectural rules derived from PROJECT\_RULES.md and our full codebase audit:

> 1. **Multi-Tenant Isolation (aquasphere vs. wadaana)**:  
   * Backend database routing uses Node's AsyncLocalStorage in backend/src/config/db.js (\`Prisma.\$extends\`) to dynamically route queries between aquasphere\_\* and wadaana\_\* PostgreSQL tables.  
   * Every frontend API request MUST pass headers: { 'x-tenant': tenant } and credentials: 'include'.  
   * Every cache key in frontend/src/utils/apiCache.js MUST stay prefixed with $tenant:${url} so switching between AquaSphere and Wadaana Industries never leaks cross-tenant data.  
> 2. **Strict Flat-Array API Response Contract**:  
   * All backend list endpoints (/orders, /customers, /items, /production, /purchases, /vendors, /expenses, /spot-sales, /vehicles) MUST return { success: true, data: \[...\], meta: { nextCursor, hasMore } } where json.data is a **flat JavaScript Array** (Array.isArray(json.data) \=== true).  
   * NEVER nest list arrays inside data.expenses or data.items, or frontend .filter() / .map() calls across 15+ pages will throw TypeError: ... is not a function.  
> 3. **Real-Time SSE Cache Invalidation Contract (SSEContext.jsx)**:  
   * frontend/src/context/SSEContext.jsx maps backend Server-Sent Events (ORDER\_CREATED, PAYMENT\_RECORDED, STOCK\_UPDATED, PRODUCTION\_COMPLETED, PURCHASE\_CREATED, EXPENSE\_LOGGED, DAILY\_CLOSE\_UPDATED) to clearCache('/endpoint') and triggers useLiveEvent(...) subscribers.  
   * apiCache.js MUST export cachedFetch(url, options, ttl) and clearCache(urlSubstring) with 100% backward-compatible signatures.  
> 4. **Shared Expenses Component Tree (Expenses.jsx & Transport.jsx)**:  
   * Graphify dependency analysis revealed that frontend/src/components/expenses/ExpensesTable.jsx, ExpensesSummaryCards.jsx, and LogExpenseModal.jsx are imported and rendered by **BOTH** frontend/src/pages/Expenses.jsx (/expenses) AND frontend/src/pages/Transport.jsx (/transport — which is labeled **"Vehicle Expenses"** in Sidebar.jsx for TRANSPORT\_MANAGER and defaults to activeTab \= 'expenses').  
   * Any prop change in ExpensesTable.jsx (such as hideCategoryPills, categoriesList, isOwner, onEdit, onDelete) immediately affects both /expenses and /transport.  
> 5. **Daily Close Financial Lock (checkDailyCloseLock & isDateClosed)**:  
   * Non-OWNER users cannot create, edit, or delete historical records on dates that have been closed in DailyClose. Preserve isDateClosed(ex.date) && \!isOwner locks in ExpensesTable.jsx.  
> 6. **Public vs. Protected Route Split (/reports vs. /erp-reports)**:  
   * In frontend/src/App.jsx:L98-L105, /reports is a **PUBLIC** route outside \<MainLayout /\> that renders \<PublicReports /\> (Lab Test Reports with \<PublicNavbar /\>, where the ERP Sidebar and TopNav do not exist).  
   * The internal ERP Reports & Analytics page is mounted at /erp-reports inside \<MainLayout /\>. Never link internal ERP buttons to /reports; always use /erp-reports.

## **2\. Graphify Dependency Graph & Cross-File Impact Depths**

We ran **Graphify** across the entire repository (401 nodes, 1,135 edges, 56 communities, 0 circular dependencies) to trace how every file connects before planning any edits.

### **2.1 Top 15 God Nodes (Highest Connectivity in AquaSphere)**

| Rank | File Path | Degree | Why It Is a Hub (Blast Radius)   |
| :---- | :---- | :---- | :---- |
| 1 | backend/src/config/db.js | 59 edges | Prisma multi-tenant client proxy imported by every backend controller, middleware, and script. |
| 2 | frontend/src/context/TenantContext.jsx | 56 edges | Imported by all 15 pages, all modals, Sidebar, TopNav, and dashboard views. |
| 3 | frontend/src/utils/api.js | 54 edges | Supplies API\_URL and global window.fetch 401 session interceptor. |
| 4 | backend/prisma/schema.prisma | 52 edges | Defines 40+ Prisma models across aquasphere and wadaana schemas. |
| 5 | backend/scripts/reset-data.js | 43 edges | Touches all Prisma models for data seeding/reset. |
| 6 | frontend/src/components/ui/index.js | 37 edges | Shared UI barrel (Modal, ConfirmModal, Badge, Button, Toast). |
| 7 | frontend/src/context/AuthContext.jsx | 33 edges | Supplies user, user.role, login, logout across pages and guards. |
| 8 | frontend/src/pages/Orders.jsx | 29 edges | Couples orders, customers, items, marketers, PDF statements, and SSE listeners. |
| 9 | frontend/src/context/SSEContext.jsx | 29 edges | Real-time event bus; connects backend broadcastEvent to apiCache.clearCache and useLiveEvent. |
| 10 | frontend/src/App.jsx | 28 edges | Root router lazy-loading all pages and wrapping ProtectedRoute \+ MainLayout. |
| 11 | frontend/src/utils/apiCache.js | 26 edges | Imported by 26 frontend pages, dashboard views, widgets, and contexts. |
| 12 | backend/src/index.js | 26 edges | Express app entry point mounting all 17 backend route modules. |
| 13 | backend/src/middlewares/auth.middleware.js | 26 edges | JWT \+ tenant verification middleware protecting all backend routes. |
| 14 | backend/src/controllers/customer.controller.js | 24 edges | Queried by Orders, Customers, CounterSales, TopNav, OwnerDashboard, and CustomerRiskHub. |
| 15 | backend/src/controllers/item.controller.js | 23 edges | Queried by Inventory, RawMaterials, Production, Purchases, Orders, CounterSales, and TopNav. |

### **2.2 Exact Blast-Radius Map for Files We Are Modifying (graphify affected \--depth 2\)**

> * **frontend/src/utils/apiCache.js (26 Direct Dependents)**:  
  * Pages: Dashboard.jsx, Orders.jsx, CounterSales.jsx, Customers.jsx, Production.jsx, Inventory.jsx, RawMaterials.jsx, Purchases.jsx, Expenses.jsx, Vendors.jsx, Transport.jsx, Reports.jsx, ProductPricing.jsx  
  * Dashboard & Widgets: OwnerDashboardView.jsx, TransportDashboardView.jsx, CustomerRiskHub.jsx, BottleCustodyWidget.jsx, ProductionScrapLossWidget.jsx  
  * Modals, Hooks & Contexts: AdminClose.jsx, OwnerClose.jsx, VendorPaymentModal.jsx, useDailyClose.js, SSEContext.jsx, Sidebar.jsx  
> * **frontend/src/components/layout/MainLayout.jsx, TopNav.jsx, Sidebar.jsx**:  
  * MainLayout.jsx wraps \<Sidebar /\>, \<TopNav /\>, and \<RouteErrorBoundary\>\<Suspense\>\<Outlet /\>\</Suspense\>\</RouteErrorBoundary\> for all 15 authenticated ERP routes in App.jsx.  
> * **frontend/src/pages/Expenses.jsx & frontend/src/components/expenses/ExpensesTable.jsx**:  
  * Expenses.jsx connects to TenantContext.jsx, AuthContext.jsx, SSEContext.jsx (listening to EXPENSE\_LOGGED and PURCHASE\_CREATED), apiCache.js, components/expenses/index.js (ExpensesHeader, ExpensesSummaryCards, ExpensesTable, LogExpenseModal), components/ui/index.js (ConfirmModal), and backend/src/controllers/expense.controller.js (GET /expenses, DELETE /expenses/:id).  
  * ExpensesTable.jsx is imported by components/expenses/index.js, which is consumed by **both** pages/Expenses.jsx and pages/Transport.jsx.

## **3\. Deep Root-Cause Diagnosis (Expert Findings)**

### **3.1 Issue \#1: Why Pages Load Very Late (Not Instantly) When Navigating on Mobile**

When a user on a mobile phone taps the hamburger menu and navigates between pages (e.g., Dashboard → Expenses → Orders → Transport), the UI stalls for **800ms–3,500ms+** due to three compounding bottlenecks:

> 1. **Desktop-Only Route Chunk Prefetching in Sidebar.jsx (Lines 35–70, 156–157)**:  
   * All 15 ERP pages in App.jsx:L11-L29 are lazy-loaded via lazyWithRetry(() \=\> import('./pages/...')).  
   * In Sidebar.jsx:L156-L157, safePrefetch(item.path) was attached **only** to onMouseEnter and onFocus.  
   * On mobile devices, the sidebar drawer is hidden (-translate-x-full) until opened, and touch screens do **not** fire onMouseEnter before a tap. When the user taps a NavLink, React Router starts downloading the lazy JS chunk over the mobile network *after* the tap, causing \<Suspense fallback={\<PageLoader /\>}\> in MainLayout.jsx to unmount the current page and show a blank 60vh spinner.  
> 2. **Unused TanStack Query \+ 30s Hard Cache Deletion in apiCache.js \+ Component Unmount Resets**:  
   * Although @tanstack/react-query (^5.102.8) and PersistQueryClientProvider are configured in frontend/src/lib/queryClient.js and mounted in main.jsx, **not a single page component uses useQuery**.  
   * Instead, every page uses local useState(\[\]) \+ useEffect(() \=\> cachedFetch(...)) with const \[loading, setLoading\] \= useState(true) and const hasLoadedRef \= useRef(false). Whenever the user switches routes, React unmounts the page component and resets loading \= true and hasLoadedRef.current \= false on the next mount.  
   * In frontend/src/utils/apiCache.js:L10-L35, VOLATILE\_ENDPOINTS includes all 21 endpoints (which completely disables sessionStorage caching), and DEFAULT\_TTL \= 30 \* 1000 hard-deletes in-memory entries after 30 seconds (or after any SSE event in SSEContext.jsx). Navigating after 30s forces a blocking cold network round-trip before rendering anything.  
> 3. **Uncapped Historical Database Merges & Multi-Request Waterfalls (Expenses.jsx, expense.controller.js, Orders.jsx, CounterSales.jsx)**:  
   * In Expenses.jsx:L36, cachedFetch('\${API}/expenses') is called with **no ?limit= and no date filter**.  
   * In backend/src/controllers/expense.controller.js:L201-L246, when GET /expenses is called without limit, Prisma runs prisma.expense.findMany({ take: undefined }) AND prisma.purchase.findMany({ include: { vendor: true } }) (which had **no take limit at all**\!), maps all historical purchases into virtual expense objects in Node.js RAM, sorts the combined array in *O((E+P) log(E+P))*, and sends the entire historical JSON payload over the mobile network — only for Expenses.jsx:L70 to filter down to the current month (MONTHLY) in the browser\!

### **3.2 Issue \#2: Why the Navbar (TopNav) Disappears When Going to Expenses on Mobile**

Four compounding bugs cause the top navigation bar (and/or layout shell) to disappear when visiting Expenses (/expenses or /transport Vehicle Expenses) on mobile:

> 1. **Mobile Viewport Height (100vh vs 100dvh) & Missing shrink-0 on TopNav.jsx (MainLayout.jsx:L25, L37 & TopNav.jsx:L132)**:  
   * MainLayout.jsx used h-screen (100vh) instead of h-dvh (100dvh). On mobile browsers (iOS Safari / Android Chrome), 100vh is taller than the visible viewport when the address bar is shown.  
   * In TopNav.jsx:L132, \<header className="h-14 bg-white ... sticky top-0 z-20"\> inside \<div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0"\> **was missing shrink-0 (flex-shrink: 0\)** and w-full min-w-0. And inside TopNav.jsx, the mobile hamburger button and right action bar lacked shrink-0, while the title container lacked min-w-0 flex-1.  
> 2. **Horizontal Flex/Table Blowout on /expenses (Expenses.jsx, ExpensesTable.jsx) and /transport (Transport.jsx:L343)**:  
   * In MainLayout.jsx:L42, \<main className="flex-1 overflow-y-auto p-3.5 sm:p-5 md:p-6 scroll-smooth"\> lacked overflow-x-hidden and min-w-0 max-w-full.  
   * In Expenses.jsx:L125 (\<div className="space-y-4"\>) and ExpensesTable.jsx:L21 (\<div className="space-y-3"\>), missing min-w-0 max-w-full allowed the 10-pill category filter strip and 7-column table to blow out the flex container width on mobile screens, causing the mobile browser viewport to pan/scroll horizontally and vertically push TopNav off-screen.  
   * In Transport.jsx:L341-L358 (which renders the **Vehicle Expenses** tab by default and is labeled *"Vehicle Expenses"* in the sidebar for TRANSPORT\_MANAGER), the 7-button Time Horizon strip (YESTERDAY, LAST3DAYS, DAILY, WEEKLY, MONTHLY, YEARLY, LIFETIME) was inside \<div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5"\> with **no overflow-x-auto and no flex-wrap** — forcing a hard \~560px width on a 360px mobile screen\!  
> 3. **Null-Unsafe ex.category.toLowerCase() Crashing Into App.jsx's Outer RouteErrorBoundary (Expenses.jsx:L59, ExpensesTable.jsx:L96, Transport.jsx:L186)**:  
   * Expenses.jsx:L59 and Transport.jsx:L186 called ex.category.toLowerCase() directly, and ExpensesTable.jsx:L96 called ex.category.replace(/\_/g, ' ') directly.  
   * If any expense record has category \== null (e.g., a legacy TransportExpense record that uses ex.type instead of ex.category), it throws TypeError: Cannot read properties of undefined. When caught by the outer \<RouteErrorBoundary\> in App.jsx:L71 (which wraps \<Routes\> **outside** \<MainLayout /\>), both Sidebar and TopNav disappear completely\!

## **4\. Exact File-by-File Implementation Plan & Code for Antigravity**

Antigravity should apply the following exact changes across **7 files** (6 frontend, 1 backend) in Phase 1, followed by optional Phase 2 cleanup:

### **File 1: frontend/src/components/layout/MainLayout.jsx**

**What changed & why:**

> * Replaced h-screen with h-dvh min-h-dvh w-full max-w-full overflow-hidden on the outer flex shell and inner column so mobile browser address bars never push TopNav off-screen.  
> * Added overflow-x-hidden min-w-0 max-w-full on \<main\> and min-w-0 on the inner container so wide child tables/strips cannot stretch the mobile viewport.  
> * Added key={location.pathname} to the inner \<RouteErrorBoundary\> inside MainLayout so any route error stays confined inside \<main\> while keeping Sidebar and TopNav visible.

`import React, { useState, Suspense } from 'react';`  
`import { Outlet, useLocation } from 'react-router-dom';`  
`import Sidebar from './Sidebar';`  
`import TopNav from './TopNav';`  
`import RouteErrorBoundary from '../common/RouteErrorBoundary';`  
`import { useLiveStatus } from '../../context/SSEContext';`

`const PageLoader = () => (`  
  `<div className="flex items-center justify-center h-[60vh]">`  
    `<div className="flex flex-col items-center gap-3">`  
      `<div className="w-9 h-9 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />`  
      `<span className="text-xs font-medium text-slate-400">Loading module...</span>`  
    `</div>`  
  `</div>`  
`);`

`const MainLayout = () => {`  
  `const [sidebarOpen, setSidebarOpen] = useState(false);`  
  `const { reconnecting } = useLiveStatus();`  
  `const location = useLocation();`

  `return (`  
    `<div className="flex h-dvh min-h-dvh w-full max-w-full overflow-hidden bg-slate-50 font-sans antialiased text-slate-800">`  
      `{/* Reconnection Banner */}`  
      `{reconnecting && (`  
        `<div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white text-center py-1 text-xs font-semibold shadow-md flex items-center justify-center gap-2 animate-pulse">`  
          `<div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />`  
          `Reconnecting to live server...`  
        `</div>`  
      `)}`

      `{/* Sidebar */}`  
      `<Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />`

      `{/* Main Content Wrapper */}`  
      `<div className="flex-1 flex flex-col h-dvh min-h-dvh overflow-hidden min-w-0 max-w-full">`  
        `{/* Top Navbar — always pinned and shrink-0 so mobile content overflow never hides it */}`  
        `<TopNav onMenuClick={() => setSidebarOpen(true)} />`

        `{/* Dynamic Page Content */}`  
        `<main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-5 md:p-6 scroll-smooth min-w-0 max-w-full">`  
          `<div className="max-w-7xl mx-auto w-full min-w-0">`  
            `<RouteErrorBoundary key={location.pathname}>`  
              `<Suspense fallback={<PageLoader />}>`  
                `<Outlet />`  
              `</Suspense>`  
            `</RouteErrorBoundary>`  
          `</div>`  
        `</main>`  
      `</div>`  
    `</div>`  
  `);`  
`};`

`export default MainLayout;`

### **File 2: frontend/src/components/layout/TopNav.jsx**

**What changed & why:**

> * Added shrink-0 w-full min-w-0 and raised z-index from z-20 to z-30 on \<header\> so Flexbox can never compress the navbar height to 0px and sticky table headers (z-10) never overlap it.  
> * Added shrink-0 to the mobile hamburger button and right-side actions container, and min-w-0 flex-1 to the title container so long titles/badges truncate cleanly on 320px–375px screens.  
> * Changed notification dropdown positioning from absolute right-0 w-80 sm:w-96 to fixed sm:absolute right-2 sm:right-0 left-2 sm:left-auto top-14 sm:top-auto sm:mt-2 sm:w-96 so opening notifications on mobile does not cause horizontal viewport overflow.

`// In TopNav.jsx return statement (lines 131-165):`  
  `return (`  
    `<header className="h-14 shrink-0 w-full min-w-0 bg-white border-b border-slate-200/80 flex items-center justify-between gap-2 px-3.5 sm:px-6 sticky top-0 z-30 shadow-2xs">`  
      `{/* Left Side: Mobile Hamburger & Dynamic Page Title */}`  
      `<div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">`  
        `<button`  
          `type="button"`  
          `onClick={onMenuClick}`  
          `aria-label="Open navigation menu"`  
          `className="md:hidden shrink-0 p-2 -ml-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none"`  
        `>`  
          `<Menu size={20} />`  
        `</button>`

        `<div className="min-w-0 flex-1">`  
          `<h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-tight truncate">`  
            `{currentPage.title}`  
          `</h1>`  
          `<p className="text-[11px] font-medium text-slate-400 hidden sm:block leading-tight truncate">`  
            `{currentPage.subtitle}`  
          `</p>`  
        `</div>`  
      `</div>`

      `{/* Right Side: Notifications, Company Indicator & Sign Out */}`  
      `<div className="flex items-center gap-2 sm:gap-3 shrink-0">`  
        `{/* ... inside showDropdown: use className="fixed sm:absolute right-2 sm:right-0 left-2 sm:left-auto top-14 sm:top-auto sm:mt-2 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden" ... */}`

### **File 3: frontend/src/components/layout/Sidebar.jsx**

**What changed & why:**

> * Added onTouchStart={() \=\> safePrefetch(item.path, tenant)} and onPointerDown={() \=\> safePrefetch(item.path, tenant)} to every \<NavLink\> so mobile touch events trigger chunk \+ API prefetching before the tap finishes.  
> * Added a useEffect using window.requestIdleCallback (staggered by 120ms per chunk) that preloads all role-allowed route chunks (filteredNavItems) automatically in the background right after login, plus immediate prefetching when the mobile drawer opens (isOpen \=== true).  
> * Added proactive API warming for /expenses?limit=500 inside safePrefetch.

`const prefetchedPaths = new Set();`  
`const safePrefetch = (path, tenant) => {`  
  `if (!prefetchedPaths.has(path) && routePrefetchMap[path]) {`  
    `prefetchedPaths.add(path);`  
    `routePrefetchMap[path]().catch(() => {`  
      `prefetchedPaths.delete(path);`  
    `});`  
  `}`  
  `if (tenant && path === '/expenses') {`  
    ``cachedFetch(`${API_URL}/expenses?limit=500`, {``  
      `headers: { 'x-tenant': tenant },`  
      `credentials: 'include'`  
    `}, 60000).catch(() => {});`  
  `}`  
`};`

`// Inside Sidebar component:`  
  `useEffect(() => {`  
    `if (!user?.role) return;`  
    `const allowedPaths = filteredNavItems.map(item => item.path);`  
    `let cancelled = false;`

    `const preloadSequentially = async () => {`  
      `for (const path of allowedPaths) {`  
        `if (cancelled) break;`  
        `if (!prefetchedPaths.has(path) && routePrefetchMap[path]) {`  
          `prefetchedPaths.add(path);`  
          `try {`  
            `await routePrefetchMap[path]();`  
          `} catch {`  
            `prefetchedPaths.delete(path);`  
          `}`  
          `await new Promise(r => setTimeout(r, 120));`  
        `}`  
      `}`  
    `};`

    `const timer = setTimeout(() => {`  
      `if (typeof window.requestIdleCallback === 'function') {`  
        `window.requestIdleCallback(() => preloadSequentially(), { timeout: 2000 });`  
      `} else {`  
        `preloadSequentially();`  
      `}`  
    `}, 600);`

    `return () => {`  
      `cancelled = true;`  
      `clearTimeout(timer);`  
    `};`  
  `}, [user?.role, tenant]);`

  `useEffect(() => {`  
    `if (isOpen) {`  
      `filteredNavItems.forEach(item => safePrefetch(item.path, tenant));`  
    `}`  
  `}, [isOpen, tenant]);`

### **File 4: frontend/src/utils/apiCache.js**

**What changed & why:**

> * Upgraded DEFAULT\_TTL from 30,000ms to 60,000ms (60s fresh window) and added MAX\_STALE\_TTL \= 10 \* 60 \* 1000 (10-minute **Stale-While-Revalidate** window).  
> * When an in-memory cache entry is between 60s and 10m old, cachedFetch immediately returns the cached response in \<1ms (so mobile page switches never block on a spinner) while firing fetchAndPopulateCache silently in the background.  
> * Added inflight \= new Map() to deduplicate concurrent identical GET requests, pre-parsed parsedData on cache write, and exported peekCachedData(url, options) for synchronous initial state hydration in React components.

`const cache = new Map();`  
`const inflight = new Map();`  
`const DEFAULT_TTL = 60 * 1000; // 60 seconds fresh window`  
`const MAX_STALE_TTL = 10 * 60 * 1000; // 10 minutes stale-while-revalidate window`  
`const STORAGE_PREFIX = 'aq_api_cache_';`

`export function getCacheKey(url, options = {}) {`  
  `const tenant = options.headers?.['x-tenant'] || localStorage.getItem('aquasphere_tenant') || 'aquasphere';`  
  ``return `$tenant:${url}`;``  
`}`

`export function peekCachedData(url, options = {}) {`  
  `const key = getCacheKey(url, options);`  
  `const cached = cache.get(key) || getStorageItem(key);`  
  `if (!cached) return null;`  
  `if (Date.now() - cached.timestamp > MAX_STALE_TTL) {`  
    `cache.delete(key);`  
    `return null;`  
  `}`  
  `try {`  
    `return cached.parsedData ?? JSON.parse(cached.body);`  
  `} catch {`  
    `return null;`  
  `}`  
`}`

`function createSyntheticResponse(entry) {`  
  `return {`  
    `ok: true,`  
    `status: entry.status,`  
    `headers: new Headers(entry.headers),`  
    `json: async () => entry.parsedData ? structuredClone(entry.parsedData) : JSON.parse(entry.body),`  
    `text: async () => entry.body,`  
    `clone: function () { return this; }`  
  `};`  
`}`

`async function fetchAndPopulateCache(key, url, options) {`  
  `if (inflight.has(key)) {`  
    `return inflight.get(key);`  
  `}`  
  `const promise = (async () => {`  
    `try {`  
      `const response = await fetch(url, options);`  
      `if (response.ok) {`  
        `const cloned = response.clone();`  
        `const bodyText = await cloned.text();`  
        `let parsedData = null;`  
        `try {`  
          `parsedData = JSON.parse(bodyText);`  
        `} catch {`  
          `parsedData = null;`  
        `}`  
        `const entry = {`  
          `body: bodyText,`  
          `parsedData,`  
          `status: response.status,`  
          `headers: Object.fromEntries(response.headers.entries()),`  
          `timestamp: Date.now()`  
        `};`  
        `cache.set(key, entry);`  
        `setStorageItem(key, entry);`  
      `}`  
      `return response;`  
    `} finally {`  
      `inflight.delete(key);`  
    `}`  
  `})();`

  `inflight.set(key, promise);`  
  `return promise;`  
`}`

`export async function cachedFetch(url, options = {}, ttl = DEFAULT_TTL) {`  
  `const method = (options.method || 'GET').toUpperCase();`  
  `if (method !== 'GET') return fetch(url, options);`

  `const key = getCacheKey(url, options);`  
  `const now = Date.now();`

  `let cached = cache.get(key);`  
  `if (!cached) {`  
    `cached = getStorageItem(key);`  
    `if (cached) cache.set(key, cached);`  
  `}`

  `if (cached) {`  
    `const age = now - cached.timestamp;`  
    `if (age < ttl) {`  
      `return createSyntheticResponse(cached);`  
    `}`  
    `if (age < MAX_STALE_TTL) {`  
      `fetchAndPopulateCache(key, url, options).catch(() => {});`  
      `return createSyntheticResponse(cached);`  
    `}`  
    `cache.delete(key);`  
    `removeStoragePrefix(key);`  
  `}`

  `if (inflight.has(key)) {`  
    `const res = await inflight.get(key);`  
    `const updated = cache.get(key);`  
    `if (updated) return createSyntheticResponse(updated);`  
    `return res.clone ? res.clone() : res;`  
  `}`

  `return fetchAndPopulateCache(key, url, options);`  
`}`

### **File 5: frontend/src/pages/Expenses.jsx**

**What changed & why:**

> * Changed endpoint from unbounded \${API}/expenses to bounded \${API}/expenses?limit=500.  
> * Used peekCachedData(EXPENSES\_ENDPOINT, { headers: { 'x-tenant': tenant } }) to initialize expenses and loading synchronously on mount so revisiting /expenses renders in 0ms with zero spinner flash.  
> * Made all ex.category, ex.description, and ex.vendorName accesses null-safe via String(ex.category \|\| ex.type \|\| 'MISC') so legacy or transport expense records never crash into RouteErrorBoundary.  
> * Added min-w-0 max-w-full overflow-x-hidden to the outer wrapper \<div className="space-y-4 min-w-0 max-w-full overflow-x-hidden"\>.

### **File 6: frontend/src/components/expenses/ExpensesTable.jsx**

**What changed & why:**

> * Added min-w-0 max-w-full to the outer \<div className="space-y-3 min-w-0 max-w-full"\> and w-full max-w-full min-w-0 to the table card container, plus min-w-\[640px\] on \<table\> inside \<div className="overflow-x-auto w-full max-w-full"\> so horizontal scrolling is strictly isolated inside the table card.  
> * Replaced direct ex.category references with const categoryLabel \= String(ex.category \|\| ex.type \|\| 'MISC'); so a missing category never throws during render.

### **File 7: frontend/src/pages/Transport.jsx & backend/src/controllers/expense.controller.js**

**What changed & why:**

> * In Transport.jsx:L343 (Vehicle Expenses tab), added overflow-x-auto max-w-full no-scrollbar to the 7-button Time Horizon container and min-w-0 max-w-full overflow-x-hidden to the root \<div className="space-y-5 min-w-0 max-w-full overflow-x-hidden"\>, and made ex.category.toLowerCase() null-safe at line 186\.  
> * In backend/src/controllers/expense.controller.js:L221, added take: limit ? Math.min(parseInt(limit, 10), 1000\) : 500 to prisma.purchase.findMany inside getExpenses so the backend never loads unbounded historical purchases into Node.js memory.

## **5\. Phase 2 Recommendations for Antigravity (Next-Level PERN/React Optimization)**

> 1. **Apply peekCachedData across Orders.jsx, Customers.jsx, Production.jsx, Inventory.jsx, and Vendors.jsx**: Just as we did in Expenses.jsx, initialize their useState from peekCachedData(...) so switching between any two tabs on mobile renders in 0ms without resetting loading \= true.  
> 2. **Optimize Orders.jsx Monthly Statement Loop (L236–L305)**: Pre-group orders by customerId using a single Map pass (*O(O \+ C)*) instead of running orders.filter(o \=\> o.customerId \=== c.id) inside customers.forEach (*O(C × O)*).

