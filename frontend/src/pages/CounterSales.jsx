import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Calendar } from 'lucide-react';
import { API_URL } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { getCompanyFromCookie } from '../utils/companyCookie';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';
import { 
  COUNTER_PRODUCTS, 
  calculateProductMetrics, 
  generateSaleNumber 
} from '../constants/counterSale';

import {
  CounterSalesHeader,
  CounterSalesStockBar,
  CounterSalesMetrics,
  LogCounterSaleForm,
  CounterSalesHistoryTable,
  ConfirmCounterSaleModal,
  CounterSaleReceiptModal
} from '../components/counterSales';

export default function CounterSales() {
  const { user } = useAuth();
  const isWadaana = getCompanyFromCookie() === 'wadaana';

  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);
  const [dailyCloses, setDailyCloses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('new-sale');
  const [submitting, setSubmitting] = useState(false);

  const [liveSaleNumber, setLiveSaleNumber] = useState(generateSaleNumber());
  const [liveDateTime, setLiveDateTime] = useState(new Date());

  const [selectedProductId, setSelectedProductId] = useState('PACK_05L');
  const [productQuantity, setProductQuantity] = useState('1');

  const [cashCollected, setCashCollected] = useState('360');
  const [creditAmount, setCreditAmount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [customerId, setCustomerId] = useState('');
  const [remarks, setRemarks] = useState('');

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [receiptSale, setReceiptSale] = useState(null);
  const [lastRecordedSale, setLastRecordedSale] = useState(null);

  const userRole = user?.role;
  const isOwner = userRole === 'OWNER';
  const isAdmin = userRole === 'ADMIN';
  const isAccountant = userRole === 'ACCOUNTANT';
  const isMM = userRole === 'MARKETING_MANAGER';
  const canCreate = isMM || isAccountant || isAdmin || isOwner;

  useEffect(() => {
    const timer = setInterval(() => setLiveDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [salesRes, customersRes, itemsRes, closesRes] = await Promise.all([
        fetch(`${API_URL}/spot-sales`, { credentials: 'include' }).catch(() => null),
        fetch(`${API_URL}/customers`, { credentials: 'include' }).catch(() => null),
        fetch(`${API_URL}/items`, { credentials: 'include' }).catch(() => null),
        fetch(`${API_URL}/daily-close/history`, { credentials: 'include' }).catch(() => null)
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
        if (iJson.success) setItems(iJson.data || []);
      }
      if (closesRes?.ok) {
        const dcJson = await closesRes.json();
        if (dcJson.success) setDailyCloses(dcJson.data || []);
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

  const handleProductOrQtyChange = (prodId, qtyStr) => {
    setSelectedProductId(prodId);
    setProductQuantity(qtyStr);
    const qty = parseFloat(qtyStr) || 1;
    const metrics = calculateProductMetrics(prodId, qty);
    setCashCollected(String(metrics.suggestedPrice));
  };

  const resetForm = () => {
    setSelectedProductId('PACK_05L');
    setProductQuantity('1');
    setCashCollected('360');
    setCreditAmount('0');
    setPaymentMethod('CASH');
    setCustomerId('');
    setRemarks('');
    setLiveSaleNumber(generateSaleNumber());
  };

  // Stock calculations
  const available05LPacks = useMemo(() => items
    .filter(i => (i.type === 'FINISHED_GOOD' || !i.type) && (i.name.toLowerCase().includes('0.5') || i.name.toLowerCase().includes('500')))
    .reduce((sum, i) => sum + Number(i.cachedQty || 0), 0), [items]);

  const available15LPacks = useMemo(() => items
    .filter(i => (i.type === 'FINISHED_GOOD' || !i.type) && (i.name.toLowerCase().includes('1.5') || i.name.toLowerCase().includes('1500')))
    .reduce((sum, i) => sum + Number(i.cachedQty || 0), 0), [items]);

  const available19LBottles = useMemo(() => items
    .filter(i => (i.type === 'FINISHED_GOOD' || !i.type) && (i.name.toLowerCase().includes('19')))
    .reduce((sum, i) => sum + Number(i.cachedQty || 0), 0), [items]);

  const full05L = Math.floor(Math.max(0, available05LPacks));
  const loose05L = Math.round((Math.max(0, available05LPacks) - full05L) * 12);
  const totalBottles05L = Math.round(Math.max(0, available05LPacks) * 12);

  const full15L = Math.floor(Math.max(0, available15LPacks));
  const loose15L = Math.round((Math.max(0, available15LPacks) - full15L) * 6);
  const totalBottles15L = Math.round(Math.max(0, available15LPacks) * 6);

  const getStockValidation = () => {
    const qty = parseFloat(productQuantity) || 0;
    if (qty <= 0) return { valid: false, message: 'Quantity must be greater than zero.' };

    switch (selectedProductId) {
      case 'PACK_05L': {
        const availablePacks = Math.floor(available05LPacks);
        if (qty > availablePacks) {
          return {
            valid: false,
            message: availablePacks === 0
              ? 'No 0.5L packs available.'
              : `Only ${availablePacks} pack${availablePacks === 1 ? '' : 's'} available.`
          };
        }
        return { valid: true };
      }
      case 'SINGLE_05L': {
        const availableBottles = totalBottles05L;
        if (qty > availableBottles) {
          return {
            valid: false,
            message: availableBottles === 0
              ? 'No 0.5L bottles available.'
              : `Only ${availableBottles} bottle${availableBottles === 1 ? '' : 's'} available.`
          };
        }
        return { valid: true };
      }
      case 'PACK_15L': {
        const availablePacks = Math.floor(available15LPacks);
        if (qty > availablePacks) {
          return {
            valid: false,
            message: availablePacks === 0
              ? 'No 1.5L packs available.'
              : `Only ${availablePacks} pack${availablePacks === 1 ? '' : 's'} available.`
          };
        }
        return { valid: true };
      }
      case 'SINGLE_15L': {
        const availableBottles = totalBottles15L;
        if (qty > availableBottles) {
          return {
            valid: false,
            message: availableBottles === 0
              ? 'No 1.5L bottles available.'
              : `Only ${availableBottles} bottle${availableBottles === 1 ? '' : 's'} available.`
          };
        }
        return { valid: true };
      }
      case 'BOTTLE_19L': {
        if (qty > available19LBottles) {
          return {
            valid: false,
            message: available19LBottles === 0
              ? 'No 19L bottles available.'
              : `Only ${available19LBottles} bottle${available19LBottles === 1 ? '' : 's'} available.`
          };
        }
        return { valid: true };
      }
      default:
        return { valid: true };
    }
  };

  const stockValidation = getStockValidation();
  const selectedCustomer = customers.find(c => c.id === customerId);
  const numericCredit = parseFloat(creditAmount || 0);
  const isCreditSale = numericCredit > 0;
  const customerBalance = selectedCustomer ? Number(selectedCustomer.currentBalance || 0) : 0;
  const customerLimit = selectedCustomer ? Number(selectedCustomer.creditLimit || 0) : 0;
  const projectedBalance = customerBalance + numericCredit;
  const isCreditLimitExceeded = isCreditSale && customerLimit > 0 && projectedBalance > customerLimit;

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!stockValidation.valid) {
      toast.error(stockValidation.message);
      return;
    }
    if (isCreditSale && !customerId) {
      toast.error('Customer profile selection is mandatory for Credit Sales!');
      return;
    }

    // For credit sales or limit warnings, show confirmation modal.
    // For standard cash sales, execute immediately for high-speed counter processing!
    if (isCreditSale || isCreditLimitExceeded) {
      setShowConfirmModal(true);
    } else {
      executeCreateSale();
    }
  };

  const executeCreateSale = async () => {
    setShowConfirmModal(false);
    setSubmitting(true);
    try {
      const cash = parseFloat(cashCollected || 0);
      const credit = parseFloat(creditAmount || 0);

      const res = await fetch(`${API_URL}/spot-sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productType: selectedProductId,
          productQty: parseFloat(productQuantity || 1),
          cashCollected: cash,
          creditAmount: credit,
          paymentMethod,
          customerId: credit > 0 ? customerId : (customerId || null),
          remarks
        }),
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
      resetForm();
      // Stay on 'new-sale' tab so cashier can do 100 sales back-to-back!
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
    if (!window.confirm(`Are you sure you want to delete sale ${sale.saleNumber || sale.id}?`)) return;

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
      toast.success('Sale record deleted successfully.');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete sale record');
    }
  };

  const filteredSales = useMemo(() => {
    return sales.filter(s => 
      (s.saleNumber && s.saleNumber.toLowerCase().includes(search.toLowerCase())) ||
      (s.productType && s.productType.toLowerCase().includes(search.toLowerCase())) ||
      (s.paymentMethod || 'CASH').toLowerCase().includes(search.toLowerCase()) || 
      (s.remarks && s.remarks.toLowerCase().includes(search.toLowerCase())) ||
      (s.customer?.name && s.customer.name.toLowerCase().includes(search.toLowerCase()))
    );
  }, [sales, search]);

  const handleExportCSV = () => {
    if (filteredSales.length === 0) return;
    const headers = ['Sale Number', 'Product Type', 'Qty', 'Date', 'Litres (L)', 'Caps', 'Cash (Rs)', 'Credit (Rs)', 'Total (Rs)', 'Payment Method', 'Customer', 'Remarks', 'Recorded By'];
    const rows = filteredSales.map(s => [
      `"${s.saleNumber || s.id.substring(0, 8)}"`,
      `"${s.productType || 'CUSTOM'}"`,
      s.productQty || 1,
      new Date(s.createdAt).toLocaleString(),
      s.litresSold,
      s.capsIssued,
      s.cashCollected,
      s.creditAmount || 0,
      Number(s.cashCollected || 0) + Number(s.creditAmount || 0),
      s.paymentMethod,
      `"${(s.customer?.name || 'Walk-In Cash Customer').replace(/"/g, '""')}"`,
      `"${(s.remarks || '').replace(/"/g, '""')}"`,
      `"${(s.createdBy?.name || user?.name || 'System').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Counter_Sales_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isDateClosed = (saleDateStr) => {
    const sDate = new Date(saleDateStr).toDateString();
    return dailyCloses.some(dc => new Date(dc.date).toDateString() === sDate && dc.adminConfirmed);
  };

  const todayStr = new Date().toDateString();
  const todaySales = sales.filter(s => new Date(s.createdAt).toDateString() === todayStr);
  const todayLitres = todaySales.reduce((sum, s) => sum + Number(s.litresSold || 0), 0);
  const todayCash = todaySales.reduce((sum, s) => sum + Number(s.cashCollected || 0), 0);
  const todayCredit = todaySales.reduce((sum, s) => sum + Number(s.creditAmount || 0), 0);
  const todayTotalRevenue = todayCash + todayCredit;

  if (isWadaana) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <CounterSalesHeader 
        onExportCSV={handleExportCSV} 
        hasSales={filteredSales.length > 0} 
      />

      <CounterSalesStockBar 
        full05L={full05L}
        loose05L={loose05L}
        totalBottles05L={totalBottles05L}
        full15L={full15L}
        loose15L={loose15L}
        totalBottles15L={totalBottles15L}
        available19LBottles={available19LBottles}
      />

      <CounterSalesMetrics 
        todayTotalRevenue={todayTotalRevenue}
        todayLitres={todayLitres}
        todayCash={todayCash}
        todayCredit={todayCredit}
      />

      {/* Tabs Bar */}
      <div className="flex overflow-x-auto hide-scrollbar border-b border-slate-200 gap-2">
        {canCreate && (
          <button
            onClick={() => setActiveTab('new-sale')}
            className={`whitespace-nowrap px-5 py-3 rounded-t-xl text-sm font-bold transition-all flex items-center gap-2 border-t border-x ${
              activeTab === 'new-sale'
                ? 'bg-white border-slate-200 text-emerald-700 border-b-2 border-b-emerald-600 shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Plus size={16} /> Log Retail Sale
          </button>
        )}

        <button
          onClick={() => setActiveTab('history')}
          className={`whitespace-nowrap px-5 py-3 rounded-t-xl text-sm font-bold transition-all flex items-center gap-2 border-t border-x ${
            activeTab === 'history'
              ? 'bg-white border-slate-200 text-emerald-700 border-b-2 border-b-emerald-600 shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Calendar size={16} /> Sales History ({sales.length})
        </button>
      </div>

      {activeTab === 'new-sale' && canCreate && (
        <LogCounterSaleForm 
          liveSaleNumber={liveSaleNumber}
          user={user}
          liveDateTime={liveDateTime}
          selectedProductId={selectedProductId}
          productQuantity={productQuantity}
          handleProductOrQtyChange={handleProductOrQtyChange}
          available19LBottles={available19LBottles}
          available05LPacks={available05LPacks}
          loose05L={loose05L}
          totalBottles05L={totalBottles05L}
          available15LPacks={available15LPacks}
          loose15L={loose15L}
          totalBottles15L={totalBottles15L}
          stockValidation={stockValidation}
          cashCollected={cashCollected}
          setCashCollected={setCashCollected}
          creditAmount={creditAmount}
          setCreditAmount={setCreditAmount}
          isCreditSale={isCreditSale}
          customerId={customerId}
          setCustomerId={setCustomerId}
          customers={customers}
          isCreditLimitExceeded={isCreditLimitExceeded}
          numericCredit={numericCredit}
          projectedBalance={projectedBalance}
          customerLimit={customerLimit}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          remarks={remarks}
          setRemarks={setRemarks}
          handleFormSubmit={handleFormSubmit}
          submitting={submitting}
          lastRecordedSale={lastRecordedSale}
          onPrintReceipt={setReceiptSale}
        />
      )}

      {activeTab === 'history' && (
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
      )}

      <ConfirmCounterSaleModal 
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={executeCreateSale}
        liveSaleNumber={liveSaleNumber}
        selectedProductId={selectedProductId}
        productQuantity={productQuantity}
        cashCollected={cashCollected}
        numericCredit={numericCredit}
        user={user}
      />

      <CounterSaleReceiptModal 
        receiptSale={receiptSale}
        onClose={() => setReceiptSale(null)}
        user={user}
      />
    </div>
  );
}
