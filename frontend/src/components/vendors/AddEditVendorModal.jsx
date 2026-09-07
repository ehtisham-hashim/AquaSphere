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

        <form onSubmit={onSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-bold uppercase text-slate-500 mb-1 text-[11px]">Company / Vendor Name *</label>
            <input
              className="input-base"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. ABC Chemicals & Packaging"
              required
            />
          </div>

          <div>
            <label className="block font-bold uppercase text-slate-500 mb-1 text-[11px]">Phone Number *</label>
            <input
              className="input-base"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="e.g. 03001234567"
              required
            />
          </div>

          <div>
            <label className="block font-bold uppercase text-slate-500 mb-1 text-[11px]">Email Address</label>
            <input
              type="email"
              className="input-base"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="supplier@example.com"
            />
          </div>

          <div>
            <label className="block font-bold uppercase text-slate-500 mb-1 text-[11px]">Factory / Warehouse Address</label>
            <input
              className="input-base"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Street / Industrial Area location"
            />
          </div>

          <div>
            <label className="block font-bold uppercase text-slate-500 mb-1 text-[11px]">Notes / Remarks</label>
            <textarea
              className="input-base h-20"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Payment terms, material types supplied..."
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={submitting} 
              className="btn-primary flex items-center gap-1.5"
            >
              {submitting ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : (editingVendor ? 'Update Vendor' : 'Save Vendor')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
