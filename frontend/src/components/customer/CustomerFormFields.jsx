import { MapPin, DollarSign, FileText, ShoppingBag } from 'lucide-react';
import { getTenantCatalog } from '../../constants/wadaanaProducts';

export default function CustomerFormFields({ formData, handleChange, isWadaana }) {
  const products = getTenantCatalog(isWadaana ? 'wadaana' : 'aquasphere');
  return (
    <>
      {/* Basic Info Section */}
      <div className="space-y-4">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <MapPin size={14} className="text-slate-500" /> Basic Details
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="customer-name" className="block text-xs font-semibold text-slate-700 mb-1">
              Customer Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="customer-name"
              type="text"
              name="name"
              required
              value={formData.name || ''}
              onChange={handleChange}
              placeholder="e.g. John Doe / Alpha Corp"
              className="input-base text-xs"
            />
          </div>

          <div>
            <label htmlFor="customer-phone" className="block text-xs font-semibold text-slate-700 mb-1">
              Phone Number <span className="text-rose-500">*</span>
            </label>
            <input
              id="customer-phone"
              type="text"
              name="phone"
              required
              value={formData.phone || ''}
              onChange={handleChange}
              placeholder="e.g. 03001234567"
              className="input-base text-xs"
            />
          </div>

          <div>
            <label htmlFor="customer-type" className="block text-xs font-semibold text-slate-700 mb-1">Customer Type</label>
            <select
              id="customer-type"
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
            <label htmlFor="customer-address" className="block text-xs font-semibold text-slate-700 mb-1">Delivery Address</label>
            <input
              id="customer-address"
              type="text"
              name="address"
              value={formData.address || ''}
              onChange={handleChange}
              placeholder="House #, Street, Area..."
              className="input-base text-xs"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="customer-mapLink" className="block text-xs font-semibold text-slate-700 mb-1">Google Maps Pin Link</label>
            <input
              id="customer-mapLink"
              type="url"
              name="mapLink"
              value={formData.mapLink || ''}
              onChange={handleChange}
              placeholder="https://maps.google.com/?q=..."
              className="input-base text-xs"
            />
          </div>
        </div>
      </div>

      {/* Product Demands */}
      <div className="space-y-4 pt-2 border-t border-slate-100">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <ShoppingBag size={14} className="text-slate-500" /> Products & Expected Quantities
        </h4>
        
        <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-4 rounded-xl border ${
          isWadaana ? 'bg-sky-50/50 border-sky-100' : 'bg-emerald-50/40 border-emerald-100'
        }`}>
          {products.map((prod) => {
            const isChecked = Boolean(formData[prod.customerBuyField]);
            return (
              <div key={prod.id} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    name={prod.customerBuyField}
                    checked={isChecked}
                    onChange={handleChange}
                    className={`rounded h-4 w-4 ${isWadaana ? 'text-sky-600 focus:ring-sky-500' : 'text-emerald-600 focus:ring-emerald-500'}`}
                  />
                  {prod.displayName || prod.name}
                </label>
                {isChecked && (
                  <input
                    type="number"
                    name={prod.customerQtyField}
                    min="0"
                    value={formData[prod.customerQtyField] || ''}
                    onChange={handleChange}
                    placeholder="Qty"
                    className="w-16 text-xs p-1 border rounded text-right font-bold"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Financial & Credit Terms */}
      <div className="space-y-4 pt-2 border-t border-slate-100">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <DollarSign size={14} className="text-slate-500" /> Credit & Security Terms
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="customer-creditLimit" className="block text-xs font-semibold text-slate-700 mb-1">Credit Limit (Rs)</label>
            <input
              id="customer-creditLimit"
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
            <label htmlFor="customer-creditDuration" className="block text-xs font-semibold text-slate-700 mb-1">Credit Duration (Days)</label>
            <input
              id="customer-creditDuration"
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
            <label htmlFor="customer-securityDeposit" className="block text-xs font-semibold text-slate-700 mb-1">Security Deposit (Rs)</label>
            <input
              id="customer-securityDeposit"
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
          id="customer-remarks"
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
