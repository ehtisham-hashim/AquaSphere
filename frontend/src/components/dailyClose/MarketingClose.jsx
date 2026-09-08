import { useState } from 'react';
import { ShoppingBag, CheckCircle2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useDailyClose } from '../../hooks/useDailyClose';
import { confirmMM } from '../../services/dailyCloseService';
import DailyCloseHeader from './DailyCloseHeader';
import ClosedDayBanner from './ClosedDayBanner';

export default function MarketingClose() {
  const { date, setDate, status, loading, refreshStatus, isClosed, mmConfirmed, tenant } = useDailyClose();
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const json = await confirmMM(date, tenant);
      if (json.success) {
        toast.success('Sales & marketing confirmed successfully');
        refreshStatus(false);
      } else {
        toast.error(json.message || 'Failed to confirm');
      }
    } catch {
      toast.error('Error confirming marketing');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 text-purple-600 animate-spin" />
      </div>
    );
  }

  const m = status?.marketingTotals || {};

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <DailyCloseHeader
        label="SALES & DISTRIBUTION VERIFICATION"
        labelColor="purple"
        icon={ShoppingBag}
        title="Marketing & Sales Daily Close"
        description="Verify today's customer orders, deliveries, and bottle balances."
        date={date}
        onDateChange={setDate}
      />

      {isClosed ? (
        <ClosedDayBanner date={date} closedBy={status?.closedBy} closedAt={status?.closedAt} />
      ) : (
        <div className="space-y-4">
          {/* Sales & Orders Stats */}
          <div className="card-surface p-5 space-y-3">
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Today's Sales & Orders</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase">Orders Delivered</p>
                <p className="text-xl font-extrabold font-mono text-slate-900">{m.ordersCount || 0}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase">Total Orders Value</p>
                <p className="text-xl font-extrabold font-mono text-[var(--brand)]">Rs. {Number(m.ordersTotalWorth || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase">Customer 19L Bottles</p>
                <p className="text-xl font-extrabold font-mono text-slate-900">{m.customerBottlesCount || 0}</p>
              </div>
            </div>
          </div>

          {/* Single-Click Verify Action */}
          <div className="card-surface p-5 border-2 border-purple-100 bg-purple-50/20">
            {mmConfirmed ? (
              <div className="flex items-center gap-3 text-emerald-800">
                <CheckCircle2 size={24} className="text-emerald-600 shrink-0" />
                <div>
                  <h4 className="text-sm font-extrabold">Sales & Deliveries Verified for Today ✓</h4>
                  <p className="text-xs text-emerald-700 font-medium">
                    Confirmed by {status?.mmConfirmedBy?.name || 'Marketing Manager'}
                    {status?.mmConfirmedAt && ` at ${new Date(status.mmConfirmedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="space-y-0.5 text-center sm:text-left">
                  <h4 className="text-sm font-extrabold text-slate-900">Verify Sales & Deliveries</h4>
                  <p className="text-xs text-slate-500">Confirm today's delivery and sales logs are accurate for admin double-verification.</p>
                </div>
                <button
                  onClick={handleConfirm}
                  disabled={submitting}
                  className="btn-primary py-2.5 px-6 text-xs font-bold flex items-center gap-2 shrink-0"
                >
                  {submitting ? <RefreshCw size={14} className="animate-spin" /> : <ShoppingBag size={14} />}
                  <span>{submitting ? 'Confirming...' : 'Verify Sales Report'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
