import { useState, useEffect } from 'react';
import { Crown, Unlock, Calendar, ChevronDown, ChevronUp, Box, ShoppingBag, UserCheck, RefreshCw, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useDailyClose } from '../../hooks/useDailyClose';
import { fetchDailyCloseHistory, fetchDailySummary, finalizeDay, reopenDay } from '../../services/dailyCloseService';
import DailyCloseHeader from './DailyCloseHeader';
import ClosedDayBanner from './ClosedDayBanner';
import StatusCard from './StatusCard';
import VerificationChecklist from './VerificationChecklist';

const OWNER_CHECKLIST = [
  { key: 'departmentsVerified', label: 'All department totals and records verified.' },
  { key: 'financialsVerified', label: 'Cash, expenses, and bank deposits reconciled.' },
];

export default function OwnerClose() {
  const { date, setDate, status, loading, refreshStatus, isClosed, pmConfirmed, mmConfirmed, tenant } = useDailyClose();
  const [submitting, setSubmitting] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [history, setHistory] = useState([]);
  const [cashSummary, setCashSummary] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    Promise.all([
      fetchDailyCloseHistory(tenant),
      fetchDailySummary(date, tenant)
    ]).then(([hJson, cJson]) => {
      if (hJson.success) setHistory(hJson.data);
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

  const handleFinalize = async () => {
    setSubmitting(true);
    try {
      const json = await finalizeDay(date, tenant);
      if (json.success) {
        toast.success('Day finalized and locked.');
        refreshStatus(false);
        fetchDailyCloseHistory(tenant).then(h => h.success && setHistory(h.data));
      } else { toast.error(json.message || 'Failed to lock day'); }
    } catch { toast.error('Error locking day'); }
    finally { setSubmitting(false); }
  };

  const handleReopen = async () => {
    if (!reopenReason.trim()) { toast.error('Reason required'); return; }
    setSubmitting(true);
    try {
      const json = await reopenDay(date, reopenReason, tenant);
      if (json.success) {
        toast.success('Day reopened successfully');
        setReopenReason('');
        refreshStatus(false);
        fetchDailyCloseHistory(tenant).then(h => h.success && setHistory(h.data));
      } else { toast.error(json.message || 'Failed to reopen'); }
    } catch { toast.error('Error reopening day'); }
    finally { setSubmitting(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <RefreshCw className="w-8 h-8 text-amber-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <DailyCloseHeader
        label="OWNER OVERVIEW"
        labelColor="amber"
        icon={Crown}
        title="Owner Daily Close"
        description="Full oversight — verify, finalize, or reopen any day."
        date={date}
        onDateChange={setDate}
      />

      {/* Status + Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Department Status + Financials */}
        <div className="card-surface p-5 space-y-3">
          <h3 className="text-base font-bold text-slate-800">Day Status</h3>
          <StatusCard label="Production (PM)" confirmed={pmConfirmed} confirmedBy={status?.pmConfirmedBy?.name} />
          <StatusCard label="Marketing (MM)" confirmed={mmConfirmed} confirmedBy={status?.mmConfirmedBy?.name} />
          <StatusCard label="Admin Lock" confirmed={isClosed} confirmedBy={status?.closedBy?.name} />

          {cashSummary && (
            <div className="grid grid-cols-2 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs mt-3">
              <div>
                <span className="text-slate-400 block text-[11px] font-bold uppercase">Order Cash</span>
                <strong className="text-slate-800 font-mono font-bold text-sm">Rs. {cashSummary.orderCash.toLocaleString()}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] font-bold uppercase">Counter Sales</span>
                <strong className="text-brand-primary font-mono font-bold text-sm">Rs. {cashSummary.counterSales.toLocaleString()}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] font-bold uppercase">Expenses</span>
                <strong className="text-rose-600 font-mono font-bold text-sm">Rs. {cashSummary.totalExpenses.toLocaleString()}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] font-bold uppercase">Net Cash</span>
                <strong className={`font-mono font-bold text-sm ${cashSummary.netCash >= 0 ? 'text-brand-primary' : 'text-rose-600'}`}>
                  Rs. {cashSummary.netCash.toLocaleString()}
                </strong>
              </div>
            </div>
          )}
        </div>

        {/* Finalize or Reopen */}
        <div className="space-y-6">
          {isClosed ? (
            <>
              <ClosedDayBanner date={date} closedBy={status?.closedBy} closedAt={status?.closedAt} />
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 space-y-3">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1">
                  <Unlock size={14} /> Owner Override: Reopen Day
                </span>
                <input
                  type="text"
                  placeholder="Reason for reopening..."
                  value={reopenReason}
                  onChange={e => setReopenReason(e.target.value)}
                  className="w-full border border-amber-300 rounded-lg p-2.5 text-xs bg-white outline-none focus:border-amber-500"
                />
                <button
                  onClick={handleReopen}
                  disabled={submitting || !reopenReason.trim()}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition disabled:opacity-50"
                >
                  {submitting ? 'Reopening...' : 'Reopen Day'}
                </button>
              </div>
            </>
          ) : (
            <VerificationChecklist
              key={date}
              title="Owner Finalize & Lock"
              subtitle="Lock day — auto-confirms PM/MM if pending"
              items={OWNER_CHECKLIST}
              onConfirm={handleFinalize}
              confirmLabel="Finalize & Lock Daily Close"
              confirmIcon={Lock}
              confirmed={false}
              submitting={submitting}
            />
          )}
        </div>
      </div>

      {/* History */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Calendar size={20} /> History ({history.length})
        </h3>
        {history.length === 0 ? (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center text-slate-500 text-sm">
            No finalized days found.
          </div>
        ) : (
          history.map(day => {
            const isExpanded = expandedId === day.id;
            const hp = day.productionTotals || {};
            const hm = day.marketingTotals || {};
            return (
              <div key={day.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div
                  onClick={() => setExpandedId(isExpanded ? null : day.id)}
                  className="p-5 cursor-pointer flex items-center justify-between bg-slate-50 hover:bg-slate-100/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center">
                      <Calendar size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">
                        {new Date(day.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <UserCheck size={12} className="text-emerald-600" />
                        {day.closedBy?.name || 'Admin'} · {new Date(day.closedAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="hidden sm:flex items-center gap-3 text-xs font-semibold">
                      <span className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-200">
                        <Box size={14} className="text-blue-500" /> {hp.total19L || 0} 19L
                      </span>
                      <span className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-200">
                        <ShoppingBag size={14} className="text-purple-500" /> {hm.ordersCount || 0} Orders
                      </span>
                    </div>
                    <div className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>
                </div>
                {isExpanded && (
                  <div className="p-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                      <h5 className="font-bold text-blue-900 text-sm mb-2">Production</h5>
                      <p>19L: <strong>{hp.total19L || 0}</strong> · 1.5L: <strong>{hp.packs15L || 0}</strong> · 0.5L: <strong>{hp.packs05L || 0}</strong></p>
                      <p>PM: <strong>{day.pmConfirmedBy?.name || 'Auto'}</strong></p>
                    </div>
                    <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100">
                      <h5 className="font-bold text-purple-900 text-sm mb-2">Marketing</h5>
                      <p>Orders: <strong>{hm.ordersCount || 0}</strong> · Worth: <strong>Rs {Number(hm.ordersTotalWorth || 0).toLocaleString()}</strong></p>
                      <p>MM: <strong>{day.mmConfirmedBy?.name || 'Auto'}</strong></p>
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
