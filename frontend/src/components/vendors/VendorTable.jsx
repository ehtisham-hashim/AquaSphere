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
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left whitespace-nowrap">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
            <tr>
              <th className="p-4">Vendor</th>
              <th className="p-4">Contact</th>
              <th className="p-4">Address</th>
              <th className="p-4">Status</th>
              <th className="p-4">Total Purchases</th>
              <th className="p-4">Total Paid</th>
              <th className="p-4">Payable Balance</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {loading ? (
              <tr>
                <td colSpan="8" className="p-12 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                  Loading vendor records...
                </td>
              </tr>
            ) : vendors.map(v => (
              <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold shrink-0">
                      <Building2 size={18} />
                    </div>
                    <div>
                      <div className="font-bold text-slate-800">{v.name}</div>
                      {v.notes && <div className="text-xs text-slate-400 max-w-xs truncate">{v.notes}</div>}
                    </div>
                  </div>
                </td>

                <td className="p-4">
                  <div className="flex flex-col gap-1">
                    {v.phone && (
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                        <Phone size={14} className="text-slate-400" /> {v.phone}
                      </div>
                    )}
                    {v.email && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Mail size={14} className="text-slate-400" /> {v.email}
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

                <td className="p-4">
                  {v.archivedAt ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
                      ARCHIVED
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                      ACTIVE
                    </span>
                  )}
                </td>

                <td className="p-4 font-semibold text-slate-700">
                  Rs {Number(v.totalPurchases || 0).toLocaleString()}
                </td>

                <td className="p-4 font-semibold text-emerald-700">
                  Rs {Number(v.totalPaid || 0).toLocaleString()}
                </td>

                <td className="p-4 font-bold text-indigo-700">
                  Rs {Number(v.payableBalance || 0).toLocaleString()}
                </td>

                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {canPayOrArchive && !v.archivedAt && (
                      <button
                        onClick={() => onPay(v)}
                        disabled={Number(v.payableBalance || 0) <= 0}
                        className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1 shadow-xs ${
                          Number(v.payableBalance || 0) <= 0
                            ? 'text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed opacity-60'
                            : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                        }`}
                        title={Number(v.payableBalance || 0) <= 0 ? 'No outstanding balance to pay' : 'Record Payment to Vendor'}
                      >
                        <CreditCard size={14} /> Pay
                      </button>
                    )}

                    <button
                      onClick={() => onView(v)}
                      className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors inline-flex items-center gap-1"
                      title="View Vendor Profile & History"
                    >
                      <Eye size={14} /> Profile
                    </button>

                    {canAddEdit && (
                      <button
                        onClick={() => onEdit(v)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Edit Vendor"
                      >
                        <Edit2 size={16} />
                      </button>
                    )}

                    {canPayOrArchive && (
                      <button
                        onClick={() => onToggleArchive(v)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          v.archivedAt
                            ? 'text-emerald-600 hover:bg-emerald-50'
                            : 'text-rose-500 hover:bg-rose-50'
                        }`}
                        title={v.archivedAt ? 'Restore Vendor' : 'Archive Vendor'}
                      >
                        {v.archivedAt ? <RefreshCw size={16} /> : <Archive size={16} />}
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
