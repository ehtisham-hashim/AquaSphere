import { useState } from 'react';
import { useAuth } from './AuthContext';
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
      <div className={`hidden lg:flex w-1/2 flex-col justify-between p-12 text-white relative overflow-hidden transition-colors duration-500 ${isWadaana ? 'bg-purple-600 dark:bg-purple-800' : 'bg-emerald-600 dark:bg-emerald-800'}`}>
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10 pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-white blur-[120px]" />
          <div className={`absolute top-[60%] -right-[20%] w-[80%] h-[80%] rounded-full blur-[120px] ${isWadaana ? 'bg-purple-300' : 'bg-emerald-300'}`} />
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
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
          <p className={`text-lg max-w-md ${isWadaana ? 'text-purple-100' : 'text-emerald-100'}`}>
            {isWadaana 
              ? 'Streamline your preform tracking, batch production, and industrial B2B deliveries with intelligent management.' 
              : 'Streamline your CRM, production, delivery, and inventory with an intelligent OS built for the modern beverage industry.'}
          </p>
        </div>

        <div className={`relative z-10 text-sm ${isWadaana ? 'text-purple-200/80' : 'text-emerald-200/80'}`}>
          &copy; {new Date().getFullYear()} {isWadaana ? 'Wadaana Industries' : 'AquaSphere OS'}. All rights reserved.
        </div>
      </div>

      {/* Right Login Form Panel */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 sm:p-12">
        
        {/* Tenant Switcher Tabs */}
        <div className="w-full max-w-md mb-8">
          <div className="flex p-1 space-x-1 bg-muted rounded-xl">
            <button
              onClick={() => { setTenant('aquasphere'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${!isWadaana ? 'bg-white text-emerald-700 shadow-sm dark:bg-emerald-900/50 dark:text-emerald-300' : 'text-muted-foreground hover:bg-white/50 dark:hover:bg-muted/50'}`}
            >
              <Droplet className="w-4 h-4" />
              AquaSphere
            </button>
            <button
              onClick={() => { setTenant('wadaana'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${isWadaana ? 'bg-white text-purple-700 shadow-sm dark:bg-purple-900/50 dark:text-purple-300' : 'text-muted-foreground hover:bg-white/50 dark:hover:bg-muted/50'}`}
            >
              <Building2 className="w-4 h-4" />
              Wadaana
            </button>
          </div>
        </div>

        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <div className="lg:hidden flex justify-center mb-6">
              <div className={`p-3 rounded-xl ${isWadaana ? 'bg-purple-100 dark:bg-purple-900/50' : 'bg-emerald-100 dark:bg-emerald-900/50'}`}>
                {isWadaana ? (
                  <Building2 className={`w-10 h-10 ${isWadaana ? 'text-purple-600 dark:text-purple-400' : 'text-emerald-600 dark:text-emerald-400'}`} />
                ) : (
                  <Droplet className={`w-10 h-10 ${isWadaana ? 'text-purple-600 dark:text-purple-400' : 'text-emerald-600 dark:text-emerald-400'}`} />
                )}
              </div>
            </div>
            <h2 className="text-3xl font-bold text-foreground">Welcome back</h2>
            <p className="text-muted-foreground mt-2">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 mt-8">
            {error && (
              <div className="p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                <span className="font-medium">{error}</span>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`flex h-12 w-full rounded-xl border border-input bg-transparent px-10 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50 ${isWadaana ? 'focus-visible:ring-purple-500' : 'focus-visible:ring-emerald-500'}`}
                    placeholder="name@example.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium leading-none text-foreground">
                    Password
                  </label>
                  <a href="#" className={`text-sm transition-colors ${isWadaana ? 'text-purple-600 dark:text-purple-400 hover:text-purple-500' : 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-500'}`}>
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`flex h-12 w-full rounded-xl border border-input bg-transparent px-10 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50 ${isWadaana ? 'focus-visible:ring-purple-500' : 'focus-visible:ring-emerald-500'}`}
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 text-white shadow h-12 w-full group relative overflow-hidden ${isWadaana ? 'bg-purple-600 hover:bg-purple-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
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
