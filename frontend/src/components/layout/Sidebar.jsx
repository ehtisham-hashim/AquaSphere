import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { isPageAllowedForRole } from '../../constants/roleAccess';
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
  Fuel,
  LogOut
} from 'lucide-react';

const navItems = [
  { icon: BarChart3, label: 'Dashboard', path: '/' },
  { icon: Truck, label: 'Orders', path: '/orders' },
  { icon: UserSquare2, label: 'Customers', path: '/customers' },
  { icon: Factory, label: 'Production', path: '/production' },
  { icon: Boxes, label: 'Inventory', path: '/inventory' },
  { icon: PackageSearch, label: 'Raw Materials', path: '/raw-materials' },
  { icon: ShoppingCart, label: 'Purchases', path: '/purchases' },
  { icon: VendorsIcon, label: 'Vendors', path: '/vendors' },
  { icon: Banknote, label: 'Expenses', path: '/expenses' },
  { icon: Store, label: 'Counter Sales', path: '/counter-sales' },
  { icon: UserCog, label: 'Users & Roles', path: '/users' },
  { icon: ShieldCheck, label: 'Daily Close', path: '/daily-close' },
  { icon: Fuel, label: 'Transport', path: '/transport-expenses' },
  { icon: Car, label: 'Cars', path: '/cars' },
];

export default function Sidebar({ isOpen, onClose, isCollapsed = false }) {
  const { user, logout } = useAuth();
  const { tenant, isWadaana } = useTenant();

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
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100 bg-white">
          <div className={`flex items-center gap-3 ${isCollapsed ? 'md:justify-center md:w-full' : ''}`}>
            <div className="grid place-items-center rounded-xl p-2.5 bg-brand-light text-brand shrink-0">
              {isWadaana ? <Building2 className="w-5 h-5" /> : <Droplets className="w-5 h-5" />}
            </div>
            {(!isCollapsed || isOpen) && (
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">
                  {isWadaana ? 'Wadaana Ind.' : 'AquaSphere OS'}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
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
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-none">
          {navItems
            .filter(item => isPageAllowedForRole(user?.role, item.path, tenant))
            .map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => { if (isOpen) onClose(); }}
                  title={isCollapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl transition-all duration-150 ${
                      isCollapsed 
                        ? 'md:justify-center md:px-0 md:py-3 px-3 py-2.5' 
                        : 'px-3.5 py-2.5'
                    } ${
                      isActive 
                        ? 'bg-brand/10 text-brand font-semibold shadow-2xs' 
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 font-medium'
                    }`
                  }
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {(!isCollapsed || isOpen) && (
                    <span className="text-sm truncate">{item.label}</span>
                  )}
                </NavLink>
              );
            })}
        </nav>

        {/* Footer Company / Sign Out */}
        <div className="p-3 border-t border-slate-100 bg-white">
          <button 
            onClick={logout}
            title={isCollapsed ? 'Sign Out' : undefined}
            className={`w-full flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-xl text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors ${
              isCollapsed ? 'md:px-0 px-3' : 'px-3'
            }`}
          >
            <LogOut size={16} className="shrink-0" />
            {(!isCollapsed || isOpen) && (
              <span className="truncate">Sign Out</span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
