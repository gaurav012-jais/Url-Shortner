import React, { useState, useRef } from 'react';
import { User } from '../types';
import { authApi } from '../services/api';

interface SettingsViewProps {
  currentUser: User | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onNavigateToSubscription?: () => void;
}

interface DomainEntry {
  id: string;
  domain: string;
  status: 'active' | 'pending_verification' | 'failed';
  cname_target: string;
  isPrimary: boolean;
}

const getPlatformHost = (): string => {
  const isLocal =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.includes('192.168.'));
  const saved = localStorage.getItem('linkflow_preferred_domain');
  if (saved) return saved;
  try {
    const apiUrl = import.meta.env.VITE_API_BASE_URL;
    if (apiUrl) return new URL(apiUrl).host;
  } catch {}
  return isLocal ? 'localhost:5000' : 'zelnk.onrender.com';
};

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  onOpenAuth,
  onLogout,
  onNavigateToSubscription,
}) => {
  const platformHost = getPlatformHost();
  const [activeTab, setActiveTab] = useState<'profile' | 'domains' | 'api' | 'security'>('profile');

  // Profile & Preferences state
  const [workspaceName, setWorkspaceName] = useState('personal-prod');
  const [defaultDomain, setDefaultDomain] = useState(() => platformHost);
  const [autoFetchMetadata, setAutoFetchMetadata] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Profile Picture state
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarSuccess, setAvatarSuccess] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentUser?.profile_picture_url || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset messages
    setAvatarError(null);
    setAvatarSuccess(false);

    // 1. Client-side MIME Type validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setAvatarError('Only JPEG, PNG, GIF, and WebP images are supported.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // 2. Client-side File Size limit (2MB)
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('Image file size must be less than 2MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // 3. Temporary local preview
    const objectUrl = URL.createObjectURL(file);
    setAvatarUrl(objectUrl);

    // 4. Upload to Backend -> Cloudinary
    setUploadingAvatar(true);
    try {
      const res = await authApi.uploadProfilePicture(file);
      setAvatarUrl(res.profile_picture_url);
      setAvatarSuccess(true);
      setTimeout(() => setAvatarSuccess(false), 3000);
    } catch (err: any) {
      const errMsg =
        err.response?.data?.message ||
        'Upload failed. Please ensure Cloudinary credentials are configured in backend/.env';
      setAvatarError(errMsg);
      // Revert preview on error
      setAvatarUrl(currentUser?.profile_picture_url || null);
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Domains state
  const [newDomain, setNewDomain] = useState('');
  const [customDomains, setCustomDomains] = useState<DomainEntry[]>([
    {
      id: '1',
      domain: platformHost,
      status: 'active',
      cname_target: 'Primary Engine',
      isPrimary: true,
    },
  ]);
  const [verifyingDomain, setVerifyingDomain] = useState<string | null>(null);

  // API Key state
  const apiKey = 'lf_live_9f82d1c0a87e411b9920ac';
  const [copiedKey, setCopiedKey] = useState(false);

  const isProOrAdmin =
    currentUser?.role === 'admin' ||
    currentUser?.plan === 'pro' ||
    currentUser?.plan === 'enterprise';

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('linkflow_preferred_domain', defaultDomain.trim());
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleAddDomain = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain.trim()) return;
    const clean = newDomain.trim().toLowerCase().replace(/^https?:\/\//i, '').replace(/\/+$/, '');

    setCustomDomains((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        domain: clean,
        status: 'pending_verification',
        cname_target: 'cname.zelnk.app',
        isPrimary: false,
      },
    ]);
    setNewDomain('');
  };

  const handleVerifyDomain = (id: string) => {
    setVerifyingDomain(id);
    setTimeout(() => {
      setCustomDomains((prev) =>
        prev.map((d) => (d.id === id ? { ...d, status: 'active' } : d))
      );
      setVerifyingDomain(null);
    }, 1500);
  };

  const handleCopyApiKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="p-3 sm:p-5 lg:p-6 w-full max-w-[1440px] mx-auto flex flex-col gap-5 flex-1 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">
          Account &amp; Workspace Settings
        </h1>
        <p className="text-xs text-on-surface-variant">
          Manage your personal profile, link preferences, custom branded domains, and API credentials.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-outline-variant/20 pb-2 overflow-x-auto whitespace-nowrap">
        {[
          { id: 'profile', label: 'Profile & Preferences', icon: 'person' },
          { id: 'domains', label: 'Branded Domains', icon: 'domain', isPro: !isProOrAdmin },
          { id: 'api', label: 'Developer API', icon: 'terminal', isPro: !isProOrAdmin },
          { id: 'security', label: 'Security & Auth', icon: 'shield' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                isActive
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.isPro && (
                <span className="px-1 py-0.2 rounded text-[9px] font-bold font-code bg-amber-500/20 text-amber-600 dark:text-amber-400">
                  PRO
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ───────────── Tab 1: Profile & Preferences ───────────── */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 flex-1">
          {/* Left: General Preferences */}
          <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-sm space-y-5 flex flex-col">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">tune</span>
              <h2 className="text-sm font-semibold text-on-surface">Link &amp; Workspace Preferences</h2>
            </div>

            <form onSubmit={handleSavePreferences} className="space-y-4 flex flex-col flex-1">
              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Workspace Name
                </label>
                <input
                  type="text"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-3 py-2 text-xs font-medium text-on-surface outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Default Short Domain Prefix
                </label>
                <div className="flex items-center bg-surface-container-low border border-outline-variant/30 rounded-xl px-3 py-2 text-xs">
                  <span className="text-on-surface-variant mr-1">http://</span>
                  <input
                    type="text"
                    value={defaultDomain}
                    onChange={(e) => setDefaultDomain(e.target.value)}
                    placeholder="localhost:5000"
                    className="w-full bg-transparent font-code text-on-surface outline-none"
                  />
                </div>
                <p className="text-[11px] text-on-surface-variant mt-1">
                  Prefix attached to new short links created in your workspace.
                </p>
              </div>

              <div className="pt-2 border-t border-outline-variant/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-on-surface">Auto-Fetch Website Metadata</p>
                    <p className="text-[11px] text-on-surface-variant">
                      Automatically retrieve target title and favicon icon when shortening.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoFetchMetadata}
                    onChange={(e) => setAutoFetchMetadata(e.target.checked)}
                    className="w-4 h-4 accent-primary cursor-pointer"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center gap-3 mt-auto">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-semibold text-xs transition shadow-sm"
                >
                  Save Preferences
                </button>
                {savedSuccess && (
                  <span className="text-xs text-tertiary flex items-center gap-1 font-semibold animate-fade-in">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    Preferences saved!
                  </span>
                )}
              </div>
            </form>
          </div>

          {/* Right: Account Summary & Plan Details */}
          <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-sm flex flex-col justify-between gap-5">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-primary text-[20px]">badge</span>
                <h2 className="text-sm font-semibold text-on-surface">Account &amp; Membership</h2>
              </div>

              {currentUser ? (
                <div className="space-y-4">
                  {/* User Profile Card with Avatar Upload */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-surface-container-low border border-outline-variant/20">
                    <div className="flex items-center gap-3.5">
                      {/* Avatar with Upload Hover Button */}
                      <div className="relative group shrink-0">
                        <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-on-primary text-xl font-bold shadow-sm overflow-hidden border-2 border-primary/20">
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt={currentUser.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            currentUser.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        {/* Hover Overlay Camera Button */}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingAvatar}
                          title="Change profile picture"
                          className="absolute inset-0 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                        >
                          <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                        </button>
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-on-surface">{currentUser.name}</h3>
                        <p className="text-xs text-on-surface-variant font-code">{currentUser.email}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-surface-container-highest text-on-surface font-code">
                            {currentUser.role === 'admin' ? '🛡️ Admin' : '👤 Standard User'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Photo Upload Action Button */}
                    <div className="flex flex-col sm:items-end gap-1.5">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        onChange={handleAvatarFileChange}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingAvatar}
                        className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold border border-outline-variant/30 transition flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {uploadingAvatar ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            <span>Uploading...</span>
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-[16px]">upload</span>
                            <span>{avatarUrl ? 'Change Photo' : 'Upload Photo'}</span>
                          </>
                        )}
                      </button>
                      <span className="text-[10px] text-on-surface-variant">Max 2MB &bull; JPG, PNG, WebP</span>
                    </div>
                  </div>

                  {/* Upload Status Feedback Alerts */}
                  {avatarSuccess && (
                    <div className="p-2.5 rounded-lg bg-tertiary-container/20 border border-tertiary/30 text-tertiary text-xs flex items-center gap-1.5 font-medium animate-fade-in">
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      <span>Profile picture successfully updated &amp; saved!</span>
                    </div>
                  )}

                  {avatarError && (
                    <div className="p-2.5 rounded-lg bg-error-container/20 border border-error/30 text-error text-xs flex items-center gap-1.5 font-medium animate-fade-in">
                      <span className="material-symbols-outlined text-[16px]">error</span>
                      <span className="break-all">{avatarError}</span>
                    </div>
                  )}

                  {/* Plan Card */}
                  <div className="p-4 rounded-xl bg-gradient-to-br from-surface-container-low to-surface-container border border-outline-variant/30 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-on-surface-variant font-medium">Subscription Tier</span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-code bg-primary/10 text-primary uppercase">
                        {currentUser.role === 'admin'
                          ? 'Enterprise Admin'
                          : currentUser.plan === 'pro'
                          ? '⚡ Pro Creator'
                          : currentUser.plan === 'enterprise'
                          ? '🏢 Enterprise'
                          : 'Free Starter'}
                      </span>
                    </div>

                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      {currentUser.role === 'admin' || currentUser.plan === 'pro' || currentUser.plan === 'enterprise'
                        ? 'Your plan includes unlimited clicks, zero link expiration, and unlimited passcode locks.'
                        : 'Free tier includes up to 100 clicks per link quota and 5 password-protected links.'}
                    </p>

                    {!isProOrAdmin && onNavigateToSubscription && (
                      <button
                        type="button"
                        onClick={onNavigateToSubscription}
                        className="mt-2 w-full py-2 px-3 rounded-lg bg-primary hover:bg-primary-container text-on-primary text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[15px]">star</span>
                        <span>Upgrade to Pro Plan</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center bg-surface-container-low rounded-xl border border-outline-variant/20 space-y-2">
                  <span className="material-symbols-outlined text-[32px] text-amber-500">lock</span>
                  <p className="text-xs font-semibold text-on-surface">Guest Account</p>
                  <p className="text-[11px] text-on-surface-variant">
                    You are browsing in guest mode. Links expire after 15 minutes.
                  </p>
                  <button
                    onClick={onOpenAuth}
                    className="mt-2 px-4 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-bold"
                  >
                    Sign In or Register
                  </button>
                </div>
              )}
            </div>

            {currentUser && (
              <div className="text-[11px] text-on-surface-variant font-code border-t border-outline-variant/20 pt-3">
                Member Since: {new Date(currentUser.created_at).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───────────── Tab 2: Custom Branded Domains ───────────── */}
      {activeTab === 'domains' && (
        <div className="flex-1 flex flex-col">
          {!isProOrAdmin ? (
            /* Gated Pro Feature Banner */
            <div className="p-8 sm:p-12 text-center bg-surface-container-lowest rounded-3xl border border-outline-variant/30 flex flex-col items-center justify-center gap-4 max-w-2xl mx-auto shadow-sm my-auto">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 text-primary flex items-center justify-center shadow-inner">
                <span className="material-symbols-outlined text-[34px]">domain</span>
              </div>
              <div className="space-y-1.5 max-w-md">
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[13px]">lock</span>
                  <span>Pro &amp; Enterprise Feature</span>
                </div>
                <h3 className="text-xl font-bold text-on-surface">Connect Your Custom Branded Domain</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Use your own domain (e.g.{' '}
                  <span className="font-code font-bold text-primary">go.mycompany.com</span> or{' '}
                  <span className="font-code font-bold text-primary">brand.link</span>) instead of generic URLs.
                  Branded links build trust, increase click-through rates by up to 35%, and reinforce brand identity.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-left max-w-md w-full pt-2">
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/20">
                  <span className="material-symbols-outlined text-primary text-[16px]">check_circle</span>
                  <span className="text-on-surface">Custom CNAME Routing</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/20">
                  <span className="material-symbols-outlined text-primary text-[16px]">check_circle</span>
                  <span className="text-on-surface">Automatic SSL Certificates</span>
                </div>
              </div>

              {onNavigateToSubscription ? (
                <button
                  type="button"
                  onClick={onNavigateToSubscription}
                  className="mt-3 px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-bold text-xs transition shadow-md shadow-primary/20 flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">rocket_launch</span>
                  <span>Upgrade to Pro Plan</span>
                </button>
              ) : (
                <button
                  onClick={onOpenAuth}
                  className="mt-3 px-6 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-xs"
                >
                  Sign In to Upgrade
                </button>
              )}
            </div>
          ) : (
            /* Active Domain Manager for Pro / Admin */
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 flex-1">
              <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-sm space-y-4 flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">domain_add</span>
                  <h3 className="text-sm font-semibold text-on-surface">Connect Custom Domain</h3>
                </div>
                <p className="text-xs text-on-surface-variant">
                  Add and configure custom routing domains for your workspace short links.
                </p>

                <form onSubmit={handleAddDomain} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. go.yourcompany.com"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    className="flex-1 bg-surface-container-low border border-outline-variant/30 rounded-xl px-3 py-2 text-xs font-code outline-none focus:border-primary text-on-surface"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-semibold text-xs transition shadow-sm flex items-center gap-1 shrink-0"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    <span>Add Domain</span>
                  </button>
                </form>

                {/* DNS Instructions */}
                <div className="mt-4 p-4 rounded-xl bg-surface-container-low border border-outline-variant/20 space-y-2 flex-1 flex flex-col justify-end">
                  <p className="text-xs font-semibold text-on-surface">DNS Setup Instructions</p>
                  <div className="space-y-1.5 text-[11px] text-on-surface-variant">
                    <p>1. Open your DNS provider (Cloudflare, GoDaddy, Namecheap, etc.)</p>
                    <p>2. Add a <span className="font-code text-primary font-bold">CNAME</span> record pointing to:</p>
                    <div className="p-2 bg-surface-container rounded-lg font-code text-on-surface border border-outline-variant/20">
                      cname.zelnk.app
                    </div>
                    <p>3. Click "Verify DNS" after DNS records propagate (~15-30m)</p>
                  </div>
                </div>
              </div>

              {/* Configured Domains List */}
              <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-outline-variant/20 bg-surface-container-low/50 flex items-center gap-2">
                  <span className="material-symbols-outlined text-on-surface-variant text-[18px]">dns</span>
                  <h4 className="text-xs font-semibold text-on-surface">Configured Routing Domains</h4>
                  <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary font-code">
                    {customDomains.length} active
                  </span>
                </div>
                <div className="divide-y divide-outline-variant/20">
                  {customDomains.map((d) => (
                    <div key={d.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-code text-xs font-bold text-on-surface">{d.domain}</span>
                          {d.isPrimary && (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-primary/10 text-primary font-bold font-code">
                              Default Primary
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold font-code ${
                              d.status === 'active'
                                ? 'bg-tertiary-container/20 text-tertiary'
                                : 'bg-amber-500/10 text-amber-600'
                            }`}
                          >
                            {d.status === 'active' ? '● Active' : '◌ Pending DNS'}
                          </span>
                        </div>
                        <p className="text-[11px] text-on-surface-variant font-code mt-1">
                          CNAME Target: <span className="text-primary">{d.cname_target}</span>
                        </p>
                      </div>

                      {d.status !== 'active' && (
                        <button
                          onClick={() => handleVerifyDomain(d.id)}
                          disabled={verifyingDomain === d.id}
                          className="px-3 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-xs font-medium text-on-surface transition flex items-center gap-1.5 border border-outline-variant/30"
                        >
                          {verifyingDomain === d.id ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                              <span>Checking...</span>
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-[15px]">refresh</span>
                              <span>Verify DNS</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ───────────── Tab 3: Developer API ───────────── */}
      {activeTab === 'api' && (
        <div className="flex-1 flex flex-col">
          {!isProOrAdmin ? (
            /* Gated Pro Feature Banner */
            <div className="p-8 sm:p-12 text-center bg-surface-container-lowest rounded-3xl border border-outline-variant/30 flex flex-col items-center justify-center gap-4 max-w-2xl mx-auto shadow-sm my-auto">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 text-primary flex items-center justify-center shadow-inner">
                <span className="material-symbols-outlined text-[34px]">terminal</span>
              </div>
              <div className="space-y-1.5 max-w-md">
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[13px]">lock</span>
                  <span>Pro &amp; Developer Feature</span>
                </div>
                <h3 className="text-xl font-bold text-on-surface">REST API &amp; Headless Automation</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Automate link creation, bulk shorten batch jobs, and extract real-time telemetry programmatically from your command line, CI/CD pipelines, or microservices.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-left max-w-md w-full pt-2">
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/20">
                  <span className="material-symbols-outlined text-primary text-[16px]">bolt</span>
                  <span className="text-on-surface">100 req/min API Quota</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/20">
                  <span className="material-symbols-outlined text-primary text-[16px]">code</span>
                  <span className="text-on-surface">cURL &amp; Python SDK</span>
                </div>
              </div>

              {onNavigateToSubscription ? (
                <button
                  type="button"
                  onClick={onNavigateToSubscription}
                  className="mt-3 px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-bold text-xs transition shadow-md shadow-primary/20 flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">star</span>
                  <span>Unlock API with Pro</span>
                </button>
              ) : (
                <button
                  onClick={onOpenAuth}
                  className="mt-3 px-6 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-xs"
                >
                  Sign In to Access
                </button>
              )}
            </div>
          ) : (
            /* Active Developer API Interface for Pro / Admin */
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 flex-1">
              <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-sm space-y-4 flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">key</span>
                  <h3 className="text-sm font-semibold text-on-surface">REST API Secret Token</h3>
                </div>
                <p className="text-xs text-on-surface-variant">
                  Use this Bearer token to authenticate API calls from external applications and scripts.
                </p>

                <div className="flex items-center gap-2 p-3 bg-surface-container-low rounded-xl border border-outline-variant/30">
                  <span className="font-code text-xs font-bold text-on-surface flex-1 truncate">
                    {apiKey}
                  </span>
                  <button
                    onClick={handleCopyApiKey}
                    className="px-3 py-1.5 rounded-lg bg-surface-container-lowest hover:bg-surface-container text-xs font-medium text-on-surface border border-outline-variant/30 flex items-center gap-1 shadow-sm transition shrink-0"
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {copiedKey ? 'check' : 'content_copy'}
                    </span>
                    <span>{copiedKey ? 'Copied!' : 'Copy Key'}</span>
                  </button>
                </div>

                <div className="space-y-2 pt-2">
                  <p className="text-xs font-semibold text-on-surface">API Rate Limits</p>
                  {[
                    { label: 'Shorten URL (POST /api/urls)', limit: '100 req/min' },
                    { label: 'Bulk Shorten (POST /api/urls/bulk)', limit: '10 req/min' },
                    { label: 'Telemetry (GET /api/analytics/*)', limit: '30 req/min' },
                  ].map((r) => (
                    <div key={r.label} className="flex justify-between text-[11px] py-1 border-b border-outline-variant/10 last:border-0">
                      <span className="text-on-surface-variant">{r.label}</span>
                      <span className="font-code font-semibold text-on-surface">{r.limit}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* cURL Usage Code Card */}
              <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-sm space-y-4 flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">terminal</span>
                  <h4 className="text-sm font-semibold text-on-surface">cURL Integration Snippets</h4>
                </div>

                <div className="space-y-3 flex flex-col flex-1">
                  <p className="text-[11px] text-on-surface-variant font-semibold uppercase tracking-wider">
                    Create Custom Short Link
                  </p>
                  <pre className="p-3.5 rounded-xl bg-surface-container-low font-code text-xs text-on-surface overflow-x-auto border border-outline-variant/20 leading-relaxed">
{`curl -X POST http://localhost:5000/api/urls \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "original_url": "https://github.com/my-project",
    "custom_alias": "release-v2"
  }'`}
                  </pre>

                  <p className="text-[11px] text-on-surface-variant font-semibold uppercase tracking-wider pt-2">
                    Retrieve Link Analytics
                  </p>
                  <pre className="p-3.5 rounded-xl bg-surface-container-low font-code text-xs text-on-surface overflow-x-auto border border-outline-variant/20 leading-relaxed">
{`curl http://localhost:5000/api/analytics/overview \\
  -H "Authorization: Bearer ${apiKey}"`}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ───────────── Tab 4: Security & Auth ───────────── */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-sm space-y-5">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">shield</span>
              <h3 className="text-sm font-semibold text-on-surface">Account Security Status</h3>
            </div>

            {currentUser ? (
              <div className="space-y-4">
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between py-2 border-b border-outline-variant/10">
                    <span className="text-on-surface-variant">Account Email:</span>
                    <span className="font-semibold text-on-surface">{currentUser.email}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-outline-variant/10">
                    <span className="text-on-surface-variant">Password Status:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">Encrypted (bcrypt hash)</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-outline-variant/10">
                    <span className="text-on-surface-variant">Session Security:</span>
                    <span className="font-semibold text-on-surface">JWT Bearer Auth</span>
                  </div>
                </div>

                <div className="pt-3">
                  <button
                    onClick={onLogout}
                    className="px-4 py-2 rounded-xl bg-error-container/20 hover:bg-error-container text-error text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">logout</span>
                    <span>Sign Out of Account</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/20 text-xs text-on-surface-variant">
                You are currently in guest mode. Sign in to secure your account.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
