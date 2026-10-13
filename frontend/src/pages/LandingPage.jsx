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
  hero_text: "Clean, safe, and refreshing hydration for modern living. Multi-stage RO and UV purified pure drinking water, food-grade empty bottles, and reliable refills delivered across Rawalpindi & Islamabad.",
  hero_button: "Order Water Refills",
  about_title: "About Aqua Sphere",
  about_intro: "Welcome to Aqua Sphere, where naturally occurring electrolytes meet premium hydration standards for everyone.",
  company_title: "Company Introduction",
  company_intro: "Aqua Sphere Mineral Water, established in 2019, provides pure, clean, and affordable drinking water and durable food-grade containers.",
  company_image: "https://res.cloudinary.com/wgstyulb/image/upload/v1791005628/aqua-project-machine.png",
  technology_title: "Aqua Sphere Refinery",
  technology_text: "Aqua Sphere – Purity in Every Drop. Continuous micro-filtration and automated sterile bottling.",
  commitment_title: "Clean Water, Healthy Life.",
  commitment_text: "Aqua Sphere – Trusted Water, Trusted Choice. Certified TDS calibration and sealed tamper-proof closures.",
  project_tag: "Premium Water Project",
  project_title: "WADAANA INDUSTRIES PROUDLY ANNOUNCES ITS JV WITH AQUA SPHERE FOR STRONGER AND INNOVATIVE FUTURE",
  project_text: "Wadaana Industries professionally manufactures high-quality water production and purification systems with modern technology, reliable performance, and trusted standards.",
  project_button: "View Project Details",
  location_title: "Our Plant & Logistics Location",
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
      : 'Hello Aqua Sphere, I would like to inquire about pure drinking water delivery.';
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
    <div className="lp-root min-h-screen text-slate-800 selection:bg-sky-500 selection:text-white">
      
      {/* 1. TOP INFORMATION & TELEMETRY BAR (Monotonic Oceanic Navy) */}
      <div className="bg-gradient-to-r from-[#082f49] via-[#0369a1] to-[#0284c7] text-white text-xs sm:text-sm font-mono-tech py-2.5 px-4 sm:px-8 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2 text-center md:text-left">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-sky-300 inline-block" />
            <span>📞 Land Line: <strong className="font-bold tracking-wider">{settings.phone}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span>⏰ {settings.opening_hours}</span>
          </div>
          <div className="flex items-center gap-2 truncate max-w-md">
            <span>📍 {settings.location}</span>
          </div>
        </div>
      </div>

      {/* 2. MAIN NAVBAR (Crisp Pure White Glass with Sharp Rectangular Actions) */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-sky-100 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-20 sm:h-24 flex items-center justify-between">
          
          {/* Logo */}
          <a href="#overview" className="flex items-center group py-2">
            <img 
              src={optImg(settings.logo_url, 600)} 
              alt={settings.site_name} 
              className="h-14 sm:h-16 md:h-20 w-auto object-contain transition-transform group-hover:scale-102"
              loading="eager"
            />
          </a>

          {/* Desktop Nav Links (Instrument Sans & Mono accents) */}
          <nav className="hidden lg:flex items-center gap-6 text-xs uppercase tracking-widest font-mono-tech text-slate-600">
            <a href="#overview" className="hover:text-sky-700 transition-colors py-1">Home</a>
            <a href="#specifications" className="hover:text-sky-700 transition-colors py-1">Purity Specs</a>
            <a href="#products" className="hover:text-sky-700 transition-colors py-1">Products</a>
            <a href="#about" className="hover:text-sky-700 transition-colors py-1">About</a>
            <Link to="/reports" className="hover:text-sky-700 transition-colors py-1 flex items-center gap-1">
              Lab Reports <ArrowUpRight className="w-3 h-3 text-sky-500" />
            </Link>
            <Link to="/certificates" className="hover:text-sky-700 transition-colors py-1 flex items-center gap-1">
              Certificates <ArrowUpRight className="w-3 h-3 text-sky-500" />
            </Link>
            <a href="#facility" className="hover:text-sky-700 transition-colors py-1">Location</a>
            <a href="#dispatch" className="hover:text-sky-700 transition-colors py-1">Contact</a>
          </nav>

          {/* Header Action Buttons (Strictly Zero Radius) */}
          <div className="hidden sm:flex items-center gap-2.5">
            <Link 
              to="/website-admin" 
              className="lp-btn-secondary px-3.5 py-2 text-xs font-mono-tech"
              title="Edit Landing Page Content"
            >
              <Settings className="w-3.5 h-3.5 text-sky-600" />
              <span>Website Admin</span>
            </Link>

            <a 
              href="https://theaquasphere.org/login" 
              className="lp-btn-primary px-4 py-2 text-xs font-mono-tech"
              title="Open Software ERP Portal"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Software Admin</span>
            </a>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            onClick={() => setMobileMenuOpen(prev => !prev)} 
            className="lg:hidden p-2 text-slate-700 hover:text-sky-700 border border-slate-200 bg-white rounded-none focus:outline-none"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-sky-100 px-6 py-6 flex flex-col gap-3.5 text-xs font-mono-tech uppercase tracking-wider text-slate-700 shadow-xl">
            <a href="#overview" onClick={() => setMobileMenuOpen(false)} className="hover:text-sky-700 py-1">Home</a>
            <a href="#specifications" onClick={() => setMobileMenuOpen(false)} className="hover:text-sky-700 py-1">Purity Specs</a>
            <a href="#products" onClick={() => setMobileMenuOpen(false)} className="hover:text-sky-700 py-1">Products</a>
            <a href="#about" onClick={() => setMobileMenuOpen(false)} className="hover:text-sky-700 py-1">About Us</a>
            <Link to="/reports" onClick={() => setMobileMenuOpen(false)} className="hover:text-sky-700 py-1">Lab Reports</Link>
            <Link to="/certificates" onClick={() => setMobileMenuOpen(false)} className="hover:text-sky-700 py-1">Certificates</Link>
            <a href="#facility" onClick={() => setMobileMenuOpen(false)} className="hover:text-sky-700 py-1">Location</a>
            <a href="#dispatch" onClick={() => setMobileMenuOpen(false)} className="hover:text-sky-700 py-1">Contact Dispatch</a>
            
            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2.5">
              <Link 
                to="/website-admin" 
                onClick={() => setMobileMenuOpen(false)}
                className="lp-btn-secondary w-full justify-center py-2.5 text-xs font-mono-tech"
              >
                <Settings className="w-3.5 h-3.5 text-sky-600" />
                <span>Website Admin</span>
              </Link>
              <a 
                href="https://theaquasphere.org/login" 
                onClick={() => setMobileMenuOpen(false)}
                className="lp-btn-primary w-full justify-center py-2.5 text-xs font-mono-tech"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Software Admin</span>
              </a>
            </div>
          </div>
        )}
      </header>

      {/* 3. HERO (Luminous Pure Water Backdrop + Instrument Typography + Zero-Radius Controls) */}
      <section id="overview" className="relative border-b border-sky-100 pt-14 pb-20 lg:pt-24 lg:pb-32 overflow-hidden">
        {/* Subtle Background Photography */}
        <div 
          className="absolute inset-0 z-0 pointer-events-none opacity-15 filter contrast-110 bg-cover bg-center"
          style={{ backgroundImage: `url(${optImg(settings.hero_bg_url, 1600)})` }}
        />
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-sky-50/50 via-white/80 to-white" />

        <div className="max-w-7xl mx-auto px-4 sm:px-8 relative z-10">
          
          {/* Instrumental Section Index Tag */}
          <div className="flex items-center gap-2 mb-6">
            <span className="font-mono-tech text-xs tracking-widest text-sky-700 uppercase font-semibold">
              [INDEX: 01 // OVERVIEW]
            </span>
            <span className="w-12 h-px bg-sky-200" />
            <span className="font-mono-tech text-xs text-slate-500 uppercase">
              PURE DRINKING WATER REFINERY &middot; TWIN CITIES
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-8 space-y-6">
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900 leading-[1.05]">
                <span className="block font-instrument">{settings.hero_title}</span>
                <span className="block font-instrument-serif italic font-normal text-sky-800">
                  {settings.hero_subtitle}
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed font-instrument">
                {settings.hero_text}
              </p>

              {/* Zero-Radius Sharp Action Controls */}
              <div className="pt-4 flex flex-wrap items-center gap-3.5">
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
                  <ArrowUpRight className="w-4 h-4 text-sky-600" />
                </a>

                <Link 
                  to="/reports" 
                  className="lp-btn-secondary font-mono-tech"
                >
                  <FileText className="w-4 h-4 text-sky-600" />
                  <span>LAB TEST REPORTS</span>
                </Link>
              </div>
            </div>

            {/* Precision Water Quality Telemetry Card (Pure White Surface) */}
            <div className="lg:col-span-4">
              <div className="lp-card-tech p-6 space-y-4 border border-sky-100 bg-white">
                <div className="flex items-center justify-between border-b border-sky-100 pb-3">
                  <span className="font-mono-tech text-[11px] text-sky-800 uppercase tracking-widest flex items-center gap-1.5 font-bold">
                    <Activity className="w-3.5 h-3.5 text-sky-600" />
                    LIVE QUALITY TELEMETRY
                  </span>
                  <span className="font-mono-tech text-[10px] text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 font-semibold">
                    NOMINAL
                  </span>
                </div>

                <div className="space-y-3 font-mono-tech text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="text-slate-500">TDS CALIBRATION:</span>
                    <span className="text-slate-900 font-bold">110 &ndash; 130 PPM</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="text-slate-500">PH EQUILIBRIUM:</span>
                    <span className="text-slate-900 font-bold">7.2 &ndash; 7.6 (NEUTRAL)</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="text-slate-500">PURIFICATION:</span>
                    <span className="text-slate-900 font-bold">9-STAGE HYBRID RO+UV</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="text-slate-500">STERILIZATION:</span>
                    <span className="text-slate-900 font-bold">UV + OZONE INJECTION</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500">OUTPUT CAPACITY:</span>
                    <span className="text-slate-900 font-bold">50,000 L / 24H</span>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="p-3 bg-sky-50/70 border border-sky-100 text-[11px] text-slate-600 font-mono-tech">
                    <span className="text-sky-900 font-bold block mb-1">FOOD-GRADE SANITIZATION:</span>
                    Continuous automated clean-in-place (CIP) wash cycles with food-grade ozone disinfection.
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 4. TECHNICAL SPECIFICATIONS & PURIFICATION STAGES */}
      <section id="specifications" className="py-20 border-b border-sky-100 bg-sky-50/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
            <div>
              <span className="font-mono-tech text-xs tracking-widest text-sky-700 uppercase font-semibold block mb-2">
                [INDEX: 02 // PURITY PROTOCOLS]
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold font-instrument text-slate-900">
                Engineered Hydration Architecture
              </h2>
            </div>
            <p className="text-slate-600 text-sm max-w-md font-instrument">
              Every drop processed through an unyielding sequence of physical separation, molecular reverse osmosis, and sterile bottling.
            </p>
          </div>

          {/* 4 Purification Grid Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            
            <div className="lp-card-tech p-6 bg-white border border-sky-100">
              <span className="font-mono-tech text-xs text-sky-700 block mb-3 font-semibold">STAGE // 01</span>
              <h3 className="text-base font-bold text-slate-900 mb-2 font-instrument">Multi-Media Filtration</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-instrument">
                High-grade quartz sand and activated carbon beds strip dissolved volatile organics, chlorine, odors, and particles down to 5 microns.
              </p>
            </div>

            <div className="lp-card-tech p-6 bg-white border border-sky-100">
              <span className="font-mono-tech text-xs text-sky-700 block mb-3 font-semibold">STAGE // 02</span>
              <h3 className="text-base font-bold text-slate-900 mb-2 font-instrument">Reverse Osmosis Core</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-instrument">
                High-pressure polyamide thin-film composite membranes isolate dissolved solids, heavy metals, and microbes at 0.0001 microns.
              </p>
            </div>

            <div className="lp-card-tech p-6 bg-white border border-sky-100">
              <span className="font-mono-tech text-xs text-sky-700 block mb-3 font-semibold">STAGE // 03</span>
              <h3 className="text-base font-bold text-slate-900 mb-2 font-instrument">Mineral Remineralization</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-instrument">
                Controlled dosing of pharmaceutical-grade Magnesium, Calcium, and Potassium ensures a balanced pH and cellular hydration.
              </p>
            </div>

            <div className="lp-card-tech p-6 bg-white border border-sky-100">
              <span className="font-mono-tech text-xs text-sky-700 block mb-3 font-semibold">STAGE // 04</span>
              <h3 className="text-base font-bold text-slate-900 mb-2 font-instrument">UV &amp; Tamperless Sealing</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-instrument">
                Continuous high-intensity ultraviolet irradiation prior to automated hermetic capping in a positive-pressure sterile cleanroom.
              </p>
            </div>

          </div>

          {/* Verification Banner */}
          <div className="mt-8 p-6 bg-white border border-sky-200 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xs">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-sky-50 border border-sky-100 text-sky-700">
                <ShieldCheck className="w-6 h-6 text-sky-600" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-instrument">
                  Third-Party Laboratory Verification
                </h4>
                <p className="text-xs text-slate-600 font-instrument">
                  Routine microbiological and chemical validation by accredited PSQCA testing standards.
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

      {/* 5. PRODUCT CATALOG (MONOTONIC LIGHT BENTO GRID, STRICT ZERO-RADIUS BUTTONS) */}
      <section id="products" className="py-20 border-b border-sky-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
            <div>
              <span className="font-mono-tech text-xs tracking-widest text-sky-700 uppercase font-semibold block mb-2">
                [INDEX: 03 // BOTTLE CATALOG]
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold font-instrument text-slate-900">
                Certified Packaging &amp; Refills
              </h2>
            </div>
            <p className="text-slate-600 text-sm max-w-md font-instrument">
              Food-grade 19L carboys, retail mineral water packs, and high-durability dispensing hardware for corporate and domestic facilities.
            </p>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {settings.products?.map((prod, idx) => (
              <div 
                key={prod.id || idx} 
                className="lp-card-tech border border-sky-100 bg-white flex flex-col justify-between"
              >
                <div>
                  {/* Card Header Spec */}
                  <div className="p-4 border-b border-sky-50 flex items-center justify-between text-[11px] font-mono-tech text-slate-500 bg-sky-50/30">
                    <span>SKU // AQ-0{idx + 1}</span>
                    <span className="text-sky-800 font-bold">{prod.price}</span>
                  </div>

                  {/* Product Visual Container */}
                  <div className="h-60 p-6 flex items-center justify-center bg-radial from-sky-50/60 to-white overflow-hidden">
                    <img 
                      src={optImg(prod.image, 500)} 
                      alt={prod.name} 
                      loading="lazy" 
                      decoding="async"
                      className="max-h-full max-w-full object-contain filter drop-shadow-sm hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  {/* Details Body */}
                  <div className="p-6 space-y-2">
                    <h3 className="text-base font-bold text-slate-900 font-instrument">
                      {prod.name}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed font-instrument">
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
                    <WhatsAppIcon className="w-3.5 h-3.5 text-sky-600 group-hover:text-sky-800" />
                    <span>ORDER VIA WHATSAPP</span>
                  </a>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 6. ABOUT & CORPORATE PROFILE */}
      <section id="about" className="py-20 border-b border-sky-100 bg-sky-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-6 space-y-6">
              <span className="font-mono-tech text-xs tracking-widest text-sky-700 uppercase font-semibold block">
                [INDEX: 04 // CORPORATE HERITAGE]
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold font-instrument text-slate-900 leading-tight">
                {settings.about_title}
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed font-instrument">
                {settings.about_intro}
              </p>

              <div className="border-t border-sky-100 pt-6 space-y-3">
                <h3 className="text-lg font-bold text-slate-800 font-instrument">
                  {settings.company_title}
                </h3>
                <p className="text-slate-600 text-xs leading-relaxed font-instrument">
                  {settings.company_intro}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 font-mono-tech text-xs">
                <div className="p-4 bg-white border border-sky-100 shadow-2xs">
                  <span className="text-slate-500 block mb-1">FOUNDED</span>
                  <span className="text-sky-900 font-bold text-sm">2019</span>
                </div>
                <div className="p-4 bg-white border border-sky-100 shadow-2xs">
                  <span className="text-slate-500 block mb-1">DISTRIBUTION</span>
                  <span className="text-sky-900 font-bold text-sm">TWIN CITIES</span>
                </div>
              </div>
            </div>

            {/* Visual Engineering Machine Card */}
            <div className="lg:col-span-6">
              <div className="lp-card-tech border border-sky-100 p-2 bg-white">
                <img 
                  src={optImg(settings.company_image, 1000)} 
                  alt={settings.company_title} 
                  className="w-full h-auto object-cover"
                  loading="lazy"
                />
                <div className="p-4 font-mono-tech text-xs text-slate-600 border-t border-sky-50 mt-2 flex justify-between items-center bg-sky-50/30">
                  <span>FACILITY: BOTTLING &amp; DISPATCH LINE</span>
                  <span className="text-sky-700 font-bold">VERIFIED</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 7. WADAANA INDUSTRIES ENGINEERING JV */}
      <section id="engineering" className="py-20 border-b border-sky-100 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div 
            className="lp-card-tech p-8 sm:p-12 border border-sky-200 relative overflow-hidden bg-cover bg-center"
            style={{
              backgroundImage: `linear-gradient(90deg, rgba(8,47,73,0.92) 0%, rgba(3,105,161,0.85) 50%, rgba(2,132,199,0.7) 100%), url(${optImg(settings.company_image, 1400)})`
            }}
          >
            <div className="max-w-3xl space-y-5 relative z-10 text-white">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md border border-white/20 text-white font-mono-tech text-xs uppercase">
                <span className="w-2 h-2 bg-sky-300" />
                <span>{settings.project_tag || 'ENGINEERING ALLIANCE'}</span>
              </div>

              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-instrument leading-tight text-white">
                {settings.project_title}
              </h2>

              <p className="text-sky-100 text-sm sm:text-base leading-relaxed font-instrument">
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
      <section id="facility" className="py-20 border-b border-sky-100 bg-sky-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
            <div>
              <span className="font-mono-tech text-xs tracking-widest text-sky-700 uppercase font-semibold block mb-2">
                [INDEX: 05 // LOGISTICS HUB]
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold font-instrument text-slate-900">
                {settings.location_title || 'Plant & Logistics Center'}
              </h2>
            </div>
            <p className="text-slate-600 text-sm max-w-md font-instrument">
              Centralized staging terminal dispatching pure drinking water daily across Rawalpindi and Islamabad.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Location Specs */}
            <div className="lg:col-span-5 space-y-6">
              <div className="p-6 bg-white border border-sky-100 space-y-4 shadow-xs">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-xs font-mono-tech text-slate-500 uppercase mb-1">FACILITY ADDRESS</span>
                    <span className="text-sm font-semibold text-slate-900 leading-relaxed font-instrument">
                      {settings.location}
                    </span>
                  </div>
                </div>

                <div className="border-t border-sky-50 pt-4 flex items-start gap-3">
                  <Clock className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-xs font-mono-tech text-slate-500 uppercase mb-1">HOURS OF DISPATCH</span>
                    <span className="text-sm font-semibold text-slate-900 font-instrument">
                      {settings.opening_hours}
                    </span>
                  </div>
                </div>

                <div className="border-t border-sky-50 pt-4 flex items-start gap-3">
                  <Phone className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-xs font-mono-tech text-slate-500 uppercase mb-1">LANDLINE CONTACT</span>
                    <a href={`tel:${settings.phone}`} className="text-sm font-semibold text-sky-800 hover:text-sky-600 transition-colors font-mono-tech">
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
              <div className="lp-card-tech border border-sky-100 p-2 bg-white relative shadow-xs">
                <div className="relative w-full h-[360px] sm:h-[420px] bg-slate-100 overflow-hidden">
                  <iframe
                    src={settings.map_embed}
                    title="Aqua Sphere Plant Map"
                    className="w-full h-full border-0"
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                  <div className="absolute top-3 left-3 bg-white/95 border border-sky-100 px-3 py-1.5 text-[11px] font-mono-tech text-slate-700 shadow-sm">
                    GPS // 33.6105° N, 72.9819° E
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 9. DIRECT ORDER & DISPATCH INQUIRY FORM */}
      <section id="dispatch" className="py-20 border-b border-sky-100 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-8">
          
          <div className="text-center space-y-3 mb-10">
            <span className="font-mono-tech text-xs tracking-widest text-sky-700 uppercase font-semibold block">
              [INDEX: 06 // DIRECT DISPATCH INQUIRY]
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold font-instrument text-slate-900">
              {settings.contact_title || 'Submit Dispatch Requisition'}
            </h2>
            <p className="text-slate-600 text-sm max-w-lg mx-auto font-instrument">
              Submit your corporate contract or domestic refill requirement. Inquiries route instantaneously to plant dispatch on WhatsApp.
            </p>
          </div>

          <form onSubmit={handleContactSubmit} className="lp-card-tech p-6 sm:p-8 border border-sky-100 bg-white space-y-5 shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono-tech text-slate-700 uppercase mb-2 font-semibold">
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
                <label className="block text-xs font-mono-tech text-slate-700 uppercase mb-2 font-semibold">
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
              <label className="block text-xs font-mono-tech text-slate-700 uppercase mb-2 font-semibold">
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
              <span className="text-xs font-mono-tech text-slate-500">
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

      {/* 10. ICONIC MONOTONIC OCEANIC FOOTER (Preserving Brand Heritage) */}
      <footer className="bg-[#080d1a] text-slate-300 border-t border-slate-800 pt-16 pb-0 px-4 sm:px-8 relative overflow-hidden w-full max-w-full">
        {/* Subtle Watermark Logo Emblem in Background */}
        <div className="absolute right-0 top-12 pointer-events-none opacity-[0.035] select-none overflow-hidden max-w-full">
          <img src={optImg(settings.logo_url, 600)} alt="" className="w-[450px] h-[450px] object-contain translate-x-8" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pb-10 border-b border-slate-800/80">
            
            {/* Col 1: About Aqua Sphere & Logo */}
            <div className="space-y-4">
              <div className="inline-flex items-center bg-white p-3 shadow-md">
                <img 
                  src={optImg(settings.logo_url, 600)} 
                  alt={settings.site_name} 
                  className="h-14 sm:h-16 w-auto object-contain" 
                />
              </div>
              <p className="text-slate-400 text-xs leading-relaxed font-instrument">
                Aqua Sphere Mineral Water &amp; Empty Bottles. Certified multi-stage pure water production and wholesale delivery for Twin Cities.
              </p>
              
              {/* Quick Action Icon Pills (Strictly Zero Radius) */}
              <div className="flex items-center gap-2 pt-2">
                <a 
                  href={getWhatsAppLink()} 
                  target="_blank" 
                  rel="noreferrer" 
                  title="WhatsApp" 
                  className="w-9 h-9 bg-slate-900 border border-slate-800 hover:border-sky-400 text-slate-300 hover:text-white flex items-center justify-center transition-all"
                  style={{ borderRadius: 0 }}
                >
                  <WhatsAppIcon className="w-4 h-4" />
                </a>
                <a 
                  href={`tel:${settings.phone}`} 
                  title="Call Us" 
                  className="w-9 h-9 bg-slate-900 border border-slate-800 hover:border-sky-400 text-slate-300 hover:text-white flex items-center justify-center transition-all"
                  style={{ borderRadius: 0 }}
                >
                  <Phone className="w-4 h-4" />
                </a>
                <a 
                  href={settings.map_link} 
                  target="_blank" 
                  rel="noreferrer" 
                  title="Open Location" 
                  className="w-9 h-9 bg-slate-900 border border-slate-800 hover:border-sky-400 text-slate-300 hover:text-white flex items-center justify-center transition-all"
                  style={{ borderRadius: 0 }}
                >
                  <MapPin className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Col 2: Navigation Links */}
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4 font-mono-tech">Quick Navigation</h4>
              <ul className="space-y-2.5 text-xs text-slate-400 font-mono-tech">
                <li><a href="#overview" className="hover:text-sky-400 transition-colors">01 // Home</a></li>
                <li><a href="#specifications" className="hover:text-sky-400 transition-colors">02 // Purity Specs</a></li>
                <li><a href="#products" className="hover:text-sky-400 transition-colors">03 // Products &amp; Refills</a></li>
                <li><a href="#about" className="hover:text-sky-400 transition-colors">04 // About Us</a></li>
                <li><Link to="/reports" className="hover:text-sky-400 transition-colors">05 // Lab Reports</Link></li>
                <li><Link to="/certificates" className="hover:text-sky-400 transition-colors">06 // Certificates</Link></li>
                <li><a href="#facility" className="hover:text-sky-400 transition-colors">07 // Plant Location</a></li>
                <li><a href="#dispatch" className="hover:text-sky-400 transition-colors">08 // Contact Dispatch</a></li>
              </ul>
            </div>

            {/* Col 3: Direct Contact Info */}
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4 font-mono-tech">Contact Details</h4>
              <ul className="space-y-3 text-xs font-mono-tech text-slate-400">
                <li className="flex items-start gap-2.5">
                  <Phone className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-[10px] uppercase text-slate-500">Landline</span>
                    <a href={`tel:${settings.phone}`} className="text-slate-200 hover:text-sky-400">
                      {settings.phone}
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <WhatsAppIcon className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-[10px] uppercase text-slate-500">WhatsApp Orders</span>
                    <a href={getWhatsAppLink()} target="_blank" rel="noreferrer" className="text-slate-200 hover:text-sky-400">
                      +{settings.whatsapp}
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-[10px] uppercase text-slate-500">Working Hours</span>
                    <span className="text-slate-200">{settings.opening_hours}</span>
                  </div>
                </li>
              </ul>
            </div>

            {/* Col 4: Enterprise Portals */}
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4 font-mono-tech">Enterprise Portals</h4>
              <div className="space-y-3 font-mono-tech text-xs">
                <Link 
                  to="/website-admin" 
                  className="lp-btn-secondary w-full justify-center text-xs"
                >
                  <Settings className="w-3.5 h-3.5 text-sky-600" />
                  <span>Website Admin</span>
                </Link>

                <a 
                  href="https://theaquasphere.org/login" 
                  className="lp-btn-primary w-full justify-center text-xs"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Software ERP Login</span>
                </a>
              </div>
            </div>

          </div>

          {/* Bottom Copyright & Sub-links */}
          <div className="pt-4 pb-2 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono-tech text-slate-400">
            <p>&copy; {new Date().getFullYear()} {settings.site_name} Mineral Water. All rights reserved.</p>
            <div className="flex gap-6">
              <Link to="/website-admin" className="hover:text-sky-400 transition-colors">Website Admin</Link>
              <a href="https://theaquasphere.org/login" className="hover:text-sky-400 transition-colors">Software Login</a>
            </div>
          </div>
        </div>

        {/* 10. ICONIC HALF-CUT HOLLOW OUTLINED "AQUASPHERE" */}
        <div className="w-full max-w-full overflow-hidden select-none pointer-events-none relative flex justify-center mt-2">
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
              letterSpacing="0.08em"
              stroke="rgba(255, 255, 255, 0.45)" 
              strokeWidth="2" 
              fill="rgba(255, 255, 255, 0.02)"
            >
              AQUASPHERE
            </text>
          </svg>
        </div>
      </footer>

      {/* 11. STRICTLY RECTANGULAR FLOATING WHATSAPP BUTTON (NO ROUNDED CORNERS) */}
      <a 
        href={getWhatsAppLink()} 
        target="_blank" 
        rel="noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-700 hover:to-sky-800 text-white font-mono-tech text-xs uppercase tracking-wider px-4 py-3 border border-sky-500 shadow-xl transition-all hover:-translate-y-0.5 rounded-none"
        title="Direct Dispatch via WhatsApp"
        style={{ borderRadius: 0 }}
      >
        <WhatsAppIcon className="w-4 h-4 text-white shrink-0" />
        <span className="hidden sm:inline font-bold">ORDER ON WHATSAPP</span>
      </a>

    </div>
  );
}
