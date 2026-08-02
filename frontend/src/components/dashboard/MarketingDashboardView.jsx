import { Wallet, CreditCard, ShieldAlert } from 'lucide-react';
import DashboardKpiCard from './DashboardKpiCard';
import AlertsSection from './AlertsSection';

export default function MarketingDashboardView({ data }) {
  return (
    <div className="space-y-8 p-2 max-w-[98%] mx-auto">
      {/* 1. Marketing Sales KPIs */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Wallet size={20} className="text-slate-400" />
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">Sales & Revenue Performance</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <DashboardKpiCard icon={<Wallet />} title="TODAY'S SALES" value={`Rs. ${Number(data.sales || 0).toLocaleString()}`} subtitle="Total sales value" color="text-sky-600" bg="bg-sky-50" border="border-sky-100" />
          <DashboardKpiCard icon={<CreditCard />} title="CASH COLLECTED" value={`Rs. ${Number(data.cash || 0).toLocaleString()}`} subtitle="Cash received today" color="text-emerald-600" bg="bg-emerald-50" border="border-emerald-100" />
          <DashboardKpiCard icon={<CreditCard />} title="CREDIT SALES" value={`Rs. ${Number(data.credit || 0).toLocaleString()}`} subtitle="Billed on credit" color="text-orange-600" bg="bg-orange-50" border="border-orange-100" />
        </div>
      </section>

      {/* 2. Marketing & Operations Customer Alerts */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <ShieldAlert size={20} className="text-slate-400" />
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">Customer & Order Alerts</h2>
        </div>
        <AlertsSection />
      </section>
    </div>
  );
}
