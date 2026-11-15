import React, { useState } from 'react';
import { urlApi } from '../services/api';
import { UrlItem } from '../types';
import { ZeLnkLogo } from './ZeLnkLogo';

interface LandingPageViewProps {
  onOpenConsole: () => void;
  onOpenAuth: () => void;
  onLinkCreated: (link: UrlItem) => void;
}

export const LandingPageView: React.FC<LandingPageViewProps> = ({
  onOpenConsole,
  onOpenAuth,
  onLinkCreated,
}) => {
  const [targetUrl, setTargetUrl] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdUrl, setCreatedUrl] = useState<UrlItem | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleQuickShorten = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUrl.trim()) return;
    setError(null);

    let cleanUrl = targetUrl.trim();
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = `https://${cleanUrl}`;
    }

    try {
      setLoading(true);
      const res = await urlApi.shortenUrl({
        original_url: cleanUrl,
        custom_alias: customSlug.trim() || undefined,
      });
      setCreatedUrl(res);
      onLinkCreated(res);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to shorten URL';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!createdUrl) return;
    navigator.clipboard.writeText(createdUrl.short_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full min-h-screen bg-background text-on-surface flex flex-col font-body">
      {/* Top Header */}
      <header className="w-full bg-surface-container-lowest/90 backdrop-blur-md sticky top-0 z-50 border-b border-outline-variant/30">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-2 shrink-0">
            <ZeLnkLogo size="md" />
            <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-code whitespace-nowrap">
              v3.4 Edge
            </span>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-6 text-xs font-medium text-on-surface-variant">
            <a href="#features" className="hover:text-primary transition-colors">Architecture</a>
            <a href="#telemetry" className="hover:text-primary transition-colors">Telemetry</a>
            <a href="#pricing" className="hover:text-primary transition-colors">Deployment</a>
            <a href="#faq" className="hover:text-primary transition-colors">FAQ</a>
          </nav>

          {/* Right Action CTAs */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <div className="hidden lg:flex items-center space-x-2 text-tertiary bg-tertiary-container/15 px-3 py-1 rounded-full text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
              <span>PostgreSQL Edge Live</span>
            </div>

            <button
              onClick={onOpenAuth}
              className="text-xs font-semibold text-on-surface-variant hover:text-on-surface px-2.5 py-1.5 rounded-lg hover:bg-surface-container-low transition-colors whitespace-nowrap shrink-0"
            >
              Sign In
            </button>

            <button
              onClick={onOpenConsole}
              className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-semibold text-xs shadow-sm transition flex items-center gap-1 sm:gap-1.5 whitespace-nowrap active:scale-95 shrink-0"
            >
              <span>Launch</span>
              <span className="hidden xs:inline">Console</span>
              <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-10 sm:pt-16 pb-16 sm:pb-24 border-b border-outline-variant/20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col items-center text-center relative z-10">
          {/* Status badge */}
          <div className="inline-flex items-center gap-2 bg-surface-container-high px-3 py-1 rounded-full shadow-sm mb-4 sm:mb-6 border border-outline-variant/30 max-w-full overflow-hidden">
            <span className="w-2 h-2 rounded-full bg-tertiary animate-ping shrink-0"></span>
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-on-surface truncate">
              Industrial Routing Engine
            </span>
            <span className="hidden xs:inline text-on-surface-variant">&bull;</span>
            <span className="hidden xs:inline text-[11px] sm:text-xs text-primary font-medium truncate">
              PostgreSQL &amp; Redis Active
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-on-surface mb-3 sm:mb-6 leading-tight">
            Shorten Links. <br />
            <span className="bg-gradient-to-r from-primary to-primary-container bg-clip-text text-transparent">
              Understand Every Click.
            </span>
          </h1>

          <p className="text-xs sm:text-base text-on-surface-variant max-w-2xl mb-6 sm:mb-10 leading-relaxed px-2">
            Industrial URL infrastructure engineered for latency-critical redirects, custom vanity slugs, real-time analytics, and instant dynamic QR codes.
          </p>

          {/* Quick Shorten Bar (Live Interactive Demo) */}
          <div className="w-full max-w-3xl bg-surface-container-lowest p-2 rounded-2xl border border-outline-variant/40 shadow-xl mb-4">
            <form onSubmit={handleQuickShorten} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex-1 flex items-center px-2.5 sm:px-3 gap-2">
                <span className="material-symbols-outlined text-outline text-[18px] sm:text-[20px] shrink-0">link</span>
                <input
                  type="text"
                  placeholder="Paste a long destination URL (e.g. https://github.com/my-awesome-repo)..."
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  className="w-full py-1.5 sm:py-2 bg-transparent text-xs text-on-surface placeholder:text-outline outline-none font-code"
                />
              </div>

              <div className="flex items-center gap-2 px-1 sm:px-2">
                <div className="flex items-center bg-surface-container-low px-2 py-1.5 rounded-lg border border-outline-variant/30 flex-1 sm:flex-initial">
                  <span className="text-xs text-on-surface-variant font-code font-bold mr-0.5">/</span>
                  <input
                    type="text"
                    placeholder="custom-slug"
                    value={customSlug}
                    onChange={(e) => setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                    className="w-full sm:w-24 bg-transparent text-xs font-code text-on-surface font-semibold outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-semibold text-xs flex items-center justify-center gap-1.5 transition shadow-sm whitespace-nowrap shrink-0 active:scale-95"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">bolt</span>
                      <span>Shorten Link</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-error-container text-on-error-container text-xs font-medium mb-4">
              {error}
            </div>
          )}

          {createdUrl && (
            <div className="w-full max-w-2xl p-4 rounded-xl bg-tertiary-fixed/30 border border-tertiary flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in mb-6">
              <div className="flex items-center gap-2.5 text-left truncate">
                <span className="material-symbols-outlined text-tertiary text-[20px]">check_circle</span>
                <div className="truncate">
                  <span className="text-[11px] font-semibold text-tertiary block">
                    Your Short Link is Ready:
                  </span>
                  <span className="font-code text-xs font-bold text-on-surface">{createdUrl.short_url}</span>
                  {createdUrl.expires_at && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 block mt-0.5 font-code">
                      ⏱️ Guest Link: Expires in 15 minutes. Sign in to make it permanent!
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded-lg bg-surface-container-lowest text-xs font-semibold text-primary shadow-sm hover:bg-surface-container transition flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[15px]">{copied ? 'check' : 'content_copy'}</span>
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="px-3 py-1.5 rounded-lg bg-primary text-xs font-semibold text-on-primary shadow-sm hover:bg-primary-container transition"
                >
                  Sign In
                </button>
              </div>
            </div>
          )}

          {/* SLA Pills */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-8 pt-4 sm:pt-6 text-[11px] sm:text-xs text-on-surface-variant font-code">
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="material-symbols-outlined text-[15px] sm:text-[16px] text-tertiary">check</span>
              99.99% Uptime SLA
            </span>
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="material-symbols-outlined text-[15px] sm:text-[16px] text-tertiary">check</span>
              &lt;20ms HTTP 302
            </span>
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="material-symbols-outlined text-[15px] sm:text-[16px] text-tertiary">check</span>
              Zero Lock-in
            </span>
          </div>
        </div>
      </section>

      {/* Features Bento Grid */}
      <section id="features" className="py-20 max-w-6xl mx-auto px-6 w-full">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">
            Engineered for Precision & Speed
          </h2>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-2">
            Every feature designed to provide maximum control over your web traffic and branded links.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="p-6 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-primary-fixed text-primary flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-[22px]">tune</span>
              </div>
              <h3 className="font-semibold text-base text-on-surface mb-1">User-Decided Slugs</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                No random gibberish. Choose exactly how your link looks (e.g. /summer-sale or /portfolio) with instant collision checks.
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-primary-fixed text-primary flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-[22px]">query_stats</span>
              </div>
              <h3 className="font-semibold text-base text-on-surface mb-1">Real-Time Telemetry</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Track click volume curves, device splits (Mobile/Desktop), browsers, and referrer sources in real-time.
              </p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-primary-fixed text-primary flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-[22px]">qr_code_2</span>
              </div>
              <h3 className="font-semibold text-base text-on-surface mb-1">Dynamic QR Codes</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Instantly render high-resolution QR codes pointing directly to your routes, downloadable in PNG format.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-outline-variant/20 py-8 bg-surface-container-lowest text-center text-xs text-on-surface-variant">
        <p>&copy; 2026 ZeLnk Platform &bull; Smart URL Infrastructure & Redirection Engine</p>
      </footer>
    </div>
  );
};

