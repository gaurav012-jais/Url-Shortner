import React, { useState } from 'react';
import { authApi } from '../services/api';
import { User } from '../types';
import { AuthIllustration } from './AuthIllustration';
import { ZeLnkLogo } from './ZeLnkLogo';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'register') {
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
      onClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Authentication failed. Please verify credentials.';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/65 backdrop-blur-md animate-fade-in overflow-y-auto">
      {/* Outer Card with Soft Ambient Pastel Glow */}
      <div className="relative w-full max-w-[860px] bg-white dark:bg-slate-900 rounded-[28px] sm:rounded-[32px] shadow-[0_20px_60px_-15px_rgba(79,70,229,0.25)] border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col md:flex-row my-auto transition-all">
        {/* Floating Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 z-30 w-8 h-8 rounded-full bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white shadow-sm flex items-center justify-center transition-all border border-slate-200/60 dark:border-slate-700"
          title="Close"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>

        {/* ───────────── MOBILE TOP BANNER (Visible on mobile < md) ───────────── */}
        <div className="block md:hidden w-full h-48 sm:h-56 relative overflow-hidden shrink-0">
          <AuthIllustration />
          {/* Subtle mobile curved bottom transition */}
          <div className="absolute -bottom-1 left-0 right-0 h-5 bg-white dark:bg-slate-900 rounded-t-3xl z-10" />
        </div>

        {/* ───────────── FORM COLUMN (Left on desktop, Bottom on mobile) ───────────── */}
        <div className="w-full md:w-1/2 p-6 sm:p-8 lg:p-10 flex flex-col justify-between bg-white dark:bg-slate-900 z-10 relative">
          <div>
            {/* Header Brand & Title */}
            <div className="flex items-center gap-2 mb-4">
              <ZeLnkLogo size="sm" showText={false} />
              <span className="text-xs font-code font-bold tracking-wider text-indigo-600 dark:text-indigo-400 uppercase">
                ZeLnk Cloud
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {mode === 'login' ? 'Sign In to your Account' : 'Create your Account'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-5">
              {mode === 'login'
                ? 'Welcome back! Enter your credentials to access your workspace.'
                : 'Get started with permanent short links, vanity domains & analytics.'}
            </p>

            {/* Error Banner */}
            {error && (
              <div className="p-3 mb-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs font-medium flex items-center gap-2 animate-fade-in">
                <span className="material-symbols-outlined text-[16px] text-red-600 shrink-0">error</span>
                <span>{error}</span>
              </div>
            )}

            {/* Main Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Full Name field (in Register mode) */}
              {mode === 'register' && (
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

              {/* Email Input */}
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

              {/* Password Input with Eye Toggle & Forgot Password Link */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  {mode === 'login' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setError('For demo/self-hosted instances, use your configured admin password or create a new account.');
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
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    Remember me
                  </span>
                </label>
              </div>

              {/* Bold Vibrant Sign In Button (matching reference image) */}
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
                  <span>{mode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}</span>
                )}
              </button>
            </form>
          </div>

          {/* Bottom Switcher */}
          <div className="pt-5 border-t border-slate-100 dark:border-slate-800 text-center">
            {mode === 'login' ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Not registered yet?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
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
                    setMode('login');
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

        {/* ───────────── DESKTOP RIGHT ILLUSTRATION (Visible on desktop md+) ───────────── */}
        <div className="hidden md:block w-1/2 relative min-h-[460px]">
          <AuthIllustration />
        </div>
      </div>
    </div>
  );
};
