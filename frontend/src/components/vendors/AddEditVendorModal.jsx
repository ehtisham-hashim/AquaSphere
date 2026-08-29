import { X, Loader2 } from 'lucide-react';

export default function AddEditVendorModal({
  isOpen,
  onClose,
  onSubmit,
  formData,
  setFormData,
  editingVendor,
  submitting
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100">
        <div className="bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800">
            {editingVendor ? 'Edit Vendor' : 'Add New Vendor'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4 text-sm">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Company / Vendor Name *</label>
            <input
              className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-emerald-500"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. ABC Chemicals & Packaging"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Phone Number *</label>
            <input
              className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-emerald-500"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="e.g. 03001234567"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-emerald-500"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="supplier@example.com"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Factory / Warehouse Address</label>
            <input
              className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-emerald-500"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Street / Industrial Area location"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Notes / Remarks</label>
            <textarea
              className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-emerald-500 h-24"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Payment terms, material types supplied..."
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl">
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={submitting} 
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white px-5 py-2 rounded-xl font-bold shadow-md flex items-center gap-2"
            >
              {submitting ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : (editingVendor ? 'Update Vendor' : 'Save Vendor')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
