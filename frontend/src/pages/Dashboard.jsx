import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { API_URL } from '../utils/api';
import { useState, useEffect } from 'react';
import {
  OwnerDashboardView,
  AccountantDashboardView,
  AdminDashboardView,
  MarketingDashboardView,
  ProductionDashboardView
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

  // 1. Initial REST Dashboard Fetch (Immediate Data Load)
  useEffect(() => {
    let isMounted = true;
    const fetchDashboard = async () => {
      setDashboardLoading(true);
      try {
        const res = await fetch(`${API_URL}/analytics/dashboard?tenant=${tenant}`, {
          headers: { 'x-tenant': tenant },
          credentials: 'include'
        });
        const json = await res.json();
        if (isMounted && json.success && json.data) {
          setData(json.data);
        }
      } catch (err) {
        console.error('Error fetching dashboard REST analytics:', err);
      } finally {
        if (isMounted) setDashboardLoading(false);
      }
    };

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
  }, [tenant]);

  // Purchasing & Vendor Summary Data (only for roles that use it)
  useEffect(() => {
    const role = user?.role;
    if (role !== 'OWNER' && role !== 'ADMIN' && role !== 'ACCOUNTANT') {
      setSummaryLoading(false);
      return;
    }
    let isMounted = true;
    const fetchSummary = async () => {
      setSummaryLoading(true);
      try {
        const res = await fetch(`${API_URL}/analytics/purchasing-summary?tenant=${tenant}`, {
          headers: { 'x-tenant': tenant },
          credentials: 'include'
        });
        const json = await res.json();
        if (isMounted && json.success) setSummary(json.data);
      } catch (err) {
        console.error('Error fetching purchasing summary:', err);
      } finally {
        if (isMounted) setSummaryLoading(false);
      }
    };
    fetchSummary();

    return () => { isMounted = false; };
  }, [tenant, user?.role]);

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
    case 'OWNER':
    default:
      return <OwnerDashboardView data={data} summary={summary} summaryLoading={summaryLoading} loading={dashboardLoading} />;
  }
}
