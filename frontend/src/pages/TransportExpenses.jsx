import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';
import { API_URL } from '../utils/api';
import { getCompanyFromCookie } from '../utils/companyCookie';
import TransportExpensesHeader from '../components/transport/TransportExpensesHeader';
import TransportExpensesTable from '../components/transport/TransportExpensesTable';
import AddTransportExpenseModal from '../components/transport/AddTransportExpenseModal';
import DeleteConfirmationModal from '../components/ui/DeleteConfirmationModal';

export default function TransportExpenses() {
  const tenant = getCompanyFromCookie();
  const isWadaana = tenant === 'wadaana';

  const [expenses, setExpenses] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedVehicleId, setSelectedVehicleId] = useState('ALL');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchVehicles = useCallback(async () => {
    setVehiclesLoading(true);
    try {
      const res = await fetch(`${API_URL}/vehicles`, {
        headers: { 'x-tenant': tenant },
        credentials: 'include',
      });
      const json = await res.json();
      if (json.success) {
        setVehicles(json.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch vehicles', err);
    } finally {
      setVehiclesLoading(false);
    }
  }, [tenant]);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (selectedVehicleId && selectedVehicleId !== 'ALL') {
        queryParams.set('vehicleId', selectedVehicleId);
      }
      queryParams.set('limit', '100');

      const url = `${API_URL}/transport-expenses?${queryParams.toString()}`;
      const res = await fetch(url, {
        headers: { 'x-tenant': tenant },
        credentials: 'include',
      });
      const json = await res.json();
      if (json.success) {
        setExpenses(json.data || []);
      } else {
        toast.error(json.message || 'Failed to load transport expenses');
      }
    } catch (err) {
      toast.error('Network error loading expenses');
    } finally {
      setLoading(false);
    }
  }, [tenant, selectedVehicleId]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // Client-side filtering by search query & type
  const filteredExpenses = useMemo(() => {
    return expenses.filter((ex) => {
      if (selectedType !== 'ALL' && ex.type !== selectedType) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const vName = ex.vehicle?.name?.toLowerCase() || '';
        const vPlate = ex.vehicle?.plateNumber?.toLowerCase() || '';
        const note = ex.note?.toLowerCase() || '';
        if (!vName.includes(q) && !vPlate.includes(q) && !note.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [expenses, selectedType, search]);

  // Early loading UI for vehicles
  if (vehiclesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] gap-3">
        <RefreshCw className="w-8 h-8 text-slate-400 animate-spin" />
        <p className="text-sm font-semibold text-slate-500">Loading vehicles...</p>
      </div>
    );
  }

  // Delete expense handler
  const handleDeleteExpense = async () => {
    if (!expenseToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/transport-expenses/${expenseToDelete.id}`, {
        method: 'DELETE',
        headers: { 'x-tenant': tenant },
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to delete transport expense');
      }
      toast.success('Transport expense deleted successfully');
      setExpenses((prev) => prev.filter((e) => e.id !== expenseToDelete.id));
      setExpenseToDelete(null);
    } catch (err) {
      toast.error(err.message || 'Error deleting transport expense');
    } finally {
      setDeleting(false);
    }
  };

  const handleExportCSV = () => {
    if (filteredExpenses.length === 0) {
      toast.error('No expenses to export');
      return;
    }
    const headers = ['Date', 'Vehicle Name', 'Plate Number', 'Type', 'Period', 'Amount (PKR)', 'Note'];
    const rows = filteredExpenses.map((ex) => [
      new Date(ex.date || ex.createdAt).toLocaleDateString(),
      `"${(ex.vehicle?.name || '').replace(/"/g, '""')}"`,
      `"${(ex.vehicle?.plateNumber || '').replace(/"/g, '""')}"`,
      ex.type,
      ex.period || 'MONTHLY',
      ex.amount,
      `"${(ex.note || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `transport_expenses_${tenant}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <TransportExpensesHeader
        onOpenModal={() => setIsAddModalOpen(true)}
        onExportCSV={handleExportCSV}
        hasExpenses={filteredExpenses.length > 0}
        tenant={tenant}
      />

      <TransportExpensesTable
        expenses={filteredExpenses}
        loading={loading}
        onDeleteExpense={(ex) => setExpenseToDelete(ex)}
        search={search}
        setSearch={setSearch}
        selectedType={selectedType}
        setSelectedType={setSelectedType}
        selectedVehicleId={selectedVehicleId}
        setSelectedVehicleId={setSelectedVehicleId}
        vehicles={vehicles}
        isWadaana={isWadaana}
      />

      {/* Add Expense Modal */}
      {isAddModalOpen && (
        <AddTransportExpenseModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => fetchExpenses()}
          vehicles={vehicles}
          isWadaana={isWadaana}
        />
      )}

      {/* Delete Confirmation Modal */}
      {expenseToDelete && (
        <DeleteConfirmationModal
          isOpen={Boolean(expenseToDelete)}
          title="Delete Transport Expense"
          message={`Are you sure you want to delete this Rs. ${Math.round(Number(expenseToDelete.amount)).toLocaleString()} expense for ${expenseToDelete.vehicle?.name || 'this vehicle'}?`}
          onConfirm={handleDeleteExpense}
          onClose={() => setExpenseToDelete(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}
