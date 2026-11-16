import { lookup } from 'dns/promises';

/**
 * Checks if an IP address belongs to private, loopback, link-local, carrier-grade NAT,
 * multicast, or reserved internal ranges.
 */
function isPrivateIp(ip: string): boolean {
  let cleanIp = ip.toLowerCase();
  // Strip IPv4-mapped IPv6 prefix (e.g. ::ffff:127.0.0.1)
  if (cleanIp.startsWith('::ffff:')) {
    cleanIp = cleanIp.substring(7);
  }

  // IPv4 Checks
  const ipv4Match = cleanIp.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [, a, b] = ipv4Match.map(Number);
    if (a === 0) return true; // Current network
    if (a === 10) return true; // Private 10.0.0.0/8
    if (a === 127) return true; // Loopback 127.0.0.0/8
    if (a === 169 && b === 254) return true; // Link-local / Cloud metadata (169.254.0.0/16)
    if (a === 172 && b >= 16 && b <= 31) return true; // Private 172.16.0.0/12
    if (a === 192 && b === 168) return true; // Private 192.168.0.0/16
    if (a === 100 && b >= 64 && b <= 127) return true; // Carrier-grade NAT 100.64.0.0/10
    if (a >= 224) return true; // Multicast & Reserved (224.0.0.0/4, 240.0.0.0/4)
    return false;
  }

  // IPv6 Checks
  if (cleanIp === '::1' || cleanIp === '::') return true;
  if (cleanIp.startsWith('fc') || cleanIp.startsWith('fd')) return true; // Unique Local Address fc00::/7
  if (
    cleanIp.startsWith('fe8') ||
    cleanIp.startsWith('fe9') ||
    cleanIp.startsWith('fea') ||
    cleanIp.startsWith('feb')
  ) {
    return true; // Link-local fe80::/10
  }

  return false;
}

/**
 * Deep SSRF verification: Resolves DNS and inspects every resolved IP against private networks.
 * Also catches alternative encodings, decimal IPs, and local domain suffixes.
 */
async function isSafeUrl(urlStr: string): Promise<boolean> {
  try {
    const parsed = new URL(urlStr);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;

    const hostname = parsed.hostname.toLowerCase();

    // Block obvious local names and cloud metadata domains
    const blockedHostnames = [
      'localhost',
      'metadata',
      'metadata.google.internal',
      'instance-data',
    ];
    if (
      blockedHostnames.includes(hostname) ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.onion')
    ) {
      return false;
    }

    // Direct IP format check in hostname
    if (isPrivateIp(hostname)) {
      return false;
    }

    // Resolve DNS: verify that EVERY IP the domain maps to is public
    const addresses = await lookup(hostname, { all: true });
    if (!addresses || addresses.length === 0) return false;

    for (const record of addresses) {
      if (isPrivateIp(record.address)) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Streams up to maxBytes (default 256KB) from the response body to prevent OOM memory exhaustion.
 */
async function readLimitedText(response: Response, maxBytes = 256 * 1024): Promise<string> {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let result = '';
  let bytesRead = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        bytesRead += value.byteLength;
        result += decoder.decode(value, { stream: true });
        if (bytesRead >= maxBytes) {
          await reader.cancel();
          break;
        }
      }
    }
  } catch {
    // Return what has been decoded so far
  }
  return result;
}

export async function fetchUrlMetadata(
  targetUrl: string,
): Promise<{ title: string | null; favicon: string | null }> {
  let currentUrl = targetUrl;
  let hops = 0;
  const maxHops = 3;

  try {
    while (hops <= maxHops) {
      // SSRF guard: resolve DNS and check IP for every hop
      const safe = await isSafeUrl(currentUrl);
      if (!safe) {
        return { title: null, favicon: null };
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);

      const response = await fetch(currentUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml',
        },
        redirect: 'manual', // Never follow redirects blindly without SSRF validation
      });

      clearTimeout(timeout);

      // Handle HTTP redirects securely
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        if (!location) break;
        currentUrl = new URL(location, currentUrl).toString();
        hops++;
        continue;
      }

      if (!response.ok) {
        return { title: null, favicon: null };
      }

      // Stream text with a 256KB cap to prevent Out-Of-Memory (OOM) attacks
      const html = await readLimitedText(response, 256 * 1024);

      // Extract title
      let title: string | null = null;
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch && titleMatch[1]) {
        title = titleMatch[1].trim().substring(0, 255);
      }

      // Extract favicon
      let favicon: string | null = null;
      const faviconMatch =
        html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i) ||
        html.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:shortcut )?icon["']/i);

      if (faviconMatch && faviconMatch[1]) {
        const iconPath = faviconMatch[1].trim();
        try {
          favicon = new URL(iconPath, currentUrl).toString();
        } catch {
          favicon = null;
        }
      } else {
        try {
          const parsed = new URL(currentUrl);
          favicon = `${parsed.origin}/favicon.ico`;
        } catch {
          favicon = null;
        }
      }

      return { title, favicon };
    }

    return { title: null, favicon: null };
  } catch {
    // If metadata fetch times out or fails, fail gracefully without blocking shortener
    try {
      const parsed = new URL(targetUrl);
      return {
        title: parsed.hostname,
        favicon: `${parsed.origin}/favicon.ico`,
      };
    } catch {
      return { title: null, favicon: null };
    }
  }
}
