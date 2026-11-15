import React, { useState } from 'react';
import {
  Link as LinkIcon,
  Sparkles,
  SlidersHorizontal,
  Calendar,
  MousePointerClick,
  Tag,
  ArrowRight,
  ClipboardPaste,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CreateUrlPayload, UrlItem } from '../types';
import { urlApi } from '../services/api';

interface ShortenFormProps {
  onUrlCreated: (url: UrlItem) => void;
}

export const ShortenForm: React.FC<ShortenFormProps> = ({ onUrlCreated }) => {
  const [originalUrl, setOriginalUrl] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customAlias, setCustomAlias] = useState('');
  const [title, setTitle] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [maxClicks, setMaxClicks] = useState<string>('');
  
  // UTM builder states
  const [showUtm, setShowUtm] = useState(false);
  const [utmSource, setUtmSource] = useState('');
  const [utmMedium, setUtmMedium] = useState('');
  const [utmCampaign, setUtmCampaign] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setOriginalUrl(text);
      }
    } catch {
      // Clipboard permission denied
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let cleanUrl = originalUrl.trim();
    if (!cleanUrl) {
      setError('Please enter a destination URL.');
      return;
    }

    // Auto-prepend https:// if omitted
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = `https://${cleanUrl}`;
    }

    // Append UTM tags if filled
    if (showUtm && (utmSource || utmMedium || utmCampaign)) {
      try {
        const urlObj = new URL(cleanUrl);
        if (utmSource) urlObj.searchParams.set('utm_source', utmSource.trim());
        if (utmMedium) urlObj.searchParams.set('utm_medium', utmMedium.trim());
        if (utmCampaign) urlObj.searchParams.set('utm_campaign', utmCampaign.trim());
        cleanUrl = urlObj.toString();
      } catch {
        setError('Invalid URL format for appending UTM parameters.');
        return;
      }
    }

    const payload: CreateUrlPayload = {
      original_url: cleanUrl,
    };

    if (customAlias.trim()) {
      payload.custom_alias = customAlias.trim();
    }
    if (title.trim()) {
      payload.title = title.trim();
    }
    if (expiresAt) {
      payload.expires_at = new Date(expiresAt).toISOString();
    }
    if (maxClicks && parseInt(maxClicks, 10) > 0) {
      payload.max_clicks = parseInt(maxClicks, 10);
    }

    try {
      setLoading(true);
      const created = await urlApi.shortenUrl(payload);

      // Trigger confetti celebration
      try {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.7 },
        });
      } catch {
        // Confetti fallback
      }

      onUrlCreated(created);

      // Reset form
      setOriginalUrl('');
      setCustomAlias('');
      setTitle('');
      setExpiresAt('');
      setMaxClicks('');
      setShowUtm(false);
      setUtmSource('');
      setUtmMedium('');
      setUtmCampaign('');
      setShowAdvanced(false);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to shorten URL. Please check connection.';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl">
      {/* Background glow */}
      <div className="absolute top-0 right-1/4 -mt-12 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <form onSubmit={handleSubmit} className="relative z-10 space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Enter your destination URL
          </label>
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
            <div className="relative flex-1 w-full">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                <LinkIcon className="w-5 h-5" />
              </div>
              <input
                type="text"
                placeholder="https://example.com/very-long-url-with-query-parameters..."
                value={originalUrl}
                onChange={(e) => setOriginalUrl(e.target.value)}
                className="w-full pl-12 pr-12 py-3.5 bg-slate-950/80 border border-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-2xl text-white placeholder-slate-500 text-sm font-medium transition outline-none"
              />
              <button
                type="button"
                onClick={handlePaste}
                title="Paste from clipboard"
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-blue-400 transition"
              >
                <ClipboardPaste className="w-4 h-4" />
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-2xl flex items-center justify-center space-x-2 transition shadow-lg shadow-blue-600/30 disabled:opacity-60 disabled:cursor-not-allowed text-sm whitespace-nowrap"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Shortening...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Shorten URL</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Toggle Advanced Options */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
            <span>{showAdvanced ? 'Hide customization options' : 'Customize link (Alias, Expiry, UTM)'}</span>
          </button>
        </div>

        {/* Advanced Drawer */}
        {showAdvanced && (
          <div className="pt-3 border-t border-slate-800/80 space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Custom Alias */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Custom Alias (Optional)
                </label>
                <div className="flex rounded-xl overflow-hidden border border-slate-800 bg-slate-950/70 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/20">
                  <span className="px-3 py-2 bg-slate-900 text-slate-500 text-xs flex items-center border-r border-slate-800">
                    /
                  </span>
                  <input
                    type="text"
                    placeholder="my-custom-link"
                    value={customAlias}
                    onChange={(e) => setCustomAlias(e.target.value)}
                    className="w-full px-3 py-2 bg-transparent text-white placeholder-slate-600 text-xs outline-none"
                  />
                </div>
              </div>

              {/* Title / Description */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Custom Title (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. My Portfolio Project"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950/70 text-white placeholder-slate-600 text-xs outline-none focus:border-blue-500"
                />
              </div>

              {/* Expiration Date */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Expiration Date (Optional)</span>
                </label>
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950/70 text-white text-xs outline-none focus:border-blue-500"
                />
              </div>

              {/* Max Clicks Limit */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center space-x-1">
                  <MousePointerClick className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Click Limit Expiry (Optional)</span>
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 50 (Expire after 50 clicks)"
                  value={maxClicks}
                  onChange={(e) => setMaxClicks(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950/70 text-white placeholder-slate-600 text-xs outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* UTM Tag Builder Helper */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowUtm(!showUtm)}
                className="flex items-center space-x-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium"
              >
                <Tag className="w-3 h-3" />
                <span>{showUtm ? 'Remove UTM Campaign Tags' : 'Add Campaign UTM Tags (Source, Medium)'}</span>
              </button>

              {showUtm && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2 p-3 rounded-xl bg-slate-950/50 border border-slate-800/80">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">utm_source</label>
                    <input
                      type="text"
                      placeholder="e.g. twitter, newsletter"
                      value={utmSource}
                      onChange={(e) => setUtmSource(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">utm_medium</label>
                    <input
                      type="text"
                      placeholder="e.g. social, banner"
                      value={utmMedium}
                      onChange={(e) => setUtmMedium(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">utm_campaign</label>
                    <input
                      type="text"
                      placeholder="e.g. launch2026"
                      value={utmCampaign}
                      onChange={(e) => setUtmCampaign(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

