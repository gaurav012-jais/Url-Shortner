import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { QRCodeSVG } from 'qrcode.react';
import { CreateUrlPayload, UrlItem, BulkCreateResponse, User, PublicTierLimits } from '../types';
import { urlApi, adminApi } from '../services/api';
import { downloadQrStandeePng, downloadCleanQrPng } from '../utils/qr-poster-generator.util';

interface CreateLinkViewProps {
  onLinkCreated: (link: UrlItem) => void;
  onNavigateToLinks: () => void;
  currentUser?: User | null;
  onOpenAuth?: () => void;
}

const LOCAL_DOMAIN = 'localhost:5000';
const DEPLOYED_DOMAIN = 'zelnk.onrender.com';

const isRunningLocally = (): boolean => {
  if (typeof window === 'undefined') return true;
  const host = window.location.hostname;
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.includes('192.168.') ||
    host === '0.0.0.0'
  );
};

const getDeployDomain = (): string => {
  try {
    const apiUrl = import.meta.env.VITE_API_BASE_URL;
    if (apiUrl && !apiUrl.includes('localhost') && !apiUrl.includes('127.0.0.1')) {
      return new URL(apiUrl).host;
    }
  } catch {}
  return DEPLOYED_DOMAIN;
};

const getLocalDomain = (): string => {
  try {
    const apiUrl = import.meta.env.VITE_API_BASE_URL;
    if (apiUrl && (apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1'))) {
      return new URL(apiUrl).host;
    }
  } catch {}
  return LOCAL_DOMAIN;
};

const getPlatformDefaultDomain = (): string => {
  const isLocal = isRunningLocally();
  const saved = localStorage.getItem('linkflow_preferred_domain');
  if (saved) return saved;
  return isLocal ? getLocalDomain() : getDeployDomain();
};

export const CreateLinkView: React.FC<CreateLinkViewProps> = ({
  onLinkCreated,
  onNavigateToLinks,
  currentUser,
  onOpenAuth,
}) => {
  const isLocalEnv = isRunningLocally();
  const localPreset = getLocalDomain();
  const deployPreset = getDeployDomain();
  const defaultPlatformDomain = getPlatformDefaultDomain();

  // Environment-specific presets: only local domain on localhost, only deployed domain on production
  const domainPresets = isLocalEnv ? [localPreset] : [deployPreset];

  const homepageUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';

  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [protocol, setProtocol] = useState('https://');
  const [rawDestination, setRawDestination] = useState('');
  const [customDomain, setCustomDomain] = useState(() => defaultPlatformDomain);
  const [customAlias, setCustomAlias] = useState('');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [maxClicks, setMaxClicks] = useState('');

  // Optional Password Protection
  const [enablePassword, setEnablePassword] = useState(false);
  const [linkPassword, setLinkPassword] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);
  
  // UTM
  const [showUtm, setShowUtm] = useState(false);
  const [utmSource, setUtmSource] = useState('');
  const [utmMedium, setUtmMedium] = useState('');
  const [utmCampaign, setUtmCampaign] = useState('');

  // Bulk State
  const [bulkText, setBulkText] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkCreateResponse | null>(null);
  const [copiedBulk, setCopiedBulk] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successUrl, setSuccessUrl] = useState<UrlItem | null>(null);
  const [copied, setCopied] = useState(false);
  const [previewCopied, setPreviewCopied] = useState(false);
  const [limits, setLimits] = useState<PublicTierLimits | null>(null);

  useEffect(() => {
    adminApi.getPublicLimits().then(setLimits).catch(() => {});
  }, []);

  // Clean full URL calculation
  const getFullDestinationUrl = () => {
    let clean = rawDestination.trim();
    if (!clean) return '';
    if (/^https?:\/\//i.test(clean)) return clean;
    return `${protocol}${clean}`;
  };

  const fullDestination = getFullDestinationUrl();
  const activeDomain = customDomain.trim() || (isLocalEnv ? localPreset : deployPreset);
  const isLocal = activeDomain.includes('localhost');
  const liveShortUrl = `${isLocal ? 'http://' : 'https://'}${activeDomain}/${customAlias.trim() || 'your-custom-name'}`;
  const displayShortUrl = successUrl ? successUrl.short_url : liveShortUrl;
  const qrTargetUrl = successUrl ? successUrl.short_url : homepageUrl;

  const handleDomainChange = (val: string) => {
    const clean = val.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
    setCustomDomain(clean);
    localStorage.setItem('linkflow_preferred_domain', clean);
  };

  const handleAliasChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9_-]/g, '');
    setCustomAlias(val);
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = tagInput.trim().replace(/^#/, '');
      if (val && !tags.includes(val)) {
        setTags([...tags, val]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!rawDestination.trim()) {
      setError('Please provide a destination URL.');
      return;
    }

    if (!customAlias.trim()) {
      setError('Please choose a custom name / alias for your URL (e.g. "my-project", "summer-deal").');
      return;
    }

    if (enablePassword && !linkPassword.trim()) {
      setError('Please enter a passcode for password protection or toggle it off.');
      return;
    }

    let finalDestination = fullDestination;
    if (showUtm && (utmSource || utmMedium || utmCampaign)) {
      try {
        const u = new URL(finalDestination);
        if (utmSource) u.searchParams.set('utm_source', utmSource.trim());
        if (utmMedium) u.searchParams.set('utm_medium', utmMedium.trim());
        if (utmCampaign) u.searchParams.set('utm_campaign', utmCampaign.trim());
        finalDestination = u.toString();
      } catch {
        setError('Invalid destination URL format for adding UTM parameters.');
        return;
      }
    }

    const isPlatformPreset =
      activeDomain === localPreset ||
      activeDomain === deployPreset ||
      activeDomain === 'localhost:5000' ||
      activeDomain === 'zelnk.onrender.com' ||
      activeDomain === 'zelnk-backend.onrender.com';

    const payload: CreateUrlPayload = {
      original_url: finalDestination,
      custom_alias: customAlias.trim(),
      domain: isPlatformPreset ? undefined : activeDomain,
      tags: tags.length ? tags : undefined,
    };

    if (title.trim()) payload.title = title.trim();
    if (expiresAt) payload.expires_at = new Date(expiresAt).toISOString();
    if (maxClicks && parseInt(maxClicks, 10) > 0) payload.max_clicks = parseInt(maxClicks, 10);
    if (enablePassword && linkPassword.trim()) payload.password = linkPassword.trim();

    try {
      setLoading(true);
      const created = await urlApi.shortenUrl(payload);

      try {
        confetti({
          particleCount: 75,
          spread: 80,
          origin: { y: 0.6 },
        });
      } catch {
        // Confetti fallback
      }

      setSuccessUrl(created);
      onLinkCreated(created);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to deploy link. Please check if alias is taken or connection is active.';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopySuccess = () => {
    if (!successUrl) return;
    navigator.clipboard.writeText(successUrl.short_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadQr = async () => {
    const svg = document.getElementById('preview-qr-code') as unknown as SVGElement;
    if (!svg) return;
    try {
      if (successUrl) {
        // User shortened a link -> Standee poster with active 302 routing URL
        await downloadQrStandeePng(
          svg,
          {
            shortUrl: successUrl.short_url,
            shortCode: successUrl.short_code,
            title: successUrl.title || title.trim() || undefined,
            theme: 'purple',
            destinationUrl: successUrl.original_url,
          },
          `zelnk-standee-${successUrl.short_code}.png`,
        );
      } else {
        // Normal download without link shortening -> Project Homepage!
        await downloadQrStandeePng(
          svg,
          {
            shortUrl: homepageUrl,
            shortCode: 'home',
            title: 'ZeLnk — Smart URL Shortener',
            theme: 'purple',
            destinationUrl: homepageUrl,
          },
          'zelnk-homepage-standee.png',
        );
      }
    } catch (err) {
      console.error('Failed to download standee poster:', err);
    }
  };

  const handleDownloadCleanQr = async () => {
    const svg = document.getElementById('preview-qr-code') as unknown as SVGElement;
    if (!svg) return;
    try {
      const codeName = successUrl ? successUrl.short_code : 'zelnk-homepage';
      await downloadCleanQrPng(svg, codeName, true);
    } catch (err) {
      console.error('Failed to download clean QR:', err);
    }
  };

  const parseBulkLines = () => {
    return bulkText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#'))
      .map((line) => {
        const parts = line.split(',').map((p) => p.trim());
        let url = parts[0];
        if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
        const isPlatform =
          activeDomain === localPreset ||
          activeDomain === deployPreset ||
          activeDomain === 'localhost:5000' ||
          activeDomain === 'zelnk.onrender.com' ||
          activeDomain === 'zelnk-backend.onrender.com';
        return {
          original_url: url,
          custom_alias: parts[1] ? parts[1].toLowerCase().replace(/[^a-z0-9_-]/g, '') : undefined,
          domain: isPlatform ? undefined : activeDomain,
        };
      });
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseBulkLines();
    if (parsed.length === 0) {
      setError('Please paste at least 1 URL in the textarea below.');
      return;
    }

    try {
      setBulkLoading(true);
      setError(null);
      const res = await urlApi.createBulk({ urls: parsed });
      setBulkResult(res);
      res.created.forEach((item) => onLinkCreated(item));
      try {
        confetti({ particleCount: 75, spread: 80 });
      } catch {
        // Confetti fallback
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to process bulk links';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setBulkText(text);
    };
    reader.readAsText(file);
  };

  const handleCopyBulkUrls = () => {
    if (!bulkResult || bulkResult.created.length === 0) return;
    const urls = bulkResult.created.map((c) => c.short_url).join('\n');
    navigator.clipboard.writeText(urls);
    setCopiedBulk(true);
    setTimeout(() => setCopiedBulk(false), 2000);
  };

  const handleDownloadBulkCsv = () => {
    if (!bulkResult || bulkResult.created.length === 0) return;
    const csvContent = [
      'Original URL,Custom Alias,Short URL',
      ...bulkResult.created.map((c) => `"${c.original_url}","${c.short_code}","${c.short_url}"`),
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const u = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = u;
    a.download = `bulk-shortened-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(u);
  };

  return (
    <div className="p-3 sm:p-5 lg:p-6 max-w-[1440px] mx-auto w-full flex flex-col gap-3.5 sm:gap-5">
      {/* Top Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 sm:gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-on-surface-variant text-xs">
            <button onClick={onNavigateToLinks} className="hover:text-primary transition-colors">
              Links
            </button>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-on-surface font-medium">Create Custom Link</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap pt-0.5">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-on-surface tracking-tight">
              Create Custom Link
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:py-1 rounded-full bg-tertiary-container/15 text-tertiary text-[11px] sm:text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span>
              FAST DEPLOY &bull; HTTP 302 Redirection
            </span>
          </div>
          <p className="text-xs text-on-surface-variant max-w-2xl">
            Choose your exact custom short link name. Zero random codes, instant routing, and real-time live preview.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onNavigateToLinks}
            className="w-full sm:w-auto px-3.5 py-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-medium transition-all shadow-sm text-center"
          >
            View All Links
          </button>
        </div>
      </div>

      {/* Mode Switcher: Single Custom Link vs Bulk Batch Shortener */}
      <div className="flex items-center gap-2 border-b border-outline-variant/20 pb-3">
        <button
          type="button"
          onClick={() => {
            setMode('single');
            setError(null);
          }}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
            mode === 'single'
              ? 'bg-primary text-on-primary shadow-sm'
              : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">tune</span>
          <span>Single Custom Link</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMode('bulk');
            setError(null);
          }}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
            mode === 'bulk'
              ? 'bg-primary text-on-primary shadow-sm'
              : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">dynamic_feed</span>
          <span>Bulk Batch Shorten</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] bg-primary-fixed text-primary font-bold">
            CSV / Text
          </span>
        </button>
      </div>

      {mode === 'bulk' ? (
        <div className="max-w-4xl flex flex-col gap-4">
          <div className="bg-surface-container-lowest p-5 sm:p-6 rounded-2xl border border-outline-variant/30 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-on-surface">Batch Shorten Multiple Links</h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Paste up to 100 links below, one per line. Format:{' '}
                  <code className="font-code text-primary">url, optional_custom_alias</code>
                </p>
              </div>

              {/* Upload CSV button */}
              <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-xs font-medium text-on-surface flex items-center gap-1.5 border border-outline-variant/30 transition shadow-sm">
                <span className="material-symbols-outlined text-[16px]">upload_file</span>
                <span>Upload CSV / TXT</span>
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            <form onSubmit={handleBulkSubmit} className="space-y-4">
              <div className="relative">
                <textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={`https://github.com/nestjs/nest, nest-core\nhttps://react.dev, react-docs\nhttps://tailwindcss.com, tailwind-css\nhttps://vitejs.dev`}
                  rows={8}
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl p-4 font-code text-xs text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary leading-relaxed"
                />
                <div className="absolute right-3 bottom-3 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-code font-bold bg-surface-container text-on-surface-variant">
                    {parseBulkLines().length} URLs detected
                  </span>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-error-container/20 border border-error text-error text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  <span>{error}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                  <span>Target Domain:</span>
                  <span className="font-code font-bold text-primary">{activeDomain}</span>
                </div>

                <button
                  type="submit"
                  disabled={bulkLoading || parseBulkLines().length === 0}
                  className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-container disabled:opacity-50 text-on-primary font-semibold text-xs flex items-center gap-2 transition shadow-md"
                >
                  {bulkLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></div>
                      <span>Processing Batch...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">bolt</span>
                      <span>Shorten {parseBulkLines().length || ''} Links</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Bulk Results Table */}
          {bulkResult && (
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm p-5 sm:p-6 space-y-4 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant/20">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-tertiary text-[24px]">task_alt</span>
                  <div>
                    <h4 className="text-sm font-semibold text-on-surface">Batch Processing Completed</h4>
                    <p className="text-xs text-on-surface-variant">
                      <strong className="text-tertiary font-bold">{bulkResult.success_count}</strong>{' '}
                      links created successfully
                      {bulkResult.failure_count > 0 && (
                        <span>
                          , <strong className="text-error font-bold">{bulkResult.failure_count}</strong>{' '}
                          failed
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyBulkUrls}
                    className="px-3 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-xs font-medium text-on-surface flex items-center gap-1 border border-outline-variant/30 transition shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[15px]">
                      {copiedBulk ? 'check' : 'content_copy'}
                    </span>
                    <span>{copiedBulk ? 'Copied All' : 'Copy All URLs'}</span>
                  </button>

                  <button
                    onClick={handleDownloadBulkCsv}
                    className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-container text-xs font-semibold text-on-primary flex items-center gap-1 transition shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[15px]">download</span>
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto max-h-72">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-outline-variant/20 text-on-surface-variant font-medium">
                      <th className="pb-2">Original Destination</th>
                      <th className="pb-2">Custom Alias</th>
                      <th className="pb-2">Shortened URL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {bulkResult.created.map((item) => (
                      <tr key={item.id} className="hover:bg-surface-container-low/40">
                        <td
                          className="py-2.5 font-code text-on-surface-variant truncate max-w-xs"
                          title={item.original_url}
                        >
                          {item.original_url}
                        </td>
                        <td className="py-2.5 font-code font-bold text-primary">
                          /{item.short_code}
                        </td>
                        <td className="py-2.5 font-code font-medium text-on-surface">
                          {item.short_url}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Two-Column Workbench Layout */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Form (7 cols) */}
          <form onSubmit={handleSubmit} className="lg:col-span-7 flex flex-col gap-4">
            {/* Success Banner if recently created */}
            {successUrl && (
              <div className="p-4 rounded-xl bg-tertiary-fixed/40 border border-tertiary text-on-surface flex items-center justify-between gap-4 animate-fade-in shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-tertiary text-[22px]">verified</span>
                  <div>
                    <p className="text-xs font-semibold text-tertiary">Route Deployed Successfully!</p>
                    <p className="font-code text-xs text-on-surface font-bold">{successUrl.short_url}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopySuccess}
                    className="px-3 py-1.5 rounded-lg bg-surface-container-lowest text-xs font-medium text-primary shadow-sm hover:bg-surface-container transition flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[15px]">
                      {copied ? 'check' : 'content_copy'}
                    </span>
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </button>
                  <a
                    href={successUrl.short_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg bg-surface-container-lowest text-on-surface-variant hover:text-primary transition"
                    title="Test link"
                  >
                    <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                  </a>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3.5 rounded-xl bg-error-container/60 border border-error text-on-error-container text-xs font-medium flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-error">error</span>
                <span>{error}</span>
              </div>
            )}

            {/* Primary Route Card */}
            <div className="bg-surface-container-lowest rounded-xl p-4 sm:p-5 shadow-sm flex flex-col gap-4 border border-outline-variant/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded bg-primary-fixed flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[18px]">alt_route</span>
                  </div>
                  <h2 className="font-semibold text-sm sm:text-base text-on-surface">Target Endpoint &amp; Custom Alias</h2>
                </div>
                <span className="font-code text-[11px] text-tertiary bg-tertiary-fixed/30 px-2 py-0.5 rounded flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">bolt</span> 302 Direct
                </span>
              </div>

              {/* Destination URL */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-on-surface flex items-center justify-between">
                  <span>
                    Destination URL <span className="text-error">*</span>
                  </span>
                  {rawDestination && (
                    <span className="font-code text-[11px] text-tertiary flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[14px]">check_circle</span> Valid URL
                    </span>
                  )}
                </label>

                <div className="flex items-stretch rounded-lg bg-surface-container-low border border-outline-variant/30 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
                  <div className="relative flex items-center">
                    <select
                      value={protocol}
                      onChange={(e) => setProtocol(e.target.value)}
                      className="appearance-none bg-transparent text-on-surface font-code text-xs font-medium pl-3 pr-7 py-2.5 rounded-l-lg outline-none cursor-pointer"
                    >
                      <option value="https://">https://</option>
                      <option value="http://">http://</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-1 text-[16px] text-on-surface-variant pointer-events-none">
                      expand_more
                    </span>
                  </div>

                  <div className="relative flex-1 flex items-center">
                    <input
                      type="text"
                      value={rawDestination}
                      onChange={(e) => setRawDestination(e.target.value)}
                      placeholder="my-destination-site.com/product/example?ref=123"
                      className="w-full h-full px-3 py-2.5 font-code text-xs text-on-surface placeholder:text-outline bg-transparent outline-none"
                    />
                    {rawDestination && (
                      <button
                        type="button"
                        onClick={() => setRawDestination('')}
                        className="p-1.5 text-on-surface-variant hover:text-on-surface mr-1 transition-colors"
                        title="Clear"
                      >
                        <span className="material-symbols-outlined text-[16px]">cancel</span>
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-on-surface-variant">
                  Visitors who open your short link will be redirected to this exact web destination.
                </p>
              </div>

              {/* Custom Link Name / Alias */}
              <div className="flex flex-col gap-1.5 pt-1">
                <label className="text-xs font-medium text-on-surface flex items-center justify-between">
                  <span>
                    Short Link Domain &amp; Custom Name <span className="text-error">*</span>
                  </span>
                  <span className="font-code text-[11px] text-primary bg-primary-fixed/40 px-2 py-0.5 rounded flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[13px]">tune</span> Domain &amp; Alias
                  </span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  {/* Domain Input */}
                  <div className="sm:col-span-5 relative flex items-center bg-surface-container-low border border-outline-variant/30 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary rounded-lg px-2.5 py-1 transition-all">
                    <span className="material-symbols-outlined text-[16px] text-on-surface-variant mr-1.5">
                      language
                    </span>
                    <input
                      type="text"
                      value={customDomain}
                      onChange={(e) => handleDomainChange(e.target.value)}
                      placeholder={isLocalEnv ? localPreset : deployPreset}
                      className="w-full bg-transparent px-1 py-1.5 font-code text-xs text-on-surface font-semibold outline-none"
                      title="Custom domain"
                    />
                  </div>

                  {/* Back-half Custom Alias Input */}
                  <div className="sm:col-span-7 flex items-center bg-surface-container-low border border-outline-variant/30 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary rounded-lg px-3 py-1 transition-all">
                    <span className="font-code text-xs text-on-surface-variant select-none font-bold">
                      /
                    </span>
                    <input
                      type="text"
                      required
                      value={customAlias}
                      onChange={handleAliasChange}
                      placeholder="my-chosen-name"
                      className="w-full bg-transparent px-2 py-1.5 font-code text-xs text-on-surface font-semibold outline-none"
                    />
                    {customAlias && (
                      <span className="material-symbols-outlined text-tertiary text-[16px]" title="Clean slug format">
                        check_circle
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick Preset Domains */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[11px] text-on-surface-variant font-medium">Domain Presets:</span>
                  {domainPresets.map((preset) => {
                    const isLocal = preset.includes('localhost');
                    const isSelected = activeDomain.toLowerCase() === preset.toLowerCase();
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleDomainChange(preset)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-code transition flex items-center gap-1.5 border ${
                          isSelected
                            ? 'bg-primary text-on-primary border-primary font-bold shadow-sm'
                            : 'bg-surface-container text-on-surface-variant border-outline-variant/20 hover:bg-surface-container-high hover:text-on-surface'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          {isLocal ? 'dns' : 'language'}
                        </span>
                        <span>{preset}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title & Organization Tags */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-medium text-on-surface mb-1">
                    Internal Title (Optional)
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Q3 Summer Promo"
                    className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/30 rounded-lg text-xs text-on-surface outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-on-surface mb-1">
                    Tags (Press Enter)
                  </label>
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    placeholder="marketing, promo, beta"
                    className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/30 rounded-lg text-xs text-on-surface outline-none focus:border-primary"
                  />
                </div>
              </div>

              {tags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded-md bg-surface-container text-primary font-code text-xs flex items-center gap-1"
                    >
                      #{t}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(t)}
                        className="hover:text-error transition"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Advanced Rules & Security Parameters Card */}
            <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden flex flex-col">
              <div className="p-3.5 sm:p-4 bg-surface-container-low/40 border-b border-outline-variant/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">lock_clock</span>
                  <h3 className="font-semibold text-xs sm:text-sm text-on-surface">Link Security &amp; Advanced Rules</h3>
                </div>
                <span className="text-[11px] text-on-surface-variant font-code">Optional</span>
              </div>

              <div className="p-4 sm:p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Expiration date */}
                  <div>
                    <label className="block text-xs font-medium text-on-surface mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px] text-on-surface-variant">
                          schedule
                        </span>
                        <span>Deactivate after date</span>
                      </span>
                      {!currentUser && (
                        <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 font-code uppercase">
                          Guest Limit
                        </span>
                      )}
                    </label>
                    {currentUser ? (
                      <input
                        type="datetime-local"
                        value={expiresAt}
                        onChange={(e) => setExpiresAt(e.target.value)}
                        className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/30 rounded-lg text-xs text-on-surface outline-none focus:border-primary"
                      />
                    ) : (
                      <div className="p-2.5 bg-surface-container-low border border-outline-variant/30 rounded-lg text-xs flex items-center justify-between text-on-surface">
                        <span className="font-code text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[15px]">timer</span>
                          {limits?.guest_expiration_minutes || 15} Minutes (Auto-expires)
                        </span>
                        <button
                          type="button"
                          onClick={onOpenAuth}
                          className="text-[11px] text-primary hover:underline font-medium"
                        >
                          Sign in for permanent
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Max Clicks */}
                  <div>
                    <label className="block text-xs font-medium text-on-surface mb-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px] text-on-surface-variant">
                        ads_click
                      </span>
                      <span>Max Click Limit (Optional)</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 100"
                      value={maxClicks}
                      onChange={(e) => setMaxClicks(e.target.value)}
                      className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/30 rounded-lg text-xs text-on-surface outline-none focus:border-primary"
                    />
                  </div>
                </div>

                {/* --- Optional Password Protection Feature --- */}
                <div className="pt-2 border-t border-outline-variant/20 flex flex-col gap-2">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low border border-outline-variant/30">
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary shrink-0">
                        <span className="material-symbols-outlined text-[18px]">lock</span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-on-surface block">
                          Password Protection (Optional)
                        </span>
                        <span className="text-[11px] text-on-surface-variant truncate block">
                          Require visitors to enter a secret passcode before opening the destination
                        </span>
                      </div>
                    </div>

                    {/* Toggle Switch or Pro Lock */}
                    {!currentUser && limits && !limits.allow_guest_passwords ? (
                      <button
                        type="button"
                        onClick={onOpenAuth}
                        className="px-2.5 py-1 rounded-full bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 text-[10px] font-bold flex items-center gap-1 shrink-0 transition"
                        title="Sign in to use password protection"
                      >
                        <span className="material-symbols-outlined text-[12px]">lock</span>
                        <span>Sign In (Pro)</span>
                      </button>
                    ) : (
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={enablePassword}
                          onChange={(e) => {
                            setEnablePassword(e.target.checked);
                            if (!e.target.checked) setLinkPassword('');
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-secondary-container peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-container"></div>
                      </label>
                    )}
                  </div>

                  {/* Password Input Drawer */}
                  {enablePassword && (
                    <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-1.5 animate-fade-in">
                      <label className="text-xs font-medium text-on-surface flex items-center justify-between">
                        <span className="flex items-center gap-1 text-primary font-semibold">
                          <span className="material-symbols-outlined text-[16px]">key</span>
                          <span>Link Passcode</span>
                        </span>
                        <span className="text-[10px] text-on-surface-variant font-code">
                          {linkPassword.length > 0 ? `${linkPassword.length} chars` : 'Required'}
                        </span>
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type={showPasswordText ? 'text' : 'password'}
                          required={enablePassword}
                          value={linkPassword}
                          onChange={(e) => setLinkPassword(e.target.value)}
                          placeholder="Enter secret passcode (e.g. SecretPass123)"
                          className="w-full h-9 px-3 pr-9 bg-surface-container-lowest border border-outline-variant/30 rounded-lg text-xs font-code text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswordText(!showPasswordText)}
                          className="absolute right-2 p-1 text-on-surface-variant hover:text-on-surface transition"
                          title={showPasswordText ? 'Hide password' : 'Show password'}
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            {showPasswordText ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                      </div>
                      <p className="text-[11px] text-on-surface-variant">
                        Only visitors with this passcode will be allowed to access the target destination.
                      </p>
                    </div>
                  )}
                </div>

                {/* UTM Builder */}
                <div className="pt-2 border-t border-outline-variant/20">
                  <button
                    type="button"
                    onClick={() => setShowUtm(!showUtm)}
                    className="flex items-center gap-1 text-xs text-primary font-medium hover:underline"
                  >
                    <span className="material-symbols-outlined text-[15px]">campaign</span>
                    <span>{showUtm ? 'Hide Campaign UTM Parameters' : 'Add Campaign UTM Parameters (Source, Medium, Campaign)'}</span>
                  </button>

                  {showUtm && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2 p-3 rounded-lg bg-surface-container-low border border-outline-variant/20 animate-fade-in">
                      <div>
                        <label className="block text-[11px] text-on-surface-variant mb-1 font-medium">utm_source</label>
                        <input
                          type="text"
                          placeholder="e.g. twitter, newsletter"
                          value={utmSource}
                          onChange={(e) => setUtmSource(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-md bg-surface-container-lowest border border-outline-variant/30 text-xs text-on-surface outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-on-surface-variant mb-1 font-medium">utm_medium</label>
                        <input
                          type="text"
                          placeholder="e.g. social, cpc"
                          value={utmMedium}
                          onChange={(e) => setUtmMedium(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-md bg-surface-container-lowest border border-outline-variant/30 text-xs text-on-surface outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-on-surface-variant mb-1 font-medium">utm_campaign</label>
                        <input
                          type="text"
                          placeholder="e.g. launch2026"
                          value={utmCampaign}
                          onChange={(e) => setUtmCampaign(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-md bg-surface-container-lowest border border-outline-variant/30 text-xs text-on-surface outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-primary/20 active:scale-[0.99] disabled:opacity-60"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></div>
                  <span>Deploying Route to Edge...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">bolt</span>
                  <span>Deploy Short Link Now</span>
                </>
              )}
            </button>
          </form>

          {/* Right Column: Live Telemetry & Vector QR Preview (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4 sticky top-20">
            {/* Live Link Card */}
            <div className="bg-surface-container-lowest rounded-xl p-4 sm:p-5 shadow-sm border border-outline-variant/30 flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
                <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider flex items-center gap-1">
                  <span className="material-symbols-outlined text-primary text-[16px]">visibility</span>
                  Live Output Preview
                </span>
                <div className="flex items-center gap-1.5">
                  {enablePassword && linkPassword && (
                    <span className="font-code text-[10px] text-amber-700 dark:text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded flex items-center gap-1 font-semibold">
                      <span className="material-symbols-outlined text-[12px]">lock</span> Protected
                    </span>
                  )}
                  {successUrl ? (
                    <span className="font-code text-[10px] text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded flex items-center gap-1 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>Live &amp; Active</span>
                    </span>
                  ) : (
                    <span className="font-code text-[10px] text-amber-700 dark:text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded flex items-center gap-1 font-semibold">
                      <span className="material-symbols-outlined text-[12px]">edit_note</span>
                      <span>Draft Preview</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {/* Generated Short Link */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-on-surface-variant">Generated Short Link:</span>
                    {successUrl && (
                      <span className="text-[10px] font-code text-emerald-600 dark:text-emerald-400 font-bold">
                        HTTP 302 Route Ready
                      </span>
                    )}
                  </div>
                  <div className="p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/20 flex items-center justify-between gap-2">
                    <span className="font-code text-xs text-primary font-bold truncate select-all">
                      {displayShortUrl}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(displayShortUrl);
                          setPreviewCopied(true);
                          setTimeout(() => setPreviewCopied(false), 2000);
                        }}
                        className="p-1.5 rounded hover:bg-surface-container text-on-surface-variant hover:text-primary transition"
                        title={previewCopied ? 'Copied!' : 'Copy short link'}
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {previewCopied ? 'check' : 'content_copy'}
                        </span>
                      </button>
                      {successUrl ? (
                        <a
                          href={successUrl.short_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded bg-primary text-on-primary hover:bg-primary-container transition flex items-center justify-center shadow-sm"
                          title="Open live short link in new tab"
                        >
                          <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (fullDestination) {
                              window.open(fullDestination, '_blank');
                            }
                          }}
                          className="p-1.5 rounded hover:bg-surface-container text-on-surface-variant hover:text-primary transition"
                          title={fullDestination ? 'Preview destination site' : 'Enter destination on left'}
                        >
                          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Target Destination */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-on-surface-variant">Target Destination:</span>
                    {fullDestination && (
                      <a
                        href={fullDestination}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                      >
                        <span>Visit Site</span>
                        <span className="material-symbols-outlined text-[11px]">open_in_new</span>
                      </a>
                    )}
                  </div>
                  <div className="p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/20 font-code text-xs text-on-surface break-all min-h-[40px] flex items-center">
                    {fullDestination ? (
                      <span className="text-on-surface select-all">{fullDestination}</span>
                    ) : (
                      <span className="text-outline italic text-[11px]">Enter destination URL on the left...</span>
                    )}
                  </div>
                </div>

                {/* Live Routing Pipeline Indicator */}
                <div className="p-2.5 rounded-lg bg-surface-container-low/60 border border-outline-variant/20 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[10px] text-on-surface-variant font-semibold uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px] text-primary">alt_route</span>
                      <span>Instant 302 Redirection Route</span>
                    </span>
                    <span className="font-code font-bold text-tertiary">&lt; 15ms Edge</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-code text-on-surface overflow-hidden">
                    <span className="truncate max-w-[130px] font-bold text-primary">
                      /{customAlias.trim() || 'alias'}
                    </span>
                    <span className="text-tertiary font-bold shrink-0">──[ 302 ]──▶</span>
                    <span className="truncate flex-1 text-on-surface-variant">
                      {fullDestination ? (() => {
                        try {
                          return new URL(fullDestination).hostname;
                        } catch {
                          return 'destination';
                        }
                      })() : 'destination-site'}
                    </span>
                  </div>
                </div>

                {/* Action Button: Test Redirection */}
                {successUrl ? (
                  <a
                    href={successUrl.short_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 px-3 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold flex items-center justify-center gap-1.5 transition border border-primary/20"
                  >
                    <span className="material-symbols-outlined text-[16px]">rocket_launch</span>
                    <span>Test Live 302 Redirection (New Tab)</span>
                  </a>
                ) : fullDestination ? (
                  <a
                    href={fullDestination}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 px-3 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-medium flex items-center justify-center gap-1.5 transition border border-outline-variant/30"
                  >
                    <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                    <span>Verify Destination Site in New Tab</span>
                  </a>
                ) : null}
              </div>
            </div>

            {/* Real-time Dynamic QR Code Preview Card */}
            <div className="bg-surface-container-lowest rounded-xl p-4 sm:p-5 shadow-sm border border-outline-variant/30 flex flex-col items-center gap-3 text-center">
              <div className="w-full flex items-center justify-between pb-2 border-b border-outline-variant/20">
                <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider flex items-center gap-1">
                  <span className="material-symbols-outlined text-primary text-[16px]">qr_code_2</span>
                  Dynamic QR Code
                </span>
                <span className="text-[10px] text-outline font-code">PNG ready</span>
              </div>

              <div className="relative p-3.5 bg-white rounded-xl border border-outline-variant/30 shadow-inner flex items-center justify-center">
                {/* 4 Corner Camera Brackets */}
                <span className="absolute top-1.5 left-1.5 w-3.5 h-3.5 border-t-2 border-l-2 border-primary rounded-tl-sm" />
                <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 border-t-2 border-r-2 border-primary rounded-tr-sm" />
                <span className="absolute bottom-1.5 left-1.5 w-3.5 h-3.5 border-b-2 border-l-2 border-primary rounded-bl-sm" />
                <span className="absolute bottom-1.5 right-1.5 w-3.5 h-3.5 border-b-2 border-r-2 border-primary rounded-br-sm" />

                <div className="relative flex items-center justify-center">
                  <QRCodeSVG
                    id="preview-qr-code"
                    value={qrTargetUrl}
                    size={160}
                    level="H"
                    includeMargin={false}
                  />
                  {/* Center Brand Badge */}
                  <div className="absolute inset-0 m-auto w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center border border-slate-200">
                    <span className="text-[14px]">{successUrl ? '⚡' : '🏠'}</span>
                  </div>
                </div>
              </div>

              {/* Dynamic QR Context Explanation */}
              {successUrl ? (
                <div className="flex flex-col gap-0.5 text-center px-1">
                  <span className="text-[11px] font-semibold text-tertiary flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">verified</span>
                    <span>Active Shortened Link QR</span>
                  </span>
                  <p className="text-[10px] text-on-surface-variant max-w-xs break-all">
                    Points to <strong className="font-code text-on-surface">/{successUrl.short_code}</strong> with instant 302 routing to destination.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-0.5 text-center px-1">
                  <span className="text-[11px] font-semibold text-primary flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">home</span>
                    <span>Default Homepage QR</span>
                  </span>
                  <p className="text-[10px] text-on-surface-variant max-w-xs">
                    Normal download opens the project homepage. Deploy your custom link below to bind this QR directly to your destination.
                  </p>
                </div>
              )}

              <div className="w-full flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={handleDownloadQr}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm hover:shadow"
                >
                  <span className="material-symbols-outlined text-[17px]">style</span>
                  <span>{successUrl ? 'Download Standee Poster (PNG)' : 'Download Homepage Poster (PNG)'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadCleanQr}
                  className="w-full py-1.5 px-3 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-medium transition flex items-center justify-center gap-1.5 border border-outline-variant/30"
                >
                  <span className="material-symbols-outlined text-[15px]">crop_free</span>
                  <span>{successUrl ? 'Plain QR Code' : 'Plain Homepage QR'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
