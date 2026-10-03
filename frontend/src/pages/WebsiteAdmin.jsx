import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Save, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Image as ImageIcon, 
  Phone, 
  Layout, 
  Package, 
  RefreshCw,
  Sparkles,
  Layers,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  LogOut
} from 'lucide-react';
import { toast } from 'sonner';

const optImg = (url, width = 300) => {
  if (!url || typeof url !== 'string' || !url.includes('cloudinary.com')) return url;
  if (url.includes('/f_auto,q_auto')) return url;
  return url.replace('/image/upload/', `/image/upload/f_auto,q_auto,w_${width}/`);
};

export default function WebsiteAdmin() {
  const { user, login, logout, verifyOwnerOtp, resendOwnerOtp, loading: authLoading } = useAuth();
  const isAuthorized = !!user && (user.role === 'OWNER' || user.role === 'ADMIN');

  // Website Editor State
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assets, setAssets] = useState({ images: [], products: [] });
  const [activeTab, setActiveTab] = useState('general');

  // Admin Login Screen State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginTenant, setLoginTenant] = useState('aquasphere');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // 2FA State for Owner
  const [is2FAStep, setIs2FAStep] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [emailMask, setEmailMask] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpCooldown, setOtpCooldown] = useState(0);

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setInterval(() => {
      setOtpCooldown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCooldown]);

  // Fetch website settings & Cloudinary assets when authenticated & authorized
  useEffect(() => {
    if (!isAuthorized) {
      setLoading(false);
      return;
    }

    setLoading(true);
    // 1. Fetch Landing Page Settings
    fetch('/api/landing-page')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setSettings(data.data);
        }
      })
      .catch((_err) => {
        toast.error('Failed to load settings');
      })
      .finally(() => setLoading(false));

    // 2. Fetch Available Cloudinary Assets (with auth credentials)
    fetch('/api/landing-page/assets', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setAssets(data.data);
        }
      })
      .catch(() => {});
  }, [isAuthorized]);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const res = await login(loginEmail, loginPassword, loginTenant);
      if (res.success && res.require2FA) {
        setTempToken(res.tempToken);
        setEmailMask(res.emailMask || 'your email');
        setOtpCooldown(res.resendCooldown || 60);
        setIs2FAStep(true);
      } else if (!res.success) {
        setLoginError(res.message || 'Invalid admin credentials');
      }
    } catch (err) {
      setLoginError(err.message || 'Failed to sign in');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleVerify2FA = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 6) {
      setLoginError('Please enter the 6-digit OTP code');
      return;
    }
    setLoginError('');
    setLoginLoading(true);
    try {
      const res = await verifyOwnerOtp(tempToken, otpCode, loginTenant);
      if (!res.success) {
        setLoginError(res.message || 'Invalid verification code');
      }
    } catch (err) {
      setLoginError(err.message || 'Verification failed');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (otpCooldown > 0) return;
    setLoginLoading(true);
    try {
      const res = await resendOwnerOtp(tempToken);
      if (res.success) {
        toast.success('New verification code sent');
        setOtpCooldown(res.resendCooldown || 60);
      } else {
        setLoginError(res.message || 'Failed to resend code');
      }
    } catch (err) {
      setLoginError(err.message || 'Error resending code');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setSettings(null);
    toast.success('Logged out from Website Admin');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/landing-page', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Website content saved successfully!');
      } else {
        toast.error(data.message || 'Failed to save');
      }
    } catch (err) {
      toast.error('Error saving settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleGeneralChange = (field, val) => {
    setSettings(prev => ({ ...prev, [field]: val }));
  };

  const handleProductChange = (index, field, val) => {
    setSettings(prev => {
      const newProds = [...(prev.products || [])];
      newProds[index] = { ...newProds[index], [field]: val };
      return { ...prev, products: newProds };
    });
  };

  const addProduct = () => {
    const newProd = {
      id: `p_${Date.now()}`,
      name: 'New Product',
      desc: 'High purity mineral water bottle',
      price: 'PKR 100',
      image: assets.products[0]?.url || 'https://res.cloudinary.com/wgstyulb/image/upload/v1791005454/product_1777146556_7174.png'
    };
    setSettings(prev => ({
      ...prev,
      products: [...(prev.products || []), newProd]
    }));
  };

  const removeProduct = (index) => {
    setSettings(prev => {
      const newProds = prev.products.filter((_, i) => i !== index);
      return { ...prev, products: newProds };
    });
  };

  // 1. Session verification loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <RefreshCw className="w-8 h-8 animate-spin text-cyan-400 mb-3" />
        <p className="text-xs text-slate-400 font-medium">Verifying administrator session...</p>
      </div>
    );
  }

  // 2. Unauthenticated or Unauthorized: Render Website Admin Login Screen
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Glow ambient background effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-sky-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="w-full max-w-md relative z-10">
          {/* Header Branding */}
          <div className="text-center mb-8">
            <div className="inline-flex p-3 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl shadow-cyan-950/30 text-cyan-400 mb-4">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Website Admin Portal</h1>
            <p className="text-xs text-slate-400 mt-2 max-w-xs mx-auto">
              Please enter your administrator credentials to access and modify public website content.
            </p>
          </div>

          {/* Insufficient permissions warning if logged in with non-admin role */}
          {user && (
            <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-300">Access Restricted</p>
                  <p className="mt-1 text-slate-300">
                    You are signed in as <strong className="text-white">{user.name}</strong> with role <strong className="text-amber-400 uppercase">{user.role}</strong>. Website content management requires <strong>OWNER</strong> or <strong>ADMIN</strong> permissions.
                  </p>
                  <button
                    onClick={() => logout()}
                    className="mt-3 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold border border-amber-500/40 transition-colors cursor-pointer"
                  >
                    Switch to Admin Account
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sign-in Card */}
          <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/60">
            {loginError && (
              <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            {is2FAStep ? (
              <form onSubmit={handleVerify2FA} className="space-y-5">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto mb-3">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h2 className="text-base font-bold text-white">Two-Factor Authentication</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Enter the 6-digit verification code sent to <span className="text-slate-200">{emailMask}</span>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2 text-center uppercase tracking-wider">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full text-center tracking-[0.5em] text-2xl font-mono py-3 px-4 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                    autoFocus
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full py-3 px-4 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-950/40 disabled:opacity-50"
                >
                  {loginLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  <span>Verify & Access Admin</span>
                </button>

                <div className="flex items-center justify-between text-xs pt-2">
                  <button
                    type="button"
                    onClick={() => setIs2FAStep(false)}
                    className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    ← Back to Login
                  </button>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={otpCooldown > 0 || loginLoading}
                    className="text-cyan-400 hover:text-cyan-300 disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    {otpCooldown > 0 ? `Resend in ${otpCooldown}s` : 'Resend Code'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAdminLogin} className="space-y-4">
                {/* Facility Pill Toggle */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Company Facility
                  </label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setLoginTenant('aquasphere')}
                      className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        loginTenant === 'aquasphere'
                          ? 'bg-cyan-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Aqua Sphere
                    </button>
                    <button
                      type="button"
                      onClick={() => setLoginTenant('wadaana')}
                      className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        loginTenant === 'wadaana'
                          ? 'bg-cyan-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Wadaana ERP
                    </button>
                  </div>
                </div>

                {/* Email Input */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Admin Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="admin@aquasphere.pk"
                      required
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Admin Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(prev => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-950/40 disabled:opacity-50"
                >
                  {loginLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Sign In to Website Admin</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Back link */}
          <div className="text-center mt-6">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-cyan-400 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Public Website</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. Authenticated & Authorized: Loading settings
  if (loading || !settings) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <RefreshCw className="w-8 h-8 animate-spin text-cyan-400 mb-3" />
        <p className="text-xs text-slate-400">Loading website content editor...</p>
      </div>
    );
  }

  // 4. Authenticated & Authorized: Render Website Content Manager Editor
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans pb-24">
      {/* Top Admin Header */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              to="/" 
              className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>View Landing Page</span>
            </Link>
            <div className="h-5 w-px bg-slate-800"></div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <Layout className="w-5 h-5 text-cyan-400" />
              <span>Website Content Manager</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Authenticated user badge */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="text-slate-300 font-medium">{user.name}</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase">{user.role}</span>
            </div>

            <Link 
              to="/dashboard" 
              className="text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-lg border border-slate-700 transition-colors"
            >
              Software ERP
            </Link>

            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 rounded-lg shadow-md shadow-cyan-900/40 transition-all cursor-pointer"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{saving ? 'Saving...' : 'Save All Changes'}</span>
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs font-semibold text-rose-300 hover:text-rose-200 bg-rose-950/40 hover:bg-rose-900/50 px-3 py-2 rounded-lg border border-rose-800/50 transition-colors cursor-pointer"
              title="Log out from Website Admin"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Log Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="max-w-7xl mx-auto px-6 mt-8">
        {/* Navigation Tabs */}
        <div className="flex gap-2 border-b border-slate-800 pb-4 mb-8">
          {[
            { id: 'general', label: 'Contact & Header Info', icon: Phone },
            { id: 'hero', label: 'Hero Section', icon: Sparkles },
            { id: 'products', label: 'Products Catalog', icon: Package },
            { id: 'about', label: 'About & Technology', icon: Layers },
            { id: 'cloudinary', label: 'Cloudinary Assets', icon: ImageIcon },
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  active 
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: GENERAL INFO */}
        {activeTab === 'general' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-950 p-6 rounded-2xl border border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">Website Name</label>
              <input 
                type="text" 
                value={settings?.site_name || ''} 
                onChange={(e) => handleGeneralChange('site_name', e.target.value)} 
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">Landline Phone</label>
              <input 
                type="text" 
                value={settings?.phone || ''} 
                onChange={(e) => handleGeneralChange('phone', e.target.value)} 
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">WhatsApp Order Number</label>
              <input 
                type="text" 
                value={settings?.whatsapp || ''} 
                onChange={(e) => handleGeneralChange('whatsapp', e.target.value)} 
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                placeholder="e.g. 923015072233"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">Opening Hours</label>
              <input 
                type="text" 
                value={settings?.opening_hours || ''} 
                onChange={(e) => handleGeneralChange('opening_hours', e.target.value)} 
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-2">Factory Location Address</label>
              <input 
                type="text" 
                value={settings?.location || ''} 
                onChange={(e) => handleGeneralChange('location', e.target.value)} 
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-2">Google Map Embed Link</label>
              <input 
                type="text" 
                value={settings?.map_embed || ''} 
                onChange={(e) => handleGeneralChange('map_embed', e.target.value)} 
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        )}

        {/* TAB 2: HERO */}
        {activeTab === 'hero' && (
          <div className="space-y-6 bg-slate-950 p-6 rounded-2xl border border-slate-800">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">Hero Line 1</label>
                <input 
                  type="text" 
                  value={settings?.hero_title || ''} 
                  onChange={(e) => handleGeneralChange('hero_title', e.target.value)} 
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">Hero Line 2 (Highlighted Gradient)</label>
                <input 
                  type="text" 
                  value={settings?.hero_subtitle || ''} 
                  onChange={(e) => handleGeneralChange('hero_subtitle', e.target.value)} 
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">Hero Paragraph</label>
              <textarea 
                rows="3"
                value={settings?.hero_text || ''} 
                onChange={(e) => handleGeneralChange('hero_text', e.target.value)} 
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
              ></textarea>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">Button Text</label>
              <input 
                type="text" 
                value={settings?.hero_button || ''} 
                onChange={(e) => handleGeneralChange('hero_button', e.target.value)} 
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        )}

        {/* TAB 3: PRODUCTS */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Active Product Cards</h3>
              <button 
                onClick={addProduct}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Product</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {settings?.products?.map((prod, idx) => (
                <div key={prod.id || idx} className="bg-slate-950 border border-slate-800 p-5 rounded-2xl flex flex-col gap-4">
                  <div className="relative h-44 bg-slate-900/60 rounded-xl p-3 flex items-center justify-center border border-slate-800/80">
                    <img src={prod.image} alt={prod.name} className="max-h-full max-w-full object-contain" />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Product Title</label>
                    <input 
                      type="text" 
                      value={prod.name} 
                      onChange={(e) => handleProductChange(idx, 'name', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Price Tag</label>
                    <input 
                      type="text" 
                      value={prod.price} 
                      onChange={(e) => handleProductChange(idx, 'price', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-cyan-400 focus:outline-none focus:border-cyan-500 font-extrabold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Description</label>
                    <textarea 
                      rows="2"
                      value={prod.desc} 
                      onChange={(e) => handleProductChange(idx, 'desc', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
                    ></textarea>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Image URL (from Cloudinary)</label>
                    <input 
                      type="text" 
                      value={prod.image} 
                      onChange={(e) => handleProductChange(idx, 'image', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-[11px] text-slate-400 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex justify-end">
                    <button 
                      onClick={() => removeProduct(idx)}
                      className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: ABOUT & TECHNOLOGY */}
        {activeTab === 'about' && (
          <div className="space-y-6 bg-slate-950 p-6 rounded-2xl border border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">Company Section Title</label>
              <input 
                type="text" 
                value={settings?.company_title || ''} 
                onChange={(e) => handleGeneralChange('company_title', e.target.value)} 
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">Company Introduction</label>
              <textarea 
                rows="3"
                value={settings?.company_intro || ''} 
                onChange={(e) => handleGeneralChange('company_intro', e.target.value)} 
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
              ></textarea>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">Purification Technology Title</label>
              <input 
                type="text" 
                value={settings?.technology_title || ''} 
                onChange={(e) => handleGeneralChange('technology_title', e.target.value)} 
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">Technology Description</label>
              <textarea 
                rows="3"
                value={settings?.technology_text || ''} 
                onChange={(e) => handleGeneralChange('technology_text', e.target.value)} 
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
              ></textarea>
            </div>
          </div>
        )}

        {/* TAB 5: CLOUDINARY ASSETS EXPLORER */}
        {activeTab === 'cloudinary' && (
          <div className="space-y-8 bg-slate-950 p-6 rounded-2xl border border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white mb-2">Landing Page / Products ({assets.products.length} assets)</h3>
              <p className="text-xs text-slate-400 mb-4">Click any image to copy its Cloudinary URL to clipboard.</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                {assets.products.map(p => (
                  <div 
                    key={p.id} 
                    onClick={() => {
                      navigator.clipboard.writeText(p.url);
                      toast.success(`Copied ${p.name} URL!`);
                    }}
                    className="bg-slate-900 rounded-xl p-3 border border-slate-800 hover:border-cyan-500 cursor-pointer transition-all flex flex-col items-center group"
                  >
                    <div className="h-28 w-full flex items-center justify-center">
                      <img src={optImg(p.url, 200)} alt={p.name} className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform" loading="lazy" decoding="async" />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-2 truncate w-full text-center">{p.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-slate-800">
              <h3 className="text-sm font-bold text-white mb-2">Landing Page / Images ({assets.images.length} assets)</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                {assets.images.map(img => (
                  <div 
                    key={img.id} 
                    onClick={() => {
                      navigator.clipboard.writeText(img.url);
                      toast.success(`Copied ${img.name} URL!`);
                    }}
                    className="bg-slate-900 rounded-xl p-3 border border-slate-800 hover:border-cyan-500 cursor-pointer transition-all flex flex-col items-center group"
                  >
                    <div className="h-28 w-full flex items-center justify-center">
                      <img src={optImg(img.url, 200)} alt={img.name} className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform" loading="lazy" decoding="async" />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-2 truncate w-full text-center">{img.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
