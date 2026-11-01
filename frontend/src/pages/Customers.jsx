import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, Users, RotateCcw, FileSpreadsheet } from 'lucide-react';
import { CustomersTable, AddCustomerModal, CustomerDetails, BulkImportCustomersModal } from '../components/customer';
import { TableSkeleton } from '../components/common/Skeleton';
import { PageHeader, DeleteConfirmationModal } from '../components/ui';
import MultiSelectDropdown from '../components/common/MultiSelectDropdown';
import { API_URL } from '../utils/api';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { useLiveEvent } from '../context/SSEContext';

const CUSTOMER_TYPE_OPTIONS = [
  { value: 'Commercial', label: 'Commercial' },
  { value: 'Corporate', label: 'Corporate' },
  { value: 'Home', label: 'Home / Household' },
  { value: 'Distributor', label: 'Distributor' },
  { value: 'Industrial', label: 'Industrial' }
];

export default function Customers() {
  const [searchParams] = useSearchParams();
  const customerIdParam = searchParams.get('id') || searchParams.get('customerId');
  const { user } = useAuth();
  const { tenant, isWadaana } = useTenant();
  const isOwner = user?.role === 'OWNER';
  const canAddCustomer = ['OWNER', 'MARKETING_MANAGER', 'ADMIN'].includes(user?.role);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [activeTab, setActiveTab] = useState('Active'); // 'Active' | 'Archived'
  const [filterPreset, setFilterPreset] = useState('ALL'); // 'ALL' | 'IN_DEBT' | 'HOLDING_BOTTLES' | 'UNSECURED_BOTTLES' | 'INACTIVE'
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedMarketer, setSelectedMarketer] = useState('ALL');
  const [marketerOptions, setMarketerOptions] = useState([]);
  const [now] = useState(() => Date.now());
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    const fetchMarketerList = async () => {
      try {
        const res = await fetch(`${API_URL}/customers/marketers`, {
          headers: { 'x-tenant': tenant },
          credentials: 'include'
        });
        const json = await res.json();
        if (isMounted && json.success && json.data?.marketers) {
          setMarketerOptions(json.data.marketers);
        }
      } catch (err) {
        console.error('Failed to load marketer filter options:', err);
      }
    };
    fetchMarketerList();
    return () => { isMounted = false; };
  }, [tenant]);

  const fetchCustomers = async (q = search, tab = activeTab, isBackground = false) => {
    if (!isBackground && customers.length === 0) {
      setIsLoading(true);
    }
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

  useEffect(() => {
    if (customerIdParam && customers.length > 0) {
      const match = customers.find(c => c.id === customerIdParam);
      if (match) setSelectedCustomer(match);
    }
  }, [customerIdParam, customers]);

  useLiveEvent(['CUSTOMER_UPDATED', 'ORDER_UPDATED'], () => fetchCustomers(search, activeTab, true));

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

  const handleConfirmDeleteCustomer = async () => {
    if (!customerToDelete) return;
    try {
      const res = await fetch(`${API_URL}/customers/${customerToDelete.id}`, {
        method: 'DELETE',
        headers: { 'x-tenant': tenant },
        credentials: 'include'
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Customer "${customerToDelete.name}" permanently deleted`);
        fetchCustomers(search, activeTab);
        setCustomerToDelete(null);
      } else {
        toast.error(json.message || 'Failed to delete customer');
      }
    } catch (_err) {
      toast.error('Error deleting customer');
    }
  };

  const isMarketingManager = user?.role === 'MARKETING_MANAGER';

  // Calculate tab counts across all loaded active/archived customers
  const tabCounts = useMemo(() => {
    let inDebt = 0;
    let holdingBottles = 0;
    let unsecured = 0;
    let inactive = 0;

    for (const c of customers) {
      const balance = Number(c.currentBalance || 0);
      const bottles = Number(c.cachedBottleBalance || 0);
      const deposit = Number(c.deposit || 0);
      const covered = Math.floor(deposit / 1000);

      if (balance > 0) inDebt++;
      if (bottles > 0) holdingBottles++;
      if (bottles > covered) unsecured++;

      const lastDate = c.lastOrderDate || c.lastDeliveryAt || c.createdAt;
      if (lastDate) {
        const diffDays = Math.floor((now - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 7) inactive++;
      }
    }

    return {
      all: customers.length,
      inDebt,
      holdingBottles,
      unsecured,
      inactive
    };
  }, [customers, now]);

  // Filter customers based on preset and selected customer types
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      // 1. Preset filter
      if (filterPreset === 'IN_DEBT') {
        if (Number(c.currentBalance || 0) <= 0) return false;
      } else if (filterPreset === 'HOLDING_BOTTLES') {
        if (Number(c.cachedBottleBalance || 0) <= 0) return false;
      } else if (filterPreset === 'UNSECURED_BOTTLES') {
        const bottles = Number(c.cachedBottleBalance || 0);
        const covered = Math.floor(Number(c.deposit || 0) / 1000);
        if (bottles <= covered) return false;
      } else if (filterPreset === 'INACTIVE') {
        const lastDate = c.lastOrderDate || c.lastDeliveryAt || c.createdAt;
        if (!lastDate) return false;
        const diffDays = Math.floor((now - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 7) return false;
      }

      // 2. Multi-select customer types
      if (selectedTypes.length > 0) {
        const rawType = (c.type || '').toUpperCase();
        const matches = selectedTypes.some(t => {
          const target = t.toUpperCase();
          if (target.includes('HOME') || target.includes('HOUSE')) {
            return rawType.includes('HOME') || rawType.includes('HOUSE');
          }
          return rawType === target || rawType.includes(target);
        });
        if (!matches) return false;
      }

      // 3. Marketer filter
      if (selectedMarketer !== 'ALL') {
        if (selectedMarketer === 'DIRECT') {
          if (c.marketerId && c.marketerId !== 'DIRECT') return false;
          if (!c.marketerId && c.marketerRef && c.marketerRef.toLowerCase() !== 'direct') return false;
        } else {
          const matchId = c.marketerId === selectedMarketer;
          const matchRef = c.marketerRef && c.marketerRef.includes(selectedMarketer);
          if (!matchId && !matchRef) return false;
        }
      }

      return true;
    });
  }, [customers, filterPreset, selectedTypes, selectedMarketer, now]);

  // KPI Summary for filtered list
  const kpiSummary = useMemo(() => {
    let totalDebt = 0;
    let totalBottles = 0;
    let totalDeposit = 0;

    for (const c of filteredCustomers) {
      totalDebt += Number(c.currentBalance || 0);
      totalBottles += Number(c.cachedBottleBalance || 0);
      totalDeposit += Number(c.deposit || 0);
    }

    return {
      count: filteredCustomers.length,
      totalDebt,
      totalBottles,
      totalDeposit
    };
  }, [filteredCustomers]);

  const presetTabs = useMemo(() => {
    const tabs = [
      { id: 'ALL', label: 'All', count: tabCounts.all },
      { id: 'IN_DEBT', label: 'In Debt', count: tabCounts.inDebt, badgeColor: 'bg-amber-100 text-amber-800' }
    ];
    if (!isWadaana) {
      tabs.push(
        { id: 'HOLDING_BOTTLES', label: 'Holding Bottles', count: tabCounts.holdingBottles, badgeColor: 'bg-blue-100 text-blue-800' },
        { id: 'UNSECURED_BOTTLES', label: 'Unsecured Bottles', count: tabCounts.unsecured, badgeColor: 'bg-rose-100 text-rose-800' }
      );
    }
    tabs.push({ id: 'INACTIVE', label: 'Inactive (7d+)', count: tabCounts.inactive, badgeColor: 'bg-slate-100 text-slate-700' });
    return tabs;
  }, [tabCounts, isWadaana]);

  const hasActiveFilters = filterPreset !== 'ALL' || selectedTypes.length > 0 || selectedMarketer !== 'ALL';

  const handleResetFilters = () => {
    setFilterPreset('ALL');
    setSelectedTypes([]);
    setSelectedMarketer('ALL');
  };

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
            actions={
              <div className="flex items-center gap-2">
                {isOwner && (
                  <button 
                    type="button"
                    onClick={() => setIsCsvModalOpen(true)}
                    className="btn-secondary flex items-center gap-1.5 text-xs font-bold"
                    title="Bulk Import Customers via CSV (Owner Only)"
                  >
                    <FileSpreadsheet size={15} />
                    <span>Import CSV</span>
                  </button>
                )}
                {canAddCustomer && (
                  <button 
                    onClick={() => setIsModalOpen(true)}
                    className="btn-primary"
                  >
                    <Plus size={15} />
                    <span>Add Customer</span>
                  </button>
                )}
              </div>
            }
          />

          {/* TIER 1: Dedicated Status & Preset Tabs Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {presetTabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterPreset(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                  filterPreset === tab.id
                    ? 'bg-white text-slate-900 border-slate-300 shadow-2xs font-bold ring-1 ring-slate-200'
                    : 'bg-slate-100/80 hover:bg-slate-200/80 text-slate-600 border-transparent'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${tab.badgeColor || 'bg-slate-200 text-slate-700'}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* TIER 2: Search & Filter Toolbar */}
          <div className="card-surface p-3 flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input 
                type="search" 
                placeholder="Search by customer name, phone, code, address, marketer..." 
                className="input-base pl-9 text-xs"
                value={search}
                onChange={handleSearchChange}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {/* Marketer Filter Dropdown */}
              <select
                aria-label="Filter by Marketer"
                value={selectedMarketer}
                onChange={e => setSelectedMarketer(e.target.value)}
                className="text-xs font-semibold px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-brand shadow-2xs cursor-pointer hover:border-slate-300 transition-colors"
              >
                <option value="ALL">All Marketers</option>
                <option value="DIRECT">Direct / Company</option>
                {marketerOptions.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.id} • {m.name}
                  </option>
                ))}
              </select>

              {/* Multi-Select Customer Types Dropdown */}
              <MultiSelectDropdown
                label="Customer Types"
                icon={Users}
                options={CUSTOMER_TYPE_OPTIONS}
                selectedValues={selectedTypes}
                onChange={setSelectedTypes}
              />

              {/* Reset Filters Shortcut */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors shadow-2xs"
                  title="Reset filter presets"
                >
                  <RotateCcw size={12} />
                  <span>Reset</span>
                </button>
              )}

              {/* Active / Archived Toggle */}
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

          {/* DYNAMIC KPI SUMMARY STRIP */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 bg-slate-50/90 border border-slate-200/80 rounded-xl text-xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-700">
              <Users size={14} className="text-slate-400" />
              <span>Showing <strong className="text-slate-900">{kpiSummary.count}</strong> Customers</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-slate-600">
              <div>
                Total Market Debt: <strong className={kpiSummary.totalDebt > 0 ? 'text-amber-600 font-bold' : 'text-emerald-600 font-bold'}>Rs. {kpiSummary.totalDebt.toLocaleString()}</strong>
              </div>
              {!isWadaana && (
                <div>
                  Bottles in Market: <strong className="text-slate-900 font-bold">{kpiSummary.totalBottles}</strong>
                </div>
              )}
              <div>
                Deposits Held: <strong className="text-slate-900 font-bold">Rs. {kpiSummary.totalDeposit.toLocaleString()}</strong>
              </div>
            </div>
          </div>

          {isLoading && customers.length === 0 ? (
            <TableSkeleton rows={6} cols={6} />
          ) : (
            <CustomersTable
              customers={filteredCustomers}
              isLoading={isLoading}
              onRowClick={handleRowClick}
              onDeleteCustomer={setCustomerToDelete}
              resetTrigger={`${search}_${activeTab}_${filterPreset}_${selectedTypes.join(',')}`}
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

      {isOwner && (
        <BulkImportCustomersModal
          isOpen={isCsvModalOpen}
          onClose={() => setIsCsvModalOpen(false)}
          existingCustomers={customers}
          marketers={marketerOptions}
          onImportSuccess={() => fetchCustomers(search, activeTab)}
        />
      )}

      {/* Delete Confirmation Modal for Customer */}
      <DeleteConfirmationModal
        isOpen={Boolean(customerToDelete)}
        title={`Delete Customer: ${customerToDelete?.name || ''}`}
        message={`Are you sure you want to permanently delete customer "${customerToDelete?.name}"? This will permanently remove the customer and all associated test orders, payments, and transactions.`}
        confirmText="Delete Customer"
        onConfirm={handleConfirmDeleteCustomer}
        onClose={() => setCustomerToDelete(null)}
      />
    </div>
  );
}

