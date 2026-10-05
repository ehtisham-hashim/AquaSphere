import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ShieldAlert, 
  Truck, 
  Receipt, 
  Package, 
  Clock, 
  PhoneCall, 
  MessageSquare, 
  CheckCircle2, 
  Search, 
  RefreshCw, 
  AlertTriangle 
} from 'lucide-react';
import { API_URL } from '../../utils/api';
import { useTenant } from '../../context/TenantContext';
import { useLiveEvent } from '../../context/SSEContext';
import { openWhatsAppWeb, WhatsAppTemplates } from '../../utils/whatsapp';
import BottleCustodyWidget from './BottleCustodyWidget';

export default function CustomerRiskHub({ className = '' }) {
  const { tenant, isWadaana } = useTenant();
  const [mmAlerts, setMmAlerts] = useState(null);
  const [custAlerts, setCustAlerts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(isWadaana ? 'overdue' : 'bottles');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchRiskData = useCallback(async () => {
    try {
      const [mmRes, custRes] = await Promise.all([
        fetch(`${API_URL}/analytics/mm-alerts?tenant=${tenant}`, {
          headers: { 'x-tenant': tenant },
          credentials: 'include'
        }).catch(() => null),
        fetch(`${API_URL}/admin/customer-alerts?tenant=${tenant}`, {
          headers: { 'x-tenant': tenant },
          credentials: 'include'
        }).catch(() => null)
      ]);

      if (mmRes?.ok) {
        const mmJson = await mmRes.json();
        if (mmJson.success) setMmAlerts(mmJson.data);
      }
      if (custRes?.ok) {
        const custJson = await custRes.json();
        if (custJson.success) setCustAlerts(custJson.data);
      }
    } catch (err) {
      console.error('Error fetching risk & custody alerts:', err);
    } finally {
      setLoading(false);
    }
  }, [tenant]);

  useEffect(() => {
    fetchRiskData();
  }, [fetchRiskData]);

  useLiveEvent(['ORDER_CREATED', 'ORDER_UPDATED', 'CUSTOMER_UPDATED', 'DAILY_CLOSE_SUBMITTED'], fetchRiskData);

  // Derived collections
  const overdueList = useMemo(() => {
    return custAlerts?.unpaidBillOver7Days || [];
  }, [custAlerts]);

  const inactiveList = useMemo(() => {
    return custAlerts?.inactiveCustomers || [];
  }, [custAlerts]);

  const remindersList = useMemo(() => {
    return mmAlerts?.customerReminders || [];
  }, [mmAlerts]);

  const outstandingBottlesCount = mmAlerts?.outstandingBottles?.length || 0;
  const depositRisksCount = mmAlerts?.securityDepositWarnings?.length || 0;

  const totalOverdueAmount = useMemo(() => {
    return overdueList.reduce((sum, c) => sum + Number(c.currentBalance || c.unpaidAmount || 0), 0);
  }, [overdueList]);

  // Tab counts
  const tabCounts = {
    bottles: outstandingBottlesCount,
    overdue: overdueList.length,
    inactive: inactiveList.length,
    reminders: remindersList.length
  };

  // Filtered lists based on search
  const filteredOverdue = useMemo(() => {
    if (!searchQuery.trim()) return overdueList;
    const q = searchQuery.toLowerCase();
    return overdueList.filter(c => 
      (c.name || '').toLowerCase().includes(q) || 
      (c.phone || '').includes(q)
    );
  }, [overdueList, searchQuery]);

  const filteredInactive = useMemo(() => {
    if (!searchQuery.trim()) return inactiveList;
    const q = searchQuery.toLowerCase();
    return inactiveList.filter(c => 
      (c.name || '').toLowerCase().includes(q) || 
      (c.phone || '').includes(q)
    );
  }, [inactiveList, searchQuery]);

  const filteredReminders = useMemo(() => {
    if (!searchQuery.trim()) return remindersList;
    const q = searchQuery.toLowerCase();
    return remindersList.filter(c => 
      (c.name || '').toLowerCase().includes(q) || 
      (c.phone || '').includes(q) ||
      (c.remarks || '').toLowerCase().includes(q)
    );
  }, [remindersList, searchQuery]);

  const deliverySummary = mmAlerts?.todaysDeliverySummary || { PENDING: 0, DELIVERED: 0, CANCELLED: 0 };

  return (
    <div className={`card-surface p-4 sm:p-5 space-y-4 ${className}`}>
      {/* 1. Header & Live Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
            <ShieldAlert size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              Customer Risk & Credit Intelligence
              <span className="badge-brand text-[10px] py-0.5 px-2">Operational Health</span>
            </h3>
            <p className="text-xs text-slate-500">
              Real-time oversight on delivery pipeline, credit risk, overdue accounts, and 19L bottle custody
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchRiskData}
          disabled={loading}
          className="btn-secondary py-1 px-2.5 text-xs text-slate-600 hover:text-slate-900 inline-flex items-center gap-1.5 self-start sm:self-auto"
          title="Refresh alerts"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin text-brand' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* 2. Top Compact KPI Ribbon (High-density single strip) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Today's Deliveries */}
        <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/80 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-sky-100/70 text-sky-700 shrink-0">
            <Truck size={16} />
          </div>
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-base font-black text-slate-900">{deliverySummary.PENDING}</span>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pending</span>
            </div>
            <p className="text-[10px] text-slate-500 truncate">
              <strong className="text-emerald-700">{deliverySummary.DELIVERED}</strong> delivered · <strong className="text-rose-600">{deliverySummary.CANCELLED}</strong> cancelled
            </p>
          </div>
        </div>

        {/* Overdue Invoices */}
        <div className={`p-3 rounded-xl border flex items-center gap-3 transition-colors ${
          tabCounts.overdue > 0 ? 'bg-rose-50/40 border-rose-200/80' : 'bg-slate-50/80 border-slate-200/80'
        }`}>
          <div className={`p-2 rounded-lg shrink-0 ${
            tabCounts.overdue > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
          }`}>
            <Receipt size={16} />
          </div>
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-base font-black text-slate-900">Rs. {totalOverdueAmount.toLocaleString()}</span>
            </div>
            <p className="text-[10px] text-slate-500 truncate">
              {tabCounts.overdue > 0 ? (
                <span className="text-rose-700 font-bold">{tabCounts.overdue} overdue accounts (&gt;7d)</span>
              ) : (
                'Zero overdue bills detected'
              )}
            </p>
          </div>
        </div>

        {/* 19L Bottle Custody (AquaSphere) or Pending Payments (Wadaana) */}
        {!isWadaana ? (
          <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/80 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100/70 text-amber-700 shrink-0">
              <Package size={16} />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="font-mono text-base font-black text-slate-900">{tabCounts.bottles}</span>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Clients</span>
              </div>
              <p className="text-[10px] text-slate-500 truncate">
                Accounts holding unreturned bottles
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/80 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-100/70 text-sky-700 shrink-0">
              <Clock size={16} />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="font-mono text-base font-black text-slate-900">{mmAlerts?.pendingPayments?.length || 0}</span>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Unpaid</span>
              </div>
              <p className="text-[10px] text-slate-500 truncate">
                Delivered orders awaiting collection
              </p>
            </div>
          </div>
        )}

        {/* Deposit Risks */}
        <div className={`p-3 rounded-xl border flex items-center gap-3 transition-colors ${
          depositRisksCount > 0 ? 'bg-amber-50/40 border-amber-200/80' : 'bg-slate-50/80 border-slate-200/80'
        }`}>
          <div className={`p-2 rounded-lg shrink-0 ${
            depositRisksCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
          }`}>
            <AlertTriangle size={16} />
          </div>
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-base font-black text-slate-900">{depositRisksCount}</span>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Accounts</span>
            </div>
            <p className="text-[10px] text-slate-500 truncate">
              {depositRisksCount > 0 ? (
                <span className="text-amber-700 font-bold">Bottle balance exceeds deposit</span>
              ) : (
                'All deposits cover bottle custody'
              )}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Tab Switcher & Integrated Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-100">
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200/80">
          {!isWadaana && (
            <button
              type="button"
              onClick={() => setActiveTab('bottles')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'bottles'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Package size={13} />
              <span>19L Bottle Custody</span>
              {tabCounts.bottles > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  activeTab === 'bottles' ? 'bg-sky-100 text-sky-800' : 'bg-slate-200 text-slate-700'
                }`}>
                  {tabCounts.bottles}
                </span>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('overdue')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'overdue'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Receipt size={13} />
            <span>Overdue Invoices (&gt;7d)</span>
            {tabCounts.overdue > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                activeTab === 'overdue' ? 'bg-rose-100 text-rose-800' : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}>
                {tabCounts.overdue}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('inactive')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'inactive'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PhoneCall size={13} />
            <span>Inactive Accounts (7+d)</span>
            {tabCounts.inactive > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                activeTab === 'inactive' ? 'bg-slate-200 text-slate-800' : 'bg-slate-200 text-slate-700'
              }`}>
                {tabCounts.inactive}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reminders')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'reminders'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock size={13} />
            <span>Customer Reminders</span>
            {tabCounts.reminders > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                activeTab === 'reminders' ? 'bg-slate-200 text-slate-800' : 'bg-slate-200 text-slate-700'
              }`}>
                {tabCounts.reminders}
              </span>
            )}
          </button>
        </div>

        {activeTab !== 'bottles' && (
          <div className="relative max-w-xs w-full sm:w-60">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
            <input
              type="search"
              placeholder="Filter customer or phone..."
              className="input-base pl-8 py-1.5 text-xs w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* 4. Tab Content Area */}
      <div className="pt-1">
        {/* Tab 1: 19L Bottle Custody & Recovery */}
        {activeTab === 'bottles' && !isWadaana && (
          <BottleCustodyWidget 
            embedded={true} 
            onCustodyUpdated={fetchRiskData} 
          />
        )}

        {/* Tab 2: Overdue Invoices (>7 Days) */}
        {activeTab === 'overdue' && (
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold sticky top-0">
                  <tr>
                    <th className="p-2.5">Customer</th>
                    <th className="p-2.5 text-right">Overdue Balance</th>
                    <th className="p-2.5">Recommendation</th>
                    <th className="p-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOverdue.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="p-6 text-center text-slate-400">
                        <CheckCircle2 size={20} className="mx-auto mb-1 text-emerald-500 opacity-60" />
                        No overdue unpaid customer bills detected.
                      </td>
                    </tr>
                  ) : (
                    filteredOverdue.map((c, idx) => {
                      const amount = Number(c.currentBalance || c.unpaidAmount || 0);
                      return (
                        <tr key={c.id || idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-2.5">
                            <div className="font-bold text-slate-900">{c.name}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{c.phone || 'No phone'}</div>
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-rose-600">
                            Rs. {amount.toLocaleString()}
                          </td>
                          <td className="p-2.5 text-slate-600 max-w-xs truncate">
                            {c.recommendation || 'Payment pending follow-up'}
                          </td>
                          <td className="p-2.5 text-right">
                            {c.phone ? (
                              <button
                                type="button"
                                onClick={() => {
                                  const text = WhatsAppTemplates.overdueBillReminder(c, isWadaana);
                                  openWhatsAppWeb(c.phone, text);
                                }}
                                className="btn-secondary py-1 px-2.5 text-xs text-emerald-700 bg-emerald-50/80 hover:bg-emerald-100 border-emerald-200 inline-flex items-center gap-1.5"
                                title="Send WhatsApp Overdue Bill Reminder"
                              >
                                <MessageSquare size={12} className="text-emerald-600" />
                                <span>Remind</span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">No Phone</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Inactive Customers (7+ Days) */}
        {activeTab === 'inactive' && (
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold sticky top-0">
                  <tr>
                    <th className="p-2.5">Customer</th>
                    <th className="p-2.5 text-center">Inactivity Duration</th>
                    <th className="p-2.5">Follow-up Recommendation</th>
                    <th className="p-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInactive.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="p-6 text-center text-slate-400">
                        <CheckCircle2 size={20} className="mx-auto mb-1 text-emerald-500 opacity-60" />
                        All accounts have active orders within the past 7 days.
                      </td>
                    </tr>
                  ) : (
                    filteredInactive.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-2.5">
                          <div className="font-bold text-slate-900">{c.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{c.phone || 'No phone'}</div>
                        </td>
                        <td className="p-2.5 text-center">
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[11px] font-mono rounded-md">
                            {c.daysSinceLastOrder || 7}d inactive
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-600 max-w-xs truncate">
                          {c.recommendation || 'Contact customer to schedule delivery'}
                        </td>
                        <td className="p-2.5 text-right">
                          {c.phone ? (
                            <button
                              type="button"
                              onClick={() => {
                                const text = WhatsAppTemplates.inactivityReengagement(c, isWadaana);
                                openWhatsAppWeb(c.phone, text);
                              }}
                              className="btn-secondary py-1 px-2.5 text-xs text-emerald-700 bg-emerald-50/80 hover:bg-emerald-100 border-emerald-200 inline-flex items-center gap-1.5"
                              title="Send WhatsApp Re-engagement"
                            >
                              <MessageSquare size={12} className="text-emerald-600" />
                              <span>Re-engage</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">No Phone</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Customer Reminders */}
        {activeTab === 'reminders' && (
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold sticky top-0">
                  <tr>
                    <th className="p-2.5">Customer</th>
                    <th className="p-2.5">Follow-up Remarks</th>
                    <th className="p-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReminders.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="p-6 text-center text-slate-400">
                        <CheckCircle2 size={20} className="mx-auto mb-1 text-emerald-500 opacity-60" />
                        No active customer reminders or follow-up notes.
                      </td>
                    </tr>
                  ) : (
                    filteredReminders.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-2.5">
                          <div className="font-bold text-slate-900">{c.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{c.phone || 'No phone'}</div>
                        </td>
                        <td className="p-2.5 text-slate-700 italic max-w-md truncate">
                          &quot;{c.remarks || 'Follow-up scheduled'}&quot;
                        </td>
                        <td className="p-2.5 text-right">
                          {c.phone ? (
                            <button
                              type="button"
                              onClick={() => openWhatsAppWeb(c.phone, `Assalam-o-Alaikum ${c.name}, following up regarding: ${c.remarks || ''}`)}
                              className="btn-secondary py-1 px-2.5 text-xs text-emerald-700 bg-emerald-50/80 hover:bg-emerald-100 border-emerald-200 inline-flex items-center gap-1.5"
                              title="Message Customer"
                            >
                              <MessageSquare size={12} className="text-emerald-600" />
                              <span>Message</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">No Phone</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
