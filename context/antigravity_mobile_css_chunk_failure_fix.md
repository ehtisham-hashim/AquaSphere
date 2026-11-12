# AquaSphere — Forensic Root-Cause Analysis & Fix Plan for Client Mobile Chrome Missing CSS Bug
**Target Issue:** Landing Page (`https://theaquasphere.org`) renders with broken/missing layout styles on a client's mobile Chrome while working normally on the developer's mobile Chrome.  
**Target Codebase Commit:** `5d8450de` / `e56d134`  
**Status of Previous Plan:** `ANTIGRAVITY_RECIPE_COUNTERSALE_DASHBOARDS_MASTER_PLAN.md` is preserved untouched. This is a standalone execution plan for Antigravity.

---

## 1. Visual Forensic Proof from the Client's Screenshot (`image_78b15c.jpg` vs. `image_78b126.jpg`)

Comparing the client's broken mobile Chrome screenshot (`image_78b15c.jpg`) against the working mobile Chrome screenshot (`image_78b126.jpg`) reveals a critical forensic fact: **Not all CSS is missing on the client's phone — `index-[hash].css` (Tailwind v4) loaded 100%, while `LandingPage-[hash].css` (`landing.css`) failed 100%!**

Look at the exact visual evidence on the client's screen (`image_78b15c.jpg`):

1. **Tailwind (`index-[hash].css`) IS Loaded and Active:**
   - **Top Bar (`PublicNavbar.jsx:L78`):** `className="bg-[#030a16] text-slate-300 text-xs ..."` renders with its exact `#030a16` dark background, centered flex layout, and `w-3.5 h-3.5 text-cyan-400` icons.
   - **Main Header (`PublicNavbar.jsx:L93`):** `className="sticky top-0 z-50 bg-[#06162a]/90 ... h-20 flex items-center justify-between"` renders with its `#06162a` navy background, `h-12` logo on the left, and white hamburger menu button on the right.
   - **Floating WhatsApp Button (`LandingPage.jsx:L1354`):** `className="fixed bottom-6 right-6 z-50 flex ... bg-gradient-to-r from-emerald-500 to-green-600 text-white px-4 py-3 rounded-none shadow-2xl"` is fixed at the bottom-right corner with its green background and white icon.
   - **Why is the white `"Open in Maps ↗"` button (`LandingPage.jsx:L1112`) floating at the very top-left of the screen (`top: 14px, left: 14px`) covering `"Land Line: 051-545-443-8"`?!**
     - Look at `LandingPage.jsx:L1111-L1119`:
       ```jsx
       <div className="lp-map-box">
         <a
           href={settings.map_link}
           className="absolute top-3.5 left-3.5 z-10 inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/95 ... text-slate-800 text-xs font-bold border border-slate-200/90 shadow-md rounded-none"
         >
           <span>Open in Maps</span>
           <ExternalLink className="w-3.5 h-3.5 text-cyan-600" />
         </a>
       ```
     - Its Tailwind classes (`absolute top-3.5 left-3.5 z-10 bg-white/95 text-slate-800 text-xs font-bold border shadow-md`) **applied 100%**!
     - Why did it jump from the Google Maps section at the bottom of the page all the way to the top-left of the viewport? Because its parent `<div className="lp-map-box">` only gets `position: relative` from **`landing.css`**! Without `landing.css`, `absolute top-3.5 left-3.5` positions the button relative to the page root (`<html>`), pinning it over the top navbar!

2. **`landing.css` (`LandingPage-[hash].css`) Is 100% Missing:**
   - Every single `.lp-*` class in `LandingPage.jsx` (`.lp-hero`, `.lp-hero::before` dark overlay, `.lp-hero-inner`, `.lp-hero-badge`, `.lp-hero h1`, `.lp-btn-primary`, `.lp-btn-secondary`, `.lp-hero-trust-bar`, `.lp-about-section`, `.lp-section-tag`, `.lp-map-box`) is completely unstyled.
   - Because Tailwind Preflight (`index.css`) resets `h1`, `h2`, `p`, and `a` to `font-size: inherit; color: inherit` and sets `body { color: var(--foreground) }` (near-black), the Hero text renders as small, left-aligned black text directly on top of the raw waterfall background image!

---

## 2. The 4 Interacting Root Causes (Why This Happened on the Client's Chrome)

### Root Cause #1 (The Smoking Gun): `lazyWithRetry.js` Triggers Vite's `__vitePreload` `seen` Cache Bug and Swallows CSS Load Failures!

In `frontend/src/App.jsx:L11`, `LandingPage` is wrapped in `lazyWithRetry`:
```javascript
const LandingPage = lazyWithRetry(() => import('./pages/LandingPage'));
```
Because `LandingPage.jsx` is lazy-loaded and contains `import './landing.css'; import './certificates-reports.css';` (`L33-L34`), Vite extracts `landing.css` and `certificates-reports.css` out of the main `index-[hash].css` file into separate code-split CSS chunks (`assets/LandingPage-[hash].css` and `assets/certificates-reports-[hash].css`) and wraps the dynamic import in Vite's `__vitePreload` helper:

```javascript
// How Vite's built-in __vitePreload works in production builds:
const seen = {};
const __vitePreload = function preload(baseModule, deps) {
  return Promise.all(
    deps.map((dep) => {
      if (dep in seen) return; // <-- BUG TRIGGER!
      seen[dep] = true;        // <-- Marked `true` BEFORE the <link rel="stylesheet"> finishes loading!
      // Injects <link rel="stylesheet" href="/assets/LandingPage-HASH.css">
      // If <link> fires `onerror`, rejects with:
      // Error("Unable to preload CSS for /assets/LandingPage-HASH.css")
    })
  ).then(() => baseModule());
};
```

**Now trace what happens inside `frontend/src/utils/lazyWithRetry.js:L14-L42` when the client opens `theaquasphere.org`:**
1. The client has **46 tabs open in Chrome** (visible in the top-right tab counter `[46]` of `image_78b15c.jpg`) on Dual-SIM VoWiFi with Low Battery (`15%`).
2. On **Attempt 1** (`await importFn()`), Vite's `__vitePreload` sets `seen["/assets/LandingPage-HASH.css"] = true` and injects `<link rel="stylesheet" href="/assets/LandingPage-HASH.css">`.
3. If that CSS request fails on Attempt 1 (either because the tab woke up from Android Chrome's freeze cache after a new Dokploy deployment deleted the old `LandingPage-OLDHASH.css`, OR due to a momentary VoWiFi packet drop), `<link>` fires `onerror` and rejects Attempt 1 with:
   `Error: Unable to preload CSS for /assets/LandingPage-HASH.css`.
4. `lazyWithRetry.js:L17-L20` catches `firstError`, waits `400ms`, and runs **Attempt 2 (`return await importFn()`)**!
5. **THE CATASTROPHE ON ATTEMPT 2:**
   When `importFn()` runs a second time in the same page session, Vite's `__vitePreload` checks:
   ```javascript
   if (dep in seen) return;
   ```
   Because `seen["/assets/LandingPage-HASH.css"]` was already set to `true` on Attempt 1 (and Vite **never resets `seen[dep]` on error**!), **Attempt 2 completely skips loading `LandingPage-HASH.css`** and resolves `LandingPage-HASH.js` immediately!
6. As a result, `lazyWithRetry` thinks the retry "succeeded" and renders `<LandingPage />` with **zero `landing.css` styles**!
7. **Even worse (`lazyWithRetry.js:L23-L31`):** Even if Attempt 2 also rejected, look at `isChunkOrNetworkError` in `lazyWithRetry.js`:
   ```javascript
   const isChunkOrNetworkError =
     errorLower.includes('failed to fetch dynamically imported module') ||
     errorLower.includes('loading chunk') ||
     errorLower.includes('error loading dynamically imported module') ||
     errorLower.includes('importing a module script failed') ||
     errorLower.includes('network error') ||
     errorLower.includes('failed to fetch') ||
     retryError?.name === 'ChunkLoadError';
   ```
   Vite's CSS error message is **`"Unable to preload CSS for ..."`**, which does **not** match any of those 7 conditions!

---

### Root Cause #2: `LandingPage.jsx` Should Not Have Its CSS Split Into a Lazy Chunk in the First Place

`LandingPage.jsx` is the root homepage (`https://theaquasphere.org/`).
By lazy-loading `LandingPage.jsx` and importing `landing.css` + `certificates-reports.css` inside the lazy chunk:
1. Every visitor to `theaquasphere.org` suffers a 2-stage network waterfall (`index.html` $\rightarrow$ `index.js` + `index.css` $\rightarrow$ `LandingPage.js` + `LandingPage.css`).
2. Importing `landing.css` and `certificates-reports.css` directly in `main.jsx` (or `index.css`) compiles them into the single main `index-[hash].css` stylesheet in `<head>` of `index.html`, making it **architecturally impossible** for `index-[hash].css` (Tailwind) to load without `landing.css`!

---

### Root Cause #3: `nginx.conf` & `vercel.json` Fallback Rules Can Serve `index.html` (`text/html`) for Missing `.css` / `.js` Chunks

1. In `vercel.json` / `frontend/vercel.json:L2-L7`:
   ```json
   "rewrites": [
     {
       "source": "/(.*)",
       "destination": "/index.html"
     }
   ]
   ```
   Because `"/(.*)"` matches `/assets/LandingPage-OLDHASH.css`, any request for an old chunk hash after a deployment returns `index.html` with HTTP `200 OK` and `Content-Type: text/html`. With `X-Content-Type-Options: nosniff` enabled (`L35`), Chrome blocks the stylesheet with a strict MIME-type error instead of a clean `404`.
2. In `frontend/nginx.conf:L52-L56`:
   ```nginx
   location ~* \.(?:ico|css|js|pdf|gif|jpe?g|png|woff2?|eot|ttf|svg|webp)$ {
       try_files $uri =404; # <-- MISSING! Must explicitly return 404 if a hashed asset no longer exists
       expires 6M;
       access_log off;
       add_header Cache-Control "public, max-age=15552000, immutable";
   }
   ```

---

### Root Cause #4: `versionCheck.js` Does Not Check Version on Initial Boot and Skips Reload When the User Touches the Screen

In `frontend/src/utils/versionCheck.js:L52-L109`:
1. `initVersionCheck()` never calls `checkForUpdate(true)` on initial boot — it waits 60 seconds (`setInterval(..., 60000)`) or waits for a future `visibilitychange`.
2. When a mobile user switches back to one of their 46 open Chrome tabs (`visibilitychange` $\rightarrow$ `'visible'`) and immediately scrolls/taps the screen, `touchstart` updates `lastInteractionTs = Date.now()`, making `isUserIdle = false` and `isTabHidden = false`. Because `updatePending` is still `false` on that first `visibilitychange` event (`checkForUpdate(updatePending)` passes `false`), `versionCheck.js` fetches `/version.json`, sees the new version, sets `updatePending = true`, **and refuses to reload because `forceReloadIfOutdated` was `false` and the user just touched the screen**!

---

## 3. Step-by-Step Fix Instructions for Antigravity

> **Instructions for Antigravity:** Apply all 5 atomic fixes below so that `landing.css` and `certificates-reports.css` can never fail to load independently of Tailwind, failed `<link rel="stylesheet">` tags are never cached as "seen" without loading, and stale mobile tabs always recover cleanly.

---

### Step 1: Import `landing.css` and `certificates-reports.css` Globally in `main.jsx` (Eliminates Split-Brain CSS Forever)

Open `frontend/src/main.jsx` and import `./pages/landing.css` and `./pages/certificates-reports.css` right alongside `./index.css`:

```javascript
// frontend/src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './pages/landing.css'
import './pages/certificates-reports.css'
import App from './App.jsx'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import { setupApiCache } from './utils/apiCache'
import { initVersionCheck } from './utils/versionCheck'

setupApiCache();
initVersionCheck();

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </StrictMode>,
  );
}
```
*Why this works:* Vite bundles `index.css`, `landing.css`, and `certificates-reports.css` into the **single synchronous `<link rel="stylesheet" href="/assets/index-[hash].css">` tag inside `index.html`**. It becomes 100% impossible for Tailwind to load without `.lp-*` styles!

---

### Step 2: Add `relative` to `.lp-map-box` in `LandingPage.jsx` (Defensive Positioning Guard)

Open `frontend/src/pages/LandingPage.jsx` at line `1111` (`#location` map container) and add Tailwind's `relative overflow-hidden` directly to the class list so `"Open in Maps"` can never escape to the top of the viewport:

```jsx
// frontend/src/pages/LandingPage.jsx (around line 1111)
<div className="lp-map-box relative overflow-hidden">
  <a 
    href={settings.map_link} 
    target="_blank" 
    rel="noreferrer" 
    className="absolute top-3.5 left-3.5 z-10 inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/95 hover:bg-white text-slate-800 hover:text-cyan-700 text-xs font-bold border border-slate-200/90 shadow-md hover:shadow-lg transition-all rounded-none"
    title="Open location in Google Maps"
  >
    <span>Open in Maps</span>
    <ExternalLink className="w-3.5 h-3.5 text-cyan-600" />
  </a>
```

---

### Step 3: Fix `lazyWithRetry.js` So It Never Triggers Vite's `seen[dep]` CSS Skip Bug & Catches `"Unable to preload CSS"`

Replace `frontend/src/utils/lazyWithRetry.js` with the following implementation. Crucially:
1. If `firstError` is a **`Unable to preload CSS`** error, **DO NOT call `importFn()` a second time in the same memory session** (because Vite's `__vitePreload` has already poisoned `seen[dep] = true` and will skip the CSS file on the retry!). Instead, either re-inject the failed `<link rel="stylesheet">` with a cache-buster or trigger the clean one-time page reload immediately.
2. Add `'unable to preload css'` and `'preload'` to `isChunkOrNetworkError`.

```javascript
// frontend/src/utils/lazyWithRetry.js
import { lazy } from 'react';

function isAssetOrChunkError(err) {
  const msg = String(err?.message || '').toLowerCase();
  return (
    msg.includes('unable to preload css') ||
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('loading chunk') ||
    msg.includes('loading css chunk') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('importing a module script failed') ||
    msg.includes('network error') ||
    msg.includes('failed to fetch') ||
    err?.name === 'ChunkLoadError'
  );
}

export function lazyWithRetry(importFn) {
  return lazy(async () => {
    try {
      return await importFn();
    } catch (firstError) {
      const firstMsg = String(firstError?.message || '').toLowerCase();

      // CRITICAL VITE GUARD:
      // When Vite fails to preload a CSS chunk, it throws "Unable to preload CSS for /assets/...css"
      // AFTER marking `seen[dep] = true` in memory. Calling `importFn()` a second time without reloading
      // causes Vite to skip the CSS file and render the component completely unstyled!
      if (firstMsg.includes('unable to preload css')) {
        const lastReload = Number(sessionStorage.getItem('app_auto_reload_ts') || 0);
        if (Date.now() - lastReload > 15000) {
          sessionStorage.setItem('app_auto_reload_ts', String(Date.now()));
          window.location.reload();
          return { default: () => null };
        }
        throw firstError;
      }

      // For JS module network blips, retry once after 400ms
      try {
        await new Promise((resolve) => setTimeout(resolve, 400));
        return await importFn();
      } catch (retryError) {
        const lastReload = Number(sessionStorage.getItem('app_auto_reload_ts') || 0);
        const canReload = Date.now() - lastReload > 15000;

        if ((isAssetOrChunkError(retryError) || isAssetOrChunkError(firstError)) && canReload) {
          sessionStorage.setItem('app_auto_reload_ts', String(Date.now()));
          window.location.reload();
          return { default: () => null };
        }

        throw retryError;
      }
    }
  });
}
```

---

### Step 4: Fix `versionCheck.js` So Waking Mobile Tabs Check `/version.json` Immediately & Reload When Outdated

Update `frontend/src/utils/versionCheck.js` so that:
1. `initVersionCheck()` runs `checkForUpdate(false)` immediately on startup.
2. When a backgrounded mobile Chrome tab wakes up (`visibilitychange` $\rightarrow$ `'visible'` or `pageshow` with `event.persisted`), if the tab was hidden or in bfcache and the server's `/version.json` does not match `CURRENT_VERSION`, it reloads immediately (`checkForUpdate(true)`) before the user sees stale assets.
3. Add a global `<link rel="stylesheet">` error listener so if any stylesheet fails to load at runtime, the page recovers automatically.

```javascript
// frontend/src/utils/versionCheck.js — inside initVersionCheck()
export function initVersionCheck() {
  if (typeof window === 'undefined') return;

  // 1. Check on initial boot
  checkForUpdate(false);

  // 2. When a sleeping mobile Chrome tab wakes up or restores from bfcache, force reload if version changed
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkForUpdate(true);
    }
  });

  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      checkForUpdate(true);
    }
  });

  window.addEventListener('online', () => {
    checkForUpdate(true);
  });

  // 3. Poll every 60 seconds for idle background tabs
  setInterval(() => {
    checkForUpdate(false);
  }, 60000);

  // 4. Native Vite preload error listener (fires when a JS or CSS chunk 404s)
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    const lastReload = Number(sessionStorage.getItem('app_auto_reload_ts') || 0);
    if (Date.now() - lastReload > 15000) {
      sessionStorage.setItem('app_auto_reload_ts', String(Date.now()));
      window.location.reload();
    }
  });
}
```

---

### Step 5: Harden `frontend/nginx.conf` & `vercel.json` So Missing `.css` / `.js` Files Return `404` Instead of `index.html`

1. In `frontend/nginx.conf:L52-L57`, add `try_files $uri =404;` to the static asset block so missing old chunks never fall through to `/index.html`:
   ```nginx
   # 4. Cache static hashed assets (immutable) with standard MIME types
   location ~* \.(?:ico|css|js|pdf|gif|jpe?g|png|woff2?|eot|ttf|svg|webp)$ {
       try_files $uri =404;
       expires 6M;
       access_log off;
       add_header Cache-Control "public, max-age=15552000, immutable";
   }
   ```
2. In `vercel.json` and `frontend/vercel.json`, exclude `/assets/(.*)` from the SPA `/index.html` rewrite:
   ```json
   "rewrites": [
     {
       "source": "/((?!assets/|api/|robots\\.txt|sitemap\\.xml|version\\.json|favicon\\.svg).*)",
       "destination": "/index.html"
     }
   ]
   ```

---

## 4. Verification Checklist for Antigravity

- [ ] Run `pnpm run build` inside `frontend/` and inspect `dist/index.html` and `dist/assets/` — confirm `landing.css` and `certificates-reports.css` are merged directly into the primary `dist/assets/index-[hash].css` bundle rather than split into a separate lazy CSS chunk.
- [ ] Verify `<div className="lp-map-box relative overflow-hidden">` in `LandingPage.jsx` keeps the `"Open in Maps"` button anchored inside the Google Maps card even if external CSS is delayed.
- [ ] Verify `lazyWithRetry.js` immediately reloads on `"Unable to preload CSS"` instead of calling `importFn()` a second time and triggering Vite's `seen[dep]` skip bug.
- [ ] Verify `nginx.conf` has `try_files $uri =404;` inside the static asset `location` block.
