import { useState, useEffect } from 'react';
import { 
  AlertTriangle, Clock, Truck, Receipt, 
  Package, ShieldAlert, PhoneCall, RefreshCw, XCircle
} from 'lucide-react';
import { API_URL } from '../../utils/api';
import { getCompanyFromCookie } from '../../utils/companyCookie';

export default function AlertsSection() {
  const tenant = getCompanyFromCookie();
  const [alerts, setAlerts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [custAlerts, setCustAlerts] = useState(null);

  const fetchAlerts = async () => {
    setLoading(true);
    setError(false);
    try {
      const [mmRes, custRes] = await Promise.all([
        fetch(`${API_URL}/analytics/mm-alerts`, { headers: { 'x-tenant': tenant }, credentials: 'include' }),
        fetch(`${API_URL}/admin-dashboard/customer-alerts`, { headers: { 'x-tenant': tenant }, credentials: 'include' })
      ]);

      const mmJson = await mmRes.json();
      const custJson = await custRes.json();

      if (mmJson.success) setAlerts(mmJson.data);
      if (custJson.success) setCustAlerts(custJson.data);
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Loading Alerts...</p>
      </div>
    );
  }

  if (error || !alerts) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-rose-200 shadow-sm bg-rose-50/50">
        <XCircle className="w-10 h-10 text-rose-400 mb-4" />
        <p className="text-rose-600 font-bold">Failed to load alerts</p>
        <button onClick={fetchAlerts} className="mt-4 px-4 py-2 bg-rose-100 text-rose-700 rounded-lg text-sm font-semibold hover:bg-rose-200 transition">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Delivery Summary */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between col-span-1 md:col-span-2 lg:col-span-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
          <div>
            <h3 className="text-sm font-bold text-blue-800 flex items-center gap-2 mb-4 uppercase tracking-wider">
              <Truck className="w-5 h-5 text-blue-600" />
              Today's Delivery Summary
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/80 p-4 rounded-xl border border-blue-100 shadow-sm text-center">
                <p className="text-3xl font-black text-blue-600">{alerts.todaysDeliverySummary?.PENDING || 0}</p>
                <p className="text-xs font-semibold text-slate-500 mt-1 uppercase">Pending</p>
              </div>
              <div className="bg-white/80 p-4 rounded-xl border border-emerald-100 shadow-sm text-center">
                <p className="text-3xl font-black text-emerald-600">{alerts.todaysDeliverySummary?.DELIVERED || 0}</p>
                <p className="text-xs font-semibold text-slate-500 mt-1 uppercase">Completed</p>
              </div>
              <div className="bg-white/80 p-4 rounded-xl border border-rose-100 shadow-sm text-center">
                <p className="text-3xl font-black text-rose-600">{alerts.todaysDeliverySummary?.CANCELLED || 0}</p>
                <p className="text-xs font-semibold text-slate-500 mt-1 uppercase">Cancelled</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Deliveries Total */}
        <AlertStatCard 
          icon={<Truck className="w-6 h-6 text-amber-600" />}
          title="Pending Deliveries"
          value={alerts.pendingDeliveriesCount}
          subtitle="Orders waiting to be delivered today"
          bgColor="bg-amber-50"
          borderColor="border-amber-100"
          valueColor="text-amber-700"
        />

        {/* Pending Payments */}
        <AlertStatCard 
          icon={<Receipt className="w-6 h-6 text-rose-600" />}
          title="Pending Payments"
          value={alerts.pendingPayments?.length || 0}
          subtitle="Delivered but unpaid"
          bgColor="bg-rose-50"
          borderColor="border-rose-100"
          valueColor="text-rose-700"
        />
        
        {/* Outstanding 19L Bottles */}
        <AlertStatCard 
          icon={<Package className="w-6 h-6 text-indigo-600" />}
          title="Outstanding 19L Bottles"
          value={alerts.outstandingBottles?.length || 0}
          subtitle="Customers holding unreturned bottles"
          bgColor="bg-indigo-50"
          borderColor="border-indigo-100"
          valueColor="text-indigo-700"
        />

        {/* Security Deposit Warning */}
        <AlertStatCard 
          icon={<ShieldAlert className="w-6 h-6 text-purple-600" />}
          title="Security Deposit Risks"
          value={alerts.securityDepositWarnings?.length || 0}
          subtitle="Bottle balance exceeds deposit coverage"
          bgColor="bg-purple-50"
          borderColor="border-purple-100"
          valueColor="text-purple-700"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inactive Customers (No order in 7+ days) Alert */}
        <AlertListCard 
          title="Inactive Customers (No Order 7+ Days)"
          icon={<PhoneCall className="w-5 h-5 text-rose-500" />}
          count={custAlerts?.inactiveCustomers?.length}
          items={custAlerts?.inactiveCustomers || []}
          emptyMsg="No inactive customers (all active within 7 days)."
          renderItem={(c) => (
            <div key={c.id} className="py-3 flex flex-col justify-center text-sm border-b border-slate-100 last:border-0 hover:bg-slate-50 p-2 rounded-lg transition-colors">
              <div className="flex justify-between items-center mb-1">
                <div>
                  <span className="font-bold text-slate-800 block">{c.name}</span>
                  <span className="text-[11px] text-slate-400 block">{c.phone}</span>
                </div>
                <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-extrabold text-[10px] rounded-md">
                  {c.daysSinceLastOrder} days inactive
                </span>
              </div>
              <p className="text-[11px] font-bold text-rose-700 bg-rose-50 p-1.5 rounded border border-rose-100 mt-1">
                📞 {c.recommendation}
              </p>
            </div>
          )}
        />

        {/* Credit Limit & Overdue Bill Alerts */}
        <AlertListCard 
          title="Credit Limit & Overdue Invoices"
          icon={<AlertTriangle className="w-5 h-5 text-amber-500" />}
          count={(custAlerts?.creditBreaches?.length || 0) + (custAlerts?.unpaidBillOver7Days?.length || 0)}
          items={[...(custAlerts?.creditBreaches || []), ...(custAlerts?.unpaidBillOver7Days || [])]}
          emptyMsg="No overdue credit or unpaid bill breaches."
          renderItem={(c, idx) => (
            <div key={idx} className="py-3 flex flex-col justify-center text-sm border-b border-slate-100 last:border-0 hover:bg-slate-50 p-2 rounded-lg transition-colors">
              <div className="flex justify-between items-center mb-1">
                <div>
                  <span className="font-bold text-slate-800 block">{c.name}</span>
                  <span className="text-[11px] text-slate-400 block">{c.phone}</span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-black text-rose-600 block">Rs. {Number(c.currentBalance || c.unpaidAmount || 0).toLocaleString()}</span>
                  {c.creditLimit > 0 && <span className="text-[10px] text-slate-400">Limit: Rs. {Number(c.creditLimit).toLocaleString()}</span>}
                </div>
              </div>
              <p className="text-[11px] font-bold text-amber-800 bg-amber-50 p-1.5 rounded border border-amber-200 mt-1">
                🧾 {c.recommendation}
              </p>
            </div>
          )}
        />

        {/* Customer Reminders */}
        <AlertListCard 
          title="Customer Reminders"
          icon={<Clock className="w-5 h-5 text-sky-500" />}
          count={alerts.customerReminders?.length}
          items={alerts.customerReminders}
          emptyMsg="No active reminders."
          renderItem={(c) => (
            <div key={c.id} className="py-3 flex flex-col justify-center text-sm border-b border-slate-50 last:border-0 hover:bg-slate-50 p-2 rounded-lg transition-colors">
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-slate-800">{c.name}</span>
                <span className="text-[10px] font-medium text-slate-400">{c.phone}</span>
              </div>
              <p className="text-xs text-sky-700 bg-sky-50 p-2 rounded border border-sky-100 italic">
                "{c.remarks}"
              </p>
            </div>
          )}
        />
      </div>
    </div>
  );
}

function AlertStatCard({ icon, title, value, subtitle, bgColor, borderColor, valueColor }) {
  return (
    <div className={`p-5 rounded-2xl border shadow-sm flex flex-col h-full justify-between transition-all hover:-translate-y-1 hover:shadow-md ${bgColor} ${borderColor}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="p-2.5 rounded-xl bg-white shadow-sm border border-black/5">
          {icon}
        </div>
      </div>
      <div>
        <p className={`text-3xl font-black tracking-tight ${valueColor}`}>{value}</p>
        <h4 className="text-[11px] font-bold text-slate-600 tracking-wider mt-1.5 uppercase">{title}</h4>
        <p className="text-[10px] text-slate-500 mt-1">{subtitle}</p>
      </div>
    </div>
  );
}

function AlertListCard({ title, icon, count = 0, items = [], emptyMsg, renderItem }) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col max-h-[400px]">
      <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          {icon}
          {title}
        </h3>
        {count > 0 && (
          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-bold text-xs rounded-lg">
            {count}
          </span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
        {items.length === 0 ? (
          <div className="h-full flex items-center justify-center py-8">
            <p className="text-xs text-slate-400 font-medium">{emptyMsg}</p>
          </div>
        ) : (
          <div className="space-y-1">
            {items.map(renderItem)}
          </div>
        )}
      </div>
    </div>
  );
}
