import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Droplet, Lock, Mail, ArrowRight, Loader2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    const result = await login(email, password);
    
    if (!result.success) {
      setError(result.message);
    }
    setIsLoading(false);
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left Sidebar / Branding Panel */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between p-12 bg-emerald-600 dark:bg-emerald-800 text-white relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10 pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-white blur-[120px]" />
          <div className="absolute top-[60%] -right-[20%] w-[80%] h-[80%] rounded-full bg-emerald-300 blur-[120px]" />
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
            <Droplet className="w-8 h-8 text-white" />
          </div>
          <span className="text-3xl font-bold tracking-tight">AquaSphere</span>
        </div>

        <div className="relative z-10 space-y-6">
          <h1 className="text-5xl font-bold leading-tight">
            Next-gen <br />
            Water Plant Management.
          </h1>
          <p className="text-emerald-100 text-lg max-w-md">
            Streamline your CRM, production, delivery, and inventory with an intelligent OS built for the modern beverage industry.
          </p>
        </div>

        <div className="relative z-10 text-emerald-200/80 text-sm">
          &copy; {new Date().getFullYear()} AquaSphere OS. All rights reserved.
        </div>
      </div>

      {/* Right Login Form Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <div className="lg:hidden flex justify-center mb-6">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl">
                <Droplet className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
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
                    className="flex h-12 w-full rounded-xl border border-input bg-transparent px-10 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
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
                  <a href="#" className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 transition-colors">
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="flex h-12 w-full rounded-xl border border-input bg-transparent px-10 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-emerald-600 text-white shadow hover:bg-emerald-700 h-12 w-full group relative overflow-hidden"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span className="relative z-10">Sign in to AquaSphere</span>
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
