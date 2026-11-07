import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { isPageAllowedForRole } from '../../constants/roleAccess';
import { toast } from 'sonner';
import { getWhatsAppMode, setWhatsAppMode } from '../../utils/whatsapp';
import { API_URL } from '../../utils/api';
import { peekCachedData } from '../../utils/apiCache';
import { 
  BarChart3, 
  Truck, 
  UserSquare2, 
  Factory, 
  PackageSearch, 
  ShoppingCart, 
  Users as VendorsIcon, 
  Banknote,
  Store,
  UserCog,
  Droplets,
  Building2,
  X,
  ShieldCheck,
  Boxes,
  Car,
  Tag,
  LogOut,
  MessageCircle,
  FileText
} from 'lucide-react';

import { checkForUpdate } from '../../utils/versionCheck';

// ponytail: hover-prefetch — fires import() on mouse-enter so the JS chunk is already
// downloaded when the user clicks. No lib, no state, browser handles dedup.
const PREFETCH_MAP = {
  '/dashboard': () => import('../../pages/Dashboard'),
  '/': () => import('../../pages/Dashboard'),
  '/orders': () => import('../../pages/Orders'),
  '/customers': () => import('../../pages/Customers'),
  '/production': () => import('../../pages/Production'),
  '/inventory': () => import('../../pages/Inventory'),
  '/raw-materials': () => import('../../pages/RawMaterials'),
  '/purchases': () => import('../../pages/Purchases'),
  '/vendors': () => import('../../pages/Vendors'),
  '/expenses': () => import('../../pages/Expenses'),
  '/counter-sales': () => import('../../pages/CounterSales'),
  '/pricing': () => import('../../pages/ProductPricing'),
  '/users': () => import('../../pages/Users'),
  '/transport': () => import('../../pages/Transport'),
  '/daily-close': () => import('../../pages/DailyClose'),
  '/erp-reports': () => import('../../pages/Reports'),
};

const prefetchedPaths = new Set();

const safePrefetch = (path, currentTenant, warmApi = true) => {
  try {
    const fn = PREFETCH_MAP[path];
    if (fn && !prefetchedPaths.has(path)) {
      prefetchedPaths.add(path);
      fn().catch((err) => {
        prefetchedPaths.delete(path);
        const msg = String(err?.message || '');
        if (
          msg.includes('dynamically imported module') ||
          msg.includes('Loading chunk') ||
          msg.includes('Importing a module script failed')
        ) {
          // Stale chunk detected during prefetch: trigger background update sync
          checkForUpdate(true);
        }
      });
    }
  } catch (_e) {
    // Ignore safe prefetch errors
  }

  if (currentTenant && warmApi) {
    const API_WARM_MAP = {
      '/orders': `${API_URL}/orders`,
      '/customers': `${API_URL}/customers?search=&status=active`,
      '/production': `${API_URL}/production`,
      '/inventory': `${API_URL}/items?type=FINISHED_GOOD`,
      '/vendors': `${API_URL}/vendors?includeArchived=false`,
      '/expenses': `${API_URL}/expenses?limit=500`,
      '/purchases': `${API_URL}/purchases`
    };
    const warmUrl = API_WARM_MAP[path];
    if (warmUrl && !peekCachedData(warmUrl, { headers: { 'x-tenant': currentTenant } })) {
      try {
        fetch(warmUrl, {
          headers: { 'x-tenant': currentTenant },
          credentials: 'include'
        }).catch(() => {});
      } catch {
        // Ignore prefetch error
      }
    }
  }
};

const navItems = [
  { icon: BarChart3, label: 'Dashboard', path: '/dashboard' },
  { icon: Truck, label: 'Orders', path: '/orders' },
  { icon: UserSquare2, label: 'Customers', path: '/customers' },
  { icon: Factory, label: 'Production', path: '/production' },
  { icon: Boxes, label: 'Inventory', path: '/inventory' },
  { icon: PackageSearch, label: 'Raw Materials', path: '/raw-materials' },
  { icon: ShoppingCart, label: 'Purchases', path: '/purchases' },
  { icon: VendorsIcon, label: 'Vendors', path: '/vendors' },
  { icon: Banknote, label: 'Expenses', path: '/expenses' },
  { icon: Store, label: 'Counter Sales', path: '/counter-sales' },
  { icon: Tag, label: 'Rates & Defaults', path: '/pricing' },
  { icon: UserCog, label: 'Users & Roles', path: '/users' },
  { icon: Car, label: 'Transport', path: '/transport' },
  { icon: ShieldCheck, label: 'Daily Close', path: '/daily-close' },
  { icon: FileText, label: 'ERP Reports', path: '/erp-reports' },
];

export default function Sidebar({ isOpen, onClose, isCollapsed = false }) {
  const { user, logout } = useAuth();
  const { tenant, isWadaana } = useTenant();
  const [waMode, setWaMode] = useState(() => getWhatsAppMode());

  useEffect(() => {
    if (!user?.role) return;
    const allowedPaths = navItems
      .filter(item => isPageAllowedForRole(user?.role, item.path, tenant))
      .map(item => item.path);
    let cancelled = false;

    const preloadSequentially = async () => {
      for (const path of allowedPaths) {
        if (cancelled) break;
        if (!prefetchedPaths.has(path) && PREFETCH_MAP[path]) {
          prefetchedPaths.add(path);
          try {
            await PREFETCH_MAP[path]();
          } catch {
            prefetchedPaths.delete(path);
          }
          await new Promise(r => setTimeout(r, 120));
        }
      }
    };

    const timer = setTimeout(() => {
      if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(() => preloadSequentially(), { timeout: 2000 });
      } else {
        preloadSequentially();
      }
    }, 600);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [user?.role, tenant]);

  useEffect(() => {
    if (isOpen) {
      navItems
        .filter(item => isPageAllowedForRole(user?.role, item.path, tenant))
        .forEach(item => safePrefetch(item.path, tenant, false));
    }
  }, [isOpen, tenant, user?.role]);

  const handleToggleWaMode = () => {
    const nextMode = waMode === 'app' ? 'web' : waMode === 'web' ? 'auto' : 'app';
    setWhatsAppMode(nextMode);
    setWaMode(nextMode);
    toast.success(
      nextMode === 'app'
        ? 'WhatsApp: Desktop App (whatsapp://)'
        : nextMode === 'web'
        ? 'WhatsApp: Web Tab only (Single Reused Tab)'
        : 'WhatsApp: Auto (Desktop App direct)'
    );
  };

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 transition-opacity" 
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside 
        className={`fixed md:relative top-0 left-0 h-screen bg-white border-r border-slate-200 flex flex-col z-50 transition-all duration-200 flex-shrink-0 select-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${isCollapsed ? 'md:w-20' : 'md:w-72'} w-72`}
      >
        {/* Brand Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-slate-100 bg-white">
          <div className={`flex items-center gap-2.5 ${isCollapsed ? 'md:justify-center md:w-full' : ''}`}>
            <div className="grid place-items-center rounded-xl p-2 bg-brand-light text-brand shrink-0">
              {isWadaana ? <Building2 className="w-5 h-5" /> : <Droplets className="w-5 h-5" />}
            </div>
            {(!isCollapsed || isOpen) && (
              <div className="min-w-0">
                <p className="text-sm sm:text-base font-bold text-slate-900 truncate">
                  {isWadaana ? 'Wadaana Ind.' : 'AquaSphere OS'}
                </p>
                <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {isWadaana ? 'Blow Molding' : 'Operations'}
                </p>
              </div>
            )}
          </div>
          <button 
            className="md:hidden p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition" 
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1 scrollbar-none">
          {navItems
            .filter(item => isPageAllowedForRole(user?.role, item.path, tenant))
            .map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => { if (isOpen) onClose(); }}
                  onMouseEnter={() => safePrefetch(item.path, tenant)}
                  onFocus={() => safePrefetch(item.path, tenant)}
                  onTouchStart={() => safePrefetch(item.path, tenant)}
                  onPointerDown={() => safePrefetch(item.path, tenant)}
                  title={isCollapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl text-sm transition-all duration-150 ${
                      isCollapsed 
                        ? 'md:justify-center md:px-0 md:py-2.5 px-3.5 py-2.5' 
                        : 'px-3.5 py-2.5'
                    } ${
                      isActive 
                        ? 'bg-brand/10 text-brand font-semibold shadow-2xs' 
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium'
                    }`
                  }
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {(!isCollapsed || isOpen) && (
                    <span className="truncate tracking-tight">{item.label}</span>
                  )}
                </NavLink>
              );
            })}
        </nav>

        {/* Footer Company / Sign Out */}
        <div className="p-3 border-t border-slate-100 bg-white space-y-2">
          {(!isCollapsed || isOpen) ? (
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
              <span className="text-slate-600 font-medium flex items-center gap-1.5">
                <MessageCircle size={13} className="text-emerald-600" />
                WhatsApp
              </span>
              <button
                type="button"
                onClick={handleToggleWaMode}
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition border ${
                  waMode === 'app'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : waMode === 'web'
                    ? 'bg-sky-50 text-sky-800 border-sky-300'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
                title="Toggle between Auto (App then Web), Desktop App only, and Web Tab only"
              >
                {waMode === 'app' ? '📱 App' : waMode === 'web' ? '🌐 Web' : '⚡ Auto'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleToggleWaMode}
              className="w-full flex items-center justify-center p-2 rounded-xl text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition border border-slate-200"
              title={`WhatsApp: ${waMode === 'app' ? 'Desktop App only' : waMode === 'web' ? 'Web Tab only' : 'Auto (App if open, then Web)'}. Click to toggle.`}
            >
              <MessageCircle size={16} className={waMode === 'app' || waMode === 'auto' ? 'text-emerald-600' : 'text-slate-500'} />
            </button>
          )}

          <button 
            onClick={logout}
            title={isCollapsed ? 'Sign Out' : undefined}
            className={`w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-xl text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors ${
              isCollapsed ? 'md:px-0 px-3.5' : 'px-3.5'
            }`}
          >
            <LogOut size={17} className="shrink-0" />
            {(!isCollapsed || isOpen) && (
              <span className="truncate">Sign Out</span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
