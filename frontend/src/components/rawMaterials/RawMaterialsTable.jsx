import { Package, Edit2, Archive, RefreshCw, AlertTriangle, CheckCircle2, Flame } from 'lucide-react';

export default function RawMaterialsTable({ 
  materials = [], 
  isLoading = false, 
  onEdit, 
  onToggleArchive, 
  tenant = 'aquasphere',
  isReadOnly = false,
  canArchive = false
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
    <div className="table-container">
      <div className="overflow-x-auto">
        <table className="w-full text-left whitespace-nowrap">
          <thead>
            <tr>
              <th className="table-th">Material Details</th>
              <th className="table-th">Category / Type</th>
              <th className="table-th">Current Stock</th>
              <th className="table-th">Reorder Level</th>
              <th className="table-th">Status</th>
              <th className="table-th text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan="6" className="p-10 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-medium text-xs">Loading inventory master...</p>
                  </div>
                </td>
              </tr>
            ) : materials.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-12 text-center text-slate-500">
                  <div className="max-w-md mx-auto flex flex-col items-center">
                    <div className="p-3 rounded-full bg-brand/10 text-brand mb-2">
                      <Package size={24} />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">No Materials Found</h4>
                    <p className="text-xs text-slate-400 mt-1">
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
                  <tr key={m.id} className="hover:bg-slate-50/80 transition-colors text-xs">
                    <td className="table-td">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-brand/10 text-brand border border-brand/20 flex items-center justify-center font-bold shrink-0">
                          <Package size={16} />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800 text-xs">{m.name}</div>
                          <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                            Unit: <span className="text-slate-600 font-semibold">{m.unit}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="table-td">
                      {getBadge(m.name)}
                    </td>
                    <td className="table-td">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-mono font-bold text-xs ${isLow ? 'text-amber-600' : 'text-slate-800'}`}>
                          {Number(m.cachedQty).toLocaleString('en-PK')} <span className="text-[10px] font-normal text-slate-400 font-sans">{m.unit}</span>
                        </span>
                        {isLow && !m.archivedAt && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                            <AlertTriangle size={10} /> LOW
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="table-td font-mono text-slate-600">
                      {m.reorderLevel} <span className="text-[10px] text-slate-400 font-sans">{m.unit}</span>
                    </td>
                    <td className="table-td">
                      {m.archivedAt ? (
                        <span className="badge-danger text-[10px]">
                          <Archive size={11} /> ARCHIVED
                        </span>
                      ) : (
                        <span className="badge-success text-[10px]">
                          <CheckCircle2 size={11} /> ACTIVE
                        </span>
                      )}
                    </td>
                    <td className="table-td text-right">
                      {(!isReadOnly || canArchive) ? (
                        <div className="flex items-center justify-end gap-1">
                          {!isReadOnly && (
                            <button
                              onClick={() => onEdit(m)}
                              className="btn-outline text-xs p-1.5"
                              title="Edit Material"
                            >
                              <Edit2 size={13} />
                            </button>
                          )}
                          {canArchive && (
                            <button
                              onClick={() => onToggleArchive(m)}
                              className={`p-1.5 rounded-lg border text-xs transition ${
                                m.archivedAt
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                              }`}
                              title={m.archivedAt ? 'Restore Material (Owner Only)' : 'Archive Material (Owner Only)'}
                            >
                              {m.archivedAt ? <RefreshCw size={13} /> : <Archive size={13} />}
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Read-Only</span>
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
