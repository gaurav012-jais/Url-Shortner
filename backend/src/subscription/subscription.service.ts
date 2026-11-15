import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import { User, SubscriptionPlan, UserRole } from '../users/entities/user.entity';
import { Url } from '../urls/entities/url.entity';
import { SystemSetting } from '../admin/entities/system-setting.entity';
import { UpgradePlanDto } from './dto/upgrade-plan.dto';

export interface PlanFeature {
  id: 'free' | 'pro' | 'enterprise';
  name: string;
  tagline: string;
  priceMonthly: number;
  priceYearly: number;
  popular?: boolean;
  features: string[];
  limits: {
    maxClicksPerLink: number | null; // null = unlimited
    maxPasswordLinks: number | null; // null = unlimited
    customAliasAllowed: boolean;
    bulkShortenMax: number;
    linkRetentionDays: number | null; // null = forever
    analyticsTier: 'basic' | 'advanced' | 'enterprise';
  };
}

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Url)
    private readonly urlsRepository: Repository<Url>,
    @InjectRepository(SystemSetting)
    private readonly settingsRepository: Repository<SystemSetting>,
  ) {}

  async getPlans(): Promise<{ plans: PlanFeature[]; systemLimits: any }> {
    const settings = await this.settingsRepository.findOne({
      where: {},
      order: { updated_at: 'DESC' },
    });

    const freeClickQuota = settings?.free_tier_max_clicks ?? 100;
    const freePasswordQuota = settings?.free_user_max_password_links ?? 5;

    const plans: PlanFeature[] = [
      {
        id: 'free',
        name: 'Free Starter',
        tagline: 'Ideal for casual shortening and personal use.',
        priceMonthly: 0,
        priceYearly: 0,
        features: [
          `Up to ${freeClickQuota > 0 ? freeClickQuota : 'Unlimited'} clicks per link`,
          `Up to ${freePasswordQuota} password-protected links`,
          'Standard HTTP 302 Fast Redirection',
          'Basic Click Telemetry & Referrers',
          'Single & Bulk Shorten (up to 10 links)',
          'Guest link auto-claim on registration',
        ],
        limits: {
          maxClicksPerLink: freeClickQuota > 0 ? freeClickQuota : null,
          maxPasswordLinks: freePasswordQuota,
          customAliasAllowed: settings?.allow_custom_alias_free ?? true,
          bulkShortenMax: 10,
          linkRetentionDays: null,
          analyticsTier: 'basic',
        },
      },
      {
        id: 'pro',
        name: 'Pro Creator',
        tagline: 'For creators, marketers, and power users who need zero limits.',
        priceMonthly: 9,
        priceYearly: 89,
        popular: true,
        features: [
          '⚡ Unlimited Clicks & Bandwidth on all links',
          '🔒 Unlimited Password-Protected Links',
          'Permanent Links with Zero Expiration',
          'Custom Vanity Slugs & Custom Domain Presets',
          'Bulk Batch Shorten (up to 100 links at once)',
          'Deep Geo-Location, Device & OS Analytics',
          'Priority HTTP 302 Edge Routing (<15ms)',
          'Fast QR Code Downloads & Custom Branding',
        ],
        limits: {
          maxClicksPerLink: null,
          maxPasswordLinks: null,
          customAliasAllowed: true,
          bulkShortenMax: 100,
          linkRetentionDays: null,
          analyticsTier: 'advanced',
        },
      },
      {
        id: 'enterprise',
        name: 'Business & Enterprise',
        tagline: 'Maximum throughput, team scalability & SLA guarantees.',
        priceMonthly: 29,
        priceYearly: 289,
        features: [
          'Everything in Pro Creator included',
          'Unlimited Bulk Shorten (up to 500 links)',
          'Full REST API Keys & Webhook Access',
          'Custom Branded Preview & Password Unlock Pages',
          'Role-Based Admin Console Access for Teams',
          'Dedicated 99.99% Redirection Uptime SLA',
          'Priority 24/7 Developer Support',
        ],
        limits: {
          maxClicksPerLink: null,
          maxPasswordLinks: null,
          customAliasAllowed: true,
          bulkShortenMax: 500,
          linkRetentionDays: null,
          analyticsTier: 'enterprise',
        },
      },
    ];

    return {
      plans,
      systemLimits: {
        free_tier_max_clicks: freeClickQuota,
        free_user_max_password_links: freePasswordQuota,
        allow_guest_passwords: settings?.allow_guest_passwords ?? false,
      },
    };
  }

  async getUserSubscription(userId: string) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const [totalLinks, passwordLinks] = await Promise.all([
      this.urlsRepository.count({ where: { user_id: userId } }),
      this.urlsRepository.count({
        where: { user_id: userId, password_hash: Not(IsNull()) },
      }),
    ]);

    const clicksSumResult = await this.urlsRepository
      .createQueryBuilder('url')
      .select('SUM(url.clicks_count)', 'totalClicks')
      .where('url.user_id = :userId', { userId })
      .getRawOne();

    const totalClicks = parseInt(clicksSumResult?.totalClicks || '0', 10);

    const plansData = await this.getPlans();
    const currentPlanId = (user.plan || 'free') as 'free' | 'pro' | 'enterprise';
    const currentPlan =
      plansData.plans.find((p) => p.id === currentPlanId) || plansData.plans[0];

    // Check if subscription has expired
    let isExpired = false;
    if (user.plan_expires_at && new Date() > new Date(user.plan_expires_at)) {
      isExpired = true;
    }

    return {
      plan: user.plan || 'free',
      plan_expires_at: user.plan_expires_at,
      is_active: user.is_active,
      is_admin: user.role === UserRole.ADMIN,
      is_expired: isExpired,
      plan_details: currentPlan,
      usage: {
        total_links: totalLinks,
        password_links: passwordLinks,
        total_clicks: totalClicks,
      },
    };
  }

  async upgradePlan(userId: string, dto: UpgradePlanDto) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    // VULN-23 FIX: Subscription upgrade now only allowed for downgrade-to-free (no payment gateway).
    // Upgrading to paid plans is disabled until a real payment provider is integrated.
    // This prevents any authenticated user from promoting themselves to Pro/Enterprise for free.
    if (dto.plan !== 'free') {
      return {
        success: false,
        message: 'Paid plan upgrades require payment processing. Please contact the administrator to upgrade your plan.',
        plan: user.plan,
        plan_expires_at: user.plan_expires_at,
      };
    }

    user.plan = dto.plan;
    user.plan_expires_at = null;

    await this.usersRepository.save(user);
    this.logger.log(
      `User ${user.email} downgraded to plan: ${dto.plan.toUpperCase()} (${dto.billingCycle || 'monthly'})`,
    );

    return {
      success: true,
      message: `Your account has been updated to the ${dto.plan.toUpperCase()} plan.`,
      plan: user.plan,
      plan_expires_at: user.plan_expires_at,
    };
  }

  async cancelSubscription(userId: string) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    user.plan = 'free';
    user.plan_expires_at = null;
    await this.usersRepository.save(user);

    this.logger.log(`User ${user.email} downgraded to Free Starter plan.`);

    return {
      success: true,
      message: 'Your subscription has been switched back to the Free Starter plan.',
      plan: 'free',
    };
  }
}

