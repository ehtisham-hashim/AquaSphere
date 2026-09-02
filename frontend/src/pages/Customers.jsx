import { useState, useEffect, useRef } from 'react';
import { Plus, Search } from 'lucide-react';
import { CustomersTable, AddCustomerModal, CustomerDetails } from '../components/customer';
import { TableSkeleton } from '../components/common/Skeleton';
import { API_URL } from '../utils/api';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

export default function Customers() {
  const { user } = useAuth();
  const canAddCustomer = user?.role === 'OWNER' || user?.role === 'MARKETING_MANAGER';
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [activeTab, setActiveTab] = useState('Active'); // 'Active' | 'Archived'
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const debounceTimerRef = useRef(null);

  const fetchCustomers = async (q = search, tab = activeTab) => {
    setIsLoading(true);
    try {
      const statusParam = tab === 'Archived' ? 'archived' : 'active';
      const res = await fetch(`${API_URL}/customers?search=${encodeURIComponent(q)}&status=${statusParam}`, { credentials: 'include' });
      const json = await res.json();
      if (json.success) setCustomers(json.data);
    } catch {
      // Error fetching customers
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers(search, activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      fetchCustomers(val, activeTab);
    }, 300);
  };

  const handleRestoreCustomer = async (c) => {
    if (!window.confirm(`Are you sure you want to restore ${c.name}?`)) return;
    try {
      const res = await fetch(`${API_URL}/customers/${c.id}/restore`, {
        method: 'PATCH',
        headers: { 'x-tenant': localStorage.getItem('tenant') || 'aquasphere' },
        credentials: 'include'
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Customer ${c.name} unarchived successfully!`);
        fetchCustomers(search, activeTab);
      } else {
        toast.error(json.message || 'Failed to restore customer');
      }
    } catch {
      toast.error('Error restoring customer');
    }
  };

  const handleRowClick = (customer, action = 'view') => {
    if (action === 'restore') {
      handleRestoreCustomer(customer);
    } else {
      setSelectedCustomer(customer);
    }
  };

  const isMarketingManager = user?.role === 'MARKETING_MANAGER';

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {selectedCustomer ? (
        <CustomerDetails
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          onCustomerUpdated={(updated) => {
            setSelectedCustomer(updated);
            fetchCustomers(search, activeTab);
          }}
          onCustomerDeleted={() => {
            setSelectedCustomer(null);
            fetchCustomers(search, activeTab);
          }}
        />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Customers</h2>
              <p className="text-slate-500 text-sm">
                {isMarketingManager 
                  ? 'Search active customers or onboard new clients' 
                  : 'Manage your customer database and credit limits'}
              </p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              {!isMarketingManager && (
                <div className="bg-slate-100 p-1 rounded-xl flex gap-1 border border-slate-200">
                  <button
                    onClick={() => setActiveTab('Active')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'Active' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Active Customers
                  </button>
                  <button
                    onClick={() => setActiveTab('Archived')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'Archived' ? 'bg-white text-red-700 shadow-2xs' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Archived (Soft Deleted)
                  </button>
                </div>
              )}
              {canAddCustomer && (
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="btn-accent inline-flex items-center gap-2 justify-center"
                >
                  <Plus size={18} /> Add Customer
                </button>
              )}
            </div>
          </div>
          
          <div className="mb-6 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="search" 
              placeholder="Search by phone or name..." 
              className="input-field pl-10"
              value={search}
              onChange={handleSearchChange}
            />
          </div>

          {isMarketingManager && !search.trim() ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-500">
                <Search size={22} />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1">Search Customer by Name or Phone</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Type a customer&apos;s name or contact number in the search bar above to look up their account, check credit status, or view orders.
              </p>
            </div>
          ) : isLoading && customers.length === 0 ? (
            <TableSkeleton rows={6} cols={6} />
          ) : (
            <CustomersTable
              customers={customers}
              isLoading={isLoading}
              onRowClick={handleRowClick}
            />
          )}
        </>
      )}

      {canAddCustomer && (
        <AddCustomerModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onCustomerAdded={() => fetchCustomers(search, activeTab)} 
        />
      )}
    </div>
  );
}
