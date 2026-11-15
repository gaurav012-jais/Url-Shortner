import React, { useState } from 'react';
import {
  Copy,
  Check,
  ExternalLink,
  QrCode,
  Trash2,
  Power,
  Search,
  Globe,
  MousePointerClick,
  Eye,
} from 'lucide-react';
import { UrlItem } from '../types';

interface RecentUrlsListProps {
  urls: UrlItem[];
  loading: boolean;
  onToggleActive: (id: string) => void;
  onDeleteUrl: (id: string) => void;
  onOpenQr: (url: UrlItem) => void;
  onOpenPreview: (url: UrlItem) => void;
}

export const RecentUrlsList: React.FC<RecentUrlsListProps> = ({
  urls,
  loading,
  onToggleActive,
  onDeleteUrl,
  onOpenQr,
  onOpenPreview,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, shortUrl: string) => {
    navigator.clipboard.writeText(shortUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredUrls = urls.filter((u) => {
    const term = searchTerm.toLowerCase();
    return (
      u.short_code.toLowerCase().includes(term) ||
      u.original_url.toLowerCase().includes(term) ||
      (u.title && u.title.toLowerCase().includes(term))
    );
  });

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Recent Shortened URLs</h2>
          <p className="text-xs text-slate-400">Manage, inspect and test your generated links</p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search links..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500 transition"
          />
        </div>
      </div>

      {loading && urls.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-3 text-slate-500 text-sm">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading URLs...</span>
        </div>
      ) : filteredUrls.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-slate-800 rounded-2xl">
          <Globe className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-300">No shortened URLs found</p>
          <p className="text-xs text-slate-500 mt-1">
            {searchTerm ? 'Try a different search term.' : 'Shorten your first URL using the form above.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredUrls.map((item) => {
            const isInactive = !item.is_active || item.is_expired;

            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition ${
                  isInactive
                    ? 'bg-slate-950/40 border-slate-800/50 opacity-75'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  {/* Left: Info */}
                  <div className="flex items-start space-x-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-700/80 flex-shrink-0 mt-0.5">
                      {item.favicon ? (
                        <img
                          src={item.favicon}
                          alt=""
                          className="w-4 h-4 object-contain"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Globe className="w-4 h-4 text-slate-400" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="font-semibold text-white text-sm truncate max-w-sm">
                          {item.title || item.short_code}
                        </span>

                        {/* Status Badges */}
                        {!item.is_active && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium">
                            Disabled
                          </span>
                        )}
                        {item.is_expired && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                            Expired
                          </span>
                        )}
                        {item.is_active && !item.is_expired && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                            Active
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 mt-1">
                        <span
                          className="text-xs text-slate-400 truncate max-w-md select-all cursor-text"
                          title={item.original_url}
                        >
                          {item.original_url}
                        </span>
                      </div>

                      {/* Expiry info */}
                      <div className="flex items-center space-x-3 mt-1.5 text-[11px] text-slate-500">
                        <span>Created: {new Date(item.created_at).toLocaleDateString()}</span>
                        {item.expires_at && (
                          <span className="text-amber-400/80">
                            Expires: {new Date(item.expires_at).toLocaleDateString()}
                          </span>
                        )}
                        {item.max_clicks && (
                          <span>Max clicks: {item.max_clicks}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Middle: Short URL & Clicks */}
                  <div className="flex items-center space-x-4 self-stretch sm:self-auto justify-between lg:justify-end">
                    {/* Clicks Counter Badge */}
                    <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
                      <MousePointerClick className="w-3.5 h-3.5 text-blue-400" />
                      <span className="font-semibold text-white">{item.clicks_count}</span>
                      <span className="text-slate-500">clicks</span>
                    </div>

                    {/* Short Link Display */}
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs text-blue-400 font-semibold">
                        /{item.short_code}
                      </span>

                      <button
                        onClick={() => handleCopy(item.id, item.short_url)}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                        title="Copy short link"
                      >
                        {copiedId === item.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <a
                        href={item.short_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                        title="Open short link"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>

                    {/* Actions: QR, Preview, Toggle, Delete */}
                    <div className="flex items-center space-x-1 border-l border-slate-800 pl-3">
                      <button
                        onClick={() => onOpenQr(item)}
                        className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-blue-400 transition"
                        title="QR Code"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => onOpenPreview(item)}
                        className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-indigo-400 transition"
                        title="Preview details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => onToggleActive(item.id)}
                        className={`p-2 rounded-lg hover:bg-slate-800 transition ${
                          item.is_active ? 'text-emerald-400' : 'text-slate-500'
                        }`}
                        title={item.is_active ? 'Disable Link' : 'Enable Link'}
                      >
                        <Power className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => onDeleteUrl(item.id)}
                        className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition"
                        title="Delete Link"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
