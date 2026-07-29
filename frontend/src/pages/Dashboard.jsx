import { useAuth } from '../context/AuthContext';
import { API_URL } from '../utils/api';
import { useState, useEffect } from 'react';
import { Wallet, TrendingUp, CreditCard, Receipt, ShoppingCart, AlertTriangle, Package, Building2, Loader2, Calendar, ShieldAlert } from 'lucide-react';
import AlertsSection from '../components/dashboard/AlertsSection';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState({
    sales: 0,
    cash: 0,
    expenses: 0,
    credit: 0,
    bottlesSold: 0,
    todaysPurchases: 0,
    todaysPurchasesCount: 0,
    monthlyPurchases: 0,
    pendingVendorPayables: 0,
    lowStockMaterialsCount: 0,
    lowStockMaterialsList: []
  });

  const [summaryTab, setSummaryTab] = useState('purchases');
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  useEffect(() => {
    const sse = new EventSource(`${API_URL}/analytics/dashboard/stream`, {
      withCredentials: true
    });

    sse.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.success) setData(parsed.data);
      } catch (err) {
        console.error('Failed to parse SSE data', err);
      }
    };

    sse.onerror = (err) => {
      console.error('SSE Error:', err);
    };

    return () => sse.close();
  }, []);

  useEffect(() => {
    const fetchSummary = async () => {
      setSummaryLoading(true);
      try {
        const res = await fetch(`${API_URL}/analytics/purchasing-summary`, { credentials: 'include' });
        const json = await res.json();
        if (json.success) setSummary(json.data);
      } catch (err) {
        console.error('Error fetching purchasing summary:', err);
      } finally {
        setSummaryLoading(false);
      }
    };
    fetchSummary();
  }, []);

  const isOwner = user?.role === 'OWNER';
  const isAccountant = user?.role === 'ACCOUNTANT';
  const isAdmin = user?.role === 'ADMIN';
  const isProductionManager = user?.role === 'PRODUCTION_MANAGER';
  const isMarketingManager = user?.role === 'MARKETING_MANAGER';

  const canViewFinancials = isOwner || isAccountant;
  const canViewInventory = isOwner || isAdmin || isProductionManager;
  const canViewMMAlerts = isOwner || isMarketingManager;

  const formatDate = (d) => {
    const date = new Date(d);
    return date.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const tabs = [
    { key: 'purchases', label: 'Recent Purchases', icon: <ShoppingCart size={14} /> },
    { key: 'vendors', label: 'Top Vendors', icon: <Building2 size={14} /> },
    { key: 'materials', label: 'Material Spend', icon: <Package size={14} /> },
  ];

  const maxVendorSpend = summary?.topVendors?.[0]?.totalPurchases || 1;
  const maxMaterialSpend = summary?.topMaterials?.[0]?.totalSpend || 1;

  return (
    <div className="space-y-8 p-2 max-w-[98%] mx-auto">
      {/* Financial Overview */}
      {canViewFinancials && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={20} className="text-slate-400" />
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Financial Overview</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            <KpiCard icon={<Wallet />} title="TODAY'S SALES" value={`Rs. ${Number(data.sales).toLocaleString()}`} subtitle="Total sales value" color="text-sky-600" bg="bg-sky-50" border="border-sky-100" />
            <KpiCard icon={<CreditCard />} title="CASH COLLECTED" value={`Rs. ${Number(data.cash).toLocaleString()}`} subtitle="Cash received today" color="text-emerald-600" bg="bg-emerald-50" border="border-emerald-100" />
            <KpiCard icon={<CreditCard />} title="CREDIT SALES" value={`Rs. ${Number(data.credit).toLocaleString()}`} subtitle="Billed on credit" color="text-orange-600" bg="bg-orange-50" border="border-orange-100" />
            <KpiCard icon={<Receipt />} title="EXPENSES TODAY" value={`Rs. ${Number(data.expenses).toLocaleString()}`} subtitle="Logged operating cost" color="text-rose-600" bg="bg-rose-50" border="border-rose-100" />
            <KpiCard icon={<ShoppingCart />} title="TODAY'S PURCHASES" value={`Rs. ${Number(data.todaysPurchases).toLocaleString()}`} subtitle={`${data.todaysPurchasesCount} purchase logs`} color="text-purple-600" bg="bg-purple-50" border="border-purple-100" />
          </div>
        </section>
      )}

      {/* Marketing Manager Alerts */}
      {canViewMMAlerts && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <ShieldAlert size={20} className="text-slate-400" />
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Marketing & Operations Alerts</h2>
          </div>
          <AlertsSection />
        </section>
      )}

      {/* Purchasing & Vendor Balances */}
      {canViewFinancials && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart size={20} className="text-slate-400" />
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Purchasing & Vendor Payables</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white border border-purple-100 rounded-2xl p-6 shadow-sm flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Monthly Purchases Total</h4>
                <p className="text-3xl font-black text-slate-800">
                  Rs. {Number(data.monthlyPurchases).toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 mt-1">Raw material spend this month.</p>
              </div>
              <div className="bg-purple-50 text-purple-600 p-4 rounded-full"><ShoppingCart size={32} /></div>
            </div>

            <div className="bg-white border border-rose-100 rounded-2xl p-6 shadow-sm flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Pending Vendor Payables</h4>
                <p className="text-3xl font-black text-rose-600">
                  Rs. {Number(data.pendingVendorPayables).toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 mt-1">Total outstanding debt owed to suppliers.</p>
              </div>
              <div className="bg-rose-50 text-rose-500 p-4 rounded-full"><Receipt size={32} /></div>
            </div>
          </div>
        </section>
      )}

      {/* Low Stock Material Warnings */}
      {canViewInventory && data.lowStockMaterialsCount > 0 && (
        <section className="bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-3 text-amber-800">
            <AlertTriangle size={24} className="shrink-0 text-amber-600" />
            <div>
              <h3 className="text-base font-bold">Low Stock Raw Materials Warning</h3>
              <p className="text-xs text-amber-700">
                {data.lowStockMaterialsCount} material(s) below reorder threshold. Log purchases to refill inventory.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            {data.lowStockMaterialsList.map(mat => (
              <div key={mat.id} className="bg-white p-3.5 rounded-xl border border-amber-100 flex justify-between items-center shadow-xs">
                <div>
                  <div className="font-bold text-slate-800 text-sm">{mat.name}</div>
                  <div className="text-xs text-slate-400">Reorder Level: {mat.reorderLevel} {mat.unit}</div>
                </div>
                <span className="text-sm font-black text-rose-600 px-2.5 py-1 bg-rose-50 rounded-lg">
                  {mat.cachedQty} {mat.unit}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Purchasing & Vendor Summary — Tabbed Section */}
      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="flex items-center gap-1.5 p-2 border-b border-slate-100 bg-slate-50 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setSummaryTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold rounded-xl transition-all whitespace-nowrap ${
                summaryTab === tab.key
                  ? 'bg-white border border-slate-200 shadow-sm text-slate-800'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-4 min-h-[220px]">
          {summaryLoading ? (
            <div className="flex items-center justify-center h-48 text-slate-400 gap-2">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-sm">Loading summary…</span>
            </div>
          ) : !summary ? (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
              Failed to load purchasing summary.
            </div>
          ) : (
            <>
              {/* Tab: Recent Purchases */}
              {summaryTab === 'purchases' && (
                <div>
                  {summary.recentPurchases.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                      <ShoppingCart size={32} className="mb-2 opacity-40" />
                      <p className="text-sm">No purchases recorded yet.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Invoice</th>
                            <th className="py-2.5 px-3">Vendor</th>
                            <th className="py-2.5 px-3">Items</th>
                            <th className="py-2.5 px-3 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {summary.recentPurchases.map((p, idx) => (
                            <tr key={p.id} className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                              <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <Calendar size={13} className="text-slate-400" />
                                  {formatDate(p.purchaseDate)}
                                </div>
                              </td>
                              <td className="py-3 px-3 font-mono text-xs text-slate-500">{p.invoiceNo || '—'}</td>
                              <td className="py-3 px-3 font-semibold text-slate-700">{p.vendorName}</td>
                              <td className="py-3 px-3">
                                <div className="flex flex-wrap gap-1">
                                  {p.items.slice(0, 2).map((item, i) => (
                                    <span key={i} className="inline-block px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md text-xs font-medium">
                                      {item.name} ({item.qty} {item.unit})
                                    </span>
                                  ))}
                                  {p.items.length > 2 && (
                                    <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-xs font-medium">
                                      +{p.items.length - 2} more
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-3 text-right font-black text-slate-800">Rs. {p.grandTotal.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Top Vendors */}
              {summaryTab === 'vendors' && (
                <div>
                  {summary.topVendors.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                      <Building2 size={32} className="mb-2 opacity-40" />
                      <p className="text-sm">No vendor data available.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {summary.topVendors.map((v, idx) => (
                        <div key={v.id} className="flex items-center gap-4 p-3.5 rounded-xl border border-slate-100 hover:border-purple-100 hover:shadow-sm transition-all group">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 text-white flex items-center justify-center text-xs font-black shrink-0">
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-slate-800 text-sm truncate">{v.name}</span>
                              <span className="text-xs font-bold text-slate-800 ml-2 whitespace-nowrap">Rs. {v.totalPurchases.toLocaleString()}</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-purple-400 to-purple-600 transition-all duration-700"
                                style={{ width: `${Math.max(3, (v.totalPurchases / maxVendorSpend) * 100)}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between mt-1.5">
                              <span className="text-[11px] text-slate-400">Paid: Rs. {v.totalPayments.toLocaleString()}</span>
                              <span className={`text-[11px] font-bold ${v.outstanding > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                {v.outstanding > 0 ? `Outstanding: Rs. ${v.outstanding.toLocaleString()}` : 'Settled ✓'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Top Materials */}
              {summaryTab === 'materials' && (
                <div>
                  {summary.topMaterials.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                      <Package size={32} className="mb-2 opacity-40" />
                      <p className="text-sm">No material purchases this month.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {summary.topMaterials.map((m) => (
                        <div key={m.itemId} className="p-4 rounded-xl border border-slate-100 hover:border-emerald-100 hover:shadow-sm transition-all">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-slate-700 text-sm truncate">{m.name}</span>
                            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg whitespace-nowrap">
                              {m.totalQty.toLocaleString()} {m.unit}
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-1.5">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-700"
                              style={{ width: `${Math.max(3, (m.totalSpend / maxMaterialSpend) * 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-slate-800">Rs. {m.totalSpend.toLocaleString()}</span>
                          <span className="text-[11px] text-slate-400 ml-1">this month</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function KpiCard({ icon, title, value, subtitle, color, bg, border }) {
  return (
    <div className={`bg-white border ${border} rounded-2xl p-5 shadow-sm flex flex-col h-full justify-between transition-all hover:shadow-md hover:-translate-y-0.5 group`}>
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2.5 rounded-xl ${bg} ${color} transition-transform group-hover:scale-110`}>
          {icon}
        </div>
      </div>
      <div>
        <p className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tight">{value}</p>
        <h4 className="text-xs font-bold text-slate-500 tracking-wider mt-2 uppercase">{title}</h4>
        {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

