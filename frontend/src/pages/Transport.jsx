import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  Car, 
  Fuel, 
  Plus, 
  Download
} from 'lucide-react';
import { API_URL } from '../utils/api';
import { PageHeader } from '../components/ui';
import { useTenant } from '../context/TenantContext';
import { useAuth } from '../context/AuthContext';
import {
  CarsTable,
  AddEditCarModal,
  VehicleDetailPanel
} from '../components/transport';
import {
  ExpensesSummaryCards,
  ExpensesTable,
  LogExpenseModal
} from '../components/expenses';

// ponytail: unified transport page - tab 1 fleet, tab 2 vehicle expenses
export default function Transport() {
  const { user } = useAuth();
  const { tenant, isWadaana } = useTenant();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active tab state ('fleet' | 'expenses')
  const initialTab = searchParams.get('tab') === 'expenses' ? 'expenses' : 'fleet';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Sync tab change to URL search params
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams(tab === 'fleet' ? {} : { tab });
  };

  /* ------------------- Tab 1: Fleet State ------------------- */
  const [vehicles, setVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [isCarModalOpen, setIsCarModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);

  const fetchVehicles = useCallback(async () => {
    setLoadingVehicles(true);
    try {
      const res = await fetch(`${API_URL}/vehicles`, {
        headers: { 'x-tenant': tenant },
        credentials: 'include'
      });
      const json = await res.json();
      if (json.success) {
        setVehicles(json.data || []);
      } else {
        toast.error(json.message || 'Failed to load vehicles');
      }
    } catch (err) {
      toast.error('Network error loading vehicles');
    } finally {
      setLoadingVehicles(false);
    }
  }, [tenant]);

  const filteredVehicles = useMemo(() => {
    if (!vehicleSearch.trim()) return vehicles;
    const q = vehicleSearch.toLowerCase();
    return vehicles.filter(
      (v) =>
        v.name?.toLowerCase().includes(q) ||
        v.plateNumber?.toLowerCase().includes(q) ||
        v.model?.toLowerCase().includes(q)
    );
  }, [vehicles, vehicleSearch]);

  const handleToggleVehicleStatus = async (vehicle) => {
    const newStatus = !vehicle.isActive;
    try {
      const res = await fetch(`${API_URL}/vehicles/${vehicle.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant': tenant
        },
        credentials: 'include',
        body: JSON.stringify({ isActive: newStatus })
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to update vehicle status');
      }
      toast.success(`Vehicle marked as ${newStatus ? 'Active' : 'Inactive'}`);
      fetchVehicles();
    } catch (err) {
      toast.error(err.message || 'Error updating status');
    }
  };

  /* ------------------- Tab 2: Expenses State ------------------- */
  const [expenses, setExpenses] = useState([]);
  const [loadingExpenses, setLoadingExpenses] = useState(true);
  const [expenseSearch, setExpenseSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [timeRange, setTimeRange] = useState('MONTHLY');
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  const fetchExpenses = useCallback(async () => {
    setLoadingExpenses(true);
    try {
      const res = await fetch(`${API_URL}/expenses?limit=200`, {
        headers: { 'x-tenant': tenant },
        credentials: 'include'
      });
      const json = await res.json();
      if (json.success) {
        const raw = json.data?.expenses || json.data || [];
        setExpenses(Array.isArray(raw) ? raw : []);
      }
    } catch (err) {
      console.error('Failed to fetch transport expenses:', err);
    } finally {
      setLoadingExpenses(false);
    }
  }, [tenant]);

  useEffect(() => {
    fetchVehicles();
    fetchExpenses();
  }, [fetchVehicles, fetchExpenses]);

  // Filter transport-related expenses (attached vehicle or transport categories)
  const transportExpenses = useMemo(() => {
    return expenses.filter(ex => {
      return (
        ex.vehicleId ||
        ex.vehicle ||
        ['Fuel / Transport', 'Fuel', 'Vehicle Repairs', 'Vehicle Repair', 'Maintenance'].includes(ex.category)
      );
    });
  }, [expenses]);

  const filteredTransportExpenses = useMemo(() => {
    return transportExpenses.filter(ex => {
      const matchesCategory = selectedCategory === 'ALL' || ex.category === selectedCategory;
      const q = expenseSearch.toLowerCase();
      const matchesSearch =
        ex.category.toLowerCase().includes(q) ||
        (ex.remarks && ex.remarks.toLowerCase().includes(q)) ||
        (ex.vehicle?.name && ex.vehicle.name.toLowerCase().includes(q)) ||
        (ex.vehicle?.plateNumber && ex.vehicle.plateNumber.toLowerCase().includes(q));

      const exDate = new Date(ex.createdAt);
      const now = new Date();

      let matchesTime = true;
      if (timeRange === 'DAILY') {
        matchesTime = exDate.toDateString() === now.toDateString();
      } else if (timeRange === 'WEEKLY') {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        matchesTime = exDate >= startOfWeek;
      } else if (timeRange === 'MONTHLY') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        matchesTime = exDate >= startOfMonth;
      } else if (timeRange === 'QUARTERLY') {
        const currentQuarterMonth = Math.floor(now.getMonth() / 3) * 3;
        const startOfQuarter = new Date(now.getFullYear(), currentQuarterMonth, 1);
        matchesTime = exDate >= startOfQuarter;
      } else if (timeRange === 'YEARLY') {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        matchesTime = exDate >= startOfYear;
      } else if (timeRange === 'LIFETIME') {
        matchesTime = true;
      }

      return matchesCategory && matchesSearch && matchesTime;
    });
  }, [transportExpenses, selectedCategory, expenseSearch, timeRange]);

  const handleExportCSV = () => {
    if (filteredTransportExpenses.length === 0) {
      toast.error('No expenses to export');
      return;
    }
    const headers = ['Date', 'Vehicle', 'Plate Number', 'Category', 'Amount (Rs)', 'Description', 'Receipt URL', 'Logged By'];
    const rows = filteredTransportExpenses.map(ex => [
      new Date(ex.createdAt).toLocaleDateString(),
      `"${(ex.vehicle?.name || 'General').replace(/"/g, '""')}"`,
      `"${(ex.vehicle?.plateNumber || '').replace(/"/g, '""')}"`,
      `"${ex.category.replace(/"/g, '""')}"`,
      Math.round(Number(ex.amount)),
      `"${(ex.remarks || '').replace(/"/g, '""')}"`,
      `"${ex.receiptUrl || ''}"`,
      `"${(ex.createdBy?.name || user?.name || 'System').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Vehicle_Expenses_${timeRange}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const canManageCars = user?.role === 'TRANSPORT_MANAGER' || user?.role === 'OWNER';

  return (
    <div className="space-y-4">
      {/* Top Header & Tab Navigation */}
      <PageHeader
        title="Fleet & Transport Hub"
        subtitle="Manage company vehicles, active fleet status, and fuel & maintenance expenses"
        actions={
          <div className="flex items-center gap-1 bg-slate-100/90 p-0.5 rounded-lg border border-slate-200/80 shrink-0">
            <button
              onClick={() => handleTabChange('fleet')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'fleet'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Car size={13} /> Fleet & Vehicles
            </button>
            <button
              onClick={() => handleTabChange('expenses')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'expenses'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Fuel size={13} /> Vehicle Expenses
            </button>
          </div>
        }
      />

      {/* ------------------- Tab 1: Fleet & Vehicles ------------------- */}
      {activeTab === 'fleet' && (
        <div className="space-y-4">
          {selectedVehicle ? (
            <VehicleDetailPanel
              vehicle={selectedVehicle}
              onClose={() => {
                setSelectedVehicle(null);
                fetchVehicles();
                fetchExpenses();
              }}
              isWadaana={isWadaana}
            />
          ) : (
            <>
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600">
                    Total Vehicles: {vehicles.length}
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs font-bold text-emerald-600">
                    {vehicles.filter(v => v.isActive).length} Operational
                  </span>
                </div>

                {canManageCars && (
                  <button
                    onClick={() => {
                      setEditingVehicle(null);
                      setIsCarModalOpen(true);
                    }}
                    className="btn-primary flex items-center gap-1.5 text-xs font-bold py-2 px-3.5 self-start sm:self-auto"
                  >
                    <Plus size={16} /> Add Vehicle
                  </button>
                )}
              </div>

              <CarsTable
                vehicles={filteredVehicles}
                loading={loadingVehicles}
                onSelectVehicle={(v) => setSelectedVehicle(v)}
                onEditVehicle={(v) => {
                  setEditingVehicle(v);
                  setIsCarModalOpen(true);
                }}
                onToggleStatus={handleToggleVehicleStatus}
                search={vehicleSearch}
                setSearch={setVehicleSearch}
                isWadaana={isWadaana}
              />
            </>
          )}

          {/* Add / Edit Vehicle Modal */}
          {isCarModalOpen && (
            <AddEditCarModal
              isOpen={isCarModalOpen}
              onClose={() => setIsCarModalOpen(false)}
              onSuccess={() => fetchVehicles()}
              vehicle={editingVehicle}
              isWadaana={isWadaana}
            />
          )}
        </div>
      )}

      {/* ------------------- Tab 2: Vehicle Expenses ------------------- */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          {/* Sub Header for Expenses */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Time Horizon:</span>
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
                {['DAILY', 'WEEKLY', 'MONTHLY', 'LIFETIME'].map((r) => (
                  <button
                    key={r}
                    onClick={() => setTimeRange(r)}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                      timeRange === r
                        ? 'bg-brand-primary text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {r.charAt(0) + r.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCSV}
                className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
                title="Export CSV"
              >
                <Download size={14} /> Export CSV
              </button>

              <button
                onClick={() => setIsExpenseModalOpen(true)}
                className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5"
              >
                <Plus size={16} /> Log Expense
              </button>
            </div>
          </div>

          {/* Transport Summary Cards */}
          <ExpensesSummaryCards
            expenses={transportExpenses}
            filteredExpenses={filteredTransportExpenses}
            timeRange={timeRange}
          />

          {/* Main Expenses Table */}
          <ExpensesTable
            filteredExpenses={filteredTransportExpenses}
            loading={loadingExpenses}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            search={expenseSearch}
            setSearch={setExpenseSearch}
            userName={user?.name}
          />

          {/* Log Expense Modal (Full support for receipts, TM mandatory car selection) */}
          {isExpenseModalOpen && (
            <LogExpenseModal
              isOpen={isExpenseModalOpen}
              onClose={() => setIsExpenseModalOpen(false)}
              onSuccess={() => {
                fetchExpenses();
                setIsExpenseModalOpen(false);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
