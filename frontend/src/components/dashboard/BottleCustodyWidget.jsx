import { useState, useEffect, useMemo } from 'react';
import { Package, MessageCircle, CheckCircle2, Search } from 'lucide-react';
import { API_URL } from '../../utils/api';
import { useTenant } from '../../context/TenantContext';
import { toast } from 'sonner';

export default function BottleCustodyWidget({ className = '' }) {
  const { tenant, isWadaana } = useTenant();
  const [summary, setSummary] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const companyName = isWadaana ? 'Wadaana Industries' : 'AquaSphere';

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const [sumRes, custRes] = await Promise.all([
          fetch(`${API_URL}/bottles/summary`, {
            headers: { 'x-tenant': tenant },
            credentials: 'include'
          }).catch(() => null),
          fetch(`${API_URL}/customers?limit=200`, {
            headers: { 'x-tenant': tenant },
            credentials: 'include'
          }).catch(() => null)
        ]);

        if (sumRes?.ok) {
          const sumJson = await sumRes.json();
          if (sumJson.success && isMounted) setSummary(sumJson.data);
        }
        if (custRes?.ok) {
          const custJson = await custRes.json();
          if (custJson.success && isMounted) {
            setCustomers(custJson.data || []);
          }
        }
      } catch (err) {
        console.error('Error fetching bottle custody data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, [tenant]);

  const [currentTimestamp] = useState(() => Date.now());

  // Customers holding 19L bottles ranked descending with precomputed inactivity
  const custodyCustomers = useMemo(() => {
    return customers
      .filter(c => Number(c.cachedBottleBalance || 0) > 0)
      .filter(c => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (c.name || '').toLowerCase().includes(q) || (c.phone || '').includes(q);
      })
      .map(c => {
        const lastDate = c.lastOrderDate || c.updatedAt || c.createdAt;
        const daysInactive = lastDate 
          ? Math.max(0, Math.floor((currentTimestamp - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24)))
          : null;
        return { ...c, daysInactive };
      })
      .sort((a, b) => Number(b.cachedBottleBalance || 0) - Number(a.cachedBottleBalance || 0));
  }, [customers, search, currentTimestamp]);

  const totalInCirculation = useMemo(() => {
    if (summary?.withCustomers !== undefined) return Number(summary.withCustomers);
    return customers.reduce((sum, c) => sum + Number(c.cachedBottleBalance || 0), 0);
  }, [summary, customers]);

  const handleWhatsAppReminder = (c) => {
    if (!c.phone) {
      toast.error('No phone number recorded for customer.');
      return;
    }
    const bottles = Number(c.cachedBottleBalance || 0);
    const deposit = Number(c.deposit || 0);
    const text = `Assalam-o-Alaikum *${c.name}*,\nThis is a friendly reminder from *${companyName}* regarding *${bottles} unreturned 19L empty bottles* under your account.${deposit > 0 ? ` (Security Deposit on record: Rs. ${deposit.toLocaleString()})` : ''}\n\nPlease have the empty bottles ready for our retrieval vehicle on our next delivery run. Thank you!`;
    const cleanPhone = String(c.phone || '').replace(/\D/g, '');
    const phoneParam = cleanPhone.startsWith('92') ? cleanPhone : cleanPhone.startsWith('0') ? '92' + cleanPhone.slice(1) : cleanPhone;
    const url = `https://api.whatsapp.com/send?phone=${phoneParam}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className={`card-surface p-4 sm:p-5 space-y-4 ${className}`}>
      {/* Header & KPI Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-sky-50 text-sky-600 rounded-xl border border-sky-100">
            <Package size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              19L Bottle Custody & Recovery
              <span className="badge-brand text-[10px] py-0.5 px-2">Fleet Circulation</span>
            </h3>
            <p className="text-xs text-slate-500">
              Track unreturned 19L bottle inventory held by clients with 1-click recovery reminders
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-sky-50/80 border border-sky-200/60 rounded-xl px-3.5 py-1.5 text-right">
            <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wider block">In Circulation</span>
            <span className="text-lg font-mono font-black text-sky-900">
              {totalInCirculation.toLocaleString()} <span className="text-xs font-semibold text-sky-600 font-sans">Bottles</span>
            </span>
          </div>

          {summary?.atFactory !== undefined && (
            <div className="bg-emerald-50/80 border border-emerald-200/60 rounded-xl px-3.5 py-1.5 text-right hidden sm:block">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">At Plant</span>
              <span className="text-lg font-mono font-black text-emerald-900">
                {Number(summary.atFactory).toLocaleString()} <span className="text-xs font-semibold text-emerald-600 font-sans">Bottles</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Recovery List Search & Filter */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
          <input
            type="search"
            placeholder="Search customer or phone..."
            className="input-base pl-8 py-1.5 text-xs w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <span className="text-xs font-medium text-slate-500">
          Showing <strong className="text-slate-800">{custodyCustomers.length}</strong> accounts holding bottles
        </span>
      </div>

      {/* Customer Recovery Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
        <div className="overflow-x-auto max-h-64">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold sticky top-0">
              <tr>
                <th className="p-2.5">Customer</th>
                <th className="p-2.5 text-center">Unreturned Bottles</th>
                <th className="p-2.5 text-right">Security Deposit</th>
                <th className="p-2.5 text-center">Inactive Days</th>
                <th className="p-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-6 text-center text-slate-400">Loading custody records...</td>
                </tr>
              ) : custodyCustomers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-6 text-center text-slate-400">
                    <CheckCircle2 size={20} className="mx-auto mb-1 text-emerald-500 opacity-60" />
                    All 19L bottles accounted for. No outstanding client balances.
                  </td>
                </tr>
              ) : (
                custodyCustomers.map(c => {
                  const bottles = Number(c.cachedBottleBalance || 0);
                  const deposit = Number(c.deposit || 0);
                  const daysInactive = c.daysInactive;

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-2.5">
                        <div className="font-bold text-slate-900">{c.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{c.phone || 'No phone'}</div>
                      </td>
                      <td className="p-2.5 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          {bottles} btls
                        </span>
                      </td>
                      <td className="p-2.5 text-right font-mono font-semibold text-slate-700">
                        {deposit > 0 ? `Rs. ${deposit.toLocaleString()}` : <span className="text-rose-500 font-bold">Rs. 0</span>}
                      </td>
                      <td className="p-2.5 text-center">
                        {daysInactive !== null ? (
                          <span className={`font-mono text-xs font-semibold ${daysInactive > 30 ? 'text-rose-600 font-bold' : daysInactive > 14 ? 'text-amber-600' : 'text-slate-500'}`}>
                            {daysInactive} d
                          </span>
                        ) : '—'}
                      </td>
                      <td className="p-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleWhatsAppReminder(c)}
                          disabled={!c.phone}
                          className="btn-secondary py-1 px-2.5 text-xs text-emerald-700 bg-emerald-50/80 hover:bg-emerald-100 border-emerald-200 inline-flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Send WhatsApp recovery reminder"
                        >
                          <MessageCircle size={12} className="text-emerald-600" />
                          <span>Remind</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
