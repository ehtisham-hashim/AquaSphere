import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ArrowLeft, 
  Car, 
  Plus, 
  Trash2, 
  Calendar, 
  Loader2, 
  CheckCircle2, 
  XCircle,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { API_URL } from '../../utils/api';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';
import AddTransportExpenseModal from './AddTransportExpenseModal';
import DeleteConfirmationModal from '../ui/DeleteConfirmationModal';

export default function VehicleDetailPanel({
  vehicle: initialVehicle,
  onClose
}) {
  const { user } = useAuth();
  const { tenant, isWadaana } = useTenant();
  const canManage = user?.role === 'TRANSPORT_MANAGER';
  const vehicleId = initialVehicle?.id;

  const [vehicle, setVehicle] = useState(initialVehicle);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);

  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const sentinelRef = useRef(null);

  // Initial fetch of vehicle & expenses
  const fetchVehicleExpenses = useCallback(async () => {
    if (!vehicleId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/transport-expenses/vehicle/${vehicleId}?limit=15`, {
        headers: { 'x-tenant': tenant },
        credentials: 'include'
      });
      const json = await res.json();
      if (json.success) {
        setExpenses(json.data || []);
        if (json.vehicle) setVehicle(json.vehicle);
        setHasMore(Boolean(json.hasMore));
        setNextCursor(json.nextCursor || null);
      } else {
        toast.error(json.message || 'Failed to load vehicle expenses');
      }
    } catch (err) {
      toast.error('Network error loading vehicle expenses');
    } finally {
      setLoading(false);
    }
  }, [vehicleId, tenant]);

  useEffect(() => {
    fetchVehicleExpenses();
  }, [fetchVehicleExpenses]);

  // Load more function for infinite scrolling
  const loadMoreExpenses = useCallback(async () => {
    if (!hasMore || !nextCursor || loadingMore || !vehicleId) return;
    setLoadingMore(true);
    try {
      const res = await fetch(
        `${API_URL}/transport-expenses/vehicle/${vehicleId}?cursor=${nextCursor}&limit=15`,
        {
          headers: { 'x-tenant': tenant },
          credentials: 'include'
        }
      );
      const json = await res.json();
      if (json.success) {
        setExpenses((prev) => [...prev, ...(json.data || [])]);
        setHasMore(Boolean(json.hasMore));
        setNextCursor(json.nextCursor || null);
      }
    } catch (err) {
      console.error('Failed to load more expenses', err);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, nextCursor, loadingMore, vehicleId, tenant]);

  // IntersectionObserver for infinite scroll sentinel
  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadMoreExpenses();
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(sentinelRef.current);

    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, loadMoreExpenses]);

  // Delete an expense
  const handleDeleteExpense = async () => {
    if (!expenseToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/transport-expenses/${expenseToDelete.id}`, {
        method: 'DELETE',
        headers: { 'x-tenant': tenant },
        credentials: 'include'
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to delete expense');
      }
      toast.success('Expense deleted');
      setExpenses((prev) => prev.filter((e) => e.id !== expenseToDelete.id));
      setExpenseToDelete(null);
    } catch (err) {
      toast.error(err.message || 'Error deleting expense');
    } finally {
      setDeleting(false);
    }
  };

  const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const getTypeBadge = (type) => {
    switch (type) {
      case 'DAILY':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'REPAIRS':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'OTHER':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Top Bar: Back Button & Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={onClose}
          className="btn-outline flex items-center gap-1.5 text-xs py-2 px-3"
        >
          <ArrowLeft size={15} /> Back to Vehicles
        </button>

        {canManage && (
          <button
            onClick={() => setIsAddExpenseOpen(true)}
            className="btn-primary flex items-center gap-1.5 text-xs font-bold py-2 px-3.5"
          >
            <Plus size={16} /> Log Expense for Vehicle
          </button>
        )}
      </div>

      {/* Vehicle Info Card */}
      <div className="card-surface p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-xl bg-brand-light text-brand-primary">
              <Car size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{vehicle?.name}</h2>
                {vehicle?.isActive ? (
                  <span className="badge-success inline-flex items-center gap-1 text-[11px]">
                    <CheckCircle2 size={11} /> Active
                  </span>
                ) : (
                  <span className="badge-danger inline-flex items-center gap-1 text-[11px]">
                    <XCircle size={11} /> Inactive
                  </span>
                )}
              </div>
              <p className="font-mono text-xs sm:text-sm font-bold text-slate-600 mt-1">
                Plate: <span className="bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">{vehicle?.plateNumber}</span>
              </p>
              {vehicle?.model && (
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Model / Spec: {vehicle.model}
                </p>
              )}
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-3 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-5">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Loaded Records</p>
              <p className="text-lg sm:text-xl font-black text-slate-800 font-mono mt-0.5">{expenses.length}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Recorded</p>
              <p className="text-lg sm:text-xl font-black font-mono text-brand-primary mt-0.5">
                Rs. {Math.round(totalSpent).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Expense History Table with Infinite Scroll */}
      <div className="table-container">
        <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <FileText size={16} className="text-slate-400" />
            Vehicle Expense & Maintenance Log
          </h3>
          <span className="text-[11px] font-semibold text-slate-400">
            Auto-loads earlier records on scroll
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr>
                <th className="table-th">Date</th>
                <th className="table-th">Type</th>
                <th className="table-th">Period</th>
                <th className="table-th">Amount</th>
                <th className="table-th">Note / Details</th>
                {canManage && <th className="table-th text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={canManage ? 6 : 5} className="p-10 text-center text-slate-400">
                    <Loader2 className={`w-6 h-6 animate-spin mx-auto mb-2 ${isWadaana ? 'text-[#0ea5e9]' : 'text-emerald-600'}`} />
                    Loading expenses for {vehicle?.name}...
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 6 : 5} className="p-10 text-center text-slate-400 text-sm">
                    No expense records found for this vehicle.
                  </td>
                </tr>
              ) : (
                expenses.map((ex) => (
                  <tr key={ex.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="table-td text-slate-600 text-xs font-medium">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-slate-400" />
                        {new Date(ex.date || ex.createdAt).toLocaleDateString()}
                      </div>
                    </td>

                    <td className="table-td">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${getTypeBadge(ex.type)}`}>
                        {ex.type}
                      </span>
                    </td>

                    <td className="table-td text-xs font-medium text-slate-600">
                      {ex.period || 'MONTHLY'}
                    </td>

                    <td className="table-td font-black font-mono text-sm text-brand-primary">
                      Rs. {Math.round(Number(ex.amount)).toLocaleString()}
                    </td>

                    <td className="table-td text-slate-700 text-xs max-w-[320px] truncate">
                      {ex.note || '—'}
                    </td>

                    {canManage && (
                      <td className="table-td text-center">
                        <button
                          onClick={() => setExpenseToDelete(ex)}
                          title="Delete Expense"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Sentinel element for infinite scrolling */}
        <div ref={sentinelRef} className="py-3 text-center text-xs text-slate-400">
          {loadingMore && (
            <div className="flex items-center justify-center gap-2 py-1.5">
              <Loader2 size={15} className={`animate-spin ${isWadaana ? 'text-[#0ea5e9]' : 'text-emerald-600'}`} />
              <span>Loading more expenses...</span>
            </div>
          )}
          {!hasMore && expenses.length > 0 && !loading && (
            <span className="text-slate-400 font-medium text-[11px]">End of expense records</span>
          )}
        </div>
      </div>

      {/* Add Expense Modal */}
      {isAddExpenseOpen && (
        <AddTransportExpenseModal
          isOpen={isAddExpenseOpen}
          onClose={() => setIsAddExpenseOpen(false)}
          onSuccess={() => fetchVehicleExpenses()}
          vehicles={[vehicle]}
          preselectedVehicleId={vehicle?.id}
          isWadaana={isWadaana}
        />
      )}

      {/* Delete Confirmation Modal */}
      {expenseToDelete && (
        <DeleteConfirmationModal
          isOpen={Boolean(expenseToDelete)}
          title="Delete Transport Expense"
          message={`Are you sure you want to delete this Rs. ${Math.round(Number(expenseToDelete.amount)).toLocaleString()} ${expenseToDelete.type} expense record?`}
          onConfirm={handleDeleteExpense}
          onClose={() => setExpenseToDelete(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}
