import { useState, useEffect } from 'react';
import { 
  X, Lock, Unlock, AlertCircle, ShieldCheck, Factory, 
  ShoppingBag, CheckCircle2, RefreshCw 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../utils/api';
import { getCompanyFromCookie } from '../utils/companyCookie';
import { toast } from 'sonner';

export default function DailyCloseModal({ onClose, onClosed }) {
  const { user } = useAuth();
  const tenant = getCompanyFromCookie();

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [reopenReason, setReopenReason] = useState('');

  // Role Tab Selection
  const initialTab = user?.role === 'MARKETING_MANAGER' ? 'mm' : user?.role === 'PRODUCTION_MANAGER' ? 'pm' : 'finalize';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Checklists
  const [pmChecks, setPmChecks] = useState({ batchesLogged: false, materialsDeducted: false, wasteRecorded: false });
  const [mmChecks, setMmChecks] = useState({ ordersInRightState: false, customerBottlesInRightState: false });
  const [adminChecks, setAdminChecks] = useState({ stockVerified: false, cashVerified: false, expensesLogged: false, mmOrdersVerified: false });

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/daily-close/status?date=${date}`, {
        headers: { 'x-tenant': tenant },
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setStatus(data.data);
      } else {
        setError(data.message || 'Failed to load daily close status');
      }
    } catch (err) {
      setError('Network error loading daily close status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    setPmChecks({ batchesLogged: false, materialsDeducted: false, wasteRecorded: false });
    setMmChecks({ ordersInRightState: false, customerBottlesInRightState: false });
    setAdminChecks({ stockVerified: false, cashVerified: false, expensesLogged: false, mmOrdersVerified: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, tenant]);

  const allPmChecked = Object.values(pmChecks).every(Boolean);
  const allMmChecked = Object.values(mmChecks).every(Boolean);
  const allAdminChecked = Object.values(adminChecks).every(Boolean);

  const handlePmConfirm = async () => {
    if (!allPmChecked) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/daily-close/pm-confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant': tenant },
        credentials: 'include',
        body: JSON.stringify({ date })
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Production confirmed successfully.');
        fetchStatus();
      } else {
        toast.error(json.message || 'Failed to confirm PM daily close');
      }
    } catch (err) {
      toast.error('Error confirming PM daily close');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMmConfirm = async () => {
    if (!allMmChecked) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/daily-close/mm-confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant': tenant },
        credentials: 'include',
        body: JSON.stringify({ date })
      });
      const json = await res.json();
      if (json.success) {
        toast.success('MM daily close confirmed successfully.');
        fetchStatus();
      } else {
        toast.error(json.message || 'Failed to confirm MM daily close');
      }
    } catch (err) {
      toast.error('Error confirming MM daily close');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinalize = async () => {
    if (!allAdminChecked) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/daily-close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant': tenant },
        credentials: 'include',
        body: JSON.stringify({ date })
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Day successfully finalized and locked.');
        if (onClosed) onClosed();
        fetchStatus();
      } else {
        toast.error(json.message || 'Failed to lock day');
      }
    } catch (err) {
      toast.error('Error locking day');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReopen = async () => {
    if (!reopenReason.trim()) {
      toast.error('Reason required to reopen day');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/daily-close/reopen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant': tenant },
        credentials: 'include',
        body: JSON.stringify({ date, reason: reopenReason })
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Day reopened successfully.');
        setReopenReason('');
        fetchStatus();
      } else {
        toast.error(json.message || 'Failed to reopen day');
      }
    } catch (err) {
      toast.error('Error reopening day');
    } finally {
      setSubmitting(false);
    }
  };

  const pTotals = status?.productionTotals || {};
  const mTotals = status?.marketingTotals || {};
  const isClosed = status?.isClosed;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-hidden">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-[5vh] border border-slate-200">
        
        {/* Light Clean Header */}
        <div className="bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-emerald-600" size={22} />
            <h3 className="text-lg font-bold text-slate-800">Daily Closing Protocol</h3>
          </div>
          <div className="flex items-center gap-3">
            <input 
              type="date" 
              value={date} 
              onChange={e => setDate(e.target.value)}
              className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-emerald-500"
            />
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 pt-3 flex gap-2 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('pm')}
            className={`px-4 py-2 rounded-t-xl text-xs font-bold transition-all flex items-center gap-1.5 border-t border-x ${
              activeTab === 'pm' 
                ? 'bg-white border-slate-200 text-blue-700 border-b-2 border-b-blue-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Factory size={14} /> Production (PM)
            {status?.pmConfirmed && <CheckCircle2 size={12} className="text-emerald-600 ml-1" />}
          </button>

          <button
            onClick={() => setActiveTab('mm')}
            className={`px-4 py-2 rounded-t-xl text-xs font-bold transition-all flex items-center gap-1.5 border-t border-x ${
              activeTab === 'mm' 
                ? 'bg-white border-slate-200 text-purple-700 border-b-2 border-b-purple-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <ShoppingBag size={14} /> Marketing (MM)
            {status?.mmConfirmed && <CheckCircle2 size={12} className="text-emerald-600 ml-1" />}
          </button>

          <button
            onClick={() => setActiveTab('finalize')}
            className={`px-4 py-2 rounded-t-xl text-xs font-bold transition-all flex items-center gap-1.5 border-t border-x ${
              activeTab === 'finalize' 
                ? 'bg-white border-slate-200 text-emerald-700 border-b-2 border-b-emerald-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Lock size={14} /> Double Check & Lock
            {isClosed && <Lock size={12} className="text-emerald-600 ml-1" />}
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-center gap-2 text-xs font-semibold">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
            </div>
          ) : (
            <>
              {/* TAB 1: PM TAB */}
              {activeTab === 'pm' && (
                <div className="space-y-5">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-slate-800 text-sm">PM Production Verification</h4>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      status?.pmConfirmed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {status?.pmConfirmed ? 'PM Confirmed' : 'Pending PM Confirmation'}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-3 bg-blue-50/60 p-3 rounded-xl border border-blue-100 text-xs">
                    <div>
                      <span className="text-slate-500 block">19L Bottles</span>
                      <strong className="text-sm font-bold text-blue-900">{pTotals.total19L || 0}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">1.5L Packs</span>
                      <strong className="text-sm font-bold text-indigo-900">{pTotals.packs15L || 0}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">0.5L Packs</span>
                      <strong className="text-sm font-bold text-purple-900">{pTotals.packs05L || 0}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Waste / Breakage</span>
                      <strong className="text-sm font-bold text-rose-600">
                        {(pTotals.waste19L || 0) + (pTotals.broken15L || 0) + (pTotals.broken05L || 0)}
                      </strong>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" disabled={status?.pmConfirmed}
                        checked={status?.pmConfirmed || pmChecks.batchesLogged}
                        onChange={e => setPmChecks({...pmChecks, batchesLogged: e.target.checked})}
                        className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300" />
                      <span className="text-xs font-medium text-slate-700">All production batches logged for today.</span>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" disabled={status?.pmConfirmed}
                        checked={status?.pmConfirmed || pmChecks.materialsDeducted}
                        onChange={e => setPmChecks({...pmChecks, materialsDeducted: e.target.checked})}
                        className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300" />
                      <span className="text-xs font-medium text-slate-700">Raw materials properly deducted from stock.</span>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" disabled={status?.pmConfirmed}
                        checked={status?.pmConfirmed || pmChecks.wasteRecorded}
                        onChange={e => setPmChecks({...pmChecks, wasteRecorded: e.target.checked})}
                        className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300" />
                      <span className="text-xs font-medium text-slate-700">Waste & broken bottles fully recorded.</span>
                    </label>
                  </div>

                  {!status?.pmConfirmed && (
                    <button
                      onClick={handlePmConfirm}
                      disabled={!allPmChecked || submitting}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-200 text-white font-bold text-xs rounded-xl shadow-sm"
                    >
                      Confirm PM Production Close
                    </button>
                  )}
                </div>
              )}

              {/* TAB 2: MM TAB */}
              {activeTab === 'mm' && (
                <div className="space-y-5">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-slate-800 text-sm">MM Sales & Bottle Holdings Verification</h4>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      status?.mmConfirmed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {status?.mmConfirmed ? 'MM Confirmed' : 'Pending MM Confirmation'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 bg-purple-50/60 p-3 rounded-xl border border-purple-100 text-xs">
                    <div>
                      <span className="text-slate-500 block">Total Orders</span>
                      <strong className="text-sm font-bold text-purple-900">{mTotals.ordersCount || 0}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Total Orders Worth</span>
                      <strong className="text-sm font-bold text-emerald-700">Rs {Number(mTotals.ordersTotalWorth || 0).toLocaleString()}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">19L With Customers</span>
                      <strong className="text-sm font-bold text-blue-900">{mTotals.customerBottlesCount || 0}</strong>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" disabled={status?.mmConfirmed}
                        checked={status?.mmConfirmed || mmChecks.ordersInRightState}
                        onChange={e => setMmChecks({...mmChecks, ordersInRightState: e.target.checked})}
                        className="mt-0.5 w-4 h-4 text-purple-600 rounded border-slate-300" />
                      <div>
                        <span className="text-xs font-bold text-slate-800">Orders are in the right state</span>
                        <p className="text-[11px] text-slate-500">Verified {mTotals.ordersCount || 0} orders totaling Rs {Number(mTotals.ordersTotalWorth || 0).toLocaleString()}</p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" disabled={status?.mmConfirmed}
                        checked={status?.mmConfirmed || mmChecks.customerBottlesInRightState}
                        onChange={e => setMmChecks({...mmChecks, customerBottlesInRightState: e.target.checked})}
                        className="mt-0.5 w-4 h-4 text-purple-600 rounded border-slate-300" />
                      <div>
                        <span className="text-xs font-bold text-slate-800">Customers hold the right state of bottles</span>
                        <p className="text-[11px] text-slate-500">Verified customer 19L bottle balances ({mTotals.customerBottlesCount || 0} bottles with customers)</p>
                      </div>
                    </label>
                  </div>

                  {!status?.mmConfirmed && (
                    <button
                      onClick={handleMmConfirm}
                      disabled={!allMmChecked || submitting}
                      className="w-full py-2.5 bg-purple-700 hover:bg-purple-800 disabled:bg-purple-200 text-white font-bold text-xs rounded-xl shadow-sm"
                    >
                      Confirm MM Sales & Customer Bottle Close
                    </button>
                  )}
                </div>
              )}

              {/* TAB 3: FINALIZE / LOCK */}
              {activeTab === 'finalize' && (
                <div className="space-y-5">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-slate-800 text-sm">Master Double-Check & Lock</h4>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      isClosed ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {isClosed ? 'Day Closed & Locked' : 'Day Open'}
                    </span>
                  </div>

                  {isClosed ? (
                    <div className="space-y-4">
                      <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-emerald-800 text-xs font-semibold">
                        Day was locked at {new Date(status.closedAt).toLocaleTimeString()} by {status.closedBy?.name || 'Admin'}.
                      </div>

                      {user?.role === 'OWNER' && (
                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 space-y-2">
                          <span className="text-xs font-bold text-amber-900 flex items-center gap-1">
                            <Unlock size={14} /> Owner Override: Reopen Day
                          </span>
                          <input
                            type="text"
                            placeholder="Reason for reopening..."
                            value={reopenReason}
                            onChange={e => setReopenReason(e.target.value)}
                            className="w-full border border-amber-300 rounded-lg p-2 text-xs bg-white outline-none"
                          />
                          <button
                            onClick={handleReopen}
                            disabled={submitting || !reopenReason.trim()}
                            className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition disabled:opacity-50"
                          >
                            Reopen Day
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div>
                          <span className="text-slate-500 block">PM Status:</span>
                          <strong className={status?.pmConfirmed ? 'text-emerald-700' : 'text-amber-600'}>
                            {status?.pmConfirmed ? 'Confirmed' : 'Pending'}
                          </strong>
                        </div>
                        <div>
                          <span className="text-slate-500 block">MM Status:</span>
                          <strong className={status?.mmConfirmed ? 'text-emerald-700' : 'text-amber-600'}>
                            {status?.mmConfirmed ? 'Confirmed' : 'Pending'}
                          </strong>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input type="checkbox" checked={adminChecks.stockVerified}
                            onChange={e => setAdminChecks({...adminChecks, stockVerified: e.target.checked})}
                            className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300" />
                          <span className="text-xs font-medium text-slate-700">Production numbers match physical stock.</span>
                        </label>

                        <label className="flex items-start gap-3 cursor-pointer">
                          <input type="checkbox" checked={adminChecks.mmOrdersVerified}
                            onChange={e => setAdminChecks({...adminChecks, mmOrdersVerified: e.target.checked})}
                            className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300" />
                          <span className="text-xs font-medium text-slate-700">MM order states & customer bottle holdings verified.</span>
                        </label>

                        <label className="flex items-start gap-3 cursor-pointer">
                          <input type="checkbox" checked={adminChecks.cashVerified}
                            onChange={e => setAdminChecks({...adminChecks, cashVerified: e.target.checked})}
                            className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300" />
                          <span className="text-xs font-medium text-slate-700">Cash collected matches system records.</span>
                        </label>

                        <label className="flex items-start gap-3 cursor-pointer">
                          <input type="checkbox" checked={adminChecks.expensesLogged}
                            onChange={e => setAdminChecks({...adminChecks, expensesLogged: e.target.checked})}
                            className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300" />
                          <span className="text-xs font-medium text-slate-700">Expenses and raw material purchases logged.</span>
                        </label>
                      </div>

                      <button
                        onClick={handleFinalize}
                        disabled={!allAdminChecked || submitting}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-200 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2"
                      >
                        <Lock size={16} />
                        Finalize & Lock Daily Close
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-100 px-6 py-3 flex justify-end shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
