import { Plus, Car } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function CarsHeader({
  onOpenAddModal,
  tenant = 'aquasphere'
}) {
  const { user } = useAuth();
  const isWadaana = tenant === 'wadaana';
  const canAddCar = user?.role === 'TRANSPORT_MANAGER';

  return (
    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
      <div>
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
            isWadaana ? 'bg-sky-50 text-sky-700 border border-sky-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}>
            {isWadaana ? 'WADAANA FLEET' : 'VEHICLE FLEET'}
          </span>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mt-1 flex items-center gap-2">
          <Car className={isWadaana ? 'text-[#0ea5e9]' : 'text-emerald-600'} size={24} />
          Vehicles & Fleet Management
        </h2>
        <p className="text-slate-500 text-sm">Manage company delivery vehicles, status, and associated maintenance records</p>
      </div>

      {canAddCar && (
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenAddModal}
            className={`px-4 py-2.5 ${
              isWadaana ? 'bg-[#0ea5e9] hover:bg-sky-500 shadow-sky-500/20' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
            } text-white font-bold text-sm rounded-xl transition shadow-md flex items-center gap-2`}
          >
            <Plus size={18} /> Add Vehicle
          </button>
        </div>
      )}
    </div>
  );
}
