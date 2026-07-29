import { useState, useEffect } from 'react';
import { Plus, Search, Clock, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../utils/api';
import { toast } from 'sonner';

import AddOrderModal from '../components/orders/AddOrderModal';
import EditOrderModal from '../components/orders/EditOrderModal';
import ProcessDeliveryModal from '../components/orders/ProcessDeliveryModal';
import AddCustomerModal from '../components/customer/AddCustomerModal';

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
  const [selectedOrder, setSelectedOrder] = useState(null);

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
    if (itm.success) setItems(itm.data.filter(i => i.type === 'FINISHED_GOOD'));
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

  const openDeliverModal = (order) => {
    setSelectedOrder(order);
    setIsDeliverModalOpen(true);
  };

  const openEditModal = (order) => {
    setSelectedOrder(order);
    setIsEditModalOpen(true);
  };

  const handleDeleteOrder = async (id) => {
    if (!window.confirm('Are you sure you want to delete this order? This cannot be undone.')) return;
    try {
      const res = await fetch(`${API_URL}/orders/${id}`, { 
        method: 'DELETE', 
        headers: { 'x-tenant': localStorage.getItem('tenant') || 'aquasphere' },
        credentials: 'include' 
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Order deleted successfully');
        fetchData();
      } else {
        toast.error(json.message || 'Failed to delete order');
      }
    } catch (err) {
      toast.error('Error deleting order');
    }
  };

  const isOwner = user?.role === 'OWNER';
  const canAddCustomer = user?.role === 'OWNER' || user?.role === 'MARKETING_MANAGER';
  const canDeleteOrder = ['OWNER', 'MARKETING_MANAGER'].includes(user?.role);

  // Filter Orders
  const filteredOrders = orders.filter(o => {
    // Tab filtering
    if (activeTab === 'Pending Orders' && o.deliveryStatus !== 'PENDING') return false;
    if (activeTab === 'Completed Orders' && o.deliveryStatus !== 'DELIVERED') return false;
    if (activeTab === 'Cancelled Orders' && o.deliveryStatus !== 'CANCELLED') return false;
    // 'All Orders' skips this check
    
    // Client type filtering
    if (clientFilter !== 'All Clients' && o.customer?.type !== clientFilter) return false;
    // Search query
    if (searchQuery && !o.customer?.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const tabs = ['All Orders', 'Pending Orders', 'Completed Orders', 'Cancelled Orders'];
  const clientTypes = ['All Clients', ...new Set(customers.map(c => c.type))];

  const formatItemName = (name) => {
    if (!name) return '';
    if (name.toLowerCase().includes('500ml')) return '0.5L Bottles';
    if (name.toLowerCase().includes('19l')) return '19L Refill';
    return name;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      
      {/* Top Navigation Tabs Area */}
      <div className="surface-card p-4 mb-6 flex flex-wrap gap-2 items-center">
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="btn-secondary mr-2 flex items-center gap-2 group"
        >
          <Plus size={18} /> New Order <span className="text-[10px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded ml-1 group-hover:bg-slate-300">Alt+N</span>
        </button>
        
        {canAddCustomer && (
          <button 
            onClick={() => setIsAddCustomerModalOpen(true)}
            className="btn-secondary mr-4 flex items-center gap-2 group"
          >
            <UserPlus size={18} /> New Customer
          </button>
        )}
        
        {tabs.map(tab => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${activeTab === tab ? 'bg-white shadow-sm text-slate-800 border border-slate-200' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
        <h2 className="text-xl font-bold text-slate-800">{activeTab}</h2>
        
        <div className="flex gap-3 w-full md:w-auto">
          <select 
            className="input-field"
            value={clientFilter}
            onChange={e => setClientFilter(e.target.value)}
          >
            {clientTypes.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
          
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="search" 
              placeholder="Search customer..." 
              className="input-field pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 font-semibold text-slate-600 text-sm">Order ID</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Customer</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Order Details</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Target Date</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Status</th>
                <th className="p-4 font-semibold text-slate-600 text-sm text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="p-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 border-4 border-[#0ea5e9] border-t-transparent rounded-full animate-spin"></div>
                      <p>Loading orders...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-12 text-center text-slate-500">
                    No orders found.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(o => (
                <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 text-sm font-medium text-slate-500">
                    #{o.id.substring(0,6).toUpperCase()}
                  </td>
                  <td className="p-4">
                    <div className="font-bold text-slate-800">{o.customer?.name}</div>
                    <div className="flex gap-2 items-center text-xs mt-1">
                      <span className="text-slate-500">{o.customer?.phone}</span>
            
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-slate-100 text-slate-700 font-bold px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm flex items-center gap-1">
                        {o.items[0]?.quantity} <span className="text-xs font-medium text-slate-500">Qty</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800 text-sm">{formatItemName(o.items[0]?.item?.name)}</span>
                        {o.remarks && <span className="text-xs text-slate-500 truncate max-w-[150px]">{o.remarks}</span>}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-slate-700">
                    {o.expectedDelivery ? (
                      <div className="flex items-center gap-1 text-slate-600"><Clock size={14}/> {new Date(o.expectedDelivery).toLocaleDateString()}</div>
                    ) : <span className="text-slate-400 text-xs">Not set</span>}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1.5 items-start">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        o.deliveryStatus === 'DELIVERED' ? 'bg-green-100 text-green-700' : 
                        o.deliveryStatus === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {o.deliveryStatus}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        o.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 
                        o.paymentStatus === 'PARTIAL' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                      }`}>
                         {o.paymentStatus}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      {(isOwner || o.deliveryStatus !== 'DELIVERED') && (
                        <button onClick={() => openEditModal(o)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 text-xs rounded-md font-medium transition-colors">
                           Edit
                        </button>
                      )}
                      {o.deliveryStatus !== 'DELIVERED' && o.deliveryStatus !== 'CANCELLED' && (
                        <button onClick={() => openDeliverModal(o)} className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 text-xs rounded-md font-medium transition-colors shadow-sm">
                          Process
                        </button>
                      )}
                      {canDeleteOrder && o.deliveryStatus !== 'DELIVERED' && (
                        <button onClick={() => handleDeleteOrder(o.id)} className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 text-xs rounded-md font-medium transition-colors border border-red-100 shadow-sm">
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>

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
    </div>
  );
}
