import { Building2, Phone, Mail, MapPin, Archive, RefreshCw, Edit2, Eye, Loader2, Trash2, DollarSign } from 'lucide-react';
import { usePagination } from '../../hooks/usePagination';
import TablePagination from '../common/TablePagination';
import { TableActionMenu } from '../ui';

export default function VendorTable({
  vendors,
  loading,
  canAddEdit,
  canPayOrArchive,
  onView,
  onPay,
  onEdit,
  onToggleArchive,
  onDeleteVendor,
  isOwner = false
}) {
  const pagination = usePagination(vendors || [], 50);

  return (
    <div className="table-container">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr>
              <th className="table-th">Vendor</th>
              <th className="table-th">Contact & Address</th>
              <th className="table-th">Purchases & Paid</th>
              <th className="table-th">Payable Balance</th>
              <th className="table-th text-right sticky right-0 bg-slate-50/95 z-10 shadow-[-6px_0_8px_-4px_rgba(0,0,0,0.04)]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {loading ? (
              <tr>
                <td colSpan="5" className="p-12 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[var(--brand)]" />
                  Loading vendor records...
                </td>
              </tr>
            ) : pagination.paginatedItems.map(v => {
              const payable = Number(v.payableBalance || 0);
              const hasPayable = payable > 0;

              const menuItems = [
                {
                  label: 'View Vendor Ledger',
                  icon: Eye,
                  onClick: () => onView && onView(v),
                },
                canAddEdit ? {
                  label: 'Edit Vendor',
                  icon: Edit2,
                  onClick: () => onEdit && onEdit(v),
                } : null,
                canPayOrArchive || (isOwner && onDeleteVendor) ? { divider: true } : null,
                canPayOrArchive ? {
                  label: v.archivedAt ? 'Restore Vendor' : 'Archive Vendor',
                  icon: v.archivedAt ? RefreshCw : Archive,
                  variant: v.archivedAt ? 'default' : 'danger',
                  onClick: () => onToggleArchive && onToggleArchive(v),
                } : null,
                isOwner && onDeleteVendor ? {
                  label: 'Delete Vendor',
                  icon: Trash2,
                  variant: 'danger',
                  onClick: () => onDeleteVendor && onDeleteVendor(v),
                } : null,
              ];

              return (
                <tr 
                  key={v.id} 
                  onClick={() => onView && onView(v)}
                  className="hover:bg-slate-50/90 transition-colors cursor-pointer group"
                >
                  {/* 1. Vendor Name, Notes & Status */}
                  <td className="table-td">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-xl bg-[var(--brand-light)] text-[var(--brand)] flex items-center justify-center font-bold shrink-0">
                        <Building2 size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-800 text-xs truncate max-w-[180px] sm:max-w-xs">{v.name}</span>
                          {v.archivedAt ? (
                            <span className="badge-danger text-[10px] px-1.5 py-0.2 shrink-0">
                              Archived
                            </span>
                          ) : (
                            <span className="badge-success text-[10px] px-1.5 py-0.2 shrink-0">
                              Active
                            </span>
                          )}
                        </div>
                        {v.notes && (
                          <div className="text-[11px] text-slate-400 max-w-xs truncate mt-0.5" title={v.notes}>
                            {v.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* 2. Contact & Address */}
                  <td className="table-td">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-3 text-slate-700 flex-wrap">
                        {v.phone && (
                          <span className="inline-flex items-center gap-1 font-medium whitespace-nowrap">
                            <Phone size={12} className="text-slate-400 shrink-0" /> {v.phone}
                          </span>
                        )}
                        {v.email && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 whitespace-nowrap">
                            <Mail size={12} className="text-slate-400 shrink-0" /> {v.email}
                          </span>
                        )}
                      </div>
                      {v.address ? (
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 max-w-[180px] sm:max-w-xs truncate" title={v.address}>
                          <MapPin size={12} className="text-slate-400 shrink-0" />
                          <span className="truncate">{v.address}</span>
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </div>
                  </td>

                  {/* 3. Purchases & Paid */}
                  <td className="table-td tabular-nums text-xs">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-slate-700 font-semibold">
                        Billed: Rs. {Number(v.totalPurchases || 0).toLocaleString()}
                      </span>
                      <span className="text-emerald-700 font-medium text-[11px]">
                        Paid: Rs. {Number(v.totalPaid || 0).toLocaleString()}
                      </span>
                    </div>
                  </td>

                  {/* 4. Payable Balance */}
                  <td className="table-td tabular-nums">
                    {hasPayable ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-slate-900 text-sm">
                          Rs. {payable.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-rose-600 font-semibold">Outstanding Due</span>
                      </div>
                    ) : (
                      <span className="inline-flex items-center text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md w-fit">
                        Cleared (Rs. 0)
                      </span>
                    )}
                  </td>

                  {/* 5. Actions (Sticky Right) */}
                  <td 
                    className="table-td text-right sticky right-0 bg-white group-hover:bg-slate-50/90 z-10 shadow-[-6px_0_8px_-4px_rgba(0,0,0,0.04)] transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                      {canPayOrArchive && onPay && hasPayable && !v.archivedAt && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPay(v);
                          }}
                          className="py-1 px-2.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 inline-flex items-center gap-1 transition cursor-pointer"
                          title="Settle Outstanding Vendor Debt"
                        >
                          <DollarSign size={13} className="text-emerald-600" /> Pay
                        </button>
                      )}

                      <TableActionMenu items={menuItems} />
                    </div>
                  </td>
                </tr>
              );
            })}

            {!loading && vendors.length === 0 && (
              <tr>
                <td colSpan="5" className="p-8 text-center text-slate-500">
                  No vendor records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <TablePagination pagination={pagination} />
    </div>
  );
}
