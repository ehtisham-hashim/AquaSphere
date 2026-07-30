import { MapPin, Phone, Package } from 'lucide-react';

export default function CustomersTable({ customers = [], isLoading = false, onRowClick }) {
  const tenant = (localStorage.getItem('tenant') || 'aquasphere').toLowerCase();
  const isWadaana = tenant === 'wadaana';

  return (
    <div className="surface-card bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left whitespace-nowrap">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-4 font-semibold text-slate-600 text-sm">Customer</th>
              <th className="p-4 font-semibold text-slate-600 text-sm">Contact</th>
              <th className="p-4 font-semibold text-slate-600 text-sm">Products Buying</th>
              <th className="p-4 font-semibold text-slate-600 text-sm">Financials</th>
              {!isWadaana && <th className="p-4 font-semibold text-slate-600 text-sm">Bottles</th>}
              <th className="p-4 font-semibold text-slate-600 text-sm text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={isWadaana ? "6" : "7"} className="p-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className={`w-8 h-8 border-4 ${isWadaana ? 'border-[#0ea5e9]' : 'border-emerald-600'} border-t-transparent rounded-full animate-spin`}></div>
                    <p>Loading customers...</p>
                  </div>
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={isWadaana ? "6" : "7"} className="p-12 text-center text-slate-500">
                  No customers found.
                </td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr 
                  key={c.id} 
                  onClick={() => onRowClick && onRowClick(c)}
                  className="hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-full ${isWadaana ? 'bg-sky-100 text-sky-600' : 'bg-emerald-100 text-emerald-600'} flex items-center justify-center font-bold`}>
                        {c.name ? c.name.charAt(0).toUpperCase() : '?'}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 flex items-center gap-2">
                          {c.name}
                          {c.archivedAt && (
                            <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold uppercase">
                              Archived
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full inline-block mt-1">
                          {c.type}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-slate-600 text-sm mb-1">
                      <Phone size={14} className="text-slate-400" /> {c.phone?.includes('_archived_') ? c.phone.split('_archived_')[0] : c.phone}
                    </div>
                    {c.address && (
                      <div className="flex items-center gap-2 text-slate-500 text-xs truncate max-w-[200px]">
                        <MapPin size={14} className="text-slate-400 flex-shrink-0" />
                        <span>{c.address}</span>
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap items-center gap-1 max-w-[220px]">
                      {!isWadaana ? (
                        <>
                          {c.buys19L && <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[11px] px-2 py-0.5 rounded-md font-semibold">19L</span>}
                          {c.buys05LPet && <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] px-2 py-0.5 rounded-md font-semibold">0.5L PET</span>}
                          {c.buys15LPet && <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[11px] px-2 py-0.5 rounded-md font-semibold">1.5L PET</span>}
                          {!c.buys19L && !c.buys05LPet && !c.buys15LPet && <span className="text-slate-400 text-xs">—</span>}
                        </>
                      ) : (
                        <>
                          {c.buysPure05L && <span className="bg-cyan-50 text-cyan-700 border border-cyan-200 text-[11px] px-2 py-0.5 rounded-md font-semibold">0.5L Pure</span>}
                          {c.buysPure15L && <span className="bg-sky-50 text-sky-700 border border-sky-200 text-[11px] px-2 py-0.5 rounded-md font-semibold">1.5L Pure</span>}
                          {c.buysMix05L && <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[11px] px-2 py-0.5 rounded-md font-semibold">0.5L Mix</span>}
                          {c.buysMix15L && <span className="bg-orange-50 text-orange-700 border border-orange-200 text-[11px] px-2 py-0.5 rounded-md font-semibold">1.5L Mix</span>}
                          {!c.buysPure05L && !c.buysPure15L && !c.buysMix05L && !c.buysMix15L && <span className="text-slate-400 text-xs">—</span>}
                        </>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1 text-sm">
                      <span className={`font-semibold ${parseFloat(c.currentBalance || 0) > parseFloat(c.creditLimit || 0) ? 'text-red-600' : (parseFloat(c.currentBalance || 0) > 0 ? 'text-amber-600' : 'text-emerald-600')}`}>
                        Debt: Rs. {parseFloat(c.currentBalance || 0).toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-500">Limit: Rs. {c.creditLimit}</span>
                    </div>
                  </td>
                  {!isWadaana && (
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Package size={16} className="text-amber-500" />
                        <strong className="text-slate-700">{c.cachedBottleBalance}</strong> empty
                      </div>
                    </td>
                  )}
                  <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                    {c.archivedAt ? (
                      <button 
                        onClick={() => onRowClick && onRowClick(c, 'restore')}
                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-1.5 text-xs rounded-lg font-bold transition-all shadow-2xs"
                      >
                        Restore
                      </button>
                    ) : (
                      <button 
                        onClick={() => onRowClick && onRowClick(c, 'view')}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 text-xs rounded-lg font-medium transition-colors"
                      >
                        View Details
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
