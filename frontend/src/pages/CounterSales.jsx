import { useState, useEffect } from 'react';
import { 
  Plus, Search, DollarSign, Calendar, Droplets, 
  Download, CheckCircle2, User, Loader2,
  Printer, ShieldAlert, AlertTriangle, Trash2, X, Package, ShoppingBag
} from 'lucide-react';
import { API_URL } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { getCompanyFromCookie } from '../utils/companyCookie';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';
import { 
  COUNTER_SALE_DEFAULTS, 
  COUNTER_PRODUCTS,
  PAYMENT_METHODS, 
  calculateProductMetrics, 
  generateSaleNumber 
} from '../constants/counterSale';

export default function CounterSales() {
  const { user } = useAuth();
  const isWadaana = getCompanyFromCookie() === 'wadaana';

  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);
  const [dailyCloses, setDailyCloses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('new-sale'); // 'new-sale', 'history', 'reports'
  const [submitting, setSubmitting] = useState(false);

  // Auto Generated Live Sale ID & Date
  const [liveSaleNumber, setLiveSaleNumber] = useState(generateSaleNumber());
  const [liveDateTime, setLiveDateTime] = useState(new Date());

  // Form Product State
  const [selectedProductId, setSelectedProductId] = useState('PACK_05L');
  const [productQuantity, setProductQuantity] = useState('1');

  // Form State
  const [cashCollected, setCashCollected] = useState('360');
  const [creditAmount, setCreditAmount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [customerId, setCustomerId] = useState('');
  const [remarks, setRemarks] = useState('');

  // Modals
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [receiptSale, setReceiptSale] = useState(null);

  // Role Permissions
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

  const fetchData = async () => {
    setLoading(true);
    try {
      const [salesRes, customersRes, itemsRes, closesRes] = await Promise.all([
        fetch(`${API_URL}/spot-sales`, { credentials: 'include' }).catch(() => null),
        fetch(`${API_URL}/customers`, { credentials: 'include' }).catch(() => null),
        fetch(`${API_URL}/items`, { credentials: 'include' }).catch(() => null),
        fetch(`${API_URL}/daily-close/history`, { credentials: 'include' }).catch(() => null)
      ]);

      if (salesRes && salesRes.ok) {
        const sJson = await salesRes.json();
        if (sJson.success) setSales(sJson.data || []);
      }
      if (customersRes && customersRes.ok) {
        const cJson = await customersRes.json();
        if (cJson.success) setCustomers(cJson.data || []);
      }
      if (itemsRes && itemsRes.ok) {
        const iJson = await itemsRes.json();
        if (iJson.success) setItems(iJson.data || []);
      }
      if (closesRes && closesRes.ok) {
        const dcJson = await closesRes.json();
        if (dcJson.success) setDailyCloses(dcJson.data || []);
      }
    } catch (err) {
      console.error('Error in CounterSales fetchData:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchData(); 
  }, []);

  // Update calculated price whenever Product or Quantity changes
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

  // Stock items lookup - sum across all matching items per category
  const available05LPacks = items
    .filter(i => (i.type === 'FINISHED_GOOD' || !i.type) && (i.name.toLowerCase().includes('0.5') || i.name.toLowerCase().includes('500')))
    .reduce((sum, i) => sum + Number(i.cachedQty || 0), 0);

  const available15LPacks = items
    .filter(i => (i.type === 'FINISHED_GOOD' || !i.type) && (i.name.toLowerCase().includes('1.5') || i.name.toLowerCase().includes('1500')))
    .reduce((sum, i) => sum + Number(i.cachedQty || 0), 0);

  const available19LBottles = items
    .filter(i => (i.type === 'FINISHED_GOOD' || !i.type) && (i.name.toLowerCase().includes('19')))
    .reduce((sum, i) => sum + Number(i.cachedQty || 0), 0);

  const full05L = Math.floor(Math.max(0, available05LPacks));
  const loose05L = Math.round((Math.max(0, available05LPacks) - full05L) * 12);
  const totalBottles05L = Math.round(Math.max(0, available05LPacks) * 12);

  const full15L = Math.floor(Math.max(0, available15LPacks));
  const loose15L = Math.round((Math.max(0, available15LPacks) - full15L) * 6);
  const totalBottles15L = Math.round(Math.max(0, available15LPacks) * 6);

  // Stock Validation
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
              ? 'No 0.5L packs available. Cannot record this sale.'
              : `Only ${availablePacks} pack${availablePacks === 1 ? '' : 's'} available. Cannot record this sale.`
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
              ? 'No 0.5L bottles available. Cannot record this sale.'
              : `Only ${availableBottles} bottle${availableBottles === 1 ? '' : 's'} available. Cannot record this sale.`
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
              ? 'No 1.5L packs available. Cannot record this sale.'
              : `Only ${availablePacks} pack${availablePacks === 1 ? '' : 's'} available. Cannot record this sale.`
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
              ? 'No 1.5L bottles available. Cannot record this sale.'
              : `Only ${availableBottles} bottle${availableBottles === 1 ? '' : 's'} available. Cannot record this sale.`
          };
        }
        return { valid: true };
      }
      case 'BOTTLE_19L': {
        if (qty > available19LBottles) {
          return {
            valid: false,
            message: available19LBottles === 0
              ? 'No 19L bottles available. Cannot record this sale.'
              : `Only ${available19LBottles} bottle${available19LBottles === 1 ? '' : 's'} available. Cannot record this sale.`
          };
        }
        return { valid: true };
      }
      default:
        return { valid: true }; // CUSTOM has no stock check
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

    setShowConfirmModal(true);
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
      toast.success(`Counter sale ${json.data?.saleNumber || liveSaleNumber} recorded successfully!`);
      
      setReceiptSale(json.data);
      resetForm();
      setActiveTab('history');
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

  const filteredSales = sales.filter(s => 
    (s.saleNumber && s.saleNumber.toLowerCase().includes(search.toLowerCase())) ||
    (s.productType && s.productType.toLowerCase().includes(search.toLowerCase())) ||
    (s.paymentMethod || 'CASH').toLowerCase().includes(search.toLowerCase()) || 
    (s.remarks && s.remarks.toLowerCase().includes(search.toLowerCase())) ||
    (s.customer?.name && s.customer.name.toLowerCase().includes(search.toLowerCase()))
  );

  const now = new Date();
  const todayStr = now.toDateString();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const todaySales = sales.filter(s => new Date(s.createdAt).toDateString() === todayStr);
  const todayLitres = todaySales.reduce((sum, s) => sum + Number(s.litresSold || 0), 0);
  const todayCash = todaySales.reduce((sum, s) => sum + Number(s.cashCollected || 0), 0);
  const todayCredit = todaySales.reduce((sum, s) => sum + Number(s.creditAmount || 0), 0);
  const todayTotalRevenue = todayCash + todayCredit;

  const weekRevenue = sales
    .filter(s => new Date(s.createdAt) >= startOfWeek)
    .reduce((sum, s) => sum + Number(s.cashCollected || 0) + Number(s.creditAmount || 0), 0);

  const monthRevenue = sales
    .filter(s => new Date(s.createdAt) >= startOfMonth)
    .reduce((sum, s) => sum + Number(s.cashCollected || 0) + Number(s.creditAmount || 0), 0);

  const totalLitresSold = sales.reduce((sum, s) => sum + Number(s.litresSold || 0), 0);

  if (isWadaana) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              RETAIL & COUNTER DISPATCH
            </span>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mt-1">Retail Spot & Counter Sales</h2>
          <p className="text-slate-500 text-sm">Sell finished goods (Packs & Loose Bottles) with automatic stock deductions & open-pack leftovers</p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportCSV}
            disabled={filteredSales.length === 0}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
          >
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      {/* Finished Goods Live Inventory Stock Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900 text-white p-4 rounded-2xl shadow-md border border-slate-800">
        <div className="space-y-0.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
            <Package size={13}/> 0.5L Finished Packs
          </span>
          <div className="text-lg font-black">
            {full05L.toLocaleString()} Packs {loose05L > 0 && <span className="text-xs text-emerald-300 font-bold">+ {loose05L} loose</span>}
          </div>
          <span className="text-[10px] text-slate-400">Total: {totalBottles05L.toLocaleString()} Bottles (12/pack)</span>
        </div>

        <div className="space-y-0.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1">
            <Package size={13}/> 1.5L Finished Packs
          </span>
          <div className="text-lg font-black">
            {full15L.toLocaleString()} Packs {loose15L > 0 && <span className="text-xs text-purple-300 font-bold">+ {loose15L} loose</span>}
          </div>
          <span className="text-[10px] text-slate-400">Total: {totalBottles15L.toLocaleString()} Bottles (6/pack)</span>
        </div>

        <div className="space-y-0.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1">
            <Droplets size={13}/> 19L Refill Bottles
          </span>
          <div className="text-lg font-black">{available19LBottles.toLocaleString()} Bottles</div>
          <span className="text-[10px] text-slate-400">24L water per refill bottle</span>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Today's Counter Sales</span>
          <div className="text-xl font-black text-emerald-700">Rs. {todayTotalRevenue.toLocaleString()}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Today's Litres</span>
          <div className="text-xl font-black text-blue-900">{todayLitres.toLocaleString()} L</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Cash Collected</span>
          <div className="text-xl font-black text-emerald-600">Rs. {todayCash.toLocaleString()}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Credit Outstanding</span>
          <div className="text-xl font-black text-purple-900">Rs. {todayCredit.toLocaleString()}</div>
        </div>
      </div>

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

      {/* TAB 1: NEW RETAIL SALE FORM */}
      {activeTab === 'new-sale' && canCreate && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm w-full space-y-5">
          {/* Automatic Meta Controls Header */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <div>
              <span className="text-slate-400 font-bold uppercase tracking-wider block">1. Sale Number (Auto)</span>
              <span className="font-mono font-black text-emerald-800 text-sm">{liveSaleNumber}</span>
            </div>
            <div>
              <span className="text-slate-400 font-bold uppercase tracking-wider block">2. Recorded By (Auto)</span>
              <span className="font-bold text-slate-800 text-sm">
                {user?.role?.replace('_', ' ')} ({user?.name || 'User'})
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-bold uppercase tracking-wider block">3. Date & Time (Auto)</span>
              <span className="font-semibold text-slate-700 text-sm">
                {liveDateTime.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} at {liveDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

          {/* Product Selection Catalog Grid */}
          <div>
            <label className="block font-bold text-slate-800 mb-2 text-sm">Select Retail Product *</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {COUNTER_PRODUCTS.map(prod => {
                const isSelected = selectedProductId === prod.id;
                return (
                  <button
                    type="button"
                    key={prod.id}
                    onClick={() => handleProductOrQtyChange(prod.id, productQuantity)}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      isSelected 
                        ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-950 font-bold shadow-sm' 
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs uppercase font-extrabold tracking-wider text-slate-400">{prod.category}</span>
                      <span className="text-xs font-black text-emerald-700">Rs. {prod.defaultPrice} / {prod.isSingleBottle ? 'bottle' : prod.unitLabel}</span>
                    </div>
                    <div className="text-sm font-bold text-slate-900">{prod.name}</div>
                    <p className="text-[11px] text-slate-500 mt-1">{prod.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Available Stock Panel */}
          {selectedProductId !== 'CUSTOM' && (
            <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 text-white">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-3">
                Available Stock
              </span>
              <div className="grid grid-cols-3 gap-3 text-center">
                {(selectedProductId === 'BOTTLE_19L') && (
                  <div className="bg-slate-800/60 rounded-lg p-3">
                    <div className={`text-xl font-black ${available19LBottles === 0 ? 'text-red-400' : 'text-blue-300'}`}>
                      {available19LBottles.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-400 font-semibold mt-0.5">19L Bottles</div>
                  </div>
                )}
                {(selectedProductId === 'PACK_05L' || selectedProductId === 'SINGLE_05L') && (
                  <>
                    <div className="bg-slate-800/60 rounded-lg p-3">
                      <div className={`text-xl font-black ${Math.floor(available05LPacks) === 0 ? 'text-red-400' : 'text-emerald-300'}`}>
                        {Math.floor(available05LPacks).toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold mt-0.5">0.5L Packs</div>
                    </div>
                    <div className="bg-slate-800/60 rounded-lg p-3">
                      <div className={`text-xl font-black ${loose05L === 0 ? 'text-slate-500' : 'text-emerald-200'}`}>
                        {loose05L.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold mt-0.5">Loose 0.5L</div>
                    </div>
                    <div className="bg-slate-800/60 rounded-lg p-3">
                      <div className={`text-xl font-black ${totalBottles05L === 0 ? 'text-red-400' : 'text-white'}`}>
                        {totalBottles05L.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold mt-0.5">Total Bottles</div>
                    </div>
                  </>
                )}
                {(selectedProductId === 'PACK_15L' || selectedProductId === 'SINGLE_15L') && (
                  <>
                    <div className="bg-slate-800/60 rounded-lg p-3">
                      <div className={`text-xl font-black ${Math.floor(available15LPacks) === 0 ? 'text-red-400' : 'text-purple-300'}`}>
                        {Math.floor(available15LPacks).toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold mt-0.5">1.5L Packs</div>
                    </div>
                    <div className="bg-slate-800/60 rounded-lg p-3">
                      <div className={`text-xl font-black ${loose15L === 0 ? 'text-slate-500' : 'text-purple-200'}`}>
                        {loose15L.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold mt-0.5">Loose 1.5L</div>
                    </div>
                    <div className="bg-slate-800/60 rounded-lg p-3">
                      <div className={`text-xl font-black ${totalBottles15L === 0 ? 'text-red-400' : 'text-white'}`}>
                        {totalBottles15L.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold mt-0.5">Total Bottles</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-4 text-sm">
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5 text-sm">
                Quantity ({COUNTER_PRODUCTS.find(p => p.id === selectedProductId)?.unitLabel || 'Units'}) *
              </label>
              <input 
                type="number" 
                step="1"
                min="1"
                className={`w-full border rounded-xl p-3 font-bold text-slate-800 outline-none transition-all shadow-sm focus:ring-4 ${
                  !stockValidation.valid
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10 bg-red-50/30'
                    : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/10'
                }`}
                value={productQuantity} 
                onChange={(e) => handleProductOrQtyChange(selectedProductId, e.target.value)} 
                required 
              />
              {!stockValidation.valid && (
                <div className="mt-2 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700">
                  <ShoppingBag size={15} className="shrink-0 text-red-500" />
                  <span className="text-xs font-bold">{stockValidation.message}</span>
                </div>
              )}
            </div>

            {/* Auto-Calculated Total */}
            {selectedProductId !== 'CUSTOM' && (() => {
              const prod = COUNTER_PRODUCTS.find(p => p.id === selectedProductId);
              const qty = parseFloat(productQuantity) || 0;
              const unitPrice = prod?.defaultPrice || 0;
              const total = qty * unitPrice;
              return (
                <div className="grid grid-cols-3 gap-3 p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl text-center">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Unit Price</span>
                    <span className="text-base font-black text-slate-800">Rs. {unitPrice.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Quantity</span>
                    <span className="text-base font-black text-slate-800">{qty > 0 ? qty.toLocaleString() : '—'}</span>
                  </div>
                  <div className="bg-emerald-600 rounded-lg p-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-100 block mb-1">Total</span>
                    <span className="text-base font-black text-white">Rs. {total.toLocaleString()}</span>
                  </div>
                </div>
              );
            })()}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5 text-sm">Cash Collected (Rs)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-600" size={18}/>
                  <input 
                    type="number" 
                    step="1" 
                    min="0"
                    className="w-full border border-slate-200 rounded-xl py-3 pl-10 pr-4 font-bold text-emerald-800 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-sm" 
                    value={cashCollected} 
                    onChange={(e) => setCashCollected(e.target.value)} 
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5 text-sm">Credit Amount (Rs)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-600" size={18}/>
                  <input 
                    type="number" 
                    step="1" 
                    min="0"
                    className={`w-full border rounded-xl py-3 pl-10 pr-4 font-bold text-purple-900 outline-none focus:ring-4 transition-all shadow-sm ${
                      isCreditSale && !customerId
                        ? 'border-orange-400 focus:border-orange-500 focus:ring-orange-500/10 bg-orange-50/30'
                        : 'border-slate-200 focus:border-purple-500 focus:ring-purple-500/10'
                    }`}
                    value={creditAmount} 
                    onChange={(e) => setCreditAmount(e.target.value)} 
                    placeholder="0"
                  />
                </div>
                {isCreditSale && !customerId && (
                  <div className="mt-2 flex items-center gap-2 p-2.5 bg-orange-50 border border-orange-200 rounded-lg">
                    <User size={13} className="shrink-0 text-orange-600" />
                    <span className="text-xs font-bold text-orange-700">Customer selection required — anonymous credit sales are not allowed</span>
                  </div>
                )}
              </div>
            </div>

            {/* Sale Type Indicator */}
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-xs font-bold transition-all ${
              isCreditSale
                ? 'bg-purple-50 border-purple-200 text-purple-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}>
              <div className={`w-2 h-2 rounded-full shrink-0 ${isCreditSale ? 'bg-purple-500' : 'bg-emerald-500'}`} />
              {isCreditSale ? (
                <span>
                  Credit Sale — Customer selection is <span className="underline underline-offset-2">mandatory</span>
                </span>
              ) : (
                <span>
                  Cash Sale — Customer is optional (Walk-In accepted)
                </span>
              )}
            </div>

            {/* Customer Profile & Credit Warning */}
            <div className={`p-4 rounded-xl border transition-all ${isCreditSale ? 'bg-purple-50/60 border-purple-200' : 'bg-slate-50 border-slate-200'}`}>
              <label className="block font-bold text-slate-800 mb-1.5 text-sm flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <User size={16} className={isCreditSale ? 'text-purple-700' : 'text-slate-500'} />
                  Customer Profile {isCreditSale ? <span className="text-purple-700 font-extrabold">* MANDATORY FOR CREDIT</span> : '(Optional for Cash)'}
                </span>
              </label>

              <select
                className={`w-full border rounded-xl p-3 bg-white font-semibold outline-none transition-all shadow-sm ${
                  isCreditSale ? 'border-purple-300 focus:border-purple-600 focus:ring-4 focus:ring-purple-500/10 text-purple-950' : 'border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 text-slate-800'
                }`}
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                required={isCreditSale}
              >
                <option value="">-- {isCreditSale ? 'Select Mandatory Customer for Credit' : 'Walk-In Cash Customer (No profile required)'} --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone}) — Balance: Rs {Number(c.currentBalance || 0).toLocaleString()} / Limit: Rs {Number(c.creditLimit || 0).toLocaleString()}
                  </option>
                ))}
              </select>

              {isCreditLimitExceeded && (
                <div className="mt-2.5 p-3 bg-amber-50 border border-amber-300 rounded-lg flex items-start gap-2 text-amber-900 text-xs font-semibold">
                  <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5"/>
                  <div>
                    <strong className="block font-bold text-amber-950">Credit Limit Warning!</strong>
                    Adding Rs. {numericCredit.toLocaleString()} credit will increase customer balance to 
                    <span className="font-extrabold text-red-700"> Rs. {projectedBalance.toLocaleString()}</span>, exceeding their credit limit of 
                    <span className="font-bold"> Rs. {customerLimit.toLocaleString()}</span>.
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5 text-sm">Payment Method *</label>
                <select
                  className="w-full border border-slate-200 rounded-xl p-3 bg-white font-semibold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-sm"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  {PAYMENT_METHODS.map(m => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5 text-sm">Remarks / Notes</label>
                <input 
                  type="text" 
                  className="w-full border border-slate-200 rounded-xl p-3 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-sm" 
                  value={remarks} 
                  onChange={(e) => setRemarks(e.target.value)} 
                  placeholder="Optional retail notes..."
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button 
                type="submit" 
                disabled={submitting || (isCreditSale && !customerId) || !stockValidation.valid}
                className="w-full sm:w-auto px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                Record Retail Counter Sale
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: HISTORY TAB */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
            <input 
              type="search" 
              placeholder="Search by sale number, product, customer name, or remarks..." 
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Sale ID</th>
                    <th className="p-4">Product Type</th>
                    <th className="p-4">Date & Time</th>
                    <th className="p-4">Litres (L)</th>
                    <th className="p-4">Cash</th>
                    <th className="p-4">Credit</th>
                    <th className="p-4">Total Amount</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Recorded By</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan="10" className="p-10 text-center text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                        Loading counter sales history...
                      </td>
                    </tr>
                  ) : filteredSales.map(sale => {
                    const cash = Number(sale.cashCollected || 0);
                    const credit = Number(sale.creditAmount || 0);
                    const total = cash + credit;
                    const dailyClosed = isDateClosed(sale.createdAt);

                    return (
                      <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4 font-mono font-black text-emerald-800 text-xs">
                          {sale.saleNumber || sale.id.substring(0, 8)}
                        </td>
                        <td className="p-4">
                          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-md text-xs font-bold">
                            {sale.productType || 'CUSTOM'} x {sale.productQty || 1}
                          </span>
                        </td>
                        <td className="p-4 text-slate-600 text-xs font-medium">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={14} className="text-slate-400"/>
                            {new Date(sale.createdAt).toLocaleDateString()} {new Date(sale.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>
                        </td>
                        <td className="p-4 text-blue-900 font-extrabold">{sale.litresSold} L</td>
                        <td className="p-4 text-emerald-700 font-bold">Rs. {cash.toLocaleString()}</td>
                        <td className="p-4 text-purple-900 font-bold">Rs. {credit.toLocaleString()}</td>
                        <td className="p-4 text-slate-900 font-black">Rs. {total.toLocaleString()}</td>
                        <td className="p-4 text-xs font-semibold text-slate-800">
                          {sale.customer ? (
                            <span className="text-purple-800 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-full">
                              {sale.customer.name}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal">Walk-In Cash</span>
                          )}
                        </td>
                        <td className="p-4 text-xs text-slate-600 font-medium">
                          {sale.createdBy?.name || user?.name || 'System'} ({sale.createdBy?.role || 'MM'})
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setReceiptSale(sale)}
                              title="Print Receipt"
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                            >
                              <Printer size={15} />
                            </button>

                            {isOwner && (
                              <button
                                onClick={() => handleDeleteSale(sale)}
                                title="Delete Record (Owner Only)"
                                className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}

                            {dailyClosed && (
                              <span title="Daily Close Locked" className="text-amber-600">
                                <ShieldAlert size={15} />
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {!loading && filteredSales.length === 0 && (
                    <tr>
                      <td colSpan="11" className="p-10 text-center text-slate-400 text-sm">No counter sales history found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL BEFORE SAVING */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-800">Confirm Counter Sale</h3>
              <button onClick={() => setShowConfirmModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18}/>
              </button>
            </div>

            <div className="space-y-2 text-sm text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">Sale Number:</span>
                <span className="font-mono font-bold text-emerald-800">{liveSaleNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">Selected Product:</span>
                <span className="font-bold text-slate-900">
                  {COUNTER_PRODUCTS.find(p => p.id === selectedProductId)?.name} (x{productQuantity})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">Cash Collected:</span>
                <span className="font-bold text-emerald-700">Rs. {Number(cashCollected || 0).toLocaleString()}</span>
              </div>
              {numericCredit > 0 && (
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500">Credit Amount:</span>
                  <span className="font-bold text-purple-700">Rs. {numericCredit.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-slate-900 text-base">
                <span>Total Amount:</span>
                <span>Rs. {(Number(cashCollected || 0) + numericCredit).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500 pt-1">
                <span>Recorded By:</span>
                <span>{user?.role} ({user?.name})</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 text-center font-medium">
              Are you sure you want to record this retail counter sale? Finished goods stock & water will be deducted automatically.
            </p>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2.5 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeCreateSale}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md"
              >
                Yes, Record Sale
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE RECEIPT MODAL */}
      {receiptSale && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                <Printer size={18} className="text-emerald-600" /> Counter Sale Receipt
              </h3>
              <button onClick={() => setReceiptSale(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18}/>
              </button>
            </div>

            <div id="printable-receipt" className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 font-sans text-xs">
              <div className="text-center border-b border-dashed border-slate-300 pb-2">
                <h4 className="font-extrabold text-sm text-slate-900 uppercase">AquaSphere OS</h4>
                <p className="text-[11px] text-slate-500">Retail & Counter Dispatch Receipt</p>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Receipt / Sale ID:</span>
                  <span className="font-mono font-bold text-slate-900">{receiptSale.saleNumber || receiptSale.id.substring(0, 8)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Product:</span>
                  <span className="font-bold text-slate-900">{receiptSale.productType || 'CUSTOM'} (x{receiptSale.productQty || 1})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date & Time:</span>
                  <span className="font-semibold text-slate-800">{new Date(receiptSale.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-bold text-slate-900">{receiptSale.customer?.name || 'Walk-In Cash Customer'}</span>
                </div>
              </div>

              <div className="border-t border-b border-dashed border-slate-300 py-2 space-y-1">
                <div className="flex justify-between font-medium">
                  <span>Product:</span>
                  <span className="font-bold">{receiptSale.productType || 'FINISHED_GOOD'} x {receiptSale.productQty || 1}</span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Cash Paid:</span>
                  <span className="font-bold text-emerald-700">Rs. {Number(receiptSale.cashCollected || 0).toLocaleString()}</span>
                </div>
                {Number(receiptSale.creditAmount || 0) > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Credit Charged:</span>
                    <span className="font-bold text-purple-700">Rs. {Number(receiptSale.creditAmount).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Payment Method:</span>
                  <span className="font-semibold">{receiptSale.paymentMethod || 'CASH'}</span>
                </div>
                <div className="flex justify-between border-t border-slate-300 pt-1.5 text-sm font-black text-slate-900">
                  <span>Total Amount:</span>
                  <span>Rs. {(Number(receiptSale.cashCollected || 0) + Number(receiptSale.creditAmount || 0)).toLocaleString()}</span>
                </div>
              </div>

              <div className="text-center pt-2 border-t border-dashed border-slate-300 text-[10px] text-slate-400">
                Recorded By: {receiptSale.createdBy?.role || user?.role} ({receiptSale.createdBy?.name || user?.name || 'Staff'})
                <br />Thank you for your business!
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setReceiptSale(null)}
                className="px-4 py-2 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5"
              >
                <Printer size={15} /> Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
