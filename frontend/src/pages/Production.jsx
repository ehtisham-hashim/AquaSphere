import { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Plus, 
  RefreshCw 
} from 'lucide-react';
import { toast } from 'sonner';
import { getCompanyFromCookie } from '../utils/companyCookie';
import { API_URL } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import DeleteConfirmationModal from '../components/ui/DeleteConfirmationModal';
import ProductionBatchTable from '../components/production/ProductionBatchTable';
import CreateBatchModal from '../components/production/CreateBatchModal';
import CompleteBatchModal from '../components/production/CompleteBatchModal';

const API = API_URL;

export default function Production() {
  const tenant = getCompanyFromCookie();
  const isWadaana = tenant === 'wadaana';
  const { user } = useAuth();
  const isOwner = user?.role === 'OWNER';

  const [batches, setBatches] = useState([]);
  const [items, setItems] = useState([]);
  const [, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Complete Batch Modal State
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [completingBatchId, setCompletingBatchId] = useState(null);

  // Delete Batch Modal State
  const [batchToDelete, setBatchToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [itemsRes, batchesRes, statsRes] = await Promise.all([
        fetch(`${API}/items`, { headers: { 'x-tenant': tenant }, credentials: 'include' }),
        fetch(`${API}/production`, { headers: { 'x-tenant': tenant }, credentials: 'include' }),
        fetch(`${API}/production/stats`, { headers: { 'x-tenant': tenant }, credentials: 'include' }).catch(() => ({ json: () => ({ success: true, data: null }) }))
      ]);

      const itemsData = await itemsRes.json();
      const batchesData = await batchesRes.json();
      const statsData = await statsRes.json();

      if (itemsData.success) setItems(itemsData.data || []);
      if (batchesData.success) setBatches(batchesData.data || []);
      if (statsData.success) setStats(statsData.data);
    } catch (err) {
      console.error('Error fetching PM production data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogBatch = async (payload) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/production`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-tenant': tenant 
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Production Batch Recorded (Pending Verification)');
        setIsModalOpen(false);
        fetchData();
      } else {
        toast.error(data.message || 'Failed to log batch');
      }
    } catch (err) {
      console.error(err);
      toast.error('Server error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteBatch = async (bodyData) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/production/${completingBatchId}/complete`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-tenant': tenant 
        },
        credentials: 'include',
        body: JSON.stringify(bodyData)
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Batch Completed & Inventory Updated');
        setIsCompleteModalOpen(false);
        setCompletingBatchId(null);
        fetchData();
      } else {
        toast.error(data.message || 'Failed to complete batch');
      }
    } catch (err) {
      console.error(err);
      toast.error('Server error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDeleteBatch = async () => {
    if (!batchToDelete) return;
    if (!isOwner) {
      toast.error('Only Owner can delete production batches.');
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`${API}/production/${batchToDelete.id}`, {
        method: 'DELETE',
        headers: { 'x-tenant': tenant },
        credentials: 'include'
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.message || 'Failed to delete production batch');
        return;
      }
      toast.success('Production batch deleted successfully.');
      setBatchToDelete(null);
      fetchData();
    } catch (err) {
      toast.error('Error deleting production batch');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className={`w-8 h-8 ${isWadaana ? 'text-[#0ea5e9]' : 'text-emerald-600'} animate-spin`} />
          <p className="text-sm text-slate-500 font-medium">Loading Production Management...</p>
        </div>
      </div>
    );
  }

  const batchToComplete = batches.find(b => b.id === completingBatchId);
  const lowItems = items.filter(i => 
    !i.archivedAt && 
    Number(i.reorderLevel) > 0 && 
    Number(i.cachedQty || 0) <= Number(i.reorderLevel)
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${isWadaana ? 'bg-sky-50 text-sky-700 border border-sky-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
              {isWadaana ? 'WADAANA PRODUCTION' : 'PRODUCTION MANAGER'}
            </span>
            <span className="text-xs text-slate-500">
              {isWadaana ? 'Factory Single Bottle Production Floor' : 'Strict Chemical & Raw Material Formula Control'}
            </span>
          </div>
          <h1 className="text-2xl font-bold mt-2 text-slate-800">Factory Floor & Batch Execution</h1>
          <p className="text-sm text-slate-500 mt-1">
            {isWadaana ? 'Log single preform bottle production runs in bulk.' : 'Log pack output to trigger exact-decimal raw material auto-deductions and breakage tracking.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className={`px-5 py-2.5 ${isWadaana ? 'bg-[#0ea5e9] hover:bg-sky-500' : 'bg-emerald-600 hover:bg-emerald-500'} text-white font-bold text-sm rounded-xl shadow-lg transition flex items-center gap-2`}
          >
            <Plus className="w-5 h-5" />
            Log Production Batch
          </button>
        </div>
      </div>

      {/* Production Inventory & Stock Alerts Banner */}
      {lowItems.length > 0 && (
        <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <span>Production Inventory & Low Stock Alerts ({lowItems.length})</span>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {lowItems.map(item => (
              <span key={item.id} className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1.5 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                {item.name}: {Number(item.cachedQty || 0).toLocaleString()} {item.unit || 'pcs'} remaining
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Production History & Batch Audit Trail Table */}
      <ProductionBatchTable
        batches={batches}
        isWadaana={isWadaana}
        isOwner={isOwner}
        user={user}
        onComplete={(id) => {
          setCompletingBatchId(id);
          setIsCompleteModalOpen(true);
        }}
        onDelete={(b) => setBatchToDelete(b)}
      />

      {/* Create Batch Modal */}
      {isModalOpen && (
        <CreateBatchModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleLogBatch}
          isWadaana={isWadaana}
          items={items}
          batchesCount={batches.length}
          submitting={submitting}
        />
      )}

      {/* Complete Batch Modal */}
      {isCompleteModalOpen && (
        <CompleteBatchModal
          isOpen={isCompleteModalOpen}
          onClose={() => {
            setIsCompleteModalOpen(false);
            setCompletingBatchId(null);
          }}
          onSubmit={handleCompleteBatch}
          batchToComplete={batchToComplete}
          isWadaana={isWadaana}
          submitting={submitting}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={Boolean(batchToDelete)}
        title="Delete Production Batch"
        message={`Are you sure you want to delete Production Batch #${batchToDelete?.id?.substring(0, 8).toUpperCase()}? This will revert any associated inventory additions and raw material consumptions.`}
        confirmText="Delete Batch"
        cancelText="Cancel"
        loading={isDeleting}
        onConfirm={handleConfirmDeleteBatch}
        onClose={() => setBatchToDelete(null)}
      />
    </div>
  );
}
