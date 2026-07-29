import { useState, useEffect } from 'react';
import { Plus, Search } from 'lucide-react';
import { CustomersTable, AddCustomerModal, CustomerDetails } from '../components/customer';
import { API_URL } from '../utils/api';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCustomers = async (q = '') => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/customers?search=${q}`, { credentials: 'include' });
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
      {selectedCustomer ? (
        <CustomerDetails
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          onCustomerUpdated={(updated) => {
            setSelectedCustomer(updated);
            fetchCustomers(search);
          }}
          onCustomerDeleted={() => {
            setSelectedCustomer(null);
            fetchCustomers(search);
          }}
        />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Customers</h2>
              <p className="text-slate-500 text-sm">Manage your customer database and credit limits</p>
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="btn-accent inline-flex items-center gap-2 w-full sm:w-auto justify-center"
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

          <CustomersTable
            customers={customers}
            isLoading={isLoading}
            onRowClick={(c) => setSelectedCustomer(c)}
          />
        </>
      )}

      <AddCustomerModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onCustomerAdded={() => fetchCustomers(search)} 
      />
    </div>
  );
}
