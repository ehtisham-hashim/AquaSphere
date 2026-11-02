import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { SEOHead } from '../components/common/SEOHead';
import { getDirectWhatsAppUrl, openAutoWhatsApp } from '../utils/whatsapp';
import PublicNavbar from '../components/common/PublicNavbar';
import { 
  Phone, 
  Clock, 
  MapPin, 
  X, 
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
  ChevronLeft,
  ChevronRight,
  Factory,
  Mail,
  User,
  MessageSquare,
  Star,
  Eye,
  Loader2,
  AlertCircle
} from 'lucide-react';
import './landing.css';
import './certificates-reports.css';
import { CERTIFICATE_SECTIONS, ALL_CERTIFICATES } from '../data/certificatesData';
import CertificateLightboxModal from '../components/common/CertificateLightboxModal';

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
  contact_email: "info@theaquasphere.org",
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
      image: "https://res.cloudinary.com/nm7nuaas/image/upload/v1793552631/Aqua_Sphere_19-Liter_Water_Jug.png"
    },
    {
      id: "p2",
      name: "1.5L Bottle",
      desc: "Daily hydration",
      price: "PKR 100",
      image: "https://res.cloudinary.com/nm7nuaas/image/upload/v1793552634/Aquasphere_1.5L_Blue-Capped_Water_Bottle.png"
    },
    {
      id: "p3",
      name: "500ml Bottle",
      desc: "Portable and convenient",
      price: "PKR 50",
      image: "https://res.cloudinary.com/nm7nuaas/image/upload/v1793552631/Aqua_Sphere_Mountain_Bottle_Cutout.png"
    },
    {
      id: "p4",
      name: "Dispenser",
      desc: "Instant water access",
      price: "PKR 35000",
      image: "https://res.cloudinary.com/nm7nuaas/image/upload/v1793555453/Aqua_Sphere_Water_Cooler_Product_Render.png"
    },
    {
      id: "p5",
      name: "Table Top Dispenser",
      desc: "Compact Design, Pure Hydration.",
      price: "PKR 2500",
      image: "https://res.cloudinary.com/nm7nuaas/image/upload/v1793552633/AQUA_SPHERE_Tilted_Water_Dispenser.png"
    },
    {
      id: "p6",
      name: "Tap & Stand",
      desc: "Simple Setup, Pure Water",
      price: "PKR 1500",
      image: "https://res.cloudinary.com/nm7nuaas/image/upload/v1793552631/Aqua_Sphere_Mountain_Bottle_Cutout.png"
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


const getProductSpecs = (product) => {
  if (product.specs && Array.isArray(product.specs) && product.specs.length > 0) {
    return product.specs;
  }
  const name = (product.name || '').toLowerCase();
  if (name.includes('19l') || name.includes('19 litre') || name.includes('19 liter')) {
    return [
      'pH 7.2 – 7.8 (Balanced Alkaline Hydration)',
      'TDS 120 – 160 mg/L (PSQCA & WHO Certified)',
      '100% Food-Grade BPA-Free Polycarbonate',
      'Doorstep Delivery & Quick Weekly Exchange'
    ];
  }
  if (name.includes('1.5l') || name.includes('500ml') || name.includes('bottle')) {
    return [
      'pH 6.5 – 8.5 (Naturally Purified)',
      'TDS 130 – 250 mg/L (Optimal Mineral Balance)',
      '100% Recyclable Food-Grade Sealed PET',
      'Hermetically Sealed Tamper-Proof Cap'
    ];
  }
  if (name.includes('dispenser') || name.includes('table top')) {
    return [
      'Dual Flow Hot & Cold Instant Taps',
      'Food-Grade Stainless Steel Internal Reservoir',
      'Energy Efficient Low Power Compressor',
      'Compatible with Standard 19L Bottles'
    ];
  }
  return [
    'Heavy-Duty Ergonomic Metal Stand',
    'Food-Grade Fast-Flow Manual Dispensing Tap',
    'Compact Design for Countertops & Offices',
    'Zero Electricity Required & Easy Maintenance'
  ];
};

function ProductShowcaseModal({ products, activeIdx, onClose, onSelectIdx, getWhatsAppLink, optImg, WhatsAppIcon, onWhatsAppClick }) {
  // Wheel scroll debounce for carousel navigation
  const lastScrollTime = useRef(0);
  const totalProducts = products?.length || 0;

  // Keyboard navigation & body scroll lock
  useEffect(() => {
    if (activeIdx === null || totalProducts === 0) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        onSelectIdx((activeIdx + 1) % totalProducts);
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        onSelectIdx((activeIdx - 1 + totalProducts) % totalProducts);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [activeIdx, totalProducts, onClose, onSelectIdx]);

  if (activeIdx === null || !products || !products[activeIdx]) return null;
  const currentProd = products[activeIdx];
  const specs = getProductSpecs(currentProd);

  const handleWheel = (e) => {
    const now = Date.now();
    if (now - lastScrollTime.current < 400) return;
    if (Math.abs(e.deltaY) > 25) {
      lastScrollTime.current = now;
      if (e.deltaY > 0) {
        onSelectIdx((activeIdx + 1) % totalProducts);
      } else {
        onSelectIdx((activeIdx - 1 + totalProducts) % totalProducts);
      }
    }
  };

  return (
    <div 
      className="lp-showcase-backdrop fixed inset-0 z-[9999] flex flex-col justify-between overflow-hidden"
      onWheel={handleWheel}
      role="dialog"
      aria-modal="true"
      aria-label={`Product showcase for ${currentProd.name}`}
    >
      {/* Massive Elegancia-style Watermark Text Background */}
      <div className="lp-showcase-watermark" aria-hidden="true">
        AQUASPHERE
      </div>

      {/* Top Header Bar with Dash Progress Indicators & Close */}
      <div className="lp-showcase-top-bar">
        <div className="w-10 hidden sm:block" />

        {/* Top Dash Progress Indicators */}
        <div className="lp-showcase-dashes" role="tablist" aria-label="Product selection dashes">
          {products.map((p, i) => (
            <button
              key={p.id || i}
              type="button"
              role="tab"
              aria-selected={i === activeIdx}
              aria-label={`Select ${p.name}`}
              onClick={() => onSelectIdx(i)}
              className={`lp-showcase-dash ${i === activeIdx ? 'is-active' : ''}`}
            />
          ))}
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="lp-showcase-close-btn"
          aria-label="Close product showcase"
        >
          <X className="w-5 h-5 text-slate-700" />
        </button>
      </div>

      {/* Main Content Area: Left Details, Right Product Image */}
      <div className="lp-showcase-content">
        {/* Previous Product Arrow */}
        <button
          type="button"
          onClick={() => onSelectIdx((activeIdx - 1 + products.length) % products.length)}
          className="lp-showcase-nav-arrow lp-nav-prev"
          aria-label="Previous product"
        >
          <ChevronLeft className="w-6 h-6 text-slate-700" />
        </button>

        <div className="lp-showcase-grid">
          {/* Left Column: Product Information */}
          <div className="lp-showcase-left">
            <span className="lp-showcase-counter">
              Product {activeIdx + 1} of {products.length}
            </span>
            <h2 className="lp-showcase-title">
              {currentProd.name}.
            </h2>
            <p className="lp-showcase-desc">
              {currentProd.desc}
            </p>

            {/* Bullet Points with Blue Dots (Elegancia style) */}
            <ul className="lp-showcase-specs">
              {specs.map((item, i) => (
                <li key={i} className="lp-showcase-spec-item">
                  <span className="lp-showcase-spec-dot" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            {/* Price & Order on WhatsApp CTA */}
            <div className="lp-showcase-actions">
              <div className="lp-showcase-price-tag">
                <span className="lp-showcase-price-label">Price</span>
                <span className="lp-showcase-price-val">{currentProd.price}</span>
              </div>
              <a
                href={getWhatsAppLink(currentProd.name)}
                onClick={(e) => onWhatsAppClick ? onWhatsAppClick(e, currentProd.name) : undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="lp-showcase-whatsapp-btn"
              >
                <WhatsAppIcon className="w-5 h-5 text-white shrink-0" />
                <span>Order on WhatsApp</span>
              </a>
            </div>
          </div>

          {/* Right Column: Product Image with Reflection Shadow */}
          <div className="lp-showcase-right">
            <div className="lp-showcase-image-wrapper">
              <img
                src={optImg(currentProd.image, 900)}
                alt={currentProd.name}
                className="lp-showcase-img"
              />
              <div className="lp-showcase-shadow" aria-hidden="true" />
            </div>
          </div>
        </div>

        {/* Next Product Arrow */}
        <button
          type="button"
          onClick={() => onSelectIdx((activeIdx + 1) % products.length)}
          className="lp-showcase-nav-arrow lp-nav-next"
          aria-label="Next product"
        >
          <ChevronRight className="w-6 h-6 text-slate-700" />
        </button>
      </div>

      {/* Bottom Information Hint */}
      <div className="lp-showcase-bottom-bar">
        <span className="text-xs text-slate-400 font-medium">
          Scroll or use arrow keys to browse products • Press Esc or ✕ to close
        </span>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [selectedProductIdx, setSelectedProductIdx] = useState(null);
  const [selectedCertIdx, setSelectedCertIdx] = useState(null);
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactStatus, setContactStatus] = useState(null);

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
    const rawNumber = settings.whatsapp || '923015072233';
    let msg;
    if (!productName) {
      msg = 'Hello Aqua Sphere, I want to inquire about drinking water.';
    } else if (productName.startsWith('New Contact Form Inquiry:')) {
      msg = productName;
    } else {
      msg = `Hello Aqua Sphere, I want to order: ${productName}`;
    }
    return getDirectWhatsAppUrl(rawNumber, msg);
  };

  const handleWhatsAppAction = (e, productName = '') => {
    if (!e || (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey)) {
      if (e && e.preventDefault) e.preventDefault();
      const rawNumber = settings.whatsapp || '923015072233';
      const msg = productName
        ? `Hello Aqua Sphere, I want to order: ${productName}`
        : 'Hello Aqua Sphere, I want to inquire about drinking water.';
      openAutoWhatsApp(rawNumber, msg);
    }
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

  const sendContact = async (e) => {
    e.preventDefault();
    setContactStatus(null);
    const formEl = e.currentTarget;
    const fd = new FormData(formEl);
    const name = String(fd.get('name') || '').trim();
    const email = String(fd.get('email') || '').trim();
    const message = String(fd.get('message') || '').trim();

    if (!name || !email || !message) {
      toast.error('Please fill in your name, email, and message.');
      setContactStatus({
        type: 'error',
        message: 'Please provide all required fields (Name, Email, and Message).'
      });
      return;
    }

    setContactSubmitting(true);
    try {
      const res = await fetch('/api/landing-page/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || 'Your inquiry has been sent to our team!');
        setContactStatus({
          type: 'success',
          message: data.message || 'Thank you! Your message has been sent to our team. We will get back to you shortly.'
        });
        formEl.reset();
      } else {
        toast.error(data.message || 'Failed to submit inquiry.');
        setContactStatus({
          type: 'error',
          message: data.message || 'Failed to submit inquiry. Please try again or reach out on WhatsApp.'
        });
      }
    } catch (_err) {
      toast.error('Network error. Please try again later.');
      setContactStatus({
        type: 'error',
        message: 'Network error. Please try again later or contact us directly on WhatsApp.'
      });
    } finally {
      setContactSubmitting(false);
    }
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

      {/* 1. TOP INFORMATION BAR & MAIN NAVBAR */}
      <PublicNavbar settings={settings} />

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
            <a 
              href={getWhatsAppLink()} 
              onClick={(e) => handleWhatsAppAction(e)}
              target="_blank" 
              rel="noreferrer" 
              className="lp-btn-secondary"
            >
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
            {settings.products?.map((prod, idx) => (
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
                    <div className="lp-product-actions">
                      <button
                        type="button"
                        onClick={() => setSelectedProductIdx(idx)}
                        className="lp-btn-view-product"
                        aria-label={`View details for ${prod.name}`}
                      >
                        <span>View Product</span>
                      </button>
                      <a 
                        href={getWhatsAppLink(prod.name)} 
                        onClick={(e) => handleWhatsAppAction(e, prod.name)}
                        target="_blank" 
                        rel="noreferrer" 
                        className="lp-btn-whatsapp-icon"
                        title={`Order ${prod.name} on WhatsApp`}
                        aria-label={`Order ${prod.name} on WhatsApp`}
                      >
                        <WhatsAppIcon className="w-4 h-4 text-white shrink-0" />
                      </a>
                    </div>
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

      {/* 8. OFFICIAL CERTIFICATIONS & LICENSING (ELEGANCIA-STYLE) */}
      <section id="certifications" className="py-20 bg-slate-50 border-t border-slate-200/80">
        <div className="lp-section-container">
          <div className="lp-section-header">
            <span className="lp-section-tag">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
              <span>Government Approved & PSQCA Certified</span>
            </span>
            <h2 className="lp-section-title">Official Standards & Certifications</h2>
            <p className="lp-section-subtitle">
              AquaSphere operates with complete regulatory transparency, holding national quality marks, corporate incorporation, and health safety approvals.
            </p>
          </div>

          {/* Two Stacked Sections of 3 Certificates each */}
          <div className="space-y-12 max-w-7xl mx-auto mt-10">
            {CERTIFICATE_SECTIONS.map((section, sIdx) => (
              <div key={section.id} className="cert-section-block mb-10">
                <div className="cert-section-header flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <div className="cert-section-title-wrap">
                      <span className="cert-section-number">{sIdx + 1}</span>
                      <h3 className="cert-section-title">{section.categoryName}</h3>
                    </div>
                    <p className="cert-section-sub">{section.subtitle}</p>
                  </div>
                </div>

                <div className="cert-cards-grid mt-6">
                  {section.certificates.map((cert) => {
                    const globalIdx = ALL_CERTIFICATES.findIndex(c => c.id === cert.id);
                    return (
                      <article
                        key={cert.id}
                        onClick={() => setSelectedCertIdx(globalIdx)}
                        className="cert-card-elegancia group"
                        tabIndex={0}
                        role="button"
                        aria-label={`View certificate: ${cert.title}`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedCertIdx(globalIdx);
                          }
                        }}
                      >
                        {/* Certificate Framed Preview Box */}
                        <div className="cert-card-img-box">
                          <div className="cert-card-img-frame">
                            <img
                              src={cert.image}
                              alt={cert.title}
                              loading="lazy"
                            />
                          </div>
                          <span className="cert-card-zoom-badge">
                            <Eye className="w-3.5 h-3.5" />
                            <span>Click to View</span>
                          </span>
                        </div>

                        {/* Card Content Details */}
                        <div className="cert-card-body">
                          <div className="cert-card-top-info">
                            <div className="cert-card-badge-row">
                              <span className="cert-badge-pill">{cert.badge}</span>
                              <span className="text-[11px] font-semibold text-slate-500">{cert.validity}</span>
                            </div>
                            <h4 className="cert-card-title">{cert.title}</h4>
                            <p className="cert-card-authority">{cert.authority}</p>
                            <p className="cert-card-number">{cert.number}</p>
                          </div>

                          {/* Card Footer CTA */}
                          <div className="cert-card-footer">
                            <span className="cert-view-link">
                              <span>View Full Certificate</span>
                              <ChevronRight className="w-4 h-4" />
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium">Click to inspect</span>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Elegancia-style bottom link */}
          <div className="mt-8 text-center">
            <Link
              to="/certificates"
              className="inline-flex items-center gap-2 text-sm font-bold text-sky-700 hover:text-sky-800 transition-colors group"
            >
              <span>See all license details & lab test reports</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* 9. LOCATION SECTION */}
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
                    <a href={`tel:${settings.phone}`} className="hover:text-cyan-600 transition-colors">
                      {settings.phone}
                    </a>
                  </div>
                </div>

                <div className="lp-contact-channel">
                  <div className="lp-channel-icon">
                    <WhatsAppIcon className="w-5 h-5 text-[#25D366]" />
                  </div>
                  <div className="lp-channel-info">
                    <strong>WhatsApp Inquiries</strong>
                    <a 
                      href={getWhatsAppLink()} 
                      onClick={(e) => handleWhatsAppAction(e)} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="hover:text-emerald-500 transition-colors"
                    >
                      +{settings.whatsapp}
                    </a>
                  </div>
                </div>

                <div className="lp-contact-channel">
                  <div className="lp-channel-icon">
                    <Mail className="w-5 h-5 text-sky-600" />
                  </div>
                  <div className="lp-channel-info">
                    <strong>Email Support</strong>
                    <a 
                      href={`mailto:${settings.contact_email || 'info@theaquasphere.org'}`} 
                      className="hover:text-cyan-600 transition-colors"
                    >
                      {settings.contact_email || 'info@theaquasphere.org'}
                    </a>
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
                {contactStatus && (
                  <div className={`p-4 mb-4 flex items-start gap-3.5 rounded-none border-l-4 shadow-sm transition-all ${
                    contactStatus.type === 'success'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-950 border-t border-r border-b border-t-emerald-200 border-r-emerald-200 border-b-emerald-200'
                      : 'bg-rose-50 border-rose-500 text-rose-950 border-t border-r border-b border-t-rose-200 border-r-rose-200 border-b-rose-200'
                  }`}>
                    {contactStatus.type === 'success' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className={`text-sm font-bold leading-tight mb-1 ${contactStatus.type === 'success' ? 'text-emerald-900' : 'text-rose-900'}`}>
                        {contactStatus.type === 'success' ? 'Message Sent Successfully!' : 'Unable to Send Message'}
                      </p>
                      <p className={`text-xs font-medium leading-relaxed ${contactStatus.type === 'success' ? 'text-emerald-800' : 'text-rose-800'}`}>
                        {contactStatus.message}
                      </p>
                    </div>
                  </div>
                )}

                <div className="lp-form-group">
                  <label htmlFor="contact-name">Your Name</label>
                  <div className="lp-input-wrapper">
                    <User className="w-4 h-4" />
                    <input id="contact-name" name="name" type="text" placeholder="Enter your full name" required disabled={contactSubmitting} />
                  </div>
                </div>

                <div className="lp-form-group">
                  <label htmlFor="contact-email">Email Address</label>
                  <div className="lp-input-wrapper">
                    <Mail className="w-4 h-4" />
                    <input id="contact-email" name="email" type="email" placeholder="name@domain.com" required disabled={contactSubmitting} />
                  </div>
                </div>

                <div className="lp-form-group">
                  <label htmlFor="contact-message">Message or Order Inquiry</label>
                  <div className="lp-input-wrapper">
                    <MessageSquare className="w-4 h-4" />
                    <textarea id="contact-message" name="message" placeholder="Tell us how we can help with your drinking water needs..." required disabled={contactSubmitting}></textarea>
                  </div>
                </div>

                <button type="submit" disabled={contactSubmitting} className="lp-btn-primary w-full disabled:opacity-60 cursor-pointer">
                  {contactSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending Message...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Message</span>
                      <Send className="w-4 h-4" />
                    </>
                  )}
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
                  onClick={(e) => handleWhatsAppAction(e)}
                  target="_blank" 
                  rel="noreferrer" 
                  title="WhatsApp" 
                  className="w-10 h-10 rounded-none bg-slate-900 border border-slate-800 hover:border-emerald-500 hover:bg-slate-800 text-[#25D366] flex items-center justify-center transition-all shadow-sm cursor-pointer"
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
                  <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 group-hover:border-cyan-500/50 transition-colors">
                    <Mail className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <span className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-0.5">Email Support</span>
                    <a href={`mailto:${settings.contact_email || 'info@theaquasphere.org'}`} className="text-slate-200 hover:text-cyan-400 transition-colors font-medium">
                      {settings.contact_email || 'info@theaquasphere.org'}
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-3 group">
                  <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 group-hover:border-emerald-500/50 transition-colors">
                    <WhatsAppIcon className="w-4 h-4 text-[#25D366]" />
                  </div>
                  <div>
                    <span className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-0.5">WhatsApp Orders</span>
                    <a 
                      href={getWhatsAppLink()} 
                      onClick={(e) => handleWhatsAppAction(e)}
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-slate-200 hover:text-[#25D366] transition-colors font-medium cursor-pointer"
                    >
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
        onClick={(e) => handleWhatsAppAction(e)}
        target="_blank" 
        rel="noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-bold px-4 py-3 rounded-none shadow-2xl transition-all hover:scale-105 cursor-pointer"
        title="Chat on WhatsApp"
        aria-label="Order on WhatsApp"
      >
        <WhatsAppIcon className="w-6 h-6 text-white shrink-0" />
        <span className="text-xs font-bold hidden sm:inline">ORDER ON WHATSAPP</span>
      </a>

      {/* 11. ELEGANCIA-INSPIRED PRODUCT SHOWCASE MODAL */}
      {selectedProductIdx !== null && (
        <ProductShowcaseModal
          products={settings.products || DEFAULT_SETTINGS.products}
          activeIdx={selectedProductIdx}
          onClose={() => setSelectedProductIdx(null)}
          onSelectIdx={(idx) => setSelectedProductIdx(idx)}
          getWhatsAppLink={getWhatsAppLink}
          optImg={optImg}
          WhatsAppIcon={WhatsAppIcon}
          onWhatsAppClick={handleWhatsAppAction}
        />
      )}

      {/* 12. CERTIFICATE LIGHTBOX MODAL */}
      <CertificateLightboxModal
        certificates={ALL_CERTIFICATES}
        activeIdx={selectedCertIdx}
        onClose={() => setSelectedCertIdx(null)}
        onSelectIdx={(idx) => setSelectedCertIdx(idx)}
      />

    </div>
  );
}
