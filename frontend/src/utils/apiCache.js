// ponytail: global in-memory client-side cache with in-flight deduplication & auto-invalidation
const cache = new Map();
const inFlight = new Map();
const DEFAULT_TTL = 60 * 1000; // 60 seconds

export function clearCache(pattern = null) {
  if (!pattern) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
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

    // 1. In-memory cache hit
    const cached = cache.get(cacheKey);
    if (cached && now - cached.timestamp < (options.ttl || DEFAULT_TTL)) {
      return new Response(cached.body, {
        status: cached.status,
        statusText: cached.statusText,
        headers: new Headers(cached.headers),
      });
    }

    // 2. In-flight request deduplication
    if (inFlight.has(cacheKey)) {
      const data = await inFlight.get(cacheKey);
      return new Response(data.body, {
        status: data.status,
        statusText: data.statusText,
        headers: new Headers(data.headers),
      });
    }

    // 3. Network fetch
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
