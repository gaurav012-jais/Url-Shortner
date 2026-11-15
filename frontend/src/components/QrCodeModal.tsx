import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { UrlItem } from '../types';

interface QrCodeModalProps {
  url: UrlItem | null;
  onClose: () => void;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({ url, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!url) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(url.short_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPng = () => {
    const svg = document.getElementById('modal-qr-svg') as unknown as SVGElement;
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = 1024;
      canvas.height = 1024;
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `qr-${url.short_code}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      }
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition"
          aria-label="Close modal"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        <div className="flex items-center gap-2.5 mb-5">
          <div className="p-2 rounded-lg bg-primary-fixed text-primary">
            <span className="material-symbols-outlined text-[20px]">qr_code_2</span>
          </div>
          <div>
            <h3 className="font-semibold text-sm text-on-surface">Dynamic QR Code</h3>
            <p className="text-xs text-on-surface-variant">/{url.short_code}</p>
          </div>
        </div>

        {/* Crisp Vector QR Display */}
        <div className="bg-white p-5 rounded-xl flex items-center justify-center border border-outline-variant/30 shadow-inner mb-5">
          <QRCodeSVG
            id="modal-qr-svg"
            value={url.short_url}
            size={180}
            level="H"
            includeMargin={true}
          />
        </div>

        {/* Short link copy bar */}
        <div className="flex items-center justify-between bg-surface-container-low border border-outline-variant/30 rounded-lg p-2.5 mb-5 text-xs">
          <span className="truncate font-code text-primary font-bold">{url.short_url}</span>
          <button
            onClick={handleCopy}
            className="p-1 rounded hover:bg-surface-container text-on-surface-variant hover:text-primary transition"
            title="Copy URL"
          >
            <span className="material-symbols-outlined text-[16px]">
              {copied ? 'check' : 'content_copy'}
            </span>
          </button>
        </div>

        {/* Dual Download Actions: PNG & SVG */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleDownloadPng}
            className="py-2.5 px-3 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-semibold text-xs flex items-center justify-center gap-1.5 transition shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            <span>Download PNG</span>
          </button>
          <button
            onClick={handleDownloadSvg}
            className="py-2.5 px-3 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-xs flex items-center justify-center gap-1.5 transition border border-outline-variant/30"
          >
            <span className="material-symbols-outlined text-[16px]">code</span>
            <span>Download SVG</span>
          </button>
        </div>
      </div>
    </div>
  );
};
