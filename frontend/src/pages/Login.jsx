import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Droplet, Lock, Mail, ArrowRight, Loader2, Building2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenant, setTenant] = useState('aquasphere'); // 'aquasphere' or 'wadaana'
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    const result = await login(email, password, tenant);
    
    if (!result.success) {
      setError(result.message);
    }
    setIsLoading(false);
  };

  const isWadaana = tenant === 'wadaana';

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left Sidebar / Branding Panel */}
      <div className={`hidden lg:flex w-1/2 flex-col justify-between p-12 text-white relative overflow-hidden transition-colors duration-500 ${isWadaana ? 'bg-sky-600 dark:bg-sky-800' : 'bg-emerald-600 dark:bg-emerald-800'}`}>
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10 pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-white blur-[120px]" />
          <div className={`absolute top-[60%] -right-[20%] w-[80%] h-[80%] rounded-full blur-[120px] ${isWadaana ? 'bg-sky-300' : 'bg-emerald-300'}`} />
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-sm">
            {isWadaana ? <Building2 className="w-8 h-8 text-white" /> : <Droplet className="w-8 h-8 text-white" />}
          </div>
          <span className="text-3xl font-bold tracking-tight">
            {isWadaana ? 'Wadaana Industries' : 'AquaSphere'}
          </span>
        </div>

        <div className="relative z-10 space-y-6">
          <h1 className="text-5xl font-bold leading-tight">
            {isWadaana ? (
              <>Next-gen <br /> B2B Blow Molding.</>
            ) : (
              <>Next-gen <br /> Water Plant Management.</>
            )}
          </h1>
          <p className={`text-lg max-w-md ${isWadaana ? 'text-sky-100' : 'text-emerald-100'}`}>
            {isWadaana 
              ? 'Streamline your preform tracking, batch production, and industrial B2B deliveries with intelligent management.' 
              : 'Streamline your CRM, production, delivery, and inventory with an intelligent OS built for the modern beverage industry.'}
          </p>
        </div>

        <div className={`relative z-10 text-sm ${isWadaana ? 'text-sky-200/80' : 'text-emerald-200/80'}`}>
          &copy; {new Date().getFullYear()} {isWadaana ? 'Wadaana Industries' : 'AquaSphere OS'}. All rights reserved.
        </div>
      </div>

      {/* Right Login Form Panel */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 sm:p-12">
        
        {/* Tenant Switcher Tabs */}
        <div className="w-full max-w-md mb-8">
          <div className="flex p-1 space-x-1 bg-slate-100 rounded-xl border border-slate-200/80">
            <button
              onClick={() => { setTenant('aquasphere'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${!isWadaana ? 'bg-white text-emerald-700 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-900'}`}
            >
              <Droplet className="w-4 h-4" />
              AquaSphere
            </button>
            <button
              onClick={() => { setTenant('wadaana'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${isWadaana ? 'bg-white text-sky-600 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-900'}`}
            >
              <Building2 className="w-4 h-4" />
              Wadaana
            </button>
          </div>
        </div>

        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <div className="lg:hidden flex justify-center mb-6">
              <div className={`p-3 rounded-2xl ${isWadaana ? 'bg-sky-100 text-sky-600' : 'bg-emerald-100 text-emerald-600'}`}>
                {isWadaana ? (
                  <Building2 className="w-9 h-9" />
                ) : (
                  <Droplet className="w-9 h-9" />
                )}
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Welcome back</h2>
            <p className="text-slate-500 text-sm mt-1">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 mt-8">
            {error && (
              <div className="p-3.5 bg-rose-50 text-rose-700 border border-rose-200/60 rounded-xl text-xs font-semibold flex items-center gap-2">
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-10 pr-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-2 ${isWadaana ? 'focus:border-sky-500 focus:ring-sky-200' : 'focus:border-emerald-500 focus:ring-emerald-200'}`}
                    placeholder="name@example.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-10 pr-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-2 ${isWadaana ? 'focus:border-sky-500 focus:ring-sky-200' : 'focus:border-emerald-500 focus:ring-emerald-200'}`}
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-all text-white shadow-xs h-11 w-full active:scale-[0.98] disabled:opacity-50 ${isWadaana ? 'bg-sky-600 hover:bg-sky-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span className="relative z-10">Sign in to {isWadaana ? 'Wadaana' : 'AquaSphere'}</span>
                  <ArrowRight className="w-4 h-4 ml-2 relative z-10 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
