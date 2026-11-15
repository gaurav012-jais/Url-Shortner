import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { UrlItem } from '../types';
import {
  QrTheme,
  downloadQrStandeePng,
  downloadCleanQrPng,
} from '../utils/qr-poster-generator.util';

interface QrCodeModalProps {
  url: UrlItem | null;
  onClose: () => void;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({ url, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'standee' | 'clean'>('standee');
  const [theme, setTheme] = useState<QrTheme>('purple');
  const [downloading, setDownloading] = useState(false);

  if (!url) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(url.short_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadStandee = async () => {
    const svg = document.getElementById('modal-qr-svg') as unknown as SVGElement;
    if (!svg) return;
    try {
      setDownloading(true);
      await downloadQrStandeePng(
        svg,
        {
          shortUrl: url.short_url,
          shortCode: url.short_code,
          title: url.title || undefined,
          theme,
        },
        `zelnk-standee-${url.short_code}.png`,
      );
    } catch (err) {
      console.error('Failed to export standee poster:', err);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadClean = async () => {
    const svg = document.getElementById('modal-qr-svg') as unknown as SVGElement;
    if (!svg) return;
    try {
      setDownloading(true);
      await downloadCleanQrPng(svg, url.short_code, true);
    } catch (err) {
      console.error('Failed to export clean QR:', err);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadSvg = () => {
    const svg = document.getElementById('modal-qr-svg') as unknown as SVGElement;
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.download = `qr-${url.short_code}.svg`;
    downloadLink.href = blobUrl;
    downloadLink.click();
    URL.revokeObjectURL(blobUrl);
  };

  const themeStyles = {
    purple: {
      headerGrad: 'from-indigo-600 to-violet-600',
      accentColor: 'text-indigo-600',
      pillBg: 'bg-indigo-50 border-indigo-200 text-indigo-700',
      borderAccent: 'border-indigo-600',
      badge: 'bg-white/20 text-white',
    },
    dark: {
      headerGrad: 'from-slate-900 to-slate-800',
      accentColor: 'text-sky-400',
      pillBg: 'bg-slate-800 border-slate-700 text-sky-400',
      borderAccent: 'border-sky-400',
      badge: 'bg-sky-500/20 text-sky-300',
    },
    ocean: {
      headerGrad: 'from-sky-600 to-cyan-600',
      accentColor: 'text-sky-600',
      pillBg: 'bg-sky-50 border-sky-200 text-sky-800',
      borderAccent: 'border-sky-600',
      badge: 'bg-white/25 text-white',
    },
    minimal: {
      headerGrad: 'from-zinc-900 to-zinc-800',
      accentColor: 'text-zinc-900',
      pillBg: 'bg-zinc-100 border-zinc-200 text-zinc-800',
      borderAccent: 'border-zinc-900',
      badge: 'bg-white/20 text-white',
    },
  };

  const currentTheme = themeStyles[theme];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl relative my-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition"
          aria-label="Close modal"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-2 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-[22px]">qr_code_2</span>
          </div>
          <div>
            <h3 className="font-bold text-base text-on-surface">Branded QR Standee</h3>
            <p className="text-xs text-on-surface-variant font-code truncate max-w-[240px]">
              /{url.short_code} {url.title ? `• ${url.title}` : ''}
            </p>
          </div>
        </div>

        {/* Tabs: Standee Poster vs Clean QR */}
        <div className="grid grid-cols-2 p-1 bg-surface-container-low rounded-xl mb-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('standee')}
            className={`py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition ${
              activeTab === 'standee'
                ? 'bg-surface-container-lowest text-primary shadow-sm font-bold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">style</span>
            <span>Standee Poster</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('clean')}
            className={`py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition ${
              activeTab === 'clean'
                ? 'bg-surface-container-lowest text-primary shadow-sm font-bold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">crop_free</span>
            <span>Clean QR</span>
          </button>
        </div>

        {/* Theme Picker (for Standee) */}
        {activeTab === 'standee' && (
          <div className="flex items-center justify-between gap-1 mb-4 p-2 bg-surface-container-low/70 rounded-xl border border-outline-variant/20">
            <span className="text-[11px] font-semibold text-on-surface-variant px-1">Theme:</span>
            <div className="flex items-center gap-1.5">
              {(
                [
                  { id: 'purple', label: 'Royal', bg: 'bg-indigo-600' },
                  { id: 'dark', label: 'Dark', bg: 'bg-slate-900' },
                  { id: 'ocean', label: 'Ocean', bg: 'bg-sky-600' },
                  { id: 'minimal', label: 'Mono', bg: 'bg-zinc-800' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition border ${
                    theme === t.id
                      ? 'border-primary bg-surface-container-lowest text-primary shadow-xs'
                      : 'border-transparent text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${t.bg}`} />
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Visual Standee Card Preview */}
        {activeTab === 'standee' ? (
          <div className="rounded-2xl border border-outline-variant/30 shadow-md overflow-hidden bg-white mb-4">
            {/* Poster Header */}
            <div className={`bg-gradient-to-r ${currentTheme.headerGrad} p-3.5 text-center text-white relative`}>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${currentTheme.badge} mb-1 border border-white/20`}>
                ⚡ ZeLnk • Verified Link
              </span>
              <h4 className="text-sm font-black tracking-wider uppercase">Scan To Visit</h4>
              <p className="text-[10px] opacity-90">Open camera or QR scanner to proceed</p>
            </div>

            {/* Poster Body */}
            <div className="p-4 flex flex-col items-center gap-2.5 text-center bg-slate-50/50">
              {url.title && (
                <div className="font-bold text-xs text-slate-800 truncate max-w-[280px]">
                  {url.title}
                </div>
              )}

              {/* QR Box with iconic Scanner Corner Brackets [ ] */}
              <div className="relative p-3 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-center">
                {/* 4 Corner Camera Brackets */}
                <span className={`absolute top-1 left-1 w-3.5 h-3.5 border-t-2 border-l-2 ${currentTheme.borderAccent} rounded-tl-sm`} />
                <span className={`absolute top-1 right-1 w-3.5 h-3.5 border-t-2 border-r-2 ${currentTheme.borderAccent} rounded-tr-sm`} />
                <span className={`absolute bottom-1 left-1 w-3.5 h-3.5 border-b-2 border-l-2 ${currentTheme.borderAccent} rounded-bl-sm`} />
                <span className={`absolute bottom-1 right-1 w-3.5 h-3.5 border-b-2 border-r-2 ${currentTheme.borderAccent} rounded-br-sm`} />

                <div className="relative flex items-center justify-center">
                  <QRCodeSVG
                    id="modal-qr-svg"
                    value={url.short_url}
                    size={150}
                    level="H"
                    includeMargin={false}
                  />
                  {/* Center Brand Badge */}
                  <div className="absolute inset-0 m-auto w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center border border-slate-200">
                    <span className="text-[14px]">⚡</span>
                  </div>
                </div>
              </div>

              {/* URL Pill */}
              <div className={`w-full py-1.5 px-3 rounded-lg border font-code text-[11px] font-bold truncate ${currentTheme.pillBg}`}>
                🔗 {url.short_url.replace(/^https?:\/\//i, '')}
              </div>

              {/* Mini trust features */}
              <div className="text-[10px] text-slate-500 font-medium flex items-center gap-2">
                <span>⚡ Instant Redirect</span>
                <span>•</span>
                <span>🔒 SSL Protected</span>
              </div>
            </div>
          </div>
        ) : (
          /* Clean Minimal QR Preview */
          <div className="bg-white p-6 rounded-2xl flex flex-col items-center justify-center border border-outline-variant/30 shadow-inner mb-4">
            <div className="relative flex items-center justify-center">
              <QRCodeSVG
                id="modal-qr-svg"
                value={url.short_url}
                size={180}
                level="H"
                includeMargin={false}
              />
              <div className="absolute inset-0 m-auto w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center border border-slate-200">
                <span className="text-[18px]">⚡</span>
              </div>
            </div>
            <span className="mt-3 font-code text-xs font-bold text-primary">/{url.short_code}</span>
          </div>
        )}

        {/* Short Link Copy Bar */}
        <div className="flex items-center justify-between bg-surface-container-low border border-outline-variant/30 rounded-xl p-2.5 mb-4 text-xs">
          <span className="truncate font-code text-primary font-bold">{url.short_url}</span>
          <button
            onClick={handleCopy}
            className="p-1 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-primary transition flex items-center gap-1 font-medium"
            title="Copy URL"
          >
            <span className="material-symbols-outlined text-[16px]">
              {copied ? 'check' : 'content_copy'}
            </span>
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          {activeTab === 'standee' ? (
            <button
              onClick={handleDownloadStandee}
              disabled={downloading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-md hover:shadow-lg disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">
                {downloading ? 'hourglass_top' : 'download'}
              </span>
              <span>{downloading ? 'Generating Poster...' : 'Download Standee Poster (PNG 1080x1440)'}</span>
            </button>
          ) : (
            <button
              onClick={handleDownloadClean}
              disabled={downloading}
              className="w-full py-2.5 px-3 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              <span>{downloading ? 'Processing...' : 'Download Clean QR (PNG 1024x1024)'}</span>
            </button>
          )}

          <div className="grid grid-cols-2 gap-2">
            {activeTab === 'standee' ? (
              <button
                onClick={handleDownloadClean}
                className="py-2 px-3 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-xs flex items-center justify-center gap-1.5 transition border border-outline-variant/30"
              >
                <span className="material-symbols-outlined text-[15px]">crop_free</span>
                <span>Plain QR</span>
              </button>
            ) : (
              <button
                onClick={handleDownloadStandee}
                className="py-2 px-3 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-xs flex items-center justify-center gap-1.5 transition border border-outline-variant/30"
              >
                <span className="material-symbols-outlined text-[15px]">style</span>
                <span>Standee Card</span>
              </button>
            )}

            <button
              onClick={handleDownloadSvg}
              className="py-2 px-3 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-xs flex items-center justify-center gap-1.5 transition border border-outline-variant/30"
            >
              <span className="material-symbols-outlined text-[15px]">code</span>
              <span>Vector SVG</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
