import { useState, useEffect } from 'react';
import { MapPin, ShoppingBag, DollarSign, FileText, Plus, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getTenantCatalog } from '../../constants/wadaanaProducts';
import { API_URL } from '../../utils/api';
import { useTenant } from '../../context/TenantContext';

export default function CustomerFormFields({ formData, handleChange, isWadaana }) {
  const { tenant } = useTenant();
  const products = getTenantCatalog(isWadaana ? 'wadaana' : 'aquasphere');
  const [marketers, setMarketers] = useState([]);
  const [isRegistering, setIsRegistering] = useState(false);
  const [newMarketerName, setNewMarketerName] = useState('');
  const [registeringLoading, setRegisteringLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchMarketers = async () => {
      try {
        const res = await fetch(`${API_URL}/customers/marketers`, {
          headers: { 'x-tenant': tenant },
          credentials: 'include'
        });
        const json = await res.json();
        if (isMounted && json.success && json.data?.marketers) {
          setMarketers(json.data.marketers);
        }
      } catch (err) {
        console.error('Failed to load marketers:', err);
      }
    };
    fetchMarketers();
    return () => { isMounted = false; };
  }, [tenant]);

  const handleRegisterMarketer = async () => {
    const trimmed = newMarketerName.trim();
    if (!trimmed) {
      toast.error('Please enter marketer name');
      return;
    }
    setRegisteringLoading(true);
    try {
      const res = await fetch(`${API_URL}/customers/marketers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant': tenant
        },
        credentials: 'include',
        body: JSON.stringify({ name: trimmed })
      });
      const json = await res.json();
      if (json.success && json.data) {
        const added = json.data;
        setMarketers(prev => {
          const exists = prev.some(m => m.id === added.id);
          return exists ? prev : [...prev, added];
        });
        handleChange({ target: { name: 'marketerId', value: added.id } });
        handleChange({ target: { name: 'marketerName', value: added.name } });
        handleChange({ target: { name: 'marketerRef', value: `${added.id} • ${added.name}` } });
        toast.success(`Marketer "${added.name}" registered (${added.id})`);
        setIsRegistering(false);
        setNewMarketerName('');
      } else {
        throw new Error(json.message || 'Failed to register marketer');
      }
    } catch (_err) {
      const fallbackId = `MKT-${String(marketers.length + 1).padStart(2, '0')}`;
      const fallback = { id: fallbackId, name: trimmed, segment: isWadaana ? 'Wadaana B2B' : '19L / PET' };
      setMarketers(prev => [...prev, fallback]);
      handleChange({ target: { name: 'marketerId', value: fallback.id } });
      handleChange({ target: { name: 'marketerName', value: fallback.name } });
      handleChange({ target: { name: 'marketerRef', value: `${fallback.id} • ${fallback.name}` } });
      toast.success(`Marketer "${trimmed}" added (${fallbackId})`);
      setIsRegistering(false);
      setNewMarketerName('');
    } finally {
      setRegisteringLoading(false);
    }
  };

  const getSelectedValue = () => {
    if (isRegistering) return '__NEW__';
    if (formData.marketerId && formData.marketerId !== 'DIRECT') {
      return formData.marketerId;
    }
    if (formData.marketerRef) {
      if (formData.marketerRef.toLowerCase() === 'direct') return 'DIRECT';
      const m = formData.marketerRef.match(/^(MKT-\d+)/i);
      if (m) return m[1].toUpperCase();
      const byName = marketers.find(mkt => mkt.name.toLowerCase() === formData.marketerRef.toLowerCase());
      if (byName) return byName.id;
    }
    if (formData.marketerName) {
      const byName = marketers.find(mkt => mkt.name.toLowerCase() === formData.marketerName.toLowerCase());
      if (byName) return byName.id;
    }
    return 'DIRECT';
  };

  const selectedVal = getSelectedValue();
  const isCustomOption = selectedVal !== 'DIRECT' && selectedVal !== '__NEW__' && !marketers.some(m => m.id === selectedVal);

  return (
    <>
      {/* Basic Info Section */}
      <div className="space-y-4">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <MapPin size={14} className="text-slate-500" /> Basic Details
        </h4>

        {/* Customer ID & Marketer Attribution Box */}
        <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Customer System Code
            </label>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold bg-slate-900 text-white px-2.5 py-1.5 rounded-lg tracking-wider">
                {formData.customerCode || (isWadaana ? 'WAD313xxxx (Auto)' : 'JAM313xxxx (Auto)')}
              </span>
              <span className="text-[11px] text-slate-400">Sequential ID</span>
            </div>
          </div>

          <div>
            <label htmlFor="customer-marketer" className="block text-xs font-semibold text-slate-600 mb-1 flex items-center justify-between">
              <span>Referred By / Marketer</span>
              {!isRegistering ? (
                <button
                  type="button"
                  onClick={() => setIsRegistering(true)}
                  className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-0.5"
                >
                  <Plus size={12} />
                  <span>New Marketer</span>
                </button>
              ) : (
                <span className="text-[10px] text-emerald-600 font-semibold">Registering New...</span>
              )}
            </label>
            <select
              id="customer-marketer"
              name="marketerSelect"
              className="w-full text-xs font-medium px-3 py-1.5 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 bg-white"
              value={selectedVal}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '__NEW__') {
                  setIsRegistering(true);
                  return;
                }
                setIsRegistering(false);
                if (val === 'DIRECT') {
                  handleChange({ target: { name: 'marketerId', value: 'DIRECT' } });
                  handleChange({ target: { name: 'marketerName', value: '' } });
                  handleChange({ target: { name: 'marketerRef', value: '' } });
                } else {
                  const sel = marketers.find(m => m.id === val);
                  if (sel) {
                    handleChange({ target: { name: 'marketerId', value: sel.id } });
                    handleChange({ target: { name: 'marketerName', value: sel.name } });
                    handleChange({ target: { name: 'marketerRef', value: `${sel.id} • ${sel.name}` } });
                  }
                }
              }}
            >
              <option value="DIRECT">Direct / Company (No Marketer)</option>
              {isCustomOption && (
                <option value={selectedVal}>
                  {formData.marketerRef || formData.marketerName || selectedVal}
                </option>
              )}
              {marketers.map(m => (
                <option key={m.id} value={m.id}>
                  {m.id} — {m.name} ({m.segment || 'General'})
                </option>
              ))}
              <option value="__NEW__" className="text-emerald-600 font-bold">
                + Register New Marketer...
              </option>
            </select>

            {/* Inline Add Marketer Input (No prompt alert, instant dropdown update) */}
            {isRegistering && (
              <div className="mt-2 p-2 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-800">Register New Marketer</span>
                  <button
                    type="button"
                    onClick={() => { setIsRegistering(false); setNewMarketerName(''); }}
                    className="text-slate-400 hover:text-slate-600 text-xs"
                    aria-label="Cancel"
                  >
                    <X size={13} />
                  </button>
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Enter full name (e.g. Tariq Mehmood)"
                    value={newMarketerName}
                    onChange={(e) => setNewMarketerName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleRegisterMarketer();
                      }
                    }}
                    autoFocus
                    className="flex-1 text-xs px-2.5 py-1.5 border border-emerald-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                  />
                  <button
                    type="button"
                    disabled={registeringLoading || !newMarketerName.trim()}
                    onClick={handleRegisterMarketer}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1"
                  >
                    {registeringLoading && <Loader2 size={12} className="animate-spin" />}
                    <span>{registeringLoading ? 'Adding...' : 'Add'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsRegistering(false); setNewMarketerName(''); }}
                    className="px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

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
              <option value="Industrial">Industrial</option>
            </select>
          </div>

          <div>
            <label htmlFor="customer-buyerNtn" className="block text-xs font-semibold text-slate-700 mb-1">
              Buyer NTN (FBR Tax)
            </label>
            <input
              id="customer-buyerNtn"
              type="text"
              name="buyerNtn"
              value={formData.buyerNtn || ''}
              onChange={handleChange}
              placeholder="e.g. 1234567-8"
              className="input-base text-xs font-mono"
            />
          </div>

          <div>
            <label htmlFor="customer-buyerStrn" className="block text-xs font-semibold text-slate-700 mb-1">
              Buyer STRN (Sales Tax)
            </label>
            <input
              id="customer-buyerStrn"
              type="text"
              name="buyerStrn"
              value={formData.buyerStrn || ''}
              onChange={handleChange}
              placeholder="e.g. 12-34-5678-901-23"
              className="input-base text-xs font-mono"
            />
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
