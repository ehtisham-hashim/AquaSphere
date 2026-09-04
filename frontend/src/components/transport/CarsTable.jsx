import { Loader2, Car, Edit2, PowerOff, Search, ChevronRight, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function CarsTable({
  vehicles = [],
  loading = false,
  onSelectVehicle,
  onEditVehicle,
  onToggleStatus,
  search = '',
  setSearch,
  isWadaana = false
}) {
  const { user } = useAuth();
  const canManage = user?.role === 'TRANSPORT_MANAGER';

  return (
    <div className="space-y-4">
      {/* Search Input */}
      {setSearch && (
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="search"
            placeholder="Search by vehicle name, plate number, or model..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-emerald-500 transition-colors shadow-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {/* Vehicles Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="p-4">Vehicle Name</th>
                <th className="p-4">Plate Number</th>
                <th className="p-4">Model / Type</th>
                <th className="p-4 text-center">Status</th>
                {canManage && <th className="p-4 text-center">Actions</th>}
                <th className="p-4 text-right">Details</th>
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
                  <td colSpan={canManage ? 6 : 5} className="p-10 text-center text-slate-400">
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
                    <td className="p-4 font-bold text-slate-800 text-sm">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${
                          isWadaana ? 'bg-sky-50 text-[#0ea5e9]' : 'bg-emerald-50 text-emerald-600'
                        }`}>
                          <Car size={18} />
                        </div>
                        <div>
                          <p>{v.name}</p>
                          <p className="text-xs text-slate-400 font-normal">
                            Added {new Date(v.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="p-4 font-mono font-bold text-xs text-slate-700">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200">
                        {v.plateNumber}
                      </span>
                    </td>

                    <td className="p-4 text-slate-600 text-xs font-medium">
                      {v.model || '—'}
                    </td>

                    <td className="p-4 text-center">
                      {v.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 size={12} /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-600 border border-rose-200">
                          <XCircle size={12} /> Inactive
                        </span>
                      )}
                    </td>

                    {canManage && (
                      <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onEditVehicle && onEditVehicle(v)}
                            title="Edit Vehicle"
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          >
                            <Edit2 size={16} />
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
                            <PowerOff size={16} />
                          </button>
                        </div>
                      </td>
                    )}

                    <td className="p-4 text-right text-slate-400 group-hover:text-slate-700 transition">
                      <ChevronRight size={18} className="inline-block" />
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
