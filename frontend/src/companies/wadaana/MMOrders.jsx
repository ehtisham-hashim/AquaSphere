import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Plus, X, ClipboardList, Phone, MapPin, Package, AlertCircle } from 'lucide-react';
import NewOrderModal from '../../components/orders/NewOrderModal';
import ProcessDeliveryModal from '../../components/orders/ProcessDeliveryModal';
import AddCustomerInlineModal from '../../components/orders/AddCustomerInlineModal';
import OrdersTable from '../../components/orders/OrdersTable';
import CustomerProfileCard from '../../components/orders/CustomerProfileCard';

const API = import.meta.env.VITE_API_URL;

export default function MMOrders() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [allOrders, setAllOrders] = useState([]);
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending-today');
  const [isSearching, setIsSearching] = useState(false);

  const [showNewOrder, setShowNewOrder] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showDelivery, setShowDelivery] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const [ordRes, itmRes] = await Promise.all([
        fetch(`${API}/orders`, { credentials: 'include' }),
        fetch(`${API}/items?type=FINISHED_GOOD`, { credentials: 'include' })
      ]);
      const [ord, itm] = await Promise.all([ordRes.json(), itmRes.json()]);
      if (ord.success) setAllOrders(ord.data);
      if (itm.success) setItems(itm.data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    const handler = (e) => {
      if (e.altKey && e.key.toLowerCase() === 'n' && selectedCustomer) {
        e.preventDefault();
        setShowNewOrder(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedCustomer]);

  const handleSearch = (val) => {
    setSearchQuery(val);
    if (!val.trim()) { setSearchResults([]); setShowResults(false); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`${API}/customers?search=${encodeURIComponent(val)}`, { credentials: 'include' });
        const json = await res.json();
        if (json.success) { setSearchResults(json.data.slice(0, 6)); setShowResults(true); }
      } finally { setIsSearching(false); }
    }, 300);
  };

  const selectCustomer = (c) => {
    setSelectedCustomer(c);
    setSearchQuery(c.name);
    setShowResults(false);
    setActiveTab('customer-orders');
  };

  const clearCustomer = () => {
    setSelectedCustomer(null);
    setSearchQuery('');
    setSearchResults([]);
    setActiveTab('pending-today');
  };

  const today = new Date().toDateString();
  const todayOrders = allOrders.filter(o => new Date(o.createdAt).toDateString() === today);
  const todayPending = todayOrders.filter(o => o.deliveryStatus === 'PENDING');
  const todayDone = todayOrders.filter(o => o.deliveryStatus === 'DELIVERED');
  const allPending = allOrders.filter(o => o.deliveryStatus === 'PENDING');

  const getTabOrders = () => {
    if (activeTab === 'customer-orders' && selectedCustomer)
      return allOrders.filter(o => o.customer?.id === selectedCustomer.id);
    if (activeTab === 'pending-today') return todayPending;
    if (activeTab === 'all-pending') return allPending;
    if (activeTab === 'completed') return todayDone;
    return allOrders;
  };

  const tabs = [
    { id: 'pending-today', label: `Today's Pending (${todayPending.length})` },
    { id: 'all-pending', label: `All Pending (${allPending.length})` },
    { id: 'completed', label: `Done Today (${todayDone.length})` },
    { id: 'all', label: 'All Orders' },
  ];
  if (selectedCustomer) tabs.unshift({ id: 'customer-orders', label: `${selectedCustomer.name.split(' ')[0]}'s Orders` });

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Today's Orders", value: todayOrders.length, color: 'text-blue-600' },
          { label: 'Pending', value: todayPending.length, color: 'text-amber-600' },
          { label: 'Delivered Today', value: todayDone.length, color: 'text-emerald-600' },
          { label: 'All Pending', value: allPending.length, color: 'text-slate-600' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
            <div className="text-xs text-slate-500 font-medium">{s.label}</div>
            <div className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* LEFT PANEL */}
        <div className="w-full lg:w-80 flex-shrink-0 space-y-3">
          {/* Search Box */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Search size={14}/> Customer Search
            </h3>
            <div className="relative" ref={searchRef}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
              <input
                type="text"
                placeholder="Phone, name or ID..."
                className="w-full border border-slate-200 rounded-lg py-2.5 pl-9 pr-8 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowResults(true)}
              />
              {(searchQuery || selectedCustomer) && (
                <button onClick={clearCustomer} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={15}/>
                </button>
              )}
              {/* Dropdown */}
              {showResults && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
                  {isSearching ? (
                    <div className="p-3 text-center text-slate-500 text-sm">Searching...</div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-3 text-center text-slate-500 text-sm">No customers found</div>
                  ) : searchResults.map(c => (
                    <button key={c.id} onClick={() => selectCustomer(c)}
                      className="w-full text-left px-4 py-3 hover:bg-emerald-50 transition-colors border-b border-slate-100 last:border-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-800 text-sm">{c.name}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <Phone size={11}/>{c.phone}
                          </div>
                        </div>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">{c.type}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {!selectedCustomer && (
              <button onClick={() => setShowAddCustomer(true)}
                className="mt-3 w-full flex items-center justify-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 border border-dashed border-emerald-300 rounded-lg py-2 hover:bg-emerald-50 transition-colors font-medium">
                <Plus size={15}/> Add New Customer
              </button>
            )}
          </div>

          {/* Customer Profile Card */}
          {selectedCustomer && (
            <CustomerProfileCard
              customer={selectedCustomer}
              onNewOrder={() => setShowNewOrder(true)}
              onClear={clearCustomer}
            />
          )}

          {!selectedCustomer && (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-400">
              <ClipboardList size={32} className="mx-auto mb-2 opacity-40"/>
              <p className="text-sm font-medium">Search for a customer to view their profile and place orders</p>
              <p className="text-xs mt-1 opacity-70">Alt+N to open new order once customer is selected</p>
            </div>
          )}
        </div>

        {/* RIGHT PANEL */}
        <div className="flex-1 min-w-0">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            {/* Tabs + New Order button */}
            <div className="border-b border-slate-200 px-4 pt-3 flex items-center justify-between flex-wrap gap-2">
              <div className="flex gap-1 flex-wrap">
                {tabs.map(t => (
                  <button key={t.id} onClick={() => setActiveTab(t.id)}
                    className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors ${activeTab === t.id ? 'bg-white border border-b-white border-slate-200 text-emerald-600 -mb-px' : 'text-slate-500 hover:text-slate-700'}`}>
                    {t.label}
                  </button>
                ))}
              </div>
              <button onClick={() => { if (selectedCustomer) setShowNewOrder(true); else alert('Select a customer first'); }}
                className="mb-2 flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm">
                <Plus size={14}/> New Order <span className="opacity-60 ml-1">Alt+N</span>
              </button>
            </div>
            <OrdersTable
              orders={getTabOrders()}
              isLoading={isLoading}
              onProcess={(o) => { setSelectedOrder(o); setShowDelivery(true); }}
              onRefresh={fetchOrders}
              showCustomerName={activeTab !== 'customer-orders'}
            />
          </div>
        </div>
      </div>

      {showNewOrder && selectedCustomer && (
        <NewOrderModal customer={selectedCustomer} items={items}
          onClose={() => setShowNewOrder(false)}
          onOrderPlaced={() => { setShowNewOrder(false); fetchOrders(); }} />
      )}
      {showDelivery && selectedOrder && (
        <ProcessDeliveryModal order={selectedOrder}
          onClose={() => { setShowDelivery(false); setSelectedOrder(null); }}
          onDeliveryProcessed={() => { setShowDelivery(false); setSelectedOrder(null); fetchOrders(); }} />
      )}
      {showAddCustomer && (
        <AddCustomerInlineModal
          onClose={() => setShowAddCustomer(false)}
          onCustomerAdded={(c) => { setShowAddCustomer(false); selectCustomer(c); }} />
      )}
    </div>
  );
}
