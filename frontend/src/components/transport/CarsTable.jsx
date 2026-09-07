import { Loader2, Car, Edit2, PowerOff, Search, ChevronRight, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';

export default function CarsTable({
  vehicles = [],
  loading = false,
  onSelectVehicle,
  onEditVehicle,
  onToggleStatus,
  search = '',
  setSearch
}) {
  const { user } = useAuth();
  const { isWadaana } = useTenant();
  const canManage = user?.role === 'TRANSPORT_MANAGER';

  return (
    <div className="space-y-3">
      {/* Search Input */}
      {setSearch && (
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="search"
            placeholder="Search by vehicle name, plate number, or model..."
            className="input-base pl-9 text-xs py-2 w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {/* Vehicles Table */}
      <div className="table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr>
                <th className="table-th">Vehicle Name</th>
                <th className="table-th">Plate Number</th>
                <th className="table-th">Model / Type</th>
                <th className="table-th text-center">Status</th>
                {canManage && <th className="table-th text-center">Actions</th>}
                <th className="table-th text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={canManage ? 6 : 5} className="p-10 text-center text-slate-400">
                    <Loader2 className={`w-6 h-6 animate-spin mx-auto mb-2 ${isWadaana ? 'text-[#0ea5e9]' : 'text-emerald-600'}`} />
                    Loading vehicles...
                  </td>
                </tr>
              ) : vehicles.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 6 : 5} className="p-10 text-center text-slate-400 text-sm">
                    No vehicles found.
                  </td>
                </tr>
              ) : (
                vehicles.map((v) => (
                  <tr
                    key={v.id}
                    onClick={() => onSelectVehicle && onSelectVehicle(v)}
                    className="hover:bg-slate-50/90 transition-colors cursor-pointer group"
                  >
                    <td className="table-td font-bold text-slate-800 text-sm">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-brand-light text-brand-primary">
                          <Car size={16} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{v.name}</p>
                          <p className="text-[11px] text-slate-400 font-normal">
                            Added {new Date(v.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="table-td font-mono font-bold text-xs text-slate-700">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                        {v.plateNumber}
                      </span>
                    </td>

                    <td className="table-td text-slate-600 text-xs font-medium">
                      {v.model || '—'}
                    </td>

                    <td className="table-td text-center">
                      {v.isActive ? (
                        <span className="badge-success inline-flex items-center gap-1 text-[11px]">
                          <CheckCircle2 size={11} /> Active
                        </span>
                      ) : (
                        <span className="badge-danger inline-flex items-center gap-1 text-[11px]">
                          <XCircle size={11} /> Inactive
                        </span>
                      )}
                    </td>

                    {canManage && (
                      <td className="table-td text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onEditVehicle && onEditVehicle(v)}
                            title="Edit Vehicle"
                            className="p-1.5 text-slate-400 hover:text-brand-primary hover:bg-slate-100 rounded-lg transition"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => onToggleStatus && onToggleStatus(v)}
                            title={v.isActive ? 'Deactivate Vehicle' : 'Activate Vehicle'}
                            className={`p-1.5 rounded-lg transition ${
                              v.isActive 
                                ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50' 
                                : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                            }`}
                          >
                            <PowerOff size={15} />
                          </button>
                        </div>
                      </td>
                    )}

                    <td className="table-td text-right text-slate-400 group-hover:text-slate-700 transition">
                      <ChevronRight size={16} className="inline-block" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
