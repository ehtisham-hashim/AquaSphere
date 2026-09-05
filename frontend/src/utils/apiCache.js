import { invalidateQueries } from '../lib/queryClient';

/**
 * Global persistent client-side API cache with in-flight deduplication & auto-invalidation
 */
const cache = new Map();
const inFlight = new Map();
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes default (matches TanStack Query staleTime)
const STORAGE_PREFIX = '__aquasphere_api_cache__';

// Helper to load cache entry from sessionStorage
function loadFromStorage(key) {
  if (typeof window === 'undefined' || !window.sessionStorage) return null;
  try {
    const raw = window.sessionStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Helper to save cache entry to sessionStorage
function saveToStorage(key, data) {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    window.sessionStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(data));
  } catch {
    // sessionStorage full or disabled; fallback to in-memory map
  }
}

// Helper to remove entries from sessionStorage
function removeFromStorage(pattern = null) {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    if (!pattern) {
      const keys = [];
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const k = window.sessionStorage.key(i);
        if (k && k.startsWith(STORAGE_PREFIX)) keys.push(k);
      }
      keys.forEach((k) => window.sessionStorage.removeItem(k));
      return;
    }

    const keys = [];
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const k = window.sessionStorage.key(i);
      if (k && k.startsWith(STORAGE_PREFIX) && k.includes(pattern)) keys.push(k);
    }
    keys.forEach((k) => window.sessionStorage.removeItem(k));
  } catch {
    // ignore
  }
}

export function clearCache(pattern = null) {
  if (!pattern) {
    cache.clear();
    removeFromStorage();
    try {
      invalidateQueries();
    } catch {
      // ignore
    }
    return;
  }

  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
  removeFromStorage(pattern);
  try {
    invalidateQueries(pattern);
  } catch {
    // ignore
  }
}

export function setupApiCache() {
  if (typeof window === 'undefined' || window.__apiCacheInitialized) return;
  window.__apiCacheInitialized = true;

  const originalFetch = window.fetch;

  window.fetch = async function (resource, options = {}) {
    const url = typeof resource === 'string' ? resource : resource?.url || '';
    const method = (options.method || 'GET').toUpperCase();

    const isApiRequest = url && (url.includes('/api/v1') || url.includes('/api/'));
    const isGet = method === 'GET';
    const isNoCache = options.cache === 'no-store' || options.headers?.['x-no-cache'];

    // Invalidate cache on mutations (POST, PUT, PATCH, DELETE)
    if (isApiRequest && !isGet) {
      clearCache();
      return originalFetch.apply(this, arguments);
    }

    if (!isApiRequest || isNoCache) {
      return originalFetch.apply(this, arguments);
    }

    const tenantHeader = options.headers?.['x-tenant'] || '';
    const cacheKey = `${url}|${tenantHeader}`;
    const now = Date.now();
    const ttl = options.ttl || DEFAULT_TTL;

    // 1. In-memory cache hit
    let cached = cache.get(cacheKey);

    // 2. Storage fallback hit (if tab was discarded or refreshed by Chrome)
    if (!cached) {
      cached = loadFromStorage(cacheKey);
      if (cached) {
        cache.set(cacheKey, cached);
      }
    }

    if (cached && now - cached.timestamp < ttl) {
      return new Response(cached.body, {
        status: cached.status,
        statusText: cached.statusText,
        headers: new Headers(cached.headers),
      });
    }

    // 3. In-flight request deduplication
    if (inFlight.has(cacheKey)) {
      const data = await inFlight.get(cacheKey);
      return new Response(data.body, {
        status: data.status,
        statusText: data.statusText,
        headers: new Headers(data.headers),
      });
    }

    // 4. Network fetch
    const fetchPromise = (async () => {
      try {
        const response = await originalFetch.apply(this, arguments);
        const body = await response.text();
        const data = {
          body,
          status: response.status,
          statusText: response.statusText,
          headers: Array.from(response.headers.entries()),
          timestamp: response.ok ? Date.now() : 0,
        };

        if (response.ok) {
          cache.set(cacheKey, data);
          saveToStorage(cacheKey, data);
        }
        return data;
      } finally {
        inFlight.delete(cacheKey);
      }
    })();

    inFlight.set(cacheKey, fetchPromise);
    const data = await fetchPromise;
    return new Response(data.body, {
      status: data.status,
      statusText: data.statusText,
      headers: new Headers(data.headers),
    });
  };
}
