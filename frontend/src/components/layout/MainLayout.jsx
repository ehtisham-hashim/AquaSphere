import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNav from './TopNav';

export default function MainLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="app-shell flex min-h-screen overflow-hidden">
      <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <TopNav onMenuClick={() => setIsMobileMenuOpen(true)} />
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="surface-card p-4 md:p-6">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
