import React, { useState } from 'react';
import { authApi } from '../services/api';
import { User } from '../types';
import { ZeLnkLogo } from './ZeLnkLogo';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
        const res = await authApi.register(name, email, password);
        onSuccess(res.user);
      } else {
        const res = await authApi.login(email, password);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl max-w-sm w-full p-5 sm:p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition"
          title="Close modal"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        {/* Brand Icon & Heading */}
        <div className="flex items-center gap-3 mb-5">
          <ZeLnkLogo size="sm" showText={false} />
          <div>
            <h3 className="font-bold text-sm text-on-surface">
              {mode === 'login' ? 'Sign In to ZeLnk' : 'Create ZeLnk Account'}
            </h3>
            <p className="text-[11px] text-on-surface-variant">Upgrade from Guest for permanent links</p>
          </div>
        </div>

        {/* Mode Toggle Tabs */}
        <div className="flex rounded-xl bg-surface-container-low p-1 mb-4 border border-outline-variant/30">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              mode === 'login'
                ? 'bg-surface-container-lowest text-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              mode === 'register'
                ? 'bg-surface-container-lowest text-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Register
          </button>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-error-container/60 border border-error text-on-error-container text-xs font-medium flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-error shrink-0">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'register' && (
            <div>
              <label className="block text-[11px] font-medium text-on-surface mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Gaurav Sharma"
                className="w-full h-9 px-3 bg-surface-container-low border border-outline-variant/30 rounded-lg text-xs text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-medium text-on-surface mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full h-9 px-3 bg-surface-container-low border border-outline-variant/30 rounded-lg text-xs text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-on-surface mb-1">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-9 px-3 bg-surface-container-low border border-outline-variant/30 rounded-lg text-xs text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 px-4 mt-2 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-semibold text-xs flex items-center justify-center gap-2 transition shadow-md shadow-primary/20 active:scale-[0.99] disabled:opacity-60"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
            ) : (
              <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
