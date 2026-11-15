/**
 * ZeLnk Industrial QR Code Standee & Branded Poster Generator
 * Renders high-resolution (1080x1440) payment-standee style QR posters
 * onto an off-screen HTML5 Canvas for instant download and sharing.
 */

export type QrTheme = 'purple' | 'dark' | 'ocean' | 'minimal';

export interface QrPosterOptions {
  shortUrl: string;
  shortCode: string;
  title?: string;
  theme?: QrTheme;
  destinationUrl?: string;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}

/**
 * Generates an SVG Data URL string containing the QR code for a given URL.
 */
export async function getQrSvgDataUrl(svgElement: SVGElement): Promise<string> {
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgElement);
  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
}

/**
 * Loads an image from a Data URL asynchronously.
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

/**
 * Main Standee / Payment Poster Generator Function.
 * Produces a high-resolution 1080x1440 canvas ready to be exported to PNG.
 */
export async function generateQrPosterCanvas(
  svgElement: SVGElement,
  options: QrPosterOptions,
): Promise<HTMLCanvasElement> {
  const width = 1080;
  const height = 1440;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas 2D context');

  // Load the QR image
  const svgDataUrl = await getQrSvgDataUrl(svgElement);
  const qrImg = await loadImage(svgDataUrl);

  const theme = options.theme || 'purple';

  // Theme palettes
  const palettes = {
    purple: {
      bg: '#F8FAFC',
      headerGradStart: '#4338CA',
      headerGradEnd: '#6366F1',
      accent: '#4F46E5',
      accentLight: '#EEF2FF',
      accentBorder: '#C7D2FE',
      accentText: '#3730A3',
      cornerColor: '#4F46E5',
      badgeBg: 'rgba(255, 255, 255, 0.18)',
      badgeBorder: 'rgba(255, 255, 255, 0.35)',
    },
    dark: {
      bg: '#0F172A',
      headerGradStart: '#0F172A',
      headerGradEnd: '#1E293B',
      accent: '#38BDF8',
      accentLight: '#1E293B',
      accentBorder: '#334155',
      accentText: '#38BDF8',
      cornerColor: '#38BDF8',
      badgeBg: 'rgba(56, 189, 248, 0.15)',
      badgeBorder: 'rgba(56, 189, 248, 0.35)',
    },
    ocean: {
      bg: '#F0F9FF',
      headerGradStart: '#0284C7',
      headerGradEnd: '#06B6D4',
      accent: '#0284C7',
      accentLight: '#E0F2FE',
      accentBorder: '#BAE6FD',
      accentText: '#0369A1',
      cornerColor: '#0284C7',
      badgeBg: 'rgba(255, 255, 255, 0.2)',
      badgeBorder: 'rgba(255, 255, 255, 0.4)',
    },
    minimal: {
      bg: '#FAFAFA',
      headerGradStart: '#18181B',
      headerGradEnd: '#27272A',
      accent: '#18181B',
      accentLight: '#F4F4F5',
      accentBorder: '#E4E4E7',
      accentText: '#18181B',
      cornerColor: '#18181B',
      badgeBg: 'rgba(255, 255, 255, 0.15)',
      badgeBorder: 'rgba(255, 255, 255, 0.3)',
    },
  };

  const p = palettes[theme];

  // 1. Overall Background
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, width, height);

  // 2. Top Header with Gradient
  const headerHeight = 310;
  const headerGrad = ctx.createLinearGradient(0, 0, width, headerHeight);
  headerGrad.addColorStop(0, p.headerGradStart);
  headerGrad.addColorStop(1, p.headerGradEnd);
  ctx.fillStyle = headerGrad;
  ctx.fillRect(0, 0, width, headerHeight);

  // Decorative subtle circles in header background
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.beginPath();
  ctx.arc(width - 80, 50, 180, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(60, 20, 120, 0, Math.PI * 2);
  ctx.fill();

  // Header Brand Pill: "⚡ ZeLnk • VERIFIED SHORT LINK"
  ctx.save();
  const pillW = 420;
  const pillH = 46;
  const pillX = (width - pillW) / 2;
  const pillY = 45;
  drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 23);
  ctx.fillStyle = p.badgeBg;
  ctx.fill();
  ctx.strokeStyle = p.badgeBorder;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⚡ ZeLnk  •  VERIFIED SHORT LINK', width / 2, pillY + pillH / 2);
  ctx.restore();

  // Header Headline: "SCAN TO VISIT"
  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.font = '900 46px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.letterSpacing = '1px';
  ctx.fillText('SCAN TO VISIT LINK', width / 2, 145);

  // Subtitle
  ctx.font = '500 21px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
  ctx.fillText('Point your phone camera or any QR scanner app', width / 2, 190);
  ctx.restore();

  // 3. Central White Standee Card
  const cardX = 75;
  const cardY = 240;
  const cardW = width - cardX * 2; // 930px
  const cardH = 1060;
  const cardRadius = 36;

  ctx.save();
  // Soft drop shadow
  ctx.shadowColor = 'rgba(15, 23, 42, 0.16)';
  ctx.shadowBlur = 45;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 18;

  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, cardRadius);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  // Border
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // 4. Link Title / Heading inside Card
  ctx.save();
  ctx.textAlign = 'center';

  if (options.title && options.title.trim()) {
    ctx.font = 'bold 30px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#0F172A';
    const displayTitle =
      options.title.length > 36 ? options.title.substring(0, 36) + '...' : options.title;
    ctx.fillText(displayTitle, width / 2, cardY + 75);

    ctx.font = 'bold 22px "SF Mono", Consolas, Menlo, monospace';
    ctx.fillStyle = p.accent;
    ctx.fillText(`/${options.shortCode}`, width / 2, cardY + 115);
  } else {
    ctx.font = 'bold 36px "SF Mono", Consolas, Menlo, monospace';
    ctx.fillStyle = p.accent;
    ctx.fillText(`/${options.shortCode}`, width / 2, cardY + 85);
  }
  ctx.restore();

  // 5. Scanner Frame with iconic Corner Accents
  const frameW = 600;
  const frameH = 600;
  const frameX = (width - frameW) / 2;
  const frameY = cardY + 145;
  const frameRadius = 24;

  // Frame Background
  ctx.save();
  drawRoundedRect(ctx, frameX, frameY, frameW, frameH, frameRadius);
  ctx.fillStyle = '#FAFCFF';
  ctx.fill();
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Corner Camera Brackets [  ]
  const cornerLen = 45;
  const cornerPad = 14;
  const cX1 = frameX + cornerPad;
  const cY1 = frameY + cornerPad;
  const cX2 = frameX + frameW - cornerPad;
  const cY2 = frameY + frameH - cornerPad;

  ctx.strokeStyle = p.cornerColor;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Top-Left
  ctx.beginPath();
  ctx.moveTo(cX1, cY1 + cornerLen);
  ctx.lineTo(cX1, cY1);
  ctx.lineTo(cX1 + cornerLen, cY1);
  ctx.stroke();

  // Top-Right
  ctx.beginPath();
  ctx.moveTo(cX2 - cornerLen, cY1);
  ctx.lineTo(cX2, cY1);
  ctx.lineTo(cX2, cY1 + cornerLen);
  ctx.stroke();

  // Bottom-Left
  ctx.beginPath();
  ctx.moveTo(cX1, cY2 - cornerLen);
  ctx.lineTo(cX1, cY2);
  ctx.lineTo(cX1 + cornerLen, cY2);
  ctx.stroke();

  // Bottom-Right
  ctx.beginPath();
  ctx.moveTo(cX2 - cornerLen, cY2);
  ctx.lineTo(cX2, cY2);
  ctx.lineTo(cX2, cY2 - cornerLen);
  ctx.stroke();
  ctx.restore();

  // 6. Draw QR Code into Frame
  const qrPadding = 42;
  const qrSize = frameW - qrPadding * 2; // 516px
  const qrX = frameX + qrPadding;
  const qrY = frameY + qrPadding;
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

  // 7. Iconic Payment-Style Center Logo Mark in QR code
  const centerX = width / 2;
  const centerY = frameY + frameH / 2;
  const shieldR = 48;

  ctx.save();
  // White outer circular shield
  ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.arc(centerX, centerY, shieldR, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  // Inner gradient circle
  ctx.shadowColor = 'transparent';
  const innerR = 40;
  const centerGrad = ctx.createLinearGradient(
    centerX - innerR,
    centerY - innerR,
    centerX + innerR,
    centerY + innerR,
  );
  centerGrad.addColorStop(0, p.headerGradStart);
  centerGrad.addColorStop(1, p.headerGradEnd);
  ctx.beginPath();
  ctx.arc(centerX, centerY, innerR, 0, Math.PI * 2);
  ctx.fillStyle = centerGrad;
  ctx.fill();

  // White Lightning Symbol
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 36px -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⚡', centerX, centerY + 1);
  ctx.restore();

  // 8. Short Link URL Pill Container
  const urlBoxW = 760;
  const urlBoxH = 68;
  const urlBoxX = (width - urlBoxW) / 2;
  const urlBoxY = frameY + frameH + 35;

  ctx.save();
  drawRoundedRect(ctx, urlBoxX, urlBoxY, urlBoxW, urlBoxH, 18);
  ctx.fillStyle = p.accentLight;
  ctx.fill();
  ctx.strokeStyle = p.accentBorder;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Display clean URL
  ctx.fillStyle = p.accentText;
  ctx.font = 'bold 24px "SF Mono", Consolas, Menlo, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const cleanDisplayUrl = options.shortUrl.replace(/^https?:\/\//i, '');
  ctx.fillText(`🔗  ${cleanDisplayUrl}`, width / 2, urlBoxY + urlBoxH / 2);
  ctx.restore();

  // 9. Three Trust Badges below URL
  const badgeY = urlBoxY + urlBoxH + 42;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = '600 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#475569';
  ctx.fillText('⚡ Instant 302 Redirection   •   🔒 100% Encrypted   •   📱 Camera Compatible', width / 2, badgeY);
  ctx.restore();

  // 10. Horizontal divider line inside card
  const divY = badgeY + 40;
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cardX + 40, divY);
  ctx.lineTo(cardX + cardW - 40, divY);
  ctx.stroke();

  // 11. Card Footer: "Powered by ZeLnk"
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#64748B';
  ctx.fillText('Powered by ZeLnk — Next-Gen Link Platform', width / 2, divY + 44);
  ctx.restore();

  // 12. Bottom Canvas Disclaimer / Watermark
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = '500 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#94A3B8';
  ctx.fillText('Generated on ZeLnk  •  Scan with Google Lens, iPhone Camera, or Any QR Scanner', width / 2, 1375);
  ctx.restore();

  return canvas;
}

/**
 * Downloads the high-resolution branded standee poster as PNG.
 */
export async function downloadQrStandeePng(
  svgElement: SVGElement,
  options: QrPosterOptions,
  filename?: string,
): Promise<void> {
  const canvas = await generateQrPosterCanvas(svgElement, options);
  const dataUrl = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.download = filename || `zelnk-standee-${options.shortCode}.png`;
  a.href = dataUrl;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Downloads a clean transparent / white high-resolution raw QR (1024x1024)
 * with the center brand logo for design uses.
 */
export async function downloadCleanQrPng(
  svgElement: SVGElement,
  shortCode: string,
  includeLogo = true,
): Promise<void> {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const svgDataUrl = await getQrSvgDataUrl(svgElement);
  const qrImg = await loadImage(svgDataUrl);

  // White background with generous margin
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);

  // Draw QR
  const margin = 80;
  const qrSize = size - margin * 2;
  ctx.drawImage(qrImg, margin, margin, qrSize, qrSize);

  // Optional Center Logo
  if (includeLogo) {
    const cx = size / 2;
    const cy = size / 2;
    const r = 70;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    ctx.shadowColor = 'transparent';
    const innerR = 58;
    const grad = ctx.createLinearGradient(cx - innerR, cy - innerR, cx + innerR, cy + innerR);
    grad.addColorStop(0, '#4338CA');
    grad.addColorStop(1, '#6366F1');
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 54px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚡', cx, cy + 2);
    ctx.restore();
  }

  const dataUrl = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.download = `qrcode-${shortCode}.png`;
  a.href = dataUrl;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

