/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useRef } from 'react';
import { useTenant } from './TenantContext';
import { useAuth } from './AuthContext';
import { API_URL } from '../utils/api';

const SSEContext = createContext(null);

export function SSEProvider({ children }) {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const listenersRef = useRef(new Map());
  const eventSourceRef = useRef(null);

  useEffect(() => {
    if (!user) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    const currentTenant = tenant || 'aquasphere';
    const streamUrl = `${API_URL}/events/stream?tenant=${currentTenant}`;
    const sse = new EventSource(streamUrl, { withCredentials: true });
    eventSourceRef.current = sse;

    const dispatchEvent = (type, data) => {
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
    };

    const attachListener = (type) => {
      sse.addEventListener(type, (event) => {
        try {
          const parsed = event.data ? JSON.parse(event.data) : {};
          dispatchEvent(type, parsed);
        } catch (_err) {
          dispatchEvent(type, event.data);
        }
      });
    };

    const knownEvents = [
      'CONNECTED',
      'ORDER_UPDATED',
      'INVENTORY_CHANGED',
      'PRODUCTION_UPDATED',
      'COUNTER_SALE_CREATED',
      'CUSTOMER_UPDATED',
      'EXPENSE_LOGGED',
      'DAILY_CLOSE_CHANGED',
      'PURCHASE_CREATED',
      'VEHICLE_UPDATED'
    ];

    knownEvents.forEach(attachListener);

    sse.onmessage = (event) => {
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
      // EventSource automatically reconnects on error/disconnect
    };

    return () => {
      sse.close();
      eventSourceRef.current = null;
    };
  }, [tenant, user]);

  const subscribe = (eventType, callback) => {
    if (!listenersRef.current.has(eventType)) {
      listenersRef.current.set(eventType, new Set());
      if (eventSourceRef.current) {
        eventSourceRef.current.addEventListener(eventType, (event) => {
          try {
            const parsed = event.data ? JSON.parse(event.data) : {};
            const cbs = listenersRef.current.get(eventType);
            if (cbs) cbs.forEach((cb) => cb(parsed));
          } catch (_err) {
            const cbs = listenersRef.current.get(eventType);
            if (cbs) cbs.forEach((cb) => cb(event.data));
          }
        });
      }
    }
    listenersRef.current.get(eventType).add(callback);

    return () => {
      const set = listenersRef.current.get(eventType);
      if (set) {
        set.delete(callback);
        if (set.size === 0) {
          listenersRef.current.delete(eventType);
        }
      }
    };
  };

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
