import { lazy } from 'react';

/**
 * Wraps React.lazy with automatic chunk-load retry and deployment recovery.
 *
 * Problem solved:
 * When a user leaves the portal open and a new deployment happens on Dokploy,
 * or when the browser wakes from a sleeping tab state, old chunk hashes on the server
 * no longer exist (404) or network temporarily drops. Standard React.lazy
 * permanently fails and throws into RouteErrorBoundary showing "Reload Application".
 *
 * Solution:
 * 1. Automatically retries the dynamic import after a brief backoff.
 * 2. If it's a chunk/module load error, smoothly reloads the page once so the
 *    browser fetches the latest assets without interrupting the user.
 */
const RELOAD_COOLDOWN_MS = 15000;
const RELOAD_STORAGE_KEY = 'app_auto_reload_ts';

/**
 * Checks whether an error was caused by a failed JS or CSS chunk preload.
 * @param {unknown} err
 * @returns {boolean}
 */
export function isAssetOrChunkError(err) {
  if (!err) return false;
  const msg = String(err?.message || err || '').toLowerCase();
  return (
    msg.includes('unable to preload css') ||
    msg.includes('loading css chunk') ||
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('loading chunk') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('importing a module script failed') ||
    msg.includes('network error') ||
    msg.includes('failed to fetch') ||
    err?.name === 'ChunkLoadError'
  );
}

function isCssPreloadError(err) {
  const msg = String(err?.message || err || '').toLowerCase();
  return msg.includes('unable to preload css') || msg.includes('loading css chunk');
}

/**
 * Reloads the page at most once per 15-second cooldown window to break reload loops.
 * @returns {boolean} true if a reload was initiated
 */
export function tryThrottledReload() {
  if (typeof window === 'undefined') return false;
  try {
    const lastReload = Number(sessionStorage.getItem(RELOAD_STORAGE_KEY) || 0);
    if (Date.now() - lastReload > RELOAD_COOLDOWN_MS) {
      sessionStorage.setItem(RELOAD_STORAGE_KEY, String(Date.now()));
      window.location.reload();
      return true;
    }
    return false;
  } catch {
    window.location.reload();
    return true;
  }
}

export function lazyWithRetry(importFn) {
  return lazy(async () => {
    try {
      return await importFn();
    } catch (firstError) {
      // CRITICAL VITE GUARD:
      // Vite's __vitePreload marks `seen[dep] = true` BEFORE injecting `<link rel="stylesheet">`.
      // Calling `importFn()` a second time after a CSS preload failure skips loading the CSS
      // and renders an unstyled component. Reload immediately (throttled) instead of retrying.
      if (isCssPreloadError(firstError)) {
        if (tryThrottledReload()) {
          return { default: () => null };
        }
        throw firstError;
      }

      // 1. Retry transient JS module/network blips once after 400ms
      try {
        await new Promise((resolve) => setTimeout(resolve, 400));
        return await importFn();
      } catch (retryError) {
        if ((isAssetOrChunkError(retryError) || isAssetOrChunkError(firstError)) && tryThrottledReload()) {
          return { default: () => null };
        }

        throw retryError;
      }
    }
  });
}
