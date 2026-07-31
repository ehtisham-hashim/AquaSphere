import { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle2, Lock, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { getCompanyFromCookie } from '../../utils/companyCookie';
import { API_URL } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const API = API_URL;

export default function DailyClose() {
  const { user } = useAuth();
  const tenant = getCompanyFromCookie();
  
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);

  // PM Checklist State
  const [pmChecks, setPmChecks] = useState({
    batchesLogged: false,
    materialsDeducted: false,
    wasteRecorded: false
  });

  // Admin Checklist State
  const [adminChecks, setAdminChecks] = useState({
    stockVerified: false,
    cashVerified: false,
    expensesLogged: false
  });

  const isPM = user?.role === 'PRODUCTION_MANAGER' || user?.role === 'OWNER';
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'OWNER';

  const fetchStatus = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch(`${API}/daily-close/status?date=${date}`, {
        headers: { 'x-tenant': tenant },
        credentials: 'include'
      });
      const json = await res.json();
      if (json.success) {
        setStatus(json.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load daily close status');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    setPmChecks({ batchesLogged: false, materialsDeducted: false, wasteRecorded: false });
    setAdminChecks({ stockVerified: false, cashVerified: false, expensesLogged: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, tenant]);

  const allPmChecked = Object.values(pmChecks).every(Boolean);
  const allAdminChecked = Object.values(adminChecks).every(Boolean);

  const handlePmConfirm = async () => {
    if (!allPmChecked || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/daily-close/pm-confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant': tenant },
        credentials: 'include',
        body: JSON.stringify({ date })
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Production confirmed successfully. Awaiting Admin verification.');
        setStatus(prev => ({ ...prev, pmConfirmed: true }));
        await fetchStatus(false);
      } else {
        toast.error(json.message || 'Failed to confirm production');
      }
    } catch (err) {
      toast.error('Error confirming production');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminFinalize = async () => {
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
        toast.success('Day successfully finalized and closed.');
        fetchStatus();
      } else {
        toast.error(json.message || 'Failed to close day');
      }
    } catch (err) {
      toast.error('Error closing day');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Checking Day Status...</p>
        </div>
      </div>
    );
  }

  const isClosed = status?.isClosed;
  const pmConfirmed = status?.pmConfirmed;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Light Clean Header Banner */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              OPERATIONS
            </span>
            <span className="text-xs text-slate-500">Two-Step Verification Protocol</span>
          </div>
          <h1 className="text-2xl font-bold mt-1 text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-600" /> Production Daily Close
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Coordinate Production & Accounting to securely finalize daily records.
          </p>
        </div>
        
        <div>
          <input 
            type="date" 
            value={date} 
            onChange={e => setDate(e.target.value)}
            className="px-4 py-2 bg-slate-50 border border-slate-300 text-slate-800 rounded-xl text-sm font-semibold outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
      </div>

      {isClosed ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-emerald-900">Day is Locked & Finalized</h2>
          <p className="text-slate-600 max-w-md mx-auto">
            All records for {new Date(date).toLocaleDateString()} have been securely closed by {status?.closedBy?.name || 'Admin'} at {new Date(status?.closedAt).toLocaleTimeString()}. No further edits can be made.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* STEP 1: PM Verification */}
          <div className={`rounded-2xl border ${pmConfirmed ? 'bg-emerald-50/50 border-emerald-200 opacity-60 pointer-events-none blur-sm' : 'bg-white border-slate-200 shadow-sm'} p-6 relative overflow-hidden`}>
            {pmConfirmed && (
              <div className="absolute top-4 right-4 text-emerald-600 flex items-center gap-1 text-sm font-bold bg-emerald-100 px-3 py-1 rounded-full">
                <CheckCircle2 size={16} /> Verified
              </div>
            )}
            <h3 className="text-lg font-bold text-slate-800 mb-1">Step 1: Production</h3>
            <p className="text-xs text-slate-500 mb-4">Verified by Production Manager</p>

            {/* Display Production Totals */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">System Recorded Production</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-600">19L Bottles:</p>
                  <p className="text-lg font-bold text-slate-900">{status?.productionTotals?.total19L || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">1.5L Packs:</p>
                  <p className="text-lg font-bold text-slate-900">{status?.productionTotals?.packs15L || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">0.5L Packs:</p>
                  <p className="text-lg font-bold text-slate-900">{status?.productionTotals?.packs05L || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Waste/Breakage:</p>
                  <p className="text-lg font-bold text-rose-600">
                    {(status?.productionTotals?.waste19L || 0) + (status?.productionTotals?.broken15L || 0) + (status?.productionTotals?.broken05L || 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  disabled={pmConfirmed || !isPM}
                  checked={pmConfirmed || pmChecks.batchesLogged}
                  onChange={e => setPmChecks(prev => ({ ...prev, batchesLogged: e.target.checked }))}
                  className="mt-1 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 disabled:opacity-50"
                />
                <span className={`text-sm ${pmConfirmed ? 'text-slate-500 line-through' : 'text-slate-700 font-medium group-hover:text-emerald-700'}`}>All production batches for today have been logged.</span>
              </label>
              
              <label className="flex items-start gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  disabled={pmConfirmed || !isPM}
                  checked={pmConfirmed || pmChecks.materialsDeducted}
                  onChange={e => setPmChecks(prev => ({ ...prev, materialsDeducted: e.target.checked }))}
                  className="mt-1 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 disabled:opacity-50"
                />
                <span className={`text-sm ${pmConfirmed ? 'text-slate-500 line-through' : 'text-slate-700 font-medium group-hover:text-emerald-700'}`}>Raw materials have been properly deducted.</span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  disabled={pmConfirmed || !isPM}
                  checked={pmConfirmed || pmChecks.wasteRecorded}
                  onChange={e => setPmChecks(prev => ({ ...prev, wasteRecorded: e.target.checked }))}
                  className="mt-1 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 disabled:opacity-50"
                />
                <span className={`text-sm ${pmConfirmed ? 'text-slate-500 line-through' : 'text-slate-700 font-medium group-hover:text-emerald-700'}`}>Breakages and waste are fully recorded.</span>
              </label>
            </div>

            {isPM && !pmConfirmed && (
              <div className="mt-8">
                <button
                  onClick={handlePmConfirm}
                  disabled={!allPmChecked || submitting}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-200 text-white font-bold text-sm rounded-xl transition shadow-md flex items-center justify-center gap-2"
                >
                  <ShieldCheck size={18} />
                  Send to Admin for Verification
                </button>
              </div>
            )}
            
            {pmConfirmed && status?.pmConfirmedBy?.name && (
              <div className="mt-6 text-xs font-semibold text-emerald-700 bg-emerald-100/50 p-3 rounded-lg">
                Confirmed by {status.pmConfirmedBy.name} at {new Date(status.pmConfirmedAt).toLocaleTimeString()}
              </div>
            )}
          </div>

          {/* STEP 2: Admin Verification */}
          <div className={`rounded-2xl border ${!pmConfirmed ? 'bg-slate-50 border-slate-200 opacity-60 pointer-events-none' : 'bg-white border-slate-200 shadow-sm'} p-6 relative overflow-hidden`}>
            {!pmConfirmed && (
              <div className="absolute top-4 right-4 text-amber-600 flex items-center gap-1 text-sm font-bold bg-amber-100 px-3 py-1 rounded-full">
                <AlertTriangle size={14} /> Locked
              </div>
            )}
            <h3 className="text-lg font-bold text-slate-800 mb-1">Step 2: Operations & Admin</h3>
            <p className="text-xs text-slate-500 mb-6">Verified by System Admin or Owner</p>

            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  disabled={!isAdmin}
                  checked={adminChecks.stockVerified}
                  onChange={e => setAdminChecks(prev => ({ ...prev, stockVerified: e.target.checked }))}
                  className="mt-1 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 disabled:opacity-50"
                />
                <span className="text-sm text-slate-700 font-medium group-hover:text-emerald-700">Production numbers match physical stock.</span>
              </label>
              
              <label className="flex items-start gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  disabled={!isAdmin}
                  checked={adminChecks.cashVerified}
                  onChange={e => setAdminChecks(prev => ({ ...prev, cashVerified: e.target.checked }))}
                  className="mt-1 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 disabled:opacity-50"
                />
                <span className="text-sm text-slate-700 font-medium group-hover:text-emerald-700">Cash collected matches system deliveries.</span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  disabled={!isAdmin}
                  checked={adminChecks.expensesLogged}
                  onChange={e => setAdminChecks(prev => ({ ...prev, expensesLogged: e.target.checked }))}
                  className="mt-1 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 disabled:opacity-50"
                />
                <span className="text-sm text-slate-700 font-medium group-hover:text-emerald-700">All expenses and purchases are properly logged.</span>
              </label>
            </div>

            {isAdmin && (
              <div className="mt-8">
                <button
                  onClick={handleAdminFinalize}
                  disabled={!allAdminChecked || submitting}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-200 disabled:text-emerald-500 text-white font-bold text-sm rounded-xl transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                >
                  <Lock size={18} />
                  Finalize & Lock Daily Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
