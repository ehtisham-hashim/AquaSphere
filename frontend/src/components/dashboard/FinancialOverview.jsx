import { Wallet, CreditCard, Receipt, ShoppingCart } from 'lucide-react';
import StatCard from '../ui/StatCard';

export default function FinancialOverview({ data, role }) {
  const isMarketing = role === 'MARKETING_MANAGER';

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Wallet size={20} className="text-slate-400" />
        <h2 className="text-lg font-bold text-slate-800 tracking-tight">
          {isMarketing ? 'Sales & Revenue Overview' : 'Financial Overview'}
        </h2>
      </div>
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${isMarketing ? 'lg:grid-cols-3' : 'lg:grid-cols-4 xl:grid-cols-5'} gap-4`}>
        <StatCard
          title="TODAY'S SALES"
          value={`Rs. ${Number(data?.sales || 0).toLocaleString()}`}
          subtext="Total sales value today"
          colorClass="text-sky-600 bg-sky-50"
          icon={Wallet}
        />
        <StatCard
          title="CASH COLLECTED"
          value={`Rs. ${Number(data?.cash || 0).toLocaleString()}`}
          subtext="Cash received today"
          colorClass="text-emerald-600 bg-emerald-50"
          icon={CreditCard}
        />
        <StatCard
          title="CREDIT SALES"
          value={`Rs. ${Number(data?.credit || 0).toLocaleString()}`}
          subtext="Billed on credit today"
          colorClass="text-orange-600 bg-orange-50"
          icon={CreditCard}
        />
        {!isMarketing && (
          <>
            <StatCard
              title="EXPENSES TODAY"
              value={`Rs. ${Number(data?.expenses || 0).toLocaleString()}`}
              subtext="Logged operating cost"
              colorClass="text-rose-600 bg-rose-50"
              icon={Receipt}
            />
            <StatCard
              title="TODAY'S PURCHASES"
              value={`Rs. ${Number(data?.todaysPurchases || 0).toLocaleString()}`}
              subtext={`${data?.todaysPurchasesCount || 0} purchase logs`}
              colorClass="text-purple-600 bg-purple-50"
              icon={ShoppingCart}
            />
          </>
        )}
      </div>
    </section>
  );
}
