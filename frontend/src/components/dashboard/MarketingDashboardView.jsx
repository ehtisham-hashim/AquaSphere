import { Wallet, CreditCard, ShieldAlert, TrendingUp, Users } from 'lucide-react';
import DashboardKpiCard from './DashboardKpiCard';
import AlertsSection from './AlertsSection';
import { getCompanyFromCookie } from '../../utils/companyCookie';

export default function MarketingDashboardView({ data }) {
  const tenant = getCompanyFromCookie();
  const companyTitle = tenant === 'wadaana' ? 'Wadaana Industries' : 'AquaSphere';

  return (
    <div className="space-y-8 p-2 max-w-[98%] mx-auto pb-10">
      {/* Top Banner */}
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-sky-100 text-sky-800 border border-sky-300">
              {companyTitle} • MARKETING
            </span>
            <span className="text-xs text-slate-500 font-medium">Sales Growth & Customer Control</span>
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight mt-1">Marketing & Sales Performance</h1>
        </div>
      </div>

      {/* 1. Marketing Sales KPIs */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={20} className="text-slate-400" />
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">Sales & Revenue Overview</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <DashboardKpiCard icon={<Wallet />} title="TODAY'S SALES" value={`Rs. ${Number(data?.sales || 0).toLocaleString()}`} subtitle={`${data?.bottlesSold || 0} orders recorded`} color="text-sky-600" bg="bg-sky-50" border="border-sky-100" />
          <DashboardKpiCard icon={<CreditCard />} title="CASH COLLECTED" value={`Rs. ${Number(data?.cash || 0).toLocaleString()}`} subtitle="Cash received today" color="text-emerald-600" bg="bg-emerald-50" border="border-emerald-100" />
          <DashboardKpiCard icon={<CreditCard />} title="CREDIT SALES" value={`Rs. ${Number(data?.credit || 0).toLocaleString()}`} subtitle="Billed on credit today" color="text-orange-600" bg="bg-orange-50" border="border-orange-100" />
        </div>
      </section>

      {/* 2. Marketing & Operations Customer Alerts */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <ShieldAlert size={20} className="text-slate-400" />
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">Customer Credit & Inactivity Alerts</h2>
        </div>
        <AlertsSection />
      </section>
    </div>
  );
}
