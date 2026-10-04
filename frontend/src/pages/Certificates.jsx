import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import './certificates-reports.css';

const LOGO_URL = "https://res.cloudinary.com/wgstyulb/image/upload/v1791005735/logo.png";

const CERTIFICATES = [
  {
    id: 1,
    title: 'Certificate 1',
    description: 'Trademark registration',
    pdfUrl: '/pdfs/certificates/certificate-1.pdf',
    badge: 'Trademark'
  },
  {
    id: 2,
    title: 'Certificate 2',
    description: 'Board license',
    pdfUrl: '/pdfs/certificates/certificate-2.pdf',
    badge: 'Licensing'
  },
  {
    id: 3,
    title: 'Certificate 3',
    description: 'Labour registration',
    pdfUrl: '/pdfs/certificates/certificate-3.pdf',
    badge: 'Registration'
  },
  {
    id: 4,
    title: 'Certificate 4',
    description: 'Compliance document',
    pdfUrl: '/pdfs/certificates/certificate-4.pdf',
    badge: 'Compliance'
  },
  {
    id: 5,
    title: 'Certificate 5',
    description: 'Verification document',
    pdfUrl: '/pdfs/certificates/certificate-5.pdf',
    badge: 'Verification'
  },
  {
    id: 6,
    title: 'Certificate 6',
    description: 'Supporting certificate',
    pdfUrl: '/pdfs/certificates/certificate-6.pdf',
    badge: 'Certification'
  },
];

const REPORTS = [
  {
    id: 1,
    title: 'Water Quality Report',
    description: 'Official laboratory chemical and microbiological purity analysis',
    pdfUrl: '/pdfs/reports/lab-report.pdf',
    badge: 'Lab Tested'
  },
];

function WhatsAppIcon({ className = "w-6 h-6" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.031 2C6.495 2 2 6.494 2 12.03c0 1.77.462 3.498 1.34 5.02L2 22l5.097-1.336a9.98 9.98 0 004.934 1.366h.004c5.534 0 10.029-4.495 10.029-10.03 0-2.68-1.043-5.198-2.937-7.094A9.972 9.972 0 0012.031 2zm0 18.27h-.003a8.27 8.27 0 01-4.218-1.154l-.302-.18-3.023.792.807-2.946-.197-.314a8.278 8.278 0 01-1.27-4.408c0-4.57 3.719-8.29 8.29-8.29 2.215 0 4.298.863 5.864 2.43 1.566 1.567 2.428 3.65 2.428 5.867 0 4.572-3.719 8.291-8.385 8.291zm4.544-6.208c-.249-.125-1.472-.727-1.7-.81-.228-.083-.394-.125-.56.125-.166.249-.643.81-.788.976-.145.166-.29.187-.539.062-.249-.125-1.05-.387-2-1.234-.739-.659-1.238-1.473-1.383-1.722-.145-.249-.015-.384.11-.508.112-.112.249-.29.373-.435.125-.145.166-.249.249-.415.083-.166.042-.311-.02-.435-.063-.125-.56-1.35-.768-1.85-.202-.486-.407-.42-.56-.428l-.477-.008c-.166 0-.435.062-.663.311-.228.249-.871.851-.871 2.074 0 1.224.892 2.406 1.016 2.572.125.166 1.755 2.68 4.252 3.757.594.256 1.058.41 1.42.525.597.19 1.14.163 1.569.099.479-.072 1.472-.602 1.68-1.183.207-.58.207-1.078.145-1.183-.062-.104-.228-.166-.477-.291z" />
    </svg>
  );
}

export default function Certificates({ initialTab = 'certificates' }) {
  const location = useLocation();
  const isReportsPage = location.pathname === '/reports' || initialTab === 'reports';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-cyan-500 selection:text-white flex flex-col">
      
      {/* 1. TOP INFORMATION BAR (Identical to LandingPage) */}
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

      {/* 2. MAIN NAVBAR (Identical to LandingPage) */}
      <header className="sticky top-0 z-50 bg-[#0f172a]/95 backdrop-blur-xl border-b border-white/15 transition-all shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-24 sm:h-28 flex items-center justify-between">
          {/* Logo - Large, Crisp, Object Contain */}
          <Link to="/" className="flex items-center group py-2">
            <img 
              src={LOGO_URL} 
              alt="Aqua Sphere" 
              className="h-16 sm:h-20 md:h-24 w-auto object-contain transition-transform group-hover:scale-105 drop-shadow-md"
              loading="eager"
            />
          </Link>

          {/* Desktop Nav Links (Reference capsule) */}
          <nav className="hidden lg:flex items-center gap-1 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/15 shadow-inner">
            <Link to="/" className="px-3.5 py-1.5 rounded-full text-white text-sm font-bold hover:bg-white/20 hover:text-cyan-200 transition-all">Home</Link>
            <Link to="/#products" className="px-3.5 py-1.5 rounded-full text-white text-sm font-bold hover:bg-white/20 hover:text-cyan-200 transition-all">Products</Link>
            <Link to="/#about" className="px-3.5 py-1.5 rounded-full text-white text-sm font-bold hover:bg-white/20 hover:text-cyan-200 transition-all">About</Link>
            <Link 
              to="/reports" 
              className={`px-3.5 py-1.5 rounded-full text-sm font-bold transition-all ${
                isReportsPage ? 'bg-white/25 text-cyan-200 shadow-sm' : 'text-white hover:bg-white/20 hover:text-cyan-200'
              }`}
            >
              Reports
            </Link>
            <Link 
              to="/certificates" 
              className={`px-3.5 py-1.5 rounded-full text-sm font-bold transition-all ${
                !isReportsPage ? 'bg-white/25 text-cyan-200 shadow-sm' : 'text-white hover:bg-white/20 hover:text-cyan-200'
              }`}
            >
              Certificates
            </Link>
            <Link to="/#location" className="px-3.5 py-1.5 rounded-full text-white text-sm font-bold hover:bg-white/20 hover:text-cyan-200 transition-all">Location</Link>
            <Link to="/#contact" className="px-3.5 py-1.5 rounded-full text-white text-sm font-bold hover:bg-white/20 hover:text-cyan-200 transition-all">Contact</Link>
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
            <Link to="/" onClick={() => setMobileMenuOpen(false)} className="hover:text-cyan-400 py-1">Home</Link>
            <Link to="/#products" onClick={() => setMobileMenuOpen(false)} className="hover:text-cyan-400 py-1">Products</Link>
            <Link to="/#about" onClick={() => setMobileMenuOpen(false)} className="hover:text-cyan-400 py-1">About</Link>
            <Link 
              to="/reports" 
              onClick={() => setMobileMenuOpen(false)} 
              className={`hover:text-cyan-400 py-1 ${isReportsPage ? 'text-cyan-400 font-extrabold' : ''}`}
            >
              Reports
            </Link>
            <Link 
              to="/certificates" 
              onClick={() => setMobileMenuOpen(false)} 
              className={`hover:text-cyan-400 py-1 ${!isReportsPage ? 'text-cyan-400 font-extrabold' : ''}`}
            >
              Certificates
            </Link>
            <Link to="/#location" onClick={() => setMobileMenuOpen(false)} className="hover:text-cyan-400 py-1">Location</Link>
            <Link to="/#contact" onClick={() => setMobileMenuOpen(false)} className="hover:text-cyan-400 py-1">Contact</Link>
            
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

      {/* 3. SHOWCASE CONTENT */}
      <main className="flex-1 docs-showcase">
        {!isReportsPage ? (
          <>
            {/* Header: Certificates */}
            <div className="showcase-header">
              <span className="showcase-tag">Official Documents</span>
              <h1>Our <span>Certificates</span></h1>
              <p>Verified certifications, registration credentials, and compliance documents presented in a premium interface.</p>
            </div>

            {/* 2-Column Grid */}
            <div className="docs-grid-premium">
              {CERTIFICATES.map((cert) => (
                <div key={cert.id} className="doc-premium-card group">
                  <div className="doc-card-top-line" />
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 group-hover:text-sky-700 transition-colors">
                        {cert.title}
                      </h3>
                      <p className="text-slate-500 text-sm mt-1">{cert.description}</p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200 shrink-0">
                      <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                      {cert.badge}
                    </span>
                  </div>

                  <div className="pdf-frame mt-4">
                    <iframe 
                      src={`${cert.pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                      title={cert.title}
                      className="w-full h-full border-0 block bg-white"
                    />
                  </div>

                  <div className="mt-5 flex items-center justify-between flex-wrap gap-3">
                    <a 
                      href={cert.pdfUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="file-link"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      <span>View Full Document</span>
                    </a>

                    <a 
                      href={cert.pdfUrl} 
                      download 
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-sky-600 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download PDF</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Header: Lab Reports */}
            <div className="showcase-header">
              <span className="showcase-tag">Quality Assurance</span>
              <h1>Lab <span>Reports</span></h1>
              <p>Official water testing reports, mineral composition, and laboratory quality benchmarks displayed in clean premium layout.</p>
            </div>

            {/* Single Large Centered Report Card */}
            <div className="docs-grid-premium single-report-grid">
              {REPORTS.map((report) => (
                <div key={report.id} className="doc-premium-card group">
                  <div className="doc-card-top-line" />
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <h3 className="text-2xl sm:text-3xl font-black text-slate-900 group-hover:text-sky-700 transition-colors">
                        {report.title}
                      </h3>
                      <p className="text-slate-500 text-base mt-1">{report.description}</p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      {report.badge}
                    </span>
                  </div>

                  <div className="pdf-frame pdf-frame-large mt-4">
                    <iframe 
                      src={`${report.pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                      title={report.title}
                      className="w-full h-full border-0 block bg-white"
                    />
                  </div>

                  <div className="mt-6 flex items-center justify-between flex-wrap gap-4">
                    <a 
                      href={report.pdfUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="file-link"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      <span>View Full Lab Report</span>
                    </a>

                    <a 
                      href={report.pdfUrl} 
                      download 
                      className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-sky-600 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download PDF</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* 4. FOOTER (Matching LandingPage footer) */}
      <footer className="w-full bg-[#070b14] text-white pt-14 pb-0 relative overflow-hidden mt-16 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 pb-12 border-b border-slate-800">
            {/* Col 1 */}
            <div>
              <div className="inline-flex items-center bg-white rounded-2xl px-6 py-3 shadow-lg shadow-cyan-500/10 mb-4">
                <img 
                  src={LOGO_URL} 
                  alt="Aqua Sphere" 
                  className="h-20 sm:h-24 md:h-28 w-auto object-contain transition-transform duration-300 hover:scale-105"
                />
              </div>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">
                Premium purified drinking water bottled with cutting-edge reverse osmosis, UV sterilization, and vital mineral replenishment for Islamabad & Rawalpindi.
              </p>
              <div className="flex items-center gap-3">
                <a
                  href="https://wa.me/923015072233?text=Hello%20AquaSphere"
                  target="_blank"
                  rel="noreferrer"
                  className="w-9 h-9 rounded-full bg-slate-800/80 hover:bg-[#25D366] text-white flex items-center justify-center transition-all"
                  title="WhatsApp"
                >
                  <WhatsAppIcon className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Col 2 */}
            <div>
              <h4 className="text-base font-bold text-white mb-4 tracking-wide">Quick Navigation</h4>
              <ul className="space-y-2.5 text-sm text-slate-400">
                <li><Link to="/" className="hover:text-cyan-400 transition-colors">Home</Link></li>
                <li><Link to="/#products" className="hover:text-cyan-400 transition-colors">Products & Bottles</Link></li>
                <li><Link to="/#about" className="hover:text-cyan-400 transition-colors">About Aqua Sphere</Link></li>
                <li><Link to="/reports" className="hover:text-cyan-400 transition-colors">Lab Reports</Link></li>
                <li><Link to="/certificates" className="hover:text-cyan-400 transition-colors">Our Certificates</Link></li>
                <li><Link to="/#location" className="hover:text-cyan-400 transition-colors">Factory Location</Link></li>
              </ul>
            </div>

            {/* Col 3 */}
            <div>
              <h4 className="text-base font-bold text-white mb-4 tracking-wide">Contact Details</h4>
              <ul className="space-y-3 text-sm text-slate-300">
                <li className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-cyan-400 mt-1 shrink-0" />
                  <div>
                    <span className="block text-xs uppercase tracking-wider text-slate-500 font-semibold mb-0.5">Telephone</span>
                    <a href="tel:0515454438" className="text-slate-200 font-medium hover:text-cyan-400">051-545-443-8</a>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-cyan-400 mt-1 shrink-0" />
                  <div>
                    <span className="block text-xs uppercase tracking-wider text-slate-500 font-semibold mb-0.5">Working Hours</span>
                    <span className="text-slate-200 font-medium">Mon - Sat: 8:00 AM - 5:00 PM</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-cyan-400 mt-1 shrink-0" />
                  <div>
                    <span className="block text-xs uppercase tracking-wider text-slate-500 font-semibold mb-0.5">Factory Address</span>
                    <span className="text-slate-200 font-medium leading-relaxed">Plot No. 3 Lieutenant Zafar Mehmood Shaheed Road Rawalpindi Cantt</span>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Copyright */}
          <div className="pt-4 pb-2 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <p>© {new Date().getFullYear()} Aqua Sphere Mineral Water. All rights reserved.</p>
            <div className="flex gap-6">
              <Link to="/website-admin" className="hover:text-cyan-400 transition-colors duration-200">Website Admin</Link>
              <a href="https://theaquasphere.org/login" className="hover:text-cyan-400 transition-colors duration-200">Software Login</a>
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
        href="https://wa.me/923015072233?text=Hello%20AquaSphere" 
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
