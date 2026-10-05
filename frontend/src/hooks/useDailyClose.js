import { useState, useEffect, useCallback, useRef } from 'react';
import { useTenant } from '../context/TenantContext';
import { fetchDailyCloseStatus } from '../services/dailyCloseService';
import { toast } from 'sonner';
import { useLiveEvent } from '../context/SSEContext';

/**
 * React hook to manage daily close reconciliation and submission state.
 */
export function useDailyClose() {
  const { tenant } = useTenant();
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const isMountedRef = useRef(true);
  const requestSeqRef = useRef(0);
  const statusRef = useRef(null);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const refreshStatus = useCallback(async (showLoading = true) => {
    const currentSeq = ++requestSeqRef.current;
    if (showLoading && !statusRef.current) setLoading(true);

    const executeFetch = async (retryCount = 0) => {
      try {
        const json = await fetchDailyCloseStatus(date, tenant);
        if (isMountedRef.current && currentSeq === requestSeqRef.current) {
          if (json?.success) {
            setStatus(json.data);
          } else if (showLoading && !statusRef.current && retryCount === 0) {
            // Transient non-success on initial load: retry once silently
            await new Promise((resolve) => setTimeout(resolve, 600));
            return await executeFetch(1);
          }
        }
      } catch (err) {
        if (!isMountedRef.current || currentSeq !== requestSeqRef.current) return;
        if (err?.name === 'AbortError') return;

        // On transient network hitch, retry once silently before any toast
        if (showLoading && !statusRef.current && retryCount === 0) {
          await new Promise((resolve) => setTimeout(resolve, 600));
          return await executeFetch(1);
        }

        // Never show error toast on background SSE updates or if data is already visible
        if (showLoading && !statusRef.current) {
          toast.error('Failed to load daily close status');
        }
      } finally {
        if (isMountedRef.current && currentSeq === requestSeqRef.current && showLoading) {
          setLoading(false);
        }
      }
    };

    await executeFetch(0);
  }, [date, tenant]);

  useEffect(() => {
    refreshStatus(true);
  }, [refreshStatus]);

  useLiveEvent(
    ['DAILY_CLOSE_CHANGED', 'ORDER_UPDATED', 'COUNTER_SALE_CREATED', 'EXPENSE_LOGGED'],
    () => refreshStatus(false)
  );

  return {
    date,
    setDate,
    status,
    loading,
    refreshStatus,
    tenant,
    isClosed: Boolean(status?.adminConfirmed),
    pmConfirmed: Boolean(status?.pmConfirmed),
    mmConfirmed: Boolean(status?.mmConfirmed),
    tmConfirmed: Boolean(status?.tmConfirmed),
  };
}
