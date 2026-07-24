import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, X, Plus, ChevronDown, Phone, Package, Truck,
  ClipboardList, User, Clock, CheckCircle, RefreshCw,
  MapPin, DollarSign, Droplets,
} from 'lucide-react';
import NewOrderModal from '../components/orders/NewOrderModal';
import ProcessDeliveryModal from '../components/orders/ProcessDeliveryModal';
import EditOrderModal from '../components/orders/EditOrderModal';

const API = import.meta.env.VITE_API_URL;

// ─── Helpers ─────────────────────────────────────────────────────────────────
const isToday = (dateStr) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const t = new Date();
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '—';

const statusColor = (s) => ({
  DELIVERED: 'bg-emerald-100 text-emerald-700',
  PENDING:   'bg-orange-100 text-orange-700',
  DISPATCHED:'bg-blue-100 text-blue-700',
  CANCELLED: 'bg-red-100 text-red-700',
}[s] || 'bg-slate-100 text-slate-600');

const payColor = (s) => ({
  PAID:    'bg-emerald-100 text-emerald-700',
  UNPAID:  'bg-red-100 text-red-700',
  PARTIAL: 'bg-amber-100 text-amber-700',
}[s] || 'bg-slate-100 text-slate-600');

const orderTypeBadge = (t) => t === 'NINETEEN_L'
  ? 'bg-blue-100 text-blue-700'
  : 'bg-green-100 text-green-700';

const orderTypeLabel = (t) => t === 'NINETEEN_L' ? '19L' : 'PET';

const itemName = (name = '') => {
  if (name.toLowerCase().includes('500')) return '0.5L Packs';
  if (name.toLowerCase().includes('19l') || name.toLowerCase().includes('19 l')) return '19L Refill';
  if (name.toLowerCase().includes('1.5') || name.toLowerCase().includes('1500')) return '1.5L Packs';
  return name;
};

// ─── Stats Bar ────────────────────────────────────────────────────────────────
function StatsBar({ orders }) {
  const todayOrders = orders.filter(o => isToday(o.createdAt));
  const todayPending = todayOrders.filter(o => o.deliveryStatus === 'PENDING');
  const todayDone = todayOrders.filter(o => o.deliveryStatus === 'DELIVERED');
  const allPending = orders.filter(o => o.deliveryStatus === 'PENDING');

  const stats = [
    { label: "Today's Orders", value: todayOrders.length, color: 'text-blue-600' },
    { label: 'Pending (All)', value: allPending.length, color: 'text-orange-600' },
    { label: 'Delivered Today', value: todayDone.length, color: 'text-emerald-600' },
    { label: 'Today Paid', value: todayOrders.filter(o => o.paymentStatus === 'PAID').length, color: 'text-purple-600' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {stats.map(s => (
        <div key={s.label} className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{s.label}</p>
          <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Customer Search Panel ────────────────────────────────────────────────────
function CustomerSearchPanel({ onSelect, selectedCustomer, onClear, onAddNew, onNewOrder, viewingOrders, onToggleOrders }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);

  const search = useCallback((q) => {
    clearTimeout(debounceRef.current);
    if (!q.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`${API}/customers?search=${encodeURIComponent(q)}`, { credentials: 'include' });
        const json = await res.json();
        if (json.success) setResults(json.data.slice(0, 5));
      } finally { setSearching(false); }
    }, 300);
  }, []);

  const handleSelect = (c) => { setQuery(''); setResults([]); onSelect(c); };

  const typeColor = (t) => ({
    Home: 'bg-blue-100 text-blue-700',
    Restaurant: 'bg-orange-100 text-orange-700',
    Shop: 'bg-purple-100 text-purple-700',
    Distributor: 'bg-teal-100 text-teal-700',
  }[t] || 'bg-slate-100 text-slate-600');

  return (
    <div className="space-y-4">
      {/* Search box */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="search"
          placeholder="Search by phone or name…"
          value={query}
          onChange={e => { setQuery(e.target.value); search(e.target.value); }}
          className="w-full border border-slate-200 rounded-lg py-3 pl-10 pr-4 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm"
        />
        {searching && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        )}
        {/* Results dropdown */}
        {results.length > 0 && (
          <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg z-30 overflow-hidden">
            {results.map(c => (
              <button key={c.id} onClick={() => handleSelect(c)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-100 last:border-0">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{c.name}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1"><Phone size={11}/>{c.phone}</p>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${typeColor(c.type)}`}>{c.type}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* No customer selected */}
      {!selectedCustomer && (
        <div className="text-center py-6 space-y-3">
          <User size={32} className="text-slate-300 mx-auto" />
          <p className="text-sm text-slate-500">Search for a customer above</p>
          <button onClick={onAddNew}
            className="inline-flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 font-medium border border-emerald-200 hover:border-emerald-400 bg-emerald-50 hover:bg-emerald-100 px-3 py-2 rounded-lg transition-colors">
            <Plus size={15}/> Add New Customer
          </button>
        </div>
      )}

      {/* Customer profile card */}
      {selectedCustomer && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 space-y-4">
          {/* Avatar + name */}
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xl font-bold shrink-0">
              {selectedCustomer.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-slate-900 text-base leading-tight truncate">{selectedCustomer.name}</h3>
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Phone size={11}/>{selectedCustomer.phone}</p>
              <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded mt-1 ${typeColor(selectedCustomer.type)}`}>{selectedCustomer.type}</span>
            </div>
            <button onClick={onClear} className="text-slate-300 hover:text-slate-500 transition-colors" title="Clear selection">
              <X size={18}/>
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-50 rounded-lg p-2.5 text-center">
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Balance</p>
              <p className={`text-sm font-bold mt-0.5 ${selectedCustomer.cachedBalance > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                Rs.{selectedCustomer.cachedBalance || 0}
              </p>
            </div>
            <div className="bg-slate-50 rounded-lg p-2.5 text-center">
              <p className="text-[10px] text-slate-400 font-semibold uppercase">19L Bottles</p>
              <p className="text-sm font-bold mt-0.5 text-amber-600">{selectedCustomer.cachedBottleBalance || 0}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-2.5 text-center">
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Last Del.</p>
              <p className="text-xs font-bold mt-0.5 text-slate-600">{selectedCustomer.lastDeliveryAt ? new Date(selectedCustomer.lastDeliveryAt).toLocaleDateString('en-PK', { month:'short', day:'numeric' }) : '—'}</p>
            </div>
          </div>

          {/* Credit & price info */}
          <div className="flex justify-between text-xs text-slate-500 border-t border-slate-100 pt-3">
            <span>Credit: <strong className="text-slate-700">{selectedCustomer.creditLimit > 0 ? `Rs.${selectedCustomer.creditLimit}` : 'Unlimited'}</strong></span>
            <span>Default: <strong className="text-slate-700">Rs.{selectedCustomer.defaultPrice}/btl</strong></span>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button onClick={onNewOrder}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-1.5 transition-colors">
              <Plus size={15}/> New Order
            </button>
            <button onClick={onToggleOrders}
              className={`flex-1 py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-1.5 transition-colors border ${viewingOrders ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>
              <ClipboardList size={15}/> {viewingOrders ? 'Hide Orders' : 'View Orders'}
            </button>
          </div>

          {/* Map link */}
          {selectedCustomer.mapLink && (
            <a href={selectedCustomer.mapLink} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-700 transition-colors">
              <MapPin size={13}/> Open in Google Maps
            </a>
          )}
        </div>
      )}

      {/* Add new customer link when customer selected */}
      {selectedCustomer && (
        <button onClick={onAddNew}
          className="w-full text-center text-xs text-slate-400 hover:text-emerald-600 transition-colors flex items-center justify-center gap-1 py-1">
          <Plus size={12}/> Add different customer
        </button>
      )}
    </div>
  );
}

// ─── Order Row ────────────────────────────────────────────────────────────────
function OrderRow({ order, showCustomer, onDeliver, onEdit }) {
  const total = order.items?.reduce((s, i) => s + parseFloat(i.price || 0) * (i.quantity || 0), 0) || 0;
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
      {/* Type badge */}
      <span className={`text-xs font-bold px-2 py-0.5 rounded shrink-0 ${orderTypeBadge(order.type)}`}>
        {orderTypeLabel(order.type)}
      </span>

      {/* Customer name (when showing all orders) */}
      {showCustomer && (
        <div className="min-w-0 w-28">
          <p className="text-sm font-semibold text-slate-800 truncate">{order.customer?.name}</p>
          <p className="text-xs text-slate-400 truncate">{order.customer?.phone}</p>
        </div>
      )}

      {/* Items */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-700 truncate">
          {order.items?.map(i => `${i.quantity}× ${itemName(i.item?.name)}`).join(', ')}
        </p>
        {order.remarks && <p className="text-xs text-slate-400 truncate">{order.remarks}</p>}
      </div>

      {/* Amount */}
      <span className="text-sm font-bold text-slate-800 shrink-0">Rs.{total.toFixed(0)}</span>

      {/* Date */}
      <span className="text-xs text-slate-500 shrink-0 flex items-center gap-1"><Clock size={11}/>{fmtDate(order.expectedDelivery)}</span>

      {/* Status badges */}
      <div className="flex flex-col gap-1 shrink-0">
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${statusColor(order.deliveryStatus)}`}>{order.deliveryStatus}</span>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${payColor(order.paymentStatus)}`}>{order.paymentStatus}</span>
      </div>

      {/* Actions */}
      <div className="flex gap-1.5 shrink-0">
        <button onClick={() => onEdit(order)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-2.5 py-1.5 text-xs rounded-md font-medium transition-colors">
          Edit
        </button>
        {order.deliveryStatus !== 'DELIVERED' && order.deliveryStatus !== 'CANCELLED' && (
          <button onClick={() => onDeliver(order)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 text-xs rounded-md font-medium flex items-center gap-1 transition-colors">
            <Truck size={11}/> Deliver
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Orders Panel ─────────────────────────────────────────────────────────────
function OrdersPanel({ orders, loading, selectedCustomer, viewingOrders, onDeliver, onEdit, onRefresh }) {
  const [tab, setTab] = useState("Today's Pending");
  const tabs = ["Today's Pending", 'All Pending', 'Completed', 'All Orders'];

  const displayOrders = (() => {
    let list = viewingOrders && selectedCustomer
      ? orders.filter(o => o.customer?.id === selectedCustomer.id)
      : orders;

    switch (tab) {
      case "Today's Pending": return list.filter(o => o.deliveryStatus === 'PENDING' && isToday(o.createdAt));
      case 'All Pending':     return list.filter(o => o.deliveryStatus === 'PENDING');
      case 'Completed':       return list.filter(o => o.deliveryStatus === 'DELIVERED');
      default:                return list;
    }
  })();

  const showCustomer = !viewingOrders || !selectedCustomer;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col h-full min-h-100">
      {/* Tab bar */}
      <div className="flex items-center justify-between px-4 pt-3 pb-0 border-b border-slate-100 flex-wrap gap-2">
        <div className="flex gap-1 flex-wrap">
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors whitespace-nowrap ${tab === t ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}>
              {t}
            </button>
          ))}
        </div>
        <button onClick={onRefresh} className="text-slate-400 hover:text-emerald-600 transition-colors p-1.5 rounded-lg hover:bg-slate-100" title="Refresh">
          <RefreshCw size={15}/>
        </button>
      </div>

      {/* Title context */}
      {viewingOrders && selectedCustomer && (
        <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-100 text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
          <User size={12}/> Showing orders for {selectedCustomer.name}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3 text-slate-400">
            <span className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"/>
            <p className="text-sm">Loading orders…</p>
          </div>
        ) : displayOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-400">
            <ClipboardList size={32} className="text-slate-300"/>
            <p className="text-sm">No orders in this view</p>
          </div>
        ) : (
          displayOrders.map(o => (
            <OrderRow key={o.id} order={o} showCustomer={showCustomer} onDeliver={onDeliver} onEdit={onEdit}/>
          ))
        )}
      </div>
    </div>
  );
}

// No-customer placeholder for the right panel
function EmptyRightPanel() {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col items-center justify-center h-80 gap-3 text-center p-6">
      <Search size={40} className="text-slate-200"/>
      <p className="font-semibold text-slate-500">Search for a customer to get started</p>
      <p className="text-xs text-slate-400">Select a customer on the left to view their orders or create a new one</p>
    </div>
  );
}

// ─── Add Customer Modal ───────────────────────────────────────────────────────
function AddCustomerModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    name: '', phone: '', type: 'Home', address: '', mapLink: '',
    deposit: 0, defaultPrice: 0, creditLimit: 0, creditDuration: 1, remarks: ''
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.mapLink) {
      const valid = ['maps.google.com', 'google.com/maps', 'goo.gl', 'maps.app.goo.gl'].some(d => form.mapLink.includes(d));
      if (!valid) { alert('Please enter a valid Google Maps URL'); return; }
    }
    setSaving(true);
    try {
      const res = await fetch(`${API}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success || res.ok) {
        // Fetch the new customer by phone to get full data
        const srch = await fetch(`${API}/customers?search=${encodeURIComponent(form.phone)}`, { credentials: 'include' });
        const sj = await srch.json();
        const newCust = sj.success && sj.data.length > 0 ? sj.data[0] : null;
        onSaved(newCust);
      } else {
        alert(json.message || 'Failed to add customer');
      }
    } catch { alert('Network error'); }
    finally { setSaving(false); }
  };

  const inputCls = "w-full border border-slate-200 rounded-lg p-2.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm";

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center z-10">
          <h3 className="text-lg font-bold text-slate-800">Add New Customer</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full transition-colors"><X size={18}/></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Basic Details</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label><input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} required autoFocus /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Phone *</label><input type="tel" className={inputCls} value={form.phone} onChange={e => set('phone', e.target.value)} required /></div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                <select className={inputCls} value={form.type} onChange={e => set('type', e.target.value)}>
                  <option>Home</option><option>Restaurant</option><option>Shop</option><option>Distributor</option>
                </select>
              </div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Default Price (Rs)</label><input type="number" className={inputCls} value={form.defaultPrice} onChange={e => set('defaultPrice', e.target.value)} /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Credit Limit (Rs)</label><input type="number" className={inputCls} value={form.creditLimit} onChange={e => set('creditLimit', e.target.value)} /></div>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-4">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Location</h4>
            <div className="space-y-3">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Address</label><textarea rows={2} className={`${inputCls} resize-none`} value={form.address} onChange={e => set('address', e.target.value)}/></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Google Maps Link</label><input type="url" className={inputCls} value={form.mapLink} onChange={e => set('mapLink', e.target.value)} placeholder="https://maps.google.com/..." /></div>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 flex items-center gap-2">
              {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>}
              Save Customer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MMOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [viewingOrders, setViewingOrders] = useState(false);

  // Modal states
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [deliverOrder, setDeliverOrder] = useState(null);
  const [editOrder, setEditOrder] = useState(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/orders`, { credentials: 'include' });
      const json = await res.json();
      if (json.success) setOrders(json.data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleSelectCustomer = (c) => {
    setSelectedCustomer(c);
    setViewingOrders(false);
  };

  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    setViewingOrders(false);
  };

  const handleOrderPlaced = () => {
    setShowNewOrder(false);
    fetchOrders();
  };

  const handleDeliveryProcessed = () => {
    setDeliverOrder(null);
    fetchOrders();
  };

  const handleOrderEdited = () => {
    setEditOrder(null);
    fetchOrders();
  };

  const handleCustomerSaved = (newCust) => {
    setShowAddCustomer(false);
    if (newCust) setSelectedCustomer(newCust);
  };

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Order Desk</h1>
          <p className="text-sm text-slate-500">Marketing Manager workspace — search, order, deliver</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Clock size={12}/>
          {new Date().toLocaleDateString('en-PK', { weekday: 'short', month: 'short', day: 'numeric' })}
        </div>
      </div>

      {/* Stats bar */}
      <StatsBar orders={orders} />

      {/* Two-panel layout */}
      <div className="flex flex-col lg:flex-row gap-5">
        {/* Left panel */}
        <div className="w-full lg:w-80 shrink-0">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Customer Search</h2>
            <CustomerSearchPanel
              selectedCustomer={selectedCustomer}
              onSelect={handleSelectCustomer}
              onClear={handleClearCustomer}
              onAddNew={() => setShowAddCustomer(true)}
              onNewOrder={() => setShowNewOrder(true)}
              viewingOrders={viewingOrders}
              onToggleOrders={() => setViewingOrders(v => !v)}
            />
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 min-w-0">
          {!selectedCustomer && !viewingOrders ? (
            <div className="space-y-4">
              <EmptyRightPanel />
              <OrdersPanel
                orders={orders}
                loading={loading}
                selectedCustomer={null}
                viewingOrders={false}
                onDeliver={setDeliverOrder}
                onEdit={setEditOrder}
                onRefresh={fetchOrders}
              />
            </div>
          ) : (
            <OrdersPanel
              orders={orders}
              loading={loading}
              selectedCustomer={selectedCustomer}
              viewingOrders={viewingOrders}
              onDeliver={setDeliverOrder}
              onEdit={setEditOrder}
              onRefresh={fetchOrders}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      {showNewOrder && selectedCustomer && (
        <NewOrderModal
          customer={selectedCustomer}
          onClose={() => setShowNewOrder(false)}
          onOrderPlaced={handleOrderPlaced}
        />
      )}

      {showAddCustomer && (
        <AddCustomerModal
          onClose={() => setShowAddCustomer(false)}
          onSaved={handleCustomerSaved}
        />
      )}

      {deliverOrder && (
        <ProcessDeliveryModal
          order={deliverOrder}
          onClose={() => setDeliverOrder(null)}
          onDeliveryProcessed={handleDeliveryProcessed}
        />
      )}

      {editOrder && (
        <EditOrderModal
          order={editOrder}
          onClose={() => setEditOrder(null)}
          onOrderEdited={handleOrderEdited}
        />
      )}
    </div>
  );
}
