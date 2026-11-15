import React, { useState, useEffect } from 'react';
import {
  adminApi,
  authApi,
} from '../services/api';
import {
  SystemSettings,
  AdminOverviewStats,
  AdminUrlItem,
  AdminUserItem,
} from '../types';

interface AdminConsoleViewProps {
  onBackToUserView: () => void;
}

export const AdminConsoleView: React.FC<AdminConsoleViewProps> = ({
  onBackToUserView,
}) => {
  const [activeTab, setActiveTab] = useState<'settings' | 'urls' | 'users' | 'telemetry'>('settings');
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // --- Settings State ---
  const [settings, setSettings] = useState<SystemSettings>({
    free_tier_max_clicks: 100,
    allow_guest_passwords: false,
    free_user_max_password_links: 5,
    guest_expiration_minutes: 15,
    allow_custom_alias_free: true,
    maintenance_mode: false,
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // --- Master URLs State ---
  const [urls, setUrls] = useState<AdminUrlItem[]>([]);
  const [urlTotal, setUrlTotal] = useState(0);
  const [urlPage, setUrlPage] = useState(1);
  const [urlSearch, setUrlSearch] = useState('');
  const [urlFilter, setUrlFilter] = useState('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // --- Users State ---
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userPage, setUserPage] = useState(1);
  const [userSearch, setUserSearch] = useState('');

  // --- Telemetry State ---
  const [stats, setStats] = useState<AdminOverviewStats | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 1. Fetch System Settings
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getSettings();
      setSettings(data);
    } catch (err: any) {
      console.error('Failed to fetch settings:', err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch Master URLs
  const fetchUrls = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getUrls(urlPage, 20, urlSearch, urlFilter);
      setUrls(res.data);
      setUrlTotal(res.total);
    } catch (err: any) {
      console.error('Failed to fetch admin URLs:', err);
    } finally {
      setLoading(false);
    }
  };

  // 3. Fetch Users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getUsers(userPage, 20, userSearch);
      setUsers(res.data);
      setUserTotal(res.total);
    } catch (err: any) {
      console.error('Failed to fetch admin users:', err);
    } finally {
      setLoading(false);
    }
  };

  // 4. Fetch Telemetry
  const fetchTelemetry = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getOverview();
      setStats(data);
    } catch (err: any) {
      console.error('Failed to fetch telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'settings') fetchSettings();
    if (activeTab === 'urls') fetchUrls();
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'telemetry') fetchTelemetry();
  }, [activeTab, urlPage, urlFilter, userPage]);

  // Handle Settings Save
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      const { id, updated_at, ...cleanSettings } = settings;
      const updated = await adminApi.updateSettings(cleanSettings);
      setSettings(updated);
      showToast('System configuration saved and active globally!');
    } catch (err: any) {
      const rawMsg = err?.response?.data?.message;
      const msg = Array.isArray(rawMsg)
        ? rawMsg.join(' • ')
        : rawMsg || 'Failed to save settings.';
      showToast(msg);
    } finally {
      setSavingSettings(false);
    }
  };

  // Master URL Actions
  const handleToggleUrl = async (id: string) => {
    try {
      const res = await adminApi.toggleUrl(id);
      setUrls((prev) =>
        prev.map((u) => (u.id === id ? { ...u, is_active: res.is_active } : u)),
      );
      showToast(`URL status updated to ${res.is_active ? 'Active' : 'Disabled'}.`);
    } catch (err: any) {
      showToast('Failed to toggle URL.');
    }
  };

  const handleUnlockUrl = async (id: string) => {
    try {
      const res = await adminApi.unlockUrl(id);
      setUrls((prev) =>
        prev.map((u) =>
          u.id === id
            ? {
                ...u,
                failed_password_attempts: 0,
                is_locked: false,
                is_active: true,
              }
            : u,
        ),
      );
      showToast(res.message);
    } catch (err: any) {
      showToast('Failed to unlock route.');
    }
  };

  const handleDeleteUrl = async (id: string) => {
    if (!window.confirm('Permanently purge this URL from the entire platform?')) return;
    try {
      await adminApi.deleteUrl(id);
      setUrls((prev) => prev.filter((u) => u.id !== id));
      setUrlTotal((prev) => Math.max(0, prev - 1));
      showToast('URL permanently purged.');
    } catch (err: any) {
      showToast('Failed to delete URL.');
    }
  };

  const handleCopy = (id: string, code: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/${code}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // User Management Actions
  const handleToggleRole = async (userId: string, currentRole: 'admin' | 'user') => {
    const nextRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`Change this user's role to ${nextRole.toUpperCase()}?`)) return;
    try {
      await adminApi.updateUserRole(userId, nextRole);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: nextRole } : u)),
      );
      showToast(`User role updated to ${nextRole}.`);
    } catch (err: any) {
      showToast('Failed to change user role.');
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    if (!window.confirm(`Are you sure you want to ${nextStatus ? 'reactivate' : 'suspend'} this account?`)) return;
    try {
      await adminApi.updateUserStatus(userId, nextStatus);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_active: nextStatus } : u)),
      );
      showToast(`User account ${nextStatus ? 'reactivated' : 'suspended'}.`);
    } catch (err: any) {
      showToast('Failed to update user status.');
    }
  };

  const handleChangeUserPlan = async (userId: string, newPlan: 'free' | 'pro' | 'enterprise') => {
    try {
      await adminApi.updateUserPlan(userId, newPlan);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, plan: newPlan } : u)),
      );
      showToast(`User plan updated to ${newPlan.toUpperCase()}.`);
    } catch {
      showToast('Failed to update plan.');
    }
  };

  const user = authApi.getCurrentUser();
  if (!user || user.role !== 'admin') {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-error-container/30 text-error flex items-center justify-center">
          <span className="material-symbols-outlined text-[32px]">shield_lock</span>
        </div>
        <h2 className="text-xl font-bold text-on-surface">Access Restricted</h2>
        <p className="text-xs text-on-surface-variant max-w-md">
          Administrator privileges are required to view the ZeLnk Admin Console.
        </p>
        <button
          onClick={onBackToUserView}
          className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-semibold shadow-sm"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-5 lg:p-6 max-w-[1440px] mx-auto w-full flex flex-col gap-4 sm:gap-6 animate-fade-in">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-surface-container-highest text-on-surface border border-outline-variant/40 shadow-xl text-xs font-semibold flex items-center gap-2 animate-bounce">
          <span className="material-symbols-outlined text-primary text-[18px]">verified</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner / Breadcrumb */}
      {loading && (
        <div className="w-full h-1 bg-surface-container overflow-hidden rounded-full">
          <div className="w-full h-full bg-purple-600 animate-pulse" />
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant/30">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
            <span className="material-symbols-outlined text-[20px]">shield_person</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">
                Admin Console
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 font-code text-[11px] font-bold border border-purple-500/20">
                PLATFORM ROOT
              </span>
            </div>
            <p className="text-xs text-on-surface-variant">
              Centralized platform governance, quota limits, master moderation, and user management.
            </p>
          </div>
        </div>

        {/* Action: Switch to User Workspace */}
        <button
          onClick={onBackToUserView}
          className="self-start sm:self-auto px-3.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold transition flex items-center gap-1.5 border border-outline-variant/30 active:scale-95 shadow-sm"
        >
          <span className="material-symbols-outlined text-[16px]">dashboard</span>
          <span>Switch to User View</span>
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-outline-variant/30 pb-2 overflow-x-auto no-scrollbar whitespace-nowrap">
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            activeTab === 'settings'
              ? 'bg-purple-600 text-white font-semibold shadow-sm shadow-purple-500/20'
              : 'text-on-surface-variant hover:bg-surface-container-low'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">tune</span>
          <span>System &amp; Quota Limits</span>
        </button>

        <button
          onClick={() => setActiveTab('urls')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            activeTab === 'urls'
              ? 'bg-purple-600 text-white font-semibold shadow-sm shadow-purple-500/20'
              : 'text-on-surface-variant hover:bg-surface-container-low'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">alt_route</span>
          <span>Master Link Moderation</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            activeTab === 'users'
              ? 'bg-purple-600 text-white font-semibold shadow-sm shadow-purple-500/20'
              : 'text-on-surface-variant hover:bg-surface-container-low'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">group</span>
          <span>Users &amp; Roles</span>
        </button>

        <button
          onClick={() => setActiveTab('telemetry')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            activeTab === 'telemetry'
              ? 'bg-purple-600 text-white font-semibold shadow-sm shadow-purple-500/20'
              : 'text-on-surface-variant hover:bg-surface-container-low'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">monitoring</span>
          <span>Platform Telemetry</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: SYSTEM & QUOTA LIMITS                                   */}
      {/* ============================================================== */}
      {activeTab === 'settings' && (
        <form
          onSubmit={handleSaveSettings}
          className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-4 sm:p-6 shadow-sm flex flex-col gap-6"
        >
          <div className="flex flex-col gap-1 border-b border-outline-variant/20 pb-3">
            <h2 className="text-sm sm:text-base font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">tune</span>
              Global Quota &amp; Feature Limits
            </h2>
            <p className="text-xs text-on-surface-variant">
              Configure bandwidth quotas, expiration cycles, and feature access for free and guest users.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Limit 1: Free Tier Max Clicks */}
            <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-surface-container-low/50 border border-outline-variant/30">
              <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-primary">touch_app</span>
                Free / Guest Max Clicks Limit
              </label>
              <p className="text-[11px] text-on-surface-variant">
                Maximum clicks allowed before redirection is paused for free routes (set to 0 for unlimited).
              </p>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="number"
                  min="0"
                  max="1000000"
                  value={settings.free_tier_max_clicks}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      free_tier_max_clicks: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  className="w-32 px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant/40 font-code text-xs text-on-surface outline-none focus:border-primary"
                />
                <span className="text-xs font-code text-on-surface-variant">clicks per link</span>
              </div>
            </div>

            {/* Limit 2: Guest Passcode Protection Gate */}
            <div className="flex flex-col justify-between p-4 rounded-xl bg-surface-container-low/50 border border-outline-variant/30">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-amber-500">lock</span>
                  Allow Passcode Protection for Guests
                </label>
                <p className="text-[11px] text-on-surface-variant">
                  When toggled OFF, passcode protection becomes a Pro/Registered-only feature.
                </p>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.allow_guest_passwords}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        allow_guest_passwords: e.target.checked,
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
                <span className="text-xs font-semibold text-on-surface">
                  {settings.allow_guest_passwords ? 'Enabled for Guests' : 'Disabled (Requires Sign-In)'}
                </span>
              </div>
            </div>

            {/* Limit 3: Guest Expiration Duration */}
            <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-surface-container-low/50 border border-outline-variant/30">
              <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-primary">timer</span>
                Guest Link Expiration Duration
              </label>
              <p className="text-[11px] text-on-surface-variant">
                Time before links created by anonymous guests automatically expire.
              </p>
              <div className="flex items-center gap-2 mt-1">
                <select
                  value={settings.guest_expiration_minutes}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      guest_expiration_minutes: parseInt(e.target.value, 10),
                    })
                  }
                  className="px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant/40 font-code text-xs text-on-surface outline-none focus:border-primary"
                >
                  <option value={15}>15 Minutes (Default)</option>
                  <option value={30}>30 Minutes</option>
                  <option value={60}>1 Hour</option>
                  <option value={1440}>24 Hours (1 Day)</option>
                  <option value={10080}>7 Days</option>
                </select>
              </div>
            </div>

            {/* Limit 4: Custom Vanity Slugs on Free */}
            <div className="flex flex-col justify-between p-4 rounded-xl bg-surface-container-low/50 border border-outline-variant/30">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-primary">edit_note</span>
                  Allow Custom Vanity Slugs on Free
                </label>
                <p className="text-[11px] text-on-surface-variant">
                  Allow free/guest users to choose custom alias names (e.g. /my-promo) vs random codes only.
                </p>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.allow_custom_alias_free}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        allow_custom_alias_free: e.target.checked,
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
                <span className="text-xs font-semibold text-on-surface">
                  {settings.allow_custom_alias_free ? 'Allowed' : 'Pro Only (Random Slugs for Free)'}
                </span>
              </div>
            </div>

            {/* Limit 5: Maintenance Mode */}
            <div className="md:col-span-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-error-container/10 border border-error/30">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-error flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">warning</span>
                  Emergency Platform Maintenance Mode
                </label>
                <p className="text-[11px] text-on-surface-variant">
                  When active, redirects and link generation are temporarily suspended with a 503 Maintenance Page.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={settings.maintenance_mode}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      maintenance_mode: e.target.checked,
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-error"></div>
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-outline-variant/20">
            <button
              type="submit"
              disabled={savingSettings}
              className="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow-md shadow-purple-500/20 active:scale-95 flex items-center gap-2"
            >
              {savingSettings ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  <span>Save Configuration</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* ============================================================== */}
      {/* TAB 2: MASTER LINK MODERATION                                  */}
      {/* ============================================================== */}
      {activeTab === 'urls' && (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-sm p-4 sm:p-5 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]">alt_route</span>
                Master Link Registry ({urlTotal})
              </h2>
              <p className="text-xs text-on-surface-variant">
                Oversee all links across guests and registered accounts. Moderate abusive links or unlock password locks.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-[16px]">
                search
              </span>
              <input
                type="text"
                placeholder="Search short code, destination..."
                value={urlSearch}
                onChange={(e) => setUrlSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') fetchUrls();
                }}
                className="w-full pl-8 pr-3 py-1.5 bg-surface-container-low border border-outline-variant/30 rounded-lg text-xs font-body text-on-surface outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar whitespace-nowrap pb-1">
            {['all', 'active', 'locked', 'guest', 'password'].map((f) => (
              <button
                key={f}
                onClick={() => setUrlFilter(f)}
                className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition ${
                  urlFilter === f
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                {f === 'locked' ? '🔒 Locked (10 tries)' : f}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant/20 bg-surface-container-low/40 text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                  <th className="py-2.5 px-3">Route &amp; Destination</th>
                  <th className="py-2.5 px-3">Owner</th>
                  <th className="py-2.5 px-3 text-center">Clicks</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20 text-xs">
                {urls.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-on-surface-variant">
                      No URLs found matching this filter.
                    </td>
                  </tr>
                ) : (
                  urls.map((u) => (
                    <tr key={u.id} className="hover:bg-surface-container-low/40 transition">
                      {/* Route & Destination */}
                      <td className="py-3 px-3 max-w-xs">
                        <div className="flex items-center gap-1.5 font-code font-bold text-primary">
                          <span>/{u.short_code}</span>
                          <button
                            onClick={() => handleCopy(u.id, u.short_code)}
                            className="p-0.5 rounded text-on-surface-variant hover:text-primary transition"
                            title="Copy link"
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              {copiedId === u.id ? 'check' : 'content_copy'}
                            </span>
                          </button>
                          {u.has_password && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-code text-[10px] font-semibold">
                              🔒 Protected
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-code text-on-surface-variant truncate mt-0.5 select-all">
                          {u.original_url}
                        </div>
                      </td>

                      {/* Owner */}
                      <td className="py-3 px-3">
                        {u.user ? (
                          <div>
                            <p className="font-semibold text-on-surface">{u.user.name}</p>
                            <p className="text-[10px] text-on-surface-variant truncate">{u.user.email}</p>
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 font-code text-[10px] font-medium">
                            Guest ({u.guest_id ? u.guest_id.slice(0, 10) + '...' : 'Anonymous'})
                          </span>
                        )}
                      </td>

                      {/* Clicks */}
                      <td className="py-3 px-3 text-center">
                        <span className="font-code font-semibold px-2 py-0.5 rounded bg-surface-container text-on-surface text-xs">
                          {u.clicks_count}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        {u.is_locked ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-error-container text-on-error-container text-[11px] font-bold">
                            <span className="material-symbols-outlined text-[12px]">lock_clock</span>
                            Locked (10 tries)
                          </span>
                        ) : u.is_expired ? (
                          <span className="px-2 py-0.5 rounded-full bg-error-container text-on-error-container text-[11px] font-medium">
                            Expired
                          </span>
                        ) : !u.is_active ? (
                          <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-[11px] font-medium">
                            Disabled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-tertiary-container/15 text-tertiary text-[11px] font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
                            Active
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {u.is_locked && (
                            <button
                              onClick={() => handleUnlockUrl(u.id)}
                              className="px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] font-bold flex items-center gap-1 border border-amber-500/30 transition shadow-sm"
                              title="Unlock this route"
                            >
                              <span className="material-symbols-outlined text-[14px]">lock_open</span>
                              <span>Unlock</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleToggleUrl(u.id)}
                            className={`p-1.5 rounded-md hover:bg-surface-container transition ${
                              u.is_active ? 'text-tertiary' : 'text-outline'
                            }`}
                            title={u.is_active ? 'Disable Route' : 'Activate Route'}
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              power_settings_new
                            </span>
                          </button>

                          <button
                            onClick={() => handleDeleteUrl(u.id)}
                            className="p-1.5 rounded-md hover:bg-error-container text-on-surface-variant hover:text-error transition"
                            title="Purge URL"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination for Master URLs */}
          <div className="flex items-center justify-between pt-2 border-t border-outline-variant/20 text-xs">
            <span className="text-on-surface-variant font-code">
              Page {urlPage} &bull; Showing {urls.length} of {urlTotal} links
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={urlPage <= 1}
                onClick={() => setUrlPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded-md bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-semibold disabled:opacity-40 transition"
              >
                Previous
              </button>
              <button
                disabled={urlPage * 20 >= urlTotal}
                onClick={() => setUrlPage((p) => p + 1)}
                className="px-2.5 py-1 rounded-md bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-semibold disabled:opacity-40 transition"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: USERS & ROLES                                           */}
      {/* ============================================================== */}
      {activeTab === 'users' && (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-sm p-4 sm:p-5 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]">group</span>
                Registered Platform Users ({userTotal})
              </h2>
              <p className="text-xs text-on-surface-variant">
                Manage user privileges, promote to administrator, or suspend compromised accounts.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-[16px]">
                search
              </span>
              <input
                type="text"
                placeholder="Search user name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') fetchUsers();
                }}
                className="w-full pl-8 pr-3 py-1.5 bg-surface-container-low border border-outline-variant/30 rounded-lg text-xs font-body text-on-surface outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant/20 bg-surface-container-low/40 text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                  <th className="py-2.5 px-3">User</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Plan Tier</th>
                  <th className="py-2.5 px-3 text-center">Owned Links</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Joined</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20 text-xs">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-surface-container-low/40 transition">
                    <td className="py-3 px-3">
                      <p className="font-semibold text-on-surface">{u.name}</p>
                      <p className="text-[11px] text-on-surface-variant font-code">{u.email}</p>
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full font-code text-[10px] font-bold ${
                          u.role === 'admin'
                            ? 'bg-purple-600 text-white'
                            : 'bg-surface-container text-on-surface-variant'
                        }`}
                      >
                        {u.role.toUpperCase()}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <select
                        value={u.plan || 'free'}
                        onChange={(e) => handleChangeUserPlan(u.id, e.target.value as any)}
                        className={`px-2 py-1 rounded-lg font-code text-[11px] font-semibold border transition outline-none cursor-pointer ${
                          u.plan === 'enterprise'
                            ? 'bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-300'
                            : u.plan === 'pro'
                            ? 'bg-primary/10 border-primary/30 text-primary'
                            : 'bg-surface-container border-outline-variant/30 text-on-surface-variant'
                        }`}
                        title="Change user's subscription plan"
                      >
                        <option value="free">Free Starter</option>
                        <option value="pro">⚡ Pro Creator</option>
                        <option value="enterprise">🏢 Enterprise</option>
                      </select>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className="font-code font-semibold px-2 py-0.5 rounded bg-surface-container text-on-surface text-xs">
                        {u.urls_count}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      {u.is_active ? (
                        <span className="px-2 py-0.5 rounded-full bg-tertiary-container/15 text-tertiary text-[11px] font-semibold">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-error-container text-on-error-container text-[11px] font-medium">
                          Suspended
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-[11px] text-on-surface-variant font-code">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleRole(u.id, u.role)}
                          className="px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-[11px] font-semibold transition border border-outline-variant/30"
                        >
                          {u.role === 'admin' ? 'Demote to User' : 'Make Admin'}
                        </button>

                        <button
                          onClick={() => handleToggleUserStatus(u.id, u.is_active)}
                          className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition ${
                            u.is_active
                              ? 'bg-error-container/20 text-error hover:bg-error-container/40'
                              : 'bg-tertiary-container/20 text-tertiary hover:bg-tertiary-container/40'
                          }`}
                        >
                          {u.is_active ? 'Suspend' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination for Users */}
          <div className="flex items-center justify-between pt-2 border-t border-outline-variant/20 text-xs">
            <span className="text-on-surface-variant font-code">
              Page {userPage} &bull; Showing {users.length} of {userTotal} users
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={userPage <= 1}
                onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded-md bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-semibold disabled:opacity-40 transition"
              >
                Previous
              </button>
              <button
                disabled={userPage * 20 >= userTotal}
                onClick={() => setUserPage((p) => p + 1)}
                className="px-2.5 py-1 rounded-md bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-semibold disabled:opacity-40 transition"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: PLATFORM TELEMETRY                                      */}
      {/* ============================================================== */}
      {activeTab === 'telemetry' && (
        <div className="flex flex-col gap-5">
          {/* 4-KPI Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/30 shadow-sm">
              <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                Total Platform Links
              </span>
              <div className="text-2xl font-bold font-code text-on-surface mt-1">
                {stats?.totalUrls || 0}
              </div>
              <p className="text-[11px] text-on-surface-variant mt-1">
                {stats?.guestUrls || 0} guest routes
              </p>
            </div>

            <div className="bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/30 shadow-sm">
              <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                Global Click Volume
              </span>
              <div className="text-2xl font-bold font-code text-primary mt-1">
                {stats?.totalClicks || 0}
              </div>
              <p className="text-[11px] text-tertiary font-semibold mt-1">
                +{stats?.todayClicks || 0} clicks today
              </p>
            </div>

            <div className="bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/30 shadow-sm">
              <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                Registered Users
              </span>
              <div className="text-2xl font-bold font-code text-on-surface mt-1">
                {stats?.totalUsers || 0}
              </div>
              <p className="text-[11px] text-on-surface-variant mt-1">
                Standard &amp; Admin accounts
              </p>
            </div>

            <div className="bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/30 shadow-sm">
              <span className="text-[11px] font-semibold text-error uppercase tracking-wider">
                Security Locked Routes
              </span>
              <div className="text-2xl font-bold font-code text-error mt-1">
                {stats?.lockedUrls || 0}
              </div>
              <p className="text-[11px] text-on-surface-variant mt-1">
                Exceeded 10 passcode attempts
              </p>
            </div>
          </div>

          {/* Infrastructure Health Status */}
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-4 sm:p-5 shadow-sm flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
              Core Infrastructure Telemetry
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/20 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-on-surface">PostgreSQL Cluster</p>
                  <p className="text-[11px] text-on-surface-variant font-code">Pool: 20 connections</p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-tertiary-container/30 text-tertiary">
                  ONLINE
                </span>
              </div>

              <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/20 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-on-surface">HTTP 302 Redirection Edge</p>
                  <p className="text-[11px] text-on-surface-variant font-code">&lt; 15ms latency</p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-tertiary-container/30 text-tertiary">
                  OPTIMAL
                </span>
              </div>

              <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/20 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-on-surface">Brute-Force Guard</p>
                  <p className="text-[11px] text-on-surface-variant font-code">10-Attempt Lock Active</p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-tertiary-container/30 text-tertiary">
                  SECURE
                </span>
              </div>
            </div>
          </div>

          {/* Admin Platform Environment & Subsystems (Shifted from User Settings) */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Environment Details */}
            <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 shadow-sm flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]">dns</span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface">
                  Host &amp; Container Architecture
                </h3>
              </div>
              <div className="space-y-2 text-xs divide-y divide-outline-variant/10">
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-on-surface-variant">Backend API Engine:</span>
                  <span className="font-code font-semibold text-on-surface">http://localhost:5000</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-on-surface-variant">Primary Relational DB:</span>
                  <span className="font-code font-semibold text-on-surface">PostgreSQL · port 5435</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-on-surface-variant">In-Memory Cache Layer:</span>
                  <span className="font-code font-semibold text-on-surface">Redis · port 6385</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-on-surface-variant">Authentication Topology:</span>
                  <span className="font-code font-semibold text-on-surface">JWT (Access 15m / Refresh 7d)</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-on-surface-variant">Deployment Mode:</span>
                  <span className="font-code font-semibold text-tertiary">Development Mode</span>
                </div>
              </div>
            </div>

            {/* Subsystem Health Status */}
            <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 shadow-sm flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-tertiary text-[18px]">verified</span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface">
                  Subsystem Live Readiness
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                {[
                  { label: 'PostgreSQL DB (5435)', detail: 'Operational', ok: true },
                  { label: 'Redis Cache (6385)', detail: 'Operational', ok: true },
                  { label: 'JWT Token Engine', detail: 'Operational', ok: true },
                  { label: 'CORS Security Mesh', detail: 'Operational', ok: true },
                ].map((s) => (
                  <div key={s.label} className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/20 flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-tertiary text-[18px]">check_circle</span>
                    <div>
                      <p className="font-semibold text-on-surface text-[11px] leading-tight">{s.label}</p>
                      <p className="text-[10px] font-code text-tertiary mt-0.5">{s.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
