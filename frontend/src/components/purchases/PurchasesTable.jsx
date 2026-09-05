import { Calendar, Eye, Printer, ShieldCheck, Trash2, ShoppingCart, Building2 } from 'lucide-react';

export default function PurchasesTable({
  purchases,
  onView,
  onPrint,
  onVerify,
  onDelete,
  onStatusChange,
  verifyingId,
  updatingStatusId,
  deletingId,
  isOwner,
  isAccountant,
  user,
  onOpenModal
}) {
  if (!purchases || purchases.length === 0) {
    return (
      <div className="card-surface p-12 text-center flex flex-col items-center min-h-[300px] justify-center">
        <ShoppingCart size={40} className="text-slate-300 mb-3" />
        <h3 className="text-base font-bold text-slate-700 mb-1">No Purchase Records Found</h3>
        <p className="text-slate-500 max-w-md text-xs mb-4">
          Log raw material purchases to automatically increase plant stock levels and manage vendor accounts.
        </p>
        {['OWNER', 'PRODUCTION_MANAGER'].includes(user?.role) && (
          <button onClick={onOpenModal} className="btn-primary">
            Record First Purchase
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="table-container">
      <div className="overflow-x-auto">
        <table className="w-full text-left whitespace-nowrap text-xs">
          <thead>
            <tr>
              <th className="table-th">Date</th>
              <th className="table-th">Invoice #</th>
              <th className="table-th">Vendor</th>
              <th className="table-th">Total Amount</th>
              <th className="table-th">Fulfillment</th>
              <th className="table-th">Payment</th>
              <th className="table-th">Verification</th>
              <th className="table-th text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {purchases.map(p => (
              <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="table-td text-slate-600">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <Calendar size={13} className="text-slate-400" />
                    {new Date(p.purchaseDate).toLocaleDateString()}
                  </div>
                </td>
                <td className="table-td font-mono font-bold text-[var(--brand)]">
                  {p.invoiceNo || `#${p.id.slice(0, 8)}`}
                </td>
                <td className="table-td font-bold text-slate-800">
                  <div className="flex items-center gap-1.5">
                    <Building2 size={14} className="text-slate-400" />
                    {p.vendor?.name || 'Unknown Vendor'}
                  </div>
                </td>
                <td className="table-td font-mono font-bold text-slate-900">
                  Rs {Number(p.grandTotal).toLocaleString('en-PK')}
                </td>
                <td className="table-td">
                  {['OWNER', 'PRODUCTION_MANAGER'].includes(user?.role) ? (
                    <select
                      value={p.status || 'RECEIVED'}
                      onChange={(e) => onStatusChange(p.id, e.target.value, null)}
                      disabled={updatingStatusId === p.id}
                      className="bg-transparent font-bold text-xs cursor-pointer border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="RECEIVED">🟢 Received</option>
                      <option value="PARTIALLY_RECEIVED">🔵 Partially Received</option>
                      <option value="PENDING">🟡 Pending</option>
                      <option value="CANCELLED">🔴 Cancelled</option>
                    </select>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      {p.status === 'RECEIVED' ? '🟢 Received' : p.status === 'PARTIALLY_RECEIVED' ? '🔵 Partial' : p.status === 'PENDING' ? '🟡 Pending' : '🔴 Cancelled'}
                    </span>
                  )}
                </td>
                <td className="table-td">
                  {isOwner || isAccountant ? (
                    <select
                      value={p.paymentStatus || 'PAID'}
                      onChange={(e) => onStatusChange(p.id, null, e.target.value)}
                      disabled={updatingStatusId === p.id}
                      className="bg-transparent font-bold text-xs cursor-pointer border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
                    >
                      <option value="PAID">🟢 Paid</option>
                      <option value="PARTIAL">🔵 Partial</option>
                      <option value="CREDIT">🔴 Credit</option>
                    </select>
                  ) : (
                    p.paymentStatus === 'PAID' ? (
                      <span className="badge-success">
                        Paid
                      </span>
                    ) : p.paymentStatus === 'PARTIAL' ? (
                      <span className="badge-brand">
                        Partial
                      </span>
                    ) : (
                      <span className="badge-danger">
                        Unpaid
                      </span>
                    )
                  )}
                </td>
                <td className="table-td text-xs font-medium">
                  {p.verifiedBy ? (
                    <div className="space-y-0.5">
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[11px]">
                        <ShieldCheck size={12} /> Verified
                      </span>
                      <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                        By: <span className="text-slate-800 font-bold">{p.verifiedBy || 'Admin'}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {new Date(p.verifiedAt || p.updatedAt || p.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  ) : ['ACCOUNTANT', 'OWNER'].includes(user?.role) ? (
                    <button
                      onClick={() => onVerify(p.id)}
                      disabled={verifyingId === p.id}
                      className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 rounded-lg font-bold text-xs transition"
                    >
                      {verifyingId === p.id ? 'Verifying...' : 'Verify'}
                    </button>
                  ) : (
                    <span className="text-slate-400 italic">Unverified</span>
                  )}
                </td>
                <td className="table-td text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => onView(p)}
                      className="p-1.5 text-slate-600 hover:text-[var(--brand)] hover:bg-slate-100 rounded-lg transition inline-flex items-center gap-1 text-xs font-semibold"
                    >
                      <Eye size={14} /> View
                    </button>
                    <button
                      onClick={() => onPrint(p)}
                      className="p-1.5 text-slate-600 hover:text-[var(--brand)] hover:bg-slate-100 rounded-lg transition inline-flex items-center gap-1 text-xs font-semibold"
                    >
                      <Printer size={14} /> Print
                    </button>
                    {user?.role === 'OWNER' && (
                      <button
                        onClick={() => onDelete(p)}
                        disabled={deletingId === p.id}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition inline-flex items-center text-xs font-semibold"
                        title="Delete Purchase"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
