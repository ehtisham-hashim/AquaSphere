import { useState, useEffect } from 'react';
import { Plus, Clock, UserPlus, Printer } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../utils/api';
import { getCompanyFromCookie } from '../utils/companyCookie';
import { getOrderCleanName as formatItemName } from '../constants/orders';
import { toast } from 'sonner';
import { TableSkeleton } from '../components/common/Skeleton';

import AddOrderModal from '../components/orders/AddOrderModal';
import EditOrderModal from '../components/orders/EditOrderModal';
import ProcessDeliveryModal from '../components/orders/ProcessDeliveryModal';
import AddCustomerModal from '../components/customer/AddCustomerModal';
import OrderInvoiceModal from '../components/orders/OrderInvoiceModal';
import RecordPaymentModal from '../components/orders/RecordPaymentModal';
import OrderSearch from '../components/orders/OrderSearch';

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);

  // UI State
  const [activeTab, setActiveTab] = useState('All Orders');
  const [searchQuery, setSearchQuery] = useState('');
  const [clientFilter, setClientFilter] = useState('All Clients');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [isDeliverModalOpen, setIsDeliverModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedPaymentOrder, setSelectedPaymentOrder] = useState(null);
  const [invoiceOrder, setInvoiceOrder] = useState(null);

  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    const [ordRes, custRes, itmRes] = await Promise.all([
      fetch(`${API_URL}/orders`, { credentials: 'include' }),
      fetch(`${API_URL}/customers`, { credentials: 'include' }),
      fetch(`${API_URL}/items`, { credentials: 'include' })
    ]);
    const [ord, cust, itm] = await Promise.all([ordRes.json(), custRes.json(), itmRes.json()]);
    if (ord.success) setOrders(ord.data);
    if (cust.success) setCustomers(cust.data);
    if (itm.success) setItems(itm.data || []);
    setIsLoading(false);
  };

  useEffect(() => { 
    fetchData(); 
    
    const handleKeyDown = (e) => {
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setIsAddModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const [orderToCancel, setOrderToCancel] = useState(null);

  const openDeliverModal = (order) => {
    setSelectedOrder(order);
    setIsDeliverModalOpen(true);
  };

  const openEditModal = (order) => {
    setSelectedOrder(order);
    setIsEditModalOpen(true);
  };

  const confirmCancelOrder = async (id) => {
    try {
      const tenant = getCompanyFromCookie();
      const res = await fetch(`${API_URL}/orders/${id}`, { 
        method: 'DELETE', 
        headers: { 'x-tenant': tenant },
        credentials: 'include' 
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Order cancelled successfully');
        fetchData();
      } else {
        toast.error(json.message || 'Failed to cancel order');
      }
    } catch (err) {
      toast.error('Error cancelling order');
    } finally {
      setOrderToCancel(null);
    }
  };

  const isOwner = user?.role === 'OWNER';
  const isAdmin = user?.role === 'ADMIN';
  const isMarketingManager = user?.role === 'MARKETING_MANAGER';
  const canAddCustomer = user?.role === 'OWNER' || user?.role === 'MARKETING_MANAGER';
  const canCreateOrder = user?.role === 'OWNER' || user?.role === 'MARKETING_MANAGER';
  const canDeleteOrder = ['OWNER', 'MARKETING_MANAGER'].includes(user?.role);

  // Unpaid/Partial order count for quick alerts
  const unpaidOrdersCount = orders.filter(o => o.paymentStatus !== 'PAID' && o.deliveryStatus !== 'CANCELLED').length;

  // Filter Orders
  const filteredOrders = orders.filter(o => {
    // Tab filtering
    if (activeTab === 'Pending Orders' && o.deliveryStatus !== 'PENDING') return false;
    if (activeTab === 'Unpaid Orders' && o.paymentStatus === 'PAID') return false;
    if (activeTab === 'Completed Orders' && (o.deliveryStatus !== 'DELIVERED' || o.paymentStatus !== 'PAID')) return false;
    if (activeTab === 'Cancelled Orders' && o.deliveryStatus !== 'CANCELLED') return false;
    
    // Client type filtering
    if (clientFilter !== 'All Clients' && o.customer?.type !== clientFilter) return false;
    
    // Search query: Order ID, Customer Name, Phone Number
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      const orderIdStr = o.id.toLowerCase();
      const orderIdShort = `#${o.id.substring(0, 6).toLowerCase()}`;
      const custName = (o.customer?.name || '').toLowerCase();
      const custPhone = (o.customer?.phone || '').toLowerCase();
      
      const matchesSearch = orderIdStr.includes(q) || orderIdShort.includes(q) || custName.includes(q) || custPhone.includes(q);
      if (!matchesSearch) return false;
    }

    return true;
  });

  const tabs = ['All Orders', 'Pending Orders', 'Unpaid Orders', 'Completed Orders', 'Cancelled Orders'];
  const clientTypes = ['All Clients', ...new Set(customers.map(c => c.type))];



  return (
    <div className="space-y-4 pb-6">
      
      {/* Top Navigation Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
          {tabs.map(tab => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-xl font-semibold text-xs whitespace-nowrap transition-all ${
                activeTab === tab 
                  ? 'bg-brand text-white shadow-2xs font-bold' 
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {canAddCustomer && (
            <button 
              onClick={() => setIsAddCustomerModalOpen(true)}
              className="btn-secondary text-xs py-2"
            >
              <UserPlus size={15} /> <span className="hidden sm:inline">New Customer</span>
            </button>
          )}
          {canCreateOrder && (
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="btn-primary text-xs py-2"
            >
              <Plus size={15} /> New Order <span className="text-[10px] opacity-75 hidden md:inline">(Alt+N)</span>
            </button>
          )}
        </div>
      </div>

      {/* Top Banner Alert for Unpaid Orders */}
      {unpaidOrdersCount > 0 && activeTab !== 'Unpaid Orders' && (
        <div className="bg-amber-50 border border-amber-200/80 p-3 rounded-xl flex justify-between items-center text-xs">
          <div className="flex items-center gap-2 text-amber-900 font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            <span>You have <strong>{unpaidOrdersCount}</strong> unpaid or partial order{unpaidOrdersCount > 1 ? 's' : ''} awaiting payment settlement.</span>
          </div>
          <button 
            onClick={() => setActiveTab('Unpaid Orders')} 
            className="font-bold text-amber-700 hover:text-amber-900 bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200 transition-all text-xs"
          >
            View Unpaid &rarr;
          </button>
        </div>
      )}

      {/* Search & Filter Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex-1">
          <OrderSearch searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
        </div>
        <div className="shrink-0">
          <select 
            className="select-base text-xs py-2.5 px-3"
            value={clientFilter}
            onChange={e => setClientFilter(e.target.value)}
          >
            {clientTypes.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
      </div>

      {isLoading && orders.length === 0 ? (
        <TableSkeleton rows={6} cols={6} />
      ) : (
        <div className="table-container">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr>
                <th className="table-th">Order ID</th>
                <th className="table-th">Customer</th>
                <th className="table-th">Order Details</th>
                <th className="table-th">Target Date</th>
                <th className="table-th">Status</th>
                <th className="table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-12 text-center text-slate-500">
                      No orders found.
                    </td>
                  </tr>
                ) : (
                filteredOrders.map(o => {
                  const isFullyGreenlit = o.deliveryStatus === 'DELIVERED' && o.paymentStatus === 'PAID';
                  const needsPaymentSettlement = o.deliveryStatus === 'DELIVERED' && o.paymentStatus !== 'PAID';
                  const canProcess = !isAdmin && o.deliveryStatus !== 'CANCELLED' && (
                    !isMarketingManager 
                      ? !isFullyGreenlit 
                      : o.deliveryStatus !== 'DELIVERED'
                  );

                  return (
                    <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="table-td font-mono font-semibold text-slate-500">
                        #{o.id.substring(0,6).toUpperCase()}
                      </td>
                      <td className="table-td">
                        <div className="font-bold text-slate-800">{o.customer?.name}</div>
                        <div className="flex gap-2 items-center text-xs mt-0.5">
                          <span className="text-slate-400 font-mono">{o.customer?.phone}</span>
                        </div>
                      </td>
                      <td className="table-td">
                        <div className="flex items-center gap-2.5">
                          <div className="bg-slate-100 text-slate-700 font-bold px-2 py-1 rounded-lg border border-slate-200 flex items-center gap-1 text-xs">
                            {o.items?.reduce((sum, i) => sum + (i.quantity || 0), 0) || 0} <span className="text-[10px] font-medium text-slate-400">Qty</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-800 text-xs">{formatItemName(o.items[0]?.item?.name)}</span>
                            {o.items?.length > 1 && (
                              <span className="text-[10px] font-bold text-brand bg-brand-light px-1.5 py-0.5 rounded w-max">
                                +{o.items.length - 1} more item{o.items.length > 2 ? 's' : ''}
                              </span>
                            )}
                            {o.remarks && <span className="text-[11px] text-slate-400 truncate max-w-[150px]">{o.remarks}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="table-td text-xs text-slate-600">
                        {o.expectedDelivery ? (
                          <div className="flex items-center gap-1 font-mono text-slate-600"><Clock size={13}/> {new Date(o.expectedDelivery).toLocaleDateString()}</div>
                        ) : <span className="text-slate-400 text-xs">Not set</span>}
                      </td>
                      <td className="table-td">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            o.deliveryStatus === 'DELIVERED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 
                            o.deliveryStatus === 'CANCELLED' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {o.deliveryStatus}
                          </span>
                          {o.deliveryStatus !== 'CANCELLED' && (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              o.paymentStatus === 'PAID' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 
                              o.paymentStatus === 'PARTIAL' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {o.paymentStatus}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="table-td text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => setInvoiceOrder(o)}
                            className="btn-secondary py-1 px-2.5 text-xs"
                            title="Print Invoice"
                          >
                            <Printer size={13} /> Invoice
                          </button>

                          {(isOwner || isMarketingManager) && o.deliveryStatus !== 'DELIVERED' && o.deliveryStatus !== 'CANCELLED' && (
                            <button onClick={() => openEditModal(o)} className="btn-secondary py-1 px-2.5 text-xs">
                              Edit
                            </button>
                          )}
                          {canProcess && (
                            <button 
                              onClick={() => openDeliverModal(o)} 
                              className={`py-1 px-3 text-xs rounded-xl font-bold transition-all ${
                                needsPaymentSettlement 
                                  ? 'bg-amber-500 hover:bg-amber-600 text-white' 
                                  : 'btn-primary'
                              }`}
                            >
                              {needsPaymentSettlement ? 'Settle Payment' : 'Process'}
                            </button>
                          )}
                          {canDeleteOrder && !isAdmin && o.deliveryStatus !== 'DELIVERED' && o.deliveryStatus !== 'CANCELLED' && (
                            <button onClick={() => setOrderToCancel(o)} className="btn-danger py-1 px-2 text-xs">
                              Cancel
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
      )}

      {/* Add Order Modal Component */}
      {isAddModalOpen && (
        <AddOrderModal 
          onClose={() => setIsAddModalOpen(false)} 
          onOrderAdded={() => { setIsAddModalOpen(false); fetchData(); }} 
          customers={customers} 
          items={items} 
        />
      )}

      {/* Add Customer Modal Component */}
      {isAddCustomerModalOpen && (
        <AddCustomerModal 
          isOpen={isAddCustomerModalOpen}
          onClose={() => setIsAddCustomerModalOpen(false)} 
          onCustomerAdded={() => { setIsAddCustomerModalOpen(false); fetchData(); }} 
        />
      )}

      {/* Process Delivery Modal Component */}
      {isDeliverModalOpen && selectedOrder && (
        <ProcessDeliveryModal 
          order={selectedOrder}
          onClose={() => { setIsDeliverModalOpen(false); setSelectedOrder(null); }}
          onDeliveryProcessed={() => { setIsDeliverModalOpen(false); setSelectedOrder(null); fetchData(); }}
        />
      )}

      {/* Edit Order Modal Component */}
      {isEditModalOpen && selectedOrder && (
        <EditOrderModal 
          order={selectedOrder}
          onClose={() => { setIsEditModalOpen(false); setSelectedOrder(null); }}
          onOrderEdited={() => { setIsEditModalOpen(false); setSelectedOrder(null); fetchData(); }}
          customers={customers}
          items={items}
        />
      )}

      {/* Record Payment Modal Component */}
      {isRecordPaymentOpen && selectedPaymentOrder && (
        <RecordPaymentModal
          order={selectedPaymentOrder}
          onClose={() => { setIsRecordPaymentOpen(false); setSelectedPaymentOrder(null); }}
          onSuccess={() => { fetchData(); }}
        />
      )}

      {/* Order Invoice Modal Component */}
      {invoiceOrder && (
        <OrderInvoiceModal
          order={invoiceOrder}
          onClose={() => setInvoiceOrder(null)}
        />
      )}

      {/* Cancel Order Confirmation Pop-Up Modal */}
      {orderToCancel && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-100">
                <Printer className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Cancel Order #{orderToCancel.id?.substring(0, 8).toUpperCase()}?</h3>
                <p className="text-xs text-slate-500 font-medium">{orderToCancel.customer?.name || 'Customer'}</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
              Are you sure you want to cancel this order? It will be moved to <strong className="text-rose-700">Cancelled Orders</strong>.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setOrderToCancel(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                Keep Order
              </button>
              <button
                onClick={() => confirmCancelOrder(orderToCancel.id)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition shadow-2xs"
              >
                Yes, Cancel Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
