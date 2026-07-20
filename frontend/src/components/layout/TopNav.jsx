import { useAuth } from '../../context/AuthContext';
import { Calendar, Building2 } from 'lucide-react';

export default function TopNav() {
  const { user } = useAuth();
  
  // Format current date exactly like the prototype: "July 20, 2026"
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date());

  return (
    <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center">
        <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
      </div>

      <div className="flex items-center gap-6">
        {/* Company Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Select Company:</span>
          <div className="flex bg-muted rounded-md overflow-hidden p-0.5">
            <button className="px-3 py-1 text-sm font-medium bg-emerald-600 text-white rounded shadow-sm">
              AquaSphere
            </button>
            <button className="px-3 py-1 text-sm font-medium text-muted-foreground hover:text-foreground">
              Badana Ind.
            </button>
          </div>
        </div>

        {/* Role Display */}
        <div className="hidden sm:flex items-center gap-2 border-l border-slate-200 pl-4 md:pl-6">
          <span className="text-sm font-medium text-muted-foreground hidden lg:block">Logged Role:</span>
          <div className="flex items-center px-3 py-1.5 border border-slate-200 rounded-md bg-background">
            <span className="text-sm font-medium">Owner (Super Admin)</span>
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
