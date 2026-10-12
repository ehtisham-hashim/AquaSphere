import { useState, useMemo } from 'react';
import { Wallet, CreditCard, Receipt, ShoppingCart } from 'lucide-react';
import DashboardKpiCard from './DashboardKpiCard';
import { TimeframeDropdown } from '../ui';

export default function FinancialOverview({ data, role }) {
  const [timeframe, setTimeframe] = useState('1_MONTH');
  const isMarketing = role === 'MARKETING_MANAGER';

  const activeData = useMemo(() => {
    if (!data) return {};
    let tfKey;
    if (timeframe === 'TODAY' || timeframe === 'DAILY') {
      tfKey = 'daily';
    } else if (timeframe === 'YESTERDAY') {
      tfKey = 'yesterday';
    } else if (timeframe === 'LAST_3_DAYS') {
      tfKey = 'last3Days';
    } else if (timeframe === '1_WEEK' || timeframe === 'WEEKLY') {
      tfKey = 'week';
    } else if (timeframe === '1_YEAR' || timeframe === 'YEARLY') {
      tfKey = 'yearly';
    } else if (timeframe === '1_MONTH' || timeframe === 'MONTHLY') {
      tfKey = 'monthly';
    } else {
      tfKey = timeframe.toLowerCase();
    }

    if (data[tfKey]) return data[tfKey];

    const history = data.dailySalesHistory || [];
    if (history.length > 0) {
      const now = new Date();
      const getDStr = (offset) => {
        const d = new Date(now);
        d.setDate(now.getDate() - offset);
        return d.toISOString().split('T')[0];
      };

      if (timeframe === 'YESTERDAY') {
        const yStr = getDStr(1);
        const yItem = history.find(h => h.date === yStr);
        if (yItem) {
          return {
            sales: Number(yItem.sales || 0),
            cash: Number(yItem.cashCollected || yItem.cash || 0),
            credit: Number(yItem.creditBilled || yItem.credit || 0),
            expenses: Number(yItem.expenses || 0),
            netCash: Number(yItem.netCash ?? ((Number(yItem.cashCollected || 0)) - (Number(yItem.expenses || 0)))),
            purchases: Number(yItem.purchases || 0),
            purchasesCount: 0,
            bottlesSold: Number(yItem.ordersCount || 0)
          };
        }
      } else if (timeframe === 'LAST_3_DAYS') {
        const d0 = getDStr(0), d1 = getDStr(1), d2 = getDStr(2);
        const matched = history.filter(h => [d0, d1, d2].includes(h.date));
        if (matched.length > 0) {
          const s = matched.reduce((acc, h) => acc + Number(h.sales || 0), 0);
          const c = matched.reduce((acc, h) => acc + Number(h.cashCollected || h.cash || 0), 0);
          const e = matched.reduce((acc, h) => acc + Number(h.expenses || 0), 0);
          const cr = matched.reduce((acc, h) => acc + Number(h.creditBilled || h.credit || 0), 0);
          const ord = matched.reduce((acc, h) => acc + Number(h.ordersCount || 0), 0);
          return {
            sales: s,
            cash: c,
            credit: cr,
            expenses: e,
            netCash: c - e,
            purchases: matched.reduce((acc, h) => acc + Number(h.purchases || 0), 0),
            purchasesCount: 0,
            bottlesSold: ord
          };
        }
      } else if (timeframe === '1_WEEK' || timeframe === 'WEEKLY') {
        const last7 = history.slice(-7);
        if (last7.length > 0) {
          const s = last7.reduce((acc, h) => acc + Number(h.sales || 0), 0);
          const c = last7.reduce((acc, h) => acc + Number(h.cashCollected || h.cash || 0), 0);
          const e = last7.reduce((acc, h) => acc + Number(h.expenses || 0), 0);
          const cr = last7.reduce((acc, h) => acc + Number(h.creditBilled || h.credit || 0), 0);
          const ord = last7.reduce((acc, h) => acc + Number(h.ordersCount || 0), 0);
          return {
            sales: s,
            cash: c,
            credit: cr,
            expenses: e,
            netCash: c - e,
            purchases: last7.reduce((acc, h) => acc + Number(h.purchases || 0), 0),
            purchasesCount: 0,
            bottlesSold: ord
          };
        }
      }
    }

    const fallback = tfKey === 'monthly' ? (data.monthly || data) : (data.daily || data);
    return {
      sales: Number(fallback?.sales ?? data.sales ?? 0),
      cash: Number(fallback?.cash ?? data.cash ?? 0),
      credit: Number(fallback?.credit ?? data.credit ?? 0),
      expenses: Number(fallback?.expenses ?? data.expenses ?? 0),
      netCash: Number(fallback?.netCash ?? ((Number(fallback?.cash ?? 0)) - (Number(fallback?.expenses ?? 0)))),
      purchases: Number(fallback?.purchases ?? data.purchases ?? data.monthlyPurchases ?? data.todaysPurchases ?? 0),
      purchasesCount: Number(fallback?.purchasesCount ?? data.purchasesCount ?? data.todaysPurchasesCount ?? 0),
      bottlesSold: Number(fallback?.bottlesSold ?? data.bottlesSold ?? 0)
    };
  }, [data, timeframe]);

  const getTimeLabel = (base) => {
    if (timeframe === 'DAILY' || timeframe === 'TODAY') return `${base} (TODAY)`;
    if (timeframe === 'YESTERDAY') return `${base} (YESTERDAY)`;
    if (timeframe === 'LAST_3_DAYS') return `${base} (LAST 3 DAYS)`;
    if (timeframe === '1_WEEK') return `${base} (THIS WEEK)`;
    if (timeframe === 'YEARLY' || timeframe === '1_YEAR') return `${base} (THIS YEAR)`;
    return `${base} (THIS MONTH)`;
  };

  const getTimeSubtitle = (base) => {
    const period = (timeframe === 'DAILY' || timeframe === 'TODAY') ? 'today'
      : timeframe === 'YESTERDAY' ? 'yesterday'
      : timeframe === 'LAST_3_DAYS' ? 'past 3 days'
      : timeframe === '1_WEEK' ? 'this week'
      : (timeframe === 'YEARLY' || timeframe === '1_YEAR') ? 'this year'
      : 'this month';
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
