import { Package, Edit2, Archive, RefreshCw, AlertTriangle, CheckCircle2, Flame, Trash2 } from 'lucide-react';
import { usePagination } from '../../hooks/usePagination';
import TablePagination from '../common/TablePagination';
import { TableActionMenu } from '../ui';
import { formatRawMaterialQty } from '../../utils/unitFormat';

export default function RawMaterialsTable({ 
  materials = [], 
  isLoading = false, 
  onEdit, 
  onToggleArchive, 
  onDelete, 
  isOwner = false, 
  tenant = 'aquasphere', 
  isReadOnly = false, 
  canArchive = false 
}) {
  const isWadaana = tenant === 'wadaana';
  const showActions = !isReadOnly || canArchive || (isOwner && !!onDelete);
  const pagination = usePagination(materials || [], 50);

  const getBadge = (m) => {
    if (m.isReturnable) {
      return (
        <span className="inline-flex items-center gap-1 bg-teal-50 text-teal-800 border border-teal-200 text-[10px] px-2 py-0.2 rounded-full font-bold">
          <RefreshCw size={10} className="text-teal-600" /> Returnable
        </span>
      );
    }
    const name = m.name || '';
    if (isWadaana) {
      if (name.toLowerCase().includes('pure')) {
        return <span className="inline-flex items-center gap-1 bg-cyan-50 text-cyan-700 border border-cyan-200 text-[10px] px-2 py-0.2 rounded-full font-bold"><Flame size={10} className="text-[#0ea5e9]"/> Pure</span>;
      }
      if (name.toLowerCase().includes('mix')) {
        return <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] px-2 py-0.2 rounded-full font-bold"><Flame size={10} className="text-amber-500"/> Mix</span>;
      }
      return <span className="bg-sky-50 text-sky-700 border border-sky-200 text-[10px] px-2 py-0.2 rounded-full font-semibold">Preform</span>;
    } else {
      if (name.toLowerCase().includes('cap')) return <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] px-2 py-0.2 rounded-full font-semibold">Caps</span>;
      if (name.toLowerCase().includes('label')) return <span className="bg-purple-50 text-purple-700 border border-purple-200 text-[10px] px-2 py-0.2 rounded-full font-semibold">Labels</span>;
      if (name.toLowerCase().includes('pet') || name.toLowerCase().includes('bottle')) return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] px-2 py-0.2 rounded-full font-semibold">Bottles</span>;
      return <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] px-2 py-0.2 rounded-full font-semibold">Material</span>;
    }
  };

  return (
    <div className="table-container">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr>
              <th className="table-th">Material</th>
              <th className="table-th">Current Stock</th>
              <th className="table-th">Counter Sale</th>
              <th className="table-th">Status</th>
              {showActions && <th className="table-th text-right sticky right-0 bg-slate-50/95 z-10 shadow-[-6px_0_8px_-4px_rgba(0,0,0,0.04)]">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={showActions ? 5 : 4} className="p-10 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-medium text-xs">Loading inventory master...</p>
                  </div>
                </td>
              </tr>
            ) : materials.length === 0 ? (
              <tr>
                <td colSpan={showActions ? 5 : 4} className="p-12 text-center text-slate-500">
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
              pagination.paginatedItems.map((m) => {
                const isLow = parseFloat(m.cachedQty) <= parseFloat(m.reorderLevel);

                const menuItems = [
                  !isReadOnly ? {
                    label: 'Edit Material',
                    icon: Edit2,
                    onClick: () => onEdit && onEdit(m),
                  } : null,
                  canArchive || (isOwner && onDelete) ? { divider: true } : null,
                  canArchive ? {
                    label: m.archivedAt ? 'Restore Material' : 'Archive Material',
                    icon: m.archivedAt ? RefreshCw : Archive,
                    variant: m.archivedAt ? 'default' : 'danger',
                    onClick: () => onToggleArchive && onToggleArchive(m),
                  } : null,
                  isOwner && onDelete ? {
                    label: 'Delete Material',
                    icon: Trash2,
                    variant: 'danger',
                    onClick: () => onDelete && onDelete(m),
                  } : null,
                ];

                return (
                  <tr 
                    key={m.id} 
                    onClick={() => !isReadOnly && onEdit && onEdit(m)}
                    className="hover:bg-slate-50/90 transition-colors cursor-pointer group text-xs"
                  >
                    {/* 1. Material Name & Category */}
                    <td className="table-td">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-brand/10 text-brand border border-brand/20 flex items-center justify-center font-bold shrink-0">
                          <Package size={16} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-slate-800 text-xs truncate max-w-[160px] sm:max-w-xs">{m.name}</span>
                            {getBadge(m)}
                          </div>
                          <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">
                            Unit: <span className="text-slate-600 font-semibold">{m.unit}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 2. Current Stock & Reorder */}
                    <td className="table-td tabular-nums">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`font-mono font-bold text-xs ${isLow ? 'text-amber-600' : 'text-slate-800'}`}>
                          {formatRawMaterialQty(m.cachedQty, m.unit)}
                        </span>
                        {isLow && !m.archivedAt && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                            <AlertTriangle size={10} /> LOW
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        Reorder: {formatRawMaterialQty(m.reorderLevel, m.unit)}
                      </div>
                    </td>

                    {/* 3. Counter Sale */}
                    <td className="table-td">
                      {m.sellableOnCounter ? (
                        <span className="inline-flex items-center gap-1 font-mono font-bold text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Rs. {Number(m.retailPrice || 0).toLocaleString()} <span className="font-sans font-normal text-[10px] text-slate-500">/{m.unit}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">—</span>
                      )}
                    </td>

                    {/* 4. Status */}
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

                    {/* 5. Actions (Sticky Right) */}
                    {showActions && (
                      <td 
                        className="table-td text-right sticky right-0 bg-white group-hover:bg-slate-50/90 z-10 shadow-[-6px_0_8px_-4px_rgba(0,0,0,0.04)] transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                          {!isReadOnly && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEdit(m);
                              }}
                              className="btn-outline text-xs px-2 py-1 inline-flex items-center gap-1 font-semibold cursor-pointer"
                              title="Edit Material"
                            >
                              <Edit2 size={12} />
                              <span>Edit</span>
                            </button>
                          )}

                          <TableActionMenu items={menuItems} />
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <TablePagination pagination={pagination} />
    </div>
  );
}
