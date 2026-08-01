import { Package, Edit2, Archive, RefreshCw, AlertTriangle, CheckCircle2, Flame } from 'lucide-react';

export default function RawMaterialsTable({ 
  materials = [], 
  isLoading = false, 
  onEdit, 
  onToggleArchive, 
  tenant = 'aquasphere',
  isReadOnly = false
}) {
  const isWadaana = tenant === 'wadaana';

  const getBadge = (name) => {
    if (isWadaana) {
      if (name.toLowerCase().includes('pure')) {
        return <span className="inline-flex items-center gap-1 bg-cyan-50 text-cyan-700 border border-cyan-200 text-xs px-2.5 py-0.5 rounded-full font-bold"><Flame size={12} className="text-[#0ea5e9]"/> Pure Preform</span>;
      }
      if (name.toLowerCase().includes('mix')) {
        return <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs px-2.5 py-0.5 rounded-full font-bold"><Flame size={12} className="text-amber-500"/> Mix Preform</span>;
      }
      return <span className="bg-sky-50 text-sky-700 border border-sky-200 text-xs px-2.5 py-0.5 rounded-full font-semibold">Preform Stock</span>;
    } else {
      if (name.toLowerCase().includes('cap')) return <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2.5 py-0.5 rounded-full font-semibold">Bottle Caps</span>;
      if (name.toLowerCase().includes('label')) return <span className="bg-purple-50 text-purple-700 border border-purple-200 text-xs px-2.5 py-0.5 rounded-full font-semibold">Labels & Wraps</span>;
      if (name.toLowerCase().includes('pet') || name.toLowerCase().includes('bottle')) return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2.5 py-0.5 rounded-full font-semibold">Empty Bottles</span>;
      return <span className="bg-slate-100 text-slate-700 border border-slate-200 text-xs px-2.5 py-0.5 rounded-full font-semibold">Plant Material</span>;
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all">
      <div className="overflow-x-auto">
        <table className="w-full text-left whitespace-nowrap">
          <thead className="bg-slate-50/90 border-b border-slate-200 backdrop-blur">
            <tr>
              <th className="p-4 font-bold text-slate-700 text-xs uppercase tracking-wider">Material Details</th>
              <th className="p-4 font-bold text-slate-700 text-xs uppercase tracking-wider">Category / Type</th>
              <th className="p-4 font-bold text-slate-700 text-xs uppercase tracking-wider">Current Stock</th>
              <th className="p-4 font-bold text-slate-700 text-xs uppercase tracking-wider">Reorder Level</th>
              <th className="p-4 font-bold text-slate-700 text-xs uppercase tracking-wider">Status</th>
              <th className="p-4 font-bold text-slate-700 text-xs uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan="6" className="p-12 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className={`w-8 h-8 border-4 ${isWadaana ? 'border-[#0ea5e9]' : 'border-emerald-600'} border-t-transparent rounded-full animate-spin`}></div>
                    <p className="text-slate-500 font-medium text-sm">Loading inventory master...</p>
                  </div>
                </td>
              </tr>
            ) : materials.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-16 text-center text-slate-500">
                  <div className="max-w-md mx-auto flex flex-col items-center">
                    <div className={`p-4 rounded-full ${isWadaana ? 'bg-sky-50 text-[#0ea5e9]' : 'bg-emerald-50 text-emerald-600'} mb-3`}>
                      <Package size={32} />
                    </div>
                    <h4 className="text-base font-bold text-slate-800">No Materials Found</h4>
                    <p className="text-sm text-slate-400 mt-1">
                      {isWadaana 
                        ? 'No preform raw materials match your search criteria.' 
                        : 'No raw materials added yet. Click above to add bottling supplies.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              materials.map((m) => {
                const isLow = parseFloat(m.cachedQty) <= parseFloat(m.reorderLevel);
                return (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-3.5">
                        <div className={`h-10 w-10 rounded-xl ${
                          isWadaana ? 'bg-sky-50 text-[#0ea5e9] border-sky-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        } border flex items-center justify-center font-bold shadow-sm transition-transform group-hover:scale-105`}>
                          <Package size={20} />
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 text-base">{m.name}</div>
                          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
                            Unit: <span className="text-slate-600 font-bold">{m.unit}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      {getBadge(m.name)}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-base font-extrabold ${isLow ? 'text-amber-600' : 'text-slate-800'}`}>
                          {Number(m.cachedQty).toLocaleString('en-PK')} <span className="text-xs font-normal text-slate-500">{m.unit}</span>
                        </span>
                        {isLow && !m.archivedAt && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-extrabold animate-pulse">
                            <AlertTriangle size={11} className="stroke-[2.5]" /> LOW STOCK
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-sm font-semibold text-slate-600">
                      {m.reorderLevel} <span className="text-xs font-normal text-slate-400">{m.unit}</span>
                    </td>
                    <td className="p-4">
                      {m.archivedAt ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
                          <Archive size={12} /> ARCHIVED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 size={13} className="text-emerald-600" /> ACTIVE
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      {!isReadOnly ? (
                        <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => onEdit(m)}
                            className={`p-2 text-slate-600 hover:text-white ${
                              isWadaana ? 'hover:bg-[#0ea5e9]' : 'hover:bg-emerald-600'
                            } bg-slate-100 rounded-xl transition-all shadow-sm`}
                            title="Edit Material"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => onToggleArchive(m)}
                            className={`p-2 rounded-xl transition-all shadow-sm ${
                              m.archivedAt
                                ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white'
                                : 'text-rose-600 bg-rose-50 hover:bg-rose-600 hover:text-white'
                            }`}
                            title={m.archivedAt ? 'Restore Material' : 'Archive Material'}
                          >
                            {m.archivedAt ? <RefreshCw size={16} /> : <Archive size={16} />}
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium italic">Read-Only</span>
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
  );
}
