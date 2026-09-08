import { useState, useEffect, useCallback } from 'react';
import { Crown, Unlock, Calendar, ChevronDown, ChevronUp, Box, ShoppingBag, UserCheck, RefreshCw, Lock, Truck, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { useDailyClose } from '../../hooks/useDailyClose';
import { fetchDailyCloseHistory, fetchDailySummary, finalizeDay, reopenDay } from '../../services/dailyCloseService';
import DailyCloseHeader from './DailyCloseHeader';
import ClosedDayBanner from './ClosedDayBanner';
import StatusCard from './StatusCard';

export default function OwnerClose() {
  const { date, setDate, status, loading, refreshStatus, isClosed, pmConfirmed, mmConfirmed, tmConfirmed, tenant } = useDailyClose();
  const [history, setHistory] = useState([]);
  const [cashSummary, setCashSummary] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [reopenReason, setReopenReason] = useState('');

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
        toast.success('Day finalized and locked.');
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

  const handleReopen = async () => {
    if (!reopenReason.trim()) {
      toast.error('Please enter a reason for reopening this day');
      return;
    }
    setSubmitting(true);
    try {
      const json = await reopenDay(date, reopenReason.trim(), tenant);
      if (json.success) {
        toast.success('Day reopened successfully.');
        setReopenReason('');
        refreshStatus(false);
        loadData();
      } else {
        toast.error(json.message || 'Failed to reopen day');
      }
    } catch {
      toast.error('Error reopening day');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <RefreshCw className="w-8 h-8 text-amber-600 animate-spin" />
      </div>
    );
  }

  const p = status?.productionTotals || {};
  const m = status?.marketingTotals || {};
  const t = status?.transportTotals || {};

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <DailyCloseHeader
        label="OWNER OVERSIGHT"
        labelColor="amber"
        icon={Crown}
        title="Owner Daily Close"
        description="Executive oversight of plant operations, department verifications, and day lock controls."
        date={date}
        onDateChange={setDate}
      />

      {/* 1. Closed Banner or Status */}
      {isClosed ? (
        <div className="space-y-3">
          <ClosedDayBanner date={date} closedBy={status?.closedBy} closedAt={status?.closedAt} />
          
          {/* Owner Reopen Card */}
          <div className="card-surface p-4 border border-amber-200 bg-amber-50/40 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="space-y-0.5 text-center sm:text-left">
              <span className="text-xs font-bold text-amber-900 flex items-center gap-1 justify-center sm:justify-start">
                <Unlock size={14} className="text-amber-700" /> Owner Override: Reopen Day
              </span>
              <p className="text-[11px] text-amber-800/80 font-medium">Reopening unlocks this day for staff adjustments.</p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Reason for reopening..."
                value={reopenReason}
                onChange={e => setReopenReason(e.target.value)}
                className="input-base text-xs py-1.5 flex-1 sm:w-64 bg-white"
              />
              <button
                onClick={handleReopen}
                disabled={submitting || !reopenReason.trim()}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition disabled:opacity-50 shrink-0"
              >
                {submitting ? 'Reopening...' : 'Reopen Day'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* 2. Department Verification Tracker */}
      <div className="card-surface p-5 space-y-3">
        <div>
          <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Department Verification Status</h3>
          <p className="text-xs text-slate-500 mt-0.5">Live status of department daily confirmations.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatusCard label="1. Production (PM)" confirmed={pmConfirmed} confirmedBy={status?.pmConfirmedBy?.name} />
          <StatusCard label="2. Sales & Distribution (MM)" confirmed={mmConfirmed} confirmedBy={status?.mmConfirmedBy?.name} />
          <StatusCard label="3. Transport & Fleet (TM)" confirmed={tmConfirmed} confirmedBy={status?.tmConfirmedBy?.name} />
        </div>
      </div>

      {/* 3. Operational Snapshot (4 Cards) */}
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
            <span className="text-[11px] font-bold text-slate-500 uppercase">Sales & Orders</span>
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

      {/* 4. If open, Owner can also finalize */}
      {!isClosed && (
        <div className="card-surface p-4 bg-slate-50 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-600">Day is currently open for operations.</span>
          <button
            onClick={handleFinalize}
            disabled={submitting}
            className="btn-primary py-2 px-4 text-xs font-bold flex items-center gap-1.5"
          >
            <Lock size={14} />
            <span>{submitting ? 'Finalizing...' : 'Finalize & Lock Day'}</span>
          </button>
        </div>
      )}

      {/* 5. Close History */}
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
