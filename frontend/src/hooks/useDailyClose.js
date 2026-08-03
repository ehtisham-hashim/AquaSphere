import { useState, useEffect, useCallback } from 'react';
import { getCompanyFromCookie } from '../utils/companyCookie';
import { fetchDailyCloseStatus } from '../services/dailyCloseService';
import { toast } from 'sonner';

// ponytail: single hook replaces ~40 lines of duplicated state+fetch in every component
export function useDailyClose() {
  const tenant = getCompanyFromCookie();
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshStatus = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const json = await fetchDailyCloseStatus(date, tenant);
      if (json.success) setStatus(json.data);
    } catch {
      toast.error('Failed to load daily close status');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [date, tenant]);

  useEffect(() => { refreshStatus(); }, [refreshStatus]);

  return {
    date, setDate, status, loading, refreshStatus, tenant,
    isClosed: Boolean(status?.adminConfirmed),
    pmConfirmed: Boolean(status?.pmConfirmed),
    mmConfirmed: Boolean(status?.mmConfirmed),
  };
}
