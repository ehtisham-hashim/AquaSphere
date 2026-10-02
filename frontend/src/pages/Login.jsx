import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Droplet, Lock, Mail, ArrowRight, Loader2, Building2, ShieldCheck, CheckCircle2, ArrowLeft, RefreshCw } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenant, setTenant] = useState('aquasphere'); // 'aquasphere' or 'wadaana'
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 2FA State
  const [is2FAStep, setIs2FAStep] = useState(() => {
    return sessionStorage.getItem('owner_2fa_step') === 'true' && !!sessionStorage.getItem('owner_2fa_temp_token');
  });
  const [tempToken, setTempToken] = useState(() => {
    return sessionStorage.getItem('owner_2fa_temp_token') || '';
  });
  const [emailMask, setEmailMask] = useState(() => {
    return sessionStorage.getItem('owner_2fa_email_mask') || '';
  });
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [isVerifiedEffect, setIsVerifiedEffect] = useState(false);

  const otpInputsRef = useRef([]);
  const { login, verifyOwnerOtp, resendOwnerOtp } = useAuth();

  const isWadaana = tenant === 'wadaana';

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  // Initial password submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(email, password, tenant);

    if (result.success && result.require2FA) {
      setTempToken(result.tempToken);
      setEmailMask(result.emailMask || 'your registered email');
      setCooldown(result.resendCooldown || 60);
      setIs2FAStep(true);
      sessionStorage.setItem('owner_2fa_step', 'true');
      sessionStorage.setItem('owner_2fa_temp_token', result.tempToken);
      sessionStorage.setItem('owner_2fa_email_mask', result.emailMask || '');
      sessionStorage.setItem('owner_2fa_tenant', tenant);
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 100);
    } else if (!result.success) {
      setError(result.message || 'Invalid credentials');
    }
    setIsLoading(false);
  };

  // OTP Verification Submission
  const handleVerifyOtp = useCallback(async (codeToVerify) => {
    const fullCode = codeToVerify || otp.join('');
    if (fullCode.length !== 6) {
      setError('Please enter the full 6-digit verification code.');
      return;
    }

    const activeToken = tempToken || sessionStorage.getItem('owner_2fa_temp_token');
    if (!activeToken) {
      setError('2FA session expired. Please return to login.');
      return;
    }

    setError('');
    setIsVerifying(true);

    const result = await verifyOwnerOtp(activeToken, fullCode, tenant);

    if (result.success) {
      sessionStorage.removeItem('owner_2fa_step');
      sessionStorage.removeItem('owner_2fa_temp_token');
      sessionStorage.removeItem('owner_2fa_email_mask');
      sessionStorage.removeItem('owner_2fa_tenant');
      // Trigger water bottle filling verification effect before app transition
      setIsVerifiedEffect(true);
    } else {
      setError(result.message || 'Invalid verification code. Please check your email.');
      setIsVerifying(false);
      // Focus on first input for retry
      otpInputsRef.current[0]?.focus();
    }
  }, [otp, tempToken, tenant, verifyOwnerOtp]);

  // Handle single digit input & auto-advance
  const handleDigitChange = (index, value) => {
    // Handle paste of full 6 digits in any box
    const cleanValue = value.replace(/\D/g, '');
    if (cleanValue.length > 1) {
      const pasted = cleanValue.slice(0, 6).split('');
      const newOtp = [...otp];
      pasted.forEach((char, i) => {
        if (i < 6) newOtp[i] = char;
      });
      setOtp(newOtp);
      const nextIndex = Math.min(pasted.length, 5);
      otpInputsRef.current[nextIndex]?.focus();
      if (pasted.length === 6) {
        handleVerifyOtp(newOtp.join(''));
      }
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = cleanValue;
    setOtp(newOtp);

    // Auto-advance to next input
    if (cleanValue && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }

    // Auto-submit if 6th digit entered
    if (cleanValue && index === 5) {
      const full = [...newOtp.slice(0, 5), cleanValue].join('');
      if (full.length === 6) {
        handleVerifyOtp(full);
      }
    }
  };

  // Handle backspace navigation
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  // Handle paste anywhere in OTP container
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const newOtp = [...otp];
    pastedData.split('').forEach((char, idx) => {
      if (idx < 6) newOtp[idx] = char;
    });
    setOtp(newOtp);

    const focusIdx = Math.min(pastedData.length, 5);
    otpInputsRef.current[focusIdx]?.focus();

    if (pastedData.length === 6) {
      handleVerifyOtp(newOtp.join(''));
    }
  };

  // Resend OTP code
  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;
    setIsResending(true);
    setError('');

    const activeToken = tempToken || sessionStorage.getItem('owner_2fa_temp_token');
    if (!activeToken) {
      setError('Session expired. Please return to login.');
      setIsResending(false);
      return;
    }

    const res = await resendOwnerOtp(activeToken);
    if (res.success) {
      if (res.tempToken) {
        setTempToken(res.tempToken);
        sessionStorage.setItem('owner_2fa_temp_token', res.tempToken);
      }
      setCooldown(res.resendCooldown || 60);
      setOtp(['', '', '', '', '', '']);
      otpInputsRef.current[0]?.focus();
    } else {
      setError(res.message || 'Failed to resend code');
    }
    setIsResending(false);
  };

  const handleBackToLogin = () => {
    sessionStorage.removeItem('owner_2fa_step');
    sessionStorage.removeItem('owner_2fa_temp_token');
    sessionStorage.removeItem('owner_2fa_email_mask');
    sessionStorage.removeItem('owner_2fa_tenant');
    setIs2FAStep(false);
    setTempToken('');
    setOtp(['', '', '', '', '', '']);
    setError('');
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left Sidebar / Branding Panel */}
      <div className={`hidden lg:flex w-1/2 flex-col justify-between p-12 text-white relative overflow-hidden transition-colors duration-500 ${isWadaana ? 'bg-sky-600 dark:bg-sky-800' : 'bg-emerald-600 dark:bg-emerald-800'}`}>
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10 pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-white blur-[120px]" />
          <div className={`absolute top-[60%] -right-[20%] w-[80%] h-[80%] rounded-full blur-[120px] ${isWadaana ? 'bg-sky-300' : 'bg-emerald-300'}`} />
        </div>

        <div className="relative z-10 flex items-center gap-4">
          <div className="w-24 h-24 bg-white/20 rounded-3xl backdrop-blur-sm flex items-center justify-center p-2.5 shadow-sm shrink-0">
            {isWadaana ? (
              <Building2 className="w-12 h-12 text-white" />
            ) : (
              <img 
                src="/logo.png" 
                alt="AquaSphere Logo" 
                className="w-full h-full object-contain drop-shadow-xs" 
              />
            )}
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

      {/* Right Login / 2FA Panel */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 sm:p-12">
        
        {/* Tenant Switcher Tabs (Only visible in Step 1) */}
        {!is2FAStep && (
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
        )}

        <div className="w-full max-w-md space-y-6">
          
          {/* STEP 1: Standard Email & Password Form */}
          {!is2FAStep ? (
            <>
              <div className="text-center lg:text-left">
                <div className="lg:hidden flex justify-center mb-6">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center p-2 ${isWadaana ? 'bg-sky-100 text-sky-600' : 'bg-emerald-100'}`}>
                    {isWadaana ? (
                      <Building2 className="w-9 h-9" />
                    ) : (
                      <img 
                        src="/logo.png" 
                        alt="AquaSphere Logo" 
                        className="w-full h-full object-contain" 
                      />
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
            </>
          ) : (
            /* STEP 2: Professional 2FA Verification Card */
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
              
              {/* Back to login trigger */}
              <button
                type="button"
                onClick={handleBackToLogin}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-700 transition"
              >
                <ArrowLeft size={14} /> Back to Sign In
              </button>

              {/* Step 2 Header Badge */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xl space-y-6">
                <div className="flex items-start gap-3.5">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-base shrink-0 text-white shadow-sm ${isWadaana ? 'bg-sky-600' : 'bg-emerald-600'}`}>
                    2
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                      <span>Verification Code Sent</span>
                      <ShieldCheck size={18} className={isWadaana ? 'text-sky-600' : 'text-emerald-600'} />
                    </h3>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                      We've sent a 6-digit verification code to your email{' '}
                      <strong className="text-slate-700 font-mono">{emailMask}</strong>.
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200/60 rounded-xl text-xs font-semibold">
                    {error}
                  </div>
                )}

                {/* 6-Digit Segmented OTP Input */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center">
                    Enter 6-Digit OTP Code
                  </label>
                  
                  <div 
                    onPaste={handlePaste}
                    className="flex justify-center gap-2 sm:gap-2.5"
                  >
                    {otp.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => { otpInputsRef.current[idx] = el; }}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength="1"
                        value={digit}
                        onChange={(e) => handleDigitChange(idx, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(idx, e)}
                        className={`w-11 h-14 sm:w-12 sm:h-16 text-center text-2xl font-mono font-extrabold rounded-2xl border bg-slate-50/70 transition-all outline-none ${
                          digit 
                            ? isWadaana 
                              ? 'border-sky-500 bg-sky-50/30 text-sky-950 ring-2 ring-sky-200' 
                              : 'border-emerald-500 bg-emerald-50/30 text-emerald-950 ring-2 ring-emerald-200'
                            : 'border-slate-200 text-slate-800 focus:bg-white focus:border-slate-400'
                        } ${isWadaana ? 'focus:ring-2 focus:ring-sky-200 focus:border-sky-500' : 'focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500'}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Resend Action & Timer */}
                <div className="text-center pt-2 border-t border-slate-100 flex flex-col items-center gap-2">
                  <div className="text-xs text-slate-500">
                    Didn't receive code?{' '}
                    {cooldown > 0 ? (
                      <span className="font-mono font-bold text-slate-700">
                        Resend Code in {cooldown}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResend}
                        disabled={isResending}
                        className={`font-bold hover:underline inline-flex items-center gap-1 ${isWadaana ? 'text-sky-600' : 'text-emerald-600'}`}
                      >
                        {isResending && <RefreshCw size={12} className="animate-spin" />}
                        Resend Code
                      </button>
                    )}
                  </div>
                </div>

                {/* Verify Button */}
                <button
                  type="button"
                  onClick={() => handleVerifyOtp()}
                  disabled={isVerifying || otp.join('').length !== 6}
                  className={`inline-flex items-center justify-center rounded-2xl text-sm font-bold transition-all text-white shadow-sm h-12 w-full active:scale-[0.98] disabled:opacity-50 ${isWadaana ? 'bg-sky-600 hover:bg-sky-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                >
                  {isVerifying ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Verifying Owner Identity...</span>
                    </div>
                  ) : (
                    <span>Authorize & Sign In</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ELEGANT WATER BOTTLE FILL / DROP VERIFICATION EFFECT */}
      {isVerifiedEffect && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-slate-100 text-center space-y-5 animate-in zoom-in-95 duration-200">
            
            {/* Animated Water Droplet + Bottle Fill Graphic */}
            <div className="relative w-28 h-36 mx-auto flex items-center justify-center">
              
              {/* Outer Bottle Container Outline */}
              <svg viewBox="0 0 100 130" className="w-full h-full drop-shadow-md">
                {/* Bottle Cap */}
                <rect x="38" y="4" width="24" height="12" rx="3" fill={isWadaana ? '#0284c7' : '#059669'} />
                {/* Bottle Neck */}
                <path d="M42 16 L42 28 L30 38 L30 115 A12 12 0 0 0 42 126 L58 126 A12 12 0 0 0 70 115 L70 38 L58 28 L58 16 Z" fill="none" stroke="#cbd5e1" strokeWidth="3" />
                
                {/* Liquid Fill Clip Path */}
                <defs>
                  <clipPath id="bottleClip">
                    <path d="M42 16 L42 28 L30 38 L30 115 A12 12 0 0 0 42 126 L58 126 A12 12 0 0 0 70 115 L70 38 L58 28 L58 16 Z" />
                  </clipPath>
                </defs>

                {/* Animated Rising Water Level */}
                <g clipPath="url(#bottleClip)">
                  <rect 
                    x="20" 
                    y="30" 
                    width="60" 
                    height="100" 
                    fill={isWadaana ? '#0ea5e9' : '#10b981'} 
                    className="animate-in slide-in-from-bottom duration-700 fill-mode-forwards opacity-80"
                  />
                  {/* Water surface wave highlight */}
                  <ellipse cx="50" cy="35" rx="20" ry="4" fill="white" opacity="0.4" />
                </g>
              </svg>

              {/* Glowing Droplet Ripple on Bottle Center */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl animate-in zoom-in-50 duration-500 delay-300 ${isWadaana ? 'bg-sky-600' : 'bg-emerald-600'}`}>
                  <CheckCircle2 size={32} className="animate-pulse" />
                </div>
              </div>
            </div>

            {/* Step 3 Text */}
            <div className="space-y-1">
              <span className={`text-[11px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${isWadaana ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                Step 3 • Verified
              </span>
              <h4 className="text-xl font-black text-slate-900 pt-1">
                Owner Access Verified!
              </h4>
              <p className="text-xs text-slate-500 font-medium">
                Identity confirmed. Loading your management dashboard...
              </p>
            </div>

            <div className="flex justify-center pt-1">
              <Loader2 className={`w-5 h-5 animate-spin ${isWadaana ? 'text-sky-600' : 'text-emerald-600'}`} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
