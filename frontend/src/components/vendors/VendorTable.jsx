import { Building2, Phone, Mail, MapPin, Archive, RefreshCw, Edit2, CreditCard, Eye, Loader2 } from 'lucide-react';

export default function VendorTable({
  vendors,
  loading,
  canAddEdit,
  canPayOrArchive,
  onPay,
  onView,
  onEdit,
  onToggleArchive
}) {
  return (
    <div className="table-container">
      <div className="overflow-x-auto">
        <table className="w-full text-left whitespace-nowrap text-xs">
          <thead>
            <tr>
              <th className="table-th">Vendor</th>
              <th className="table-th">Contact</th>
              <th className="table-th">Address</th>
              <th className="table-th">Status</th>
              <th className="table-th">Total Purchases</th>
              <th className="table-th">Total Paid</th>
              <th className="table-th">Payable Balance</th>
              <th className="table-th text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {loading ? (
              <tr>
                <td colSpan="8" className="p-12 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[var(--brand)]" />
                  Loading vendor records...
                </td>
              </tr>
            ) : vendors.map(v => (
              <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="table-td">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-[var(--brand-light)] text-[var(--brand)] flex items-center justify-center font-bold shrink-0">
                      <Building2 size={16} />
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 text-xs">{v.name}</div>
                      {v.notes && <div className="text-[11px] text-slate-400 max-w-xs truncate">{v.notes}</div>}
                    </div>
                  </div>
                </td>

                <td className="table-td">
                  <div className="flex flex-col gap-0.5">
                    {v.phone && (
                      <div className="flex items-center gap-1.5 font-medium text-slate-700">
                        <Phone size={13} className="text-slate-400" /> {v.phone}
                      </div>
                    )}
                    {v.email && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <Mail size={13} className="text-slate-400" /> {v.email}
                      </div>
                    )}
                  </div>
                </td>

                <td className="p-4">
                  {v.address ? (
                    <div className="flex items-center gap-1 text-xs text-slate-600 max-w-xs truncate">
                      <MapPin size={14} className="text-slate-400 shrink-0" /> {v.address}
                    </div>
                  ) : (
                    <span className="text-slate-300 text-xs">—</span>
                  )}
                </td>

                <td className="table-td">
                  {v.archivedAt ? (
                    <span className="badge-danger">
                      Archived
                    </span>
                  ) : (
                    <span className="badge-success">
                      Active
                    </span>
                  )}
                </td>

                <td className="table-td font-mono font-semibold text-slate-700">
                  Rs {Number(v.totalPurchases || 0).toLocaleString()}
                </td>

                <td className="table-td font-mono font-semibold text-emerald-700">
                  Rs {Number(v.totalPaid || 0).toLocaleString()}
                </td>

                <td className="table-td font-mono font-bold text-slate-900">
                  Rs {Number(v.payableBalance || 0).toLocaleString()}
                </td>

                <td className="table-td text-right">
                  <div className="flex items-center justify-end gap-1">
                    {canPayOrArchive && !v.archivedAt && (
                      <button
                        onClick={() => onPay(v)}
                        disabled={Number(v.payableBalance || 0) <= 0}
                        className={`px-2 py-1 text-xs font-semibold rounded-lg transition inline-flex items-center gap-1 ${
                          Number(v.payableBalance || 0) <= 0
                            ? 'text-slate-300 bg-slate-50 cursor-not-allowed'
                            : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                        }`}
                        title={Number(v.payableBalance || 0) <= 0 ? 'No outstanding balance' : 'Record Payment'}
                      >
                        <CreditCard size={13} /> Pay
                      </button>
                    )}

                    <button
                      onClick={() => onView(v)}
                      className="btn-secondary py-1 px-2 text-xs inline-flex items-center gap-1"
                      title="View Vendor Profile & History"
                    >
                      <Eye size={13} /> Profile
                    </button>

                    {canAddEdit && (
                      <button
                        onClick={() => onEdit(v)}
                        className="p-1.5 text-slate-400 hover:text-[var(--brand)] hover:bg-slate-100 rounded-lg transition"
                        title="Edit Vendor"
                      >
                        <Edit2 size={14} />
                      </button>
                    )}

                    {canPayOrArchive && (
                      <button
                        onClick={() => onToggleArchive(v)}
                        className={`p-1.5 rounded-lg transition ${
                          v.archivedAt
                            ? 'text-emerald-600 hover:bg-emerald-50'
                            : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                        }`}
                        title={v.archivedAt ? 'Restore Vendor' : 'Archive Vendor'}
                      >
                        {v.archivedAt ? <RefreshCw size={14} /> : <Archive size={14} />}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}

            {!loading && vendors.length === 0 && (
              <tr>
                <td colSpan="8" className="p-8 text-center text-slate-500">
                  No vendor records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
