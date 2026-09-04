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
import { getCompanyFromCookie } from '../../utils/companyCookie';
import { useAuth } from '../../context/AuthContext';
import AddTransportExpenseModal from './AddTransportExpenseModal';
import DeleteConfirmationModal from '../ui/DeleteConfirmationModal';

export default function VehicleDetailPanel({
  vehicle: initialVehicle,
  onClose,
  isWadaana = false
}) {
  const { user } = useAuth();
  const canManage = user?.role === 'TRANSPORT_MANAGER';
  const tenant = getCompanyFromCookie();
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
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Bar: Back Button & Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl shadow-xs transition"
        >
          <ArrowLeft size={16} /> Back to Vehicles
        </button>

        {canManage && (
          <button
            onClick={() => setIsAddExpenseOpen(true)}
            className={`px-4 py-2.5 ${
              isWadaana ? 'bg-[#0ea5e9] hover:bg-sky-500 shadow-sky-500/20' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
            } text-white font-bold text-sm rounded-xl transition shadow-md flex items-center gap-2`}
          >
            <Plus size={18} /> Log Expense for Vehicle
          </button>
        )}
      </div>

      {/* Vehicle Info Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className={`p-3.5 rounded-2xl ${
              isWadaana ? 'bg-sky-50 text-[#0ea5e9]' : 'bg-emerald-50 text-emerald-600'
            }`}>
              <Car size={32} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-slate-900">{vehicle?.name}</h2>
                {vehicle?.isActive ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 size={12} /> Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-600 border border-rose-200">
                    <XCircle size={12} /> Inactive
                  </span>
                )}
              </div>
              <p className="font-mono text-sm font-bold text-slate-600 mt-1">
                Plate: <span className="bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">{vehicle?.plateNumber}</span>
              </p>
              {vehicle?.model && (
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Model / Spec: {vehicle.model}
                </p>
              )}
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-4 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Loaded Expenses</p>
              <p className="text-xl font-black text-slate-800 font-mono mt-0.5">{expenses.length}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Recorded</p>
              <p className={`text-xl font-black font-mono mt-0.5 ${isWadaana ? 'text-[#0ea5e9]' : 'text-emerald-700'}`}>
                Rs. {Math.round(totalSpent).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Expense History Table with Infinite Scroll */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
            <FileText size={18} className="text-slate-400" />
            Vehicle Expense & Maintenance Log
          </h3>
          <span className="text-xs font-semibold text-slate-500">
            Scroll down to auto-load earlier records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="p-4">Date</th>
                <th className="p-4">Type</th>
                <th className="p-4">Period</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Note / Details</th>
                {canManage && <th className="p-4 text-center">Actions</th>}
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
                  <td colSpan={canManage ? 6 : 5} className="p-10 text-center text-slate-400">
                    No expense records found for this vehicle.
                  </td>
                </tr>
              ) : (
                expenses.map((ex) => (
                  <tr key={ex.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 text-slate-600 text-xs font-medium">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-slate-400" />
                        {new Date(ex.date || ex.createdAt).toLocaleDateString()}
                      </div>
                    </td>

                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getTypeBadge(ex.type)}`}>
                        {ex.type}
                      </span>
                    </td>

                    <td className="p-4 text-xs font-medium text-slate-600">
                      {ex.period || 'MONTHLY'}
                    </td>

                    <td className={`p-4 font-black text-base ${isWadaana ? 'text-[#0ea5e9]' : 'text-emerald-700'}`}>
                      Rs. {Math.round(Number(ex.amount)).toLocaleString()}
                    </td>

                    <td className="p-4 text-slate-700 text-xs max-w-[320px] truncate">
                      {ex.note || '—'}
                    </td>

                    {canManage && (
                      <td className="p-4 text-center">
                        <button
                          onClick={() => setExpenseToDelete(ex)}
                          title="Delete Expense"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        >
                          <Trash2 size={16} />
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
        <div ref={sentinelRef} className="py-4 text-center text-xs text-slate-400">
          {loadingMore && (
            <div className="flex items-center justify-center gap-2 py-2">
              <Loader2 size={16} className={`animate-spin ${isWadaana ? 'text-[#0ea5e9]' : 'text-emerald-600'}`} />
              <span>Loading more expenses...</span>
            </div>
          )}
          {!hasMore && expenses.length > 0 && !loading && (
            <span className="text-slate-400 font-medium">End of expense records</span>
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
