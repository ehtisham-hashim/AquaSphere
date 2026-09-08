import { Calendar, Eye, Printer, ShieldCheck, Trash2, ShoppingCart, Building2, Edit3 } from 'lucide-react';

export default function PurchasesTable({
  purchases = [],
  onView,
  onPrint,
  onEdit,
  onVerify,
  onDelete,
  verifyingId,
  deletingId,
  isOwner,
  isAccountant,
  user,
  onOpenModal
}) {
  const canAddPurchase = ['OWNER', 'PRODUCTION_MANAGER', 'ACCOUNTANT', 'ADMIN'].includes(user?.role);

  if (!purchases || purchases.length === 0) {
    return (
      <div className="card-surface p-12 text-center flex flex-col items-center min-h-[300px] justify-center">
        <ShoppingCart size={40} className="text-slate-300 mb-3" />
        <h3 className="text-base font-bold text-slate-700 mb-1">No Purchase Records Found</h3>
        <p className="text-slate-500 max-w-md text-xs mb-4">
          Log raw material purchases to track plant stock levels and manage supplier khata accounts.
        </p>
        {canAddPurchase && (
          <button onClick={onOpenModal} className="btn-primary">
            Record First Purchase
          </button>
        )}
      </div>
    );
  }

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'RECEIVED':
        return <span className="badge-success">Received</span>;
      case 'PARTIALLY_RECEIVED':
        return <span className="badge-brand">Partial</span>;
      case 'PENDING':
        return <span className="badge-warning">Pending</span>;
      case 'CANCELLED':
        return <span className="badge-danger">Cancelled</span>;
      default:
        return <span className="badge-neutral">{status || 'Received'}</span>;
    }
  };

  const renderPaymentBadge = (status) => {
    if (status === 'PAID') {
      return <span className="badge-success">Paid</span>;
    }
    return <span className="badge-danger">Credit / Khata</span>;
  };

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
              <th className="table-th">Stock Status</th>
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
                    {new Date(p.purchaseDate || p.createdAt).toLocaleDateString('en-GB')}
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
                  {renderStatusBadge(p.status)}
                </td>
                <td className="table-td">
                  {renderPaymentBadge(p.paymentStatus)}
                </td>
                <td className="table-td text-xs font-medium">
                  {p.verifiedBy ? (
                    <div className="space-y-0.5">
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[11px]">
                        <ShieldCheck size={12} /> Verified
                      </span>
                      <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                        By: <span className="text-slate-800 font-bold">{p.verifiedBy}</span>
                      </div>
                      {p.verifiedAt && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          {new Date(p.verifiedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      )}
                    </div>
                  ) : (isAccountant || isOwner) ? (
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
                      title="View Details"
                    >
                      <Eye size={14} /> View
                    </button>
                    <button
                      onClick={() => onPrint(p)}
                      className="p-1.5 text-slate-600 hover:text-[var(--brand)] hover:bg-slate-100 rounded-lg transition inline-flex items-center gap-1 text-xs font-semibold"
                      title="Print Voucher"
                    >
                      <Printer size={14} /> Print
                    </button>

                    {/* Strictly OWNER can Edit */}
                    {isOwner && (
                      <button
                        onClick={() => onEdit(p)}
                        className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition inline-flex items-center text-xs font-semibold"
                        title="Edit Purchase (Owner Only)"
                      >
                        <Edit3 size={14} />
                      </button>
                    )}

                    {/* Strictly OWNER can Delete */}
                    {isOwner && (
                      <button
                        onClick={() => onDelete(p)}
                        disabled={deletingId === p.id}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition inline-flex items-center text-xs font-semibold"
                        title="Delete Purchase (Owner Only)"
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
