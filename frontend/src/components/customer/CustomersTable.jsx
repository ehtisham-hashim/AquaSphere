import { MapPin, Phone, Package, MessageCircle, Share2, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { usePagination } from '../../hooks/usePagination';
import TablePagination from '../common/TablePagination';
import { openWhatsAppWeb, WhatsAppTemplates } from '../../utils/whatsapp';

export default function CustomersTable({ customers = [], isLoading = false, onRowClick, onDeleteCustomer }) {
  const { user } = useAuth();
  const isOwner = user?.role === 'OWNER';
  const { tenant } = useTenant();
  const isWadaana = tenant === 'wadaana';

  const pagination = usePagination(customers, 50);

  const handleShareWhatsAppCustomer = (e, c) => {
    e.stopPropagation();
    const msg = WhatsAppTemplates.customerProfile(c, isWadaana);
    openWhatsAppWeb(c.phone, msg);
  };

  const handleDispatchToDriver = (e, c) => {
    e.stopPropagation();
    const msg = WhatsAppTemplates.customerProfile(c, isWadaana);
    openWhatsAppWeb('', msg);
  };

  return (
    <div className="table-container">
      <div className="overflow-x-auto">
        <table className="w-full text-left whitespace-nowrap text-xs">
          <thead>
            <tr>
              <th className="table-th">Customer</th>
              <th className="table-th">Contact</th>
              <th className="table-th">Products Buying</th>
              <th className="table-th">Financials</th>
              {!isWadaana && <th className="table-th">Bottles</th>}
              <th className="table-th text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {isLoading ? (
              <tr>
                <td colSpan={isWadaana ? "5" : "6"} className="p-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="w-7 h-7 border-3 border-[var(--brand)] border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-xs">Loading customers...</p>
                  </div>
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={isWadaana ? "5" : "6"} className="p-12 text-center text-slate-500 text-xs">
                  No customers found.
                </td>
              </tr>
            ) : (
              pagination.paginatedItems.map((c) => {
                const daysInactive = c.lastOrderDate 
                  ? Math.floor((new Date() - new Date(c.lastOrderDate)) / (1000 * 60 * 60 * 24))
                  : null;

                return (
                  <tr 
                    key={c.id} 
                    onClick={() => onRowClick && onRowClick(c)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <td className="table-td">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-full bg-[var(--brand-light)] text-[var(--brand)] flex items-center justify-center font-bold text-xs shrink-0">
                          {c.name ? c.name.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 flex items-center gap-2">
                            {c.name}
                            {c.archivedAt && (
                              <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold uppercase">
                                Archived
                              </span>
                            )}
                            {daysInactive !== null && daysInactive >= 7 && (
                              <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                                Inactive ({daysInactive}d)
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full inline-block mt-1">
                            {c.type}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="table-td">
                      <div className="flex items-center gap-1.5 text-slate-700 font-medium mb-0.5">
                        <Phone size={13} className="text-slate-400" /> {c.phone?.includes('_archived_') ? c.phone.split('_archived_')[0] : c.phone}
                      </div>
                      {c.address && (
                        <div className="flex items-center gap-1 text-slate-500 text-[11px] truncate max-w-[200px]">
                          <MapPin size={12} className="text-slate-400 shrink-0" />
                          <span>{c.address}</span>
                        </div>
                      )}
                    </td>
                    <td className="table-td">
                      <div className="flex flex-wrap items-center gap-1 max-w-[220px]">
                        {!isWadaana ? (
                          <>
                            {c.buys19L && <span className="badge-brand">19L</span>}
                            {c.buys05LPet && <span className="badge-success">0.5L PET</span>}
                            {c.buys15LPet && <span className="badge-neutral">1.5L PET</span>}
                            {!c.buys19L && !c.buys05LPet && !c.buys15LPet && <span className="text-slate-400 text-xs">—</span>}
                          </>
                        ) : (
                          <>
                            {c.buysPure05L && <span className="badge-brand">0.5L Pure</span>}
                            {c.buysPure15L && <span className="badge-brand">1.5L Pure</span>}
                            {c.buysMix05L && <span className="badge-neutral">0.5L Mix</span>}
                            {c.buysMix15L && <span className="badge-neutral">1.5L Mix</span>}
                            {!c.buysPure05L && !c.buysPure15L && !c.buysMix05L && !c.buysMix15L && <span className="text-slate-400 text-xs">—</span>}
                          </>
                        )}
                      </div>
                    </td>
                    <td className="table-td">
                      <div className="flex flex-col gap-0.5 tabular-nums">
                        <span className={`font-semibold ${parseFloat(c.currentBalance || 0) > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          Debt: Rs. {parseFloat(c.currentBalance || 0).toLocaleString()}
                        </span>
                      </div>
                    </td>
                    {!isWadaana && (
                      <td className="table-td">
                        <div className="flex items-center gap-1.5 tabular-nums">
                          <Package size={14} className="text-amber-500" />
                          <strong className="text-slate-800 font-semibold">{c.cachedBottleBalance}</strong>
                          <span className="text-xs text-slate-400 font-normal">empty</span>
                        </div>
                      </td>
                    )}
                    <td className="table-td text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {c.phone && (
                          <button
                            type="button"
                            onClick={(e) => handleShareWhatsAppCustomer(e, c)}
                            className="p-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 transition"
                            title="Share Customer Profile via WhatsApp"
                          >
                            <MessageCircle size={13} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleDispatchToDriver(e, c)}
                          className="p-1.5 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 transition"
                          title="Dispatch Customer Details to Driver via WhatsApp"
                        >
                          <Share2 size={13} />
                        </button>
                        {c.archivedAt ? (
                          <button 
                            onClick={() => onRowClick && onRowClick(c, 'restore')}
                            className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition"
                          >
                            Restore
                          </button>
                        ) : (
                          <button 
                            onClick={() => onRowClick && onRowClick(c, 'view')}
                            className="btn-secondary py-1 px-2.5 text-xs"
                          >
                            View Details
                          </button>
                        )}
                        {isOwner && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteCustomer && onDeleteCustomer(c);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Delete Customer (Owner Only)"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
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
  );
}
