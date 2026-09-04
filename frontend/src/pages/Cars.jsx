import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { toast } from 'sonner';
import { API_URL } from '../utils/api';
import { getCompanyFromCookie } from '../utils/companyCookie';
import {
  CarsHeader,
  CarsTable,
  AddEditCarModal
} from '../components/transport';

// Lazy-load VehicleDetailPanel so it doesn't bloat the initial bundle
const VehicleDetailPanel = lazy(() => import('../components/transport/VehicleDetailPanel'));

function DetailLoader() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin"></div>
    </div>
  );
}

export default function Cars() {
  const tenant = getCompanyFromCookie();
  const isWadaana = tenant === 'wadaana';

  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Selected vehicle for inline page swap
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  // Modal for add / edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
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
      setLoading(false);
    }
  }, [tenant]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const filteredVehicles = useMemo(() => {
    if (!search.trim()) return vehicles;
    const q = search.toLowerCase();
    return vehicles.filter(
      (v) =>
        v.name?.toLowerCase().includes(q) ||
        v.plateNumber?.toLowerCase().includes(q) ||
        v.model?.toLowerCase().includes(q)
    );
  }, [vehicles, search]);

  const handleToggleStatus = async (vehicle) => {
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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {selectedVehicle ? (
        <Suspense fallback={<DetailLoader />}>
          <VehicleDetailPanel
            vehicle={selectedVehicle}
            onClose={() => {
              setSelectedVehicle(null);
              fetchVehicles();
            }}
            isWadaana={isWadaana}
          />
        </Suspense>
      ) : (
        <>
          <CarsHeader
            onOpenAddModal={() => {
              setEditingVehicle(null);
              setIsModalOpen(true);
            }}
            tenant={tenant}
          />

          <CarsTable
            vehicles={filteredVehicles}
            loading={loading}
            onSelectVehicle={(v) => setSelectedVehicle(v)}
            onEditVehicle={(v) => {
              setEditingVehicle(v);
              setIsModalOpen(true);
            }}
            onToggleStatus={handleToggleStatus}
            search={search}
            setSearch={setSearch}
            isWadaana={isWadaana}
          />
        </>
      )}

      {/* Add / Edit Vehicle Modal */}
      {isModalOpen && (
        <AddEditCarModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => fetchVehicles()}
          vehicle={editingVehicle}
          isWadaana={isWadaana}
        />
      )}
    </div>
  );
}
