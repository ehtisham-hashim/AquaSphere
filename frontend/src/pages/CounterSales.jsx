import { useState, useEffect } from 'react';
import { 
  Plus, Search, DollarSign, Calendar, Droplets, 
  Download, CheckCircle2, User, FileText, Loader2
} from 'lucide-react';
import { API_URL } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { getCompanyFromCookie } from '../utils/companyCookie';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';

export default function CounterSales() {
  const { user } = useAuth();
  const isWadaana = getCompanyFromCookie() === 'wadaana';
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('new-sale'); // 'new-sale', 'history', 'reports'
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [litresSold, setLitresSold] = useState('');
  const [capsIssued, setCapsIssued] = useState('0');
  const [cashCollected, setCashCollected] = useState('');
  const [creditAmount, setCreditAmount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [customerId, setCustomerId] = useState('');
  const [remarks, setRemarks] = useState('');

  // Role Permissions
  const isMM = user?.role === 'MARKETING_MANAGER';
  const isAccountant = user?.role === 'ACCOUNTANT';
  const isOwner = user?.role === 'OWNER';
  const canCreate = isMM || isAccountant || isOwner;

  const fetchData = async () => {
    setLoading(true);
    try {
      const [salesRes, customersRes] = await Promise.all([
        fetch(`${API_URL}/spot-sales`, { credentials: 'include' }),
        fetch(`${API_URL}/customers`, { credentials: 'include' })
      ]);
      const sJson = await salesRes.json();
      const cJson = await customersRes.json();

      if (sJson.success) setSales(sJson.data);
      if (cJson.success) setCustomers(cJson.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load counter sales data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchData(); 
  }, []);

  const resetForm = () => {
    setLitresSold('');
    setCapsIssued('0');
    setCashCollected('');
    setCreditAmount('0');
    setPaymentMethod('CASH');
    setCustomerId('');
    setRemarks('');
  };

  const handleCreateSale = async (e) => {
    e.preventDefault();
    const litres = parseFloat(litresSold);
    const cash = parseFloat(cashCollected || 0);
    const credit = parseFloat(creditAmount || 0);

    if (isNaN(litres) || litres <= 0) {
      toast.error('Please enter valid Litres Sold');
      return;
    }
    if (credit > 0 && !customerId) {
      toast.error('Customer profile selection is mandatory for Credit Sales!');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/spot-sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          litresSold: litres,
          capsIssued: parseInt(capsIssued || 0),
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
      toast.success('Counter sale recorded successfully!');
      resetForm();
      setActiveTab('history');
      fetchData();
    } catch (err) {
      toast.error('Error recording sale');
    } finally {
      setSubmitting(false);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    if (filteredSales.length === 0) return;
    const headers = ['Date', 'Litres (L)', 'Caps', 'Cash (Rs)', 'Credit (Rs)', 'Total (Rs)', 'Payment Method', 'Customer', 'Remarks', 'Created By'];
    const rows = filteredSales.map(s => [
      new Date(s.createdAt).toLocaleDateString(),
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

  // Filter Logic
  const filteredSales = sales.filter(s => 
    (s.paymentMethod || 'CASH').toLowerCase().includes(search.toLowerCase()) || 
    (s.remarks && s.remarks.toLowerCase().includes(search.toLowerCase())) ||
    (s.customer?.name && s.customer.name.toLowerCase().includes(search.toLowerCase()))
  );

  // Metrics
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

  const isCreditSale = parseFloat(creditAmount || 0) > 0;

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
          <h2 className="text-2xl font-bold text-slate-800 mt-1">Spot / Counter Sales</h2>
          <p className="text-slate-500 text-sm">Record walk-in retail sales, cash collections, and customer credit dispatches</p>
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
            <Plus size={16} /> Log New Sale
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

        <button
          onClick={() => setActiveTab('reports')}
          className={`whitespace-nowrap px-5 py-3 rounded-t-xl text-sm font-bold transition-all flex items-center gap-2 border-t border-x ${
            activeTab === 'reports'
              ? 'bg-white border-slate-200 text-indigo-700 border-b-2 border-b-indigo-600 shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <FileText size={16} /> Summary Reports
        </button>
      </div>

      {/* TAB 1: NEW SALE FORM */}
      {activeTab === 'new-sale' && canCreate && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm w-full space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-lg font-bold text-slate-800">Record Walk-In / Counter Sale</h3>
            <p className="text-xs text-slate-500">Specify litres sold, cash collected, and customer profile if credit is issued.</p>
          </div>

          <form onSubmit={handleCreateSale} className="space-y-4 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5 text-sm">Water Litres Sold (L) *</label>
                <div className="relative">
                  <Droplets className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-500" size={18}/>
                  <input 
                    type="number" 
                    step="0.1" 
                    min="0.1"
                    className="w-full border border-slate-200 rounded-xl py-3 pl-10 pr-4 font-bold text-slate-800 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-sm" 
                    value={litresSold} 
                    onChange={(e) => setLitresSold(e.target.value)} 
                    placeholder="e.g. 50"
                    required 
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5 text-sm">Caps Issued</label>
                <input 
                  type="number" 
                  min="0"
                  className="w-full border border-slate-200 rounded-xl p-3 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-semibold shadow-sm" 
                  value={capsIssued} 
                  onChange={(e) => setCapsIssued(e.target.value)} 
                  placeholder="0"
                />
              </div>
            </div>

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
                    className="w-full border border-slate-200 rounded-xl py-3 pl-10 pr-4 font-bold text-purple-900 outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all shadow-sm" 
                    value={creditAmount} 
                    onChange={(e) => setCreditAmount(e.target.value)} 
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Dynamic Customer Selection for Credit Sales */}
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
                    {c.name} ({c.phone}) — Balance: Rs {Number(c.currentBalance || 0).toLocaleString()}
                  </option>
                ))}
              </select>
              {isCreditSale && !customerId && (
                <p className="text-[11px] text-purple-700 font-medium mt-1">
                  ⚠ Credit sales require linking an existing customer profile to update their outstanding ledger.
                </p>
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
                  <option value="CASH">Cash</option>
                  <option value="JAZZCASH">JazzCash</option>
                  <option value="EASYPAISA">EasyPaisa</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CARD">Debit / Credit Card</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5 text-sm">Remarks / Notes</label>
                <input 
                  type="text" 
                  className="w-full border border-slate-200 rounded-xl p-3 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-sm" 
                  value={remarks} 
                  onChange={(e) => setRemarks(e.target.value)} 
                  placeholder="Optional retail remarks..."
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button 
                type="submit" 
                disabled={submitting || (isCreditSale && !customerId)}
                className="w-full sm:w-auto px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-200 text-white font-bold text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                Record Counter Sale
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
              placeholder="Search sales by customer name, payment method, or remarks..." 
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
                    <th className="p-4">Date</th>
                    <th className="p-4">Litres (L)</th>
                    <th className="p-4">Caps</th>
                    <th className="p-4">Cash</th>
                    <th className="p-4">Credit</th>
                    <th className="p-4">Total Amount</th>
                    <th className="p-4">Payment Method</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Remarks</th>
                    <th className="p-4">Created By</th>
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

                    return (
                      <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4 text-slate-600 text-xs font-medium">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={14} className="text-slate-400"/>
                            {new Date(sale.createdAt).toLocaleDateString()} {new Date(sale.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>
                        </td>
                        <td className="p-4 text-blue-900 font-extrabold">{sale.litresSold} L</td>
                        <td className="p-4 text-slate-700 font-semibold">{sale.capsIssued}</td>
                        <td className="p-4 text-emerald-700 font-bold">Rs. {cash.toLocaleString()}</td>
                        <td className="p-4 text-purple-900 font-bold">Rs. {credit.toLocaleString()}</td>
                        <td className="p-4 text-slate-900 font-black">Rs. {total.toLocaleString()}</td>
                        <td className="p-4">
                          <span className="bg-slate-100 text-slate-800 border border-slate-200 px-2.5 py-1 rounded-md text-xs font-bold">
                            {sale.paymentMethod || 'CASH'}
                          </span>
                        </td>
                        <td className="p-4 text-xs font-semibold text-slate-800">
                          {sale.customer ? (
                            <span className="text-purple-800 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-full">
                              {sale.customer.name}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal">Walk-In Cash</span>
                          )}
                        </td>
                        <td className="p-4 text-slate-500 text-xs truncate max-w-[180px]">{sale.remarks || '—'}</td>
                        <td className="p-4 text-xs text-slate-600 font-medium">
                          {sale.createdBy?.name || user?.name || 'System'}
                        </td>
                      </tr>
                    );
                  })}

                  {!loading && filteredSales.length === 0 && (
                    <tr>
                      <td colSpan="10" className="p-10 text-center text-slate-400 text-sm">No counter sales history found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: REPORTS TAB */}
      {activeTab === 'reports' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3">Counter Sales Summary Reports</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
              <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Today's Revenue</span>
              <span className="text-xl font-black text-emerald-800">Rs. {todayTotalRevenue.toLocaleString()}</span>
              <p className="text-[11px] text-slate-500 mt-1">Cash: Rs {todayCash.toLocaleString()} | Credit: Rs {todayCredit.toLocaleString()}</p>
            </div>

            <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
              <span className="text-xs font-bold text-slate-500 uppercase block mb-1">This Week's Revenue</span>
              <span className="text-xl font-black text-indigo-900">Rs. {weekRevenue.toLocaleString()}</span>
            </div>

            <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100">
              <span className="text-xs font-bold text-slate-500 uppercase block mb-1">This Month's Revenue</span>
              <span className="text-xl font-black text-purple-900">Rs. {monthRevenue.toLocaleString()}</span>
            </div>
          </div>

          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 flex justify-between items-center text-sm font-semibold text-slate-700">
            <span>Lifetime Counter Litres Sold:</span>
            <span className="text-lg font-black text-blue-900">{totalLitresSold.toLocaleString()} Litres</span>
          </div>
        </div>
      )}
    </div>
  );
}
