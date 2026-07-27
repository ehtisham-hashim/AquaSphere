import { useState } from 'react';
import { X, UserPlus } from 'lucide-react';

const API = import.meta.env.VITE_API_URL;

const INPUT = 'w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none';

export default function AddCustomerInlineModal({ onClose, onCustomerAdded }) {
  const [form, setForm] = useState({
    name: '', phone: '', type: 'Home', address: '', mapLink: '',
    deposit: 0, securityDeposit: 0, defaultPrice: 0, creditLimit: 0, creditDuration: 1, remarks: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.mapLink) {
      const valid = ['maps.google.com', 'google.com/maps', 'goo.gl', 'maps.app.goo.gl'].some(d => form.mapLink.includes(d));
      if (!valid) { setError('Invalid Google Maps URL'); return; }
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${API}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
        credentials: 'include'
      });
      const json = await res.json();
      if (json.success) {
        onCustomerAdded(json.data);
      } else {
        setError(json.message || 'Failed to add customer');
      }
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <UserPlus size={20} className="text-emerald-600"/>
            <h3 className="font-bold text-slate-800">Add New Customer</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Full Name *</label>
              <input name="name" className={INPUT} value={form.name} onChange={handleChange} required autoFocus/>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Phone *</label>
              <input name="phone" type="tel" className={INPUT} value={form.phone} onChange={handleChange} required/>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Type *</label>
              <select name="type" className={INPUT} value={form.type} onChange={handleChange}>
                <option>Home</option><option>Restaurant</option><option>Shop</option><option>Distributor</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Address</label>
            <textarea name="address" rows={2} className={INPUT} value={form.address} onChange={handleChange}/>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Google Maps Link</label>
            <input name="mapLink" type="url" className={INPUT} value={form.mapLink} onChange={handleChange} placeholder="https://maps.google.com/..."/>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Security Deposit (19L bottles)</label>
              <input name="securityDeposit" type="number" className={INPUT} value={form.securityDeposit} onChange={handleChange}/>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Default Price</label>
              <input name="defaultPrice" type="number" className={INPUT} value={form.defaultPrice} onChange={handleChange}/>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Credit Limit (0=∞)</label>
              <input name="creditLimit" type="number" className={INPUT} value={form.creditLimit} onChange={handleChange}/>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Credit Days</label>
              <input name="creditDuration" type="number" className={INPUT} value={form.creditDuration} onChange={handleChange}/>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Remarks</label>
            <input name="remarks" className={INPUT} value={form.remarks} onChange={handleChange}/>
          </div>

          <div className="flex gap-3 pt-2 border-t border-slate-100">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-slate-600 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50">
              {saving ? 'Saving...' : 'Add & Select Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
