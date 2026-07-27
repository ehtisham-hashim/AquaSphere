import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  BarChart3, 
  Truck, 
  UserSquare2, 
  Factory, 
  PackageSearch, 
  RefreshCcw, 
  ShoppingCart, 
  Users as VendorsIcon, 
  Banknote,
  Store,
  LineChart,
  UserCog,
  Settings,
  Droplets,
  Building2,
  X
} from 'lucide-react';

const navItems = [
  { icon: BarChart3, label: 'Dashboard', path: '/' },
  { icon: Truck, label: 'Orders', path: '/orders' },
  { icon: UserSquare2, label: 'Customers', path: '/customers' },
  { icon: Factory, label: 'Production', path: '/production' },
  { icon: PackageSearch, label: 'Raw Materials', path: '/raw-materials' },
  { icon: RefreshCcw, label: 'Bottle Ledger', path: '/bottle-ledger' },
  { icon: ShoppingCart, label: 'Purchases', path: '/purchases' },
  { icon: VendorsIcon, label: 'Vendors', path: '/vendors' },
  { icon: Banknote, label: 'Expenses', path: '/expenses' },
  { icon: Store, label: 'Counter Sales', path: '/counter-sales' },
  { icon: UserCog, label: 'Users & Roles', path: '/users' },
];

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const currentTenant = localStorage.getItem('tenant') || 'aquasphere';
  const isWadaana = currentTenant === 'wadaana';

  // Dynamic colors based on tenant
  const activeBgColor = isWadaana ? 'bg-purple-600/10' : 'bg-[#059669]/10';
  const activeTextColor = isWadaana ? 'text-purple-600' : 'text-[#059669]';
  const brandIconColor = isWadaana ? 'text-purple-600' : 'text-[#059669]';

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40" 
          onClick={onClose}
        />
      )}
      <aside className={`fixed md:sticky top-0 left-0 h-screen bg-white border-r border-slate-200 flex flex-col z-50 transition-transform duration-300 w-72 flex-shrink-0 ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        {/* Brand Header */}
        <div className="h-20 flex flex-col justify-center px-6 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className={`grid place-items-center rounded-2xl p-3 ${isWadaana ? 'bg-purple-100 text-purple-600' : 'bg-emerald-100 text-emerald-600'}`}>
              {isWadaana ? <Building2 className="w-6 h-6" /> : <Droplets className="w-6 h-6" />}
            </div>
            <div>
              <p className="text-base font-semibold text-slate-900">{isWadaana ? 'Wadaana Ind.' : 'Aqua Sphere OS'}</p>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Management</p>
            </div>
          </div>
          <button className="md:hidden absolute top-4 right-4 text-slate-500 hover:text-slate-700" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-5 px-4 space-y-2">
        {navItems
          .filter(item => {
            const role = user?.role;
            if (role === 'ADMIN' && item.path === '/users') return false;
            if (role === 'PRODUCTION_MANAGER' && item.path === '/users') return false;
            
            if (isWadaana) {
              // Wadaana Owner: Hide Bottle Ledger and Counter Sales
              if (role === 'OWNER' && (item.path === '/bottle-ledger' || item.path === '/counter-sales')) return false;
              // Wadaana Accountant: Remove Production and Counter Sales
              if (role === 'ACCOUNTANT' && (item.path === '/production' || item.path === '/counter-sales')) return false;
            } else {
              // AquaSphere Accountant: Remove Production and Reports
              if (role === 'ACCOUNTANT' && (item.path === '/production' || item.path === '/reports')) return false;
              // Production manager: keep inventory-focused screens only
              if (role === 'PRODUCTION_MANAGER' && (item.path === '/orders' || item.path === '/customers' || item.path === '/users')) return false;
            }
            return true;
          })
          .map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                  isActive 
                    ? `${activeBgColor} ${activeTextColor} font-semibold` 
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground font-medium'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Company Button */}
      <div className="p-4 border-t border-slate-200">
        <button 
          onClick={logout}
          className="w-full flex items-center justify-center py-2.5 bg-[#e5e7eb] hover:bg-[#d1d5db] text-[#374151] font-semibold rounded-md transition-colors text-sm"
        >
          {isWadaana ? 'Wadaana' : 'AquaSphere'} (Sign Out)
        </button>
      </div>
    </aside>
    </>
  );
}
