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
  const [custAlerts, setCustAlerts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchAlerts = async () => {
    setLoading(true);
    setError(false);
    try {
      const [mmRes, custRes] = await Promise.all([
        fetch(`${API_URL}/analytics/mm-alerts?tenant=${tenant}`, { headers: { 'x-tenant': tenant }, credentials: 'include' }).catch(() => null),
        fetch(`${API_URL}/admin/customer-alerts?tenant=${tenant}`, { headers: { 'x-tenant': tenant }, credentials: 'include' }).catch(() => null)
      ]);

      if (mmRes?.ok) {
        const mmJson = await mmRes.json();
        if (mmJson.success) setAlerts(mmJson.data);
      }
      if (custRes?.ok) {
        const custJson = await custRes.json();
        if (custJson.success) setCustAlerts(custJson.data);
      }
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [tenant]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-10 bg-white rounded-2xl border border-slate-200 shadow-2xs">
        <RefreshCw className="w-6 h-6 text-slate-400 animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-500">Loading Customer & Delivery Alerts...</p>
      </div>
    );
  }

  if (error || !alerts) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl border border-slate-200 shadow-2xs text-center">
        <XCircle className="w-8 h-8 text-amber-500 mb-3" />
        <p className="text-slate-800 font-bold text-sm">Failed to load alerts</p>
        <button onClick={fetchAlerts} className="mt-3 px-4 py-1.5 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-700 transition">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Unified Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Delivery Summary - Unified White Container */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs col-span-1 md:col-span-2 lg:col-span-4">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
              <Truck className="w-4 h-4 text-slate-600" />
              Today&apos;s Delivery Summary
            </h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-center">
              <p className="text-2xl font-black text-slate-900">{alerts.todaysDeliverySummary?.PENDING || 0}</p>
              <p className="text-[10px] font-bold text-slate-500 mt-0.5 uppercase tracking-wider">Pending</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-center">
              <p className="text-2xl font-black text-emerald-700">{alerts.todaysDeliverySummary?.DELIVERED || 0}</p>
              <p className="text-[10px] font-bold text-slate-500 mt-0.5 uppercase tracking-wider">Completed</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-center">
              <p className="text-2xl font-black text-rose-600">{alerts.todaysDeliverySummary?.CANCELLED || 0}</p>
              <p className="text-[10px] font-bold text-slate-500 mt-0.5 uppercase tracking-wider">Cancelled</p>
            </div>
          </div>
        </div>

        {/* Pending Deliveries Total */}
        <AlertStatCard 
          icon={<Truck className="w-5 h-5 text-slate-600" />}
          title="Pending Deliveries"
          value={alerts.pendingDeliveriesCount}
          subtitle="Orders waiting to be delivered today"
        />

        {/* Pending Payments */}
        <AlertStatCard 
          icon={<Receipt className="w-5 h-5 text-slate-600" />}
          title="Pending Payments"
          value={alerts.pendingPayments?.length || 0}
          subtitle="Delivered but unpaid"
        />
        
        {/* Outstanding 19L Bottles */}
        <AlertStatCard 
          icon={<Package className="w-5 h-5 text-slate-600" />}
          title="Outstanding 19L Bottles"
          value={alerts.outstandingBottles?.length || 0}
          subtitle="Customers holding unreturned bottles"
        />

        {/* Security Deposit Warning */}
        <AlertStatCard 
          icon={<ShieldAlert className="w-5 h-5 text-slate-600" />}
          title="Security Deposit Risks"
          value={alerts.securityDepositWarnings?.length || 0}
          subtitle="Bottle balance exceeds deposit coverage"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Inactive Customers Alert */}
        <AlertListCard 
          title="Inactive Customers (No Order 7+ Days)"
          icon={<PhoneCall className="w-4 h-4 text-slate-600" />}
          count={custAlerts?.inactiveCustomers?.length}
          items={custAlerts?.inactiveCustomers || []}
          emptyMsg="No inactive customers (all active within 7 days)."
          renderItem={(c) => (
            <div key={c.id} className="py-2.5 flex flex-col justify-center text-xs border-b border-slate-100 last:border-0 hover:bg-slate-50 p-2 rounded-lg transition-colors">
              <div className="flex justify-between items-center mb-1">
                <div>
                  <span className="font-bold text-slate-800 block">{c.name}</span>
                  <span className="text-[10px] text-slate-400 block">{c.phone}</span>
                </div>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold text-[10px] rounded-md">
                  {c.daysSinceLastOrder}d inactive
                </span>
              </div>
              <p className="text-[10px] font-semibold text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-200 mt-1">
                📞 {c.recommendation}
              </p>
            </div>
          )}
        />

        {/* Credit Limit & Overdue Bill Alerts */}
        <AlertListCard 
          title="Credit Limit & Overdue Invoices"
          icon={<AlertTriangle className="w-4 h-4 text-slate-600" />}
          count={(custAlerts?.creditBreaches?.length || 0) + (custAlerts?.unpaidBillOver7Days?.length || 0)}
          items={[...(custAlerts?.creditBreaches || []), ...(custAlerts?.unpaidBillOver7Days || [])]}
          emptyMsg="No overdue credit or unpaid bill breaches."
          renderItem={(c, idx) => (
            <div key={idx} className="py-2.5 flex flex-col justify-center text-xs border-b border-slate-100 last:border-0 hover:bg-slate-50 p-2 rounded-lg transition-colors">
              <div className="flex justify-between items-center mb-1">
                <div>
                  <span className="font-bold text-slate-800 block">{c.name}</span>
                  <span className="text-[10px] text-slate-400 block">{c.phone}</span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-slate-900 block text-xs">Rs. {Number(c.currentBalance || c.unpaidAmount || 0).toLocaleString()}</span>
                  {c.creditLimit > 0 && <span className="text-[10px] text-slate-400">Limit: Rs. {Number(c.creditLimit).toLocaleString()}</span>}
                </div>
              </div>
              <p className="text-[10px] font-semibold text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-200 mt-1">
                🧾 {c.recommendation}
              </p>
            </div>
          )}
        />

        {/* Customer Reminders */}
        <AlertListCard 
          title="Customer Reminders"
          icon={<Clock className="w-4 h-4 text-slate-600" />}
          count={alerts.customerReminders?.length}
          items={alerts.customerReminders}
          emptyMsg="No active reminders."
          renderItem={(c) => (
            <div key={c.id} className="py-2.5 flex flex-col justify-center text-xs border-b border-slate-100 last:border-0 hover:bg-slate-50 p-2 rounded-lg transition-colors">
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-slate-800">{c.name}</span>
                <span className="text-[10px] font-medium text-slate-400">{c.phone}</span>
              </div>
              <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-200 italic">
                &quot;{c.remarks}&quot;
              </p>
            </div>
          )}
        />
      </div>
    </div>
  );
}

function AlertStatCard({ icon, title, value, subtitle }) {
  return (
    <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs flex flex-col justify-between h-full">
      <div className="flex justify-between items-start mb-3">
        <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
          {icon}
        </div>
      </div>
      <div>
        <p className="text-2xl font-black text-slate-900">{value}</p>
        <h4 className="text-[11px] font-bold text-slate-600 tracking-wider mt-1 uppercase">{title}</h4>
        <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

function AlertListCard({ title, icon, count = 0, items = [], emptyMsg, renderItem }) {
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col max-h-[380px]">
      <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
        <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wider">
          {icon}
          {title}
        </h3>
        {count > 0 && (
          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold text-[10px] rounded-md">
            {count}
          </span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
        {items.length === 0 ? (
          <div className="h-full flex items-center justify-center py-6">
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
