import React, { useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  QrCode,
  Globe,
  Eye,
  Calendar,
  MousePointerClick,
} from 'lucide-react';
import { UrlItem } from '../types';

interface UrlResultCardProps {
  url: UrlItem;
  onOpenQr: (url: UrlItem) => void;
  onOpenPreview: (url: UrlItem) => void;
}

export const UrlResultCard: React.FC<UrlResultCardProps> = ({
  url,
  onOpenQr,
  onOpenPreview,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(url.short_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="bg-gradient-to-b from-blue-950/40 via-slate-900/90 to-slate-900 border border-blue-500/30 rounded-3xl p-6 shadow-2xl animate-fade-in relative overflow-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-700 flex-shrink-0">
            {url.favicon ? (
              <img
                src={url.favicon}
                alt=""
                className="w-5 h-5 object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <Globe className="w-5 h-5 text-slate-400" />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-white text-base truncate">
              {url.title || 'Shortened URL'}
            </h3>
            <p className="text-xs text-slate-400 truncate max-w-md" title={url.original_url}>
              {url.original_url}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-end sm:self-auto">
          <button
            onClick={() => onOpenQr(url)}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center space-x-1.5 text-xs font-medium border border-slate-700/60"
            title="View QR Code"
          >
            <QrCode className="w-4 h-4 text-blue-400" />
            <span className="hidden sm:inline">QR Code</span>
          </button>

          <button
            onClick={() => onOpenPreview(url)}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center space-x-1.5 text-xs font-medium border border-slate-700/60"
            title="Inspect preview details"
          >
            <Eye className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">Preview</span>
          </button>
        </div>
      </div>

      {/* Main Short URL Link Bar */}
      <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
        <div className="flex items-center space-x-2 px-2 overflow-x-auto">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Short Link:
          </span>
          <a
            href={url.short_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-base font-mono font-bold text-blue-400 hover:text-blue-300 underline decoration-blue-500/40 hover:decoration-blue-400 transition"
          >
            {url.short_url}
          </a>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopy}
            className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center space-x-2 transition ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Link</span>
              </>
            )}
          </button>

          <a
            href={url.short_url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            title="Test Redirect in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Metadata Badges */}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-400">
        {url.is_custom_alias && (
          <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
            Custom Alias
          </span>
        )}
        {url.expires_at && (
          <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Calendar className="w-3 h-3" />
            <span>Expires: {new Date(url.expires_at).toLocaleDateString()}</span>
          </span>
        )}
        {url.max_clicks && (
          <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <MousePointerClick className="w-3 h-3" />
            <span>Limit: {url.max_clicks} clicks</span>
          </span>
        )}
      </div>
    </div>
  );
};

