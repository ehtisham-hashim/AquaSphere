import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { X, Edit3 } from 'lucide-react';
import { API_URL as API } from '../../utils/api';
import CustomerFormFields from './CustomerFormFields';

export default function EditCustomerModal({ isOpen, customer, onClose, onCustomerUpdated }) {
  const tenant = (localStorage.getItem('tenant') || 'aquasphere').toLowerCase();
  const isWadaana = tenant === 'wadaana';

  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (customer && isOpen) {
      setFormData({
        name: customer.name || '',
        phone: customer.phone || '',
        type: customer.type || 'Home',
        address: customer.address || '',
        mapLink: customer.mapLink || '',
        securityDeposit: customer.deposit !== undefined ? parseInt(customer.deposit) : (customer.securityDeposit !== undefined ? parseInt(customer.securityDeposit) : 0),
        currentBalance: customer.currentBalance !== undefined ? parseFloat(customer.currentBalance) : 0,
        creditLimit: customer.creditLimit ? parseFloat(customer.creditLimit) : 0,
        creditDuration: customer.creditDuration || 1,
        remarks: customer.remarks || '',
        homePictureUrl: customer.homePictureUrl || '',
        buys19L: Boolean(customer.buys19L),
        qty19L: customer.qty19L || 0,
        buys05LPet: Boolean(customer.buys05LPet),
        qty05LPet: customer.qty05LPet || 0,
        buys15LPet: Boolean(customer.buys15LPet),
        qty15LPet: customer.qty15LPet || 0,
        buysPure05L: Boolean(customer.buysPure05L),
        qtyPure05L: customer.qtyPure05L || 0,
        buysPure15L: Boolean(customer.buysPure15L),
        qtyPure15L: customer.qtyPure15L || 0,
        buysMix05L: Boolean(customer.buysMix05L),
        qtyMix05L: customer.qtyMix05L || 0,
        buysMix15L: Boolean(customer.buysMix15L),
        qtyMix15L: customer.qtyMix15L || 0
      });
      setError('');
    }
  }, [customer, isOpen]);

  if (!isOpen || !customer) return null;

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
      const validDomains = ['maps.google.com', 'google.com/maps', 'goo.gl', 'maps.app.goo.gl'];
      const isValid = validDomains.some((d) => formData.mapLink.includes(d));
      if (!isValid) {
        const msg = 'Invalid Google Maps Link. Must contain maps.google.com, google.com/maps, or goo.gl';
        setError(msg);
        toast.error(msg);
        return;
      }
    }

    setSaving(true);
    setError('');

    try {
      const res = await fetch(`${API}/customers/${customer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant': tenant
        },
        body: JSON.stringify({
          ...formData,
          securityDeposit: formData.securityDeposit !== undefined && formData.securityDeposit !== '' ? parseInt(formData.securityDeposit) : 0,
          currentBalance: formData.currentBalance !== undefined && formData.currentBalance !== '' ? parseFloat(formData.currentBalance) : 0,
          creditLimit: formData.creditLimit !== undefined && formData.creditLimit !== '' ? parseFloat(formData.creditLimit) : 0,
          creditDuration: formData.creditDuration ? parseInt(formData.creditDuration) : 1
        }),
        credentials: 'include'
      });
      const json = await res.json();
      if (json.success || res.ok) {
        toast.success('Customer updated successfully!');
        if (onCustomerUpdated) onCustomerUpdated(json.data || { ...customer, ...formData });
        onClose();
      } else {
        toast.error(json.message || 'Failed to update customer');
        setError(json.message || 'Failed to update customer');
      }
    } catch (err) {
      console.error('Update Customer Error:', err);
      toast.error('Network error while updating customer');
      setError('Network error while updating customer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center z-10">
          <div className="flex items-center gap-2">
            <Edit3 size={20} className={isWadaana ? 'text-[#0ea5e9]' : 'text-emerald-600'} />
            <h3 className="text-lg font-bold text-slate-800">Edit Customer Details</h3>
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

          {/* Shared Form Fields */}
          <CustomerFormFields
            formData={formData}
            handleChange={handleChange}
            isWadaana={isWadaana}
          />

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`${
                isWadaana ? 'bg-[#0ea5e9] hover:bg-[#0284c7]' : 'bg-emerald-600 hover:bg-emerald-700'
              } text-white px-6 py-2.5 rounded-lg font-medium shadow-sm transition-colors disabled:opacity-50`}
            >
              {saving ? 'Saving...' : 'Update Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
