import { useState, useEffect } from 'react';
import { ShieldCheck, Calendar, ChevronDown, ChevronUp, Box, ShoppingBag, UserCheck, RefreshCw } from 'lucide-react';
import { useDailyClose } from '../../hooks/useDailyClose';
import { fetchDailyCloseHistory, fetchDailySummary } from '../../services/dailyCloseService';
import DailyCloseHeader from './DailyCloseHeader';
import ClosedDayBanner from './ClosedDayBanner';
import StatusCard from './StatusCard';

export default function AdminClose() {
  const { date, setDate, status, loading, isClosed, pmConfirmed, mmConfirmed, tenant } = useDailyClose();
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  const p = status?.productionTotals || {};
  const m = status?.marketingTotals || {};

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <DailyCloseHeader
        label="ADMIN VERIFICATION"
        labelColor="indigo"
        icon={ShieldCheck}
        title="Admin Daily Close"
        description="Audit departments and finalize the day. Admin lock auto-confirms PM & MM."
        date={date}
        onDateChange={setDate}
      />

      {isClosed ? (
        <ClosedDayBanner date={date} closedBy={status?.closedBy} closedAt={status?.closedAt} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Department Status + Stats */}
          <div className="card-surface p-5 space-y-3">
            <h3 className="text-base font-bold text-slate-800">Department Status</h3>
            <StatusCard label="Production (PM)" confirmed={pmConfirmed} confirmedBy={status?.pmConfirmedBy?.name} />
            <StatusCard label="Marketing (MM)" confirmed={mmConfirmed} confirmedBy={status?.mmConfirmedBy?.name} />

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs mt-3">
              <div>
                <span className="text-slate-400 block text-[11px] font-bold uppercase">19L Produced</span>
                <strong className="text-slate-800 font-mono font-bold text-sm">{p.total19L || 0}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] font-bold uppercase">Orders</span>
                <strong className="text-slate-800 font-mono font-bold text-sm">{m.ordersCount || 0}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] font-bold uppercase">Orders Worth</span>
                <strong className="text-brand-primary font-mono font-bold text-sm">Rs. {Number(m.ordersTotalWorth || 0).toLocaleString()}</strong>
              </div>
              {cashSummary && (
                <div>
                  <span className="text-slate-400 block text-[11px] font-bold uppercase">Net Cash</span>
                  <strong className={`font-mono font-bold text-sm ${cashSummary.netCash >= 0 ? 'text-brand-primary' : 'text-rose-600'}`}>
                    Rs. {cashSummary.netCash.toLocaleString()}
                  </strong>
                </div>
              )}
            </div>
          </div>

          {/* Admin Read-Only Audit Status */}
          <div className="card-surface p-5 space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-indigo-600 mb-1">
                <ShieldCheck size={18} />
                <h3 className="text-base font-bold text-slate-800">Daily Close Audit Status</h3>
              </div>
              <p className="text-xs text-slate-500">
                Admin view is read-only. Financial lock and daily close finalization are executed by the Accountant or Owner.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 font-semibold">Production Confirmation:</span>
                <span className={`font-bold px-2 py-0.5 rounded ${pmConfirmed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                  {pmConfirmed ? 'Confirmed' : 'Pending'}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 font-semibold">Marketing Confirmation:</span>
                <span className={`font-bold px-2 py-0.5 rounded ${mmConfirmed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                  {mmConfirmed ? 'Confirmed' : 'Pending'}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-200">
                <span className="text-slate-700 font-bold">Final Close Status:</span>
                <span className={`font-bold px-2.5 py-0.5 rounded-full text-xs ${isClosed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                  {isClosed ? '🔒 Day Finalized' : '⏳ Day Open'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Log */}
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
