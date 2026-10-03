import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import LogoLoop from '../components/ui/LogoLoop';
import { 
  Phone, 
  Clock, 
  MapPin, 
  Droplets, 
  ShieldCheck, 
  Sparkles, 
  Award, 
  ArrowRight, 
  CheckCircle2, 
  Menu, 
  X, 
  Settings, 
  LogIn,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Truck,
  Package,
  Layers,
  HelpCircle
} from 'lucide-react';

// Official WhatsApp icon SVG in pure React
function WhatsAppIcon({ className = "w-5 h-5" }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2ZM12.04 20.15C10.56 20.15 9.11 19.76 7.85 19.01L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.81 13.47 3.81 11.91C3.81 7.37 7.5 3.68 12.04 3.68C14.25 3.68 16.31 4.54 17.87 6.1C19.42 7.66 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15ZM16.57 14.41C16.32 14.28 15.1 13.68 14.88 13.6C14.65 13.52 14.49 13.48 14.32 13.73C14.16 13.98 13.69 14.53 13.55 14.69C13.41 14.85 13.27 14.87 13.02 14.75C12.78 14.63 11.99 14.37 11.06 13.54C10.33 12.89 9.84 12.09 9.7 11.84C9.56 11.6 9.68 11.46 9.8 11.34C9.91 11.23 10.05 11.05 10.17 10.91C10.29 10.77 10.33 10.66 10.41 10.5C10.49 10.34 10.45 10.2 10.39 10.08C10.33 9.96 9.84 8.76 9.64 8.27C9.44 7.79 9.24 7.85 9.09 7.84C8.95 7.84 8.78 7.84 8.62 7.84C8.46 7.84 8.19 7.9 7.97 8.14C7.74 8.39 7.11 8.98 7.11 10.18C7.11 11.38 7.99 12.54 8.11 12.7C8.23 12.86 9.83 15.33 12.29 16.39C12.87 16.64 13.33 16.79 13.68 16.9C14.27 17.09 14.81 17.06 15.23 17C15.7 16.93 16.68 16.41 16.88 15.83C17.09 15.26 17.09 14.77 17.03 14.67C16.96 14.57 16.82 14.53 16.57 14.41Z" />
    </svg>
  );
}

// ponytail: instant Cloudinary compression + auto-format (f_auto,q_auto) + width constraint
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
  hero_title: "100% Pure Drinking Water",
  hero_subtitle: "19L Water Refills & Wholesale Empty Bottles",
  hero_text: "Certified pure drinking water and food-grade empty bottles delivered to your doorstep across Rawalpindi and Islamabad. Multi-stage RO and UV purified water for healthy homes, corporate offices, and wholesale supply.",
  hero_button: "Order Pure Water",
  about_title: "About Aqua Sphere",
  about_intro: "Welcome to Aqua Sphere, your trusted mineral water plant and wholesale empty bottles supplier. Where naturally occurring electrolytes meet premium pure water hydration for everyone.",
  company_title: "Certified Pure Water & Bottling Facility",
  company_intro: "Aqua Sphere Mineral Water, established in 2019, provides 100% pure, clean, and affordable drinking water and durable empty bottles tailored for residences, corporate offices, restaurants, and distributors.",
  company_image: "https://res.cloudinary.com/wgstyulb/image/upload/v1791005628/aqua-project-machine.png",
  technology_image: "https://res.cloudinary.com/wgstyulb/image/upload/v1791005781/wadana-machine-hero.png",
  technology_title: "Advanced Reverse Osmosis & Purification",
  technology_text: "Aqua Sphere – Purity in Every Drop with state-of-the-art multi-stage reverse osmosis (RO), micron filtration, UV sterilisation, and automated hygienic bottling ensuring zero contamination in every pure water bottle.",
  commitment_title: "Pure Water, Healthy Life.",
  commitment_text: "Aqua Sphere – Trusted Water, Trusted Choice. Delivering consistent pure water refills, empty bottles, and dispensers straight to your doorstep across Rawalpindi & Islamabad.",
  location_title: "Our Water Plant Location",
  map_embed: "https://www.google.com/maps?q=AQUA%20SPHERE%2C%2033.6104649%2C72.9818914&output=embed",
  map_link: "https://www.google.com/maps/place/AQUA+SPHERE/@33.6104612,72.9819,599m/data=!3m1!1e3!4m6!3m5!1s0x38df970024408d31:0xa9c9cb0ebd2d1923!8m2!3d33.6104649!4d72.9818914!16s%2Fg%2F11xg3w12kj?hl=en&entry=ttu",
  products: [
    {
      id: "p1",
      name: "19L Pure Water Bottle & Refill",
      desc: "RO & UV Purified Mineral Water Refill (PKR 280) / New Bottle Security Deposit (PKR 1,000)",
      price: "PKR 1,000",
      image: "https://res.cloudinary.com/wgstyulb/image/upload/v1791005454/product_1777146556_7174.png"
    },
    {
      id: "p2",
      name: "1.5L Pure Water Pack (Pack of 6)",
      desc: "Daily hydration mineral drinking water pack for dining, travel, and events",
      price: "PKR 100",
      image: "https://res.cloudinary.com/wgstyulb/image/upload/v1791005473/product_1777198208_4752.jpg"
    },
    {
      id: "p3",
      name: "500ml Pure Drinking Water (Pack of 12)",
      desc: "Portable on-the-go pure water bottles for conferences, schools, and offices",
      price: "PKR 50",
      image: "https://res.cloudinary.com/wgstyulb/image/upload/v1791005454/product_1777145702_1235.png"
    },
    {
      id: "p4",
      name: "Instant Hot & Cold Water Dispenser",
      desc: "Heavy-duty electric pure water dispenser with instant hot & cold taps for 19L bottles",
      price: "PKR 35,000",
      image: "https://res.cloudinary.com/wgstyulb/image/upload/v1791005468/product_1777146854_7886.png"
    },
    {
      id: "p5",
      name: "Table Top Water Dispenser",
      desc: "Compact counter dispenser for pure water hydration in apartments & office desks",
      price: "PKR 2,500",
      image: "https://res.cloudinary.com/wgstyulb/image/upload/v1791005489/product_1777147220_8492.png"
    },
    {
      id: "p6",
      name: "Tap & Stand for 19L Empty Bottles",
      desc: "Ergonomic manual pouring tap & durable metal stand for 19L pure water bottles",
      price: "PKR 1,500",
      image: "https://res.cloudinary.com/wgstyulb/image/upload/v1791005490/product_1777147740_9305.png"
    }
  ]
};

const BOTTLE_GALLERY = [
  { id: 1, url: 'https://res.cloudinary.com/wgstyulb/image/upload/v1791005696/bottle-design-1.png' },
  { id: 2, url: 'https://res.cloudinary.com/wgstyulb/image/upload/v1791005721/bottle-design-2.png' },
  { id: 3, url: 'https://res.cloudinary.com/wgstyulb/image/upload/v1791005725/bottle-design-3.png' },
  { id: 4, url: 'https://res.cloudinary.com/wgstyulb/image/upload/v1791005717/bottle-design-4.png' },
  { id: 5, url: 'https://res.cloudinary.com/wgstyulb/image/upload/v1791005714/bottle-design-5.png' },
  { id: 6, url: 'https://res.cloudinary.com/wgstyulb/image/upload/v1791005719/bottle-design-6.png' }
];

const SEO_FAQS = [
  {
    q: "How can I order 19L pure drinking water delivery in Rawalpindi & Islamabad?",
    a: "You can easily order 19L pure drinking water delivery by messaging us directly on WhatsApp at +92 301 5072233 or calling our plant helpline at 051-545-443-8. Our distribution vans deliver fresh pure water daily to homes, corporate offices, universities, and commercial facilities."
  },
  {
    q: "Can I purchase empty 19L water bottles in wholesale or retail?",
    a: "Yes! AquaSphere is a premier manufacturer and distributor of food-grade, BPA-free empty water bottles. We supply 19L polycarbonate empty bottles, 500ml/1.5L PET bottles, leakproof caps, and ergonomic handles for both individual home use and bulk wholesale distribution."
  },
  {
    q: "What purification process is used to make AquaSphere pure water?",
    a: "Our drinking water goes through advanced 7-stage purification including multi-micron sediment filtration, high-pressure Reverse Osmosis (RO), activated carbon absorption, UV sterilisation, and balanced re-mineralisation with Calcium, Magnesium, and Sodium to ensure optimal health, crisp taste, and zero biological contaminants."
  },
  {
    q: "What is the price of 19L pure water refill vs a new empty bottle?",
    a: "A 19L pure water refill is only PKR 280 (when you provide an empty bottle for exchange). If you need a brand-new, sterile 19L food-grade empty bottle, the one-time security deposit is PKR 1,000. Corporate bulk discounts are available for recurring commercial accounts."
  },
  {
    q: "Do you supply water dispensers and accessories for offices and homes?",
    a: "Yes, we provide instant hot & cold electric water dispensers, compact table-top dispensers, and manual pouring tap-and-stand units, complete with maintenance support and regular pure water delivery."
  }
];

export default function LandingPage() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);

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
      ? `Hello Aqua Sphere, I would like to order: ${productName}`
      : 'Hello Aqua Sphere, I want to inquire about drinking water delivery.';
    return `https://wa.me/${number}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-cyan-500 selection:text-white overflow-x-hidden w-full max-w-full relative">
      
      {/* 1. TOP INFORMATION BAR */}
      <div className="bg-gradient-to-r from-sky-900 via-sky-800 to-cyan-700 text-white text-xs sm:text-sm font-medium py-2 px-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2 text-center md:text-left">
          <div className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
            <span>Landline: <strong>{settings.phone}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
            <span>{settings.opening_hours}</span>
          </div>
          <div className="flex items-center gap-2 truncate max-w-md">
            <MapPin className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
            <span className="truncate">{settings.location}</span>
          </div>
        </div>
      </div>

      {/* 2. MAIN NAVBAR */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-sky-100 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-24 flex items-center justify-between">
          {/* Logo (Large, prominent, clean) */}
          <a href="#hero" className="flex items-center group py-2">
            <img 
              src={optImg(settings.logo_url, 400)} 
              alt={settings.site_name} 
              className="h-20 sm:h-[88px] w-auto object-contain scale-125 origin-left transition-transform group-hover:scale-[1.3]"
              loading="eager"
            />
          </a>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-semibold text-slate-600">
            <a href="#hero" className="hover:text-cyan-600 transition-colors">Home</a>
            <a href="#products" className="hover:text-cyan-600 transition-colors">Products</a>
            <a href="#services" className="hover:text-cyan-600 transition-colors">Services</a>
            <a href="#about" className="hover:text-cyan-600 transition-colors">About Us</a>
            <a href="#technology" className="hover:text-cyan-600 transition-colors">Purification</a>
            <a href="#gallery" className="hover:text-cyan-600 transition-colors">Designs</a>
            <a href="#faq" className="hover:text-cyan-600 transition-colors">FAQs</a>
            <a href="#location" className="hover:text-cyan-600 transition-colors">Location</a>
            <a href="#contact" className="hover:text-cyan-600 transition-colors">Contact</a>
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            <Link 
              to="/website-admin" 
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-all shadow-sm"
              title="Edit Landing Page Content"
            >
              <Settings className="w-3.5 h-3.5 text-sky-600" />
              <span>Website Admin</span>
            </Link>

            <Link 
              to="/login" 
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-700 hover:to-cyan-700 rounded-lg transition-all shadow-sm shadow-sky-600/20"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Software Admin</span>
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            onClick={() => setMobileMenuOpen(prev => !prev)} 
            className="lg:hidden p-2 text-slate-700 hover:text-sky-600 rounded-lg focus:outline-none"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-sky-100 px-6 py-5 flex flex-col gap-4 text-sm font-semibold text-slate-700 shadow-lg">
            <a href="#hero" onClick={() => setMobileMenuOpen(false)} className="hover:text-cyan-600 py-1">Home</a>
            <a href="#products" onClick={() => setMobileMenuOpen(false)} className="hover:text-cyan-600 py-1">Products</a>
            <a href="#services" onClick={() => setMobileMenuOpen(false)} className="hover:text-cyan-600 py-1">Services & Supply</a>
            <a href="#about" onClick={() => setMobileMenuOpen(false)} className="hover:text-cyan-600 py-1">About Us</a>
            <a href="#technology" onClick={() => setMobileMenuOpen(false)} className="hover:text-cyan-600 py-1">Purification</a>
            <a href="#gallery" onClick={() => setMobileMenuOpen(false)} className="hover:text-cyan-600 py-1">Bottle Designs</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="hover:text-cyan-600 py-1">FAQs</a>
            <a href="#location" onClick={() => setMobileMenuOpen(false)} className="hover:text-cyan-600 py-1">Location</a>
            <a href="#contact" onClick={() => setMobileMenuOpen(false)} className="hover:text-cyan-600 py-1">Contact</a>
            
            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2.5">
              <Link 
                to="/website-admin" 
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-2.5 text-xs font-bold text-sky-700 bg-sky-50 border border-sky-200 rounded-lg"
              >
                <Settings className="w-4 h-4" />
                <span>Website Admin</span>
              </Link>
              <Link 
                to="/login" 
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-2.5 text-xs font-bold text-white bg-gradient-to-r from-sky-600 to-cyan-600 rounded-lg"
              >
                <LogIn className="w-4 h-4" />
                <span>Software Admin</span>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* 3. HERO SECTION */}
      <section 
        id="hero" 
        className="relative min-h-[85vh] flex items-center justify-center py-20 px-4 text-center overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: `url(${optImg(settings.hero_bg_url, 1400)})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-sky-950/85 via-sky-900/75 to-cyan-900/80"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-400/15 via-transparent to-transparent"></div>

        <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-400/20 border border-cyan-300/40 text-cyan-200 text-xs font-bold uppercase tracking-wider mb-6 backdrop-blur-md">
            <Droplets className="w-4 h-4 text-cyan-300" />
            <span>Pure Mineral Hydration</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white leading-tight mb-4">
            <span className="block">{settings.hero_title}</span>
            <span className="block bg-gradient-to-r from-cyan-300 via-sky-200 to-teal-200 bg-clip-text text-transparent">
              {settings.hero_subtitle}
            </span>
          </h1>

          <p className="text-base sm:text-lg text-sky-100 max-w-2xl mb-10 leading-relaxed font-normal">
            {settings.hero_text}
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <a 
              href="#products" 
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 text-sm font-bold text-sky-950 bg-gradient-to-r from-cyan-300 to-sky-300 hover:from-cyan-200 hover:to-sky-200 rounded-xl transition-all shadow-lg shadow-cyan-900/30 hover:scale-105"
            >
              <span>{settings.hero_button}</span>
              <ArrowRight className="w-4 h-4" />
            </a>

            <a 
              href={getWhatsAppLink()} 
              target="_blank" 
              rel="noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 text-sm font-bold text-white bg-[#25D366] hover:bg-[#20ba59] rounded-xl transition-all shadow-lg shadow-emerald-950/40 hover:scale-105"
            >
              <WhatsAppIcon className="w-5 h-5 text-white" />
              <span>Order via WhatsApp</span>
            </a>
          </div>

          {/* Quick Value Badges */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 w-full text-left">
            <div className="bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-lg border border-sky-100">
              <ShieldCheck className="w-6 h-6 text-cyan-600 mb-2" />
              <h4 className="text-sm font-bold text-slate-900">7-Stage Filtered</h4>
              <p className="text-xs text-slate-500 mt-0.5">Reverse osmosis & UV pure</p>
            </div>
            <div className="bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-lg border border-sky-100">
              <Sparkles className="w-6 h-6 text-cyan-600 mb-2" />
              <h4 className="text-sm font-bold text-slate-900">Balanced Minerals</h4>
              <p className="text-xs text-slate-500 mt-0.5">Optimal healthy pH & TDS</p>
            </div>
            <div className="bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-lg border border-sky-100">
              <Truck className="w-6 h-6 text-cyan-600 mb-2" />
              <h4 className="text-sm font-bold text-slate-900">Fast Doorstep Delivery</h4>
              <p className="text-xs text-slate-500 mt-0.5">Rawalpindi & Islamabad</p>
            </div>
            <div className="bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-lg border border-sky-100">
              <Award className="w-6 h-6 text-cyan-600 mb-2" />
              <h4 className="text-sm font-bold text-slate-900">Certified Standards</h4>
              <p className="text-xs text-slate-500 mt-0.5">Lab tested & approved</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3b. SEO KEYWORDS & VALUE TICKER STRIP */}
      <div className="bg-gradient-to-r from-sky-950 via-slate-900 to-cyan-950 text-white border-y border-sky-800/80 py-4 px-4 overflow-hidden shadow-inner">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm font-semibold text-center">
          <span className="flex items-center gap-1.5 text-cyan-300">
            <Droplets className="w-4 h-4 text-cyan-400 shrink-0" />
            100% Pure Drinking Water
          </span>
          <span className="text-sky-700 hidden sm:inline">•</span>
          <span className="flex items-center gap-1.5 text-sky-100">
            <Truck className="w-4 h-4 text-cyan-400 shrink-0" />
            19L Water Bottle Doorstep Delivery
          </span>
          <span className="text-sky-700 hidden sm:inline">•</span>
          <span className="flex items-center gap-1.5 text-cyan-300">
            <Package className="w-4 h-4 text-cyan-400 shrink-0" />
            Wholesale Empty Bottles & Cans
          </span>
          <span className="text-sky-700 hidden sm:inline">•</span>
          <span className="flex items-center gap-1.5 text-sky-100">
            <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
            BPA-Free Food-Grade Certified
          </span>
          <span className="text-sky-700 hidden sm:inline">•</span>
          <span className="flex items-center gap-1.5 text-cyan-300">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
            Rawalpindi & Islamabad Supply
          </span>
        </div>
      </div>

      {/* 4. PRODUCTS CATALOG SECTION */}
      <section id="products" className="py-24 px-4 sm:px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-cyan-600 text-xs font-bold uppercase tracking-wider bg-cyan-50 px-3 py-1 rounded-full border border-cyan-200">Our Product Lineup</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-3">Pure Hydration Delivered</h2>
            <p className="text-slate-500 text-sm mt-3">From bulk refill bottles to table-top dispensers, choose the size that fits your lifestyle.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {settings.products?.map((prod) => (
              <div 
                key={prod.id} 
                className="group flex flex-col bg-white rounded-2xl border border-sky-100 hover:border-cyan-400 transition-all duration-300 overflow-hidden shadow-sm hover:shadow-xl"
              >
                <div className="relative h-64 w-full bg-gradient-to-b from-sky-50/70 to-white p-6 flex items-center justify-center overflow-hidden">
                  <img 
                    src={optImg(prod.image, 500)} 
                    alt={prod.name} 
                    className="max-h-full max-w-full object-contain filter drop-shadow-md transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute top-4 right-4 bg-sky-900 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                    {prod.price}
                  </div>
                </div>

                <div className="p-6 flex flex-col flex-1 border-t border-slate-50">
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-cyan-700 transition-colors">{prod.name}</h3>
                  <p className="text-xs text-slate-500 mt-2 flex-1 leading-relaxed">{prod.desc}</p>
                  
                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-base font-extrabold text-cyan-700">{prod.price}</span>
                    <a 
                      href={getWhatsAppLink(prod.name)} 
                      target="_blank" 
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#25D366] hover:bg-[#20ba59] rounded-lg transition-colors shadow-sm"
                    >
                      <WhatsAppIcon className="w-3.5 h-3.5 text-white" />
                      <span>Order</span>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. ABOUT & PURIFICATION TECHNOLOGY */}
      <section id="about" className="py-24 px-4 sm:px-6 bg-sky-50/50 border-t border-sky-100">
        <div className="max-w-7xl mx-auto space-y-20">
          
          {/* Row 1: Company Profile */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-cyan-600 text-xs font-bold uppercase tracking-wider bg-white px-3 py-1 rounded-full border border-sky-200">{settings.about_title}</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-3 leading-tight">
                {settings.company_title}
              </h2>
              <p className="text-slate-700 text-base mt-4 leading-relaxed">
                {settings.about_intro}
              </p>
              <p className="text-slate-500 text-sm mt-3 leading-relaxed">
                {settings.company_intro}
              </p>
              
              <ul className="mt-6 space-y-3">
                {['Direct plant doorstep distribution', 'Rigorous daily laboratory testing', 'BPA-free medical-grade bottling'].map((point, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-sm text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-cyan-600 shrink-0" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative rounded-2xl overflow-hidden border border-sky-100 shadow-xl bg-white p-2">
              <img 
                src={optImg(settings.company_image, 700)} 
                alt="Aqua Sphere Processing Facility" 
                className="w-full h-80 sm:h-96 object-cover rounded-xl"
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>

          {/* Row 2: Technology & Machine */}
          <div id="technology" className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center pt-10 border-t border-sky-100">
            <div className="order-2 lg:order-1 relative rounded-2xl overflow-hidden border border-sky-100 shadow-xl bg-white p-2">
              <img 
                src={optImg(settings.technology_image, 700)} 
                alt="Aqua Sphere Automatic Bottling Machine" 
                className="w-full h-80 sm:h-96 object-cover rounded-xl"
                loading="lazy"
                decoding="async"
              />
            </div>

            <div className="order-1 lg:order-2">
              <span className="text-cyan-600 text-xs font-bold uppercase tracking-wider bg-white px-3 py-1 rounded-full border border-sky-200">Advanced Filtration</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-3 leading-tight">
                {settings.technology_title}
              </h2>
              <p className="text-slate-700 text-base mt-4 leading-relaxed">
                {settings.technology_text}
              </p>
              <p className="text-slate-500 text-sm mt-3 leading-relaxed">
                {settings.commitment_text}
              </p>
              
              <div className="mt-8 flex items-center gap-4">
                <a 
                  href={getWhatsAppLink()} 
                  target="_blank" 
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 text-xs font-bold text-white bg-sky-700 hover:bg-sky-800 rounded-xl transition-all shadow-md"
                >
                  <span>Inquire for Corporate Supply</span>
                  <ChevronRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 6. BOTTLE DESIGN SHOWCASE GALLERY */}
      <section id="gallery" className="py-24 px-4 sm:px-6 bg-white border-t border-sky-100">
        <div className="max-w-7xl mx-auto text-center">
          <span className="text-cyan-600 text-xs font-bold uppercase tracking-wider bg-sky-50 px-3 py-1 rounded-full border border-sky-200">Custom Packaging</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-3">Bottle Design Showcase</h2>
          <p className="text-slate-500 text-sm max-w-xl mx-auto mt-3">Precision-engineered molds and lightweight ergonomic grips manufactured at highest hygienic standards.</p>

          <div className="mt-12 -mx-4 sm:-mx-6">
            <LogoLoop
              logos={BOTTLE_GALLERY}
              speed={60}
              direction="left"
              logoHeight={16}
              gap={20}
              hoverSpeed={0}
              fadeOut
              fadeOutColor="#ffffff"
              ariaLabel="Bottle design showcase"
              renderItem={(b) => (
                <div className="logoloop-card group w-44 sm:w-52 bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-[0_4px_20px_-6px_rgba(14,116,144,0.18)] hover:shadow-[0_10px_30px_-8px_rgba(14,116,144,0.35)] hover:-translate-y-1 hover:border-cyan-300 transition-all duration-300 my-3 text-left">
                  <div className="h-52 sm:h-60 w-full overflow-hidden bg-sky-50">
                    <img
                      src={optImg(b.url, 300)}
                      alt={`Bottle Design ${b.id}`}
                      className="group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                    />
                  </div>
                  <div className="px-3 py-2.5 flex items-center justify-between">
                    <div className="leading-tight">
                      <p className="text-[11px] font-semibold text-slate-800">Design {String(b.id).padStart(2, '0')}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">PET Bottle</p>
                    </div>
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                  </div>
                </div>
              )}
            />
          </div>
        </div>
      </section>

      {/* 6B. HIGH-RANKING SERVICES & SUPPLY (SEO TARGETED) */}
      <section id="services" className="py-20 px-4 sm:px-6 bg-gradient-to-b from-white to-sky-50/50 border-t border-sky-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-cyan-600 text-xs font-bold uppercase tracking-wider bg-sky-50 px-3 py-1 rounded-full border border-sky-200">
              Complete Water Solutions
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-3 tracking-tight">
              Pure Water Supply & Empty Bottles Manufacturing
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-3 leading-relaxed">
              Serving residential neighborhoods, commercial business towers, and industrial clients across Rawalpindi and Islamabad with certified RO-purified drinking water and premium food-grade empty bottles.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1 */}
            <div className="bg-white rounded-2xl p-6 border border-sky-100 shadow-sm hover:shadow-md hover:border-cyan-300 transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-600 mb-4">
                  <Droplets className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">100% Pure Drinking Water</h3>
                <p className="text-slate-600 text-xs leading-relaxed mb-4">
                  7-stage Reverse Osmosis, micron sediment filtration, and ultraviolet sterilisation ensuring optimal mineral balance and pure, crisp taste.
                </p>
              </div>
              <ul className="text-xs text-slate-500 space-y-1.5 pt-4 border-t border-slate-100">
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 shrink-0" /> Zero Chemical Odor</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 shrink-0" /> Lab-Tested Quality</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 shrink-0" /> Doorstep Delivery</li>
              </ul>
            </div>

            {/* Card 2 */}
            <div className="bg-white rounded-2xl p-6 border border-sky-100 shadow-sm hover:shadow-md hover:border-cyan-300 transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 mb-4">
                  <Truck className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">19L Pure Water Bottle Refills</h3>
                <p className="text-slate-600 text-xs leading-relaxed mb-4">
                  Fast doorstep bottle exchange service for homes and corporate offices. Just swap your empty 19L bottle for an ice-sealed, hygienically refilled bottle.
                </p>
              </div>
              <ul className="text-xs text-slate-500 space-y-1.5 pt-4 border-t border-slate-100">
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 shrink-0" /> PKR 280 / Refill</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 shrink-0" /> Sealed Dust Caps</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 shrink-0" /> Scheduled Deliveries</li>
              </ul>
            </div>

            {/* Card 3 */}
            <div className="bg-white rounded-2xl p-6 border border-sky-100 shadow-sm hover:shadow-md hover:border-cyan-300 transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 mb-4">
                  <Package className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Food-Grade Empty Bottles</h3>
                <p className="text-slate-600 text-xs leading-relaxed mb-4">
                  Wholesale supplier of durable polycarbonate 19-litre empty bottles, PET bottled water packs (500ml, 1.5L), caps, neck sleeves, and handles.
                </p>
              </div>
              <ul className="text-xs text-slate-500 space-y-1.5 pt-4 border-t border-slate-100">
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 shrink-0" /> 100% BPA-Free Materials</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 shrink-0" /> High Impact Resistance</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 shrink-0" /> Bulk Factory Discounts</li>
              </ul>
            </div>

            {/* Card 4 */}
            <div className="bg-white rounded-2xl p-6 border border-sky-100 shadow-sm hover:shadow-md hover:border-cyan-300 transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-4">
                  <Layers className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Corporate & Bulk Supply</h3>
                <p className="text-slate-600 text-xs leading-relaxed mb-4">
                  Tailored recurring pure water delivery plans for companies, banks, embassies, hospitals, and educational institutions with hot & cold water dispensers.
                </p>
              </div>
              <ul className="text-xs text-slate-500 space-y-1.5 pt-4 border-t border-slate-100">
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 shrink-0" /> Monthly Invoicing</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 shrink-0" /> Dispenser Maintenance</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 shrink-0" /> Priority Emergency Routes</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 6C. INTERACTIVE FAQ ACCORDION (SEO RICH SNIPPETS) */}
      <section id="faq" className="py-20 px-4 sm:px-6 bg-white border-t border-sky-100">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-flex items-center gap-1.5 text-cyan-600 text-xs font-bold uppercase tracking-wider bg-sky-50 px-3 py-1 rounded-full border border-sky-200">
              <HelpCircle className="w-3.5 h-3.5" />
              Frequently Asked Questions
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-3 tracking-tight">
              Everything You Need to Know About Pure Water & Bottle Refills
            </h2>
            <p className="text-slate-500 text-sm mt-3 max-w-2xl mx-auto">
              Clear answers regarding water purity standards, 19L bottle security deposits, refill delivery schedules, and wholesale empty bottle supply.
            </p>
          </div>

          <div className="space-y-3">
            {SEO_FAQS.map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div 
                  key={idx} 
                  className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                    isOpen 
                      ? 'border-cyan-300 bg-sky-50/40 shadow-sm' 
                      : 'border-slate-200 bg-white hover:border-sky-200'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setActiveFaq(isOpen ? null : idx)}
                    className="w-full px-6 py-4 sm:py-5 flex items-center justify-between text-left gap-4"
                    aria-expanded={isOpen}
                  >
                    <span className="text-sm sm:text-base font-bold text-slate-900">
                      {faq.q}
                    </span>
                    <span className={`p-1.5 rounded-full shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 bg-cyan-100 text-cyan-700' : 'text-slate-400 bg-slate-100'}`}>
                      <ChevronDown className="w-4 h-4" />
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 pt-1 text-slate-600 text-xs sm:text-sm leading-relaxed border-t border-sky-100/60">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Direct CTA box */}
          <div className="mt-12 bg-gradient-to-r from-sky-900 to-cyan-800 rounded-2xl p-6 sm:p-8 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-lg">
            <div>
              <h3 className="text-lg sm:text-xl font-bold">Have questions or need bulk empty bottles?</h3>
              <p className="text-sky-100 text-xs sm:text-sm mt-1">Our customer dispatch team is ready to assist you on WhatsApp 24/7.</p>
            </div>
            <a
              href={getWhatsAppLink()}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 text-xs font-bold text-sky-900 bg-white hover:bg-cyan-50 rounded-xl transition-all shadow-md shrink-0"
            >
              <WhatsAppIcon className="w-4 h-4 text-emerald-600" />
              <span>Contact via WhatsApp</span>
            </a>
          </div>
        </div>
      </section>

      {/* 7. LOCATION & MAP */}
      <section id="location" className="py-24 px-4 sm:px-6 bg-sky-50/40 border-t border-sky-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-cyan-600 text-xs font-bold uppercase tracking-wider bg-white px-3 py-1 rounded-full border border-sky-200">Visit Our Factory</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-3">{settings.location_title}</h2>
            <p className="text-slate-600 text-sm mt-3">{settings.location}</p>
          </div>

          <div className="rounded-2xl overflow-hidden border border-sky-200 shadow-xl h-[420px] bg-white relative">
            <iframe 
              src={settings.map_embed} 
              title="Aqua Sphere Location" 
              className="w-full h-full border-0"
              loading="lazy"
            ></iframe>

            <div className="absolute bottom-6 right-6">
              <a 
                href={settings.map_link} 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-slate-900/90 hover:bg-slate-900 rounded-xl shadow-lg backdrop-blur-md"
              >
                <span>Open in Google Maps</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 8. FOOTER WITH FULL CONTACT, SMOOTH HOVER & ICONIC HALF-CUT AQUASPHERE DESIGN */}
      <footer id="contact" className="bg-[#080d1a] text-slate-300 border-t border-slate-800/80 pt-12 sm:pt-16 pb-0 px-4 sm:px-8 relative overflow-hidden w-full max-w-full">
        {/* Subtle Watermark Logo Emblem in Background */}
        <div className="absolute right-0 top-12 pointer-events-none opacity-[0.035] select-none overflow-hidden max-w-full">
          <img src={optImg(settings.logo_url, 600)} alt="" className="w-[450px] h-[450px] object-contain translate-x-8" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pb-10 border-b border-slate-800/80">
            
            {/* Col 1: About Aqua Sphere & Logo */}
            <div className="space-y-4">
              <div className="inline-flex items-center bg-white rounded-2xl px-5 py-2 shadow-lg shadow-cyan-500/10">
                <img 
                  src={optImg(settings.logo_url, 400)} 
                  alt={settings.site_name} 
                  className="h-16 sm:h-20 w-auto object-contain scale-125 transition-transform duration-300 hover:scale-[1.3]" 
                />
              </div>
              <p className="text-slate-400 text-sm leading-relaxed font-normal">
                Premium purified drinking water infused with naturally occurring minerals. Delivered daily to residences, corporates, and restaurants across Rawalpindi and Islamabad.
              </p>
              
              {/* Quick Action Icon Pills */}
              <div className="flex items-center gap-3 pt-2">
                <a 
                  href={getWhatsAppLink()} 
                  target="_blank" 
                  rel="noreferrer" 
                  title="WhatsApp" 
                  className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 hover:border-emerald-500 hover:bg-[#25D366] text-slate-400 hover:text-white flex items-center justify-center transition-all duration-300 ease-out hover:scale-110 shadow-sm"
                >
                  <WhatsAppIcon className="w-5 h-5" />
                </a>
                <a 
                  href={`tel:${settings.phone}`} 
                  title="Call Us" 
                  className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 hover:border-cyan-500 hover:bg-cyan-500 text-slate-400 hover:text-white flex items-center justify-center transition-all duration-300 ease-out hover:scale-110 shadow-sm"
                >
                  <Phone className="w-4 h-4" />
                </a>
                <a 
                  href={settings.map_link} 
                  target="_blank" 
                  rel="noreferrer" 
                  title="Open Location" 
                  className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 hover:border-sky-500 hover:bg-sky-500 text-slate-400 hover:text-white flex items-center justify-center transition-all duration-300 ease-out hover:scale-110 shadow-sm"
                >
                  <MapPin className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Col 2: Navigation Links (with smooth hover transitions) */}
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-6">Quick Navigation</h4>
              <ul className="space-y-3.5 text-sm text-slate-400">
                <li>
                  <a href="#hero" className="hover:text-cyan-400 transition-all duration-300 ease-out hover:translate-x-1.5 inline-block">
                    Home
                  </a>
                </li>
                <li>
                  <a href="#products" className="hover:text-cyan-400 transition-all duration-300 ease-out hover:translate-x-1.5 inline-block">
                    Products & Refills
                  </a>
                </li>
                <li>
                  <a href="#services" className="hover:text-cyan-400 transition-all duration-300 ease-out hover:translate-x-1.5 inline-block">
                    Services & Wholesale Supply
                  </a>
                </li>
                <li>
                  <a href="#about" className="hover:text-cyan-400 transition-all duration-300 ease-out hover:translate-x-1.5 inline-block">
                    About Our Facility
                  </a>
                </li>
                <li>
                  <a href="#technology" className="hover:text-cyan-400 transition-all duration-300 ease-out hover:translate-x-1.5 inline-block">
                    Purification Process
                  </a>
                </li>
                <li>
                  <a href="#faq" className="hover:text-cyan-400 transition-all duration-300 ease-out hover:translate-x-1.5 inline-block">
                    Frequently Asked Questions
                  </a>
                </li>
                <li>
                  <Link to="/website-admin" className="hover:text-cyan-400 transition-all duration-300 ease-out hover:translate-x-1.5 inline-block">
                    Website Content Admin
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="hover:text-cyan-400 transition-all duration-300 ease-out hover:translate-x-1.5 inline-block">
                    Software ERP Portal
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 3: Direct Contact Info (with smooth hover transitions) */}
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-6">Contact Details</h4>
              <ul className="space-y-4 text-sm text-slate-400">
                <li className="flex items-start gap-3 group">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 group-hover:border-cyan-500/50 transition-colors duration-300">
                    <Phone className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <span className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-0.5">Landline</span>
                    <a href={`tel:${settings.phone}`} className="text-slate-200 hover:text-cyan-400 transition-colors duration-200 font-medium">
                      {settings.phone}
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-3 group">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 group-hover:border-emerald-500/50 transition-colors duration-300">
                    <WhatsAppIcon className="w-4 h-4 text-[#25D366]" />
                  </div>
                  <div>
                    <span className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-0.5">WhatsApp Orders</span>
                    <a href={getWhatsAppLink()} target="_blank" rel="noreferrer" className="text-slate-200 hover:text-emerald-400 transition-colors duration-200 font-medium">
                      +{settings.whatsapp}
                    </a>
                  </div>
                </li>
              </ul>
            </div>

            {/* Col 4: Timings & Address (with smooth hover transitions) */}
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-6">Plant & Timings</h4>
              <ul className="space-y-4 text-sm text-slate-400">
                <li className="flex items-start gap-3 group">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 group-hover:border-cyan-500/50 transition-colors duration-300">
                    <Clock className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <span className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-0.5">Working Hours</span>
                    <span className="text-slate-200 font-medium">{settings.opening_hours}</span>
                  </div>
                </li>
                <li className="flex items-start gap-3 group">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 group-hover:border-cyan-500/50 transition-colors duration-300">
                    <MapPin className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <span className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-0.5">Factory Address</span>
                    <span className="text-slate-200 font-medium leading-relaxed">{settings.location}</span>
                  </div>
                </li>
              </ul>
            </div>

          </div>

          {/* Developer Credits */}
          <div className="pt-6 pb-1 text-center text-xs text-slate-400 flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
            <span>Software Developers</span>
            <span className="text-slate-600">|</span>
            <a href="mailto:Abdullahsiddique.dev.ai@gmail.com" className="hover:text-cyan-400 transition-colors">Abdullahsiddique.dev.ai@gmail.com</a>
            <span className="text-slate-600">|</span>
            <a href="mailto:Ehtisham.dev.ai@gmail.com" className="hover:text-cyan-400 transition-colors">Ehtisham.dev.ai@gmail.com</a>
          </div>

          {/* Bottom Copyright & Sub-links */}
          <div className="pt-4 pb-2 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <p>© {new Date().getFullYear()} {settings.site_name} Mineral Water. All rights reserved.</p>
            <div className="flex gap-6">
              <Link to="/website-admin" className="hover:text-cyan-400 transition-colors duration-200">Website Admin</Link>
              <Link to="/login" className="hover:text-cyan-400 transition-colors duration-200">Software Login</Link>
            </div>
          </div>
        </div>

        {/* 10. ICONIC HALF-CUT HOLLOW OUTLINED "AQUASPHERE" (Cut precisely in half at bottom edge, zero horizontal overflow) */}
        <div className="w-full max-w-full overflow-hidden select-none pointer-events-none relative flex justify-center mt-2">
          <svg 
            viewBox="0 0 1250 62" 
            className="w-full max-w-full h-auto block select-none pointer-events-none"
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            style={{ overflow: 'hidden' }}
          >
            <text 
              x="50%" 
              y="112" 
              textAnchor="middle" 
              fontFamily="'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
              fontWeight="900" 
              fontSize="140" 
              letterSpacing="0.08em"
              stroke="rgba(255, 255, 255, 0.65)" 
              strokeWidth="2.5" 
              fill="rgba(255, 255, 255, 0.04)"
            >
              AQUASPHERE
            </text>
          </svg>
        </div>
      </footer>

      {/* 9. FLOATING WHATSAPP BUTTON (Official WhatsApp Logo) */}
      <a 
        href={getWhatsAppLink()} 
        target="_blank" 
        rel="noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-[#25D366] hover:bg-[#20ba59] text-white font-bold px-4 py-3 rounded-full shadow-2xl hover:scale-105 transition-all shadow-emerald-950/40"
        title="Chat on WhatsApp"
      >
        <WhatsAppIcon className="w-6 h-6 text-white shrink-0" />
        <span className="text-xs font-bold hidden sm:inline">Order Now</span>
      </a>
    </div>
  );
}
