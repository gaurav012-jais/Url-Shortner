import React, { useState } from 'react';
import { authApi } from '../services/api';
import { User } from '../types';
import { AuthIllustration } from './AuthIllustration';
import { ZeLnkLogo } from './ZeLnkLogo';

interface AuthGatewayViewProps {
  onSuccess: (user: User) => void;
  onContinueAsGuest: () => void;
}

export const AuthGatewayView: React.FC<AuthGatewayViewProps> = ({
  onSuccess,
  onContinueAsGuest,
}) => {
  const [accessMode, setAccessMode] = useState<'account' | 'guest'>('account');
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (authTab === 'register') {
        if (!name.trim()) {
          setError('Please enter your full name.');
          setLoading(false);
          return;
        }
        const res = await authApi.register(name.trim(), email.trim(), password);
        onSuccess(res.user);
      } else {
        const res = await authApi.login(email.trim(), password);
        onSuccess(res.user);
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Authentication failed. Please verify your credentials.';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EEF2FF] via-[#FAF5FF] to-[#FDF4FF] dark:from-[#0B091A] dark:via-[#100D28] dark:to-[#170C30] flex flex-col justify-between p-3 sm:p-5 lg:p-8 relative overflow-x-hidden selection:bg-indigo-500 selection:text-white">
      {/* Background Soft Ambient Pastel Glow Orbs */}
      <div className="absolute top-0 left-1/4 w-[36rem] h-[36rem] bg-indigo-400/15 dark:bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-[34rem] h-[34rem] bg-fuchsia-400/15 dark:bg-fuchsia-600/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Top Header / Branding Bar */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between py-2 z-10">
        <ZeLnkLogo size="md" />
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>99.99% Routing SLA</span>
          </span>
        </div>
      </header>

      {/* Main Responsive Split Card (Desktop Left Form + Right Illustration, Mobile Stacked) */}
      <main className="w-full max-w-4xl mx-auto my-auto py-4 sm:py-6 z-10">
        <div className="bg-white dark:bg-slate-900 rounded-[28px] sm:rounded-[32px] shadow-[0_20px_60px_-15px_rgba(79,70,229,0.22)] border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col md:flex-row transition-all">
          
          {/* ───────────── MOBILE TOP BANNER (< md) ───────────── */}
          <div className="block md:hidden w-full h-48 sm:h-56 relative overflow-hidden shrink-0">
            <AuthIllustration />
            <div className="absolute -bottom-1 left-0 right-0 h-5 bg-white dark:bg-slate-900 rounded-t-3xl z-10" />
          </div>

          {/* ───────────── LEFT FORM COLUMN (Desktop Left, Mobile Bottom) ───────────── */}
          <div className="w-full md:w-1/2 p-6 sm:p-8 lg:p-10 flex flex-col justify-between bg-white dark:bg-slate-900 z-10 relative">
            <div>
              {/* Access Mode Badges */}
              <div className="flex items-center gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setAccessMode('account');
                    setError(null);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
                    accessMode === 'account'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">person</span>
                  <span>Standard Account</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAccessMode('guest');
                    setError(null);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
                    accessMode === 'guest'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">timer</span>
                  <span>Guest Mode</span>
                </button>
              </div>

              {/* Title & Subtitle */}
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {accessMode === 'guest'
                  ? 'Quick Guest Access'
                  : authTab === 'login'
                  ? 'Sign In to your Account'
                  : 'Create your Account'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-5">
                {accessMode === 'guest'
                  ? 'Zero registration required. Generate short links immediately (auto-expires in 15 mins).'
                  : authTab === 'login'
                  ? 'Welcome back! Enter your credentials to access your permanent links.'
                  : 'Start creating permanent short links, custom vanity slugs & analytics.'}
              </p>

              {/* Error Banner */}
              {error && (
                <div className="p-3 mb-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs font-medium flex items-center gap-2 animate-fade-in">
                  <span className="material-symbols-outlined text-[16px] text-red-600 shrink-0">error</span>
                  <span>{error}</span>
                </div>
              )}

              {/* ───────────── CASE 1: GUEST MODE ───────────── */}
              {accessMode === 'guest' ? (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                    <span className="material-symbols-outlined text-[20px] text-amber-500 shrink-0 mt-0.5">
                      info
                    </span>
                    <div>
                      <strong className="font-bold block text-xs mb-0.5">15-Minute Link Expiration</strong>
                      Guest links automatically deactivate after 15 minutes. Sign in anytime to upgrade them to permanent!
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3.5 border border-slate-200/80 dark:border-slate-700/60 flex flex-col gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[15px] text-emerald-600 dark:text-emerald-400">
                        check_circle
                      </span>
                      <span>No sign-up or credit card required</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[15px] text-emerald-600 dark:text-emerald-400">
                        check_circle
                      </span>
                      <span>Instant 302 routing &amp; live scannable QR codes</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onContinueAsGuest}
                    className="w-full h-11 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-amber-500/25 active:scale-[0.99] flex items-center justify-center gap-2"
                  >
                    <span>CONTINUE AS GUEST</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>
              ) : (
                /* ───────────── CASE 2: STANDARD ACCOUNT FORM ───────────── */
                <form onSubmit={handleSubmit} className="space-y-3.5 animate-fade-in">
                  {/* Full Name field (Register mode only) */}
                  {authTab === 'register' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Full Name
                      </label>
                      <div className="relative flex items-center">
                        <span className="material-symbols-outlined absolute left-3 text-[18px] text-slate-400 pointer-events-none">
                          person
                        </span>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Enter Name"
                          className="w-full h-10 pl-9 pr-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/15 transition-all"
                        />
                      </div>
                    </div>
                  )}

                  {/* Email field */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Email
                    </label>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-3 text-[18px] text-slate-400 pointer-events-none">
                        mail
                      </span>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter Email"
                        className="w-full h-10 pl-9 pr-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/15 transition-all"
                      />
                    </div>
                  </div>

                  {/* Password field with Eye Toggle & Forgot Link */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Password
                      </label>
                      {authTab === 'login' ? (
                        <button
                          type="button"
                          onClick={() => {
                            setError('For self-hosted admin access, use your configured admin password in .env');
                          }}
                          className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          Forgot password?
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-code">Min 6 chars</span>
                      )}
                    </div>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-3 text-[18px] text-slate-400 pointer-events-none">
                        lock
                      </span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter Password"
                        className="w-full h-10 pl-9 pr-10 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/15 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Remember Me Checkbox */}
                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span className="text-xs text-slate-600 dark:text-slate-400">Remember me</span>
                    </label>
                  </div>

                  {/* Vibrant Action Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 mt-2 rounded-xl bg-gradient-to-r from-[#3B82F6] via-[#4F46E5] to-[#6366F1] hover:from-[#2563EB] hover:to-[#4F46E5] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-indigo-500/25 active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Signing In...</span>
                      </>
                    ) : (
                      <span>{authTab === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}</span>
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Bottom Switcher */}
            <div className="pt-5 border-t border-slate-100 dark:border-slate-800 text-center">
              {accessMode === 'guest' ? (
                <button
                  type="button"
                  onClick={() => setAccessMode('account')}
                  className="text-xs text-slate-500 dark:text-slate-400 hover:text-indigo-600 transition"
                >
                  Prefer permanent links? <strong className="text-indigo-600 dark:text-indigo-400 font-bold underline">Sign In or Register</strong>
                </button>
              ) : authTab === 'login' ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Not registered yet?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthTab('register');
                      setError(null);
                    }}
                    className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Create an account
                  </button>
                </p>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthTab('login');
                      setError(null);
                    }}
                    className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Sign In
                  </button>
                </p>
              )}
            </div>
          </div>

          {/* ───────────── RIGHT ILLUSTRATION COLUMN (Desktop md+ only) ───────────── */}
          <div className="hidden md:block w-1/2 relative min-h-[480px]">
            <AuthIllustration />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl mx-auto py-3 text-center text-xs text-slate-400 dark:text-slate-500 z-10">
        <p>&copy; {new Date().getFullYear()} ZeLnk Cloud Platform. Ultra-fast 302 vanity routing.</p>
      </footer>
    </div>
  );
};
