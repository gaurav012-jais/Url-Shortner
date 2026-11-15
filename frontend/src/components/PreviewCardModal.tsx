import React from 'react';
import { X, ExternalLink, ShieldCheck, MousePointerClick } from 'lucide-react';
import { UrlItem } from '../types';

interface PreviewCardModalProps {
  url: UrlItem | null;
  onClose: () => void;
}

export const PreviewCardModal: React.FC<PreviewCardModalProps> = ({ url, onClose }) => {
  if (!url) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-blue-400 mb-2">
          <ShieldCheck className="w-4 h-4" />
          <span>Link Verification & Preview</span>
        </div>

        <h3 className="text-xl font-bold text-white mb-1">
          {url.title || 'Target Destination'}
        </h3>
        <p className="text-xs text-slate-400 mb-6">
          This preview screen lets you verify the actual destination before navigating.
        </p>

        {/* Destination Details Box */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4 mb-6">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Short Code & URL
            </span>
            <div className="text-sm font-mono text-blue-400 font-bold mt-0.5">
              {url.short_url}
            </div>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Full Destination URL
            </span>
            <div className="text-xs text-slate-200 break-all bg-slate-900/90 p-3 rounded-xl border border-slate-800/80 mt-1 font-mono">
              {url.original_url}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
            <div>
              <span className="text-[11px] text-slate-500 block">Total Clicks</span>
              <span className="text-sm font-bold text-white flex items-center space-x-1 mt-0.5">
                <MousePointerClick className="w-3.5 h-3.5 text-blue-400" />
                <span>{url.clicks_count}</span>
              </span>
            </div>

            <div>
              <span className="text-[11px] text-slate-500 block">Status</span>
              <span className="text-xs font-semibold mt-1 inline-block">
                {url.is_expired ? (
                  <span className="text-amber-400">Expired</span>
                ) : !url.is_active ? (
                  <span className="text-rose-400">Disabled</span>
                ) : (
                  <span className="text-emerald-400">Active & Ready</span>
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition"
          >
            Close Preview
          </button>

          <a
            href={url.short_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center space-x-2 transition shadow-lg shadow-blue-600/30"
          >
            <span>Proceed to Link</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
