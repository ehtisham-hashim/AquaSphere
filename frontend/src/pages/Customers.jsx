import { useState, useEffect, useRef } from 'react';
import { Plus, Search } from 'lucide-react';
import { CustomersTable, AddCustomerModal, CustomerDetails } from '../components/customer';
import { TableSkeleton } from '../components/common/Skeleton';
import { API_URL } from '../utils/api';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';

export default function Customers() {
  const { user } = useAuth();
  const { tenant } = useTenant();
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
      const res = await fetch(`${API_URL}/customers?search=${encodeURIComponent(q)}&status=${statusParam}`, {
        headers: { 'x-tenant': tenant },
        credentials: 'include'
      });
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
  }, [activeTab, tenant]);

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
        headers: { 'x-tenant': tenant },
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
    <div className="space-y-4">
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
          {/* Action Header */}
          <div className="card-surface p-3 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="search" 
                placeholder="Search by customer name or phone..." 
                className="input-base pl-9"
                value={search}
                onChange={handleSearchChange}
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {!isMarketingManager && (
                <div className="bg-slate-100 p-1 rounded-xl flex gap-1 border border-slate-200">
                  <button
                    onClick={() => setActiveTab('Active')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      activeTab === 'Active' 
                        ? 'bg-white text-slate-900 shadow-2xs' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Active
                  </button>
                  <button
                    onClick={() => setActiveTab('Archived')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      activeTab === 'Archived' 
                        ? 'bg-white text-rose-700 shadow-2xs' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Archived
                  </button>
                </div>
              )}
              {canAddCustomer && (
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="btn-primary"
                >
                  <Plus size={16} />
                  <span>Add Customer</span>
                </button>
              )}
            </div>
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
