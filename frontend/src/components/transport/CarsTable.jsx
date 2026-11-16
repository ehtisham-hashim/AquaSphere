import { Loader2, Car, Edit2, PowerOff, Search, ChevronRight, CheckCircle2, XCircle, Eye } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { usePagination } from '../../hooks/usePagination';
import TablePagination from '../common/TablePagination';
import TableActionMenu from '../ui/TableActionMenu';

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
  const canManage = ['OWNER', 'ADMIN', 'TRANSPORT_MANAGER'].includes(user?.role);
  const pagination = usePagination(vehicles || [], 50, search);

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
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th className="table-th">Vehicle Name</th>
                <th className="table-th">Plate Number</th>
                <th className="table-th">Model / Type</th>
                <th className="table-th text-center">Status</th>
                <th className="table-th text-right sticky right-0 bg-slate-50 z-10">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-slate-400">
                    <Loader2 className={`w-6 h-6 animate-spin mx-auto mb-2 ${isWadaana ? 'text-[#0ea5e9]' : 'text-emerald-600'}`} />
                    Loading vehicles...
                  </td>
                </tr>
              ) : vehicles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-slate-400 text-sm">
                    No vehicles found.
                  </td>
                </tr>
              ) : (
                pagination.paginatedItems.map((v) => {
                  const menuItems = [
                    {
                      label: 'View Vehicle Details',
                      icon: Eye,
                      onClick: () => onSelectVehicle && onSelectVehicle(v)
                    },
                    ...(canManage ? [
                      {
                        label: 'Edit Vehicle',
                        icon: Edit2,
                        onClick: () => onEditVehicle && onEditVehicle(v)
                      },
                      {
                        label: v.isActive ? 'Deactivate Vehicle' : 'Activate Vehicle',
                        icon: PowerOff,
                        onClick: () => onToggleStatus && onToggleStatus(v),
                        danger: v.isActive,
                        divider: true
                      }
                    ] : [])
                  ];

                  return (
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

                      <td className="table-td text-right sticky right-0 bg-white group-hover:bg-slate-50/90 z-10" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {canManage && (
                            <button
                              onClick={() => onEditVehicle && onEditVehicle(v)}
                              title="Edit Vehicle"
                              className="p-1.5 text-slate-400 hover:text-brand-primary hover:bg-slate-100 rounded-lg transition"
                            >
                              <Edit2 size={14} />
                            </button>
                          )}
                          <TableActionMenu items={menuItems} />
                          <ChevronRight size={16} className="text-slate-400 group-hover:text-slate-700 transition" />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <TablePagination pagination={pagination} />
      </div>
    </div>
  );
}
