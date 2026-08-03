import { useState } from 'react';
import { ShoppingBag, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useDailyClose } from '../../hooks/useDailyClose';
import { confirmMM } from '../../services/dailyCloseService';
import DailyCloseHeader from './DailyCloseHeader';
import ClosedDayBanner from './ClosedDayBanner';
import VerificationChecklist from './VerificationChecklist';

const MM_CHECKLIST = [
  { key: 'ordersVerified', label: 'All orders are in the correct state (delivered, pending, etc.).' },
  { key: 'bottlesVerified', label: 'Customer 19L bottle balances are accurate.' },
];

export default function MarketingClose() {
  const { date, setDate, status, loading, refreshStatus, isClosed, mmConfirmed, tenant } = useDailyClose();
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const json = await confirmMM(date, tenant);
      if (json.success) {
        toast.success('Marketing confirmed successfully');
        refreshStatus(false);
      } else {
        toast.error(json.message || 'Failed to confirm');
      }
    } catch { toast.error('Error confirming marketing'); }
    finally { setSubmitting(false); }
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
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <DailyCloseHeader
        label="MARKETING & SALES"
        labelColor="purple"
        icon={ShoppingBag}
        title="Marketing Daily Close"
        description="Verify order states and customer bottle balances."
        date={date}
        onDateChange={setDate}
      />

      {isClosed ? (
        <ClosedDayBanner date={date} closedBy={status?.closedBy} closedAt={status?.closedAt} />
      ) : (
        <>
          {/* Marketing Stats */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Sales Summary</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-purple-50/50 p-4 rounded-xl border border-purple-100">
              <div>
                <p className="text-xs text-slate-500 font-semibold">Total Orders</p>
                <p className="text-xl font-black text-purple-900">{m.ordersCount || 0}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold">Orders Worth</p>
                <p className="text-xl font-black text-emerald-800">Rs {Number(m.ordersTotalWorth || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold">19L With Customers</p>
                <p className="text-xl font-black text-blue-900">{m.customerBottlesCount || 0}</p>
              </div>
            </div>
          </div>

          {/* MM Checklist */}
          <VerificationChecklist
            key={date}
            title="Marketing Verification"
            subtitle="Verified by Marketing Manager"
            items={MM_CHECKLIST}
            onConfirm={handleConfirm}
            confirmLabel="Confirm Marketing Close"
            confirmed={mmConfirmed}
            confirmedBy={status?.mmConfirmedBy?.name}
            submitting={submitting}
          />
        </>
      )}
    </div>
  );
}
