export { default } from '../features/purchasing/Vendors';
            type="search"
            placeholder="Search vendor by name or phone..."
            className="input-field pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-600 font-medium cursor-pointer self-start sm:self-auto">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
          />
          Show Archived Vendors
        </label>
      </div>

      <div className="surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 font-semibold text-slate-600 text-sm">Vendor</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Contact</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Address</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Status</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Payable Balance</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Bank Payment Evidence</th>
                <th className="p-4 font-semibold text-slate-600 text-sm text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVendors.map(v => (
                <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                        <Building2 size={18} />
                      </div>
                      <div>
                        <div className="font-bold text-slate-800">{v.name}</div>
                        {v.notes && <div className="text-xs text-slate-400 max-w-xs truncate">{v.notes}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-slate-600">
                    <div className="flex flex-col gap-1">
                      {v.phone && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-700">
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
                  <td className="p-4 text-sm text-slate-600">
                    {v.address ? (
                      <div className="flex items-center gap-1 text-xs text-slate-500 max-w-xs truncate">
                        <MapPin size={14} className="text-slate-400 shrink-0" /> {v.address}
                      </div>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="p-4 text-sm">
                    {v.archivedAt ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700">
                        ARCHIVED
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                        ACTIVE
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-sm font-bold text-slate-900">
                    Rs {Number(v.payableBalance || 0).toLocaleString()}
                  </td>
                  <td className="p-4 text-xs">
                    <span className="inline-flex items-center gap-1 text-indigo-600 font-medium">
                      📷 Attached Evidence
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {!v.archivedAt && (
                        <button
                          onClick={() => handleOpenPayment(v)}
                          className="px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors inline-flex items-center gap-1"
                          title="Record Payment to Vendor"
                        >
                          <CreditCard size={14} /> Pay
                        </button>
                      )}
                      <button
                        onClick={() => handleViewDetails(v)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="View Ledger & Purchases"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(v)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Edit Vendor"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleToggleArchive(v)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          v.archivedAt
                            ? 'text-emerald-600 hover:bg-emerald-50'
                            : 'text-rose-500 hover:bg-rose-50'
                        }`}
                        title={v.archivedAt ? 'Restore Vendor' : 'Archive Vendor'}
                      >
                        {v.archivedAt ? <RefreshCw size={16} /> : <Archive size={16} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredVendors.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500">
                    No vendors found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add / Edit Vendor Modal ────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">
                {editingVendor ? 'Edit Vendor' : 'Add New Vendor'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company / Vendor Name *</label>
                <input
                  className="input-field"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. ABC Chemicals Ltd."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number *</label>
                <input
                  className="input-field"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g. 03001234567"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  className="input-field"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="supplier@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                <input
                  className="input-field"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Factory / Warehouse location"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes / Remarks</label>
                <textarea
                  className="text-area h-28"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows="2"
                  placeholder="Payment terms, material types supplied, etc."
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg text-sm">
                  Cancel
                </button>
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-medium shadow-sm text-sm">
                  {editingVendor ? 'Update Vendor' : 'Save Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Record Vendor Payment Modal ────────────────────────────────────── */}
      {isPaymentModalOpen && selectedVendorForPayment && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Record Vendor Payment</h3>
                <p className="text-xs text-slate-500">Paying: {selectedVendorForPayment.name}</p>
              </div>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-500 uppercase">Current Payable Balance</span>
                <span className="text-base font-extrabold text-slate-800">
                  Rs {Number(selectedVendorForPayment.payableBalance || 0).toLocaleString()}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Amount (Rs) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="input-field font-bold text-slate-800"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method *</label>
                <select
                  className="input-field bg-white"
                  value={paymentData.paymentMethod}
                  onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
                >
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Date *</label>
                <input
                  type="date"
                  className="input-field"
                  value={paymentData.paymentDate}
                  onChange={(e) => setPaymentData({ ...paymentData, paymentDate: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Remarks / Reference</label>
                <input
                  className="input-field"
                  value={paymentData.remarks}
                  onChange={(e) => setPaymentData({ ...paymentData, remarks: e.target.value })}
                  placeholder="e.g. Bank Ref #49120 or Cheque #1029"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg text-sm">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paymentSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-5 py-2 rounded-lg font-bold shadow-sm text-sm flex items-center gap-2"
                >
                  {paymentSubmitting ? <><Loader2 size={16} className="animate-spin" /> Recording...</> : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── View Vendor Details & Ledger Modal ───────────────────────────────── */}
      {selectedVendorDetail && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl overflow-hidden my-8">
            <div className="bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-800">{selectedVendorDetail.name}</h3>
                <p className="text-xs text-slate-500">Contact: {selectedVendorDetail.phone} | {selectedVendorDetail.email || 'No email'}</p>
              </div>
              <button onClick={() => setSelectedVendorDetail(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm bg-slate-50 p-4 rounded-xl">
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Payable Balance</span>
                  <span className="text-lg font-black text-indigo-600">
                    Rs {Number(selectedVendorDetail.payableBalance || 0).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Address</span>
                  <span className="font-semibold text-slate-700">{selectedVendorDetail.address || '—'}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Total Ledger Entries</span>
                  <span className="font-semibold text-slate-700">{selectedVendorDetail.ledgerEntries?.length || 0}</span>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-3">Ledger History (Purchases & Payments)</h4>
                {selectedVendorDetail.ledgerEntries?.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No ledger activity logged yet.</p>
                ) : (
                  <table className="w-full text-left border border-slate-100 rounded-lg overflow-hidden text-sm">
                    <thead className="bg-slate-50 text-xs font-semibold text-slate-600 border-b border-slate-100">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Remarks</th>
                        <th className="p-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedVendorDetail.ledgerEntries?.map(entry => (
                        <tr key={entry.id}>
                          <td className="p-3 text-xs text-slate-500">{new Date(entry.createdAt).toLocaleString()}</td>
                          <td className="p-3">
                            {entry.type === 'PURCHASE' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800">
                                PURCHASE (+ Payable)
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800">
                                PAYMENT (- Payable)
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-xs text-slate-600">{entry.remarks || '—'}</td>
                          <td className={`p-3 text-right font-bold ${entry.type === 'PURCHASE' ? 'text-amber-700' : 'text-emerald-700'}`}>
                            Rs {Number(entry.amount).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

