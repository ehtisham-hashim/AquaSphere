import { useState, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNav from './TopNav';
import { RouteErrorBoundary } from '../common/RouteErrorBoundary';

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-brand rounded-full animate-spin"></div>
    </div>
  );
}

export default function MainLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('sidebar_collapsed') === 'true' : false;
  });

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('sidebar_collapsed', String(next));
      }
      return next;
    });
  };

  return (
    <div className="flex h-dvh min-h-dvh w-full max-w-full overflow-hidden bg-slate-50 text-slate-900 font-sans antialiased">
      <Sidebar 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)}
        isCollapsed={isCollapsed}
      />
      <div className="flex-1 flex flex-col h-dvh min-h-dvh overflow-hidden min-w-0 max-w-full">
        <TopNav 
          onMobileMenuClick={() => setIsMobileMenuOpen(true)}
          onToggleCollapse={toggleCollapse}
          isCollapsed={isCollapsed}
        />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-5 md:p-6 scroll-smooth min-w-0 max-w-full">
          <div className="max-w-7xl mx-auto w-full min-w-0">
            <RouteErrorBoundary key={location.pathname}>
              <Suspense fallback={<PageLoader />}>
                <Outlet />
              </Suspense>
            </RouteErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
