import { Calendar, Eye, Printer, ShieldCheck, Trash2, ShoppingCart, Building2, Edit3, CreditCard } from 'lucide-react';
import { usePagination } from '../../hooks/usePagination';
import TablePagination from '../common/TablePagination';
import { TableActionMenu } from '../ui';

export default function PurchasesTable({
  purchases = [],
  loading = false,
  onView,
  onPrint,
  onEdit,
  onVerify,
  onDelete,
  onRecordPayment,
  verifyingId,
  deletingId,
  isOwner,
  isAccountant,
  user,
  onOpenModal
}) {
  const canAddPurchase = ['OWNER', 'ACCOUNTANT', 'ADMIN'].includes(user?.role);
  const pagination = usePagination(purchases || [], 50);

  if (loading && (!purchases || purchases.length === 0)) {
    return (
      <div className="card-surface p-12 text-center flex flex-col items-center min-h-75 justify-center">
        <div className="w-8 h-8 border-3 border-brand/20 border-t-brand rounded-full animate-spin mb-3" />
        <p className="text-slate-500 text-xs font-medium">Loading purchase records...</p>
      </div>
    );
  }

  if (!purchases || purchases.length === 0) {
    return (
      <div className="card-surface p-12 text-center flex flex-col items-center min-h-75 justify-center">
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
        return <span className="badge-success text-[10px]">Received</span>;
      case 'PARTIALLY_RECEIVED':
        return <span className="badge-brand text-[10px]">Partial</span>;
      case 'PENDING':
        return <span className="badge-warning text-[10px]">Pending</span>;
      case 'CANCELLED':
        return <span className="badge-danger text-[10px]">Cancelled</span>;
      default:
        return <span className="badge-neutral text-[10px]">{status || 'Received'}</span>;
    }
  };

  const renderPaymentBadge = (status) => {
    if (status === 'PAID') {
      return <span className="badge-success text-[10px]">Paid</span>;
    }
    if (status === 'PARTIAL') {
      return <span className="badge-warning text-[10px]">Partial</span>;
    }
    return <span className="badge-danger text-[10px]">Credit / Khata</span>;
  };

  return (
    <div className="table-container">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr>
              <th className="table-th">Invoice & Date</th>
              <th className="table-th">Vendor</th>
              <th className="table-th">Total & Due</th>
              <th className="table-th">Status & Payment</th>
              <th className="table-th">Verification</th>
              <th className="table-th text-right sticky right-0 bg-slate-50/95 z-10 shadow-[-6px_0_8px_-4px_rgba(0,0,0,0.04)]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {pagination.paginatedItems.map(p => {
              const dueAmount = Number(p.outstandingAmount ?? Math.max(0, Number(p.grandTotal || 0) - Number(p.paidAmount || 0)));
              const isUnpaid = p.paymentStatus !== 'PAID';

              const menuItems = [
                {
                  label: 'View Purchase Bill',
                  icon: Eye,
                  onClick: () => onView && onView(p),
                },
                {
                  label: 'Print Voucher',
                  icon: Printer,
                  onClick: () => onPrint && onPrint(p),
                },
                !p.verifiedBy && (isAccountant || isOwner) ? {
                  label: 'Verify Purchase Bill',
                  icon: ShieldCheck,
                  onClick: () => onVerify && onVerify(p.id),
                } : null,
                isOwner ? {
                  label: 'Edit Purchase',
                  icon: Edit3,
                  onClick: () => onEdit && onEdit(p),
                } : null,
                isOwner ? { divider: true } : null,
                isOwner ? {
                  label: 'Delete Purchase',
                  icon: Trash2,
                  variant: 'danger',
                  disabled: deletingId === p.id,
                  onClick: () => onDelete && onDelete(p),
                } : null,
              ];

              return (
                <tr 
                  key={p.id} 
                  onClick={() => onView && onView(p)}
                  className="hover:bg-slate-50/90 transition-colors cursor-pointer group"
                >
                  {/* 1. Invoice # & Date */}
                  <td className="table-td">
                    <span className="font-mono font-bold text-brand block">
                      {p.invoiceNo || `#${p.id.slice(0, 8).toUpperCase()}`}
                    </span>
                    <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 whitespace-nowrap">
                      <Calendar size={11} className="text-slate-400 shrink-0" />
                      {new Date(p.purchaseDate || p.createdAt).toLocaleDateString('en-GB')}
                    </span>
                  </td>

                  {/* 2. Vendor */}
                  <td className="table-td">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800">
                      <Building2 size={14} className="text-slate-400 shrink-0" />
                      <span className="truncate max-w-[160px] sm:max-w-xs">{p.vendor?.name || 'Unknown Vendor'}</span>
                    </div>
                  </td>

                  {/* 3. Total & Due */}
                  <td className="table-td tabular-nums text-xs">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-slate-900 font-mono text-sm">
                        Rs. {Number(p.grandTotal).toLocaleString('en-PK')}
                      </span>
                      {isUnpaid && dueAmount > 0 ? (
                        <span className="text-[10px] text-rose-600 font-mono font-bold">
                          Due: Rs. {dueAmount.toLocaleString('en-PK')}
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-700 font-mono font-medium">
                          Paid in Full
                        </span>
                      )}
                    </div>
                  </td>

                  {/* 4. Status & Payment */}
                  <td className="table-td">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {renderStatusBadge(p.status)}
                      {renderPaymentBadge(p.paymentStatus)}
                    </div>
                  </td>

                  {/* 5. Verification */}
                  <td className="table-td text-xs font-medium">
                    {p.verifiedBy ? (
                      <div className="space-y-0.5">
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px]">
                          <ShieldCheck size={11} /> Verified
                        </span>
                        <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                          By: <span className="text-slate-800 font-bold">{p.verifiedBy}</span>
                        </div>
                      </div>
                    ) : (isAccountant || isOwner) ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onVerify(p.id);
                        }}
                        disabled={verifyingId === p.id}
                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 rounded-lg font-bold text-xs transition cursor-pointer"
                      >
                        {verifyingId === p.id ? 'Verifying...' : 'Verify'}
                      </button>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">Unverified</span>
                    )}
                  </td>

                  {/* 6. Actions (Sticky Right) */}
                  <td 
                    className="table-td text-right sticky right-0 bg-white group-hover:bg-slate-50/90 z-10 shadow-[-6px_0_8px_-4px_rgba(0,0,0,0.04)] transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                      {isUnpaid && onRecordPayment && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRecordPayment(p);
                          }}
                          className="py-1 px-2.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 transition-colors inline-flex items-center gap-1 cursor-pointer"
                          title="Record Payment / Settle Khata"
                        >
                          <CreditCard size={12} /> Pay
                        </button>
                      )}

                      <TableActionMenu items={menuItems} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <TablePagination pagination={pagination} />
    </div>
  );
}
