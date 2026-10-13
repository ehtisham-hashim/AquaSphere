import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Phone, 
  Clock, 
  MapPin, 
  Menu, 
  X, 
  Settings, 
  LogIn,
  ExternalLink,
  ShieldCheck,
  Activity,
  ArrowUpRight,
  Send,
  FileText,
  Award
} from 'lucide-react';
import './landing.css';

// Pure React WhatsApp Icon
function WhatsAppIcon({ className = "w-4 h-4" }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2ZM12.04 20.15C10.56 20.15 9.11 19.76 7.85 19.01L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.81 13.47 3.81 11.91C3.81 7.37 7.5 3.68 12.04 3.68C14.25 3.68 16.31 4.54 17.87 6.1C19.42 7.66 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15ZM16.57 14.41C16.32 14.28 15.1 13.68 14.88 13.6C14.65 13.52 14.49 13.48 14.32 13.73C14.16 13.98 13.69 14.53 13.55 14.69C13.41 14.85 13.27 14.87 13.02 14.75C12.78 14.63 11.99 14.37 11.06 13.54C10.33 12.89 9.84 12.09 9.7 11.84C9.56 11.6 9.68 11.46 9.8 11.34C9.91 11.23 10.05 11.05 10.17 10.91C10.29 10.77 10.33 10.66 10.41 10.5C10.49 10.34 10.45 10.2 10.39 10.08C10.33 9.96 9.84 8.76 9.64 8.27C9.44 7.79 9.24 7.85 9.09 7.84C8.95 7.84 8.78 7.84 8.62 7.84C8.46 7.84 8.19 7.9 7.97 8.14C7.74 8.39 7.11 8.98 7.11 10.18C7.11 11.38 7.99 12.54 8.11 12.7C8.23 12.86 9.83 15.33 12.29 16.39C12.87 16.64 13.33 16.79 13.68 16.9C14.27 17.09 14.81 17.06 15.23 17C15.7 16.93 16.68 16.41 16.88 15.83C17.09 15.26 17.09 14.77 17.03 14.67C16.96 14.57 16.82 14.53 16.57 14.41Z" />
    </svg>
  );
}

// Cloudinary optimization helper
const optImg = (url, width = 600) => {
  if (!url || typeof url !== 'string' || !url.includes('cloudinary.com')) return url;
  if (url.includes('/f_auto,q_auto')) return url;
  return url.replace('/image/upload/', `/image/upload/f_auto,q_auto,w_${width}/`);
};

const DEFAULT_SETTINGS = {
  site_name: "Aqua Sphere",
  phone: "051-545-443-8",
  opening_hours: "Monday to Saturday - 8AM to 5PM",
  location: "Plot No. 3 Lieutenant Zafar Mehmood Shaheed Road Rawalpindi Cantt",
  whatsapp: "923015072233",
  logo_url: "https://res.cloudinary.com/wgstyulb/image/upload/v1791005735/logo.png",
  hero_bg_url: "https://res.cloudinary.com/wgstyulb/image/upload/v1791005808/hero-bg.jpg",
  hero_title: "Always want safe",
  hero_subtitle: "and good water for healthy life",
  hero_text: "Engineered multi-stage RO and UV purification. Food-grade empty bottles, precision 19L refills, and industrial hydration delivered across Rawalpindi & Islamabad.",
  hero_button: "Order Water Refills",
  about_title: "About Aqua Sphere",
  about_intro: "Welcome to Aqua Sphere, where naturally balanced electrolytes meet industrial-grade purification standards.",
  company_title: "Company Introduction",
  company_intro: "Aqua Sphere Mineral Water, established in 2019, provides pure, clean, laboratory-tested drinking water and durable food-grade containers.",
  company_image: "https://res.cloudinary.com/wgstyulb/image/upload/v1791005628/aqua-project-machine.png",
  technology_title: "Aqua Sphere Refinery",
  technology_text: "Purity in every drop. Zero compromise on micro-filtration and automated sterile bottling.",
  commitment_title: "Clean Water, Healthy Life.",
  commitment_text: "Trusted standard water delivery with certified TDS calibration and sealed tamper-proof closures.",
  project_tag: "Engineering Joint Venture",
  project_title: "WADAANA INDUSTRIES PROUDLY ANNOUNCES ITS JV WITH AQUA SPHERE FOR STRONGER AND INNOVATIVE FUTURE",
  project_text: "Wadaana Industries professionally manufactures high-quality water production and purification systems with modern technology, reliable performance, and trusted standards.",
  project_button: "Inquire JV Specs",
  location_title: "Plant & Dispatch Location",
  map_embed: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d6645.602196273996!2d72.97236419357911!3d33.610464900000004!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x38df970024408d31%3A0xa9c9cb0ebd2d1923!2sAQUA%20SPHERE!5e0!3m2!1sen!2sus!4v1791118066494!5m2!1sen!2sus",
  map_link: "https://maps.app.goo.gl/2PeNJ9oKaFzY2P7E6",
  contact_title: "Direct Order & Dispatch Inquiries",
  products: [
    {
      id: "p1",
      name: "19L Bottle Refill & Deposit",
      desc: "Security Fee / Per Refill PKR 280 (Multi-stage RO & UV Treated)",
      price: "PKR 1,000",
      image: "https://res.cloudinary.com/wgstyulb/image/upload/v1791005454/product_1777146556_7174.png"
    },
    {
      id: "p2",
      name: "1.5L Mineral Water (Pack of 6)",
      desc: "Daily hydration for corporate, dining, and family use",
      price: "PKR 100",
      image: "https://res.cloudinary.com/wgstyulb/image/upload/v1791005473/product_1777198208_4752.jpg"
    },
    {
      id: "p3",
      name: "500ml Bottled Water (Pack of 12)",
      desc: "Portable travel pack with tamper-proof seal",
      price: "PKR 50",
      image: "https://res.cloudinary.com/wgstyulb/image/upload/v1791005454/product_1777145702_1235.png"
    },
    {
      id: "p4",
      name: "Hot & Cold Water Dispenser",
      desc: "Instant dual-tap temperature dispenser for 19L carboys",
      price: "PKR 35,000",
      image: "https://res.cloudinary.com/wgstyulb/image/upload/v1791005468/product_1777146854_7886.png"
    },
    {
      id: "p5",
      name: "Table Top Mini Dispenser",
      desc: "Compact footprint for office desks and countertops",
      price: "PKR 2,500",
      image: "https://res.cloudinary.com/wgstyulb/image/upload/v1791005489/product_1777147220_8492.png"
    },
    {
      id: "p6",
      name: "Heavy-Duty Tap & Stand",
      desc: "Sturdy steel support cradle for gravity-fed 19L carboys",
      price: "PKR 1,500",
      image: "https://res.cloudinary.com/wgstyulb/image/upload/v1791005490/product_1777147740_9305.png"
    }
  ]
};

export default function LandingPage() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactMsg, setContactMsg] = useState('');

  useEffect(() => {
    fetch('/api/landing-page')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setSettings(prev => ({ ...prev, ...data.data }));
        }
      })
      .catch(() => {});
  }, []);

  const getWhatsAppLink = (productName = '') => {
    const number = settings.whatsapp?.replace(/\D/g, '') || '923015072233';
    const msg = productName 
      ? `Hello Aqua Sphere, I would like to place an order for: ${productName}`
      : 'Hello Aqua Sphere, I would like to inquire about pure water delivery and supplies.';
    return `https://wa.me/${number}?text=${encodeURIComponent(msg)}`;
  };

  const handleContactSubmit = (e) => {
    e.preventDefault();
    const text = `Direct Inquiry from AquaSphere Website:\nName: ${contactName || 'Client'}\nPhone/Contact: ${contactPhone || 'N/A'}\nMessage: ${contactMsg || 'Interested in water supply'}`;
    const number = settings.whatsapp?.replace(/\D/g, '') || '923015072233';
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(text)}`, '_blank');
    setContactName('');
    setContactPhone('');
    setContactMsg('');
  };

  return (
    <div className="lp-root min-h-screen text-zinc-100 selection:bg-zinc-100 selection:text-black">
      
      {/* 1. TOP TELEMETRY STATUS BAR */}
      <div className="border-b border-zinc-800/80 bg-zinc-950 px-4 py-2 text-xs font-mono-tech text-zinc-400">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-y-1 gap-x-4">
          <div className="flex items-center gap-2">
            <span className="lp-indicator-live" />
            <span className="text-zinc-200 uppercase tracking-widest font-semibold">FACILITY ACTIVE</span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-400 hidden sm:inline">RAWALPINDI &amp; ISLAMABAD LOGISTICS</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="hidden md:flex items-center gap-1.5 text-zinc-300">
              <Clock className="w-3.5 h-3.5 text-zinc-500" />
              {settings.opening_hours}
            </span>
            <a href={`tel:${settings.phone}`} className="flex items-center gap-1.5 text-zinc-300 hover:text-white transition-colors">
              <Phone className="w-3.5 h-3.5 text-zinc-500" />
              {settings.phone}
            </a>
          </div>
        </div>
      </div>

      {/* 2. MAIN HEADER & NAVIGATION */}
      <header className="sticky top-0 z-50 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          
          {/* Brand Logo */}
          <a href="#overview" className="flex items-center gap-3 group py-2">
            <div className="bg-zinc-900 border border-zinc-800 p-1.5">
              <img 
                src={optImg(settings.logo_url, 400)} 
                alt={settings.site_name} 
                className="h-10 sm:h-12 w-auto object-contain filter brightness-110"
                loading="eager"
              />
            </div>
            <div className="hidden sm:block">
              <span className="block text-sm font-semibold tracking-wider text-white uppercase font-instrument">AQUASPHERE</span>
              <span className="block text-[10px] font-mono-tech text-zinc-500 tracking-widest uppercase">WATER REFINERY</span>
            </div>
          </a>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-xs uppercase tracking-widest font-mono-tech text-zinc-400">
            <a href="#overview" className="hover:text-white transition-colors py-1">Overview</a>
            <a href="#specifications" className="hover:text-white transition-colors py-1">Specifications</a>
            <a href="#products" className="hover:text-white transition-colors py-1">Catalog</a>
            <a href="#engineering" className="hover:text-white transition-colors py-1">Engineering</a>
            <Link to="/reports" className="hover:text-white transition-colors py-1 flex items-center gap-1">
              Lab Reports <ArrowUpRight className="w-3 h-3 text-zinc-500" />
            </Link>
            <Link to="/certificates" className="hover:text-white transition-colors py-1 flex items-center gap-1">
              Certificates <ArrowUpRight className="w-3 h-3 text-zinc-500" />
            </Link>
            <a href="#facility" className="hover:text-white transition-colors py-1">Facility</a>
            <a href="#dispatch" className="hover:text-white transition-colors py-1">Dispatch</a>
          </nav>

          {/* Sharp Header Action Buttons (Strictly Zero Radius) */}
          <div className="hidden sm:flex items-center gap-2">
            <Link 
              to="/website-admin" 
              className="lp-btn-secondary px-3.5 py-2 text-xs font-mono-tech"
              title="Edit Landing Page Content"
            >
              <Settings className="w-3.5 h-3.5 text-zinc-400" />
              <span>CONTENT</span>
            </Link>

            <a 
              href="https://theaquasphere.org/login" 
              className="lp-btn-primary px-4 py-2 text-xs font-mono-tech"
              title="Open ERP Software Portal"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>ERP PORTAL</span>
            </a>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            onClick={() => setMobileMenuOpen(prev => !prev)} 
            className="lg:hidden p-2 text-zinc-300 hover:text-white border border-zinc-800 bg-zinc-900 rounded-none focus:outline-none"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-zinc-950 border-b border-zinc-800 px-6 py-6 flex flex-col gap-4 text-xs font-mono-tech uppercase tracking-wider text-zinc-300">
            <a href="#overview" onClick={() => setMobileMenuOpen(false)} className="hover:text-white py-1">Overview</a>
            <a href="#specifications" onClick={() => setMobileMenuOpen(false)} className="hover:text-white py-1">Specifications</a>
            <a href="#products" onClick={() => setMobileMenuOpen(false)} className="hover:text-white py-1">Product Catalog</a>
            <a href="#engineering" onClick={() => setMobileMenuOpen(false)} className="hover:text-white py-1">Engineering &amp; JV</a>
            <Link to="/reports" onClick={() => setMobileMenuOpen(false)} className="hover:text-white py-1">Lab Quality Reports</Link>
            <Link to="/certificates" onClick={() => setMobileMenuOpen(false)} className="hover:text-white py-1">Certifications</Link>
            <a href="#facility" onClick={() => setMobileMenuOpen(false)} className="hover:text-white py-1">Facility Location</a>
            <a href="#dispatch" onClick={() => setMobileMenuOpen(false)} className="hover:text-white py-1">Direct Dispatch</a>
            
            <div className="pt-4 border-t border-zinc-800 flex flex-col gap-2">
              <Link 
                to="/website-admin" 
                onClick={() => setMobileMenuOpen(false)}
                className="lp-btn-secondary w-full justify-center py-2.5 text-xs font-mono-tech"
              >
                <Settings className="w-3.5 h-3.5 text-zinc-400" />
                <span>WEBSITE CONTENT ADMIN</span>
              </Link>
              <a 
                href="https://theaquasphere.org/login" 
                onClick={() => setMobileMenuOpen(false)}
                className="lp-btn-primary w-full justify-center py-2.5 text-xs font-mono-tech"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>SOFTWARE ERP PORTAL</span>
              </a>
            </div>
          </div>
        )}
      </header>

      {/* 3. HERO SECTION (Instrument Serif + Instrument Sans + Technical Telemetry) */}
      <section id="overview" className="relative border-b border-zinc-800 pt-16 pb-20 lg:pt-28 lg:pb-32 overflow-hidden">
        {/* Subtle Background Image with Monotonic Filter */}
        <div 
          className="absolute inset-0 z-0 pointer-events-none opacity-20 filter grayscale contrast-125 bg-cover bg-center"
          style={{ backgroundImage: `url(${optImg(settings.hero_bg_url, 1600)})` }}
        />
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-zinc-950/60 via-zinc-950/90 to-zinc-950" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          
          {/* Technical Section Index Tag */}
          <div className="flex items-center gap-2 mb-6">
            <span className="font-mono-tech text-xs tracking-widest text-zinc-500 uppercase">
              [INDEX: 01 // OVERVIEW]
            </span>
            <span className="w-12 h-px bg-zinc-800" />
            <span className="font-mono-tech text-xs text-zinc-400 uppercase">
              PSQCA COMPLIANT &middot; ISLAMABAD / RAWALPINDI
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-8 space-y-6">
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.05]">
                <span className="block font-instrument">{settings.hero_title}</span>
                <span className="block font-instrument-serif italic font-normal text-zinc-300">
                  {settings.hero_subtitle}
                </span>
              </h1>

              <p className="text-base sm:text-lg text-zinc-400 max-w-2xl leading-relaxed font-instrument">
                {settings.hero_text}
              </p>

              {/* Zero-Radius Sharp Action Controls */}
              <div className="pt-4 flex flex-wrap items-center gap-3">
                <a 
                  href={getWhatsAppLink()} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="lp-btn-primary"
                >
                  <WhatsAppIcon className="w-4 h-4" />
                  <span>{settings.hero_button || 'Order Water Refills'}</span>
                </a>

                <a 
                  href="#products" 
                  className="lp-btn-secondary"
                >
                  <span>INSPECT CATALOG</span>
                  <ArrowUpRight className="w-4 h-4 text-zinc-400" />
                </a>

                <Link 
                  to="/reports" 
                  className="lp-btn-secondary font-mono-tech"
                >
                  <FileText className="w-4 h-4 text-zinc-400" />
                  <span>TEST RESULTS</span>
                </Link>
              </div>
            </div>

            {/* Precision Technical Telemetry Readout Box */}
            <div className="lg:col-span-4">
              <div className="lp-card-tech lp-corner-markers p-6 space-y-4 border border-zinc-800 bg-zinc-900/80">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                  <span className="font-mono-tech text-[11px] text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    LIVE SPECIFICATIONS
                  </span>
                  <span className="font-mono-tech text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5">
                    NOMINAL
                  </span>
                </div>

                <div className="space-y-3 font-mono-tech text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-zinc-800/40">
                    <span className="text-zinc-500">TDS CALIBRATION:</span>
                    <span className="text-zinc-200 font-semibold">110 &ndash; 130 PPM</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-zinc-800/40">
                    <span className="text-zinc-500">PH EQUILIBRIUM:</span>
                    <span className="text-zinc-200 font-semibold">7.2 &ndash; 7.6 (NEUTRAL)</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-zinc-800/40">
                    <span className="text-zinc-500">MEMBRANE PORE:</span>
                    <span className="text-zinc-200 font-semibold">0.0001 MICRON (RO)</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-zinc-800/40">
                    <span className="text-zinc-500">STERILIZATION:</span>
                    <span className="text-zinc-200 font-semibold">UV + DUAL OZONE</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-zinc-500">OUTPUT CAPACITY:</span>
                    <span className="text-zinc-200 font-semibold">50,000 L / 24H</span>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="p-3 bg-zinc-950 border border-zinc-800/80 text-[11px] text-zinc-400 font-mono-tech">
                    <span className="text-zinc-200 font-semibold block mb-1">AUTOMATED CIP CYCLES:</span>
                    Food-grade stainless steel piping with continuous automated heat sanitization.
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 4. TECHNICAL SPECIFICATIONS & PURIFICATION STAGES */}
      <section id="specifications" className="py-20 border-b border-zinc-800 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
            <div>
              <span className="font-mono-tech text-xs tracking-widest text-zinc-500 uppercase block mb-2">
                [INDEX: 02 // PURITY PROTOCOLS]
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold font-instrument text-white">
                Engineered Hydration Architecture
              </h2>
            </div>
            <p className="text-zinc-400 text-sm max-w-md font-instrument">
              Every drop processed through an unyielding sequence of physical separation, molecular filtration, and sterile packaging.
            </p>
          </div>

          {/* 4 Purification Grid Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="lp-card-tech p-6 border border-zinc-800 bg-zinc-900/50">
              <span className="font-mono-tech text-xs text-zinc-500 block mb-3">STAGE // 01</span>
              <h3 className="text-base font-bold text-white mb-2 font-instrument">Micro-Sediment &amp; Carbon</h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-instrument">
                Multi-grade silica and activated carbon beds strip dissolved volatile organics, chlorine, odors, and particulate impurities down to 5 microns.
              </p>
            </div>

            <div className="lp-card-tech p-6 border border-zinc-800 bg-zinc-900/50">
              <span className="font-mono-tech text-xs text-zinc-500 block mb-3">STAGE // 02</span>
              <h3 className="text-base font-bold text-white mb-2 font-instrument">Reverse Osmosis Core</h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-instrument">
                High-pressure multi-stage polyamide thin-film composite membranes isolate dissolved solids, heavy metals, and microbes at 0.0001 microns.
              </p>
            </div>

            <div className="lp-card-tech p-6 border border-zinc-800 bg-zinc-900/50">
              <span className="font-mono-tech text-xs text-zinc-500 block mb-3">STAGE // 03</span>
              <h3 className="text-base font-bold text-white mb-2 font-instrument">Electrolyte Equilibrium</h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-instrument">
                Controlled infusion of pharmaceutical-grade Magnesium, Calcium, and Potassium ensures crisp taste and body-ready cellular hydration.
              </p>
            </div>

            <div className="lp-card-tech p-6 border border-zinc-800 bg-zinc-900/50">
              <span className="font-mono-tech text-xs text-zinc-500 block mb-3">STAGE // 04</span>
              <h3 className="text-base font-bold text-white mb-2 font-instrument">UV &amp; Tamperless Sealing</h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-instrument">
                Continuous high-intensity ultraviolet irradiation prior to automated hermetic capping in a positive-pressure sterile bottling cleanroom.
              </p>
            </div>

          </div>

          {/* Verification Banner */}
          <div className="mt-8 p-6 bg-zinc-900/80 border border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-zinc-950 border border-zinc-800 text-zinc-300">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider font-instrument">
                  Third-Party Laboratory Verification
                </h4>
                <p className="text-xs text-zinc-400 font-instrument">
                  Monthly microbiological and chemical validation by accredited testing bodies.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link to="/reports" className="lp-btn-secondary text-xs">
                <span>VIEW LAB REPORTS</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
              <Link to="/certificates" className="lp-btn-primary text-xs">
                <span>INSPECT CERTIFICATES</span>
                <Award className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* 5. PRODUCT CATALOG (MONOTONIC BENTO GRID, STRICT ZERO-RADIUS BUTTONS) */}
      <section id="products" className="py-20 border-b border-zinc-800 bg-zinc-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
            <div>
              <span className="font-mono-tech text-xs tracking-widest text-zinc-500 uppercase block mb-2">
                [INDEX: 03 // BOTTLE CATALOG]
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold font-instrument text-white">
                Certified Packaging &amp; Refills
              </h2>
            </div>
            <p className="text-zinc-400 text-sm max-w-md font-instrument">
              Commercial-grade 19L carboys, retail PET packages, and high-durability dispensing hardware for corporate and domestic facilities.
            </p>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {settings.products?.map((prod, idx) => (
              <div 
                key={prod.id || idx} 
                className="lp-card-tech border border-zinc-800 bg-zinc-900/60 flex flex-col justify-between"
              >
                <div>
                  {/* Card Header Spec */}
                  <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between text-[11px] font-mono-tech text-zinc-500">
                    <span>SKU // AQ-0{idx + 1}</span>
                    <span className="text-zinc-300 font-semibold">{prod.price}</span>
                  </div>

                  {/* Product Visual Container */}
                  <div className="h-60 p-6 flex items-center justify-center bg-zinc-950/40 overflow-hidden">
                    <img 
                      src={optImg(prod.image, 500)} 
                      alt={prod.name} 
                      loading="lazy" 
                      decoding="async"
                      className="max-h-full max-w-full object-contain filter drop-shadow-md hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  {/* Details Body */}
                  <div className="p-6 space-y-2">
                    <h3 className="text-base font-bold text-white font-instrument">
                      {prod.name}
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed font-instrument">
                      {prod.desc}
                    </p>
                  </div>
                </div>

                {/* Sharp Bottom Order Action */}
                <div className="p-6 pt-0">
                  <a 
                    href={getWhatsAppLink(prod.name)} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="lp-btn-secondary w-full justify-center text-xs font-mono-tech group"
                  >
                    <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-400 group-hover:text-white" />
                    <span>ORDER VIA WHATSAPP</span>
                  </a>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 6. ABOUT & CORPORATE PROFILE */}
      <section id="about" className="py-20 border-b border-zinc-800 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-6 space-y-6">
              <span className="font-mono-tech text-xs tracking-widest text-zinc-500 uppercase block">
                [INDEX: 04 // CORPORATE HERITAGE]
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold font-instrument text-white leading-tight">
                {settings.about_title}
              </h2>
              <p className="text-zinc-400 text-sm leading-relaxed font-instrument">
                {settings.about_intro}
              </p>

              <div className="border-t border-zinc-800/80 pt-6 space-y-4">
                <h3 className="text-lg font-bold text-zinc-200 font-instrument">
                  {settings.company_title}
                </h3>
                <p className="text-zinc-400 text-xs leading-relaxed font-instrument">
                  {settings.company_intro}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 font-mono-tech text-xs">
                <div className="p-4 bg-zinc-900 border border-zinc-800">
                  <span className="text-zinc-500 block mb-1">FOUNDED</span>
                  <span className="text-white font-bold text-sm">2019</span>
                </div>
                <div className="p-4 bg-zinc-900 border border-zinc-800">
                  <span className="text-zinc-500 block mb-1">DISTRIBUTION</span>
                  <span className="text-white font-bold text-sm">TWIN CITIES</span>
                </div>
              </div>
            </div>

            {/* Visual Engineering Machine Card */}
            <div className="lg:col-span-6">
              <div className="lp-card-tech border border-zinc-800 p-2 bg-zinc-900">
                <img 
                  src={optImg(settings.company_image, 1000)} 
                  alt={settings.company_title} 
                  className="w-full h-auto object-cover filter contrast-110"
                  loading="lazy"
                />
                <div className="p-4 font-mono-tech text-xs text-zinc-400 border-t border-zinc-800 mt-2 flex justify-between items-center">
                  <span>FACILITY: BOTTLING &amp; DISPATCH LINE</span>
                  <span className="text-emerald-400">VERIFIED</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 7. WADAANA INDUSTRIES ENGINEERING JV */}
      <section id="engineering" className="py-20 border-b border-zinc-800 bg-zinc-900/40 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="lp-card-tech p-8 sm:p-12 border border-zinc-700/80 bg-zinc-900/90 relative overflow-hidden">
            
            <div className="max-w-3xl space-y-5 relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-950 border border-zinc-700 text-zinc-300 font-mono-tech text-xs uppercase">
                <span className="w-2 h-2 bg-emerald-400" />
                <span>{settings.project_tag || 'ENGINEERING ALLIANCE'}</span>
              </div>

              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-instrument text-white leading-tight">
                {settings.project_title}
              </h2>

              <p className="text-zinc-300 text-sm sm:text-base leading-relaxed font-instrument">
                {settings.project_text}
              </p>

              <div className="pt-4 flex flex-wrap gap-3">
                <a 
                  href={getWhatsAppLink('Wadaana JV Inquiry')} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="lp-btn-primary"
                >
                  <span>{settings.project_button || 'Inquire Technical Specs'}</span>
                  <ArrowUpRight className="w-4 h-4" />
                </a>

                <a 
                  href="#facility" 
                  className="lp-btn-secondary"
                >
                  <span>PLANT SPECIFICATIONS</span>
                </a>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 8. FACILITY LOCATION & DISPATCH LOGISTICS */}
      <section id="facility" className="py-20 border-b border-zinc-800 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
            <div>
              <span className="font-mono-tech text-xs tracking-widest text-zinc-500 uppercase block mb-2">
                [INDEX: 05 // LOGISTICS HUB]
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold font-instrument text-white">
                {settings.location_title || 'Plant & Logistics Center'}
              </h2>
            </div>
            <p className="text-zinc-400 text-sm max-w-md font-instrument">
              Centralized staging terminal dispatching pure drinking water daily across Rawalpindi and Islamabad.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Location Specs */}
            <div className="lg:col-span-5 space-y-6">
              <div className="p-6 bg-zinc-900 border border-zinc-800 space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-xs font-mono-tech text-zinc-500 uppercase mb-1">FACILITY ADDRESS</span>
                    <span className="text-sm font-semibold text-white leading-relaxed font-instrument">
                      {settings.location}
                    </span>
                  </div>
                </div>

                <div className="border-t border-zinc-800 pt-4 flex items-start gap-3">
                  <Clock className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-xs font-mono-tech text-zinc-500 uppercase mb-1">HOURS OF DISPATCH</span>
                    <span className="text-sm font-semibold text-white font-instrument">
                      {settings.opening_hours}
                    </span>
                  </div>
                </div>

                <div className="border-t border-zinc-800 pt-4 flex items-start gap-3">
                  <Phone className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-xs font-mono-tech text-zinc-500 uppercase mb-1">LANDLINE CONTACT</span>
                    <a href={`tel:${settings.phone}`} className="text-sm font-semibold text-white hover:text-emerald-400 transition-colors font-mono-tech">
                      {settings.phone}
                    </a>
                  </div>
                </div>
              </div>

              {/* Zero-Radius Direction Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <a 
                  href={settings.map_link} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="lp-btn-primary flex-1 text-center justify-center"
                >
                  <span>OPEN GOOGLE MAPS</span>
                  <ExternalLink className="w-4 h-4" />
                </a>

                <a 
                  href={`tel:${settings.phone}`} 
                  className="lp-btn-secondary flex-1 text-center justify-center"
                >
                  <span>CALL DISPATCH</span>
                </a>
              </div>
            </div>

            {/* Embedded Satellite / Map Frame */}
            <div className="lg:col-span-7">
              <div className="lp-card-tech border border-zinc-800 p-2 bg-zinc-900 relative">
                <div className="relative w-full h-[360px] sm:h-[420px] bg-zinc-950 overflow-hidden">
                  <iframe
                    src={settings.map_embed}
                    title="Aqua Sphere Plant Map"
                    className="w-full h-full border-0 filter grayscale invert contrast-125 opacity-90"
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                  <div className="absolute top-3 left-3 bg-zinc-950/90 border border-zinc-800 px-3 py-1.5 text-[11px] font-mono-tech text-zinc-300">
                    GPS // 33.6105° N, 72.9819° E
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 9. DIRECT ORDER & DISPATCH INQUIRY FORM */}
      <section id="dispatch" className="py-20 border-b border-zinc-800 bg-zinc-900/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          
          <div className="text-center space-y-3 mb-10">
            <span className="font-mono-tech text-xs tracking-widest text-zinc-500 uppercase block">
              [INDEX: 06 // DIRECT DISPATCH INQUIRY]
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold font-instrument text-white">
              {settings.contact_title || 'Submit Dispatch Requisition'}
            </h2>
            <p className="text-zinc-400 text-sm max-w-lg mx-auto font-instrument">
              Submit your corporate contract or domestic refill requirement. Inquiries route instantaneously to plant dispatch on WhatsApp.
            </p>
          </div>

          <form onSubmit={handleContactSubmit} className="lp-card-tech p-6 sm:p-8 border border-zinc-800 bg-zinc-900/70 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono-tech text-zinc-400 uppercase mb-2">
                  FULL NAME / ORGANIZATION
                </label>
                <input 
                  type="text" 
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="e.g. Al-Farooq Enterprises" 
                  required 
                  className="lp-input"
                />
              </div>

              <div>
                <label className="block text-xs font-mono-tech text-zinc-400 uppercase mb-2">
                  CONTACT NUMBER / WHATSAPP
                </label>
                <input 
                  type="text" 
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="e.g. 0301-XXXXXXX" 
                  required 
                  className="lp-input font-mono-tech"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono-tech text-zinc-400 uppercase mb-2">
                REQUISITION DETAILS (QUANTITY &amp; LOCATION)
              </label>
              <textarea 
                rows="4" 
                value={contactMsg}
                onChange={(e) => setContactMsg(e.target.value)}
                placeholder="Specify requirements (e.g. 50x 19L Bottles weekly delivery to Rawalpindi Cantt)..."
                required
                className="lp-textarea"
              />
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs font-mono-tech text-zinc-500">
                Direct dispatch via WhatsApp encrypted protocol.
              </span>

              <button 
                type="submit" 
                className="lp-btn-primary w-full sm:w-auto px-8"
              >
                <Send className="w-4 h-4" />
                <span>TRANSMIT DISPATCH REQUISITION</span>
              </button>
            </div>
          </form>

        </div>
      </section>

      {/* 10. ARCHITECTURAL MONOCHROMATIC FOOTER */}
      <footer className="bg-zinc-950 border-t border-zinc-800 text-zinc-400 pt-16 pb-10 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-zinc-800/80">
            
            {/* Col 1: Brand & Identity */}
            <div className="space-y-4">
              <div className="bg-zinc-900 border border-zinc-800 inline-block p-2">
                <img 
                  src={optImg(settings.logo_url, 400)} 
                  alt={settings.site_name} 
                  className="h-12 w-auto object-contain filter brightness-110" 
                />
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed font-instrument">
                Aqua Sphere Mineral Water &amp; Empty Bottles. Certified multi-stage pure water production and wholesale delivery for Twin Cities.
              </p>
              <div className="font-mono-tech text-[11px] text-zinc-500 pt-1">
                REG NO: AS-PK-2019 &middot; PSQCA STANDARD
              </div>
            </div>

            {/* Col 2: Navigation Hierarchy */}
            <div>
              <span className="block font-mono-tech text-xs uppercase tracking-widest text-zinc-200 mb-4">
                NAVIGATION
              </span>
              <ul className="space-y-2.5 text-xs font-mono-tech text-zinc-400">
                <li><a href="#overview" className="hover:text-white transition-colors">01 // OVERVIEW</a></li>
                <li><a href="#specifications" className="hover:text-white transition-colors">02 // SPECIFICATIONS</a></li>
                <li><a href="#products" className="hover:text-white transition-colors">03 // CATALOG &amp; REFILLS</a></li>
                <li><a href="#engineering" className="hover:text-white transition-colors">04 // ENGINEERING JV</a></li>
                <li><Link to="/reports" className="hover:text-white transition-colors">05 // LAB REPORTS</Link></li>
                <li><Link to="/certificates" className="hover:text-white transition-colors">06 // CERTIFICATES</Link></li>
                <li><a href="#facility" className="hover:text-white transition-colors">07 // LOGISTICS HUB</a></li>
              </ul>
            </div>

            {/* Col 3: Direct Telemetry */}
            <div>
              <span className="block font-mono-tech text-xs uppercase tracking-widest text-zinc-200 mb-4">
                COMMUNICATIONS
              </span>
              <ul className="space-y-3 text-xs font-mono-tech">
                <li>
                  <span className="text-zinc-500 block text-[10px]">DIRECT LINE:</span>
                  <a href={`tel:${settings.phone}`} className="text-zinc-200 hover:text-white">
                    {settings.phone}
                  </a>
                </li>
                <li>
                  <span className="text-zinc-500 block text-[10px]">WHATSAPP DISPATCH:</span>
                  <a href={getWhatsAppLink()} target="_blank" rel="noreferrer" className="text-zinc-200 hover:text-emerald-400">
                    +{settings.whatsapp}
                  </a>
                </li>
                <li>
                  <span className="text-zinc-500 block text-[10px]">OPERATING TIMINGS:</span>
                  <span className="text-zinc-300">
                    {settings.opening_hours}
                  </span>
                </li>
              </ul>
            </div>

            {/* Col 4: Portals & Admin */}
            <div>
              <span className="block font-mono-tech text-xs uppercase tracking-widest text-zinc-200 mb-4">
                ENTERPRISE ACCESS
              </span>
              <div className="space-y-3 font-mono-tech text-xs">
                <Link 
                  to="/website-admin" 
                  className="lp-btn-secondary w-full justify-center text-xs"
                >
                  <Settings className="w-3.5 h-3.5 text-zinc-400" />
                  <span>WEBSITE ADMIN</span>
                </Link>

                <a 
                  href="https://theaquasphere.org/login" 
                  className="lp-btn-primary w-full justify-center text-xs"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>ERP SOFTWARE LOGIN</span>
                </a>
              </div>
            </div>

          </div>

          {/* Subfooter Copyright & Legal */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-mono-tech text-zinc-500">
            <p>&copy; {new Date().getFullYear()} {settings.site_name} Mineral Water Refinery. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <Link to="/reports" className="hover:text-zinc-300 transition-colors">Water Analysis</Link>
              <span className="text-zinc-800">|</span>
              <Link to="/certificates" className="hover:text-zinc-300 transition-colors">Certifications</Link>
              <span className="text-zinc-800">|</span>
              <a href="#overview" className="hover:text-zinc-300 transition-colors">Top &uarr;</a>
            </div>
          </div>

          {/* Massive Architectural Typographic Outline Watermark */}
          <div className="w-full max-w-full overflow-hidden select-none pointer-events-none relative flex justify-center mt-12 opacity-40">
            <svg 
              viewBox="0 0 1250 62" 
              className="w-full max-w-full h-auto block select-none pointer-events-none"
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <text 
                x="50%" 
                y="112" 
                textAnchor="middle" 
                fontFamily="'Instrument Sans', sans-serif" 
                fontWeight="900" 
                fontSize="140" 
                letterSpacing="0.12em"
                stroke="rgba(255, 255, 255, 0.25)" 
                strokeWidth="1.5" 
                fill="none"
              >
                AQUASPHERE
              </text>
            </svg>
          </div>

        </div>
      </footer>

      {/* 11. STRICTLY RECTANGULAR FLOATING WHATSAPP HUD ACTION (NO ROUNDED CORNERS) */}
      <a 
        href={getWhatsAppLink()} 
        target="_blank" 
        rel="noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-zinc-900 hover:bg-zinc-800 text-white font-mono-tech text-xs uppercase tracking-wider px-4 py-3 border border-zinc-700 shadow-2xl transition-all hover:-translate-y-0.5 rounded-none"
        title="Direct Dispatch via WhatsApp"
        style={{ borderRadius: 0 }}
      >
        <span className="w-2 h-2 bg-emerald-400 shrink-0" />
        <WhatsAppIcon className="w-4 h-4 text-emerald-400 shrink-0" />
        <span className="hidden sm:inline font-bold">DIRECT DISPATCH</span>
      </a>

    </div>
  );
}
