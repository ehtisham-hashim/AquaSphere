import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { API_URL } from '../../utils/api';
import { Menu, Bell, X, Clock, CheckCircle, AlertTriangle, UserPlus, Trash2, Factory } from 'lucide-react';

const PAGE_TITLES = {
  '/': { title: 'Dashboard', subtitle: 'Fast access to company operations and alerts' },
  '/orders': { title: 'Orders & Dispatches', subtitle: 'Manage customer orders and delivery tracking' },
  '/customers': { title: 'Customer Directory', subtitle: 'Customer profiles, custody, and financial ledgers' },
  '/production': { title: 'Production Management', subtitle: 'Log factory output runs and chemical formulas' },
  '/inventory': { title: 'Finished Goods Inventory', subtitle: 'Track finished goods across Factory & Warehouse' },
  '/raw-materials': { title: 'Raw Materials Inventory', subtitle: 'Track raw material stock levels and reorder limits' },
  '/purchases': { title: 'Vendor Purchases', subtitle: 'Record raw material purchases and vendor invoices' },
  '/vendors': { title: 'Vendors Directory', subtitle: 'Manage vendor accounts and purchase ledgers' },
  '/expenses': { title: 'Factory Expenses', subtitle: 'Track operational expenses and receipts' },
  '/counter-sales': { title: 'Counter Sales', subtitle: 'Retail sales and immediate stock dispatches' },
  '/transport-expenses': { title: 'Transport Expenses', subtitle: 'Track fleet operations, fuel, and vehicle maintenance' },
  '/cars': { title: 'Vehicle Fleet', subtitle: 'Manage company vehicles, mileage, and service records' },
  '/users': { title: 'Users & Roles', subtitle: 'Manage system users and access permissions' },
  '/daily-close': { title: 'Daily Close', subtitle: 'Reconcile cash, sales, and end-of-day operations' },
  '/reports': { title: 'Reports & Analytics', subtitle: 'Comprehensive financial, sales, and inventory reporting' }
};

const ACTION_CONFIG = {
  ORDER_CREATED: { title: 'New Order Created', icon: AlertTriangle, color: 'text-amber-600' },
  ORDER_DELIVERED: { title: 'Order Delivered', icon: CheckCircle, color: 'text-emerald-600' },
  ORDER_PAYMENT_SETTLED: { title: 'Payment Settled', icon: CheckCircle, color: 'text-emerald-600' },
  CUSTOMER_ADDED: { title: 'New Customer Registered', icon: UserPlus, color: 'text-sky-600' },
  CUSTOMER_CREATED: { title: 'New Customer Registered', icon: UserPlus, color: 'text-sky-600' },
  CUSTOMER_DELETED: { title: 'Customer Account Removed', icon: Trash2, color: 'text-rose-600' },
  PRODUCTION_BATCH_CREATED: { title: 'Factory Production Batch', icon: Factory, color: 'text-indigo-600' },
  PRODUCTION_BATCH_COMPLETED: { title: 'Production Batch Completed', icon: Factory, color: 'text-emerald-600' }
};

const formatAlertDetails = (log) => {
  if (!log || !log.details) return 'Business activity logged';
  const raw = log.details;

  if (typeof raw === 'string' && raw.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(raw);
      const shortId = log.entityId ? `#${log.entityId.slice(0, 6).toUpperCase()}` : '';

      if (log.action === 'ORDER_CREATED') {
        const qty = parsed.items ? parsed.items.reduce((sum, i) => sum + (i.quantity || 0), 0) : 1;
        const cust = parsed.customerName ? ` for ${parsed.customerName}` : '';
        return `Order ${shortId}${cust} created (${qty} unit${qty > 1 ? 's' : ''})`;
      }

      if (log.action === 'ORDER_DELIVERED') {
        const cash = parsed.cashReceived ? ` • Cash: Rs. ${Number(parsed.cashReceived).toLocaleString()}` : '';
        const ret = parsed.returnedGood ? ` (${parsed.returnedGood} bottle(s) returned)` : '';
        return `Order ${shortId} delivered${cash}${ret}`;
      }

      if (log.action === 'ORDER_PAYMENT_SETTLED') {
        return `Order ${shortId} payment recorded (Rs. ${Number(parsed.cashReceived || parsed.amount || 0).toLocaleString()} received)`;
      }

      if (log.action === 'PRODUCTION_BATCH_COMPLETED' || log.action === 'PRODUCTION_BATCH_CREATED') {
        const isCompleted = log.action.includes('COMPLETED') || parsed.status === 'COMPLETED';
        const parts = [];
        if (parsed.qtyPure05L) parts.push(`${parsed.qtyPure05L}x 0.5L Pure`);
        if (parsed.qtyPure15L) parts.push(`${parsed.qtyPure15L}x 1.5L Pure`);
        if (parsed.qtyMix05L) parts.push(`${parsed.qtyMix05L}x 0.5L Mix`);
        if (parsed.qtyMix15L) parts.push(`${parsed.qtyMix15L}x 1.5L Mix`);
        if (parsed.quantity) parts.push(`${parsed.quantity}x 19L Refill Bottles`);
        if (parsed.packs05L) parts.push(`${parsed.packs05L}x 0.5L Packs`);
        if (parsed.packs15L) parts.push(`${parsed.packs15L}x 1.5L Packs`);

        const outputStr = parts.length > 0 ? parts.join(', ') : `${parsed.quantity || 1} units produced`;
        return `Production batch ${isCompleted ? 'completed' : 'logged'}: ${outputStr}`;
      }

      if (log.action === 'CUSTOMER_ADDED' || log.action === 'CUSTOMER_CREATED') {
        const custName = parsed.name || parsed.customerName || 'New Customer';
        return `Registered new customer: "${custName}"`;
      }

      if (log.action === 'CUSTOMER_DELETED') {
        return `Removed customer account ${shortId}`;
      }
    } catch {
      // Fallback
    }
  }

  return raw;
};

export default function TopNav({ onMobileMenuClick, onToggleCollapse, isCollapsed = false }) {
  const { user } = useAuth();
  const { tenant: currentTenant, isWadaana, setTenant } = useTenant();
  const location = useLocation();
  const [alerts, setAlerts] = useState([]);
  const [snoozedAlerts, setSnoozedAlerts] = useState(() => {
    try { return JSON.parse(localStorage.getItem('snoozed_alerts') || '{}'); } catch { return {}; }
  });
  const [confirmedAlerts, setConfirmedAlerts] = useState(() => {
    try { return JSON.parse(localStorage.getItem('confirmed_alerts') || '[]'); } catch { return []; }
  });
  const [now] = useState(() => new Date().getTime());
  const [showAlertsMenu, setShowAlertsMenu] = useState(false);

  const currentPage = PAGE_TITLES[location.pathname] || {
    title: location.pathname.replace('/', '').replace(/-/g, ' ').toUpperCase(),
    subtitle: isWadaana ? 'Wadaana Industrial OS' : 'AquaSphere Management OS'
  };

  const handleTenantSwitch = (newTenant) => {
    if (newTenant !== currentTenant) {
      setTenant(newTenant);
    }
  };

  useEffect(() => {
    if (user?.role !== 'OWNER' && user?.role !== 'ADMIN') return;

    const fetchAuditAlerts = async () => {
      try {
        const res = await fetch(`${API_URL}/audit-logs`, {
          headers: { 'x-tenant': currentTenant },
          credentials: 'include'
        });
        if (!res.ok) return;
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const tracked = [
            'CUSTOMER_ADDED', 'CUSTOMER_CREATED', 'CUSTOMER_DELETED',
            'ORDER_CREATED', 'ORDER_DELIVERED', 'ORDER_PAYMENT_SETTLED',
            'PRODUCTION_BATCH_CREATED', 'PRODUCTION_BATCH_COMPLETED'
          ];
          setAlerts(json.data.filter(log => tracked.includes(log.action)));
        }
      } catch (err) {
        console.error('Error fetching audit alerts:', err);
      }
    };
    fetchAuditAlerts();
    const interval = setInterval(fetchAuditAlerts, 15000);
    return () => clearInterval(interval);
  }, [user?.role, currentTenant]);

  const handleSnooze = (alertId) => {
    const expireTime = new Date().getTime() + 3600 * 1000; // Snooze for 1 hour
    const updated = { ...snoozedAlerts, [alertId]: expireTime };
    setSnoozedAlerts(updated);
    localStorage.setItem('snoozed_alerts', JSON.stringify(updated));
  };

  const handleConfirm = (alertId) => {
    const updated = [...confirmedAlerts, alertId];
    setConfirmedAlerts(updated);
    localStorage.setItem('confirmed_alerts', JSON.stringify(updated));
  };

  const activeAlerts = alerts.filter(a => {
    if (confirmedAlerts.includes(a.id)) return false;
    const snoozeTime = snoozedAlerts[a.id];
    if (snoozeTime && snoozeTime > now) return false;
    return true;
  });

  return (
    <header className="h-16 border-b border-slate-200 bg-white/95 backdrop-blur-sm flex items-center justify-between px-3.5 sm:px-6 sticky top-0 z-20 shadow-2xs">
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Mobile menu drawer trigger */}
        <button 
          className="md:hidden text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 p-2 rounded-xl transition" 
          onClick={onMobileMenuClick}
          aria-label="Open navigation drawer"
        >
          <Menu size={19} />
        </button>

        {/* Desktop sidebar rail collapse trigger */}
        <button 
          className="hidden md:flex text-slate-500 hover:text-slate-900 hover:bg-slate-100 p-2 rounded-xl transition" 
          onClick={onToggleCollapse}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label="Toggle sidebar"
        >
          <Menu size={19} />
        </button>

        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight">{currentPage.title}</h1>
          <p className="hidden sm:block text-xs text-slate-400">{currentPage.subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* Alerts Bell Icon */}
        <div className="relative">
          <button
            onClick={() => setShowAlertsMenu(!showAlertsMenu)}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 relative transition-all"
            title="System Activity Alerts"
            aria-label="System Activity Alerts"
          >
            <Bell size={18} />
            {activeAlerts.length > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white font-bold text-[9px] rounded-full flex items-center justify-center animate-pulse">
                {activeAlerts.length}
              </span>
            )}
          </button>

          {/* Alerts Drawer */}
          {showAlertsMenu && (
            <div className="absolute right-0 mt-2 w-72 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
              <div className="bg-slate-50 text-slate-800 p-3.5 flex justify-between items-center border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Bell size={15} className="text-amber-500" />
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">Activity Alerts</h3>
                </div>
                <button onClick={() => setShowAlertsMenu(false)} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg">
                  <X size={16} />
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 p-1">
                {activeAlerts.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    <CheckCircle size={20} className="mx-auto mb-1 text-emerald-500 opacity-60" />
                    No unconfirmed activity alerts.
                  </div>
                ) : (
                  activeAlerts.map(a => {
                    const config = ACTION_CONFIG[a.action] || { title: a.action.replace(/_/g, ' '), icon: AlertTriangle, color: 'text-amber-600' };
                    const IconComp = config.icon;
                    const humanMessage = formatAlertDetails(a);

                    return (
                      <div key={a.id} className="p-3 hover:bg-slate-50 transition-colors space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5">
                            <div className="p-1.5 bg-slate-100 rounded-lg shrink-0 mt-0.5">
                              <IconComp size={15} className={config.color} />
                            </div>
                            <div>
                              <span className="font-semibold text-xs text-slate-900 block">{config.title}</span>
                              <p className="text-xs text-slate-600 leading-normal mt-0.5">{humanMessage}</p>
                              <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                                <span>{new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                <span>•</span>
                                <span>User: {a.performedBy || 'System'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end pt-1 border-t border-slate-100/60">
                          <button
                            onClick={() => handleSnooze(a.id)}
                            className="px-2 py-1 text-[10px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 transition-colors"
                          >
                            <Clock size={11} /> Snooze
                          </button>
                          <button
                            onClick={() => handleConfirm(a.id)}
                            className="px-2.5 py-1 text-[10px] font-bold text-white bg-brand hover:bg-brand-hover rounded-lg flex items-center gap-1 transition-colors"
                          >
                            <CheckCircle size={11} /> Confirm
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Company Selector */}
        <div className="flex items-center gap-1.5">
          <div className="flex bg-slate-100 rounded-xl p-0.5 border border-slate-200/80">
            <button 
              onClick={() => handleTenantSwitch('aquasphere')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${!isWadaana ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <span className="sm:hidden">AQ</span>
              <span className="hidden sm:inline">AquaSphere</span>
            </button>
            <button 
              onClick={() => handleTenantSwitch('wadaana')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${isWadaana ? 'bg-brand text-white shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <span className="sm:hidden">WD</span>
              <span className="hidden sm:inline">Wadaana Ind.</span>
            </button>
          </div>
        </div>

        {/* Role Display */}
        <div className="hidden sm:flex items-center gap-2 border-l border-slate-200 pl-3 md:pl-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 hidden xl:block">Role:</span>
          <div className="flex items-center px-2.5 py-1 border border-slate-200 rounded-lg bg-white">
            <span className="text-xs font-semibold capitalize text-slate-700">{user?.role?.replace(/_/g, ' ').toLowerCase() || 'Loading...'}</span>
          </div>
        </div>
      </div>
    </header>
  );
}

