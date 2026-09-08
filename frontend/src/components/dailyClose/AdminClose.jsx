import { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, Calendar, ChevronDown, ChevronUp, Box, ShoppingBag, UserCheck, RefreshCw, Lock, AlertTriangle, Truck, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { useDailyClose } from '../../hooks/useDailyClose';
import { fetchDailyCloseHistory, fetchDailySummary, finalizeDay } from '../../services/dailyCloseService';
import DailyCloseHeader from './DailyCloseHeader';
import ClosedDayBanner from './ClosedDayBanner';
import StatusCard from './StatusCard';

export default function AdminClose() {
  const { date, setDate, status, loading, refreshStatus, isClosed, pmConfirmed, mmConfirmed, tmConfirmed, tenant } = useDailyClose();
  const [history, setHistory] = useState([]);
  const [cashSummary, setCashSummary] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(() => {
    Promise.all([
      fetchDailyCloseHistory(tenant),
      fetchDailySummary(date, tenant)
    ]).then(([hJson, cJson]) => {
      if (hJson.success) setHistory(hJson.data || []);
      if (cJson.success) {
        const d = cJson.data;
        setCashSummary({
          orderCash: d.totalDeliveryAmount || 0,
          counterSales: d.totalSpotSales || 0,
          totalExpenses: d.totalExpenses || 0,
          netCash: (d.totalDeliveryAmount || 0) + (d.totalSpotSales || 0) - (d.totalExpenses || 0)
        });
      }
    }).catch(() => {});
  }, [date, tenant]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFinalize = async () => {
    setSubmitting(true);
    try {
      const json = await finalizeDay(date, tenant);
      if (json.success) {
        toast.success('Day double-verified and locked successfully.');
        refreshStatus(false);
        loadData();
      } else {
        toast.error(json.message || 'Failed to lock day');
      }
    } catch {
      toast.error('Error locking day');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <RefreshCw className="w-8 h-8 text-[var(--brand)] animate-spin" />
      </div>
    );
  }

  const p = status?.productionTotals || {};
  const m = status?.marketingTotals || {};
  const t = status?.transportTotals || {};

  const allDepartmentsConfirmed = pmConfirmed && mmConfirmed && tmConfirmed;

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <DailyCloseHeader
        label="ADMIN DOUBLE-VERIFICATION"
        labelColor="indigo"
        icon={ShieldCheck}
        title="Admin Daily Close"
        description="Audit department verifications, review daily totals, and finalize the day to lock operations."
        date={date}
        onDateChange={setDate}
      />

      {isClosed ? (
        <ClosedDayBanner date={date} closedBy={status?.closedBy} closedAt={status?.closedAt} />
      ) : (
        <div className="space-y-4">
          {/* 1. Department Verification Tracker */}
          <div className="card-surface p-5 space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Department Verifications</h3>
                <p className="text-xs text-slate-500 mt-0.5">Other managers verify their department figures before final admin lock.</p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${allDepartmentsConfirmed ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                {allDepartmentsConfirmed ? 'All Departments Verified ✓' : 'Awaiting Verifications'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <StatusCard label="1. Production (PM)" confirmed={pmConfirmed} confirmedBy={status?.pmConfirmedBy?.name} />
              <StatusCard label="2. Sales & Distribution (MM)" confirmed={mmConfirmed} confirmedBy={status?.mmConfirmedBy?.name} />
              <StatusCard label="3. Transport & Fleet (TM)" confirmed={tmConfirmed} confirmedBy={status?.tmConfirmedBy?.name} />
            </div>
          </div>

          {/* 2. Today's Key Operational Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="card-surface p-4">
              <div className="flex items-center gap-2 text-blue-600 mb-1">
                <Box size={16} />
                <span className="text-[11px] font-bold text-slate-500 uppercase">Production</span>
              </div>
              <p className="text-xl font-extrabold font-mono text-slate-900">{p.total19L || 0} <span className="text-xs font-semibold text-slate-400">19L</span></p>
              <p className="text-[10px] text-slate-500 mt-0.5 font-medium">1.5L: {p.packs15L || 0} | 0.5L: {p.packs05L || 0}</p>
            </div>

            <div className="card-surface p-4">
              <div className="flex items-center gap-2 text-purple-600 mb-1">
                <ShoppingBag size={16} />
                <span className="text-[11px] font-bold text-slate-500 uppercase">Orders & Sales</span>
              </div>
              <p className="text-xl font-extrabold font-mono text-slate-900">{m.ordersCount || 0} <span className="text-xs font-semibold text-slate-400">Orders</span></p>
              <p className="text-[10px] text-[var(--brand)] font-bold mt-0.5 font-mono">Rs. {Number(m.ordersTotalWorth || 0).toLocaleString()}</p>
            </div>

            <div className="card-surface p-4">
              <div className="flex items-center gap-2 text-amber-600 mb-1">
                <Truck size={16} />
                <span className="text-[11px] font-bold text-slate-500 uppercase">Fleet & Fuel</span>
              </div>
              <p className="text-xl font-extrabold font-mono text-slate-900">{t.totalVehicles || 0} <span className="text-xs font-semibold text-slate-400">Active</span></p>
              <p className="text-[10px] text-rose-600 font-bold mt-0.5 font-mono">Rs. {Number(t.totalExpenses || 0).toLocaleString()}</p>
            </div>

            <div className="card-surface p-4">
              <div className="flex items-center gap-2 text-emerald-600 mb-1">
                <DollarSign size={16} />
                <span className="text-[11px] font-bold text-slate-500 uppercase">Net Cash Drawer</span>
              </div>
              <p className={`text-xl font-extrabold font-mono ${cashSummary && cashSummary.netCash >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                Rs. {cashSummary ? Number(cashSummary.netCash || 0).toLocaleString() : '0'}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Spot: Rs. {cashSummary?.counterSales?.toLocaleString() || '0'}</p>
            </div>
          </div>

          {/* 3. Double-Verification & Daily Lock Action Card */}
          <div className="card-surface p-6 border-2 border-indigo-100 bg-indigo-50/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 text-indigo-950 font-black text-base">
                <ShieldCheck size={20} className="text-indigo-600" />
                <span>Admin Double-Verification & Lock</span>
              </div>
              <p className="text-xs text-slate-600 max-w-xl font-medium">
                Double-verifying finalizes daily numbers and locks date records from unauthorized edits.
                {!allDepartmentsConfirmed && (
                  <span className="block text-amber-700 font-bold text-[11px] mt-1 flex items-center gap-1">
                    <AlertTriangle size={13} /> Some departments are pending verification. Admin lock will auto-confirm and finalize.
                  </span>
                )}
              </p>
            </div>

            <button
              onClick={handleFinalize}
              disabled={submitting}
              className="btn-primary py-3 px-6 text-sm flex items-center gap-2 shrink-0 font-bold shadow-md hover:shadow-lg transition-all"
            >
              {submitting ? <RefreshCw size={16} className="animate-spin" /> : <Lock size={16} />}
              <span>{submitting ? 'Finalizing...' : 'Double-Verify & Lock Day'}</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. History Log */}
      <div className="space-y-3 pt-2">
        <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
          <Calendar size={18} className="text-slate-400" /> Close History ({history.length})
        </h3>
        {history.length === 0 ? (
          <div className="card-surface p-8 text-center text-slate-400 text-xs font-semibold">
            No finalized days recorded yet.
          </div>
        ) : (
          history.map(day => {
            const isExpanded = expandedId === day.id;
            const hp = day.productionTotals || {};
            const hm = day.marketingTotals || {};
            return (
              <div key={day.id} className="card-surface border border-slate-200 overflow-hidden transition-all">
                <div
                  onClick={() => setExpandedId(isExpanded ? null : day.id)}
                  className="p-4 cursor-pointer flex items-center justify-between hover:bg-slate-50/60 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center font-bold">
                      <Lock size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-800">
                        {new Date(day.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                      </h4>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                        <UserCheck size={12} className="text-emerald-600" />
                        <span>Closed by <strong className="text-slate-700">{day.closedBy?.name || 'Admin'}</strong></span>
                        <span>· {new Date(day.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-2 text-[11px] font-bold">
                      <span className="badge-neutral font-mono">{hp.total19L || 0} 19L</span>
                      <span className="badge-brand font-mono">{hm.ordersCount || 0} Orders</span>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-4 bg-slate-50 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-white p-3 rounded-xl border border-slate-200/80 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Production Breakdown</span>
                      <p className="font-semibold text-slate-800">19L: <strong className="font-mono">{hp.total19L || 0}</strong> | 1.5L: <strong className="font-mono">{hp.packs15L || 0}</strong> | 0.5L: <strong className="font-mono">{hp.packs05L || 0}</strong></p>
                      <p className="text-[11px] text-slate-500">PM Confirmed: {day.pmConfirmedBy?.name || 'Auto-confirmed'}</p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200/80 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Sales & Orders Breakdown</span>
                      <p className="font-semibold text-slate-800">Orders: <strong className="font-mono">{hm.ordersCount || 0}</strong> | Worth: <strong className="font-mono text-[var(--brand)]">Rs {Number(hm.ordersTotalWorth || 0).toLocaleString()}</strong></p>
                      <p className="text-[11px] text-slate-500">MM Confirmed: {day.mmConfirmedBy?.name || 'Auto-confirmed'}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
