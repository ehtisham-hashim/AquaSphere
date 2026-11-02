import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Phone, 
  Clock, 
  MapPin, 
  Menu, 
  X, 
  Settings, 
  LogIn 
} from 'lucide-react';

const DEFAULT_NAV_SETTINGS = {
  phone: "051-545-443-8",
  opening_hours: "Monday to Saturday - 8AM to 8PM",
  location: "Plot No. 3 Lieutenant Zafar Mehmood Shaheed Road Rawalpindi Cantt",
  logo_url: "https://res.cloudinary.com/dcbdne09h/image/upload/v1791915156/Aqua_Sphere_Water_Leaf_Logo_am7t4i.png"
};

const optImg = (url, width = 600) => {
  if (!url || typeof url !== 'string' || !url.includes('cloudinary.com')) return url;
  if (url.includes('/f_auto,q_auto')) return url;
  return url.replace('/image/upload/', `/image/upload/f_auto,q_auto,w_${width}/`);
};

export default function PublicNavbar({ settings = {} }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const isReportsPage = location.pathname === '/reports';
  const isCertificatesPage = location.pathname === '/certificates';

  const merged = { ...DEFAULT_NAV_SETTINGS, ...settings };

  // Helper to render home anchor or route link
  const renderNavLink = (hash, label) => {
    if (isHomePage) {
      return (
        <a 
          href={hash} 
          className="text-white/90 hover:text-cyan-400 text-sm font-semibold transition-colors"
        >
          {label}
        </a>
      );
    }

    return (
      <Link 
        to={`/${hash}`} 
        className="text-white/90 hover:text-cyan-400 text-sm font-semibold transition-colors"
      >
        {label}
      </Link>
    );
  };

  const renderMobileNavLink = (hash, label) => {
    if (isHomePage) {
      return (
        <a 
          href={hash} 
          onClick={() => setMobileMenuOpen(false)} 
          className="hover:text-cyan-400 py-1"
        >
          {label}
        </a>
      );
    }

    return (
      <Link 
        to={`/${hash}`} 
        onClick={() => setMobileMenuOpen(false)} 
        className="hover:text-cyan-400 py-1"
      >
        {label}
      </Link>
    );
  };

  return (
    <>
      {/* 1. TOP INFORMATION BAR */}
      <div className="bg-[#030a16] text-slate-300 text-xs sm:text-sm font-medium py-2 px-4 sm:px-8 border-b border-white/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2 text-center md:text-left">
          <div className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Land Line: <strong className="text-white">{merged.phone}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>{merged.opening_hours}</span>
          </div>
          <div className="flex items-center gap-2 truncate max-w-md">
            <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>{merged.location}</span>
          </div>
        </div>
      </div>

      {/* 2. MAIN NAVBAR */}
      <header className="sticky top-0 z-50 bg-[#06162a]/90 backdrop-blur-xl border-b border-white/10 shadow-lg transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-20 sm:h-22 flex items-center justify-between">
          
          {/* Logo */}
          <Link to="/" className="flex items-center group py-2" aria-label="AquaSphere Pure Drinking Water Delivery">
            <img 
              src={optImg(merged.logo_url, 800)} 
              alt="AquaSphere Pure Drinking Water & Wholesale Bottles Logo" 
              width="160"
              height="56"
              className="h-12 sm:h-14 w-auto object-contain transition-transform group-hover:scale-105" 
              loading="eager"
            />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-7">
            {isHomePage ? (
              <a href="#hero" className="text-white/90 hover:text-cyan-400 text-sm font-semibold transition-colors">Home</a>
            ) : (
              <Link to="/" className="text-white/90 hover:text-cyan-400 text-sm font-semibold transition-colors">Home</Link>
            )}
            {renderNavLink('#products', 'Products')}
            {renderNavLink('#about', 'About')}
            <Link 
              to="/reports" 
              className={`text-sm transition-colors ${
                isReportsPage ? 'text-cyan-400 font-bold' : 'text-white/90 hover:text-cyan-400 font-semibold'
              }`}
            >
              Reports
            </Link>
            <Link 
              to="/certificates" 
              className={`text-sm transition-colors ${
                isCertificatesPage ? 'text-cyan-400 font-bold' : 'text-white/90 hover:text-cyan-400 font-semibold'
              }`}
            >
              Certificates
            </Link>
            {renderNavLink('#location', 'Location')}
            {renderNavLink('#contact', 'Contact')}
          </nav>

          {/* Header Action Buttons */}
          <div className="hidden sm:flex items-center gap-2.5">
            <Link 
              to="/website-admin" 
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-cyan-200 bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/30 rounded-none transition-all shadow-sm"
              title="Edit Landing Page Content"
            >
              <Settings className="w-3.5 h-3.5 text-cyan-400" />
              <span>Website Admin</span>
            </Link>

            <a 
              href="https://theaquasphere.org/login" 
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 rounded-none transition-all shadow-sm"
              title="Open Software ERP Portal"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Software Admin</span>
            </a>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            onClick={() => setMobileMenuOpen(prev => !prev)} 
            className="lg:hidden p-2 text-white hover:text-cyan-400 rounded-none focus:outline-none"
            aria-label="Toggle Navigation"
            type="button"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#06162a]/95 border-b border-white/10 px-6 py-5 flex flex-col gap-3 text-sm font-semibold text-white shadow-2xl backdrop-blur-2xl animate-in slide-in-from-top-2">
            {isHomePage ? (
              <a href="#hero" onClick={() => setMobileMenuOpen(false)} className="hover:text-cyan-400 py-1">Home</a>
            ) : (
              <Link to="/" onClick={() => setMobileMenuOpen(false)} className="hover:text-cyan-400 py-1">Home</Link>
            )}
            {renderMobileNavLink('#products', 'Products')}
            {renderMobileNavLink('#about', 'About')}
            <Link 
              to="/reports" 
              onClick={() => setMobileMenuOpen(false)} 
              className={`py-1 ${isReportsPage ? 'text-cyan-400 font-bold' : 'hover:text-cyan-400'}`}
            >
              Reports
            </Link>
            <Link 
              to="/certificates" 
              onClick={() => setMobileMenuOpen(false)} 
              className={`py-1 ${isCertificatesPage ? 'text-cyan-400 font-bold' : 'hover:text-cyan-400'}`}
            >
              Certificates
            </Link>
            {renderMobileNavLink('#location', 'Location')}
            {renderMobileNavLink('#contact', 'Contact')}
            
            <div className="pt-3 border-t border-white/10 flex flex-col gap-2.5">
              <Link 
                to="/website-admin" 
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-2.5 text-xs font-semibold text-cyan-200 bg-cyan-950/60 border border-cyan-500/30 rounded-none"
              >
                <Settings className="w-4 h-4 text-cyan-400" />
                <span>Website Admin</span>
              </Link>
              <a 
                href="https://theaquasphere.org/login" 
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-sky-600 to-cyan-600 rounded-none shadow-sm"
              >
                <LogIn className="w-4 h-4" />
                <span>Software Admin</span>
              </a>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
