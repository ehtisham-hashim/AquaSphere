import { useState, useMemo } from 'react';
import { Wallet, CreditCard, Receipt, ShoppingCart } from 'lucide-react';
import DashboardKpiCard from './DashboardKpiCard';
import { TimeframeDropdown } from '../ui';

export default function FinancialOverview({ data, role }) {
  const [timeframe, setTimeframe] = useState('MONTHLY');
  const isMarketing = role === 'MARKETING_MANAGER';

  const activeData = useMemo(() => {
    if (!data) return {};
    const tfKey = timeframe.toLowerCase();
    if (data[tfKey]) return data[tfKey];
    return {
      sales: Number(data.sales || 0),
      cash: Number(data.cash || 0),
      credit: Number(data.credit || 0),
      expenses: Number(data.expenses || 0),
      netCash: Number(data.netCash || (Number(data.cash || 0) - Number(data.expenses || 0))),
      purchases: Number(data.purchases || data.monthlyPurchases || data.todaysPurchases || 0),
      purchasesCount: Number(data.purchasesCount || data.todaysPurchasesCount || 0),
      bottlesSold: Number(data.bottlesSold || 0)
    };
  }, [data, timeframe]);

  const getTimeLabel = (base) => {
    if (timeframe === 'DAILY') return `${base} (TODAY)`;
    if (timeframe === 'YEARLY') return `${base} (THIS YEAR)`;
    return `${base} (THIS MONTH)`;
  };

  const getTimeSubtitle = (base) => {
    const period = timeframe === 'DAILY' ? 'today' : timeframe === 'YEARLY' ? 'this year' : 'this month';
    return `${base} ${period}`;
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Wallet size={20} className="text-slate-400" />
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">
            {isMarketing ? 'Sales & Revenue Overview' : 'Executive Financial Overview'}
          </h2>
        </div>

        {/* Time Horizon Selector Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Timeframe:</span>
          <TimeframeDropdown value={timeframe} onChange={setTimeframe} />
        </div>
      </div>

      <div className={`grid grid-cols-1 sm:grid-cols-2 ${isMarketing ? 'lg:grid-cols-3' : 'lg:grid-cols-4 xl:grid-cols-5'} gap-4`}>
        <DashboardKpiCard
          icon={<Wallet />}
          title={getTimeLabel('SALES')}
          value={`₨ ${Number(activeData?.sales || 0).toLocaleString()}`}
          subtitle={`${activeData?.bottlesSold || 0} orders ${timeframe === 'DAILY' ? 'today' : timeframe === 'MONTHLY' ? 'this month' : 'this year'}`}
          color="text-brand-primary"
          bg="bg-brand-muted"
          border="border-slate-200"
        />

        <DashboardKpiCard
          icon={<CreditCard />}
          title={getTimeLabel('CASH COLLECTED')}
          value={`₨ ${Number(activeData?.cash || 0).toLocaleString()}`}
          subtitle={getTimeSubtitle('Cash received')}
          color="text-emerald-700"
          bg="bg-emerald-50"
          border="border-slate-200"
        />

        <DashboardKpiCard
          icon={<CreditCard />}
          title={getTimeLabel('CREDIT SALES')}
          value={`₨ ${Number(activeData?.credit || 0).toLocaleString()}`}
          subtitle={getTimeSubtitle('Billed on credit')}
          color="text-amber-700"
          bg="bg-amber-50"
          border="border-slate-200"
        />

        {!isMarketing && (
          <>
            <DashboardKpiCard
              icon={<Receipt />}
              title={getTimeLabel('EXPENSES')}
              value={`₨ ${Number(activeData?.expenses || 0).toLocaleString()}`}
              subtitle={getTimeSubtitle('Logged operating cost')}
              color="text-rose-600"
              bg="bg-rose-50"
              border="border-slate-200"
            />

            <DashboardKpiCard
              icon={<ShoppingCart />}
              title={getTimeLabel('PURCHASES')}
              value={`₨ ${Number(activeData?.purchases || 0).toLocaleString()}`}
              subtitle={`${activeData?.purchasesCount || 0} purchase logs`}
              color="text-indigo-700"
              bg="bg-indigo-50"
              border="border-slate-200"
            />
          </>
        )}
      </div>
    </section>
  );
}
