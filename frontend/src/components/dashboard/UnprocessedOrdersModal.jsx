import { X, Clock, ShoppingBag, ArrowRight, Phone, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function UnprocessedOrdersModal({
  isOpen,
  onClose,
  unprocessedOrders = [],
  timeframeLabel = 'This Month',
  unprocessedSales = 0,
  deliveredSales = 0,
  totalSales = 0
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] border border-slate-100 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-400">
              <Clock size={20} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold">Unprocessed & Pending Orders</h3>
              <p className="text-xs text-slate-300">
                Orders booked {timeframeLabel.toLowerCase()} awaiting delivery or dispatch.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Financial Breakdown Pill Strip */}
        <div className="bg-slate-50 border-b border-slate-200/80 px-6 py-3.5 grid grid-cols-3 gap-2.5 text-center shrink-0">
          <div className="bg-white p-2.5 rounded-xl border border-slate-200/70 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Booked</span>
            <span className="text-xs sm:text-sm font-bold font-mono text-slate-800">
              Rs. {Number(totalSales || 0).toLocaleString()}
            </span>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-emerald-200/70 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">Delivered Sales</span>
            <span className="text-xs sm:text-sm font-bold font-mono text-emerald-700">
              Rs. {Number(deliveredSales || 0).toLocaleString()}
            </span>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-amber-200/70 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 block">Pending / Unpaid</span>
            <span className="text-xs sm:text-sm font-bold font-mono text-amber-700">
              Rs. {Number(unprocessedSales || 0).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Body / List */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {unprocessedOrders.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <ShoppingBag size={24} />
              </div>
              <p className="text-sm font-semibold text-slate-700">All caught up!</p>
              <p className="text-xs text-slate-400">There are no pending or unprocessed orders for this period.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
                <span>Pending Delivery Orders ({unprocessedOrders.length})</span>
                <span className="text-[11px] text-slate-400">Cash is received only after delivery</span>
              </div>

              {unprocessedOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-xs text-brand">
                        {ord.shortId}
                      </span>
                      <span className="badge-warning text-[10px]">
                        <Clock size={10} />
                        {ord.deliveryStatus}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        ord.paymentStatus === 'PAID'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : ord.paymentStatus === 'PARTIAL'
                          ? 'bg-sky-50 text-sky-700 border border-sky-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {ord.paymentStatus}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(ord.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-slate-800">{ord.customerName}</span>
                      {ord.customerPhone && (
                        <a
                          href={`tel:${ord.customerPhone}`}
                          className="text-slate-400 hover:text-brand flex items-center gap-1 text-[11px]"
                        >
                          <Phone size={10} />
                          {ord.customerPhone}
                        </a>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-500 max-w-md">
                      Items: <span className="font-medium text-slate-700">{ord.itemsSummary}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 sm:block hidden">Order Total</span>
                    <span className="text-sm font-bold font-mono text-slate-900">
                      Rs. {Number(ord.totalAmount || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {unprocessedOrders.length > 0 && (
            <div className="p-3 bg-amber-50/70 border border-amber-200/70 rounded-xl text-amber-900 text-xs flex items-start gap-2">
              <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Note:</strong> Monthly Sales reflects total orders booked. Cash Inflow is recorded when payments are logged upon delivery or invoice settlement.
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <Link
            to="/orders"
            onClick={onClose}
            className="text-xs font-bold text-brand hover:underline flex items-center gap-1.5"
          >
            Go to Orders Management <ArrowRight size={13} />
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-xs py-1.5 px-4 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
