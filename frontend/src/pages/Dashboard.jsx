import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { API_URL } from '../utils/api';
import { useState, useEffect, useCallback } from 'react';
import { useLiveEvent } from '../context/SSEContext';
import {
  OwnerDashboardView,
  AccountantDashboardView,
  AdminDashboardView,
  MarketingDashboardView,
  ProductionDashboardView,
  TransportDashboardView
} from '../components/dashboard';

export default function Dashboard() {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const [data, setData] = useState({
    sales: 0,
    cash: 0,
    expenses: 0,
    credit: 0,
    bottlesSold: 0,
    todaysPurchases: 0,
    todaysPurchasesCount: 0,
    monthlyPurchases: 0,
    pendingVendorPayables: 0,
    lowStockMaterialsCount: 0,
    lowStockMaterialsList: []
  });

  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/analytics/dashboard?tenant=${tenant}`, {
        headers: { 'x-tenant': tenant },
        credentials: 'include'
      });
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      }
    } catch (err) {
      console.error('Error fetching dashboard REST analytics:', err);
    } finally {
      setDashboardLoading(false);
    }
  }, [tenant]);

  const fetchSummary = useCallback(async () => {
    const role = user?.role;
    if (role !== 'OWNER' && role !== 'ADMIN' && role !== 'ACCOUNTANT') {
      setSummaryLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/analytics/purchasing-summary?tenant=${tenant}`, {
        headers: { 'x-tenant': tenant },
        credentials: 'include'
      });
      const json = await res.json();
      if (json.success) setSummary(json.data);
    } catch (err) {
      console.error('Error fetching purchasing summary:', err);
    } finally {
      setSummaryLoading(false);
    }
  }, [tenant, user?.role]);

  // 1. Initial REST Dashboard Fetch & Live SSE Stream
  useEffect(() => {
    let isMounted = true;
    fetchDashboard();

    // 2. Real-time Dashboard SSE Stream with tenant query param
    const sse = new EventSource(`${API_URL}/analytics/dashboard/stream?tenant=${tenant}`, {
      withCredentials: true
    });

    sse.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.success && parsed.data && isMounted) {
          setData(parsed.data);
        }
      } catch (err) {
        console.error('Failed to parse SSE data', err);
      }
    };

    sse.onerror = (err) => {
      console.error('SSE Error:', err);
    };

    return () => {
      isMounted = false;
      sse.close();
    };
  }, [tenant, fetchDashboard]);

  // Purchasing & Vendor Summary Data (only for roles that use it)
  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useLiveEvent([
    'ORDER_UPDATED',
    'COUNTER_SALE_CREATED',
    'PRODUCTION_UPDATED',
    'EXPENSE_LOGGED',
    'DAILY_CLOSE_CHANGED',
    'PURCHASE_CREATED',
    'INVENTORY_CHANGED'
  ], () => {
    fetchDashboard();
    fetchSummary();
  });

  const role = user?.role;

  // Role-Based Modular Dashboard Router
  switch (role) {
    case 'PRODUCTION_MANAGER':
      return <ProductionDashboardView />;
    case 'ACCOUNTANT':
      return <AccountantDashboardView data={data} summary={summary} summaryLoading={summaryLoading} loading={dashboardLoading} />;
    case 'ADMIN':
      return <AdminDashboardView data={data} summary={summary} summaryLoading={summaryLoading} loading={dashboardLoading} />;
    case 'MARKETING_MANAGER':
      return <MarketingDashboardView data={data} loading={dashboardLoading} />;
    case 'TRANSPORT_MANAGER':
      return <TransportDashboardView />;
    case 'OWNER':
    default:
      return <OwnerDashboardView data={data} summary={summary} summaryLoading={summaryLoading} loading={dashboardLoading} />;
  }
}
