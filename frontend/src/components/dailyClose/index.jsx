import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import ProductionClose from './ProductionClose';
import AccountantClose from './AccountantClose';
import OwnerClose from './OwnerClose';
import MarketingClose from './MarketingClose';
import { ShieldCheck, Filter } from 'lucide-react';

export default function DailyCloseIndex() {
  const { user } = useAuth();
  
  // Possible views: 'all', 'operations', 'accounting', 'sales'
  const [activeView, setActiveView] = useState('all');

  const isOwner = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const isPM = user?.role === 'PRODUCTION_MANAGER';
  const isAccountant = user?.role === 'ACCOUNTANT';
  const isMM = user?.role === 'MARKETING_MANAGER';

  // Role routing
  if (!isOwner) {
    if (isPM) return <ProductionClose />;
    if (isAccountant) return <AccountantClose />;
    if (isMM) return <MarketingClose />;
    return (
      <div className="p-8 text-center text-slate-500">
        You do not have permission to view Daily Close modules.
      </div>
    );
  }

  // Render Owner View Options
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header Banner & Dropdown Selector */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              EXECUTIVE DASHBOARD
            </span>
            <span className="text-xs text-slate-500">Master Record Control</span>
          </div>
          <h1 className="text-2xl font-bold mt-2 text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-600" /> Daily Close Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review finalized days or drill down into specific department closures.
          </p>
        </div>
        
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <Filter size={16} />
          </div>
          <select
            value={activeView}
            onChange={(e) => setActiveView(e.target.value)}
            className="pl-10 pr-10 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all appearance-none min-w-[240px] cursor-pointer hover:bg-slate-100"
          >
            <option value="all">Owner Overview (Finalized)</option>
            <option value="operations">Production Operations (PM)</option>
            <option value="accounting">Accounting Module</option>
            <option value="sales">Sales & Marketing Module</option>
          </select>
          {/* Custom dropdown arrow */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Render selected view */}
      {activeView === 'all' && <OwnerClose />}
      {activeView === 'operations' && <ProductionClose />}
      {activeView === 'accounting' && <AccountantClose />}
      {activeView === 'sales' && <MarketingClose />}
    </div>
  );
}
