import { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle2, Lock, RefreshCw, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { getCompanyFromCookie } from '../../utils/companyCookie';
import { API_URL } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const API = API_URL;

export default function AccountantClose() {
  const { user } = useAuth();
  const tenant = getCompanyFromCookie();

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Accountant Checklist State
  const [checks, setChecks] = useState({
    cashMatchesDeliveries: false,
    expensesLogged: false,
    purchasesVerified: false,
    vendorBalancesReconciled: false,
    bankDepositVerified: false
  });

  const fetchStatus = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch(`${API}/daily-close/status?date=${date}`, {
        headers: { 'x-tenant': tenant },
        credentials: 'include'
      });
      const json = await res.json();
      if (json.success) setStatus(json.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load daily close status');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    setChecks({
      cashMatchesDeliveries: false,
      expensesLogged: false,
      purchasesVerified: false,
      vendorBalancesReconciled: false,
      bankDepositVerified: false
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, tenant]);

  const allChecked = Object.values(checks).every(Boolean);

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

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase tracking-wider">
              ACCOUNTING & FINANCE
            </span>
            <span className="text-xs text-slate-500 font-medium">Financial Reconciliation</span>
          </div>
          <h1 className="text-2xl font-bold mt-1.5 text-slate-800 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-600" /> Accountant Daily Close
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Verify cash collections, expenses, vendor balances, and daily financial records.
          </p>
        </div>

        <div>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-300 text-slate-800 rounded-xl text-sm font-bold outline-none focus:border-emerald-500 transition-colors shadow-xs"
          />
        </div>
      </div>

      {isClosed ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-emerald-900">Day Financials Locked & Closed</h2>
          <p className="text-slate-600 max-w-md mx-auto">
            All financial entries for {new Date(date).toLocaleDateString()} have been finalized.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">Financial Reconciliation Checklist</h3>
            <p className="text-xs text-slate-500 font-medium">Verified by Accountant ({user?.name || 'Accountant'})</p>
          </div>

          <div className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={checks.cashMatchesDeliveries}
                onChange={e => setChecks(prev => ({ ...prev, cashMatchesDeliveries: e.target.checked }))}
                className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <span className="text-xs text-slate-800 font-bold group-hover:text-emerald-700">✓ Cash collected matches system deliveries.</span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={checks.expensesLogged}
                onChange={e => setChecks(prev => ({ ...prev, expensesLogged: e.target.checked }))}
                className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <span className="text-xs text-slate-800 font-bold group-hover:text-emerald-700">✓ All daily expenses and purchases are properly logged.</span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={checks.purchasesVerified}
                onChange={e => setChecks(prev => ({ ...prev, purchasesVerified: e.target.checked }))}
                className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <span className="text-xs text-slate-800 font-bold group-hover:text-emerald-700">✓ Raw material purchase bills verified and approved.</span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={checks.vendorBalancesReconciled}
                onChange={e => setChecks(prev => ({ ...prev, vendorBalancesReconciled: e.target.checked }))}
                className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <span className="text-xs text-slate-800 font-bold group-hover:text-emerald-700">✓ Vendor ledgers and supplier accounts reconciled.</span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={checks.bankDepositVerified}
                onChange={e => setChecks(prev => ({ ...prev, bankDepositVerified: e.target.checked }))}
                className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <span className="text-xs text-slate-800 font-bold group-hover:text-emerald-700">✓ Daily cash register and bank deposits reconciled.</span>
            </label>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              onClick={() => toast.success('Accountant reconciliation verified for today!')}
              disabled={!allChecked}
              className="py-3 px-5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs rounded-xl transition shadow-md flex items-center gap-2 active:scale-[0.98]"
            >
              <ShieldCheck size={16} />
              Save Financial Verification
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
