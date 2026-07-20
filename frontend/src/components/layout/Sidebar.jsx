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
  Users, 
  Banknote,
  Store,
  LineChart,
  UserCog,
  Settings,
  Droplets
} from 'lucide-react';

const navItems = [
  { icon: BarChart3, label: 'Dashboard', path: '/' },
  { icon: Truck, label: 'Orders', path: '/orders' },
  { icon: UserSquare2, label: 'Customers', path: '/customers' },
  { icon: Factory, label: 'Production', path: '/production' },
  { icon: PackageSearch, label: 'Inventory', path: '/inventory' },
  { icon: RefreshCcw, label: 'Bottle Ledger', path: '/bottle-ledger' },
  { icon: ShoppingCart, label: 'Purchases', path: '/purchases' },
  { icon: Users, label: 'Vendors', path: '/vendors' },
  { icon: Banknote, label: 'Expenses', path: '/expenses' },
  { icon: Store, label: 'Counter Sales', path: '/counter-sales' },
  { icon: LineChart, label: 'Reports', path: '/reports' },
  { icon: UserCog, label: 'Users & Roles', path: '/users' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export default function Sidebar() {
  const { logout } = useAuth();

  return (
    <aside className="hidden md:flex w-64 flex-shrink-0 h-screen bg-white border-r border-slate-200 flex-col sticky top-0 left-0">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Droplets className="w-6 h-6 text-[#059669] fill-current" />
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight text-[#111827] leading-tight">Aqua Sphere OS</span>
            <span className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase leading-none">Management System</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-[#059669]/10 text-[#059669] font-semibold' 
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
          className="w-full flex items-center justify-center py-2.5 bg-[#e5e7eb] hover:bg-[#d1d5db] text-[#374151] font-semibold rounded-md transition-colors"
        >
          AquaSphere (Sign Out)
        </button>
      </div>
    </aside>
  );
}
