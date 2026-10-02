import { useState, useEffect, useRef } from 'react';
import { Plus, Search } from 'lucide-react';
import { CustomersTable, AddCustomerModal, CustomerDetails } from '../components/customer';
import { TableSkeleton } from '../components/common/Skeleton';
import { PageHeader } from '../components/ui';
import { API_URL } from '../utils/api';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { useLiveEvent } from '../context/SSEContext';

export default function Customers() {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const canAddCustomer = ['OWNER', 'MARKETING_MANAGER', 'PRODUCTION_MANAGER', 'ADMIN'].includes(user?.role);
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

  useLiveEvent('CUSTOMER_UPDATED', () => fetchCustomers(search, activeTab));

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
          {/* Page Header */}
          <PageHeader
            title="Customer Directory"
            subtitle="Customer profiles, delivery accounts, and financial credit limits"
            actions={
              canAddCustomer && (
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="btn-primary"
                >
                  <Plus size={15} />
                  <span>Add Customer</span>
                </button>
              )
            }
          />

          {/* Search & Filter Toolbar */}
          <div className="card-surface p-3 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
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
                <div className="bg-slate-100/90 p-0.5 rounded-lg flex gap-0.5 border border-slate-200/80 text-xs">
                  <button
                    onClick={() => setActiveTab('Active')}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                      activeTab === 'Active' 
                        ? 'bg-white text-slate-900 shadow-2xs font-bold' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Active
                  </button>
                  <button
                    onClick={() => setActiveTab('Archived')}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                      activeTab === 'Archived' 
                        ? 'bg-white text-rose-700 shadow-2xs font-bold' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Archived
                  </button>
                </div>
              )}
            </div>
          </div>

          {isLoading && customers.length === 0 ? (
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
