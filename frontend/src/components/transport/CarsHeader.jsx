import { Plus, Car } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';

export default function CarsHeader({ onOpenAddModal }) {
  const { user } = useAuth();
  const { isWadaana } = useTenant();
  const canAddCar = user?.role === 'TRANSPORT_MANAGER';

  return (
    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
      <div>
        <div className="flex items-center gap-2">
          <span className="badge-brand">
            {isWadaana ? 'WADAANA FLEET' : 'VEHICLE FLEET'}
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight mt-1 flex items-center gap-2">
          <Car className="text-brand-primary" size={22} />
          Vehicles & Fleet Management
        </h2>
        <p className="text-slate-500 text-xs sm:text-sm">Manage company delivery vehicles, status, and maintenance</p>
      </div>

      {canAddCar && (
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenAddModal}
            className="btn-primary flex items-center gap-1.5 text-xs font-bold py-2 px-3.5"
          >
            <Plus size={16} /> Add Vehicle
          </button>
        </div>
      )}
    </div>
  );
}
