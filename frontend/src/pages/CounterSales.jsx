import { useState, useEffect, useMemo, useCallback } from 'react';
import { API_URL } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';
import { generateSaleNumber } from '../constants/counterSale';

import {
  CounterSalesHeader,
  CounterSalesStockBar,
  CounterSalesMetrics,
  LogCounterSaleForm,
  CounterSalesHistoryTable,
  CounterSaleReceiptModal
} from '../components/counterSales';

export default function CounterSales() {
  const { user } = useAuth();
  const { isWadaana } = useTenant();

  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [finishedGoods, setFinishedGoods] = useState([]);
  const [dailyCloses, setDailyCloses] = useState([]);
  const [todaySummary, setTodaySummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const userRole = user?.role;
  const isOwner = userRole === 'OWNER';
  const canCreate = ['OWNER', 'ADMIN', 'ACCOUNTANT', 'MARKETING_MANAGER'].includes(userRole);

  const [submitting, setSubmitting] = useState(false);

  const [liveSaleNumber, setLiveSaleNumber] = useState(generateSaleNumber());
  const [liveDateTime, setLiveDateTime] = useState(new Date());

  const [receiptSale, setReceiptSale] = useState(null);
  const [lastRecordedSale, setLastRecordedSale] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setLiveDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [salesRes, customersRes, itemsRes, closesRes, summaryRes] = await Promise.all([
        fetch(`${API_URL}/spot-sales`, { credentials: 'include' }).catch(() => null),
        fetch(`${API_URL}/customers`, { credentials: 'include' }).catch(() => null),
        fetch(`${API_URL}/items?type=FINISHED_GOOD`, { credentials: 'include' }).catch(() => null),
        fetch(`${API_URL}/daily-close/history`, { credentials: 'include' }).catch(() => null),
        fetch(`${API_URL}/spot-sales/summary/today`, { credentials: 'include' }).catch(() => null)
      ]);

      if (salesRes?.ok) {
        const sJson = await salesRes.json();
        if (sJson.success) setSales(sJson.data || []);
      }
      if (customersRes?.ok) {
        const cJson = await customersRes.json();
        if (cJson.success) setCustomers(cJson.data || []);
      }
      if (itemsRes?.ok) {
        const iJson = await itemsRes.json();
        if (iJson.success) setFinishedGoods(iJson.data || []);
      }
      if (closesRes?.ok) {
        const dcJson = await closesRes.json();
        if (dcJson.success) setDailyCloses(dcJson.data || []);
      }
      if (summaryRes?.ok) {
        const sumJson = await summaryRes.json();
        if (sumJson.success) setTodaySummary(sumJson.data);
      }
    } catch (err) {
      console.error('Error fetching counter sales:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { 
    fetchData(); 
  }, [fetchData]);

  const handleMultiItemSubmit = async (payload) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/spot-sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include'
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.message || 'Failed to record sale');
        return;
      }
      
      const createdSale = json.data;
      toast.success(`Counter sale ${createdSale?.saleNumber || liveSaleNumber} recorded!`);
      
      setLastRecordedSale(createdSale);
      setLiveSaleNumber(generateSaleNumber());
      fetchData();
    } catch (err) {
      toast.error('Error recording sale');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSale = async (sale) => {
    if (!isOwner) {
      toast.error('Only Owner can delete counter sales.');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete sale ${sale.saleNumber || sale.id}? Finished goods stock and customer debt will be restored.`)) return;

    try {
      const res = await fetch(`${API_URL}/spot-sales/${sale.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.message || 'Failed to delete sale');
        return;
      }
      toast.success('Sale deleted and inventory stock restored.');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete sale record');
    }
  };

  const filteredSales = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return sales;
    return sales.filter(s => 
      (s.saleNumber && s.saleNumber.toLowerCase().includes(q)) ||
      (s.productType && s.productType.toLowerCase().includes(q)) ||
      (Array.isArray(s.items) && s.items.some(i => (i.item?.name || '').toLowerCase().includes(q))) ||
      (s.paymentMethod || 'CASH').toLowerCase().includes(q) || 
      (s.remarks && s.remarks.toLowerCase().includes(q)) ||
      (s.customer?.name && s.customer.name.toLowerCase().includes(q)) ||
      (s.createdBy?.name && s.createdBy.name.toLowerCase().includes(q))
    );
  }, [sales, search]);

  const handleExportCSV = () => {
    if (filteredSales.length === 0) return;
    const headers = ['Sale Number', 'Items Sold', 'Qty', 'Date', 'Litres (L)', 'Total Bill (Rs)', 'Amount Paid (Rs)', 'Customer Debt (Rs)', 'Payment Method', 'Customer', 'Remarks', 'Recorded By'];
    const rows = filteredSales.map(s => [
      `"${s.saleNumber || s.id.substring(0, 8)}"`,
      `"${(s.productType || 'Retail Sale').replace(/"/g, '""')}"`,
      s.productQty || 1,
      `"${new Date(s.createdAt).toLocaleString().replace(/"/g, '""')}"`,
      s.litresSold || 0,
      Number(s.totalAmount ?? (Number(s.cashCollected || 0) + Number(s.creditAmount || 0))),
      Number(s.amountPaid ?? Number(s.cashCollected || 0)),
      Number(s.debtAmount ?? Number(s.creditAmount || 0)),
      `"${s.paymentMethod || 'CASH'}"`,
      `"${(s.customer?.name || 'Walk-In Cash Customer').replace(/"/g, '""')}"`,
      `"${(s.remarks || '').replace(/"/g, '""')}"`,
      `"${(s.createdBy?.name || 'Staff').replace(/"/g, '""')}"`
    ]);

    const csvString = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Counter_Sales_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const isDateClosed = (saleDateStr) => {
    const sDate = new Date(saleDateStr).toDateString();
    return dailyCloses.some(dc => new Date(dc.date).toDateString() === sDate && dc.adminConfirmed);
  };

  // Metrics from dedicated summary endpoint or fallback
  const todayRevenue = todaySummary?.todayRevenue ?? 0;
  const todayLitres = todaySummary?.todayLitres ?? 0;
  const todayPaid = todaySummary?.todayPaid ?? 0;
  const todayDebt = todaySummary?.todayDebt ?? 0;

  if (isWadaana) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-4">
      <CounterSalesHeader 
        onExportCSV={handleExportCSV} 
        hasSales={filteredSales.length > 0} 
      />

      {/* Horizontal Finished Goods Stock Wrapper */}
      <CounterSalesStockBar items={finishedGoods} loading={loading} />

      {/* Realtime Counter Metrics */}
      <CounterSalesMetrics 
        todayTotalRevenue={todayRevenue}
        todayLitres={todayLitres}
        todayCash={todayPaid}
        todayCredit={todayDebt}
        loading={loading}
      />

      {/* POS Quick Sale Terminal */}
      {canCreate && (
        <LogCounterSaleForm 
          liveSaleNumber={liveSaleNumber}
          user={user}
          liveDateTime={liveDateTime}
          finishedGoods={finishedGoods}
          customers={customers}
          handleMultiItemSubmit={handleMultiItemSubmit}
          submitting={submitting}
          lastRecordedSale={lastRecordedSale}
          onPrintReceipt={setReceiptSale}
          loading={loading}
        />
      )}

      {/* Counter Sales History & Audit Trail Directly Below */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between px-1">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Counter Sales History</h3>
            <p className="text-xs text-slate-400">Audit trail of all spot sales and walk-in counter dispatches</p>
          </div>
          <span className="text-xs font-semibold text-slate-600 bg-white px-2.5 py-1 rounded-full border border-slate-200 shadow-2xs font-mono">
            Total Records: <strong className="text-slate-900">{sales.length}</strong>
          </span>
        </div>

        <CounterSalesHistoryTable 
          search={search}
          setSearch={setSearch}
          loading={loading}
          filteredSales={filteredSales}
          isDateClosed={isDateClosed}
          isOwner={isOwner}
          onPrintReceipt={setReceiptSale}
          onDeleteSale={handleDeleteSale}
          userName={user?.name}
        />
      </div>

      <CounterSaleReceiptModal 
        receiptSale={receiptSale}
        onClose={() => setReceiptSale(null)}
        user={user}
      />
    </div>
  );
}
