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
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-12 text-center flex flex-col items-center min-h-[350px] justify-center">
        <ShoppingCart size={48} className="text-slate-300 mb-4" />
        <h3 className="text-lg font-bold text-slate-700 mb-1">No Purchase Records Found</h3>
        <p className="text-slate-500 max-w-md text-sm mb-6">
          Log raw material purchases to automatically increase plant stock levels and manage vendor accounts.
        </p>
        {['OWNER', 'PRODUCTION_MANAGER'].includes(user?.role) && (
          <button onClick={onOpenModal} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-md text-sm">
            Record First Purchase
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left whitespace-nowrap text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
            <tr>
              <th className="p-4">Date</th>
              <th className="p-4">Invoice #</th>
              <th className="p-4">Vendor</th>
              <th className="p-4">Total Amount</th>
              <th className="p-4">Fulfillment Status</th>
              <th className="p-4">Payment Status</th>
              <th className="p-4">Verification</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {purchases.map(p => (
              <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="p-4 text-slate-600">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <Calendar size={14} className="text-slate-400" />
                    {new Date(p.purchaseDate).toLocaleDateString()}
                  </div>
                </td>
                <td className="p-4 font-mono font-bold text-indigo-600">
                  {p.invoiceNo || `#${p.id.slice(0, 8)}`}
                </td>
                <td className="p-4 font-bold text-slate-800">
                  <div className="flex items-center gap-2">
                    <Building2 size={16} className="text-slate-400" />
                    {p.vendor?.name || 'Unknown Vendor'}
                  </div>
                </td>
                <td className="p-4 font-mono font-black text-slate-900 text-base">
                  Rs {Number(p.grandTotal).toLocaleString('en-PK')}
                </td>
                <td className="p-4">
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
                </td>
                <td className="p-4">
                  {isOwner || isAccountant ? (
                    <select
                      value={p.paymentStatus || 'PAID'}
                      onChange={(e) => onStatusChange(p.id, null, e.target.value)}
                      disabled={updatingStatusId === p.id}
                      className="bg-transparent font-bold text-xs cursor-pointer border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="PAID">🟢 Paid</option>
                      <option value="PARTIAL">🔵 Partial</option>
                      <option value="CREDIT">🔴 Credit</option>
                    </select>
                  ) : (
                    p.paymentStatus === 'PAID' ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        🟢 Paid
                      </span>
                    ) : p.paymentStatus === 'PARTIAL' ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-sky-50 text-sky-700 border border-sky-200">
                        🔵 Partial
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-50 text-amber-800 border border-amber-200">
                        🔴 Unpaid / Credit
                      </span>
                    )
                  )}
                </td>
                <td className="p-4 text-xs font-medium">
                  {p.verifiedBy ? (
                    <div className="space-y-0.5">
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full text-xs">
                        <ShieldCheck size={14} /> Verified
                      </span>
                      <div className="text-[10px] text-slate-500 font-semibold mt-1">
                        Verified By: <span className="text-slate-800 font-bold">{p.verifiedBy || 'Admin'}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        Verified On: {new Date(p.verifiedAt || p.updatedAt || p.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  ) : ['ACCOUNTANT', 'OWNER'].includes(user?.role) ? (
                    <button
                      onClick={() => onVerify(p.id)}
                      disabled={verifyingId === p.id}
                      className="px-3 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 rounded-full font-bold text-xs transition"
                    >
                      {verifyingId === p.id ? 'Verifying...' : 'Verify Bill'}
                    </button>
                  ) : (
                    <span className="text-slate-400 italic">Unverified</span>
                  )}
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button onClick={() => onView(p)}
                      className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors inline-flex items-center gap-1 text-xs font-bold bg-slate-100">
                      <Eye size={15} /> View
                    </button>
                    <button onClick={() => onPrint(p)}
                      className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors inline-flex items-center gap-1 text-xs font-bold bg-slate-100">
                      <Printer size={15} /> Print
                    </button>
                    {user?.role === 'OWNER' && (
                      <button
                        onClick={() => onDelete(p)}
                        disabled={deletingId === p.id}
                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors inline-flex items-center text-xs font-bold bg-rose-50"
                        title="Delete Purchase"
                      >
                        <Trash2 size={15} />
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
