import { useState } from 'react';
import { ShoppingCart, Building2, Package, Calendar, Loader2 } from 'lucide-react';

export default function PurchasingSummaryTab({ summary, loading }) {
  const [activeTab, setActiveTab] = useState('purchases');

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
    <section className="card-surface overflow-hidden">
      <div className="flex items-center gap-1.5 p-2 border-b border-slate-100 bg-slate-50/50 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-white border border-slate-200 shadow-xs text-brand-primary'
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-4 min-h-[220px]">
        {loading ? (
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
            {/* Tab 1: Recent Purchases */}
            {activeTab === 'purchases' && (
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

            {/* Tab 2: Top Vendors */}
            {activeTab === 'vendors' && (
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

            {/* Tab 3: Material Spend */}
            {activeTab === 'materials' && (
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
  );
}
