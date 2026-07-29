import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getCompanyFromCookie, setCompanyCookie } from '../../utils/companyCookie';
import { API_URL } from '../../utils/api';
import { Calendar, Menu, Bell, X, Clock, CheckCircle, AlertTriangle, UserPlus, Trash2, Factory } from 'lucide-react';

export default function TopNav({ onMenuClick }) {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [snoozedAlerts, setSnoozedAlerts] = useState(() => {
    try { return JSON.parse(localStorage.getItem('snoozed_alerts') || '{}'); } catch { return {}; }
  });
  const [confirmedAlerts, setConfirmedAlerts] = useState(() => {
    try { return JSON.parse(localStorage.getItem('confirmed_alerts') || '[]'); } catch { return []; }
  });
  const [now] = useState(() => new Date().getTime());
  const [showAlertsMenu, setShowAlertsMenu] = useState(false);

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date());

  const currentTenant = getCompanyFromCookie();
  const isWadaana = currentTenant === 'wadaana';

  const handleTenantSwitch = (newTenant) => {
    if (newTenant !== currentTenant) {
      setCompanyCookie(newTenant);
      window.location.reload();
    }
  };

  useEffect(() => {
    if (user?.role !== 'OWNER' && user?.role !== 'ADMIN') return;

    const fetchAuditAlerts = async () => {
      try {
        const res = await fetch(`${API_URL}/audit-logs`, { credentials: 'include' });
        if (!res.ok) return;
        const json = await res.json();
        if (json.success && json.data) {
          setAlerts(json.data.filter(log => ['CUSTOMER_ADDED', 'CUSTOMER_DELETED', 'ORDER_CREATED', 'ORDER_DELIVERED', 'PRODUCTION_BATCH_CREATED'].includes(log.action)));
        }
      } catch (err) {
        console.error('Error fetching audit alerts:', err);
      }
    };
    fetchAuditAlerts();
    const interval = setInterval(fetchAuditAlerts, 15000);
    return () => clearInterval(interval);
  }, [user?.role]);

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
    <header className="h-16 border-b border-slate-200 bg-white/95 backdrop-blur-sm flex items-center justify-between px-4 md:px-6 sticky top-0 z-10 shadow-sm shadow-slate-200/40">
      <div className="flex items-center gap-3">
        <button className="md:hidden text-slate-500 hover:text-slate-800 bg-slate-100 p-2 rounded-2xl transition hover:bg-slate-200" onClick={onMenuClick}>
          <Menu size={24} />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">Fast access to company operations and alerts</p>
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-5">
        {/* Alerts Bell Icon */}
        <div className="relative">
          <button
            onClick={() => setShowAlertsMenu(!showAlertsMenu)}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 relative transition-all"
            title="System Activity Alerts"
          >
            <Bell size={20} />
            {activeAlerts.length > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white font-bold text-[10px] rounded-full flex items-center justify-center animate-pulse">
                {activeAlerts.length}
              </span>
            )}
          </button>

          {/* Alerts Drawer */}
          {showAlertsMenu && (
            <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
              <div className="bg-slate-900 text-white p-3.5 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Bell size={16} className="text-amber-400" />
                  <h3 className="font-bold text-sm">System & Activity Alerts</h3>
                </div>
                <button onClick={() => setShowAlertsMenu(false)} className="text-slate-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 p-1">
                {activeAlerts.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    <CheckCircle size={24} className="mx-auto mb-1 text-emerald-500 opacity-60" />
                    No unconfirmed activity alerts.
                  </div>
                ) : (
                  activeAlerts.map(a => (
                    <div key={a.id} className="p-3 hover:bg-slate-50 transition-colors space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {a.action === 'CUSTOMER_ADDED' ? (
                            <UserPlus size={16} className="text-emerald-600 shrink-0" />
                          ) : a.action === 'ORDER_CREATED' || a.action === 'ORDER_DELIVERED' ? (
                            <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                          ) : a.action === 'PRODUCTION_BATCH_CREATED' ? (
                            <Factory size={16} className="text-indigo-600 shrink-0" />
                          ) : (
                            <Trash2 size={16} className="text-rose-600 shrink-0" />
                          )}
                          <div>
                            <span className="font-bold text-xs text-slate-800">{a.action.replace('_', ' ')}</span>
                            <p className="text-xs text-slate-600 leading-tight">{a.details}</p>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              {new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end pt-1">
                        <button
                          onClick={() => handleSnooze(a.id)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1"
                        >
                          <Clock size={12} /> Snooze 1h
                        </button>
                        <button
                          onClick={() => handleConfirm(a.id)}
                          className="px-2.5 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1"
                        >
                          <CheckCircle size={12} /> Confirm
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Company Selector */}
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-sm font-medium text-muted-foreground">Select Company:</span>
          <div className="flex bg-muted rounded-md overflow-hidden p-0.5">
            <button 
              onClick={() => handleTenantSwitch('aquasphere')}
              className={`px-3 py-1 text-sm font-medium rounded transition-colors ${!isWadaana ? 'bg-emerald-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              AquaSphere
            </button>
            <button 
              onClick={() => handleTenantSwitch('wadaana')}
              className={`px-3 py-1 text-sm font-medium rounded transition-colors ${isWadaana ? 'bg-purple-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Wadaana Ind.
            </button>
          </div>
        </div>

        {/* Role Display */}
        <div className="hidden sm:flex items-center gap-2 border-l border-slate-200 pl-4 md:pl-6">
          <span className="text-sm font-medium text-muted-foreground hidden lg:block">Logged Role:</span>
          <div className="flex items-center px-3 py-1.5 border border-slate-200 rounded-md bg-background">
            <span className="text-sm font-medium capitalize">{user?.role?.replace(/_/g, ' ').toLowerCase() || 'Loading...'}</span>
          </div>
        </div>

        {/* Date Display */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-md border border-slate-200 text-sm font-medium text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span>{formattedDate}</span>
        </div>
      </div>
    </header>
  );
}

