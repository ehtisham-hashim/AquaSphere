import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SEOHead } from '../components/common/SEOHead';
import { 
  Phone, 
  Clock, 
  MapPin, 
  Menu, 
  X, 
  Settings, 
  LogIn,
  ExternalLink,
  Droplets,
  Award,
  ShieldCheck,
  Microscope,
  Truck,
  ArrowRight,
  ArrowDown,
  Send,
  CheckCircle2,
  Factory,
  Mail,
  User,
  MessageSquare,
  Star
} from 'lucide-react';
import './landing.css';

// Official WhatsApp icon SVG with vibrant green default
function WhatsAppIcon({ className = "w-5 h-5" }) {
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
  opening_hours: "Monday to Saturday - 8AM to 8PM",
  location: "Plot No. 3 Lieutenant Zafar Mehmood Shaheed Road Rawalpindi Cantt",
  whatsapp: "923015072233",
  logo_url: "https://res.cloudinary.com/dcbdne09h/image/upload/v1791915156/Aqua_Sphere_Water_Leaf_Logo_am7t4i.png",
  hero_bg_url: "https://res.cloudinary.com/wgstyulb/image/upload/v1791005808/hero-bg.jpg",
  hero_title: "Always want safe",
  hero_subtitle: "and good water for healthy life",
  hero_text: "Clean, safe and refreshing hydration for modern living.",
  hero_button: "Explore Products",
  about_title: "About Aqua Sphere",
  about_intro: "Welcome to Aqua Sphere, where naturally occurring electrolytes meet premium hydration for everyone.",
  company_title: "Company Introduction",
  company_intro: "Aqua Sphere Mineral Water, established in 2019, provides pure, clean, and affordable drinking water.",
  company_image: "https://res.cloudinary.com/wgstyulb/image/upload/v1791005628/aqua-project-machine.png",
  technology_title: "Aqua Sphere",
  technology_text: "Aqua Sphere – Purity in Every Drop.",
  commitment_title: "Aqua Sphere – Clean Water, Healthy Life.",
  commitment_text: "Aqua Sphere – Trusted Water, Trusted Choice.",
  project_tag: "Strategic Joint Venture",
  project_title: "Wadaana Industries Proudly Announces Its JV with Aqua Sphere for Stronger and Innovative Future",
  project_text: "Wadaana Industries professionally manufactures high-quality water production and purification systems with modern technology, reliable performance, and trusted standards.",
  project_button: "View Project Details",
  location_title: "Our Location",
  map_embed: "https://www.google.com/maps?q=AQUA%20SPHERE%2C%2033.6104649%2C72.9818914&output=embed",
  map_link: "https://www.google.com/maps/place/AQUA+SPHERE/@33.6104612,72.9819,599m/data=!3m1!1e3!4m6!3m5!1s0x38df970024408d31:0xa9c9cb0ebd2d1923!8m2!3d33.6104649!4d72.9818914!16s%2Fg%2F11xg3w12kj?hl=en&entry=ttu",
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
  ],
  reviews_tag: "TRUSTED BY HOMES & CORPORATE CLIENTS",
  reviews_title: "What our clients",
  reviews_title_accent: "say",
  reviews_subtitle: "Real experiences from families, clinics, and businesses who rely on AquaSphere for pristine daily hydration.",
  reviews: [
    {
      id: "rev_1",
      name: "Monster King",
      role: "Verified Home Delivery Client",
      company: "Rawalpindi",
      rating: 5,
      time_ago: "10 months ago",
      headline: "Luxury in every drop",
      comment: "Luxury in every drop, exceptional water purity, and the staff is genuinely professional and caring. The bottles arrive sealed, spotless, and right on time every week. AquaSphere has made healthy hydration effortless for our household."
    },
    {
      id: "rev_2",
      name: "Zubair Jamshaid",
      role: "Verified Customer",
      company: "Rawalpindi Cantt",
      rating: 5,
      time_ago: "8 months ago",
      headline: "High quality product with quick delivery",
      comment: "High quality product with lightning quick delivery! The TDS count and crisp mineral taste are always consistent. Their team is polite, reliable, and prompt whenever we reorder. By far the best drinking water service in Rawalpindi."
    },
    {
      id: "rev_3",
      name: "Sadam Kham",
      role: "Local Guide & Verified Client",
      company: "Islamabad / Rawalpindi",
      rating: 5,
      time_ago: "2 months ago",
      headline: "Excellent Service",
      comment: "I'm very satisfied with Aqua Sphere Mineral Water. The water quality is excellent, fresh, and hygienically packed. Their service is professional, and the staff is very cooperative. Highly recommended for clean and reliable drinking water."
    }
  ]
};

export default function LandingPage() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Reviews Carousel State (Interactive Circular Progress Bar)
  const reviewsList = (settings.reviews && settings.reviews.length > 0) ? settings.reviews : DEFAULT_SETTINGS.reviews;
  const [activeReviewIdx, setActiveReviewIdx] = useState(0);
  const [reviewProgress, setReviewProgress] = useState(0);
  const [isReviewPaused, setIsReviewPaused] = useState(false);

  useEffect(() => {
    if (isReviewPaused || !reviewsList || reviewsList.length <= 1) return;
    const intervalMs = 50;
    const durationMs = 5500;
    const step = (intervalMs / durationMs) * 100;

    const timer = setInterval(() => {
      setReviewProgress((prev) => {
        if (prev >= 100) {
          setActiveReviewIdx((curr) => (curr + 1) % reviewsList.length);
          return 0;
        }
        return prev + step;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isReviewPaused, reviewsList, activeReviewIdx]);

  const handleSelectReview = (idx) => {
    setActiveReviewIdx(idx);
    setReviewProgress(0);
  };

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

  const reviewsStructuredData = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "AquaSphere Mineral Water & Purification",
    "image": "https://res.cloudinary.com/dcbdne09h/image/upload/v1791915156/Aqua_Sphere_Water_Leaf_Logo_am7t4i.png",
    "url": "https://theaquasphere.org/",
    "telephone": "+92-301-5072233",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Plot No. 3 Lieutenant Zafar Mehmood Shaheed Road",
      "addressLocality": "Rawalpindi Cantt",
      "addressRegion": "Punjab",
      "postalCode": "46000",
      "addressCountry": "PK"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "5.0",
      "reviewCount": String(reviewsList.length),
      "bestRating": "5",
      "worstRating": "1"
    },
    "review": reviewsList.map(r => ({
      "@type": "Review",
      "author": {
        "@type": "Person",
        "name": r.name
      },
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": r.rating || 5,
        "bestRating": "5"
      },
      "reviewBody": r.comment
    }))
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
    <div className="lp min-h-screen">
      
      {/* Dynamic Route SEO Metadata */}
      <SEOHead 
        title="AquaSphere | Pure Drinking Water Delivery, 19L Refills & Wholesale Bottles"
        description="AquaSphere delivers certified 100% pure drinking water, 19L refills, food-grade wholesale empty bottles, PET packs, and dispensers. Fast doorstep delivery for homes, corporate offices, and global distribution."
        keywords="pure drinking water delivery, 19L water bottle refill, wholesale empty bottles, pure water Islamabad, drinking water Rawalpindi, mineral water plant, bottled water supplier, water refill near me, 19 litre water bottle price, 500ml water bottle pack, 1.5L mineral water, water dispenser, bottle caps, bulk drinking water supplier, RO water plant, BPA free water bottle, commercial water supplier"
        canonicalUrl="https://theaquasphere.org/"
        structuredData={reviewsStructuredData}
      />

      {/* 1. TOP INFORMATION BAR */}
      <div className="bg-[#030a16] text-slate-300 text-xs sm:text-sm font-medium py-2 px-4 sm:px-8 border-b border-white/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2 text-center md:text-left">
          <div className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Land Line: <strong className="text-white">{settings.phone}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>{settings.opening_hours}</span>
          </div>
          <div className="flex items-center gap-2 truncate max-w-md">
            <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>{settings.location}</span>
          </div>
        </div>
      </div>

      {/* 2. MAIN NAVBAR */}
      <header className="sticky top-0 z-50 bg-[#06162a]/90 backdrop-blur-xl border-b border-white/10 shadow-lg transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-20 sm:h-22 flex items-center justify-between">
          
          {/* Logo */}
          <a href="#hero" className="flex items-center group py-2" aria-label="AquaSphere Pure Drinking Water Delivery">
            <img 
              src={optImg(settings.logo_url, 800)} 
              alt="AquaSphere Pure Drinking Water & Wholesale Bottles Logo" 
              width="160"
              height="56"
              className="h-12 sm:h-14 w-auto object-contain transition-transform group-hover:scale-105"
              loading="eager"
              fetchpriority="high"
            />
          </a>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-7">
            <a href="#hero" className="text-white/90 hover:text-cyan-400 text-sm font-semibold transition-colors">Home</a>
            <a href="#products" className="text-white/90 hover:text-cyan-400 text-sm font-semibold transition-colors">Products</a>
            <a href="#about" className="text-white/90 hover:text-cyan-400 text-sm font-semibold transition-colors">About</a>
            <Link to="/reports" className="text-cyan-200 hover:text-white text-sm font-semibold transition-colors">Reports</Link>
            <Link to="/certificates" className="text-cyan-200 hover:text-white text-sm font-semibold transition-colors">Certificates</Link>
            <a href="#location" className="text-white/90 hover:text-cyan-400 text-sm font-semibold transition-colors">Location</a>
            <a href="#contact" className="text-white/90 hover:text-cyan-400 text-sm font-semibold transition-colors">Contact</a>
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

      {/* 3. HERO */}
      <section
        id="hero"
        className="lp-hero"
        style={{ backgroundImage: `url(${optImg(settings.hero_bg_url, 1600)})` }}
      >
        <div className="lp-hero-inner">
          <div className="lp-hero-badge">
            <Droplets className="w-3.5 h-3.5 text-cyan-400" />
            <span>100% Pure Mineral Water • Certified Quality</span>
          </div>

          <h1>
            <span>{settings.hero_title}</span>
            <br />
            <span>{settings.hero_subtitle}</span>
          </h1>

          <p>{settings.hero_text}</p>

          <div className="lp-hero-actions">
            <a href="#products" className="lp-btn-primary">
              <span>{settings.hero_button || 'Explore Products'}</span>
              <ArrowDown className="w-4 h-4" />
            </a>
            <a href={getWhatsAppLink()} target="_blank" rel="noreferrer" className="lp-btn-secondary">
              <WhatsAppIcon className="w-4 h-4 text-[#25D366]" />
              <span>Order on WhatsApp</span>
            </a>
          </div>

          <div className="lp-hero-trust-bar">
            <div className="lp-trust-item">
              <CheckCircle2 className="w-4 h-4" />
              <span>PSQCA & PCRWR Compliant</span>
            </div>
            <div className="lp-trust-item">
              <Microscope className="w-4 h-4" />
              <span>Daily Laboratory Tested</span>
            </div>
            <div className="lp-trust-item">
              <Truck className="w-4 h-4" />
              <span>Prompt Doorstep Delivery</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. ABOUT SECTION */}
      <section id="about" className="lp-about-section">
        <div className="lp-section-container">
          <div className="lp-section-header">
            <span className="lp-section-tag">
              <Droplets className="w-3.5 h-3.5 text-sky-600" />
              <span>Our Heritage & Mission</span>
            </span>
            <h2 className="lp-section-title">{settings.about_title}</h2>
            <p className="lp-section-subtitle">{settings.about_intro}</p>
          </div>

          <div className="lp-about-grid">
            {/* Main Brand Story Card */}
            <div className="lp-about-main-card">
              <div>
                <span className="lp-about-badge">Established 2019</span>
                <h3 className="lp-about-card-title">{settings.company_title}</h3>
                <p className="lp-about-card-text">{settings.company_intro}</p>
              </div>

              <div className="lp-about-highlights">
                <div className="lp-highlight-item">
                  <ShieldCheck className="w-5 h-5 text-sky-600 shrink-0" />
                  <div>
                    <strong>Certified Purity</strong>
                    <span>Rigorous Multi-Stage Filtration</span>
                  </div>
                </div>
                <div className="lp-highlight-item">
                  <Microscope className="w-5 h-5 text-sky-600 shrink-0" />
                  <div>
                    <strong>Lab Monitored</strong>
                    <span>Continuous Mineral Balance</span>
                  </div>
                </div>
                <div className="lp-highlight-item">
                  <CheckCircle2 className="w-5 h-5 text-sky-600 shrink-0" />
                  <div>
                    <strong>Customer First</strong>
                    <span>Trusted by Thousands Daily</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Dual Pillar Cards */}
            <div className="lp-about-pillars">
              <div className="lp-pillar-card">
                <div className="lp-pillar-icon">
                  <Droplets className="w-6 h-6 text-sky-600" />
                </div>
                <div>
                  <h3 className="lp-pillar-title">{settings.technology_title}</h3>
                  <p className="lp-pillar-text">{settings.technology_text}</p>
                </div>
              </div>

              <div className="lp-pillar-card">
                <div className="lp-pillar-icon">
                  <ShieldCheck className="w-6 h-6 text-sky-600" />
                </div>
                <div>
                  <h3 className="lp-pillar-title">{settings.commitment_title}</h3>
                  <p className="lp-pillar-text">{settings.commitment_text}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. PREMIUM WATER PROJECT (WADAANA INDUSTRIES JV) */}
      <section className="lp-project">
        <div className="lp-section-container">
          <div
            className="lp-project-card"
            style={{
              backgroundImage: `linear-gradient(90deg, rgba(3, 10, 22, 0.94) 0%, rgba(6, 22, 42, 0.85) 45%, rgba(3, 10, 22, 0.40) 100%), url(${optImg(settings.company_image, 1400)})`
            }}
          >
            <div className="lp-project-overlay">
              <span className="lp-project-tag">
                <Award className="w-3.5 h-3.5 text-cyan-400" />
                <span>{settings.project_tag || 'Strategic Joint Venture'}</span>
              </span>
              <h2>{settings.project_title}</h2>
              <p>{settings.project_text}</p>
              <a href="#contact" className="lp-btn-primary">
                <span>{settings.project_button || 'View Project Details'}</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 6. PRODUCTS SECTION */}
      <section id="products" className="lp-products-section">
        <div className="lp-section-container">
          <div className="lp-section-header">
            <span className="lp-section-tag">
              <Droplets className="w-3.5 h-3.5 text-sky-600" />
              <span>Hydration Solutions</span>
            </span>
            <h2 className="lp-section-title">Our Premium Product Range</h2>
            <p className="lp-section-subtitle">
              Pure, balanced mineral water in tailored sizes for homes, corporate offices, and active lifestyles.
            </p>
          </div>

          <div className="lp-products">
            {settings.products?.map((prod) => (
              <div key={prod.id} className="lp-product">
                <div className="lp-product-image-box">
                  <img 
                    src={optImg(prod.image, 500)} 
                    alt={`${prod.name} - Pure Drinking Water Delivery & Wholesale Bottles`} 
                    loading="lazy" 
                    decoding="async" 
                    width="260"
                    height="230"
                  />
                </div>
                <div className="lp-product-body">
                  <h3 className="lp-product-title">{prod.name}</h3>
                  <p className="lp-product-desc">{prod.desc}</p>
                  <div className="lp-product-footer">
                    <div className="lp-product-price-wrapper">
                      <span className="lp-price-label">Price</span>
                      <p className="lp-price">{prod.price}</p>
                    </div>
                    <a 
                      href={getWhatsAppLink(prod.name)} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="lp-btn-whatsapp"
                      aria-label={`Order ${prod.name} on WhatsApp`}
                    >
                      <WhatsAppIcon className="w-4 h-4 text-white shrink-0" />
                      <span>Order WhatsApp</span>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. CLIENT REVIEWS SECTION (WHAT OUR CLIENTS SAY) */}
      <section 
        id="reviews" 
        className="lp-reviews-section"
        onMouseEnter={() => setIsReviewPaused(true)}
        onMouseLeave={() => setIsReviewPaused(false)}
        aria-label="What our clients say"
      >
        <div className="lp-section-container">
          <div className="lp-reviews-wrapper">
            {/* Left Column: Heading and Indicator Avatars with Circular Status Bar */}
            <div className="lp-reviews-left">
              <div className="lp-reviews-badge">
                <span className="lp-reviews-badge-square" aria-hidden="true" />
                <span>{settings.reviews_tag || "TRUSTED BY HOMES & CORPORATE CLIENTS"}</span>
              </div>
              <h2 className="lp-reviews-heading">
                {settings.reviews_title || "What our clients"}{' '}
                <span className="lp-reviews-accent">{settings.reviews_title_accent || "say"}</span>
              </h2>

              {/* Avatar Indicator Circles with Circular Status Ring */}
              <div 
                className="lp-reviews-avatars-row" 
                role="tablist" 
                aria-label="Client review selection"
              >
                {reviewsList.map((rev, idx) => {
                  const isActive = idx === activeReviewIdx;
                  // Radius: 25px -> Circumference = 2 * PI * 25 ≈ 157.08
                  const radius = 25;
                  const circumference = 2 * Math.PI * radius;
                  const strokeOffset = isActive 
                    ? circumference - (circumference * reviewProgress) / 100 
                    : circumference;

                  return (
                    <button
                      key={rev.id || idx}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      aria-label={`View review by ${rev.name}`}
                      onClick={() => handleSelectReview(idx)}
                      className={`lp-review-avatar-btn ${isActive ? 'is-active' : ''}`}
                    >
                      <svg 
                        className="lp-review-ring-svg" 
                        width="58" 
                        height="58" 
                        viewBox="0 0 58 58"
                        aria-hidden="true"
                      >
                        {/* Background track circle */}
                        <circle
                          cx="29"
                          cy="29"
                          r={radius}
                          className="lp-review-ring-bg"
                        />
                        {/* Animated progress status circle */}
                        {isActive && (
                          <circle
                            cx="29"
                            cy="29"
                            r={radius}
                            className="lp-review-ring-progress"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeOffset}
                          />
                        )}
                      </svg>

                      <div className="lp-review-avatar-inner">
                        <User className="lp-review-avatar-icon" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Quote and Author Info */}
            <div className="lp-reviews-right">
              {reviewsList[activeReviewIdx] && (
                <div 
                  className="lp-review-card"
                  key={reviewsList[activeReviewIdx].id || activeReviewIdx}
                >
                  {/* Star Rating */}
                  <div className="lp-review-stars-row">
                    <div className="lp-review-stars" aria-label="5 out of 5 stars">
                      {[...Array(reviewsList[activeReviewIdx].rating || 5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <span className="lp-review-stars-label">
                      5.0 Google Rating · {reviewsList[activeReviewIdx].time_ago || "Verified Review"}
                    </span>
                  </div>

                  {/* Main Testimonial Quote */}
                  <blockquote className="lp-review-quote">
                    “{reviewsList[activeReviewIdx].comment}”
                  </blockquote>

                  {/* Reviewer Details */}
                  <div className="lp-review-author-line">
                    <span className="lp-review-author-name">{reviewsList[activeReviewIdx].name}</span>
                    <span className="lp-review-author-sep">, </span>
                    <span className="lp-review-author-role">{reviewsList[activeReviewIdx].role} </span>
                    <span className="lp-review-author-company">@{reviewsList[activeReviewIdx].company}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 8. LOCATION SECTION */}
      <section id="location" className="lp-location-section">
        <div className="lp-section-container">
          <div className="lp-section-header">
            <span className="lp-section-tag">
              <MapPin className="w-3.5 h-3.5 text-sky-600" />
              <span>Plant & Distribution Hub</span>
            </span>
            <h2 className="lp-section-title">{settings.location_title}</h2>
            <p className="lp-section-subtitle">{settings.location}</p>
          </div>

          <div className="lp-location-card">
            <div className="lp-location-info-bar">
              <div className="lp-location-info-item">
                <Factory className="w-5 h-5 text-sky-600 shrink-0" />
                <div>
                  <strong>Plant Address</strong>
                  <span>{settings.location}</span>
                </div>
              </div>
              <div className="lp-location-info-item">
                <Clock className="w-5 h-5 text-sky-600 shrink-0" />
                <div>
                  <strong>Working Hours</strong>
                  <span>{settings.opening_hours}</span>
                </div>
              </div>
              <div className="lp-location-info-item">
                <Phone className="w-5 h-5 text-sky-600 shrink-0" />
                <div>
                  <strong>Direct Helpline</strong>
                  <span>{settings.phone}</span>
                </div>
              </div>
            </div>

            <div className="lp-map-box">
              <a 
                href={settings.map_link} 
                target="_blank" 
                rel="noreferrer" 
                className="absolute top-3.5 left-3.5 z-10 inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/95 hover:bg-white text-slate-800 hover:text-cyan-700 text-xs font-bold border border-slate-200/90 shadow-md hover:shadow-lg transition-all rounded-none"
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

            <div className="flex justify-center">
              <a href={settings.map_link} target="_blank" rel="noreferrer" className="lp-btn-primary">
                <MapPin className="w-4 h-4" />
                <span>Get Directions on Google Maps</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 8. CONTACT FORM */}
      <section id="contact" className="lp-contact-section">
        <div className="lp-section-container">
          <div className="lp-contact-card">
            <div className="lp-section-header">
              <span className="lp-section-tag">
                <Mail className="w-3.5 h-3.5 text-sky-600" />
                <span>Get In Touch</span>
              </span>
              <h2 className="lp-section-title">{settings.contact_title}</h2>
              <p className="lp-section-subtitle">
                Connect with our team for residential orders, bulk corporate water solutions, or dealership inquiries.
              </p>
            </div>

            <div className="lp-contact-layout">
              <div className="lp-contact-details-panel">
                <div className="lp-contact-channel">
                  <div className="lp-channel-icon">
                    <Phone className="w-5 h-5 text-sky-600" />
                  </div>
                  <div className="lp-channel-info">
                    <strong>Phone Support</strong>
                    <span>{settings.phone}</span>
                  </div>
                </div>

                <div className="lp-contact-channel">
                  <div className="lp-channel-icon">
                    <WhatsAppIcon className="w-5 h-5 text-[#25D366]" />
                  </div>
                  <div className="lp-channel-info">
                    <strong>WhatsApp Inquiries</strong>
                    <span>+{settings.whatsapp}</span>
                  </div>
                </div>

                <div className="lp-contact-channel">
                  <div className="lp-channel-icon">
                    <Clock className="w-5 h-5 text-sky-600" />
                  </div>
                  <div className="lp-channel-info">
                    <strong>Customer Support Hours</strong>
                    <span>{settings.opening_hours}</span>
                  </div>
                </div>

                <div className="lp-contact-channel">
                  <div className="lp-channel-icon">
                    <Factory className="w-5 h-5 text-sky-600" />
                  </div>
                  <div className="lp-channel-info">
                    <strong>Factory & Plant</strong>
                    <span>{settings.location}</span>
                  </div>
                </div>
              </div>

              <form onSubmit={sendContact} className="lp-contact-form">
                <div className="lp-form-group">
                  <label htmlFor="contact-name">Your Name</label>
                  <div className="lp-input-wrapper">
                    <User className="w-4 h-4" />
                    <input id="contact-name" name="name" type="text" placeholder="Enter your full name" required />
                  </div>
                </div>

                <div className="lp-form-group">
                  <label htmlFor="contact-email">Email Address</label>
                  <div className="lp-input-wrapper">
                    <Mail className="w-4 h-4" />
                    <input id="contact-email" name="email" type="email" placeholder="name@domain.com" required />
                  </div>
                </div>

                <div className="lp-form-group">
                  <label htmlFor="contact-message">Message or Order Inquiry</label>
                  <div className="lp-input-wrapper">
                    <MessageSquare className="w-4 h-4" />
                    <textarea id="contact-message" name="message" placeholder="Tell us how we can help with your drinking water needs..." required></textarea>
                  </div>
                </div>

                <button type="submit" className="lp-btn-primary w-full">
                  <span>Send Message</span>
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* 9. FOOTER */}
      <footer className="bg-[#030a16] text-slate-300 border-t border-white/10 pt-16 pb-0 px-4 sm:px-8 relative overflow-hidden w-full max-w-full">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-white/10">
            
            {/* Col 1: About Aqua Sphere & Logo */}
            <div className="space-y-4">
              <a href="#hero" className="inline-block" aria-label="AquaSphere Home">
                <img 
                  src={optImg(settings.logo_url, 800)} 
                  alt="AquaSphere Pure Drinking Water & Wholesale Bottles Logo" 
                  width="180"
                  height="64"
                  className="h-16 w-auto object-contain transition-transform duration-300 hover:scale-105" 
                  loading="lazy"
                  decoding="async"
                />
              </a>
              <p className="text-slate-400 text-sm leading-relaxed font-normal">
                Aqua Sphere provides pure, safe, and balanced mineral water formulated for wholesome hydration, vitality, and health across households, offices, and institutions.
              </p>
              
              <div className="flex items-center gap-2.5 pt-2">
                <a 
                  href={getWhatsAppLink()} 
                  target="_blank" 
                  rel="noreferrer" 
                  title="WhatsApp" 
                  className="w-10 h-10 rounded-none bg-slate-900 border border-slate-800 hover:border-emerald-500 hover:bg-slate-800 text-[#25D366] flex items-center justify-center transition-all shadow-sm"
                >
                  <WhatsAppIcon className="w-5 h-5 text-[#25D366]" />
                </a>
                <a 
                  href={`tel:${settings.phone}`} 
                  title="Call Us" 
                  className="w-10 h-10 rounded-none bg-slate-900 border border-slate-800 hover:border-cyan-500 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition-all shadow-sm"
                >
                  <Phone className="w-4 h-4" />
                </a>
                <a 
                  href={settings.map_link} 
                  target="_blank" 
                  rel="noreferrer" 
                  title="Open Location" 
                  className="w-10 h-10 rounded-none bg-slate-900 border border-slate-800 hover:border-sky-500 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition-all shadow-sm"
                >
                  <MapPin className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Col 2: Navigation Links */}
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-5">Quick Navigation</h3>
              <ul className="space-y-3 text-sm text-slate-400 font-medium">
                <li><a href="#hero" className="hover:text-cyan-400 transition-colors">Home</a></li>
                <li><a href="#products" className="hover:text-cyan-400 transition-colors">Products Range</a></li>
                <li><a href="#about" className="hover:text-cyan-400 transition-colors">About Aqua Sphere</a></li>
                <li><Link to="/reports" className="hover:text-cyan-400 transition-colors">Lab Reports</Link></li>
                <li><Link to="/certificates" className="hover:text-cyan-400 transition-colors">Official Certificates</Link></li>
                <li><a href="#location" className="hover:text-cyan-400 transition-colors">Plant Location</a></li>
                <li><a href="#contact" className="hover:text-cyan-400 transition-colors">Contact Support</a></li>
                <li><Link to="/website-admin" className="hover:text-cyan-400 transition-colors">Website Content Admin</Link></li>
                <li><a href="https://theaquasphere.org/login" className="hover:text-cyan-400 transition-colors">Software Admin</a></li>
              </ul>
            </div>

            {/* Col 3: Direct Contact Info */}
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-5">Contact Details</h3>
              <ul className="space-y-4 text-sm text-slate-400">
                <li className="flex items-start gap-3 group">
                  <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 group-hover:border-cyan-500/50 transition-colors">
                    <Phone className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <span className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-0.5">Landline</span>
                    <a href={`tel:${settings.phone}`} className="text-slate-200 hover:text-cyan-400 transition-colors font-medium">
                      {settings.phone}
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-3 group">
                  <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 group-hover:border-emerald-500/50 transition-colors">
                    <WhatsAppIcon className="w-4 h-4 text-[#25D366]" />
                  </div>
                  <div>
                    <span className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-0.5">WhatsApp Orders</span>
                    <a href={getWhatsAppLink()} target="_blank" rel="noreferrer" className="text-slate-200 hover:text-[#25D366] transition-colors font-medium">
                      +{settings.whatsapp}
                    </a>
                  </div>
                </li>
              </ul>
            </div>

            {/* Col 4: Timings & Address */}
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-5">Plant & Timings</h3>
              <ul className="space-y-4 text-sm text-slate-400">
                <li className="flex items-start gap-3 group">
                  <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 group-hover:border-cyan-500/50 transition-colors">
                    <Clock className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <span className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-0.5">Working Hours</span>
                    <span className="text-slate-200 font-medium">{settings.opening_hours}</span>
                  </div>
                </li>
                <li className="flex items-start gap-3 group">
                  <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 group-hover:border-cyan-500/50 transition-colors">
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
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <p>© {new Date().getFullYear()} {settings.site_name} Mineral Water. All rights reserved. Purity in Every Drop.</p>
            <div className="flex gap-6">
              <Link to="/website-admin" className="hover:text-cyan-400 transition-colors">Website Admin</Link>
              <a href="https://theaquasphere.org/login" className="hover:text-cyan-400 transition-colors">Software Admin</a>
            </div>
          </div>
        </div>

        {/* Half-cut outline AQUASPHERE */}
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

      {/* 10. FLOATING WHATSAPP BUTTON */}
      <a 
        href={getWhatsAppLink()} 
        target="_blank" 
        rel="noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-bold px-4 py-3 rounded-none shadow-2xl transition-all hover:scale-105"
        title="Chat on WhatsApp"
        aria-label="Order on WhatsApp"
      >
        <WhatsAppIcon className="w-6 h-6 text-white shrink-0" />
        <span className="text-xs font-bold hidden sm:inline">ORDER ON WHATSAPP</span>
      </a>

    </div>
  );
}
