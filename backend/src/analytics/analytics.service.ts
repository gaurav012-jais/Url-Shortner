import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { Click } from './entities/click.entity';
import { Url } from '../urls/entities/url.entity';

@Injectable()
export class AnalyticsService {
  private readonly baseUrl: string;

  constructor(
    @InjectRepository(Click)
    private readonly clicksRepository: Repository<Click>,
    @InjectRepository(Url)
    private readonly urlsRepository: Repository<Url>,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('BASE_URL', 'http://localhost:5000');
  }

  async recordClick(
    urlId: string,
    details: {
      ip?: string;
      userAgent?: string;
      referrer?: string;
    },
  ): Promise<void> {
    try {
      const ua = details.userAgent || '';
      const ref = details.referrer || '';
      const ip = details.ip || '';

      // Parse Device Type
      let device_type = 'desktop';
      if (/tablet|ipad|playbook|silk/i.test(ua)) {
        device_type = 'tablet';
      } else if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) {
        device_type = 'mobile';
      }

      // Parse Browser
      let browser = 'Other';
      if (/edg\//i.test(ua)) {
        browser = 'Edge';
      } else if (/chrome|crios/i.test(ua) && !/opr|brave/i.test(ua)) {
        browser = 'Chrome';
      } else if (/safari/i.test(ua) && !/chrome/i.test(ua)) {
        browser = 'Safari';
      } else if (/firefox|fxios/i.test(ua)) {
        browser = 'Firefox';
      } else if (/opera|opr\//i.test(ua)) {
        browser = 'Opera';
      }

      // Parse OS
      let os = 'Other';
      if (/windows/i.test(ua)) {
        os = 'Windows';
      } else if (/macintosh|mac os x/i.test(ua)) {
        os = 'macOS';
      } else if (/iphone|ipad|ipod/i.test(ua)) {
        os = 'iOS';
      } else if (/android/i.test(ua)) {
        os = 'Android';
      } else if (/linux/i.test(ua)) {
        os = 'Linux';
      }

      // Parse Referrer
      let referrerClean = 'Direct / Bookmarks';
      if (ref && ref.trim()) {
        try {
          const parsedRef = new URL(ref);
          referrerClean = parsedRef.hostname.replace('www.', '');
        } catch {
          referrerClean = ref.substring(0, 50);
        }
      }

      // Anonymize IP
      const ip_hash = ip
        ? crypto.createHash('sha256').update(ip).digest('hex').substring(0, 32)
        : null;

      const click = this.clicksRepository.create({
        url_id: urlId,
        ip_hash,
        device_type,
        browser,
        os,
        referrer: referrerClean,
      });

      await this.clicksRepository.save(click);
    } catch {
      // Background click recording should never throw or break redirection
    }
  }

  async getOverview(userId?: string, userRole?: string) {
    const urlWhere: any = {};
    if (userId && userRole !== 'admin') {
      urlWhere.user_id = userId;
    }

    const [urls, totalLinks] = await this.urlsRepository.findAndCount({
      where: urlWhere,
      order: { clicks_count: 'DESC' },
    });

    const activeLinks = urls.filter((u) => {
      const isExpired =
        (u.expires_at !== null && new Date() > u.expires_at) ||
        (u.max_clicks !== null && u.clicks_count >= u.max_clicks);
      return u.is_active && !isExpired;
    }).length;
    const totalClicks = urls.reduce((sum, u) => sum + u.clicks_count, 0);

    const urlIds = urls.map((u) => u.id);

    // Calculate Past 7 Days Trend
    const past7Days: { date: string; clicks: number }[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      past7Days.push({ date: dateStr, clicks: 0 });
    }

    let deviceDistribution = [
      { name: 'Desktop', value: 0 },
      { name: 'Mobile', value: 0 },
      { name: 'Tablet', value: 0 },
    ];

    let browserDistribution = [
      { name: 'Chrome', value: 0 },
      { name: 'Safari', value: 0 },
      { name: 'Firefox', value: 0 },
      { name: 'Edge', value: 0 },
      { name: 'Other', value: 0 },
    ];

    if (urlIds.length > 0) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Perform SQL-level IN(...) filter to prevent OOM / N+1 loading of all clicks
      const filteredClicks = await this.clicksRepository.find({
        where: {
          url_id: In(urlIds),
          created_at: MoreThanOrEqual(sevenDaysAgo),
        },
      });

      filteredClicks.forEach((click) => {
        const clickDateStr = click.created_at.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });
        const trendItem = past7Days.find((t) => t.date === clickDateStr);
        if (trendItem) trendItem.clicks++;

        // Device
        const devItem = deviceDistribution.find(
          (d) => d.name.toLowerCase() === click.device_type.toLowerCase(),
        );
        if (devItem) devItem.value++;

        // Browser
        const brItem = browserDistribution.find(
          (b) => b.name.toLowerCase() === click.browser.toLowerCase(),
        );
        if (brItem) brItem.value++;
      });
    }

    // Fallback baseline for demo charts if fresh installation with 0 historical clicks
    if (past7Days.every((p) => p.clicks === 0) && totalClicks > 0) {
      past7Days[past7Days.length - 1].clicks = totalClicks;
    }

    return {
      totalLinks,
      totalClicks,
      activeLinks,
      clickVolumeTrend: past7Days,
      deviceDistribution,
      browserDistribution,
      topLinks: urls.slice(0, 5),
    };
  }

  async getUrlAnalytics(urlId: string, userId?: string, userRole?: string) {
    const url = await this.urlsRepository.findOne({ where: { id: urlId } });
    if (!url) {
      throw new NotFoundException(`URL with ID "${urlId}" not found`);
    }

    // VULN-11 FIX: Unauthenticated users (userId === undefined) must NOT access any URL analytics.
    // Admin can access all; authenticated user can only access their own URLs.
    if (!userId) {
      throw new ForbiddenException('Authentication required to access analytics');
    }
    if (userRole !== 'admin' && url.user_id !== userId) {
      throw new ForbiddenException('You do not have access to analytics for this route');
    }

    const isExpired =
      (url.expires_at !== null && new Date() > url.expires_at) ||
      (url.max_clicks !== null && url.clicks_count >= url.max_clicks);

    const clicks = await this.clicksRepository.find({
      where: { url_id: urlId },
      order: { created_at: 'DESC' },
      take: 1000,
    });

    const uniqueIps = new Set(clicks.map((c) => c.ip_hash).filter(Boolean));
    const uniqueClicks = uniqueIps.size;

    // Past 7 Days Daily Trend
    const past7Days: { date: string; clicks: number }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      past7Days.push({ date: dateStr, clicks: 0 });
    }

    // Devices, Browsers, OS & Referrers counters
    const deviceCounts: Record<string, number> = { Desktop: 0, Mobile: 0, Tablet: 0 };
    const browserCounts: Record<string, number> = {};
    const osCounts: Record<string, number> = {};
    const referrerCounts: Record<string, number> = {};

    clicks.forEach((c) => {
      const dateStr = c.created_at.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      const trend = past7Days.find((t) => t.date === dateStr);
      if (trend) trend.clicks++;

      // Device
      const dev = c.device_type
        ? c.device_type.charAt(0).toUpperCase() + c.device_type.slice(1).toLowerCase()
        : 'Desktop';
      deviceCounts[dev] = (deviceCounts[dev] || 0) + 1;

      // Browser
      const br = c.browser || 'Other';
      browserCounts[br] = (browserCounts[br] || 0) + 1;

      // OS
      const os = c.os || 'Other';
      osCounts[os] = (osCounts[os] || 0) + 1;

      // Referrer
      const ref = c.referrer || 'Direct / Bookmarks';
      referrerCounts[ref] = (referrerCounts[ref] || 0) + 1;
    });

    // Format distributions
    const deviceDistribution = Object.keys(deviceCounts).map((k) => ({
      name: k,
      value: deviceCounts[k],
    }));
    const browserDistribution = Object.keys(browserCounts).map((k) => ({
      name: k,
      value: browserCounts[k],
    }));
    const osDistribution = Object.keys(osCounts).map((k) => ({
      name: k,
      value: osCounts[k],
    }));

    const totalRecorded = clicks.length || 1;
    const referrers = Object.entries(referrerCounts)
      .map(([referrer, count]) => ({
        referrer,
        count,
        percentage: Math.round((count / totalRecorded) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const recentClicks = clicks.slice(0, 25).map((c) => ({
      id: c.id,
      clicked_at: c.created_at,
      device_type: c.device_type,
      browser: c.browser,
      os: c.os,
      referrer: c.referrer,
    }));

    let baseUrlToUse = this.baseUrl;
    if (url.domain) {
      const cleanDomain = url.domain.trim();
      baseUrlToUse = cleanDomain.startsWith('http')
        ? cleanDomain
        : `http://${cleanDomain}`;
    }

    return {
      url: {
        id: url.id,
        short_code: url.short_code,
        short_url: `${baseUrlToUse}/${url.short_code}`,
        original_url: url.original_url,
        title: url.title,
        favicon: url.favicon,
        tags: url.tags,
        clicks_count: url.clicks_count,
        is_active: url.is_active,
        is_expired: isExpired,
        created_at: url.created_at,
        expires_at: url.expires_at,
        max_clicks: url.max_clicks,
      },
      stats: {
        totalClicks: url.clicks_count,
        uniqueClicks,
        clicksRecorded: clicks.length,
      },
      trend: past7Days,
      deviceDistribution,
      browserDistribution,
      osDistribution,
      referrers,
      recentClicks,
    };
  }
}
