/* global __APP_BUILD_TIME__ */
/**
 * Background Version Synchronization & Auto-Update Manager
 *
 * Solves the stale-tab problem:
 * When Dokploy deploys a new build, Vite produces new chunk hashes and the server
 * deletes the old files. A user who left their tab open or returns late to their
 * system would otherwise experience 404s when loading lazy routes (e.g. Login, Customers).
 *
 * This utility:
 * 1. Checks /version.json periodically and immediately upon tab wake-up (visibilitychange/focus).
 * 2. If a new version is detected and the user is idle or the tab is hidden, it silently
 *    refreshes the page in the background so the user returns to a fresh, working app.
 * 3. Intercepts dynamic import / preload errors to seamlessly reload without error popups.
 */

import { tryThrottledReload } from './lazyWithRetry';

// Global constant injected by Vite define in vite.config.js
const CURRENT_VERSION = typeof __APP_BUILD_TIME__ !== 'undefined' ? __APP_BUILD_TIME__ : null;
const PUBLIC_ROUTES = ['/', '/certificates', '/reports', '/login'];

let lastInteractionTs = Date.now();
let isChecking = false;
let updatePending = false;

// Update interaction timestamp on common user actions
if (typeof window !== 'undefined') {
  const recordActivity = () => {
    lastInteractionTs = Date.now();
  };
  window.addEventListener('mousemove', recordActivity, { passive: true });
  window.addEventListener('keydown', recordActivity, { passive: true });
  window.addEventListener('click', recordActivity, { passive: true });
  window.addEventListener('touchstart', recordActivity, { passive: true });
}

/**
 * Checks the server for a newer build version.
 * @param {boolean} forceReloadIfOutdated - If true, reloads immediately on version mismatch regardless of idle status.
 */
export async function checkForUpdate(forceReloadIfOutdated = false) {
  if (isChecking || !CURRENT_VERSION || typeof window === 'undefined') return;

  isChecking = true;
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache, no-store' }
    });

    if (res.ok) {
      const data = await res.json();
      const serverVersion = String(data?.version || '');

      if (serverVersion && serverVersion !== String(CURRENT_VERSION)) {
        updatePending = true;

        const isTabHidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
        const isUserIdle = Date.now() - lastInteractionTs > 45000; // idle for > 45s

        if (forceReloadIfOutdated || isTabHidden || isUserIdle) {
          if (tryThrottledReload()) {
            return;
          }
        }
      }
    }
  } catch {
    // Silent ignore on transient network drops
  } finally {
    isChecking = false;
  }
}

/**
 * Initializes automatic background version checking and runtime asset recovery.
 */
export function initVersionCheck() {
  if (typeof window === 'undefined') return;

  // 1. Check immediately on initial boot so cached HTML recovers right away
  checkForUpdate(false);

  // 2. When a sleeping mobile Chrome tab wakes up, reload immediately on public pages or if an update is pending
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      const isPublicRoute = PUBLIC_ROUTES.includes(window.location.pathname);
      checkForUpdate(isPublicRoute || updatePending);
    }
  });

  // 3. Always force-check when restoring from mobile browser bfcache
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      checkForUpdate(true);
    }
  });

  window.addEventListener('online', () => {
    checkForUpdate(true);
  });

  // 4. Poll every 60 seconds
  setInterval(() => {
    checkForUpdate(false);
  }, 60000);

  // 5. Native Vite preload error listener (fires when a JS or CSS chunk 404s)
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    tryThrottledReload();
  });

  // 6. Global capture listener for same-origin /assets/*.css stylesheet load failures
  window.addEventListener(
    'error',
    (event) => {
      const target = event?.target;
      if (
        target &&
        target.tagName === 'LINK' &&
        target.rel === 'stylesheet' &&
        typeof target.href === 'string' &&
        target.href.startsWith(window.location.origin) &&
        target.href.includes('/assets/')
      ) {
        tryThrottledReload();
      }
    },
    true
  );
}
