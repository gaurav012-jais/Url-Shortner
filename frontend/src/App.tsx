import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { CreateLinkView } from './components/CreateLinkView';
import { LinksListView } from './components/LinksListView';
import { OverviewView } from './components/OverviewView';
import { LandingPageView } from './components/LandingPageView';
import { QrCodeModal } from './components/QrCodeModal';
import { LinkAnalyticsModal } from './components/LinkAnalyticsModal';
import { SettingsView } from './components/SettingsView';
import { AdminConsoleView } from './components/AdminConsoleView';
import { SubscriptionView } from './components/SubscriptionView';
import { AuthModal } from './components/AuthModal';
import { AuthGatewayView } from './components/AuthGatewayView';
import { UrlItem, User } from './types';
import { urlApi, authApi } from './services/api';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('create-link');
  const [workspaceName, setWorkspaceName] = useState(() => {
    return localStorage.getItem('zelnk_workspace_name') || 'personal-prod';
  });
  const [urls, setUrls] = useState<UrlItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQrUrl, setSelectedQrUrl] = useState<UrlItem | null>(null);
  const [selectedAnalyticsUrl, setSelectedAnalyticsUrl] = useState<UrlItem | null>(null);
  const [qrPage, setQrPage] = useState(1);
  const QR_PER_PAGE = 12;
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Authentication State & Guest Session Tracking
  const [currentUser, setCurrentUser] = useState<User | null>(() => authApi.getCurrentUser());
  const [isGuestSession, setIsGuestSession] = useState<boolean>(() => {
    return localStorage.getItem('linkflow_is_guest') === 'true';
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const fetchUrls = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const res = await urlApi.getUrls(1, 100);
      setUrls(res.data);
    } catch (err) {
      console.error('Failed to fetch URLs:', err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchUrls();

    // Verify token validity in background if user is saved
    if (currentUser) {
      authApi.getMe().catch(() => {
        setCurrentUser(null);
      });
    }

    const handleAuthChange = () => {
      setCurrentUser(authApi.getCurrentUser());
      fetchUrls();
    };

    window.addEventListener('auth_state_changed', handleAuthChange);

    // Real-Time Clicks: Instantly refresh when user switches tabs or focuses the window
    const handleWindowFocus = () => {
      fetchUrls(true);
    };
    window.addEventListener('focus', handleWindowFocus);

    // Real-Time Clicks: Smooth background polling every 3 seconds while active
    const livePollingTimer = setInterval(() => {
      if (!document.hidden) {
        fetchUrls(true);
      }
    }, 3000);

    return () => {
      window.removeEventListener('auth_state_changed', handleAuthChange);
      window.removeEventListener('focus', handleWindowFocus);
      clearInterval(livePollingTimer);
    };
  }, []);

  // Security Guard: Immediately eject from 'admin' tab if user is not an admin
  useEffect(() => {
    if (activeTab === 'admin' && currentUser?.role !== 'admin') {
      setActiveTab('overview');
    }
  }, [activeTab, currentUser]);

  const handleLinkCreated = (newUrl: UrlItem) => {
    setUrls((prev) => [newUrl, ...prev.filter((u) => u.id !== newUrl.id)]);
  };

  const handleToggleActive = async (id: string) => {
    try {
      const updated = await urlApi.toggleActive(id);
      setUrls((prev) => prev.map((u) => (u.id === id ? updated : u)));
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const handleDeleteUrl = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this route?')) return;
    try {
      await urlApi.deleteUrl(id);
      setUrls((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      console.error('Failed to delete route:', err);
    }
  };

  const handleLogout = async () => {
    await authApi.logout();
    setCurrentUser(null);
    setIsGuestSession(false);
    setActiveTab('overview');
    localStorage.removeItem('linkflow_is_guest');
    setUrls([]);
  };

  // --- Starting Screen: Auth Gateway (Sign In / Register / Guest Mode) ---
  if (!currentUser && !isGuestSession) {
    return (
      <AuthGatewayView
        onSuccess={(user) => {
          setCurrentUser(user);
          setIsGuestSession(false);
          setActiveTab(user.role === 'admin' ? 'overview' : 'create-link');
          localStorage.removeItem('linkflow_is_guest');
          fetchUrls();
        }}
        onContinueAsGuest={() => {
          setIsGuestSession(true);
          setActiveTab('create-link');
          localStorage.setItem('linkflow_is_guest', 'true');
          fetchUrls();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background font-body text-on-surface antialiased flex flex-col">
      {/* Mobile Drawer Overlay Backdrop */}
      {isMobileNavOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileNavOpen(false)}
        />
      )}

      {/* Sidebar (Responsive Slide-over on Mobile, Fixed on Desktop) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalLinksCount={urls.length}
        isOpenMobile={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
        isAdmin={currentUser?.role === 'admin'}
        workspaceName={workspaceName}
      />

      <div className="pl-0 lg:pl-64 flex flex-col min-h-screen pb-16 lg:pb-0">
        {/* Fixed Top Header (Dashboard mode) */}
        {activeTab !== 'landing' && (
          <Header
            searchQuery={searchQuery}
            setSearchQuery={(q) => {
              setSearchQuery(q);
              if (q && activeTab !== 'links') {
                setActiveTab('links');
              }
            }}
            currentUser={currentUser}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            onLogout={handleLogout}
            onOpenMobileNav={() => setIsMobileNavOpen(true)}
            activeView={activeTab}
            onNavigate={(view) => setActiveTab(view)}
          />
        )}

        {/* Main Content Area */}
        <main className={`w-full flex-1 ${activeTab !== 'landing' ? 'pt-14' : ''}`}>
          {activeTab === 'landing' && (
            <LandingPageView
              onOpenConsole={() => setActiveTab('create-link')}
              onOpenAuth={() => setIsAuthModalOpen(true)}
              onLinkCreated={handleLinkCreated}
            />
          )}

          {activeTab === 'create-link' && (
            <CreateLinkView
              onLinkCreated={handleLinkCreated}
              onNavigateToLinks={() => setActiveTab('links')}
              currentUser={currentUser}
              onOpenAuth={() => setIsAuthModalOpen(true)}
            />
          )}

          {activeTab === 'links' && (
            <LinksListView
              urls={urls}
              loading={loading}
              searchQuery={searchQuery}
              onNavigateToCreate={() => setActiveTab('create-link')}
              onToggleActive={handleToggleActive}
              onDeleteUrl={handleDeleteUrl}
              onOpenQr={(url) => setSelectedQrUrl(url)}
              onOpenAnalytics={(url) => setSelectedAnalyticsUrl(url)}
            />
          )}

          {activeTab === 'overview' && (
            <OverviewView
              urls={urls}
              onNavigateToLinks={() => setActiveTab('links')}
              onOpenQr={(url) => setSelectedQrUrl(url)}
              onOpenAnalytics={(url) => setSelectedAnalyticsUrl(url)}
              onLinkCreated={handleLinkCreated}
            />
          )}

          {activeTab === 'qr-codes' && (() => {
            const qrTotalPages = Math.max(1, Math.ceil(urls.length / QR_PER_PAGE));
            const safeQrPage = Math.min(qrPage, qrTotalPages);
            const paginatedQr = urls.slice((safeQrPage - 1) * QR_PER_PAGE, safeQrPage * QR_PER_PAGE);
            return (
              <div className="p-3 sm:p-5 lg:p-6 max-w-[1440px] mx-auto w-full flex flex-col gap-3.5 sm:gap-5">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-semibold text-on-surface">QR Code Hub</h1>
                    <p className="text-[11px] sm:text-xs text-on-surface-variant">
                      Vector scannable QR codes generated for each custom routing rule.
                    </p>
                  </div>
                  {urls.length > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-surface-container-high text-primary font-code text-[11px] sm:text-xs font-semibold">
                      {urls.length} total
                    </span>
                  )}
                </div>

                {urls.length === 0 ? (
                  <div className="p-12 text-center bg-surface-container-lowest rounded-2xl border border-outline-variant/30 flex flex-col items-center gap-3">
                    <span className="material-symbols-outlined text-[48px] text-outline">qr_code_2</span>
                    <p className="text-sm font-semibold text-on-surface">No short links created yet</p>
                    <p className="text-xs text-on-surface-variant">
                      Create your first custom link to generate scannable QR codes.
                    </p>
                    <button
                      onClick={() => setActiveTab('create-link')}
                      className="mt-2 px-4 py-2 rounded-lg bg-primary text-on-primary text-xs font-semibold"
                    >
                      + Create Link
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                      {paginatedQr.map((link) => (
                        <div
                          key={link.id}
                          className="p-3.5 sm:p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm flex flex-col items-center text-center gap-3 hover:shadow-md transition"
                        >
                          <div
                            className="w-full text-left truncate font-semibold text-xs text-on-surface"
                            title={link.title || link.short_code}
                          >
                            {link.title || link.short_code}
                          </div>
                          <div className="p-3 bg-white rounded-xl border border-outline-variant/30 shadow-inner flex items-center justify-center">
                            <QRCodeSVG
                              id={`qr-svg-${link.id}`}
                              value={link.short_url}
                              size={112}
                              level="M"
                              includeMargin={false}
                            />
                          </div>
                          <span className="font-code text-xs text-primary font-bold truncate max-w-full">
                            /{link.short_code}
                          </span>
                          <button
                            onClick={() => setSelectedQrUrl(link)}
                            className="w-full py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-xs font-medium text-on-surface transition flex items-center justify-center gap-1.5"
                          >
                            <span className="material-symbols-outlined text-[15px]">zoom_in</span>
                            <span>View &amp; Download</span>
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Device-Adaptive QR Pagination Bar */}
                    {urls.length > QR_PER_PAGE && (
                      <div className="mt-2 pt-2">
                        {/* Mobile Pagination (< 640px) */}
                        <div className="flex sm:hidden items-center justify-between px-1">
                          <span className="text-[11px] font-code text-on-surface-variant">
                            {(safeQrPage - 1) * QR_PER_PAGE + 1}–{Math.min(safeQrPage * QR_PER_PAGE, urls.length)} of{' '}
                            <strong className="text-on-surface">{urls.length}</strong>
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setQrPage(safeQrPage - 1)}
                              disabled={safeQrPage === 1}
                              className="w-8 h-8 rounded-lg bg-surface-container-low text-on-surface flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed active:bg-surface-container transition shadow-sm"
                              title="Previous page"
                            >
                              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                            </button>
                            <span className="font-code text-xs px-2 text-on-surface font-semibold">
                              {safeQrPage} / {qrTotalPages}
                            </span>
                            <button
                              onClick={() => setQrPage(safeQrPage + 1)}
                              disabled={safeQrPage === qrTotalPages}
                              className="w-8 h-8 rounded-lg bg-surface-container-low text-on-surface flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed active:bg-surface-container transition shadow-sm"
                              title="Next page"
                            >
                              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                            </button>
                          </div>
                        </div>

                        {/* Desktop Pagination (≥ 640px) */}
                        <div className="hidden sm:flex items-center justify-between px-1">
                          <p className="text-xs text-on-surface-variant font-code">
                            Showing{' '}
                            <span className="font-semibold text-on-surface">
                              {(safeQrPage - 1) * QR_PER_PAGE + 1}–{Math.min(safeQrPage * QR_PER_PAGE, urls.length)}
                            </span>{' '}
                            of <span className="font-semibold text-on-surface">{urls.length}</span> QR codes
                          </p>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setQrPage(safeQrPage - 1)}
                              disabled={safeQrPage === 1}
                              className="p-1.5 rounded-lg border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed transition"
                            >
                              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                            </button>
                            {Array.from({ length: qrTotalPages }, (_, i) => i + 1)
                              .filter((p) => p === 1 || p === qrTotalPages || Math.abs(p - safeQrPage) <= 1)
                              .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...');
                                acc.push(p);
                                return acc;
                              }, [])
                              .map((p, idx) =>
                                p === '...' ? (
                                  <span key={`qdot-${idx}`} className="px-2 text-xs text-on-surface-variant">…</span>
                                ) : (
                                  <button
                                    key={p}
                                    onClick={() => setQrPage(p as number)}
                                    className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-semibold transition border ${
                                      safeQrPage === p
                                        ? 'bg-primary text-on-primary border-primary shadow-sm'
                                        : 'border-outline-variant/30 text-on-surface-variant hover:bg-surface-container'
                                    }`}
                                  >
                                    {p}
                                  </button>
                                )
                              )}
                            <button
                              onClick={() => setQrPage(safeQrPage + 1)}
                              disabled={safeQrPage === qrTotalPages}
                              className="p-1.5 rounded-lg border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed transition"
                            >
                              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })()}

          {activeTab === 'settings' && (
            <SettingsView
              currentUser={currentUser}
              onOpenAuth={() => setIsAuthModalOpen(true)}
              onLogout={handleLogout}
              onNavigateToSubscription={() => setActiveTab('subscription')}
              workspaceName={workspaceName}
              onWorkspaceNameChange={setWorkspaceName}
            />
          )}

          {activeTab === 'subscription' && (
            <SubscriptionView
              currentUser={currentUser}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
              onUserUpdated={(updatedUser) => {
                setCurrentUser(updatedUser);
                authApi.saveCurrentUser(updatedUser);
              }}
            />
          )}

          {activeTab === 'admin' && currentUser?.role === 'admin' && (
            <AdminConsoleView onBackToUserView={() => setActiveTab('overview')} />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Matching Phone Version) */}
      {activeTab !== 'landing' && (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface-container-lowest/95 backdrop-blur-md border-t border-outline-variant/30 flex items-center justify-around px-2 z-30 select-none shadow-lg">
          {[
            { id: 'overview', label: 'Overview', icon: 'space_dashboard' },
            { id: 'links', label: 'Links', icon: 'link' },
            { id: 'create-link', label: 'Create', icon: 'add', isSpecial: true },
            ...(currentUser?.role === 'admin'
              ? [{ id: 'admin', label: 'Admin', icon: 'shield_person' }]
              : [{ id: 'qr-codes', label: 'QRs', icon: 'qr_code_2' }]),
            { id: 'settings', label: 'Settings', icon: 'settings' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            if (tab.isSpecial) {
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="w-12 h-12 -mt-5 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-lg active:scale-95 transition"
                  title="Create link"
                >
                  <span className="material-symbols-outlined text-[26px]">add</span>
                </button>
              );
            }
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-lg text-[10px] transition font-medium ${
                  isActive
                    ? 'text-primary font-semibold'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[20px] ${
                    isActive ? 'text-primary' : 'text-on-surface-variant'
                  }`}
                >
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      )}

      {/* Dynamic QR Code Modal with PNG and SVG export */}
      <QrCodeModal url={selectedQrUrl} onClose={() => setSelectedQrUrl(null)} />

      {/* Deep Link Analytics Telemetry Modal */}
      <LinkAnalyticsModal
        url={selectedAnalyticsUrl}
        onClose={() => setSelectedAnalyticsUrl(null)}
      />

      {/* Auth Modal (Sign In / Register) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(user) => {
          setCurrentUser(user);
          setIsGuestSession(false);
          if (user.role !== 'admin' && activeTab === 'admin') {
            setActiveTab('overview');
          }
          localStorage.removeItem('linkflow_is_guest');
          fetchUrls();
        }}
      />
    </div>
  );
};
