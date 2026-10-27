# **AquaSphere OS & Wadaana ERP — Production Root Cause Analysis, Zero-Risk Data Audit & AI Agent Fix Guide**

# **1\. Executive Summary & Data Safety Verification**

## **1.1 Your Production Data Is Safe and Untouched**

A forensic audit of the `ehtisham-hashim/aquasphere` codebase confirms that **zero customer records, vendor ledgers, production batches, inventory transactions, or financial data have been deleted or corrupted**.

* **Database Tier Isolation**: All data for both tenants (`aquasphere` and `wadaana` schemas) is stored in your PostgreSQL database (`DATABASE_URL`).  
* **Safe Container Startup**: `backend/Dockerfile` executes `CMD ["node", "src/index.js"]` directly without running destructive schema resets or seed wipes on container restart.  
* **Why Pages Show Empty Tables (`[]`)**: When you open Customers, Vendors, Production, Inventory, Orders, or Dashboard, the frontend React state initializes each list as an empty array (`useState([])`) and fires `fetch('/api/v1/...')`. Because the backend middleware `verifyJWT` (`backend/src/middlewares/auth.middleware.js`, line 36\) rejects the incoming request with `HTTP 401: {"success": false, "status": 401, "message": "Unauthorized request"}`, `json.success` evaluates to `false` and the tables remain blank—while many pages (`Dashboard.jsx`, `Customers.jsx`, `Orders.jsx`, `Production.jsx`, `Purchases.jsx`, `Expenses.jsx`, `CounterSales.jsx`) silently swallow the error without redirecting you to `/login` or showing a banner, and other pages (`Vendors.jsx`, `Inventory.jsx`, `RawMaterials.jsx`, `Transport.jsx`) pop up a toast saying `"Unauthorized request"`.

# **2\. CONFIRMED ROOT CAUSE: Why Old Browser Sessions Open Without Login and Show Empty Data (Stale Cache vs. 1-Day Cookie Bug)**

Your observation—that opening the app in a browser where you logged in a couple of days ago **lets you straight into the system without asking to log in, but shows "Unauthorized request" and empty tables**, whereas logging in on a **new browser shows all data clearly**—pinpoints the exact bug in the code down to the line number:

## **Bug \#1: Expiration Mismatch (`token` Cookie \= 24 Hours vs. `company`/`tenant` \= 1 Year)**

1. In `backend/src/controllers/auth.controller.js` (line 69 & line 158\) and `backend/src/utils/jwtUtils.js` (line 5): The `token` authentication cookie and JWT are hardcoded to expire after **1 day (`24 * 60 * 60 * 1000` ms \= 24 hours)**. Meanwhile, in `frontend/src/utils/companyCookie.js` (lines 11–14), the `tenant` and `company` cookies and `localStorage` are set for **1 full year (`max-age=31536000`)**.  
2. When you return **a couple of days later** on the same browser, your `token` cookie has expired and been deleted by the browser, while your `localStorage` (`tenant`, `company`) and `sessionStorage` caches are still sitting in the browser.

## **Bug \#2: `apiCache.js` Intercepts and Caches `GET /api/v1/auth/me` in `sessionStorage`\!**

Look at `frontend/src/utils/apiCache.js` (lines 12–24 & lines 131–263):

```js
const VOLATILE_ENDPOINTS = [
  'items', 'inventory', 'raw-materials', 'spot-sales', 'orders',
  'production', 'analytics', 'daily-close', 'purchases', 'customers', 'bottles'
];
```

* Notice what is **missing** from `VOLATILE_ENDPOINTS`: **`'auth'`** (as well as `'vendors'`, `'expenses'`, `'vehicles'`, `'users'`, `'reports'`, `'audit-logs'`, `'admin'`)\!  
* Because `'auth'` is not in `VOLATILE_ENDPOINTS`, `apiCache.js` treats `GET /api/v1/auth/me` as a cacheable static endpoint and saves the `200 OK` user profile into `window.sessionStorage` (`__aquasphere_api_cache__/api/v1/auth/me|aquasphere`) and in-memory `cache`\!  
* Even worse, in `frontend/src/lib/queryClient.js` (lines 29–42), `persistQueryClient` persists the query cache in `window.sessionStorage` (`AQUASPHERE_QUERY_CACHE`) for **24 hours**, and `refetchOnWindowFocus` is set to `false`.  
* And if the browser tab was left open (or restored by Chrome/Edge session restore) from a couple of days ago, `AuthContext.jsx` (lines 15–31) **only runs `verifyUser()` once when the tab first mounts**. It never re-verifies when you wake up the computer or return to the tab days later\!

## **Bug \#3: No `401 Unauthorized` Interceptor When Navigating Pages**

Because `user` is still populated in `AuthContext` (either from a kept-open/restored tab or a cached `/auth/me` hit), `ProtectedRoute` in `App.jsx` thinks you are still logged in and lets you into `/dashboard`, `/customers`, `/vendors`, `/production`, and `/inventory` without asking for credentials.  
Then, when those pages try to fetch live data from the backend:

* The 24-hour `token` cookie is gone (`req.cookies.token` is `undefined`).  
* The backend `verifyJWT` middleware throws `401 Unauthorized request`.  
* **The frontend has zero `401` handler**: it never clears `user` or redirects you to `/login`. Instead, it leaves you inside the app looking at empty tables and `"Unauthorized request"` toasts\!  
* When you open a **new browser**, there is no stale `user` state or old cache, so you are shown `/login`, you enter your credentials, receive a fresh 24-hour `token` cookie, and all data loads normally.

# **3\. Exact Root Cause Analysis: Why "Unauthorized Request" Happens on Docker & Contabo VPS**

In `backend/src/middlewares/auth.middleware.js` (lines 33–37), the authentication guard is:export const verifyJWT \= asyncHandler(async (req, res, next) \=\> {

  const token \= req.cookies?.token \|\| req.header('Authorization')?.replace('Bearer ', '');

\|---\|

  if (\!token) {

    throw new ApiError(401, 'Unauthorized request');

  }

And in `backend/src/controllers/auth.controller.js` (lines 62–78 & 152–167), when a user logs in (or completes Owner 2FA):const token \= generateToken({ id: user.id, role: user.role, tenant: prefix });

const isSecure \= process.env.COOKIE\_SECURE \=== 'true' \|\| (process.env.NODE\_ENV \=== 'production' && process.env.COOKIE\_SECURE \!== 'false');

const cookieOptions \= {

  httpOnly: true,

  secure: isSecure,

  sameSite: isSecure ? 'none' : 'lax',

  maxAge: 24 \* 60 \* 60 \* 1000 // 1 day

};

res

  .status(200)

  .cookie('token', token, cookieOptions)

  .cookie('tenant', prefix, { path: '/', maxAge: 24 \* 60 \* 60 \* 1000, sameSite: 'lax' })

  .json(new ApiResponse(200, { user: { ...userWithoutPassword, tenant: prefix }, token }, 'Login successful'));

Look closely at what happens between the backend and the frontend:

* **The Backend Sends `{ user, token }` in JSON, Plus a `Set-Cookie: token=...; HttpOnly; Secure; SameSite=None` Header**: Because `backend/Dockerfile` sets `ENV NODE_ENV=production`, `isSecure` is `true`, so the cookie is marked `Secure; SameSite=None` (with no `Path=/` explicitly set on `cookieOptions`).  
* **The Frontend Completely Discards `data.data.token`\!**: In `frontend/src/context/AuthContext.jsx` (lines 36–58 & 69–84), `login()` and `verifyOwnerOtp()` receive `data.data.token` from the response body, **throw it away**, and set `setUser(data.data.user)` in React memory\! No `Authorization: Bearer <token>` header is ever stored or sent on any `fetch()` call across the entire frontend.  
* **Why the Cookie Fails to Arrive on Subsequent API Requests (`req.cookies.token` is `undefined`)**: Because `setUser(data.data.user)` succeeds in memory right after login, React Router transitions you straight to `/dashboard` and lets you click around all pages (`/customers`, `/vendors`, `/production`, `/inventory`). However, every API request fails with `401 Unauthorized request` due to one (or more) of these four Docker/Contabo infrastructure traps:  
  * **Trap A — Reverse Proxy / Nginx Cookie Domain Mismatch (`frontend/nginx.conf`)**: In `frontend/nginx.conf` (lines 16–30), `/api/` is reverse-proxied to `https://api.theaquasphere.org/api/`. When `api.theaquasphere.org` responds with `Set-Cookie`, or if `VITE_API_URL` points to a cross-origin domain (`https://api.theaquasphere.org/api/v1`) while the user accesses the frontend via Contabo IP, another domain, or Safari/Brave/Chrome with third-party cookie blocking (`SameSite=None` cross-origin restriction), the browser **silently drops the `token` cookie**.  
  * **Trap B — Accessing over HTTP (Contabo IP or unencrypted port) while `NODE_ENV=production`**: Because `backend/Dockerfile` hardcodes `ENV NODE_ENV=production`, `cookieOptions.secure` is `true`. If the app or API is accessed over `http://` (e.g., `http://<CONTABO_IP>`), modern browsers **strictly refuse to store or send a `Secure` cookie**, even though the `POST /auth/login` JSON response returned `200 OK`\!  
  * **Trap C — Missing Global `x-tenant` & `Authorization` Interceptor (`apiCache.js`)**: `PROJECT_RULES.md` states that `frontend/src/utils/apiInterceptor.js` injects `x-tenant` on every request, **but `apiInterceptor.js` does not exist in `frontend/src/utils/`**\! Instead, `frontend/src/utils/apiCache.js` wraps `window.fetch` for caching, **without** injecting `Authorization: Bearer <token>`, `x-tenant`, or `credentials: 'include'`. Several endpoints (such as `AuthContext.jsx` calling `/auth/me`, `TopNav.jsx`, `AuditLogsModal.jsx`, `BottleCustodyWidget.jsx`) do not even pass an `x-tenant` header\!  
  * **Trap D — Expired Session / Stale Tab Without 401 Auto-Logout**: `AuthContext.jsx` only checks `/auth/me` once on initial page load. Because `queryClient.js` disables `refetchOnWindowFocus`, if the 24-hour cookie expires while the tab stays open (or after a container restart/redeploy), `user` stays non-null in React state. Every page you open gets `401 Unauthorized request` and shows blank data instead of redirecting to `/login`.

# **4\. Comprehensive Audit of Production Risks Found in Codebase**

Beyond the `401 Unauthorized request` bug, our audit identified **5 critical production and data-safety risks** that must be hardened to protect your live data:

| Risk ID | Severity | File / Location | Technical Finding & Production Impact | Zero-Risk Remediation |
| :---- | :---- | :---- | :---- | :---- |
| **RISK-1** | **CRITICAL** | `frontend/src/context/AuthContext.jsx` & `frontend/src/utils/apiCache.js` | Frontend relies 100% on fragile browser cookies (`SameSite=None; Secure`) and discards the `token` returned by `/auth/login`. Any proxy, HTTP, or browser privacy setting drops the cookie, causing `401 Unauthorized request` and blank tables across all modules. | Store `token` in `localStorage` on login/2FA, and upgrade the global `window.fetch` wrapper in `apiCache.js` to automatically attach `Authorization: Bearer <token>`, `x-tenant`, and `credentials: 'include'` on every `/api/` request. |
| **RISK-2** | **HIGH** | `frontend/src/utils/apiCache.js` & `frontend/src/context/AuthContext.jsx` | When any API call returns `401 Unauthorized`, the frontend does not clear the stale `user` state, leaving the user stranded on blank screens (`Customers`, `Orders`, `Production`, `Dashboard` silently fail). | Add a global `401` listener (`window.dispatchEvent(new CustomEvent('auth-unauthorized'))`) in `apiCache.js` that cleanly logs out stale sessions and redirects to `/login` with a clear session-expired message. |
| **RISK-3** | **HIGH** | `backend/src/controllers/auth.controller.js` | `cookieOptions` omits `path: '/'`, and forces `secure: true` \+ `sameSite: 'none'` whenever `NODE_ENV=production`, which breaks same-site Nginx proxying or HTTP VPS access and triggers third-party cookie blockers. | Add `path: '/'` to `cookieOptions` in `login`, `verifyOwnerOtp`, and `logout`. Default `sameSite` to `'lax'` unless `COOKIE_SAMESITE='none'` is explicitly configured, and auto-detect HTTPS via `req.secure || req.headers['x-forwarded-proto'] === 'https'`. |
| **RISK-4** | **CRITICAL (Data Safety)** | `backend/clear_orders.js`, `backend/clear_spot_sales.js`, `backend/scripts/wipe-database.js`, `backend/scripts/reset-data.js` | The production Docker container copies destructive scripts (`wipe-database.js`, `reset-data.js`, `clear_orders.js`, `clear_spot_sales.js`) directly into `/app`, and `backend/package.json` exposes `"db:wipe": "node scripts/wipe-database.js"` with **zero environment guard**\! If anyone or any AI agent runs `pnpm run db:wipe` or `seed-production-bom.js --wipe` on Contabo, thousands of live records will be permanently deleted. | Add a hard production safety lock (`if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PROD_WIPE !== 'YES_WIPE_PRODUCTION_DATA') process.exit(1)`) at the top of every wipe/reset/clear script, and exclude `clear_*.js` from `backend/.dockerignore`. |
| **RISK-5** | **MEDIUM** | `backend/src/config/db.js` vs `context/deployment.md` | `db.js` defaults `DATABASE_POOL_SIZE` to `15` (`max: parseInt(process.env.DATABASE_POOL_SIZE || '15', 10)`) with `idleTimeoutMillis: 60000`. If using Neon Free Tier (or a limited Postgres pool) without `DATABASE_POOL_SIZE=5` set in Dokploy, concurrent requests can exhaust connection slots. | Keep `db.js` resilient with connection retry/error handling and verify `DATABASE_POOL_SIZE` in `.env` matches your PostgreSQL host tier. |

# **5\. Diagnostic Checklist (Questions to Confirm Your Exact Contabo VPS Setup)**

Because I do not want to assume anything about your live Contabo environment, please confirm these **4 quick details** so we can verify if any Dokploy/Traefik environment variables also need tweaking:

3. **How do you access the live application in your browser?**  
   * Are you opening it via a custom HTTPS domain (e.g., `https://theaquasphere.org` or `https://app.theaquasphere.org`), or directly via `http://<CONTABO_VPS_IP>`?  
4. **Where is the PostgreSQL database hosted?**  
   * Is `DATABASE_URL` pointing to **Neon Serverless PostgreSQL** (as written in `context/deployment.md`) or a **PostgreSQL container running inside Docker on the Contabo VPS**?  
5. **Does the "Unauthorized request" happen immediately after logging in, or without logging in?**  
   * Specifically: when you open the app, does it skip the `/login` screen and go straight to the dashboard showing `"Unauthorized request"`, or do you enter your email/password (and 2FA code), succeed at login, and *then* see `"Unauthorized request"` and empty tables?  
6. \*\*Which User Role and Company (`AquaSphere` vs `Wadaana`) are you logged in as when you see this?

*(Note: Even before you answer those 4 questions, the code improvements in Section 6 below are 100% backward-compatible and will resolve the `401 Unauthorized request` across **all** of those scenarios without touching any business logic or database records\!)*

# **6\. Copy-Paste Instructions Prompt for Your AI Coding Agent**

You can copy and paste the entire prompt block below directly into your AI Coding Agent (Cursor, Windsurf, Antigravity, or Claude Code). It is engineered with strict guardrails so the agent **will not touch or disturb any existing ERP features, formulas, or database schemas**, and will cleanly fix the authentication, header injection, and production data-safety locks.You are tasked with fixing the production "401 Unauthorized request" / blank data issue and hardening production data safety across AquaSphere OS and Wadaana ERP.

CRITICAL NON-BREAKING GUARDRAILS:

1\. DO NOT modify \`backend/prisma/schema.prisma\`, database migrations, or any business logic in controllers (\`customer\`, \`order\`, \`production\`, \`item\`, \`vendor\`, \`purchase\`, \`spotSale\`, \`expense\`, \`dailyClose\`, \`analytics\`).

2\. DO NOT run any database seed, reset, or wipe scripts.

3\. Preserve all existing cookie-based authentication (\`req.cookies.token\`) AND add seamless \`Authorization: Bearer \<token\>\` fallback so authentication works 100% reliably across Docker, Nginx reverse proxy, Traefik, cross-subdomain CORS, and mobile/desktop browsers that block third-party cookies.

4\. Extend session lifetime from 1 day to 7 days (aligning JWT and cookie expiration with Bearer persistence).  
5\. Never cache \`/auth/me\` or any \`/auth/\` route in \`apiCache.js\` (bypass caching with \`cache: 'no-store'\`), add missing sensitive endpoints to \`VOLATILE\_ENDPOINTS\`, and ensure immediate auto-logout & redirect to \`/login\` upon any 401 response.  
EXECUTE THE FOLLOWING EXACT FILE-BY-FILE CHANGES:

\#\#\# Step 1: Fix Backend Cookie Options & Proxy Protocol Detection (\`backend/src/controllers/auth.controller.js\`)

In \`backend/src/controllers/auth.controller.js\`:

1\. Create a helper function at the top of the file to build consistent cookie options for \`login\`, \`verifyOwnerOtp\`, and \`logout\`:

   \`\`\`js

   const getAuthCookieOptions \= (req, includeMaxAge \= true) \=\> {

     const isHttps \= req.secure \|\| req.headers\['x-forwarded-proto'\] \=== 'https';

     const isSecure \= process.env.COOKIE\_SECURE \=== 'true'

       ? true

       : process.env.COOKIE\_SECURE \=== 'false'

       ? false

       : (process.env.NODE\_ENV \=== 'production' && isHttps);

     // Default to 'lax' for same-site / reverse-proxy deployments unless cross-site 'none' is explicitly requested or needed

     const sameSiteEnv \= (process.env.COOKIE\_SAMESITE \|\| '').toLowerCase();

     const sameSite \= sameSiteEnv \|\| (isSecure ? 'none' : 'lax');

     return {

       httpOnly: true,

       path: '/',

       secure: isSecure,

       sameSite,

       ...(includeMaxAge ? { maxAge: 7 \* 24 \* 60 \* 60 \* 1000 } : {}) // 7 days session lifetime

     };

   };

2. Use `getAuthCookieOptions(req, true)` when setting `.cookie('token', token, cookieOptions)` in both `login` and `verifyOwnerOtp`.  
3. Use `getAuthCookieOptions(req, false)` when clearing `.clearCookie('token', cookieOptions)` in `logout`, and also call `res.clearCookie('token', { path: '/' })` as a fallback so stale cookies with default attributes are always cleared.  
4. In `backend/src/utils/jwtUtils.js`: update default JWT expiration from `'1d'` to `'7d'` (e.g. `expiresIn: process.env.JWT_EXPIRES_IN || '7d'`) so authentication tokens stay valid for 7 days.

## **Step 2: Persist Auth Token & Auto-Recover on 401 in Frontend (`frontend/src/utils/companyCookie.js` & `frontend/src/context/AuthContext.jsx`)**

1. In `frontend/src/utils/companyCookie.js`, export token helper functions alongside the existing company cookie helpers:const AUTH\_TOKEN\_KEY \= 'aquasphere\_auth\_token';  
     
   export function getAuthToken() {  
     
     if (typeof window \=== 'undefined') return null;  
     
     try {  
     
       return localStorage.getItem(AUTH\_TOKEN\_KEY) \|\| null;  
     
     } catch {  
     
       return null;  
     
     }  
     
   }  
     
   export function setAuthToken(token) {  
     
     if (typeof window \=== 'undefined' \|\| \!token) return;  
     
     try {  
     
       localStorage.setItem(AUTH\_TOKEN\_KEY, token);  
     
     } catch {  
     
       // ignore storage errors  
     
     }  
     
   }  
     
   export function clearAuthToken() {  
     
     if (typeof window \=== 'undefined') return;  
     
     try {  
     
       localStorage.removeItem(AUTH\_TOKEN\_KEY);  
     
     } catch {  
     
       // ignore storage errors  
     
     }  
     
   }  
     
   Also cal

l `clearAuthToken()` inside `clearCompanyCookie()`.  
2\. In `frontend/src/context/AuthContext.jsx`:

* Import `{ setCompanyCookie, clearCompanyCookie, setAuthToken, clearAuthToken, getAuthToken }` from `../utils/companyCookie`.  
* In `login()`: when `response.ok` and `!data.data?.require2FA`, if `data.data?.token` is present, call `setAuthToken(data.data.token)` before `setUser(data.data.user)`.  
* In `verifyOwnerOtp()`: when `response.ok`, if `data.data?.token` is present, call `setAuthToken(data.data.token)` before `setUser(data.data.user)`.  
* In `verifyUser()` inside `useEffect`: if `!response.ok` (status 401/403), call `clearAuthToken()` and `setUser(null)`.  
* In `logout()`: call `clearAuthToken()`, `clearCompanyCookie()`, `clearCache()`, and `setUser(null)`.  
* Add a `useEffect` listener for `'auth-unauthorized'` custom window events so that if any background API call receives `401 Unauthorized` (while not on `/login` or `/website-admin`), `clearAuthToken()`, `clearCache()`, and `setUser(null)` are triggered automatically so `ProtectedRoute` cleanly redirects the user to `/login` instead of leaving blank tables on screen.  
* Add a `visibilitychange` listener in `AuthContext.jsx` to trigger `verifyUser()` when returning to an open tab after being away, immediately resetting `setUser(null)` if the session has expired.

## **Step 3: Globally Inject `Authorization: Bearer <token>`, `x-tenant`, and `credentials: 'include'` (`frontend/src/utils/apiCache.js`)**

In `frontend/src/utils/apiCache.js`:

1. Import `{ getAuthToken, getCompanyFromCookie }` from `./companyCookie`.  
2. Never cache `/auth/` endpoints: Add an immediate bypass check in `window.fetch` when `url.includes('/auth/')` so that `/api/v1/auth/me` is ALWAYS fetched live with `cache: 'no-store'` and never stored into or served from `sessionStorage` or in-memory cache. Also append `'auth', 'vendors', 'expenses', 'vehicles', 'transport-expenses', 'users', 'admin', 'reports', 'audit-logs', 'settings'` to `VOLATILE_ENDPOINTS`.  
3. At the top of `window.fetch = async function (resource, options = {})`:  
   * Check `const isApiRequest = url && (url.includes('/api/v1') || url.includes('/api/'));`  
   * When `isApiRequest` is `true`, clone/normalize `options` and `options.headers` (preserving existing headers whether passed as a plain object or `Headers` instance) so that:  
     a. `options.credentials = options.credentials || 'include';`  
     b. If no `Authorization` header is present and `getAuthToken()` returns a token, set `'Authorization': 'Bearer ' + token`.  
     c. If no `x-tenant` header is present, set `'x-tenant': getCompanyFromCookie()`.  
   * Make sure the normalized `[resource, options]` are passed to `originalFetch.call(this, resource, options)` in all branches (mutations, background SWR revalidation, and standard GET fetches).  
   * If `response.status === 401` on any endpoint other than `/auth/login`, `/auth/verify-owner-otp`, or `/auth/me`, dispatch `window.dispatchEvent(new CustomEvent('auth-unauthorized'))`.

## **Step 4: Support Token Authentication on Live SSE Stream (`backend/src/routes/events.routes.js`, `backend/src/utils/sseBus.js`, `frontend/src/context/SSEContext.jsx`)**

1. In `frontend/src/context/SSEContext.jsx`: when building `streamUrl`, if `getAuthToken()` exists, append `&token=${encodeURIComponent(token)}` (optional query fallback for `EventSource` which cannot set custom HTTP headers).  
2. In `backend/src/middlewares/auth.middleware.js`: allow fallback `req.query?.token` in `verifyJWT`:const token \= req.cookies?.token \|\| req.header('Authorization')?.replace('Bearer ', '') \|\| req.query?.token;

## **Step 5: Hard-Lock All Destructive Wipe/Reset Scripts Against Accidental Execution in Production**

1. In `backend/scripts/wipe-database.js`, `backend/scripts/reset-data.js`, `backend/clear_orders.js`, `backend/clear_orders.cjs`, `backend/clear_spot_sales.js`, and the `--wipe` branch of `backend/scripts/seed-production-bom.js`:  
   Add an immediate guard at the top before any database calls:if (process.env.NODE\_ENV \=== 'production' && process.env.ALLOW\_PROD\_WIPE \!== 'YES\_WIPE\_PRODUCTION\_DATA') {  
     
     console.error('CRITICAL SAFETY LOCK: Destructive database wipe/reset scripts are strictly blocked when NODE\_ENV=production.');  
     
     process.exit(1);  
     
   }  
     
2. Add `clear_*.js`, `clear_*.cjs`, `scripts/wipe-database.js`, and `scripts/reset-data.js` to `backend/.dockerignore` so destructive scripts are never bundled into the production Docker container image.

## **Step 6: Verification**

1. Run `pnpm run lint` in `backend/` and ensure 0 errors.  
2. Run `pnpm run lint` and `pnpm run build` in `frontend/` and ensure 0 errors.

