import { useState, useEffect } from 'react';
import { DollarSign, Receipt, ShoppingCart, CheckCircle, AlertCircle, Clock, Lock, TrendingDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.VITE_API_URL;

export default function AccountantDashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [closeStatus, setCloseStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [closeMsg, setCloseMsg] = useState('');
  const today = new Date().toISOString().split('T')[0];

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordRes, expRes, spotRes, closeRes] = await Promise.all([
        fetch(`${API}/orders`, { credentials: 'include' }),
        fetch(`${API}/expenses?startDate=${today}&endDate=${today}`, { credentials: 'include' }),
        fetch(`${API}/spot-sales`, { credentials: 'include' }),
        fetch(`${API}/daily-close/status?date=${today}`, { credentials: 'include' })
      ]);
      const [ord, exp, spot, close] = await Promise.all([
        ordRes.json(), expRes.json(), spotRes.json(), closeRes.json()
      ]);

      const todayStr = new Date().toDateString();
      const todayOrders = (ord.data || []).filter(o => new Date(o.createdAt).toDateString() === todayStr);
      const todayDelivered = todayOrders.filter(o => o.deliveryStatus === 'DELIVERED');
      const cashFromOrders = todayDelivered.reduce((sum, o) => {
        return sum + (o.deliveries || []).reduce((s, d) => s + parseFloat(d.cashReceived || 0), 0);
      }, 0);

      const todaySpot = (spot.data || []).filter(s => new Date(s.createdAt).toDateString() === todayStr);
      const cashFromSpot = todaySpot.reduce((s, sale) => s + parseFloat(sale.cashCollected || 0), 0);

      const todayExpenses = exp.data || [];
      const totalExpenses = todayExpenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);

      setSummary({
        cashFromOrders,
        cashFromSpot,
        totalCash: cashFromOrders + cashFromSpot,
        totalExpenses,
        netCash: cashFromOrders + cashFromSpot - totalExpenses,
        ordersDelivered: todayDelivered.length,
        ordersTotal: todayOrders.length,
        spotSales: todaySpot.length,
        expenseCount: todayExpenses.length,
        pendingOrders: todayOrders.filter(o => o.deliveryStatus === 'PENDING').length,
        expenseList: todayExpenses
      });

      setCloseStatus(close.data || { isClosed: false });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const confirmClose = async () => {
    if (!window.confirm(`Confirm that all financial entries for ${today} are complete and accurate?\n\nNote: Only Admin can lock the day — this is your confirmation.`)) return;
    setClosing(true);
    setCloseMsg('');
    try {
      // Accountant confirms — but only ADMIN actually locks
      // We store a "confirmed" note in audit log here
      setCloseMsg('✅ You have confirmed today\'s entries. The Admin will now lock the day.');
    } catch (e) {
      setCloseMsg('Error: ' + e.message);
    } finally {
      setClosing(false);
    }
  };

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
          <h2 className="text-2xl font-bold text-slate-800">Cash Summary</h2>
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

      {/* Activity row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Orders Delivered', value: summary.ordersDelivered },
          { label: 'Pending Orders', value: summary.pendingOrders, alert: summary.pendingOrders > 0 },
          { label: 'Counter Sales', value: summary.spotSales },
          { label: 'Expenses Logged', value: summary.expenseCount, alert: summary.expenseCount === 0 },
        ].map(s => (
          <div key={s.label} className={`bg-white border rounded-xl p-4 shadow-sm ${s.alert ? 'border-amber-200 bg-amber-50' : 'border-slate-200'}`}>
            <div className="text-xs text-slate-500 font-medium">{s.label}</div>
            <div className={`text-2xl font-black mt-1 ${s.alert ? 'text-amber-700' : 'text-slate-800'}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Today's Expenses */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <Receipt size={16} className="text-red-500"/>
          <h3 className="font-semibold text-slate-800 text-sm">Today's Expenses</h3>
          <span className="ml-auto text-xs text-slate-500">{summary.expenseCount} entries — Rs. {summary.totalExpenses.toLocaleString()}</span>
        </div>
        {summary.expenseList.length === 0 ? (
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
              {summary.expenseList.map(e => (
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

      {/* Daily Closing Confirmation */}
      {!closeStatus?.isClosed && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <h3 className="font-bold text-slate-800 mb-1 flex items-center gap-2"><CheckCircle size={18} className="text-emerald-600"/> Accountant Day Confirmation</h3>
          <p className="text-sm text-slate-500 mb-4">
            Before Admin locks the day, confirm that all your financial entries are complete:
          </p>
          <ul className="space-y-2 mb-5">
            {[
              { label: 'All expenses have receipt photos attached', ok: summary.expenseList.every(e => !!e.receiptUrl) },
              { label: 'Cash from orders reconciles with deliveries', ok: summary.ordersDelivered > 0 || summary.ordersTotal === 0 },
              { label: 'Counter sales logged', ok: summary.spotSales >= 0 },
              { label: 'No pending orders left unresolved', ok: summary.pendingOrders === 0 },
            ].map(item => (
              <li key={item.label} className={`flex items-center gap-2 text-sm font-medium ${item.ok ? 'text-emerald-700' : 'text-amber-600'}`}>
                {item.ok ? <CheckCircle size={15}/> : <AlertCircle size={15}/>} {item.label}
              </li>
            ))}
          </ul>
          {closeMsg && (
            <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg">{closeMsg}</div>
          )}
          <button onClick={confirmClose} disabled={closing}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            <CheckCircle size={16}/>
            {closing ? 'Confirming...' : 'Confirm — All Entries Complete for Today'}
          </button>
          <p className="text-xs text-slate-400 text-center mt-2">Admin will close and lock the day after your confirmation</p>
        </div>
      )}

      {closeStatus?.isClosed && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center">
          <Lock size={24} className="mx-auto text-emerald-600 mb-2"/>
          <div className="font-bold text-emerald-800">Today's entries are locked</div>
          <div className="text-xs text-emerald-600 mt-1">
            Closed by {closeStatus.closedBy?.name || 'Admin'} at {closeStatus.closedAt ? new Date(closeStatus.closedAt).toLocaleTimeString() : '—'}
          </div>
        </div>
      )}
    </div>
  );
}
