import {
  Controller,
  Get,
  Post,
  Param,
  Res,
  Req,
  HttpStatus,
  GoneException,
  NotFoundException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UrlsService } from '../urls/urls.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { AdminService } from '../admin/admin.service';

@Controller()
export class RedirectsController {
  private readonly frontendUrl: string;

  // Anti-Brute Force: Max 5 password attempts per IP per 60 seconds
  private readonly rateLimitWindowMs = 60 * 1000;
  private readonly maxAttemptsPerWindow = 5;
  private readonly ipAttempts = new Map<string, number[]>();

  constructor(
    private readonly urlsService: UrlsService,
    private readonly analyticsService: AnalyticsService,
    private readonly configService: ConfigService,
    private readonly adminService: AdminService,
  ) {
    const rawFrontend =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    this.frontendUrl = rawFrontend.split(',')[0].trim();
  }

  private checkRateLimit(ip: string): { allowed: boolean; retryAfterSeconds: number } {
    const now = Date.now();
    const attempts = (this.ipAttempts.get(ip) || []).filter(
      (t) => now - t < this.rateLimitWindowMs,
    );

    if (attempts.length >= this.maxAttemptsPerWindow) {
      const oldest = attempts[0];
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((oldest + this.rateLimitWindowMs - now) / 1000),
      );
      return { allowed: false, retryAfterSeconds };
    }

    attempts.push(now);
    this.ipAttempts.set(ip, attempts);

    // Prune stale IP records to avoid memory growth
    if (this.ipAttempts.size > 5000) {
      for (const [k, v] of this.ipAttempts.entries()) {
        if (v.every((t) => now - t >= this.rateLimitWindowMs)) {
          this.ipAttempts.delete(k);
        }
      }
    }

    return { allowed: true, retryAfterSeconds: 0 };
  }

  private getClientIp(req: Request): string {
    if (req.ip) return req.ip;
    const forwarded = req.headers['x-forwarded-for'] as string | undefined;
    if (forwarded) {
      const ips = forwarded.split(',').map((s) => s.trim()).filter(Boolean);
      return ips[0] || req.socket?.remoteAddress || '127.0.0.1';
    }
    return req.socket?.remoteAddress || '127.0.0.1';
  }

  @Get()
  async handleRootRedirect(@Res() res: Response) {
    return res.redirect(HttpStatus.FOUND, this.frontendUrl);
  }

  @Get(':shortCode')
  async handleRedirect(
    @Param('shortCode') shortCode: string,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    // Check if user requested TinyURL-style preview using "+" suffix
    if (shortCode.endsWith('+')) {
      const cleanCode = shortCode.slice(0, -1);
      return res.redirect(
        HttpStatus.FOUND,
        `${this.frontendUrl}/preview/${cleanCode}`,
      );
    }

    const clientIp = this.getClientIp(req);

    try {
      // 1. Maintenance Mode Check
      const settings = await this.adminService.getSettings();
      if (settings.maintenance_mode) {
        return res.status(HttpStatus.SERVICE_UNAVAILABLE).send(
          this.renderErrorPage(
            'Maintenance Mode (503)',
            'ZeLnk is temporarily undergoing scheduled platform maintenance. Redirections are paused. Please check back shortly.',
          ),
        );
      }

      const url = await this.urlsService.findByCode(shortCode, false);

      // 2. Global Free Tier Click Limit Quota Check (Guest links or Free tier user links)
      const isCreatorFree =
        !url.user_id ||
        (url.user &&
          url.user.role !== 'admin' &&
          (url.user.plan === 'free' || !url.user.plan));

      if (isCreatorFree && settings.free_tier_max_clicks > 0) {
        if (url.clicks_count >= settings.free_tier_max_clicks) {
          return res.status(HttpStatus.GONE).send(
            this.renderErrorPage(
              'Bandwidth Quota Exceeded (410)',
              `This short link has reached its Free Tier bandwidth limit of ${settings.free_tier_max_clicks} clicks. The creator can upgrade to Pro for unlimited bandwidth and clicks.`,
            ),
          );
        }
      }

      // Password Protection check
      if (url.password_hash) {
        if (!url.is_active) {
          return res.status(HttpStatus.GONE).send(
            this.renderErrorPage(
              'Link Inactive (410)',
              'This short link has been deactivated by the owner.',
            ),
          );
        }

        // Passwords must NEVER be passed in URL query strings (prevents exposure in access logs, CDN logs, & Referer).
        // Protected links always render the password challenge form; verification is handled via POST body.
        return res.send(
          this.renderPasswordPage(shortCode, undefined),
        );
      }

      // Increment click count & record click telemetry
      await this.urlsService.incrementClicks(url.id);
      this.analyticsService.recordClick(url.id, {
        ip: clientIp,
        userAgent: req.headers['user-agent'],
        referrer: (req.headers['referer'] || req.headers['referrer']) as string,
      });

      // HTTP 302 Redirection
      return res.redirect(HttpStatus.FOUND, url.original_url);
    } catch (error) {
      if (error instanceof NotFoundException) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .send(this.renderErrorPage('Link Not Found (404)', error.message));
      }

      if (error instanceof GoneException) {
        return res
          .status(HttpStatus.GONE)
          .send(this.renderErrorPage('Link Inactive / Expired (410)', error.message));
      }

      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .send(
          this.renderErrorPage(
            'Redirection Error',
            'An unexpected error occurred while processing this short link.',
          ),
        );
    }
  }

  // Framework-level throttle: max 5 passcode submit requests per 60s per IP
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post(':shortCode')
  async handlePasswordSubmit(
    @Param('shortCode') shortCode: string,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const clientIp = this.getClientIp(req);

    // Validate Content-Type to prevent parser confusion
    const contentType = (req.headers['content-type'] || '').toLowerCase();
    const isAllowedContentType =
      contentType.includes('application/x-www-form-urlencoded') ||
      contentType.includes('application/json');

    if (!isAllowedContentType) {
      return res
        .status(HttpStatus.UNSUPPORTED_MEDIA_TYPE)
        .send(
          this.renderErrorPage(
            'Invalid Media Type (415)',
            'Passcode submission must use application/x-www-form-urlencoded or application/json.',
          ),
        );
    }

    try {
      // 1. Maintenance Mode Check
      const settings = await this.adminService.getSettings();
      if (settings.maintenance_mode) {
        return res.status(HttpStatus.SERVICE_UNAVAILABLE).send(
          this.renderErrorPage(
            'Maintenance Mode (503)',
            'ZeLnk is temporarily undergoing scheduled platform maintenance. Redirections are paused. Please check back shortly.',
          ),
        );
      }

      const url = await this.urlsService.findByCode(shortCode, false);

      // 2. Global Free Tier Click Limit Quota Check (Guest links or Free tier user links)
      const isCreatorFree =
        !url.user_id ||
        (url.user &&
          url.user.role !== 'admin' &&
          (url.user.plan === 'free' || !url.user.plan));

      if (isCreatorFree && settings.free_tier_max_clicks > 0) {
        if (url.clicks_count >= settings.free_tier_max_clicks) {
          return res.status(HttpStatus.GONE).send(
            this.renderErrorPage(
              'Bandwidth Quota Exceeded (410)',
              `This short link has reached its Free Tier bandwidth limit of ${settings.free_tier_max_clicks} clicks. The creator can upgrade to Pro for unlimited bandwidth and clicks.`,
            ),
          );
        }
      }
      if (!url.password_hash) {
        return res.redirect(HttpStatus.FOUND, url.original_url);
      }

      if (!url.is_active) {
        return res.status(HttpStatus.GONE).send(
          this.renderErrorPage(
            'Link Inactive (410)',
            'This short link has been deactivated by the owner.',
          ),
        );
      }

      // 2. IP Rate Limiting Check (Anti-Brute Force per IP)
      const rateLimit = this.checkRateLimit(clientIp);
      if (!rateLimit.allowed) {
        return res
          .status(HttpStatus.TOO_MANY_REQUESTS)
          .send(this.renderRateLimitPage(rateLimit.retryAfterSeconds));
      }

      const rawBody = req.body;
      const submittedPassword =
        typeof rawBody?.password === 'string'
          ? rawBody.password
          : typeof rawBody?.pass === 'string'
          ? rawBody.pass
          : '';

      // Prevent bcrypt CPU exhaustion from excessively long payloads
      if (submittedPassword.length > 100) {
        return res.status(HttpStatus.BAD_REQUEST).send(
          this.renderPasswordPage(
            shortCode,
            'Passcode cannot exceed 100 characters.',
          ),
        );
      }
      const isMatch = await bcrypt.compare(submittedPassword, url.password_hash);

      if (!isMatch) {
        // Record failed attempt for auditing/owner telemetry without deactivating the link globally
        await this.urlsService.recordFailedPasswordAttempt(url.id);

        return res.send(
          this.renderPasswordPage(
            shortCode,
            'Incorrect passcode. Please check the passcode and try again.',
          ),
        );
      }

      // Valid passcode: reset failed attempts
      await this.urlsService.resetFailedPasswordAttempts(url.id);

      // Increment click count & record telemetry
      await this.urlsService.incrementClicks(url.id);
      this.analyticsService.recordClick(url.id, {
        ip: clientIp,
        userAgent: req.headers['user-agent'],
        referrer: (req.headers['referer'] || req.headers['referrer']) as string,
      });

      return res.redirect(HttpStatus.FOUND, url.original_url);
    } catch (error) {
      if (error instanceof NotFoundException) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .send(this.renderErrorPage('Link Not Found (404)', error.message));
      }
      if (error instanceof GoneException) {
        return res
          .status(HttpStatus.GONE)
          .send(this.renderErrorPage('Link Inactive / Expired (410)', error.message));
      }
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .send(this.renderErrorPage('Redirection Error', 'Failed to process request.'));
    }
  }

  private renderPasswordPage(
    shortCode: string,
    errorMessage?: string,
    remainingAttempts: number = 10,
  ): string {
    const isCritical = remainingAttempts <= 3;
    const isWarning = remainingAttempts < 10;

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Protected Link - ZeLnk</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Geist', 'Segoe UI', Roboto, sans-serif;
            background-color: #f9f9ff;
            color: #151c27;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 1rem;
          }
          .card {
            background-color: #ffffff;
            border: 1px solid #e2e8f8;
            border-radius: 1rem;
            padding: 2.25rem 2rem;
            max-width: 410px;
            width: 100%;
            text-align: center;
            box-shadow: 0 10px 25px -5px rgba(21, 28, 39, 0.08);
          }
          .icon-wrap {
            width: 52px;
            height: 52px;
            background-color: #635bdb;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1.25rem;
            color: #ffffff;
            font-size: 24px;
          }
          h1 {
            font-size: 1.25rem;
            font-weight: 700;
            color: #151c27;
            margin-bottom: 0.5rem;
          }
          p {
            color: #474554;
            font-size: 0.875rem;
            line-height: 1.45;
            margin-bottom: 1.25rem;
          }
          .attempts-pill {
            display: inline-flex;
            align-items: center;
            gap: 0.35rem;
            padding: 0.3rem 0.75rem;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 600;
            background-color: ${isCritical ? '#fee2e2' : '#fef3c7'};
            color: ${isCritical ? '#b91c1c' : '#b45309'};
            border: 1px solid ${isCritical ? '#fca5a5' : '#fde68a'};
            margin-bottom: 1rem;
            font-family: monospace;
          }
          .error-box {
            background-color: ${isCritical ? '#ffdad6' : '#fffbeb'};
            color: ${isCritical ? '#93000a' : '#92400e'};
            border: 1px solid ${isCritical ? '#ba1a1a' : '#fde68a'};
            border-radius: 0.5rem;
            padding: 0.65rem 0.75rem;
            font-size: 0.8125rem;
            font-weight: 500;
            margin-bottom: 1rem;
            text-align: left;
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }
          form {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
          }
          input[type="password"] {
            width: 100%;
            height: 42px;
            padding: 0 0.875rem;
            border-radius: 0.5rem;
            border: 1px solid #c8c4d6;
            background-color: #f0f3ff;
            font-size: 0.875rem;
            outline: none;
            font-family: inherit;
          }
          input[type="password"]:focus {
            border-color: #635bdb;
            box-shadow: 0 0 0 2px rgba(99, 91, 219, 0.15);
          }
          button {
            width: 100%;
            height: 42px;
            background-color: #4a40c1;
            color: #ffffff;
            border: none;
            border-radius: 0.5rem;
            font-size: 0.875rem;
            font-weight: 600;
            cursor: pointer;
            transition: background-color 0.2s;
          }
          button:hover {
            background-color: #635bdb;
          }
          .badge {
            display: inline-block;
            margin-top: 1.5rem;
            font-size: 0.6875rem;
            color: #777585;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon-wrap">🔒</div>
          <h1>Protected Route</h1>
          <p>This destination is passcode protected. Enter the correct passcode to proceed.</p>

          ${
            isWarning
              ? `<div class="attempts-pill">
                  ⚠️ ${remainingAttempts} of 10 attempts remaining
                 </div>`
              : ''
          }

          ${
            errorMessage
              ? `<div class="error-box">
                  <span>⚠️</span>
                  <div>${errorMessage}</div>
                </div>`
              : ''
          }

          <form method="POST" action="/${shortCode}">
            <input type="password" name="password" placeholder="Enter link passcode" required autofocus autocomplete="current-password" />
            <button type="submit">Unlock &amp; Proceed &rarr;</button>
          </form>
          <span class="badge">Brute-Force Protected &bull; Rate-Limited Security Guard</span>
        </div>
      </body>
      </html>
    `;
  }

  private renderRateLimitPage(retryAfterSeconds: number): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Too Many Attempts - ZeLnk</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Geist', 'Segoe UI', Roboto, sans-serif;
            background-color: #f9f9ff;
            color: #151c27;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 1.5rem;
          }
          .card {
            background-color: #ffffff;
            border: 1px solid #e2e8f8;
            border-radius: 1rem;
            padding: 2.25rem 2rem;
            max-width: 440px;
            width: 100%;
            text-align: center;
            box-shadow: 0 10px 25px -5px rgba(21, 28, 39, 0.08);
          }
          .icon-wrap {
            width: 56px;
            height: 56px;
            background-color: #fee2e2;
            color: #dc2626;
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1.25rem;
            font-size: 26px;
          }
          h1 {
            font-size: 1.25rem;
            font-weight: 700;
            color: #151c27;
            margin-bottom: 0.5rem;
          }
          p {
            color: #474554;
            font-size: 0.875rem;
            line-height: 1.5;
            margin-bottom: 1.5rem;
          }
          .timer-box {
            background-color: #f0f3ff;
            border: 1px dashed #635bdb;
            border-radius: 0.75rem;
            padding: 1rem;
            margin-bottom: 1.5rem;
          }
          .timer-val {
            font-size: 1.5rem;
            font-weight: 700;
            color: #4a40c1;
            font-family: monospace;
          }
          .timer-label {
            font-size: 0.75rem;
            color: #777585;
            margin-top: 0.25rem;
          }
          .btn {
            display: inline-block;
            width: 100%;
            height: 42px;
            line-height: 42px;
            background-color: #4a40c1;
            color: #ffffff;
            border: none;
            border-radius: 0.5rem;
            font-size: 0.875rem;
            font-weight: 600;
            text-decoration: none;
            cursor: pointer;
            transition: background-color 0.2s;
          }
          .btn:hover {
            background-color: #635bdb;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon-wrap">⏳</div>
          <h1>Rate Limit Exceeded</h1>
          <p>Too many passcode attempts were made from your IP address. To prevent brute-force attacks, access is temporarily paused.</p>
          <div class="timer-box">
            <div class="timer-val" id="countdown">${retryAfterSeconds}s</div>
            <div class="timer-label">Please wait before trying again</div>
          </div>
          <button class="btn" onclick="window.location.reload()">Retry Now</button>
        </div>
        <script>
          let seconds = ${retryAfterSeconds};
          const el = document.getElementById('countdown');
          const interval = setInterval(() => {
            seconds--;
            if (seconds <= 0) {
              clearInterval(interval);
              el.innerText = 'Ready!';
              window.location.reload();
            } else {
              el.innerText = seconds + 's';
            }
          }, 1000);
        </script>
      </body>
      </html>
    `;
  }

  private renderErrorPage(title: string, message: string): string {
    const esc = (s: string) =>
      s.replace(/&/g, '&amp;')
       .replace(/</g, '&lt;')
       .replace(/>/g, '&gt;')
       .replace(/"/g, '&quot;')
       .replace(/'/g, '&#x27;');

    const safeTitle = esc(title);
    const safeMessage = esc(message);
    // frontendUrl comes from config (not user input), but escape anyway for safety
    const safeFrontendUrl = esc(this.frontendUrl);

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${safeTitle} - ZeLnk</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Geist', 'Segoe UI', Roboto, sans-serif;
            background-color: #f9f9ff;
            color: #151c27;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 1.5rem;
          }
          .card {
            background-color: #ffffff;
            border: 1px solid #e2e8f8;
            border-radius: 1rem;
            padding: 2.25rem 2rem;
            max-width: 440px;
            width: 100%;
            text-align: center;
            box-shadow: 0 10px 25px -5px rgba(21, 28, 39, 0.08);
          }
          .icon { font-size: 2.5rem; margin-bottom: 1rem; }
          h1 {
            font-size: 1.25rem;
            font-weight: 700;
            color: #ba1a1a;
            margin-bottom: 0.75rem;
          }
          p {
            color: #474554;
            font-size: 0.875rem;
            line-height: 1.5;
            margin-bottom: 1.75rem;
          }
          .btn {
            display: inline-block;
            background-color: #4a40c1;
            color: #ffffff;
            font-weight: 600;
            padding: 0.65rem 1.5rem;
            border-radius: 0.5rem;
            text-decoration: none;
            font-size: 0.875rem;
            transition: background-color 0.2s;
          }
          .btn:hover { background-color: #635bdb; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">🔒</div>
          <h1>${safeTitle}</h1>
          <p>${safeMessage}</p>
          <a href="${safeFrontendUrl}" class="btn">Return to ZeLnk</a>
        </div>
      </body>
      </html>
    `;
  }
}
