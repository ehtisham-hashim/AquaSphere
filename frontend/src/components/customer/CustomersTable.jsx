import { useState } from 'react';
import { MapPin, Phone, Package, MessageCircle, Share2, Trash2, DollarSign, Eye } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { usePagination } from '../../hooks/usePagination';
import TablePagination from '../common/TablePagination';
import { TableActionMenu } from '../ui';
import { toast } from 'sonner';
import { shareOrSendCustomerReceiptWhatsApp } from '../../utils/receiptFormatter';
import SettleCustomerDebtModal from './SettleCustomerDebtModal';

export default function CustomersTable({ customers = [], isLoading = false, onRowClick, onDeleteCustomer, onCustomerUpdated, resetTrigger }) {
  const { user } = useAuth();
  const userRole = (user?.role || '').toUpperCase();
  const isOwner = userRole === 'OWNER';
  const canSettleDebt = ['OWNER', 'ADMIN', 'ACCOUNTANT', 'MARKETING_MANAGER'].includes(userRole);
  const { tenant } = useTenant();
  const isWadaana = tenant === 'wadaana';
  const [settleDebtCustomer, setSettleDebtCustomer] = useState(null);

  const pagination = usePagination(customers, 50, resetTrigger);

  const handleShareWhatsAppCustomer = async (e, c) => {
    e.stopPropagation();
    try {
      const res = await shareOrSendCustomerReceiptWhatsApp({ customer: c, isWadaana });
      if (res?.method === 'web-share') {
        toast.success('Customer receipt slip shared via WhatsApp!');
      } else {
        toast.success('Customer receipt copied! Press Ctrl+V in WhatsApp to send.', { duration: 6000 });
      }
    } catch (err) {
      console.error('WhatsApp customer receipt error:', err);
      toast.error('Could not send receipt to WhatsApp.');
    }
  };

  const handleDispatchToDriver = async (e, c) => {
    e.stopPropagation();
    try {
      const res = await shareOrSendCustomerReceiptWhatsApp({
        customer: c,
        isWadaana,
        options: { subtitle: 'DRIVER DISPATCH & CUSTOMER ACCOUNT SLIP' }
      });
      if (res?.method === 'web-share') {
        toast.success('Driver slip shared via WhatsApp!');
      } else {
        toast.success('Driver slip copied! Press Ctrl+V in WhatsApp to send.', { duration: 6000 });
      }
    } catch (err) {
      console.error('WhatsApp driver dispatch error:', err);
      toast.error('Could not dispatch slip to driver.');
    }
  };

  return (
    <div className="table-container">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr>
              <th className="table-th">Customer</th>
              <th className="table-th">Contact & Address</th>
              <th className="table-th">Products</th>
              <th className="table-th">Balance & Custody</th>
              <th className="table-th text-right sticky right-0 bg-slate-50/95 z-10 shadow-[-6px_0_8px_-4px_rgba(0,0,0,0.04)]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {isLoading ? (
              <tr>
                <td colSpan="5" className="p-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="w-7 h-7 border-3 border-[var(--brand)] border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-xs">Loading customers...</p>
                  </div>
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-12 text-center text-slate-500 text-xs">
                  No customers found.
                </td>
              </tr>
            ) : (
              pagination.paginatedItems.map((c) => {
                const lastActivity = c.lastOrderDate || c.lastDeliveryAt || c.createdAt;
                const daysInactive = lastActivity 
                  ? Math.floor((new Date() - new Date(lastActivity)) / (1000 * 60 * 60 * 24))
                  : null;

                const hasDebt = parseFloat(c.currentBalance || 0) > 0;

                const menuItems = [
                  {
                    label: 'View Profile & History',
                    icon: Eye,
                    onClick: () => onRowClick && onRowClick(c, 'view'),
                  },
                  c.phone ? {
                    label: 'Send WhatsApp Slip',
                    icon: MessageCircle,
                    onClick: (e) => handleShareWhatsAppCustomer(e, c),
                  } : null,
                  {
                    label: 'Dispatch Slip to Driver',
                    icon: Share2,
                    onClick: (e) => handleDispatchToDriver(e, c),
                  },
                  isOwner ? { divider: true } : null,
                  isOwner ? {
                    label: 'Delete Customer',
                    icon: Trash2,
                    variant: 'danger',
                    onClick: () => onDeleteCustomer && onDeleteCustomer(c),
                  } : null,
                ];

                return (
                  <tr 
                    key={c.id} 
                    onClick={() => onRowClick && onRowClick(c)}
                    className="hover:bg-slate-50/90 transition-colors cursor-pointer group"
                  >
                    {/* 1. Customer */}
                    <td className="table-td">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-full bg-[var(--brand-light)] text-[var(--brand)] flex items-center justify-center font-bold text-xs shrink-0">
                          {c.name ? c.name.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                            <span className="truncate max-w-[180px] sm:max-w-xs">{c.name}</span>
                            {c.customerCode && (
                              <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono font-bold border border-slate-200 shrink-0">
                                {c.customerCode}
                              </span>
                            )}
                            {c.archivedAt && (
                              <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold uppercase shrink-0">
                                Archived
                              </span>
                            )}
                            {daysInactive !== null && daysInactive >= 7 && (
                              <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold shrink-0">
                                Inactive ({daysInactive}d)
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                            <span>{c.type || 'Standard'}</span>
                            {c.marketerRef && (
                              <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.2 rounded font-semibold shrink-0">
                                {c.marketerRef}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 2. Contact & Address */}
                    <td className="table-td">
                      <div className="flex items-center gap-1.5 text-slate-700 font-medium mb-0.5 whitespace-nowrap">
                        <Phone size={13} className="text-slate-400 shrink-0" />
                        <span>{c.phone?.includes('_archived_') ? c.phone.split('_archived_')[0] : (c.phone || '—')}</span>
                      </div>
                      {c.address && (
                        <div className="flex items-center gap-1 text-slate-500 text-[11px] truncate max-w-[180px] sm:max-w-[220px]" title={c.address}>
                          <MapPin size={12} className="text-slate-400 shrink-0" />
                          <span className="truncate">{c.address}</span>
                        </div>
                      )}
                    </td>

                    {/* 3. Products */}
                    <td className="table-td">
                      <div className="flex flex-wrap items-center gap-1 max-w-[180px]">
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
                            {c.buysPureFine05L && <span className="badge-success">0.5L Fine</span>}
                            {c.buysPureFine15L && <span className="badge-success">1.5L Fine</span>}
                            {!c.buysPure05L && !c.buysPure15L && !c.buysMix05L && !c.buysMix15L && !c.buysPureFine05L && !c.buysPureFine15L && <span className="text-slate-400 text-xs">—</span>}
                          </>
                        )}
                      </div>
                    </td>

                    {/* 4. Balance & Custody */}
                    <td className="table-td">
                      <div className="flex flex-col gap-1 tabular-nums">
                        {!hasDebt ? (
                          <span className="inline-flex items-center text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md w-fit">
                            Cleared (Rs. 0)
                          </span>
                        ) : (
                          <span className="font-semibold text-amber-700 text-xs">
                            Debt: Rs. {parseFloat(c.currentBalance || 0).toLocaleString()}
                          </span>
                        )}
                        {!isWadaana && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500">
                            <Package size={12} className="text-amber-500 shrink-0" />
                            <strong className="text-slate-700 font-semibold">{c.cachedBottleBalance || 0}</strong>
                            <span className="text-[10px] text-slate-400">empty</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* 5. Actions (Sticky Right) */}
                    <td 
                      className="table-td text-right sticky right-0 bg-white group-hover:bg-slate-50/90 z-10 shadow-[-6px_0_8px_-4px_rgba(0,0,0,0.04)] transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                        {c.archivedAt ? (
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRowClick && onRowClick(c, 'restore');
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition"
                          >
                            Restore
                          </button>
                        ) : canSettleDebt && hasDebt ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSettleDebtCustomer(c);
                            }}
                            className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition font-bold flex items-center gap-1 text-xs"
                            title="Settle Outstanding Debt with FIFO Allocation"
                          >
                            <DollarSign size={12} />
                            <span>Pay Debt</span>
                          </button>
                        ) : null}

                        <TableActionMenu items={menuItems} />
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

      {settleDebtCustomer && (
        <SettleCustomerDebtModal
          customer={settleDebtCustomer}
          onClose={() => setSettleDebtCustomer(null)}
          onSuccess={() => {
            setSettleDebtCustomer(null);
            if (onCustomerUpdated) onCustomerUpdated();
          }}
        />
      )}
    </div>
  );
}
