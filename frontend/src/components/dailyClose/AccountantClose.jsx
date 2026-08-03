import { useState, useEffect } from 'react';
import { DollarSign, RefreshCw } from 'lucide-react';
import { useDailyClose } from '../../hooks/useDailyClose';
import { fetchDailySummary } from '../../services/dailyCloseService';
import DailyCloseHeader from './DailyCloseHeader';
import ClosedDayBanner from './ClosedDayBanner';
import StatusCard from './StatusCard';

// ponytail: read-only dashboard, no confirm — schema has no accountantConfirmed field
export default function AccountantClose() {
  const { date, setDate, status, loading, isClosed, pmConfirmed, mmConfirmed, tenant } = useDailyClose();
  const [cash, setCash] = useState(null);

  useEffect(() => {
    fetchDailySummary(date, tenant).then(json => {
      if (json.success) {
        const d = json.data;
        setCash({
          orderCash: d.totalDeliveryAmount || 0,
          counterSales: d.totalSpotSales || 0,
          totalExpenses: d.totalExpenses || 0,
          netCash: (d.totalDeliveryAmount || 0) + (d.totalSpotSales || 0) - (d.totalExpenses || 0)
        });
      }
    }).catch(() => setCash({ orderCash: 0, counterSales: 0, totalExpenses: 0, netCash: 0 }));
  }, [date, tenant]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <DailyCloseHeader
        label="ACCOUNTING & FINANCE"
        labelColor="emerald"
        icon={DollarSign}
        title="Accountant Daily Close"
        description="Review cash collections, expenses, and daily financial records."
        date={date}
        onDateChange={setDate}
      />

      {isClosed ? (
        <ClosedDayBanner date={date} closedBy={status?.closedBy} closedAt={status?.closedAt} />
      ) : (
        <>
          {/* Cash Summary */}
          {cash && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Financial Summary</h3>
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Order Cash</span>
                  <span className="text-base font-black text-blue-900">Rs. {cash.orderCash.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Counter Sales</span>
                  <span className="text-base font-black text-emerald-800">Rs. {cash.counterSales.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Total Expenses</span>
                  <span className="text-base font-black text-rose-700">Rs. {cash.totalExpenses.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Net Cash</span>
                  <span className={`text-base font-black ${cash.netCash >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
                    Rs. {cash.netCash.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Close Status */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Day Close Status</h3>
            <StatusCard label="Production (PM)" confirmed={pmConfirmed} confirmedBy={status?.pmConfirmedBy?.name} />
            <StatusCard label="Marketing (MM)" confirmed={mmConfirmed} confirmedBy={status?.mmConfirmedBy?.name} />
            <StatusCard label="Admin Finalization" confirmed={isClosed} confirmedBy={status?.closedBy?.name} />
          </div>
        </>
      )}
    </div>
  );
}
