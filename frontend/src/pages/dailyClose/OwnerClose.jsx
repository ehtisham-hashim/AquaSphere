import { useState, useEffect } from 'react';
import { getCompanyFromCookie } from '../../utils/companyCookie';
import { API_URL } from '../../utils/api';
import { 
  ChevronDown, ChevronUp, Calendar, Box, AlertTriangle, UserCheck, 
  ShieldCheck, Lock, Unlock, ShoppingBag, Factory, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

const API = API_URL;

export default function OwnerClose() {
  const tenant = getCompanyFromCookie();
  
  const [activeTab, setActiveTab] = useState('pm'); // 'pm', 'mm', 'finalize', 'history'
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);

  // Admin Double-Check Checkboxes
  const [adminChecks, setAdminChecks] = useState({
    stockVerified: false,
    cashVerified: false,
    expensesLogged: false,
    mmOrdersVerified: false
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statusRes, historyRes] = await Promise.all([
        fetch(`${API}/daily-close/status?date=${date}`, {
          headers: { 'x-tenant': tenant },
          credentials: 'include'
        }),
        fetch(`${API}/daily-close/history`, {
          headers: { 'x-tenant': tenant },
          credentials: 'include'
        })
      ]);

      const sJson = await statusRes.json();
      const hJson = await historyRes.json();

      if (sJson.success) setStatus(sJson.data);
      if (hJson.success) setHistory(hJson.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load daily close data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    setAdminChecks({ stockVerified: false, cashVerified: false, expensesLogged: false, mmOrdersVerified: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, tenant]);

  const allAdminChecked = Object.values(adminChecks).every(Boolean);

  const handleFinalize = async () => {
    if (!allAdminChecked) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/daily-close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant': tenant },
        credentials: 'include',
        body: JSON.stringify({ date })
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Day successfully finalized and locked.');
        fetchData();
      } else {
        toast.error(json.message || 'Failed to finalize day close');
      }
    } catch (err) {
      toast.error('Error finalizing day close');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReopen = async () => {
    if (!reopenReason.trim()) {
      toast.error('Please enter a reason for reopening');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/daily-close/reopen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant': tenant },
        credentials: 'include',
        body: JSON.stringify({ date, reason: reopenReason })
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Day reopened successfully.');
        setReopenReason('');
        fetchData();
      } else {
        toast.error(json.message || 'Failed to reopen day');
      }
    } catch (err) {
      toast.error('Error reopening day');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Loading Owner Close Control...</p>
        </div>
      </div>
    );
  }

  const pTotals = status?.productionTotals || {};
  const mTotals = status?.marketingTotals || {};
  const isClosed = status?.isClosed;

  return (
    <div className="space-y-6">
      {/* Light Clean Master Control Banner */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              OWNER / ADMIN VERIFICATION
            </span>
            <span className="text-xs text-slate-500">Multi-Department Audit</span>
          </div>
          <h2 className="text-xl font-bold mt-1 text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-600" /> Daily Close Verification Protocol
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <input 
            type="date" 
            value={date} 
            onChange={e => setDate(e.target.value)}
            className="px-4 py-2 bg-slate-50 border border-slate-300 text-slate-800 rounded-xl text-sm font-semibold outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
      </div>

      {/* Top Department Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('pm')}
          className={`flex items-center gap-2 px-5 py-3 rounded-t-xl font-bold text-sm transition-all border-t border-x ${
            activeTab === 'pm'
              ? 'bg-white border-slate-200 text-blue-700 shadow-xs border-b-2 border-b-blue-600'
              : 'bg-slate-50 border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Factory size={16} />
          PM Close Status
          {status?.pmConfirmed ? (
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          ) : (
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('mm')}
          className={`flex items-center gap-2 px-5 py-3 rounded-t-xl font-bold text-sm transition-all border-t border-x ${
            activeTab === 'mm'
              ? 'bg-white border-slate-200 text-purple-700 shadow-xs border-b-2 border-b-purple-600'
              : 'bg-slate-50 border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <ShoppingBag size={16} />
          MM Close Status
          {status?.mmConfirmed ? (
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          ) : (
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('finalize')}
          className={`flex items-center gap-2 px-5 py-3 rounded-t-xl font-bold text-sm transition-all border-t border-x ${
            activeTab === 'finalize'
              ? 'bg-white border-slate-200 text-emerald-700 shadow-xs border-b-2 border-b-emerald-600'
              : 'bg-slate-50 border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <ShieldCheck size={16} />
          Double Check & Lock
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-5 py-3 rounded-t-xl font-bold text-sm transition-all border-t border-x ${
            activeTab === 'history'
              ? 'bg-white border-slate-200 text-slate-800 shadow-xs border-b-2 border-b-slate-700'
              : 'bg-slate-50 border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Calendar size={16} />
          History Log ({history.length})
        </button>
      </div>

      {/* TAB 1: PM CLOSE */}
      {activeTab === 'pm' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Production Manager Verification</h3>
              <p className="text-xs text-slate-500">Factory production, raw material deductions, and breakage records.</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              status?.pmConfirmed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {status?.pmConfirmed ? `Confirmed by ${status.pmConfirmedBy?.name}` : 'Awaiting PM Confirmation'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
            <div>
              <p className="text-xs text-slate-500 font-semibold">19L Bottles</p>
              <p className="text-xl font-black text-blue-900">{pTotals.total19L || 0}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold">1.5L Packs</p>
              <p className="text-xl font-black text-indigo-900">{pTotals.packs15L || 0}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold">0.5L Packs</p>
              <p className="text-xl font-black text-purple-900">{pTotals.packs05L || 0}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold">Waste / Breakage</p>
              <p className="text-xl font-black text-rose-600">
                {(pTotals.waste19L || 0) + (pTotals.broken15L || 0) + (pTotals.broken05L || 0)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MM CLOSE */}
      {activeTab === 'mm' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Marketing Manager Verification</h3>
              <p className="text-xs text-slate-500">Sales order counts, total worth, and customer 19L bottle holdings.</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              status?.mmConfirmed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {status?.mmConfirmed ? `Confirmed by ${status.mmConfirmedBy?.name}` : 'Awaiting MM Confirmation'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-purple-50/50 p-4 rounded-xl border border-purple-100">
            <div>
              <p className="text-xs text-slate-500 font-semibold">Total Orders</p>
              <p className="text-xl font-black text-purple-900">{mTotals.ordersCount || 0} orders</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold">Total Orders Worth</p>
              <p className="text-xl font-black text-emerald-800">Rs {Number(mTotals.ordersTotalWorth || 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold">19L With Customers</p>
              <p className="text-xl font-black text-blue-900">{mTotals.customerBottlesCount || 0} bottles</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: FINALIZE & LOCK */}
      {activeTab === 'finalize' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-sm">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Master Day Close Lock</h3>
              <p className="text-xs text-slate-500">Double check PM and MM confirmations before locking the day.</p>
            </div>
            {isClosed && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                <Lock size={14} /> Finalized & Closed
              </span>
            )}
          </div>

          {isClosed ? (
            <div className="space-y-6">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-800 text-sm font-semibold">
                This day was finalized and closed at {new Date(status.closedAt).toLocaleTimeString()} by {status.closedBy?.name || 'Admin'}.
              </div>

              {/* Owner Reopen Option */}
              <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-5 space-y-3">
                <h4 className="font-bold text-amber-900 text-sm flex items-center gap-1.5">
                  <Unlock size={16} /> Owner Override: Reopen Closed Day
                </h4>
                <input
                  type="text"
                  placeholder="Enter reason for reopening day..."
                  value={reopenReason}
                  onChange={e => setReopenReason(e.target.value)}
                  className="w-full border border-amber-300 rounded-lg p-2.5 text-sm bg-white outline-none focus:border-amber-500"
                />
                <button
                  onClick={handleReopen}
                  disabled={submitting || !reopenReason.trim()}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition disabled:opacity-50"
                >
                  {submitting ? 'Reopening...' : 'Reopen Day'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Checklist */}
              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={adminChecks.stockVerified}
                    onChange={e => setAdminChecks({ ...adminChecks, stockVerified: e.target.checked })}
                    className="mt-1 w-5 h-5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  />
                  <span className="text-sm font-semibold text-slate-800">
                    Production numbers match physical factory stock.
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={adminChecks.mmOrdersVerified}
                    onChange={e => setAdminChecks({ ...adminChecks, mmOrdersVerified: e.target.checked })}
                    className="mt-1 w-5 h-5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  />
                  <span className="text-sm font-semibold text-slate-800">
                    Marketing Manager order states and customer bottle holdings are verified.
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={adminChecks.cashVerified}
                    onChange={e => setAdminChecks({ ...adminChecks, cashVerified: e.target.checked })}
                    className="mt-1 w-5 h-5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  />
                  <span className="text-sm font-semibold text-slate-800">
                    Cash collected matches system deliveries and counter sales.
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={adminChecks.expensesLogged}
                    onChange={e => setAdminChecks({ ...adminChecks, expensesLogged: e.target.checked })}
                    className="mt-1 w-5 h-5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  />
                  <span className="text-sm font-semibold text-slate-800">
                    All expenses and raw material purchases are properly recorded.
                  </span>
                </label>
              </div>

              <button
                onClick={handleFinalize}
                disabled={!allAdminChecked || submitting}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-200 text-white font-bold text-sm rounded-xl transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
              >
                <Lock size={18} />
                {submitting ? 'Finalizing Day...' : 'Finalize & Lock Daily Close'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: HISTORY LOG */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {history.length === 0 ? (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center text-slate-500">
              No finalized days found.
            </div>
          ) : (
            history.map((day) => {
              const isExpanded = expandedHistoryId === day.id;
              const p = day.productionTotals || {};
              const m = day.marketingTotals || {};

              return (
                <div key={day.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-200 hover:border-slate-300">
                  <div 
                    onClick={() => setExpandedHistoryId(isExpanded ? null : day.id)}
                    className="p-5 cursor-pointer flex items-center justify-between bg-slate-50 hover:bg-slate-100/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center shadow-inner">
                        <Calendar size={24} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-800">
                          {new Date(day.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
                        </h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 font-medium">
                          <span className="flex items-center gap-1">
                            <UserCheck size={14} className="text-emerald-600" />
                            Locked by {day.closedBy?.name || 'Admin'}
                          </span>
                          <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                          <span>{new Date(day.closedAt).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="hidden sm:flex items-center gap-4 text-sm font-semibold">
                        <div className="text-slate-600 flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                          <Box size={16} className="text-blue-500"/>
                          {p.total19L || 0} <span className="text-slate-400 font-normal">19L</span>
                        </div>
                        <div className="text-slate-600 flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                          <ShoppingBag size={16} className="text-purple-500"/>
                          {m.ordersCount || 0} <span className="text-slate-400 font-normal">Orders</span>
                        </div>
                      </div>

                      <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-sm">
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-6 border-t border-slate-100 space-y-4 bg-white">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                          <h4 className="font-bold text-blue-900 text-sm mb-2">Production Summary</h4>
                          <p>19L Bottles: <strong>{p.total19L || 0}</strong></p>
                          <p>1.5L Packs: <strong>{p.packs15L || 0}</strong></p>
                          <p>0.5L Packs: <strong>{p.packs05L || 0}</strong></p>
                          <p>PM Confirmed: <strong>{day.pmConfirmedBy?.name || 'Yes'}</strong></p>
                        </div>

                        <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100">
                          <h4 className="font-bold text-purple-900 text-sm mb-2">Marketing & Sales Summary</h4>
                          <p>Total Orders: <strong>{m.ordersCount || 0}</strong></p>
                          <p>Orders Worth: <strong>Rs {Number(m.ordersTotalWorth || 0).toLocaleString()}</strong></p>
                          <p>MM Confirmed: <strong>{day.mmConfirmedBy?.name || 'Yes'}</strong></p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
