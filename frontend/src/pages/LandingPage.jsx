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
  ExternalLink
} from 'lucide-react';
import './landing.css';

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
  hero_title: "Always want safe",
  hero_subtitle: "and good water for healthy life",
  hero_text: "Clean, safe and refreshing hydration for modern living.",
  hero_button: "Explore",
  about_title: "About Aqua Sphere",
  about_intro: "Welcome to Aqua Sphere, where naturally occurring electrolytes meet premium hydration for everyone.",
  company_title: "Company Introduction",
  company_intro: "Aqua Sphere Mineral Water, established in 2019, provides pure, clean, and affordable drinking water.",
  company_image: "https://res.cloudinary.com/wgstyulb/image/upload/v1791005628/aqua-project-machine.png",
  technology_title: "Aqua Sphere",
  technology_text: "Aqua Sphere – Purity in Every Drop.",
  commitment_title: "Aqua Sphere – Clean Water, Healthy Life.",
  commitment_text: "Aqua Sphere – Trusted Water, Trusted Choice.",
  project_tag: "Premium Water Project",
  project_title: "WADAANA INDUSTRIES PROUDLY ANNOUNCES ITS JV WITH AQUA SPHERE FOR STRONGER AND INNOVATIVE FUTURE",
  project_text: "Wadaana Industries professionally manufactures high-quality water production and purification systems with modern technology, reliable performance, and trusted standards.",
  project_button: "View Project Details",
  location_title: "Our Location",
  map_embed: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d6645.602196273996!2d72.97236419357911!3d33.610464900000004!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x38df970024408d31%3A0xa9c9cb0ebd2d1923!2sAQUA%20SPHERE!5e0!3m2!1sen!2sus!4v1791118066494!5m2!1sen!2sus",
  map_link: "https://maps.app.goo.gl/2PeNJ9oKaFzY2P7E6",
  contact_title: "Contact Us",
  products: [
    {
      id: "p1",
      name: "19L Bottle",
      desc: "Security Fee / Per Refill PKR 280",
      price: "PKR 1000",
      image: "https://res.cloudinary.com/wgstyulb/image/upload/v1791005454/product_1777146556_7174.png"
    },
    {
      id: "p2",
      name: "1.5L Bottle",
      desc: "Daily hydration",
      price: "PKR 100",
      image: "https://res.cloudinary.com/wgstyulb/image/upload/v1791005473/product_1777198208_4752.jpg"
    },
    {
      id: "p3",
      name: "500ml Bottle",
      desc: "Portable and convenient",
      price: "PKR 50",
      image: "https://res.cloudinary.com/wgstyulb/image/upload/v1791005454/product_1777145702_1235.png"
    },
    {
      id: "p4",
      name: "Dispenser",
      desc: "Instant water access",
      price: "PKR 35000",
      image: "https://res.cloudinary.com/wgstyulb/image/upload/v1791005468/product_1777146854_7886.png"
    },
    {
      id: "p5",
      name: "Table Top Dispenser",
      desc: "Compact Design, Pure Hydration.",
      price: "PKR 2500",
      image: "https://res.cloudinary.com/wgstyulb/image/upload/v1791005489/product_1777147220_8492.png"
    },
    {
      id: "p6",
      name: "Tap & Stand",
      desc: "Simple Setup, Pure Water",
      price: "PKR 1500",
      image: "https://res.cloudinary.com/wgstyulb/image/upload/v1791005490/product_1777147740_9305.png"
    }
  ]
};

export default function LandingPage() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      ? `Hello Aqua Sphere, I want to order: ${productName}`
      : 'Hello Aqua Sphere, I want to inquire about drinking water.';
    return `https://wa.me/${number}?text=${encodeURIComponent(msg)}`;
  };

  const sendContact = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const name = fd.get('name') || '';
    const email = fd.get('email') || '';
    const message = fd.get('message') || '';
    const text = `New Contact Form Inquiry:\nName: ${name}\nEmail: ${email}\nMessage: ${message}`;
    const number = settings.whatsapp?.replace(/\D/g, '') || '923015072233';
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(text)}`, '_blank');
    e.target.reset();
  };

  return (
    <div className="lp min-h-screen text-slate-800 font-sans selection:bg-cyan-500 selection:text-white overflow-x-hidden w-full max-w-full relative">
      
      {/* 1. TOP INFORMATION BAR */}
      <div className="bg-gradient-to-r from-[#082f49] via-[#0369a1] to-[#38bdf8] text-white text-xs sm:text-sm font-semibold py-2.5 px-4 sm:px-8 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2 text-center md:text-left">
          <div className="flex items-center gap-2">
            <span>📞 Land Line: <strong>{settings.phone}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span>⏰ {settings.opening_hours}</span>
          </div>
          <div className="flex items-center gap-2 truncate max-w-md">
            <span>📍 {settings.location}</span>
          </div>
        </div>
      </div>

      {/* 2. MAIN NAVBAR */}
      <header className="sticky top-0 z-50 bg-[#0f172a]/90 backdrop-blur-xl border-b border-white/15 transition-all shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-24 sm:h-28 flex items-center justify-between">
          {/* Logo */}
          <a href="#hero" className="flex items-center group py-2">
            <img 
              src={optImg(settings.logo_url, 600)} 
              alt={settings.site_name} 
              className="h-16 sm:h-20 md:h-24 w-auto object-contain transition-transform group-hover:scale-105 drop-shadow-md"
              loading="eager"
            />
          </a>

          {/* Desktop Nav Links (Reference capsule) */}
          <nav className="hidden lg:flex items-center gap-1 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/15 shadow-inner">
            <a href="#hero" className="px-3.5 py-1.5 rounded-full text-white text-sm font-bold hover:bg-white/20 hover:text-cyan-200 transition-all">Home</a>
            <a href="#products" className="px-3.5 py-1.5 rounded-full text-white text-sm font-bold hover:bg-white/20 hover:text-cyan-200 transition-all">Products</a>
            <a href="#about" className="px-3.5 py-1.5 rounded-full text-white text-sm font-bold hover:bg-white/20 hover:text-cyan-200 transition-all">About</a>
            <Link to="/reports" className="px-3.5 py-1.5 rounded-full text-white text-sm font-bold hover:bg-white/20 hover:text-cyan-200 transition-all">Reports</Link>
            <Link to="/certificates" className="px-3.5 py-1.5 rounded-full text-white text-sm font-bold hover:bg-white/20 hover:text-cyan-200 transition-all">Certificates</Link>
            <a href="#location" className="px-3.5 py-1.5 rounded-full text-white text-sm font-bold hover:bg-white/20 hover:text-cyan-200 transition-all">Location</a>
            <a href="#contact" className="px-3.5 py-1.5 rounded-full text-white text-sm font-bold hover:bg-white/20 hover:text-cyan-200 transition-all">Contact</a>
            <Link to="/login" className="px-3.5 py-1.5 rounded-full text-white text-sm font-bold hover:bg-white/20 hover:text-cyan-200 transition-all">Admin</Link>
          </nav>

          {/* Header Action Buttons */}
          <div className="hidden sm:flex items-center gap-2.5">
            <Link 
              to="/website-admin" 
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-cyan-200 bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/40 rounded-full transition-all shadow-sm"
              title="Edit Landing Page Content"
            >
              <Settings className="w-3.5 h-3.5 text-cyan-400" />
              <span>Website Admin</span>
            </Link>

            <a 
              href="https://theaquasphere.org/login" 
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 rounded-full transition-all shadow-sm shadow-sky-600/30"
              title="Open Software ERP Portal"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Software Admin</span>
            </a>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            onClick={() => setMobileMenuOpen(prev => !prev)} 
            className="lg:hidden p-2 text-white hover:text-cyan-400 rounded-lg focus:outline-none"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#0f172a]/95 border-b border-white/10 px-6 py-5 flex flex-col gap-3 text-sm font-bold text-white shadow-2xl backdrop-blur-2xl">
            <a href="#hero" onClick={() => setMobileMenuOpen(false)} className="hover:text-cyan-400 py-1">Home</a>
            <a href="#products" onClick={() => setMobileMenuOpen(false)} className="hover:text-cyan-400 py-1">Products</a>
            <a href="#about" onClick={() => setMobileMenuOpen(false)} className="hover:text-cyan-400 py-1">About</a>
            <Link to="/reports" onClick={() => setMobileMenuOpen(false)} className="hover:text-cyan-400 py-1">Reports</Link>
            <Link to="/certificates" onClick={() => setMobileMenuOpen(false)} className="hover:text-cyan-400 py-1">Certificates</Link>
            <a href="#location" onClick={() => setMobileMenuOpen(false)} className="hover:text-cyan-400 py-1">Location</a>
            <a href="#contact" onClick={() => setMobileMenuOpen(false)} className="hover:text-cyan-400 py-1">Contact</a>
            
            <div className="pt-3 border-t border-white/10 flex flex-col gap-2.5">
              <Link 
                to="/website-admin" 
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-2.5 text-xs font-bold text-cyan-200 bg-cyan-950/60 border border-cyan-500/40 rounded-full"
              >
                <Settings className="w-4 h-4 text-cyan-400" />
                <span>Website Admin</span>
              </Link>
              <a 
                href="https://theaquasphere.org/login" 
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-2.5 text-xs font-bold text-white bg-gradient-to-r from-sky-600 to-cyan-600 rounded-full shadow-sm"
              >
                <LogIn className="w-4 h-4" />
                <span>Software Admin</span>
              </a>
            </div>
          </div>
        )}
      </header>

      {/* 3. HERO (reference exact) */}
      <section
        id="hero"
        className="lp-hero"
        style={{ backgroundImage: `url(${optImg(settings.hero_bg_url, 1600)})` }}
      >
        <div className="lp-hero-inner">
          <h1>
            <span>{settings.hero_title}</span>
            <br />
            <span>{settings.hero_subtitle}</span>
          </h1>
          <p>{settings.hero_text}</p>
          <a href="#products" className="lp-btn">{settings.hero_button}</a>
        </div>
      </section>

      {/* 4. ABOUT (reference exact) */}
      <section id="about" className="lp-about lp-card lp-blob">
        <h2>{settings.about_title}</h2>
        <p>{settings.about_intro}</p>
        <h1>{settings.company_title}</h1>
        <p>{settings.company_intro}</p>
        <h2>{settings.technology_title}</h2>
        <p>{settings.technology_text}</p>
        <h2>{settings.commitment_title}</h2>
        <p>{settings.commitment_text}</p>
      </section>

      {/* 5. PREMIUM WATER PROJECT (reference exact) */}
      <section className="lp-project">
        <div
          className="lp-project-card"
          style={{
            backgroundImage: `linear-gradient(90deg, rgba(2,6,23,0.78) 0%, rgba(3,105,161,0.48) 42%, rgba(2,6,23,0.18) 100%), radial-gradient(circle at 18% 22%, rgba(56,189,248,0.35), transparent 32%), url(${optImg(settings.company_image, 1400)})`
          }}
        >
          <div className="lp-project-overlay">
            <span className="lp-project-tag">{settings.project_tag}</span>
            <h2>{settings.project_title}</h2>
            <p>{settings.project_text}</p>
            <a href="#contact" className="lp-btn lp-project-btn">{settings.project_button || 'View Project Details'}</a>
          </div>
        </div>
      </section>

      {/* 6. PRODUCTS (reference exact: 6 products) */}
      <section id="products" className="lp-products">
        {settings.products?.map((prod) => (
          <div key={prod.id} className="lp-product lp-card">
            <img src={optImg(prod.image, 500)} alt={prod.name} loading="lazy" decoding="async" />
            <h3>{prod.name}</h3>
            <p>{prod.desc}</p>
            <p className="lp-price">{prod.price}</p>
            <a href={getWhatsAppLink(prod.name)} target="_blank" rel="noreferrer" className="lp-btn">
              Order Whatsapp
            </a>
          </div>
        ))}
      </section>

      {/* 7. LOCATION (reference exact) */}
      <section id="location" className="lp-location">
        <div className="lp-location-card lp-card lp-blob">
          <h2>{settings.location_title}</h2>
          <p>{settings.location}</p>
          <div className="lp-map">
            <a 
              href={settings.map_link} 
              target="_blank" 
              rel="noreferrer" 
              className="absolute top-3.5 left-3.5 z-10 inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/95 hover:bg-white text-slate-800 hover:text-cyan-700 text-xs font-bold rounded-xl border border-slate-200/90 shadow-md hover:shadow-lg transition-all hover:scale-105"
              title="Open location in Google Maps"
            >
              <span>Open in Maps</span>
              <ExternalLink className="w-3.5 h-3.5 text-cyan-600" />
            </a>
            <iframe
              src={settings.map_embed}
              title="Aqua Sphere Location"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
          <a href={settings.map_link} target="_blank" rel="noreferrer" className="lp-btn">
            Get Directions
          </a>
        </div>
      </section>

      {/* 8. CONTACT FORM (reference exact) */}
      <section id="contact" className="lp-contact">
        <div className="lp-contact-card lp-card lp-blob">
          <h2>{settings.contact_title}</h2>
          <form onSubmit={sendContact}>
            <input name="name" type="text" placeholder="Name" required />
            <input name="email" type="email" placeholder="Email" required />
            <textarea name="message" placeholder="Message" required></textarea>
            <button type="submit" className="lp-btn">Send</button>
          </form>
        </div>
      </section>

      {/* 9. FOOTER WITH ICONIC HALF-CUT AQUASPHERE */}
      <footer className="bg-[#080d1a] text-slate-300 border-t border-slate-800/80 pt-12 sm:pt-16 pb-0 px-4 sm:px-8 relative overflow-hidden w-full max-w-full">
        {/* Subtle Watermark Logo Emblem in Background */}
        <div className="absolute right-0 top-12 pointer-events-none opacity-[0.035] select-none overflow-hidden max-w-full">
          <img src={optImg(settings.logo_url, 600)} alt="" className="w-[450px] h-[450px] object-contain translate-x-8" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pb-10 border-b border-slate-800/80">
            
            {/* Col 1: About Aqua Sphere & Logo */}
            <div className="space-y-4">
              <div className="inline-flex items-center bg-white rounded-2xl px-6 py-3 shadow-lg shadow-cyan-500/10">
                <img 
                  src={optImg(settings.logo_url, 600)} 
                  alt={settings.site_name} 
                  className="h-20 sm:h-24 md:h-28 w-auto object-contain transition-transform duration-300 hover:scale-105" 
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

            {/* Col 2: Navigation Links */}
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-6">Quick Navigation</h4>
              <ul className="space-y-3.5 text-sm text-slate-400 font-semibold">
                <li><a href="#hero" className="hover:text-cyan-400 transition-colors">Home</a></li>
                <li><a href="#products" className="hover:text-cyan-400 transition-colors">Products & Refills</a></li>
                <li><a href="#about" className="hover:text-cyan-400 transition-colors">About Aqua Sphere</a></li>
                <li><Link to="/reports" className="hover:text-cyan-400 transition-colors">Lab Reports</Link></li>
                <li><Link to="/certificates" className="hover:text-cyan-400 transition-colors">Our Certificates</Link></li>
                <li><a href="#location" className="hover:text-cyan-400 transition-colors">Our Location</a></li>
                <li><a href="#contact" className="hover:text-cyan-400 transition-colors">Contact Us</a></li>
                <li><Link to="/website-admin" className="hover:text-cyan-400 transition-colors">Website Content Admin</Link></li>
                <li><a href="https://theaquasphere.org/login" className="hover:text-cyan-400 transition-colors">Software ERP Portal</a></li>
              </ul>
            </div>

            {/* Col 3: Direct Contact Info */}
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

            {/* Col 4: Timings & Address */}
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


          {/* Bottom Copyright & Sub-links */}
          <div className="pt-4 pb-2 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <p>© {new Date().getFullYear()} {settings.site_name} Mineral Water. All rights reserved.</p>
            <div className="flex gap-6">
              <Link to="/website-admin" className="hover:text-cyan-400 transition-colors duration-200">Website Admin</Link>
              <a href="https://theaquasphere.org/login" className="hover:text-cyan-400 transition-colors duration-200">Software Login</a>
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

      {/* FLOATING WHATSAPP BUTTON */}
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
