import { useState, useEffect } from 'react';
import { DollarSign, Receipt, ShoppingCart, CheckCircle, AlertCircle, Clock, Lock, TrendingDown } from 'lucide-react';
import { getCompanyFromCookie } from '../utils/companyCookie';
import { API_URL } from '../utils/api';

const API = API_URL;

export default function AccountantDashboard() {
  const [summary, setSummary] = useState(null);
  const [closeStatus, setCloseStatus] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const today = new Date().toISOString().split('T')[0];
  const tenant = getCompanyFromCookie();

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { 'x-tenant': tenant };
      
      // Use the dedicated /analytics/daily-summary endpoint
      const [summaryRes, closeRes, expensesRes] = await Promise.all([
        fetch(`${API}/analytics/daily-summary?date=${today}`, { headers, credentials: 'include' }),
        fetch(`${API}/daily-close/status?date=${today}`, { headers, credentials: 'include' }),
        fetch(`${API}/expenses?startDate=${today}&endDate=${today}`, { headers, credentials: 'include' })
      ]);
      
      const [summaryData, closeData, expensesData] = await Promise.all([
        summaryRes.json(), 
        closeRes.json(), 
        expensesRes.json()
      ]);

      if (summaryData.success && summaryData.data) {
        const sd = summaryData.data;
        setSummary({
          cashFromOrders: sd.totalDeliveryAmount || 0,
          cashFromSpot: sd.totalSpotSales || 0,
          totalCash: (sd.totalDeliveryAmount || 0) + (sd.totalSpotSales || 0),
          totalExpenses: sd.totalExpenses || 0,
          creditSales: sd.totalCreditSales || 0,
          netCash: sd.netCash || 0,
          totalLitres: sd.totalLitres || 0
        });
      }

      setCloseStatus(closeData.data || { isClosed: false });
      setExpenses(expensesData.data || []);
    } catch (e) {
      console.error('Dashboard fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchData(); }, []);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"/>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Finance View</h2>
          <p className="text-slate-500 text-sm">{new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        {closeStatus?.isClosed ? (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2 rounded-xl text-sm font-semibold">
            <Lock size={16}/> Day Closed
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-xl text-sm font-semibold">
            <Clock size={16}/> Day Open
          </div>
        )}
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Cash from Orders', value: `Rs. ${summary.cashFromOrders.toLocaleString()}`, icon: ShoppingCart, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Cash from Counter', value: `Rs. ${summary.cashFromSpot.toLocaleString()}`, icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Total Expenses', value: `Rs. ${summary.totalExpenses.toLocaleString()}`, icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Net Cash', value: `Rs. ${summary.netCash.toLocaleString()}`, icon: CheckCircle, color: summary.netCash >= 0 ? 'text-emerald-700' : 'text-red-700', bg: summary.netCash >= 0 ? 'bg-emerald-50' : 'bg-red-50' },
        ].map(k => (
          <div key={k.label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className={`w-8 h-8 ${k.bg} rounded-lg flex items-center justify-center mb-2`}>
              <k.icon size={16} className={k.color}/>
            </div>
            <div className="text-xs text-slate-500 font-medium">{k.label}</div>
            <div className={`text-lg font-black mt-0.5 ${k.color}`}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Credit Sales & Litres Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Credit Sales</div>
          <div className="text-2xl font-black text-purple-600 mt-1">Rs. {summary.creditSales.toLocaleString()}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Total Litres Sold</div>
          <div className="text-2xl font-black text-cyan-600 mt-1">{summary.totalLitres.toLocaleString()} L</div>
        </div>
      </div>

      {/* Today's Expenses Breakdown */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <Receipt size={16} className="text-red-500"/>
          <h3 className="font-semibold text-slate-800 text-sm">Today's Expenses Breakdown</h3>
          <span className="ml-auto text-xs text-slate-500">{expenses.length} entries — Rs. {summary.totalExpenses.toLocaleString()}</span>
        </div>
        {expenses.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            <AlertCircle size={24} className="mx-auto mb-2 opacity-40"/>
            No expenses logged today
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">Category</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">Remarks</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500">Amount</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.map(e => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium text-slate-700">{e.category}</td>
                  <td className="px-4 py-2 text-slate-500 text-xs">{e.remarks || '—'}</td>
                  <td className="px-4 py-2 text-right font-bold text-red-600">Rs. {parseFloat(e.amount).toLocaleString()}</td>
                  <td className="px-4 py-2 text-right">
                    {e.receiptUrl
                      ? <a href={e.receiptUrl} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline">View</a>
                      : <span className="text-xs text-red-400 flex items-center gap-0.5 justify-end"><AlertCircle size={11}/> Missing</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
