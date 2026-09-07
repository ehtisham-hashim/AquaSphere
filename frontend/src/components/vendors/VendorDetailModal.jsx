import { useState } from 'react';
import { X, Calendar, CreditCard, FileText, ShoppingCart, Receipt } from 'lucide-react';

export default function VendorDetailModal({
  selectedVendorDetail,
  onClose,
  canPayOrArchive,
  onOpenPayment
}) {
  const [profileTab, setProfileTab] = useState('ledger');

  if (!selectedVendorDetail) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-8 border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-xl font-bold text-slate-800">{selectedVendorDetail.name}</h3>
            <p className="text-xs text-slate-500">Contact: {selectedVendorDetail.phone} | {selectedVendorDetail.email || 'No email registered'}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={22} />
          </button>
        </div>

        {/* Overview Metric Cards */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="card-surface p-3">
              <span className="text-slate-400 font-semibold block mb-0.5 text-[11px] uppercase">Last Purchase</span>
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <Calendar size={13} className="text-slate-400" />
                {selectedVendorDetail.lastPurchaseDate 
                  ? new Date(selectedVendorDetail.lastPurchaseDate).toLocaleDateString()
                  : 'No purchases'}
              </span>
            </div>

            <div className="card-surface p-3">
              <span className="text-slate-400 font-semibold block mb-0.5 text-[11px] uppercase">Total Purchases</span>
              <span className="text-sm font-bold font-mono text-slate-900">
                Rs {Number(selectedVendorDetail.totalPurchases || 0).toLocaleString()}
              </span>
            </div>

            <div className="card-surface p-3">
              <span className="text-slate-400 font-semibold block mb-0.5 text-[11px] uppercase">Total Paid</span>
              <span className="text-sm font-bold font-mono text-emerald-700">
                Rs {Number(selectedVendorDetail.totalPaid || 0).toLocaleString()}
              </span>
            </div>

            <div className="card-surface p-3 flex justify-between items-center">
              <div>
                <span className="text-slate-400 font-semibold block mb-0.5 text-[11px] uppercase">Payable Balance</span>
                <span className="text-sm font-bold font-mono text-[var(--brand)]">
                  Rs {Number(selectedVendorDetail.payableBalance || 0).toLocaleString()}
                </span>
              </div>
              {canPayOrArchive && (
                <button
                  onClick={() => onOpenPayment(selectedVendorDetail)}
                  disabled={Number(selectedVendorDetail.payableBalance || 0) <= 0}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition inline-flex items-center gap-1 ${
                    Number(selectedVendorDetail.payableBalance || 0) <= 0
                      ? 'text-slate-300 bg-slate-100 cursor-not-allowed'
                      : 'btn-primary py-1 px-2.5'
                  }`}
                >
                  <CreditCard size={12} /> Pay
                </button>
              )}
            </div>
          </div>

          {/* Profile Tabs */}
          <div className="flex border-b border-slate-200 gap-1">
            <button
              onClick={() => setProfileTab('ledger')}
              className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all flex items-center gap-1.5 border-t border-x ${
                profileTab === 'ledger'
                  ? 'bg-white border-slate-200 text-[var(--brand)] border-b-2 border-b-[var(--brand)]'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <FileText size={13} /> Vendor Ledger
            </button>

            <button
              onClick={() => setProfileTab('purchases')}
              className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all flex items-center gap-1.5 border-t border-x ${
                profileTab === 'purchases'
                  ? 'bg-white border-slate-200 text-[var(--brand)] border-b-2 border-b-[var(--brand)]'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <ShoppingCart size={13} /> Purchases ({selectedVendorDetail.purchases?.length || 0})
            </button>

            <button
              onClick={() => setProfileTab('payments')}
              className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all flex items-center gap-1.5 border-t border-x ${
                profileTab === 'payments'
                  ? 'bg-white border-slate-200 text-[var(--brand)] border-b-2 border-b-[var(--brand)]'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Receipt size={13} /> Payments ({selectedVendorDetail.payments?.length || 0})
            </button>
          </div>

          {/* TAB 1: LEDGER */}
          {profileTab === 'ledger' && (
            <div>
              {(!selectedVendorDetail.ledgerEntries || selectedVendorDetail.ledgerEntries.length === 0) ? (
                <p className="text-xs text-slate-400 italic p-4 text-center">No ledger activity recorded for this vendor.</p>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-slate-50 font-bold text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Remarks / Reference</th>
                        <th className="p-3 text-right">Amount</th>
                        <th className="p-3 text-right">Running Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {selectedVendorDetail.ledgerEntries?.map(entry => (
                        <tr key={entry.id} className="hover:bg-slate-50/80">
                          <td className="p-3 text-slate-500">{new Date(entry.createdAt).toLocaleString()}</td>
                          <td className="p-3">
                            {entry.type === 'PURCHASE' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800">
                                PURCHASE (+)
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                PAYMENT (-)
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-slate-600">{entry.remarks || '—'}</td>
                          <td className={`p-3 text-right font-bold ${entry.type === 'PURCHASE' ? 'text-amber-700' : 'text-emerald-700'}`}>
                            Rs {Number(entry.amount).toLocaleString()}
                          </td>
                          <td className="p-3 text-right font-black text-indigo-900">
                            Rs {Number(entry.runningBalance || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PURCHASES */}
          {profileTab === 'purchases' && (
            <div>
              {!selectedVendorDetail.purchases?.length ? (
                <p className="text-xs text-slate-400 italic p-4 text-center">No purchases recorded from this vendor.</p>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-slate-50 font-bold text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="p-3">Invoice No</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Items Purchased</th>
                        <th className="p-3 text-right">Total Amount</th>
                        <th className="p-3 text-right">Receipt Proof</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {selectedVendorDetail.purchases?.map(pur => (
                        <tr key={pur.id} className="hover:bg-slate-50/80">
                          <td className="p-3 font-bold text-slate-800">{pur.invoiceNo || 'INV-MANUAL'}</td>
                          <td className="p-3 text-slate-500">{new Date(pur.createdAt).toLocaleDateString()}</td>
                          <td className="p-3 text-slate-700">
                            {pur.items?.map(i => `${i.item?.name || 'Material'} (${i.quantity})`).join(', ') || '—'}
                          </td>
                          <td className="p-3 text-right font-bold text-slate-900">
                            Rs {Number(pur.grandTotal || 0).toLocaleString()}
                          </td>
                          <td className="p-3 text-right">
                            {pur.receiptUrl ? (
                              <a href={pur.receiptUrl} target="_blank" rel="noreferrer" className="text-indigo-600 font-bold hover:underline">
                                📷 View Receipt
                              </a>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PAYMENTS */}
          {profileTab === 'payments' && (
            <div>
              {!selectedVendorDetail.payments?.length ? (
                <p className="text-xs text-slate-400 italic p-4 text-center">No payment transactions recorded for this vendor.</p>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-slate-50 font-bold text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Method</th>
                        <th className="p-3">Reference #</th>
                        <th className="p-3">Remarks</th>
                        <th className="p-3 text-right">Amount</th>
                        <th className="p-3 text-right">Attached Bank Proof</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {selectedVendorDetail.payments?.map(pay => (
                        <tr key={pay.id} className="hover:bg-slate-50/80">
                          <td className="p-3 text-slate-500">{new Date(pay.createdAt).toLocaleDateString()}</td>
                          <td className="p-3 font-bold text-purple-800">{pay.paymentMethod || 'CASH'}</td>
                          <td className="p-3 text-slate-600">{pay.referenceNo || '—'}</td>
                          <td className="p-3 text-slate-600">{pay.remarks || '—'}</td>
                          <td className="p-3 text-right font-bold text-emerald-700">
                            Rs {Number(pay.amount).toLocaleString()}
                          </td>
                          <td className="p-3 text-right">
                            {pay.proofUrl ? (
                              <a href={pay.proofUrl} target="_blank" rel="noreferrer" className="text-emerald-600 font-bold hover:underline">
                                📷 View Bank Slip
                              </a>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-100 px-6 py-3 flex justify-end shrink-0">
          <button onClick={onClose} className="btn-secondary">
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
}
