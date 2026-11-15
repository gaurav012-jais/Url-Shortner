import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository, Like, IsNull, MoreThanOrEqual } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { SystemSetting } from './entities/system-setting.entity';
import { Url } from '../urls/entities/url.entity';
import { User, UserRole, SubscriptionPlan } from '../users/entities/user.entity';
import { Click } from '../analytics/entities/click.entity';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class AdminService implements OnModuleInit {
  private readonly logger = new Logger(AdminService.name);
  private cachedSettings: SystemSetting | null = null;

  constructor(
    @InjectRepository(SystemSetting)
    private readonly settingsRepo: Repository<SystemSetting>,
    @InjectRepository(Url)
    private readonly urlsRepo: Repository<Url>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(Click)
    private readonly clicksRepo: Repository<Click>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    try {
      // Ensure settings table exists and has default row
      await this.settingsRepo.query(`
        CREATE TABLE IF NOT EXISTS "system_settings" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "free_tier_max_clicks" integer NOT NULL DEFAULT 100,
          "allow_guest_passwords" boolean NOT NULL DEFAULT false,
          "free_user_max_password_links" integer NOT NULL DEFAULT 5,
          "guest_expiration_minutes" integer NOT NULL DEFAULT 15,
          "allow_custom_alias_free" boolean NOT NULL DEFAULT true,
          "maintenance_mode" boolean NOT NULL DEFAULT false,
          "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          CONSTRAINT "PK_system_settings_id" PRIMARY KEY ("id")
        );
      `);
    } catch {
      // Ignore if table already exists
    }

    try {
      // Ensure subscription and profile columns exist on users table
      await this.usersRepo.query(`
        ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "plan" character varying(50) NOT NULL DEFAULT 'free';
        ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "plan_expires_at" TIMESTAMP WITH TIME ZONE;
        ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "profile_picture_url" character varying(500);
      `);
    } catch {
      // Ignore if columns exist
    }

    await this.loadOrInitSettings();

    // Provision or sync Master Admin strictly from .env credentials
    try {
      const adminEmail = this.configService.get<string>('ADMIN_EMAIL')?.toLowerCase()?.trim();
      const adminPassword = this.configService.get<string>('ADMIN_PASSWORD');
      const adminName = this.configService.get<string>('ADMIN_NAME')?.trim() || 'Admin';

      if (!adminEmail || !adminPassword) {
        this.logger.log('ADMIN_EMAIL or ADMIN_PASSWORD not configured in environment. Skipping admin provisioning.');
        return;
      }

      let adminCandidate = await this.usersRepo.findOne({
        where: { email: adminEmail },
      });

      if (adminCandidate) {
        let changed = false;
        if (adminCandidate.role !== UserRole.ADMIN) {
          adminCandidate.role = UserRole.ADMIN;
          changed = true;
        }
        if (adminCandidate.plan !== SubscriptionPlan.ENTERPRISE) {
          adminCandidate.plan = SubscriptionPlan.ENTERPRISE;
          changed = true;
        }
        // Sync password if changed in .env so admin can always log in with .env credentials
        const isPasswordMatch = await bcrypt.compare(adminPassword, adminCandidate.password_hash);
        if (!isPasswordMatch) {
          adminCandidate.password_hash = await bcrypt.hash(adminPassword, 10);
          changed = true;
        }
        if (changed) {
          await this.usersRepo.save(adminCandidate);
          // Revoke all existing sessions/tokens for this account so only someone with .env password can log in
          try {
            await this.usersRepo.query(
              `UPDATE "refresh_tokens" SET "is_revoked" = true WHERE "user_id" = $1`,
              [adminCandidate.id],
            );
          } catch {
            // Non-fatal if table doesn't exist yet
          }
          this.logger.log(`⭐ Synced & Elevated .env admin account "${adminCandidate.email}" (${adminCandidate.name}) to ADMIN (All prior sessions revoked).`);
        } else {
          this.logger.log(`⭐ Master Admin account active: "${adminCandidate.email}" (Role: ADMIN, Plan: ENTERPRISE).`);
        }
      } else {
        const passwordHash = await bcrypt.hash(adminPassword, 10);
        const newAdmin = this.usersRepo.create({
          name: adminName,
          email: adminEmail,
          password_hash: passwordHash,
          role: UserRole.ADMIN,
          plan: SubscriptionPlan.ENTERPRISE,
          is_active: true,
        });
        await this.usersRepo.save(newAdmin);
        this.logger.log(`🚀 Provisioned new Master Admin account from .env: "${adminEmail}" (Role: ADMIN, Plan: ENTERPRISE).`);
      }
    } catch (err: any) {
      this.logger.error(`Failed to sync admin account: ${err?.message}`);
    }
  }

  private async loadOrInitSettings(): Promise<SystemSetting> {
    const rows = await this.settingsRepo.find({
      order: { updated_at: 'DESC' },
      take: 1,
    });
    let settings = rows[0] || null;

    if (!settings) {
      settings = this.settingsRepo.create({
        free_tier_max_clicks: 100,
        allow_guest_passwords: false,
        free_user_max_password_links: 5,
        guest_expiration_minutes: 15,
        allow_custom_alias_free: true,
        maintenance_mode: false,
      });
      settings = await this.settingsRepo.save(settings);
      this.logger.log('Initialized default system settings row.');
    }

    this.cachedSettings = settings;
    return settings;
  }

  async getSettings(): Promise<SystemSetting> {
    if (this.cachedSettings) return this.cachedSettings;
    return this.loadOrInitSettings();
  }

  async updateSettings(dto: UpdateSettingsDto): Promise<SystemSetting> {
    let settings = await this.getSettings();
    Object.assign(settings, dto);
    settings.updated_at = new Date();
    const updated = await this.settingsRepo.save(settings);
    this.cachedSettings = updated;
    this.logger.log(`Platform settings updated: ${JSON.stringify(dto)}`);
    return updated;
  }

  async getPublicLimits(): Promise<{
    free_tier_max_clicks: number;
    allow_guest_passwords: boolean;
    free_user_max_password_links: number;
    guest_expiration_minutes: number;
    allow_custom_alias_free: boolean;
    maintenance_mode: boolean;
  }> {
    const s = await this.getSettings();
    return {
      free_tier_max_clicks: s.free_tier_max_clicks,
      allow_guest_passwords: s.allow_guest_passwords,
      free_user_max_password_links: s.free_user_max_password_links,
      guest_expiration_minutes: s.guest_expiration_minutes,
      allow_custom_alias_free: s.allow_custom_alias_free,
      maintenance_mode: s.maintenance_mode,
    };
  }

  async getOverviewStats(): Promise<{
    totalUrls: number;
    totalClicks: number;
    totalUsers: number;
    guestUrls: number;
    lockedUrls: number;
    expiredUrls: number;
    activeUrls: number;
    todayClicks: number;
  }> {
    const totalUrls = await this.urlsRepo.count();
    const totalUsers = await this.usersRepo.count();
    const guestUrls = await this.urlsRepo.count({ where: { user_id: IsNull() } });
    const lockedUrls = await this.urlsRepo.count({
      where: { failed_password_attempts: MoreThanOrEqual(10) },
    });
    const activeUrls = await this.urlsRepo.count({ where: { is_active: true } });

    // Aggregate total clicks sum
    const totalClicksResult = await this.urlsRepo
      .createQueryBuilder('url')
      .select('COALESCE(SUM(url.clicks_count), 0)', 'total')
      .getRawOne();
    const totalClicks = parseInt(totalClicksResult?.total || '0', 10);

    // Expired URLs count
    const now = new Date();
    const expiredUrls = await this.urlsRepo
      .createQueryBuilder('url')
      .where('url.expires_at IS NOT NULL AND url.expires_at < :now', { now })
      .orWhere('url.max_clicks IS NOT NULL AND url.clicks_count >= url.max_clicks')
      .getCount();

    // Today's Clicks
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayClicks = await this.clicksRepo
      .createQueryBuilder('click')
      .where('click.created_at >= :startOfToday', { startOfToday })
      .getCount();

    return {
      totalUrls,
      totalClicks,
      totalUsers,
      guestUrls,
      lockedUrls,
      expiredUrls,
      activeUrls,
      todayClicks,
    };
  }

  async getAllUrls(
    page = 1,
    limit = 20,
    search?: string,
    filter?: string,
  ): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    const query = this.urlsRepo
      .createQueryBuilder('url')
      .leftJoinAndSelect('url.user', 'user')
      .orderBy('url.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (search && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      query.andWhere(
        '(LOWER(url.short_code) LIKE :q OR LOWER(url.title) LIKE :q OR LOWER(url.original_url) LIKE :q)',
        { q },
      );
    }

    if (filter === 'locked') {
      query.andWhere('url.failed_password_attempts >= 10');
    } else if (filter === 'guest') {
      query.andWhere('url.user_id IS NULL');
    } else if (filter === 'active') {
      query.andWhere('url.is_active = true');
    } else if (filter === 'inactive') {
      query.andWhere('url.is_active = false');
    } else if (filter === 'password') {
      query.andWhere('url.password_hash IS NOT NULL');
    }

    const [urls, total] = await query.getManyAndCount();

    const data = urls.map((u) => {
      const isExpired =
        (u.expires_at !== null && new Date() > u.expires_at) ||
        (u.max_clicks !== null && u.clicks_count >= u.max_clicks);

      return {
        id: u.id,
        short_code: u.short_code,
        original_url: u.original_url,
        title: u.title,
        clicks_count: u.clicks_count,
        max_clicks: u.max_clicks,
        is_active: u.is_active,
        is_expired: isExpired,
        has_password: Boolean(u.password_hash),
        failed_password_attempts: u.failed_password_attempts || 0,
        is_locked: (u.failed_password_attempts || 0) >= 10,
        expires_at: u.expires_at,
        created_at: u.created_at,
        user: u.user
          ? { id: u.user.id, name: u.user.name, email: u.user.email, role: u.user.role }
          : null,
        guest_id: u.guest_id,
      };
    });

    return { data, total, page, limit };
  }

  async toggleUrl(id: string): Promise<{ success: boolean; is_active: boolean }> {
    const url = await this.urlsRepo.findOne({ where: { id } });
    if (!url) {
      throw new NotFoundException(`URL with ID "${id}" not found.`);
    }

    url.is_active = !url.is_active;
    if (url.is_active) {
      url.failed_password_attempts = 0;
    }
    await this.urlsRepo.save(url);
    return { success: true, is_active: url.is_active };
  }

  async unlockUrl(id: string): Promise<{ success: boolean; message: string }> {
    const url = await this.urlsRepo.findOne({ where: { id } });
    if (!url) {
      throw new NotFoundException(`URL with ID "${id}" not found.`);
    }

    url.failed_password_attempts = 0;
    url.is_active = true;
    await this.urlsRepo.save(url);
    this.logger.log(`Admin unlocked URL /${url.short_code}`);
    return { success: true, message: `Route /${url.short_code} successfully unlocked.` };
  }

  async deleteUrl(id: string): Promise<{ success: boolean; message: string }> {
    const result = await this.urlsRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`URL with ID "${id}" not found.`);
    }
    return { success: true, message: 'URL permanently purged by Administrator.' };
  }

  async getAllUsers(
    page = 1,
    limit = 20,
    search?: string,
  ): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    const query = this.usersRepo
      .createQueryBuilder('user')
      .loadRelationCountAndMap('user.urlsCount', 'user.urls')
      .orderBy('user.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (search && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      query.where('(LOWER(user.email) LIKE :q OR LOWER(user.name) LIKE :q)', { q });
    }

    const [users, total] = await query.getManyAndCount();

    const data = users.map((u: any) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      plan: u.plan || 'free',
      plan_expires_at: u.plan_expires_at,
      is_active: u.is_active,
      created_at: u.created_at,
      urls_count: u.urlsCount || 0,
    }));

    return { data, total, page, limit };
  }

  async updateUserPlan(
    userId: string,
    plan: 'free' | 'pro' | 'enterprise',
  ): Promise<{ success: boolean; plan: string }> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');

    user.plan = plan;
    if (plan !== 'free') {
      user.plan_expires_at = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
    } else {
      user.plan_expires_at = null;
    }
    await this.usersRepo.save(user);
    this.logger.log(`User ${user.email} plan updated to ${user.plan}`);
    return { success: true, plan: user.plan };
  }

  async updateUserRole(
    userId: string,
    role: 'admin' | 'user',
  ): Promise<{ success: boolean; role: string }> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');

    user.role = role === 'admin' ? UserRole.ADMIN : UserRole.USER;
    await this.usersRepo.save(user);
    this.logger.log(`User ${user.email} role updated to ${user.role}`);
    return { success: true, role: user.role };
  }

  async updateUserStatus(
    userId: string,
    isActive: boolean,
  ): Promise<{ success: boolean; is_active: boolean }> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');

    user.is_active = isActive;
    await this.usersRepo.save(user);
    this.logger.log(`User ${user.email} status updated to is_active=${isActive}`);
    return { success: true, is_active: user.is_active };
  }
}
