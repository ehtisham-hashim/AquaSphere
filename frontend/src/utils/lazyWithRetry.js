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
export function lazyWithRetry(importFn) {
  return lazy(async () => {
    try {
      return await importFn();
    } catch (firstError) {
      // 1. Retry after 400ms in case the tab is waking up or network is reconnecting
      try {
        await new Promise((resolve) => setTimeout(resolve, 400));
        return await importFn();
      } catch (retryError) {
        const errorLower = String(retryError?.message || firstError?.message || '').toLowerCase();
        const isChunkOrNetworkError =
          errorLower.includes('failed to fetch dynamically imported module') ||
          errorLower.includes('loading chunk') ||
          errorLower.includes('error loading dynamically imported module') ||
          errorLower.includes('importing a module script failed') ||
          errorLower.includes('network error') ||
          errorLower.includes('failed to fetch') ||
          retryError?.name === 'ChunkLoadError';

        // 2. Check if we haven't already reloaded within the last 15 seconds to prevent reload loops
        const lastReload = Number(sessionStorage.getItem('app_auto_reload_ts') || 0);
        const canReload = Date.now() - lastReload > 15000;

        if (isChunkOrNetworkError && canReload) {
          sessionStorage.setItem('app_auto_reload_ts', String(Date.now()));
          window.location.reload();
          // Return an empty component while the page reloads
          return { default: () => null };
        }

        throw retryError;
      }
    }
  });
}
