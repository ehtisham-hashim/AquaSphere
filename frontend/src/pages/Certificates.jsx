import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SEOHead } from '../components/common/SEOHead';
import { getDirectWhatsAppUrl } from '../utils/whatsapp';
import { CERTIFICATE_SECTIONS, ALL_CERTIFICATES, REPORTS_DATA } from '../data/certificatesData';
import CertificateLightboxModal from '../components/common/CertificateLightboxModal';
import { 
  ExternalLink, 
  Download, 
  Phone, 
  Clock, 
  MapPin, 
  Menu, 
  X, 
  LogIn, 
  Settings,
  ChevronRight,
  FileText,
  Award,
  Eye
} from 'lucide-react';
import './certificates-reports.css';

const LOGO_URL = "https://res.cloudinary.com/dcbdne09h/image/upload/v1791915156/Aqua_Sphere_Water_Leaf_Logo_am7t4i.png";

function WhatsAppIcon({ className = "w-6 h-6" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.031 2C6.495 2 2 6.494 2 12.03c0 1.77.462 3.498 1.34 5.02L2 22l5.097-1.336a9.98 9.98 0 004.934 1.366h.004c5.534 0 10.029-4.495 10.029-10.03 0-2.68-1.043-5.198-2.937-7.094A9.972 9.972 0 0012.031 2zm0 18.27h-.003a8.27 8.27 0 01-4.218-1.154l-.302-.18-3.023.792.807-2.946-.197-.314a8.278 8.278 0 01-1.27-4.408c0-4.57 3.719-8.29 8.29-8.29 2.215 0 4.298.863 5.864 2.43 1.566 1.567 2.428 3.65 2.428 5.867 0 4.572-3.719 8.291-8.385 8.291zm4.544-6.208c-.249-.125-1.472-.727-1.7-.81-.228-.083-.394-.125-.56.125-.166.249-.643.81-.788.976-.145.166-.29.187-.539.062-.249-.125-1.05-.387-2-1.234-.739-.659-1.238-1.473-1.383-1.722-.145-.249-.015-.384.11-.508.112-.112.249-.29.373-.435.125-.145.166-.249.249-.415.083-.166.042-.311-.02-.435-.063-.125-.56-1.35-.768-1.85-.202-.486-.407-.42-.56-.428l-.477-.008c-.166 0-.435.062-.663.311-.228.249-.871.851-.871 2.074 0 1.224.892 2.406 1.016 2.572.125.166 1.755 2.68 4.252 3.757.594.256 1.058.41 1.42.525.597.19 1.14.163 1.569.099.479-.072 1.472-.602 1.68-1.183.207-.58.207-1.078.145-1.183-.062-.104-.228-.166-.477-.291z" />
    </svg>
  );
}

export default function Certificates({ initialTab = 'certificates' }) {
  const location = useLocation();
  const isReportsRoute = location.pathname === '/reports' || initialTab === 'reports';
  const [activeTab, setActiveTab] = useState(isReportsRoute ? 'reports' : 'certificates');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Lightbox Modal State
  const [lightboxCertIdx, setLightboxCertIdx] = useState(null);
  const [lightboxList, setLightboxList] = useState(ALL_CERTIFICATES);

  useEffect(() => {
    setActiveTab(isReportsRoute ? 'reports' : 'certificates');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname, isReportsRoute]);

  const handleOpenCertificate = (cert) => {
    const list = activeTab === 'reports' ? REPORTS_DATA : ALL_CERTIFICATES;
    const idx = list.findIndex(c => c.id === cert.id);
    setLightboxList(list);
    setLightboxCertIdx(idx !== -1 ? idx : 0);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-cyan-500 selection:text-white flex flex-col">
      <SEOHead 
        title={activeTab === 'reports' ? "Water Quality Reports & Lab Mineral Analysis | AquaSphere" : "Official Certificates & Compliance Licenses | AquaSphere Water"}
        description={activeTab === 'reports' ? "View certified chemical and microbiological laboratory test reports for AquaSphere pure drinking water. PSQCA compliant, optimal TDS, and balanced mineral electrolytes." : "Explore official trademarks, manufacturing licenses, labor registrations, and PSQCA compliance certificates for AquaSphere pure mineral water plant."}
        canonicalUrl={activeTab === 'reports' ? "https://theaquasphere.org/reports" : "https://theaquasphere.org/certificates"}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            {
              "@type": "ListItem",
              "position": 1,
              "name": "Home",
              "item": "https://theaquasphere.org/"
            },
            {
              "@type": "ListItem",
              "position": 2,
              "name": activeTab === 'reports' ? "Lab Reports" : "Certificates",
              "item": activeTab === 'reports' ? "https://theaquasphere.org/reports" : "https://theaquasphere.org/certificates"
            }
          ]
        }}
      />
      
      {/* 1. TOP INFORMATION BAR */}
      <div className="bg-gradient-to-r from-[#082f49] via-[#0369a1] to-[#38bdf8] text-white text-xs sm:text-sm font-semibold py-2.5 px-4 sm:px-8 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2 text-center md:text-left">
          <div className="flex items-center gap-2">
            <span>📞 Land Line: <strong>051-545-443-8</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span>⏰ Monday to Saturday - 8AM to 5PM</span>
          </div>
          <div className="flex items-center gap-2 truncate max-w-md">
            <span>📍 Plot No. 3 Lieutenant Zafar Mehmood Shaheed Road Rawalpindi Cantt</span>
          </div>
        </div>
      </div>

      {/* 2. MAIN NAVBAR */}
      <header className="sticky top-0 z-50 bg-[#0f172a]/95 backdrop-blur-xl border-b border-white/15 transition-all shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-24 sm:h-28 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center group py-2">
            <img 
              src={LOGO_URL} 
              alt="AquaSphere Pure Drinking Water & Wholesale Bottles Logo" width="180" height="72" 
              className="h-16 sm:h-20 md:h-24 w-auto object-contain transition-transform group-hover:scale-105 drop-shadow-md"
              loading="eager"
            />
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-7">
            <Link to="/" className="text-white/90 hover:text-cyan-400 text-sm font-semibold transition-colors">Home</Link>
            <Link to="/#products" className="text-white/90 hover:text-cyan-400 text-sm font-semibold transition-colors">Products</Link>
            <Link to="/#about" className="text-white/90 hover:text-cyan-400 text-sm font-semibold transition-colors">About</Link>
            <Link 
              to="/reports" 
              onClick={() => setActiveTab('reports')}
              className={`text-sm font-semibold transition-colors ${
                activeTab === 'reports' ? 'text-cyan-300 font-bold' : 'text-white/90 hover:text-cyan-400'
              }`}
            >
              Reports
            </Link>
            <Link 
              to="/certificates" 
              onClick={() => setActiveTab('certificates')}
              className={`text-sm font-semibold transition-colors ${
                activeTab === 'certificates' ? 'text-cyan-300 font-bold' : 'text-white/90 hover:text-cyan-400'
              }`}
            >
              Certificates
            </Link>
            <Link to="/#location" className="text-white/90 hover:text-cyan-400 text-sm font-semibold transition-colors">Location</Link>
            <Link to="/#contact" className="text-white/90 hover:text-cyan-400 text-sm font-semibold transition-colors">Contact</Link>
          </nav>

          {/* Header Action Buttons */}
          <div className="hidden sm:flex items-center gap-2.5">
            <Link 
              to="/website-admin" 
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-cyan-200 bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/40 rounded-none transition-all shadow-sm"
              title="Edit Landing Page Content"
            >
              <Settings className="w-3.5 h-3.5 text-cyan-400" />
              <span>Website Admin</span>
            </Link>

            <a 
              href="https://theaquasphere.org/login" 
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 rounded-none transition-all shadow-sm shadow-sky-600/30"
              title="Open Software ERP Portal"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Software Admin</span>
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button 
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-white hover:text-cyan-400 transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#0b1329] border-t border-white/10 px-4 py-4 flex flex-col gap-3 text-sm font-semibold text-white/90">
            <Link to="/" onClick={() => setMobileMenuOpen(false)} className="hover:text-cyan-400 py-1">Home</Link>
            <Link to="/#products" onClick={() => setMobileMenuOpen(false)} className="hover:text-cyan-400 py-1">Products</Link>
            <Link to="/#about" onClick={() => setMobileMenuOpen(false)} className="hover:text-cyan-400 py-1">About</Link>
            <Link 
              to="/reports" 
              onClick={() => { setActiveTab('reports'); setMobileMenuOpen(false); }} 
              className={`hover:text-cyan-400 py-1 ${activeTab === 'reports' ? 'text-cyan-400 font-extrabold' : ''}`}
            >
              Reports
            </Link>
            <Link 
              to="/certificates" 
              onClick={() => { setActiveTab('certificates'); setMobileMenuOpen(false); }} 
              className={`hover:text-cyan-400 py-1 ${activeTab === 'certificates' ? 'text-cyan-400 font-extrabold' : ''}`}
            >
              Certificates
            </Link>
            <Link to="/#location" onClick={() => setMobileMenuOpen(false)} className="hover:text-cyan-400 py-1">Location</Link>
            <Link to="/#contact" onClick={() => setMobileMenuOpen(false)} className="hover:text-cyan-400 py-1">Contact</Link>
            
            <div className="pt-3 border-t border-white/10 flex flex-col gap-2.5">
              <Link 
                to="/website-admin" 
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-2.5 text-xs font-bold text-cyan-200 bg-cyan-950/60 border border-cyan-500/40 rounded-none"
              >
                <Settings className="w-4 h-4 text-cyan-400" />
                <span>Website Admin</span>
              </Link>
              <a 
                href="https://theaquasphere.org/login" 
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-2.5 text-xs font-bold text-white bg-gradient-to-r from-sky-600 to-cyan-600 rounded-none shadow-sm"
              >
                <LogIn className="w-4 h-4" />
                <span>Software Admin</span>
              </a>
            </div>
          </div>
        )}
      </header>

      {/* 3. SHOWCASE CONTENT */}
      <main className="flex-1 docs-showcase">
        {/* Header */}
        <div className="showcase-header">
          <span className="showcase-tag">
            {activeTab === 'certificates' ? 'Verified Government Credentials' : 'Laboratory Purity Testing'}
          </span>
          <h1>
            {activeTab === 'certificates' ? (
              <>Official <span>Certificates</span> & Licenses</>
            ) : (
              <>Water Quality <span>Lab Reports</span></>
            )}
          </h1>
          <p>
            {activeTab === 'certificates' 
              ? 'AquaSphere adheres to rigorous national standards, PSQCA quality compliance, federal corporate registration, and municipal hygiene standards.'
              : 'Certified chemical, physical, and microbiological laboratory testing verifying optimal mineral balance, optimal TDS, and 100% pathogen-free hydration.'
            }
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="docs-tab-nav" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'certificates'}
            onClick={() => setActiveTab('certificates')}
            className={`docs-tab-btn ${activeTab === 'certificates' ? 'is-active' : ''}`}
          >
            <Award className="w-4 h-4" />
            <span>Official Certificates (6)</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'reports'}
            onClick={() => setActiveTab('reports')}
            className={`docs-tab-btn ${activeTab === 'reports' ? 'is-active' : ''}`}
          >
            <FileText className="w-4 h-4" />
            <span>Water Quality Lab Reports (1)</span>
          </button>
        </div>

        {/* Tab 1: Certificates (2 Stacked Sections of 3 Cards Each) */}
        {activeTab === 'certificates' ? (
          <div>
            {CERTIFICATE_SECTIONS.map((section, sIdx) => (
              <section key={section.id} className="cert-section-block">
                {/* Section Header */}
                <div className="cert-section-header">
                  <div className="cert-section-title-wrap">
                    <span className="cert-section-number">{sIdx + 1}</span>
                    <h2 className="cert-section-title">{section.categoryName}</h2>
                  </div>
                  <p className="cert-section-sub">{section.subtitle}</p>
                </div>

                {/* 3-Column Certificate Cards Grid (Elegancia Style) */}
                <div className="cert-cards-grid">
                  {section.certificates.map((cert) => (
                    <article
                      key={cert.id}
                      onClick={() => handleOpenCertificate(cert)}
                      className="cert-card-elegancia group"
                      tabIndex={0}
                      role="button"
                      aria-label={`View certificate: ${cert.title}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleOpenCertificate(cert);
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
                          <h3 className="cert-card-title">{cert.title}</h3>
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
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          /* Tab 2: Lab Reports View */
          <div className="single-report-wrapper">
            {REPORTS_DATA.map((report) => (
              <div key={report.id} className="single-report-card">
                <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
                  <div>
                    <span className="cert-badge-pill inline-block mb-2">{report.badge}</span>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-1">
                      {report.title}
                    </h2>
                    <p className="text-sm sm:text-base text-slate-600 font-medium">
                      {report.authority} · {report.number}
                    </p>
                    <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-2xl leading-relaxed">
                      {report.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenCertificate(report)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-none shadow-sm transition-all cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Preview Image</span>
                    </button>
                    <a
                      href={report.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-none shadow-sm transition-all"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Open PDF</span>
                    </a>
                  </div>
                </div>

                {/* Large Preview */}
                <div 
                  className="single-report-img-box"
                  onClick={() => handleOpenCertificate(report)}
                  title="Click to open lightbox"
                >
                  <img
                    src={report.image}
                    alt={report.title}
                    loading="lazy"
                  />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 flex-wrap gap-3">
                  <span className="text-xs font-semibold text-slate-500">
                    Status: <strong className="text-emerald-600 font-bold">100% Tested & Approved</strong>
                  </span>
                  <a
                    href={report.pdfUrl}
                    download
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-none transition-all shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Official Lab Report</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 4. LIGHTBOX MODAL */}
      <CertificateLightboxModal
        certificates={lightboxList}
        activeIdx={lightboxCertIdx}
        onClose={() => setLightboxCertIdx(null)}
        onSelectIdx={(idx) => setLightboxCertIdx(idx)}
      />

      {/* 5. FOOTER */}
      <footer className="w-full bg-[#070b14] text-white pt-14 pb-0 relative overflow-hidden mt-16 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 pb-12 border-b border-slate-800">
            {/* Col 1 */}
            <div>
              <Link to="/" className="inline-block mb-4">
                <img 
                  src={LOGO_URL} 
                  alt="AquaSphere Pure Drinking Water & Wholesale Bottles" width="220" height="96" 
                  className="h-20 sm:h-24 w-auto object-contain brightness-110 drop-shadow-md"
                  loading="lazy"
                />
              </Link>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">
                Premium purified drinking water bottled with cutting-edge reverse osmosis, UV sterilization, and vital mineral replenishment for Islamabad & Rawalpindi.
              </p>
              <div className="flex items-center gap-3">
                <a
                  href={getDirectWhatsAppUrl("923015072233", "Hello AquaSphere")}
                  target="_blank"
                  rel="noreferrer"
                  className="w-9 h-9 rounded-none bg-slate-800/80 hover:bg-[#25D366] text-white flex items-center justify-center transition-all"
                  title="WhatsApp"
                >
                  <WhatsAppIcon className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Col 2 */}
            <div>
              <h3 className="text-base font-bold text-white uppercase tracking-wider mb-4 border-b border-slate-800 pb-2 inline-block">
                Quick Navigation
              </h3>
              <ul className="space-y-2.5 text-sm text-slate-400">
                <li><Link to="/" className="hover:text-cyan-400 transition-colors">Home Page</Link></li>
                <li><Link to="/#products" className="hover:text-cyan-400 transition-colors">Premium Bottled Products</Link></li>
                <li><Link to="/#about" className="hover:text-cyan-400 transition-colors">About AquaSphere</Link></li>
                <li><Link to="/certificates" className="hover:text-cyan-400 transition-colors">Our Certificates</Link></li>
                <li><Link to="/reports" className="hover:text-cyan-400 transition-colors">Lab Test Reports</Link></li>
                <li><Link to="/#location" className="hover:text-cyan-400 transition-colors">Factory Location</Link></li>
                <li><Link to="/#contact" className="hover:text-cyan-400 transition-colors">Contact Support</Link></li>
              </ul>
            </div>

            {/* Col 3 */}
            <div>
              <h3 className="text-base font-bold text-white uppercase tracking-wider mb-4 border-b border-slate-800 pb-2 inline-block">
                Plant & Commercial Inquiries
              </h3>
              <ul className="space-y-3 text-sm text-slate-400">
                <li className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                  <span>Plot No. 3 Lieutenant Zafar Mehmood Shaheed Road, Bilal Chowk, Rawalpindi Cantt</span>
                </li>
                <li className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-cyan-400 shrink-0" />
                  <a href="tel:0515454438" className="hover:text-cyan-400 transition-colors font-medium">
                    051-545-443-8 (Landline)
                  </a>
                </li>
                <li className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Monday – Saturday: 8:00 AM – 5:00 PM</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Copyright Sub-footer */}
          <div className="py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>© {new Date().getFullYear()} AquaSphere. All rights reserved. Registered under Companies Act 2017.</p>
            <div className="flex items-center gap-6">
              <Link to="/certificates" className="hover:text-slate-400 transition-colors">Certifications</Link>
              <Link to="/reports" className="hover:text-slate-400 transition-colors">Lab Reports</Link>
              <a href="https://theaquasphere.org/login" className="hover:text-cyan-400 transition-colors">Staff Login</a>
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

      {/* Floating WhatsApp Action */}
      <a 
        href={getDirectWhatsAppUrl("923015072233", "Hello AquaSphere")} 
        target="_blank" 
        rel="noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-[#25D366] hover:bg-[#20ba59] text-white font-bold px-4 py-3 rounded-none shadow-2xl hover:scale-105 transition-all shadow-emerald-950/40"
        title="Chat on WhatsApp"
      >
        <WhatsAppIcon className="w-6 h-6 text-white shrink-0" />
        <span className="text-xs font-bold hidden sm:inline">Order Now</span>
      </a>
    </div>
  );
}
