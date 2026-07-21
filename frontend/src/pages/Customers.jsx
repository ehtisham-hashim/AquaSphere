import { useState, useEffect } from 'react';
import { Plus, X, Search, MapPin, Phone, User, DollarSign, Package } from 'lucide-react';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // New Customer Form State
  const [formData, setFormData] = useState({
    name: '', phone: '', type: 'Home', address: '', mapLink: '',
    deposit: 0, defaultPrice: 0, creditLimit: 0, creditDuration: 1, remarks: ''
  });

  const fetchCustomers = async (q = '') => {
    setIsLoading(true);
    const res = await fetch(`${import.meta.env.VITE_API_URL}/customers?search=${q}`, { credentials: 'include' });
    const json = await res.json();
    if (json.success) setCustomers(json.data);
    setIsLoading(false);
  };

  useEffect(() => { fetchCustomers(); }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const addCustomer = async (e) => {
    e.preventDefault();
    await fetch(`${import.meta.env.VITE_API_URL}/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
      credentials: 'include'
    });
    setFormData({
      name: '', phone: '', type: 'Home', address: '', mapLink: '',
      deposit: 0, defaultPrice: 0, creditLimit: 0, creditDuration: 1, remarks: ''
    });
    setIsModalOpen(false);
    fetchCustomers(search);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Customers</h2>
          <p className="text-slate-500 text-sm">Manage your customer database and credit limits</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[#0ea5e9] hover:bg-[#0284c7] text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <Plus size={20} /> Add Customer
        </button>
      </div>
      
      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="search" 
          placeholder="Search by phone or name..." 
          className="w-full border border-slate-200 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9] transition-all bg-white"
          value={search}
          onChange={(e) => { setSearch(e.target.value); fetchCustomers(e.target.value); }}
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 font-semibold text-slate-600 text-sm">Customer</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Contact</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Financials</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Pricing & Deposit</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Terms & Activity</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Bottles</th>
                <th className="p-4 font-semibold text-slate-600 text-sm text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 border-4 border-[#0ea5e9] border-t-transparent rounded-full animate-spin"></div>
                      <p>Loading customers...</p>
                    </div>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-slate-500">No customers found.</td>
                </tr>
              ) : (
                customers.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800">{c.name}</div>
                        <div className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full inline-block mt-1">{c.type}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-slate-600 text-sm mb-1">
                      <Phone size={14} className="text-slate-400" /> {c.phone}
                    </div>
                    {c.address && (
                      <div className="flex items-center gap-2 text-slate-500 text-xs truncate max-w-[200px]">
                        <MapPin size={14} className="text-slate-400 flex-shrink-0" /> {c.address}
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1 text-sm">
                      <span className="flex items-center gap-1"><DollarSign size={14} className="text-red-400"/> Bal: <strong className="text-red-500">Rs. {c.cachedBalance}</strong></span>
                      <span className="text-xs text-slate-500">Limit: Rs. {c.creditLimit}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1 text-sm">
                      <span className="text-slate-700">Price: <strong>Rs. {c.defaultPrice}</strong></span>
                      <span className="text-xs text-slate-500">Dep: Rs. {c.deposit}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1 text-sm">
                      <span className="text-slate-700">{c.creditDuration} Days Credit</span>
                      <span className="text-xs text-slate-500">{c.lastDeliveryAt ? new Date(c.lastDeliveryAt).toLocaleDateString() : 'No deliveries'}</span>
                    </div>
                  </td>
                  <td className="p-4">
                     <div className="flex items-center gap-2 text-sm">
                        <Package size={16} className="text-amber-500" /> 
                        <strong className="text-slate-700">{c.cachedBottleBalance}</strong> empty
                     </div>
                  </td>
                  <td className="p-4 text-right">
                    <button className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 text-xs rounded-md font-medium transition-colors">
                      Edit
                    </button>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center z-10">
              <h3 className="text-lg font-bold text-slate-800">Add New Customer</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={addCustomer} className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Basic Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                    <input name="name" className="w-full border border-slate-200 rounded-lg p-2.5 focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9] outline-none" value={formData.name} onChange={handleChange} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number *</label>
                    <input name="phone" type="tel" className="w-full border border-slate-200 rounded-lg p-2.5 focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9] outline-none" value={formData.phone} onChange={handleChange} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Customer Type *</label>
                    <select name="type" className="w-full border border-slate-200 rounded-lg p-2.5 focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9] outline-none" value={formData.type} onChange={handleChange}>
                      <option>Home</option><option>Restaurant</option><option>Shop</option><option>Distributor</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Default Price (Rs)</label>
                    <input name="defaultPrice" type="number" className="w-full border border-slate-200 rounded-lg p-2.5 focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9] outline-none" value={formData.defaultPrice} onChange={handleChange} />
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Location</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Address</label>
                    <textarea name="address" rows="2" className="w-full border border-slate-200 rounded-lg p-2.5 focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9] outline-none" value={formData.address} onChange={handleChange}></textarea>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Google Maps Link</label>
                    <input name="mapLink" type="url" className="w-full border border-slate-200 rounded-lg p-2.5 focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9] outline-none" value={formData.mapLink} onChange={handleChange} />
                  </div>
                </div>
              </div>

              {/* Financials */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Financial Setup</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Deposit Paid</label>
                    <input name="deposit" type="number" className="w-full border border-slate-200 rounded-lg p-2.5 focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9] outline-none" value={formData.deposit} onChange={handleChange} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Credit Limit (Rs)</label>
                    <input name="creditLimit" type="number" className="w-full border border-slate-200 rounded-lg p-2.5 focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9] outline-none" value={formData.creditLimit} onChange={handleChange} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Credit Days</label>
                    <input name="creditDuration" type="number" className="w-full border border-slate-200 rounded-lg p-2.5 focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9] outline-none" value={formData.creditDuration} onChange={handleChange} />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-50 rounded-lg transition-colors">
                  Cancel
                </button>
                <button type="submit" className="bg-[#0ea5e9] hover:bg-[#0284c7] text-white px-6 py-2.5 rounded-lg font-medium shadow-sm transition-colors">
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
