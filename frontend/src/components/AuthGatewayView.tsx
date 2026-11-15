import React, { useState } from 'react';
import { authApi } from '../services/api';
import { User } from '../types';
import { ZeLnkLogo } from './ZeLnkLogo';

interface AuthGatewayViewProps {
  onSuccess: (user: User) => void;
  onContinueAsGuest: () => void;
}

export const AuthGatewayView: React.FC<AuthGatewayViewProps> = ({
  onSuccess,
  onContinueAsGuest,
}) => {
  // Access mode: 'account' (Sign in/register) or 'guest' (Temporary session)
  const [accessMode, setAccessMode] = useState<'account' | 'guest'>('account');
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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
        const res = await authApi.register(name, email, password);
        onSuccess(res.user);
      } else {
        const res = await authApi.login(email, password);
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between p-4 sm:p-6 lg:p-8 relative overflow-hidden selection:bg-primary-fixed">
      {/* Dynamic Background Mesh & Glowing Orbs */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-25"
        style={{
          backgroundImage:
            'radial-gradient(rgba(99, 102, 241, 0.25) 1.2px, transparent 1.2px)',
          backgroundSize: '24px 24px',
        }}
      />
      {/* Top glowing violet orb */}
      <div className="absolute -top-32 left-1/4 -translate-x-1/2 w-[34rem] h-[34rem] bg-gradient-to-br from-blue-600/25 via-indigo-600/20 to-purple-600/25 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse" />
      {/* Bottom glowing cyan orb */}
      <div className="absolute -bottom-32 right-1/4 w-[32rem] h-[32rem] bg-gradient-to-tl from-cyan-500/20 via-blue-600/20 to-violet-600/20 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Top Header / Branding Bar */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between py-2 z-10">
        <ZeLnkLogo size="md" />

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 text-[11px] text-tertiary font-medium shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
            <span>99.99% Routing SLA</span>
          </span>
        </div>
      </header>

      {/* Centered Auth Card Container — Expanded Width to 580px */}
      <main className="w-full max-w-xl mx-auto my-auto py-6 z-10">
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl shadow-indigo-500/10 p-6 sm:p-9 relative transition-all">
          {/* Brand Logo & Headline */}
          <div className="text-center mb-6">
            <ZeLnkLogo size="xl" className="justify-center mb-3" />
            <h1 className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
              {accessMode === 'guest'
                ? 'Quick Guest Access'
                : authTab === 'login'
                ? 'Welcome Back'
                : 'Create Your ZeLnk Account'}
            </h1>
            <p className="text-xs text-on-surface-variant mt-1.5 max-w-sm mx-auto leading-relaxed">
              Industrial URL shortening, custom vanity routing &amp; high-velocity traffic redirection
            </p>
          </div>

          {/* Access Mode Segmented Cards — Wide & Clean (No Truncation) */}
          <div className="mb-6">
            <label className="block text-[11px] font-bold text-on-surface-variant mb-2 uppercase tracking-wider">
              Select Access Option
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Option 1: Standard Account */}
              <button
                type="button"
                onClick={() => {
                  setAccessMode('account');
                  setError(null);
                }}
                className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                  accessMode === 'account'
                    ? 'bg-blue-500/10 border-blue-600 shadow-sm ring-1 ring-blue-500/30'
                    : 'bg-surface-container-low/70 border-outline-variant/30 hover:border-outline-variant text-on-surface-variant'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    accessMode === 'account'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-surface-container text-on-surface-variant'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">person</span>
                </div>
                <div>
                  <span
                    className={`font-bold text-xs sm:text-sm block ${
                      accessMode === 'account' ? 'text-blue-700 dark:text-blue-300' : 'text-on-surface'
                    }`}
                  >
                    Standard Account
                  </span>
                  <p className="text-[11px] text-on-surface-variant mt-0.5 leading-tight">
                    Permanent links, custom vanity slugs &amp; telemetry
                  </p>
                </div>
              </button>

              {/* Option 2: Guest Mode */}
              <button
                type="button"
                onClick={() => {
                  setAccessMode('guest');
                  setError(null);
                }}
                className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                  accessMode === 'guest'
                    ? 'bg-amber-500/10 border-amber-500 shadow-sm ring-1 ring-amber-500/30'
                    : 'bg-surface-container-low/70 border-outline-variant/30 hover:border-outline-variant text-on-surface-variant'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    accessMode === 'guest'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-surface-container text-on-surface-variant'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">timer</span>
                </div>
                <div>
                  <span
                    className={`font-bold text-xs sm:text-sm block ${
                      accessMode === 'guest' ? 'text-amber-700 dark:text-amber-300' : 'text-on-surface'
                    }`}
                  >
                    Guest Mode
                  </span>
                  <p className="text-[11px] text-on-surface-variant mt-0.5 leading-tight">
                    Instant test • Links expire after 15 minutes
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* --- CASE 1: GUEST MODE FORM --- */}
          {accessMode === 'guest' ? (
            <div className="flex flex-col gap-4 animate-fade-in">
              {/* Expiration Notice Banner */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                <span className="material-symbols-outlined text-[22px] text-amber-500 shrink-0 mt-0.5">
                  info
                </span>
                <div>
                  <strong className="font-bold block text-sm mb-0.5">
                    15-Minute Link Expiration
                  </strong>
                  Links generated in Guest mode automatically deactivate after{' '}
                  <strong className="underline decoration-amber-500/50">15 minutes</strong>. If you register or log in later, your links are automatically upgraded to permanent!
                </div>
              </div>

              {/* Guest Features */}
              <div className="rounded-2xl bg-surface-container-low/60 p-4 border border-outline-variant/20 flex flex-col gap-2.5 text-xs text-on-surface-variant">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[16px] text-tertiary">check_circle</span>
                  <span>Zero registration or email required</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[16px] text-tertiary">check_circle</span>
                  <span>Instant Base62 link shortening &amp; scannable QR codes</span>
                </div>
                <div className="flex items-center gap-2.5 text-amber-700 dark:text-amber-300">
                  <span className="material-symbols-outlined text-[16px] text-amber-500">timer</span>
                  <span>Temporary session: links expire in 15 minutes</span>
                </div>
              </div>

              {/* Enter as Guest CTA Button */}
              <button
                type="button"
                onClick={onContinueAsGuest}
                className="w-full h-11 px-4 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/25 active:scale-[0.99]"
              >
                <span>Continue as Guest</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>

              <button
                type="button"
                onClick={() => setAccessMode('account')}
                className="text-center text-xs text-on-surface-variant hover:text-primary transition py-1"
              >
                Prefer permanent links? <span className="font-semibold text-primary underline">Sign In or Register</span>
              </button>
            </div>
          ) : (
            /* --- CASE 2: STANDARD ACCOUNT (SIGN IN / REGISTER) --- */
            <div className="flex flex-col gap-4 animate-fade-in">
              {/* Sign In vs Register Segmented Control */}
              <div className="flex rounded-xl bg-surface-container-low p-1 border border-outline-variant/30">
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('login');
                    setError(null);
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    authTab === 'login'
                      ? 'bg-surface-container-lowest text-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('register');
                    setError(null);
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    authTab === 'register'
                      ? 'bg-surface-container-lowest text-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="p-3.5 rounded-xl bg-error-container/60 border border-error text-on-error-container text-xs font-medium flex items-center gap-2 animate-shake">
                  <span className="material-symbols-outlined text-[18px] text-error shrink-0">error</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Form Fields */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {authTab === 'register' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-on-surface mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Gaurav Sharma"
                      className="w-full h-11 px-3.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs sm:text-sm text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-semibold text-on-surface mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full h-11 px-3.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs sm:text-sm text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-on-surface">Password</label>
                    {authTab === 'login' && (
                      <span className="text-[10px] text-on-surface-variant hover:underline cursor-pointer">
                        Forgot password?
                      </span>
                    )}
                  </div>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-11 px-3.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs sm:text-sm text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 px-4 mt-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/25 active:scale-[0.99] disabled:opacity-60"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>{authTab === 'login' ? 'Sign In to ZeLnk' : 'Create Free Account'}</span>
                  )}
                </button>
              </form>

              {/* Bottom Quick Switch to Guest */}
              <div className="pt-2 text-center border-t border-outline-variant/20">
                <button
                  type="button"
                  onClick={() => setAccessMode('guest')}
                  className="text-xs text-on-surface-variant hover:text-primary transition inline-flex items-center gap-1"
                >
                  <span>Just exploring?</span>
                  <span className="font-semibold text-primary underline">
                    Continue as Guest (15m links)
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl mx-auto py-3 text-center text-xs text-on-surface-variant z-10">
        <p>&copy; {new Date().getFullYear()} ZeLnk Platform. All rights reserved.</p>
      </footer>
    </div>
  );
};
