import { useAuth } from '../context/AuthContext';
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

  // Real-time Dashboard SSE Stream
  useEffect(() => {
    const sse = new EventSource(`${API_URL}/analytics/dashboard/stream`, {
      withCredentials: true
    });

    sse.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.success) setData(parsed.data);
      } catch (err) {
        console.error('Failed to parse SSE data', err);
      }
    };

    sse.onerror = (err) => {
      console.error('SSE Error:', err);
    };

    return () => sse.close();
  }, []);

  // Purchasing & Vendor Summary Data
  useEffect(() => {
    const fetchSummary = async () => {
      setSummaryLoading(true);
      try {
        const res = await fetch(`${API_URL}/analytics/purchasing-summary`, { credentials: 'include' });
        const json = await res.json();
        if (json.success) setSummary(json.data);
      } catch (err) {
        console.error('Error fetching purchasing summary:', err);
      } finally {
        setSummaryLoading(false);
      }
    };
    fetchSummary();
  }, []);

  const role = user?.role;

  // Role-Based Modular Dashboard Router
  switch (role) {
    case 'PRODUCTION_MANAGER':
      return <ProductionDashboardView />;
    case 'ACCOUNTANT':
      return <AccountantDashboardView data={data} summary={summary} summaryLoading={summaryLoading} />;
    case 'ADMIN':
      return <AdminDashboardView data={data} summary={summary} summaryLoading={summaryLoading} />;
    case 'MARKETING_MANAGER':
      return <MarketingDashboardView data={data} />;
    case 'OWNER':
    default:
      return <OwnerDashboardView data={data} summary={summary} summaryLoading={summaryLoading} />;
  }
}
