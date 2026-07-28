import { useState, useEffect } from 'react';
import { Plus, Search } from 'lucide-react';
import { CustomersTable, AddCustomerModal } from '../components/customer';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCustomers = async (q = '') => {
    setIsLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/customers?search=${q}`, { credentials: 'include' });
      const json = await res.json();
      if (json.success) setCustomers(json.data);
    } catch {
      // Error fetching customers
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Customers</h2>
          <p className="text-slate-500 text-sm">Manage your customer database and credit limits</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn-accent inline-flex items-center gap-2"
        >
          <Plus size={20} /> Add Customer
        </button>
      </div>
      
      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="search" 
          placeholder="Search by phone or name..." 
          className="input-field pl-10"
          value={search}
          onChange={(e) => { setSearch(e.target.value); fetchCustomers(e.target.value); }}
        />
      </div>

      <CustomersTable customers={customers} isLoading={isLoading} />

      <AddCustomerModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onCustomerAdded={() => fetchCustomers(search)} 
      />
    </div>
  );
}
