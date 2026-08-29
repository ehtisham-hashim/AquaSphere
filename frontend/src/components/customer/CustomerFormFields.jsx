import { MapPin, DollarSign, FileText, ShoppingBag } from 'lucide-react';

export default function CustomerFormFields({ formData, handleChange, isWadaana }) {
  return (
    <>
      {/* Basic Info Section */}
      <div className="space-y-4">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <MapPin size={14} className="text-slate-500" /> Basic Details
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Customer Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              required
              value={formData.name || ''}
              onChange={handleChange}
              placeholder="e.g. John Doe / Alpha Corp"
              className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Phone Number <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              name="phone"
              required
              value={formData.phone || ''}
              onChange={handleChange}
              placeholder="e.g. 03001234567"
              className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Type</label>
            <select
              name="type"
              value={formData.type || 'Home'}
              onChange={handleChange}
              className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 bg-white"
            >
              <option value="Home">Home / Residential</option>
              <option value="Commercial">Commercial / Business</option>
              <option value="Corporate">Corporate / Office</option>
              <option value="Distributor">Distributor / Reseller</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Delivery Address</label>
            <input
              type="text"
              name="address"
              value={formData.address || ''}
              onChange={handleChange}
              placeholder="House #, Street, Area..."
              className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Google Maps Pin Link</label>
            <input
              type="url"
              name="mapLink"
              value={formData.mapLink || ''}
              onChange={handleChange}
              placeholder="https://maps.google.com/?q=..."
              className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Product Demands */}
      <div className="space-y-4 pt-2 border-t border-slate-100">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <ShoppingBag size={14} className="text-slate-500" /> Products & Expected Quantities
        </h4>
        
        {isWadaana ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-sky-50/50 p-4 rounded-xl border border-sky-100">
            <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  name="buysPure05L"
                  checked={Boolean(formData.buysPure05L)}
                  onChange={handleChange}
                  className="rounded text-sky-600 focus:ring-sky-500 h-4 w-4"
                />
                0.5L Pure
              </label>
              {formData.buysPure05L && (
                <input
                  type="number"
                  name="qtyPure05L"
                  min="0"
                  value={formData.qtyPure05L || ''}
                  onChange={handleChange}
                  placeholder="Qty"
                  className="w-20 text-xs p-1 border rounded text-right font-bold"
                />
              )}
            </div>

            <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  name="buysPure15L"
                  checked={Boolean(formData.buysPure15L)}
                  onChange={handleChange}
                  className="rounded text-sky-600 focus:ring-sky-500 h-4 w-4"
                />
                1.5L Pure
              </label>
              {formData.buysPure15L && (
                <input
                  type="number"
                  name="qtyPure15L"
                  min="0"
                  value={formData.qtyPure15L || ''}
                  onChange={handleChange}
                  placeholder="Qty"
                  className="w-20 text-xs p-1 border rounded text-right font-bold"
                />
              )}
            </div>

            <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  name="buysMix05L"
                  checked={Boolean(formData.buysMix05L)}
                  onChange={handleChange}
                  className="rounded text-sky-600 focus:ring-sky-500 h-4 w-4"
                />
                0.5L Mix
              </label>
              {formData.buysMix05L && (
                <input
                  type="number"
                  name="qtyMix05L"
                  min="0"
                  value={formData.qtyMix05L || ''}
                  onChange={handleChange}
                  placeholder="Qty"
                  className="w-20 text-xs p-1 border rounded text-right font-bold"
                />
              )}
            </div>

            <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  name="buysMix15L"
                  checked={Boolean(formData.buysMix15L)}
                  onChange={handleChange}
                  className="rounded text-sky-600 focus:ring-sky-500 h-4 w-4"
                />
                1.5L Mix
              </label>
              {formData.buysMix15L && (
                <input
                  type="number"
                  name="qtyMix15L"
                  min="0"
                  value={formData.qtyMix15L || ''}
                  onChange={handleChange}
                  placeholder="Qty"
                  className="w-20 text-xs p-1 border rounded text-right font-bold"
                />
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-emerald-50/40 p-4 rounded-xl border border-emerald-100">
            <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  name="buys19L"
                  checked={Boolean(formData.buys19L)}
                  onChange={handleChange}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                19L Bottle
              </label>
              {formData.buys19L && (
                <input
                  type="number"
                  name="qty19L"
                  min="0"
                  value={formData.qty19L || ''}
                  onChange={handleChange}
                  placeholder="Qty"
                  className="w-16 text-xs p-1 border rounded text-right font-bold"
                />
              )}
            </div>

            <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  name="buys05LPet"
                  checked={Boolean(formData.buys05LPet)}
                  onChange={handleChange}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                0.5L PET Pack
              </label>
              {formData.buys05LPet && (
                <input
                  type="number"
                  name="qty05LPet"
                  min="0"
                  value={formData.qty05LPet || ''}
                  onChange={handleChange}
                  placeholder="Qty"
                  className="w-16 text-xs p-1 border rounded text-right font-bold"
                />
              )}
            </div>

            <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  name="buys15LPet"
                  checked={Boolean(formData.buys15LPet)}
                  onChange={handleChange}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                1.5L PET Pack
              </label>
              {formData.buys15LPet && (
                <input
                  type="number"
                  name="qty15LPet"
                  min="0"
                  value={formData.qty15LPet || ''}
                  onChange={handleChange}
                  placeholder="Qty"
                  className="w-16 text-xs p-1 border rounded text-right font-bold"
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Financial & Credit Terms */}
      <div className="space-y-4 pt-2 border-t border-slate-100">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <DollarSign size={14} className="text-slate-500" /> Credit & Security Terms
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Credit Limit (Rs)</label>
            <input
              type="number"
              name="creditLimit"
              min="0"
              value={formData.creditLimit || ''}
              onChange={handleChange}
              placeholder="0"
              className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Credit Duration (Days)</label>
            <input
              type="number"
              name="creditDuration"
              min="1"
              value={formData.creditDuration || 1}
              onChange={handleChange}
              placeholder="1"
              className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Security Deposit (Rs)</label>
            <input
              type="number"
              name="securityDeposit"
              min="0"
              value={formData.securityDeposit || ''}
              onChange={handleChange}
              placeholder="0"
              className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 font-semibold"
            />
          </div>
        </div>
      </div>

      {/* Remarks */}
      <div className="space-y-2 pt-2 border-t border-slate-100">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <FileText size={14} className="text-slate-500" /> Notes & Remarks
        </h4>
        <textarea
          name="remarks"
          value={formData.remarks || ''}
          onChange={handleChange}
          rows="2"
          placeholder="Special delivery instructions, timing preferences, etc."
          className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500"
        />
      </div>
    </>
  );
}
