// VULN-03 FIX: SSRF protection — block private/internal IP ranges
function isPrivateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    // Block non-HTTP(S) schemes
    if (!['http:', 'https:'].includes(parsed.protocol)) return true;

    // Block loopback and well-known internal hostnames
    const blockedHostnames = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '::1',
      '169.254.169.254',  // AWS/GCP/Azure metadata endpoint
      'metadata.google.internal',
      'metadata',
    ];
    if (blockedHostnames.includes(hostname)) return true;

    // Block private IPv4 ranges: 10.x, 172.16-31.x, 192.168.x, 100.64.x (Carrier NAT)
    const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipv4Pattern);
    if (match) {
      const [, a, b] = match.map(Number);
      if (a === 10) return true;
      if (a === 172 && b >= 16 && b <= 31) return true;
      if (a === 192 && b === 168) return true;
      if (a === 100 && b >= 64 && b <= 127) return true;
      if (a === 127) return true;
      if (a === 0) return true;
    }

    return false;
  } catch {
    return true; // Malformed URL — block it
  }
}

export async function fetchUrlMetadata(targetUrl: string): Promise<{ title: string | null; favicon: string | null }> {
  // SSRF guard: reject private/internal addresses before making any network call
  if (isPrivateUrl(targetUrl)) {
    return { title: null, favicon: null };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return { title: null, favicon: null };
    }

    const html = await response.text();

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
        favicon = new URL(iconPath, targetUrl).toString();
      } catch {
        favicon = null;
      }
    } else {
      // Default to origin/favicon.ico
      try {
        const parsed = new URL(targetUrl);
        favicon = `${parsed.origin}/favicon.ico`;
      } catch {
        favicon = null;
      }
    }

    return { title, favicon };
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

