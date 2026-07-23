import { useAuth } from '../../context/AuthContext';
import { Calendar, Building2, Menu } from 'lucide-react';

export default function TopNav({ onMenuClick }) {
  const { user } = useAuth();
  
  // Format current date exactly like the prototype: "July 20, 2026"
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date());

  const currentTenant = localStorage.getItem('tenant') || 'aquasphere';
  const isWadaana = currentTenant === 'wadaana';

  const handleTenantSwitch = (newTenant) => {
    if (newTenant !== currentTenant) {
      localStorage.setItem('tenant', newTenant);
      window.location.reload(); // Reload to refetch all data and reset state
    }
  };

  return (
    <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-4 md:px-6 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <button className="md:hidden text-slate-500 hover:text-slate-800" onClick={onMenuClick}>
          <Menu size={24} />
        </button>
        <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
      </div>

      <div className="flex items-center gap-4 md:gap-6">
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
