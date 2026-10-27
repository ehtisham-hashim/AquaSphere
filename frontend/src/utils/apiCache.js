import { invalidateQueries } from '../lib/queryClient';
import { getAuthToken, getCompanyFromCookie } from './companyCookie';

/**
 * Global persistent client-side API cache with in-flight deduplication & auto-invalidation
 */
const cache = new Map();
const inFlight = new Map();
const DEFAULT_TTL = 30 * 1000; // 30 seconds default (reduced for live operational responsiveness)
const STORAGE_PREFIX = '__aquasphere_api_cache__';

// Volatile operational endpoints whose data must never persist in sessionStorage across page reloads
const VOLATILE_ENDPOINTS = [
  'auth',
  'items',
  'inventory',
  'raw-materials',
  'spot-sales',
  'orders',
  'production',
  'analytics',
  'daily-close',
  'purchases',
  'customers',
  'bottles',
  'vendors',
  'expenses',
  'vehicles',
  'transport-expenses',
  'users',
  'admin',
  'reports',
  'audit-logs',
  'settings'
];

function isVolatile(keyOrUrl) {
  if (!keyOrUrl) return false;
  return VOLATILE_ENDPOINTS.some((endpoint) => keyOrUrl.includes(endpoint));
}

// Helper to load cache entry from sessionStorage with TTL check
function loadFromStorage(key) {
  if (typeof window === 'undefined' || !window.sessionStorage) return null;
  try {
    const raw = window.sessionStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.timestamp || (Date.now() - parsed.timestamp > DEFAULT_TTL)) {
      window.sessionStorage.removeItem(`${STORAGE_PREFIX}${key}`);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

// Helper to save cache entry to sessionStorage
function saveToStorage(key, data) {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  if (isVolatile(key)) return;
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
    inFlight.clear();
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
  for (const key of inFlight.keys()) {
    if (key.includes(pattern)) {
      inFlight.delete(key);
    }
  }
  removeFromStorage(pattern);
  try {
    invalidateQueries(pattern);
  } catch {
    // ignore
  }
}

function getHeader(headers, name) {
  if (!headers) return null;
  if (typeof headers.get === 'function') {
    return headers.get(name);
  }
  if (Array.isArray(headers)) {
    const entry = headers.find(([k]) => k.toLowerCase() === name.toLowerCase());
    return entry ? entry[1] : null;
  }
  const lowerName = name.toLowerCase();
  for (const k of Object.keys(headers)) {
    if (k.toLowerCase() === lowerName) {
      return headers[k];
    }
  }
  return null;
}

export function setupApiCache() {
  if (typeof window === 'undefined' || window.__apiCacheInitialized) return;
  window.__apiCacheInitialized = true;

  const originalFetch = window.fetch;

  window.fetch = async function (resource, options = {}) {
    const url = typeof resource === 'string' ? resource : resource?.url || '';
    const method = (options.method || (typeof resource === 'object' && resource?.method) || 'GET').toUpperCase();

    const isApiRequest = Boolean(url && (url.includes('/api/v1') || url.includes('/api/')));
    const isAuth = Boolean(url && url.includes('/auth/'));

    // Normalize options and inject auth headers for all API requests
    let normalizedOptions = { ...options };
    if (isApiRequest) {
      normalizedOptions.credentials = normalizedOptions.credentials || 'include';

      const token = getAuthToken();
      const tenant = getCompanyFromCookie();

      if (normalizedOptions.headers instanceof Headers) {
        const h = new Headers(normalizedOptions.headers);
        if (!h.has('Authorization') && token) {
          h.set('Authorization', `Bearer ${token}`);
        }
        if (!h.has('x-tenant') && tenant) {
          h.set('x-tenant', tenant);
        }
        normalizedOptions.headers = h;
      } else if (Array.isArray(normalizedOptions.headers)) {
        const h = [...normalizedOptions.headers];
        const hasAuth = h.some(([k]) => k.toLowerCase() === 'authorization');
        if (!hasAuth && token) {
          h.push(['Authorization', `Bearer ${token}`]);
        }
        const hasTenant = h.some(([k]) => k.toLowerCase() === 'x-tenant');
        if (!hasTenant && tenant) {
          h.push(['x-tenant', tenant]);
        }
        normalizedOptions.headers = h;
      } else {
        const h = { ...(normalizedOptions.headers || {}) };
        const hasAuth = Object.keys(h).some((k) => k.toLowerCase() === 'authorization');
        if (!hasAuth && token) {
          h['Authorization'] = `Bearer ${token}`;
        }
        const hasTenant = Object.keys(h).some((k) => k.toLowerCase() === 'x-tenant');
        if (!hasTenant && tenant) {
          h['x-tenant'] = tenant;
        }
        normalizedOptions.headers = h;
      }
    }

    const requestHeaders = normalizedOptions.headers || (typeof resource === 'object' ? resource?.headers : null);
    const isGet = method === 'GET';
    const noCacheHeader = getHeader(requestHeaders, 'x-no-cache');
    // Auth routes are strictly never cached
    const isNoCache = isAuth || normalizedOptions.cache === 'no-store' || (typeof resource === 'object' && resource?.cache === 'no-store') || Boolean(noCacheHeader);

    // Invalidate cache on mutations (POST, PUT, PATCH, DELETE)
    if (isApiRequest && !isGet) {
      // Clear inFlight map during mutations to stop in-flight GET requests from saving pre-mutation stale data
      inFlight.clear();

      const response = await originalFetch.call(this, resource, normalizedOptions);

      if (response.status === 401) {
        const isLoginOr2FA = url.includes('/auth/login') || url.includes('/auth/verify-owner-otp');
        if (!isLoginOr2FA && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth-unauthorized'));
        }
      }

      // Post-mutation cache clearing: only clear AFTER the mutation completes successfully
      if (response.ok) {
        const match = url.match(/\/api(?:\/v1)?\/([^/?#]+)/);
        const rawSegment = match ? match[1] : '';
        const relatedMap = {
          production: ['production', 'items', 'analytics', 'inventory', 'raw-materials'],
          orders: ['orders', 'items', 'customers', 'bottles', 'analytics', 'spot-sales', 'inventory'],
          'spot-sales': ['spot-sales', 'items', 'customers', 'bottles', 'analytics', 'daily-close', 'inventory', 'raw-materials'],
          items: ['items', 'inventory', 'production', 'raw-materials', 'bottles'],
          customers: ['customers', 'bottles', 'orders', 'spot-sales'],
          bottles: ['bottles', 'customers', 'inventory', 'items', 'analytics'],
          purchases: ['purchases', 'items', 'vendors', 'expenses', 'analytics', 'inventory', 'raw-materials'],
          expenses: ['expenses', 'analytics', 'daily-close'],
          vendors: ['vendors', 'purchases']
        };

        const targets = relatedMap[rawSegment] || (rawSegment ? [rawSegment] : []);
        if (targets.length > 0) {
          targets.forEach((t) => clearCache(t));
        } else {
          clearCache();
        }
      }

      return response;
    }

    if (!isApiRequest) {
      return originalFetch.call(this, resource, normalizedOptions);
    }

    const tenantHeader = getHeader(requestHeaders, 'x-tenant') ||
      (typeof window !== 'undefined' ? localStorage.getItem('tenant') || localStorage.getItem('company') : '') ||
      (typeof document !== 'undefined' ? document.cookie.match(/tenant=([^;]+)/)?.[1] : '') ||
      'aquasphere';
    const cacheKey = `${url}|${tenantHeader.toLowerCase()}`;
    const now = Date.now();
    const ttl = normalizedOptions.ttl || DEFAULT_TTL;

    if (!isNoCache) {
      // 1. In-memory cache hit
      let cached = cache.get(cacheKey);

      // 2. Storage fallback hit (if not volatile)
      if (!cached) {
        cached = loadFromStorage(cacheKey);
        if (cached) {
          cache.set(cacheKey, cached);
        }
      }

      if (cached && now - cached.timestamp < ttl) {
        // Stale-While-Revalidate: If data is older than 3s, refresh in background without blocking UI
        if (now - cached.timestamp > 3000 && !inFlight.has(cacheKey)) {
          const bgPromise = (async () => {
            try {
              const response = await originalFetch.call(this, resource, normalizedOptions);

              if (response.status === 401) {
                const isLoginOr2FA = url.includes('/auth/login') || url.includes('/auth/verify-owner-otp');
                if (!isLoginOr2FA && typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('auth-unauthorized'));
                }
              }

              if (response.ok) {
                const body = await response.text();
                const freshData = {
                  body,
                  status: response.status,
                  statusText: response.statusText,
                  headers: Array.from(response.headers.entries()),
                  timestamp: Date.now(),
                };
                cache.set(cacheKey, freshData);
                saveToStorage(cacheKey, freshData);
                return freshData;
              }
            } catch {
              // Ignore background revalidation errors
            } finally {
              inFlight.delete(cacheKey);
            }
            return cached;
          })();
          inFlight.set(cacheKey, bgPromise);
        }

        return new Response(cached.body, {
          status: cached.status,
          statusText: cached.statusText,
          headers: new Headers(cached.headers),
        });
      }

      // 3. In-flight request deduplication
      if (inFlight.has(cacheKey)) {
        const data = await inFlight.get(cacheKey);
        if (data && data.body !== undefined) {
          return new Response(data.body, {
            status: data.status,
            statusText: data.statusText,
            headers: new Headers(data.headers),
          });
        }
      }
    } else {
      // If isNoCache is true, ensure any pending inFlight request for this key is purged
      inFlight.delete(cacheKey);
    }

    // 4. Network fetch (runs on cache miss or strict no-cache bypass)
    const fetchPromise = (async () => {
      try {
        const response = await originalFetch.call(this, resource, normalizedOptions);

        if (response.status === 401) {
          const isLoginOr2FA = url.includes('/auth/login') || url.includes('/auth/verify-owner-otp');
          if (!isLoginOr2FA && typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('auth-unauthorized'));
          }
        }

        const body = await response.text();
        const data = {
          body,
          status: response.status,
          statusText: response.statusText,
          headers: Array.from(response.headers.entries()),
          timestamp: response.ok ? Date.now() : 0,
        };

        if (response.ok && !isAuth) {
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
