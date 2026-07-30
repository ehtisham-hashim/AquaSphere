import { useState } from 'react';
import { toast } from 'sonner';
import { X, UserPlus, MapPin, DollarSign, FileText, ShoppingBag } from 'lucide-react';

import { API_URL as API } from '../../utils/api';

const initialFormData = {
  name: '',
  phone: '',
  type: 'Home',
  mapLink: '',
  securityDeposit: 0,
  currentBalance: 0,
  creditLimit: 0,
  creditDuration: 1,
  remarks: '',
  homePictureUrl: '',
  buys19L: false,
  qty19L: 0,
  buys05LPet: false,
  qty05LPet: 0,
  buys15LPet: false,
  qty15LPet: 0,
  buysPure05L: false,
  qtyPure05L: 0,
  buysPure15L: false,
  qtyPure15L: 0,
  buysMix05L: false,
  qtyMix05L: 0,
  buysMix15L: false,
  qtyMix15L: 0
};

export default function AddCustomerModal({ isOpen, onClose, onCustomerAdded }) {
  const tenant = (localStorage.getItem('tenant') || 'aquasphere').toLowerCase();
  const isWadaana = tenant === 'wadaana';

  const [formData, setFormData] = useState(initialFormData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.mapLink) {
      const isValid = ['maps.google.com', 'google.com/maps', 'goo.gl', 'maps.app.goo.gl'].some((d) =>
        formData.mapLink.includes(d)
      );
      if (!isValid) {
        setError('Please enter a valid Google Maps URL (e.g. maps.google.com, google.com/maps, or goo.gl)');
        return;
      }
    }

    setSaving(true);
    setError('');

    try {
      const res = await fetch(`${API}/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant': tenant
        },
        body: JSON.stringify({
          ...formData,
          securityDeposit: formData.securityDeposit ? parseInt(formData.securityDeposit) : 0,
          currentBalance: formData.currentBalance ? parseFloat(formData.currentBalance) : 0,
          creditLimit: formData.creditLimit ? parseFloat(formData.creditLimit) : 0,
          creditDuration: formData.creditDuration ? parseInt(formData.creditDuration) : 1
        }),
        credentials: 'include'
      });
      const json = await res.json();
      if (json.success || res.ok) {
        toast.success('✅ Customer created successfully.');
        setFormData(initialFormData);
        if (onCustomerAdded) onCustomerAdded(json.data);
        onClose();
      } else {
        toast.error(json.message || 'Failed to add customer');
        setError(json.message || 'Failed to add customer');
      }
    } catch {
      toast.error('Network error. Please try again.');
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center z-10">
          <div className="flex items-center gap-2">
            <UserPlus size={20} className={isWadaana ? 'text-[#0ea5e9]' : 'text-emerald-600'} />
            <h3 className="text-lg font-bold text-slate-800">Add New Customer</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Section 1: Basic Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 uppercase tracking-wider">
              <UserPlus size={16} className={isWadaana ? 'text-[#0ea5e9]' : 'text-emerald-600'} />
              <span>Basic Details</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                <input
                  name="name"
                  type="text"
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9] outline-none"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. John Doe"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number *</label>
                <input
                  name="phone"
                  type="tel"
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9] outline-none"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="e.g. 03001234567"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Customer Type *</label>
                <select
                  name="type"
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9] outline-none"
                  value={formData.type}
                  onChange={handleChange}
                >
                  <option value="Home">Home</option>
                  <option value="Restaurant">Restaurant</option>
                  <option value="Shop">Shop</option>
                  <option value="Distributor">Distributor</option>
                  <option value="Commercial">Commercial</option>
                  <option value="Office">Office</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: What Customer is Buying */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 uppercase tracking-wider">
              <ShoppingBag size={16} className={isWadaana ? 'text-[#0ea5e9]' : 'text-emerald-600'} />
              <span>Purchasing Products ({isWadaana ? 'Wadaana Bottles' : 'AquaSphere'})</span>
            </div>
            
            {!isWadaana ? (
              /* Aquasphere Buying Options */
              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    name="buys19L"
                    checked={formData.buys19L}
                    onChange={handleChange}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>19L Bottles</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    name="buys05LPet"
                    checked={formData.buys05LPet}
                    onChange={handleChange}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>0.5L PET</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    name="buys15LPet"
                    checked={formData.buys15LPet}
                    onChange={handleChange}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>1.5L PET</span>
                </label>
              </div>
            ) : (
              /* Wadaana Pure/Mix Preform Bottles Hierarchy */
              <div className="space-y-3.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <div className="text-xs font-bold text-[#0ea5e9] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#0ea5e9]"></span>
                    Pure Preform Bottles
                  </div>
                  <div className="grid grid-cols-2 gap-3 pl-3.5 border-l-2 border-[#0ea5e9]/30">
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        name="buysPure05L"
                        checked={formData.buysPure05L}
                        onChange={handleChange}
                        className="w-4 h-4 rounded text-[#0ea5e9] focus:ring-[#0ea5e9]"
                      />
                      <span>0.5L Pure Bottle <span className="text-xs text-slate-400 font-normal">(15g)</span></span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        name="buysPure15L"
                        checked={formData.buysPure15L}
                        onChange={handleChange}
                        className="w-4 h-4 rounded text-[#0ea5e9] focus:ring-[#0ea5e9]"
                      />
                      <span>1.5L Pure Bottle <span className="text-xs text-slate-400 font-normal">(30g)</span></span>
                    </label>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200">
                  <div className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    Mix Preform Bottles
                  </div>
                  <div className="grid grid-cols-2 gap-3 pl-3.5 border-l-2 border-amber-500/30">
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        name="buysMix05L"
                        checked={formData.buysMix05L}
                        onChange={handleChange}
                        className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                      />
                      <span>0.5L Mix Bottle <span className="text-xs text-slate-400 font-normal">(13g)</span></span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        name="buysMix15L"
                        checked={formData.buysMix15L}
                        onChange={handleChange}
                        className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                      />
                      <span>1.5L Mix Bottle <span className="text-xs text-slate-400 font-normal">(27g)</span></span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Location & Media */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 uppercase tracking-wider">
              <MapPin size={16} className={isWadaana ? 'text-[#0ea5e9]' : 'text-emerald-600'} />
              <span>Location & Media</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Address</label>
                <textarea
                  name="address"
                  rows="2"
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9] outline-none"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Street address, house/shop number, area..."
                ></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Google Maps Link</label>
                <input
                  name="mapLink"
                  type="url"
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9] outline-none"
                  value={formData.mapLink}
                  onChange={handleChange}
                  placeholder="https://maps.google.com/..."
                />
              </div>
            </div>
          </div>

          {/* Section 4: Financial Setup */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 uppercase tracking-wider">
              <DollarSign size={16} className={isWadaana ? 'text-[#0ea5e9]' : 'text-emerald-600'} />
              <span>Financial Setup</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Current Debt (Rs)</label>
                <input
                  name="currentBalance"
                  type="number"
                  step="0.01"
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9] outline-none"
                  value={formData.currentBalance}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Security Deposit (Rs)</label>
                <input
                  name="securityDeposit"
                  type="number"
                  min="0"
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9] outline-none"
                  value={formData.securityDeposit}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Credit Limit (Rs)</label>
                <input
                  name="creditLimit"
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9] outline-none"
                  value={formData.creditLimit}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Credit Duration (Days)</label>
                <input
                  name="creditDuration"
                  type="number"
                  min="1"
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9] outline-none"
                  value={formData.creditDuration}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* Section 5: Remarks / Notes */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 uppercase tracking-wider">
              <FileText size={16} className={isWadaana ? 'text-[#0ea5e9]' : 'text-emerald-600'} />
              <span>Remarks & Notes</span>
            </div>
            <div>
              <textarea
                name="remarks"
                rows="2"
                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9] outline-none"
                value={formData.remarks}
                onChange={handleChange}
                placeholder="Any special instructions or remarks..."
              ></textarea>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-6 border-t border-slate-100 flex flex-col gap-3 md:flex-row justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors w-full md:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`${
                isWadaana ? 'bg-[#0ea5e9] hover:bg-[#0284c7]' : 'bg-emerald-600 hover:bg-emerald-700'
              } text-white px-6 py-2.5 rounded-lg font-medium shadow-sm transition-colors w-full md:w-auto disabled:opacity-50`}
            >
              {saving ? 'Saving...' : 'Save Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
