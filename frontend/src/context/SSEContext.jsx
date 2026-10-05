/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useRef, useCallback } from 'react';
import { useTenant } from './TenantContext';
import { useAuth } from './AuthContext';
import { API_URL } from '../utils/api';
import { clearCache } from '../utils/apiCache';

const SSEContext = createContext(null);

const EVENT_CACHE_MAP = {
  INVENTORY_CHANGED: ['items', 'inventory', 'raw-materials'],
  COUNTER_SALE_CREATED: ['spot-sales', 'items', 'customers', 'daily-close', 'inventory', 'raw-materials'],
  PRODUCTION_UPDATED: ['production', 'items', 'inventory', 'raw-materials'],
  PURCHASE_CREATED: ['purchases', 'items', 'vendors', 'raw-materials', 'inventory'],
  ORDER_UPDATED: ['orders', 'items', 'customers', 'inventory'],
  CUSTOMER_UPDATED: ['customers', 'orders', 'spot-sales'],
  EXPENSE_LOGGED: ['expenses', 'analytics', 'daily-close'],
  DAILY_CLOSE_CHANGED: ['daily-close', 'spot-sales', 'analytics'],
  VEHICLE_UPDATED: ['vehicles', 'expenses'],
  USER_UPDATED: ['users'],
  LANDING_PAGE_UPDATED: ['landing-page', 'settings']
};

const KNOWN_EVENTS = [
  'CONNECTED',
  'PING',
  'ORDER_UPDATED',
  'INVENTORY_CHANGED',
  'PRODUCTION_UPDATED',
  'COUNTER_SALE_CREATED',
  'CUSTOMER_UPDATED',
  'EXPENSE_LOGGED',
  'DAILY_CLOSE_CHANGED',
  'PURCHASE_CREATED',
  'VEHICLE_UPDATED',
  'USER_UPDATED',
  'LANDING_PAGE_UPDATED'
];

export function SSEProvider({ children }) {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const listenersRef = useRef(new Map());
  const attachedEventsRef = useRef(new Set());
  const eventSourceRef = useRef(null);
  const lastActivityRef = useRef(0);
  const reconnectTimeoutRef = useRef(null);
  const connectRef = useRef(null);

  const dispatchEvent = useCallback((type, data) => {
    lastActivityRef.current = Date.now();
    if (type === 'PING') return;

    // Invalidate relevant cache groups first so any callback fetching fresh data gets server state
    const cacheTargets = EVENT_CACHE_MAP[type];
    if (cacheTargets && Array.isArray(cacheTargets)) {
      cacheTargets.forEach((t) => clearCache(t));
    }

    const callbacks = listenersRef.current.get(type);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error(`Error in SSE listener for ${type}:`, err);
        }
      });
    }
  }, []);

  const attachListener = useCallback((sse, type) => {
    if (!sse || attachedEventsRef.current.has(type)) return;
    attachedEventsRef.current.add(type);

    sse.addEventListener(type, (event) => {
      lastActivityRef.current = Date.now();
      try {
        const parsed = event.data ? JSON.parse(event.data) : {};
        dispatchEvent(type, parsed);
      } catch (_err) {
        dispatchEvent(type, event.data);
      }
    });
  }, [dispatchEvent]);

  const connect = useCallback(() => {
    if (!user) return;

    if (eventSourceRef.current) {
      try {
        eventSourceRef.current.close();
      } catch (_e) {
        // Safe close ignore
      }
      eventSourceRef.current = null;
    }
    attachedEventsRef.current.clear();

    const currentTenant = tenant || 'aquasphere';
    const streamUrl = `${API_URL}/events/stream?tenant=${currentTenant}`;
    const sse = new EventSource(streamUrl, { withCredentials: true });
    eventSourceRef.current = sse;
    lastActivityRef.current = Date.now();

    // Attach all known events
    KNOWN_EVENTS.forEach((t) => attachListener(sse, t));

    // Also attach any events that components already subscribed to
    listenersRef.current.forEach((_, t) => {
      attachListener(sse, t);
    });

    sse.onmessage = (event) => {
      lastActivityRef.current = Date.now();
      try {
        const parsed = JSON.parse(event.data);
        if (parsed?.type) {
          dispatchEvent(parsed.type, parsed.data || parsed);
        }
      } catch (_err) {
        // Heartbeat or raw message
      }
    };

    sse.onerror = () => {
      if (sse.readyState === EventSource.CLOSED) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
            connectRef.current?.();
          }
        }, 3000);
      }
    };
  }, [tenant, user, attachListener, dispatchEvent]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  // Main lifecycle: connect on mount/user change, cleanup on unmount
  useEffect(() => {
    const attachedEvents = attachedEventsRef.current;
    if (!user) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      attachedEvents.clear();
      return;
    }

    connect();

    return () => {
      clearTimeout(reconnectTimeoutRef.current);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      attachedEvents.clear();
    };
  }, [connect, user]);

  // Watchdog & sleeping tab wakeup handlers
  useEffect(() => {
    const handleVisibilityOrOnline = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible' && user) {
        const now = Date.now();
        const isInactive = now - lastActivityRef.current > 40000;
        const isClosed = !eventSourceRef.current || eventSourceRef.current.readyState === EventSource.CLOSED;

        if (isInactive || isClosed) {
          connect();
          clearCache();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrOnline);
    window.addEventListener('online', handleVisibilityOrOnline);

    // Watchdog check every 20 seconds for frozen background tabs returning to focus
    const watchdogInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible' && user) {
        const now = Date.now();
        if (now - lastActivityRef.current > 50000) {
          connect();
        }
      }
    }, 20000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityOrOnline);
      window.removeEventListener('online', handleVisibilityOrOnline);
      clearInterval(watchdogInterval);
    };
  }, [connect, user]);

  const subscribe = useCallback((eventType, callback) => {
    if (!listenersRef.current.has(eventType)) {
      listenersRef.current.set(eventType, new Set());
    }
    listenersRef.current.get(eventType).add(callback);

    if (eventSourceRef.current) {
      attachListener(eventSourceRef.current, eventType);
    }

    return () => {
      const set = listenersRef.current.get(eventType);
      if (set) {
        set.delete(callback);
        if (set.size === 0) {
          listenersRef.current.delete(eventType);
        }
      }
    };
  }, [attachListener]);

  return (
    <SSEContext.Provider value={{ subscribe }}>
      {children}
    </SSEContext.Provider>
  );
}

export function useLiveEvent(eventTypes, callback) {
  const context = useContext(SSEContext);
  const cbRef = useRef(callback);

  useEffect(() => {
    cbRef.current = callback;
  }, [callback]);

  const eventTypesKey = Array.isArray(eventTypes) ? eventTypes.join(',') : String(eventTypes || '');

  useEffect(() => {
    if (!context?.subscribe) return;
    const types = eventTypesKey.split(',').filter(Boolean);
    const unsubs = types.map((t) =>
      context.subscribe(t, (data) => {
        if (cbRef.current) cbRef.current(data);
      })
    );

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [context, eventTypesKey]);
}
