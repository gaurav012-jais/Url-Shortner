import {
  Injectable,
  NotFoundException,
  ConflictException,
  GoneException,
  BadRequestException,
  ForbiddenException,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { customAlphabet } from 'nanoid';
import * as QRCode from 'qrcode';
import * as bcrypt from 'bcrypt';
import { Url } from './entities/url.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { CreateUrlDto } from './dto/create-url.dto';
import { BulkCreateUrlDto } from './dto/bulk-create-url.dto';
import { UrlResponseDto } from './dto/url-response.dto';
import { fetchUrlMetadata } from './utils/metadata-fetcher.util';

// 62 alphanumeric characters (Base62)
const BASE62_ALPHABET =
  '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const generateBase62 = customAlphabet(BASE62_ALPHABET, 7);

import { SystemSetting } from '../admin/entities/system-setting.entity';

const RESERVED_SLUGS = new Set([
  'api',
  'admin',
  'login',
  'register',
  'auth',
  'dashboard',
  'preview',
  'health',
  'settings',
  'profile',
  'subscription',
  'urls',
  'users',
  'redirect',
  'help',
  'about',
  'terms',
  'privacy',
  'static',
  'public',
  'assets',
  'favicon.ico',
  'robots.txt',
  'sitemap.xml',
]);

@Injectable()
export class UrlsService implements OnModuleInit, OnModuleDestroy {
  private readonly baseUrl: string;
  private readonly logger = new Logger(UrlsService.name);
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(
    @InjectRepository(Url)
    private readonly urlsRepository: Repository<Url>,
    @InjectRepository(SystemSetting)
    private readonly settingsRepo: Repository<SystemSetting>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl =
      this.configService.get<string>('BASE_URL') || 'http://localhost:5000';
  }

  async onModuleInit() {
    // Ensure failed_password_attempts and guest_id columns exist in the database
    try {
      await this.urlsRepository.query(`
        ALTER TABLE "urls" ADD COLUMN IF NOT EXISTS "failed_password_attempts" integer NOT NULL DEFAULT 0;
        ALTER TABLE "urls" ADD COLUMN IF NOT EXISTS "guest_id" character varying(64);
        CREATE INDEX IF NOT EXISTS "idx_urls_guest_id" ON "urls" ("guest_id");
      `);
    } catch {
      // Ignore if table doesn't exist yet or column already created
    }

    // Run cleanup on server startup after a small delay
    setTimeout(() => this.cleanupOldGuestLinks(), 5000);

    // Schedule cleanup to run every 6 hours
    this.cleanupTimer = setInterval(() => {
      this.cleanupOldGuestLinks();
    }, 6 * 60 * 60 * 1000);
  }

  onModuleDestroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }

  async cleanupOldGuestLinks(): Promise<number> {
    try {
      // Retention policy: Clean up guest links that expired more than 7 days ago
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const result = await this.urlsRepository
        .createQueryBuilder()
        .delete()
        .from(Url)
        .where('user_id IS NULL AND expires_at < :sevenDaysAgo', { sevenDaysAgo })
        .execute();

      if (result.affected && result.affected > 0) {
        this.logger.log(`🧹 Auto-cleanup: Removed ${result.affected} expired guest URLs older than 7 days.`);
      }
      return result.affected || 0;
    } catch (err: any) {
      this.logger.error('Failed to run guest URL cleanup:', err?.message);
      return 0;
    }
  }

  async create(
    createUrlDto: CreateUrlDto,
    userId?: string,
    guestId?: string,
  ): Promise<UrlResponseDto> {
    const { original_url, custom_alias, title, expires_at, max_clicks, domain, tags, password } =
      createUrlDto;

    let shortCode: string;
    let isCustom = false;

    // Load current system settings to enforce tier policies
    const settingsRows = await this.settingsRepo.find({
      order: { updated_at: 'DESC' },
      take: 1,
    });
    const settings = settingsRows[0] || null;

    if (settings?.maintenance_mode) {
      throw new BadRequestException(
        'Platform is in maintenance mode. Link creation is temporarily suspended.',
      );
    }

    if (!userId && custom_alias && settings && !settings.allow_custom_alias_free) {
      throw new BadRequestException(
        'Custom vanity aliases require a registered account. Please sign in to choose custom aliases.',
      );
    }

    if (!userId && password && settings && !settings.allow_guest_passwords) {
      throw new BadRequestException(
        'Passcode protection requires a registered account. Please sign in or register to protect links with a passcode.',
      );
    }

    if (userId && password) {
      const user = await this.usersRepo.findOne({ where: { id: userId } });
      if (user && user.role !== UserRole.ADMIN && (user.plan === 'free' || !user.plan)) {
        const passwordLinksCount = await this.urlsRepository.count({
          where: { user_id: userId, password_hash: Not(IsNull()) },
        });
        const maxPasswordLinks = settings?.free_user_max_password_links ?? 5;
        if (passwordLinksCount >= maxPasswordLinks) {
          throw new BadRequestException(
            `Free Starter plan allows up to ${maxPasswordLinks} password-protected links. You currently have ${passwordLinksCount}. Upgrade to Pro for unlimited passcode locks.`,
          );
        }
      }
    }

    // VULN-05 & VULN-13 FIX: Restrict custom branded domains to Pro/Enterprise/Admin
    if (domain && domain.trim()) {
      if (!userId) {
        throw new ForbiddenException('Custom branded domains require a Pro or Enterprise subscription.');
      }
      const user = await this.usersRepo.findOne({ where: { id: userId } });
      if (user && user.role !== UserRole.ADMIN && (user.plan === 'free' || !user.plan)) {
        throw new ForbiddenException('Custom branded domains require a Pro or Enterprise subscription.');
      }
    }

    if (custom_alias) {
      const normalizedAlias = custom_alias.trim();

      if (RESERVED_SLUGS.has(normalizedAlias.toLowerCase())) {
        throw new BadRequestException(
          `The alias "${normalizedAlias}" is a reserved system keyword. Please choose another.`,
        );
      }

      const existing = await this.urlsRepository.findOne({
        where: { short_code: normalizedAlias },
      });

      if (existing) {
        throw new ConflictException(
          `The custom alias "${normalizedAlias}" is already taken. Please choose another.`,
        );
      }

      shortCode = normalizedAlias;
      isCustom = true;
    } else {
      // Generate unique Base62 short code with collision handling
      let attempts = 0;
      const maxAttempts = 10;
      let generatedCode = '';

      while (attempts < maxAttempts) {
        generatedCode = generateBase62();
        if (RESERVED_SLUGS.has(generatedCode.toLowerCase())) {
          attempts++;
          continue;
        }

        const existing = await this.urlsRepository.findOne({
          where: { short_code: generatedCode },
        });

        if (!existing) {
          break;
        }
        attempts++;
      }

      if (attempts >= maxAttempts) {
        throw new ConflictException(
          'Failed to generate unique short code. Please try again.',
        );
      }

      shortCode = generatedCode;
    }

    // Auto-fetch metadata (Title & Favicon) if title is not provided
    let finalTitle = title ? title.trim() : null;
    let finalFavicon: string | null = null;

    try {
      const metadata = await fetchUrlMetadata(original_url);
      if (!finalTitle && metadata.title) {
        finalTitle = metadata.title;
      }
      finalFavicon = metadata.favicon;
    } catch {
      // Continue without blocking
    }

    // Expiration Logic:
    // Guest users (no userId): controlled by system settings (default: 15 minutes)
    // Authenticated users: permanent by default (expires_at is null), or user-defined custom expires_at
    const guestMinutes = settings?.guest_expiration_minutes || 15;
    let finalExpiresAt: Date | null = null;
    if (!userId) {
      finalExpiresAt = new Date(Date.now() + guestMinutes * 60 * 1000);
    } else {
      finalExpiresAt = expires_at ? new Date(expires_at) : null;
    }

    // Optional password protection hash
    let passwordHash: string | null = null;
    if (password && password.trim().length > 0) {
      passwordHash = await bcrypt.hash(password.trim(), 10);
    }

    const url = this.urlsRepository.create({
      original_url,
      short_code: shortCode,
      domain: domain ? domain.trim() : null,
      tags: tags && tags.length ? tags : null,
      user_id: userId || null,
      guest_id: userId ? null : (guestId || null),
      is_custom_alias: isCustom,
      title: finalTitle,
      favicon: finalFavicon,
      is_active: true,
      max_clicks: max_clicks || null,
      expires_at: finalExpiresAt,
      clicks_count: 0,
      password_hash: passwordHash,
      failed_password_attempts: 0,
    });

    const savedUrl = await this.urlsRepository.save(url);
    return this.toResponseDto(savedUrl, true);
  }

  async createBulk(
    bulkDto: BulkCreateUrlDto,
    userId?: string,
    guestId?: string,
  ): Promise<{
    created: UrlResponseDto[];
    failed: { original_url: string; reason: string }[];
    total: number;
    success_count: number;
    failure_count: number;
  }> {
    const created: UrlResponseDto[] = [];
    const failed: { original_url: string; reason: string }[] = [];

    for (const item of bulkDto.urls) {
      try {
        const result = await this.create(item, userId, guestId);
        created.push(result);
      } catch (err: any) {
        failed.push({
          original_url: item.original_url,
          reason: err?.message || 'Failed to shorten URL',
        });
      }
    }

    return {
      created,
      failed,
      total: bulkDto.urls.length,
      success_count: created.length,
      failure_count: failed.length,
    };
  }

  async findByCode(shortCode: string, increment = true): Promise<Url> {
    const url = await this.urlsRepository.findOne({
      where: { short_code: shortCode },
      relations: ['user'],
    });

    if (!url) {
      throw new NotFoundException(
        `Short URL with code "${shortCode}" does not exist.`,
      );
    }

    if (!url.is_active) {
      if ((url.failed_password_attempts || 0) >= 10) {
        throw new GoneException(
          'This short URL has been permanently locked because 10 failed passcode attempts were exceeded.',
        );
      }
      throw new GoneException('This short URL has been disabled by the owner.');
    }

    if (url.expires_at && new Date() > url.expires_at) {
      throw new GoneException(
        url.user_id
          ? 'This short URL has expired.'
          : 'This short link was created in Guest Mode and expired after 15 minutes. Please sign in to create permanent links.',
      );
    }

    if (url.max_clicks !== null && url.clicks_count >= url.max_clicks) {
      throw new GoneException(
        'This short URL has reached its maximum allowed click limit.',
      );
    }

    if (increment) {
      // Increment click count atomically
      await this.urlsRepository.increment({ id: url.id }, 'clicks_count', 1);
      url.clicks_count += 1;
    }

    return url;
  }

  async incrementClicks(urlId: string): Promise<void> {
    await this.urlsRepository.increment({ id: urlId }, 'clicks_count', 1);
  }

  async getPreview(shortCode: string): Promise<UrlResponseDto> {
    const url = await this.urlsRepository.findOne({
      where: { short_code: shortCode },
    });

    if (!url) {
      throw new NotFoundException(
        `Short URL with code "${shortCode}" does not exist.`,
      );
    }

    return this.toResponseDto(url, true);
  }

  async findAll(
    page = 1,
    limit = 20,
    userId?: string,
    userRole?: string,
    guestId?: string,
  ): Promise<{ data: UrlResponseDto[]; total: number; page: number; limit: number }> {
    const where: any = {};
    if (userRole === 'admin') {
      // Admin sees all links
    } else if (userId) {
      where.user_id = userId;
    } else if (guestId) {
      where.user_id = IsNull();
      where.guest_id = guestId;
    } else {
      // No user and no guest session token: return empty for privacy
      where.id = '00000000-0000-0000-0000-000000000000';
    }

    const [urls, total] = await this.urlsRepository.findAndCount({
      where,
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const data = await Promise.all(
      urls.map((url) => this.toResponseDto(url, false)),
    );

    return { data, total, page, limit };
  }

  async findOne(
    id: string,
    userId?: string,
    userRole?: string,
    guestId?: string,
  ): Promise<UrlResponseDto> {
    const url = await this.urlsRepository.findOne({ where: { id } });
    if (!url) {
      throw new NotFoundException(`URL with ID "${id}" not found.`);
    }

    if (userRole !== 'admin') {
      const isOwner = url.user_id
        ? url.user_id === userId
        : Boolean(url.guest_id && guestId && url.guest_id === guestId);
      if (!isOwner) {
        throw new ForbiddenException('You do not have permission to access this URL.');
      }
    }

    return this.toResponseDto(url, true);
  }

  async toggleActive(
    id: string,
    userId?: string,
    userRole?: string,
    guestId?: string,
  ): Promise<UrlResponseDto> {
    const url = await this.urlsRepository.findOne({ where: { id } });
    if (!url) {
      throw new NotFoundException(`URL with ID "${id}" not found.`);
    }

    if (userRole !== 'admin') {
      const isOwner = url.user_id
        ? url.user_id === userId
        : Boolean(url.guest_id && guestId && url.guest_id === guestId);
      if (!isOwner) {
        throw new ForbiddenException('You do not have permission to modify this URL.');
      }
    }

    url.is_active = !url.is_active;
    if (url.is_active) {
      url.failed_password_attempts = 0;
    }
    const updated = await this.urlsRepository.save(url);
    return this.toResponseDto(updated, false);
  }

  async recordFailedPasswordAttempt(urlId: string): Promise<{
    failedAttempts: number;
    isBlocked: boolean;
    remainingAttempts: number;
  }> {
    const url = await this.urlsRepository.findOne({ where: { id: urlId } });
    if (!url) {
      return { failedAttempts: 0, isBlocked: false, remainingAttempts: 10 };
    }

    const newAttempts = (url.failed_password_attempts || 0) + 1;
    const isBlocked = newAttempts >= 10;

    await this.urlsRepository.update(
      { id: urlId },
      {
        failed_password_attempts: newAttempts,
        ...(isBlocked ? { is_active: false } : {}),
      },
    );

    return {
      failedAttempts: newAttempts,
      isBlocked,
      remainingAttempts: Math.max(0, 10 - newAttempts),
    };
  }

  async resetFailedPasswordAttempts(urlId: string): Promise<void> {
    await this.urlsRepository.update(
      { id: urlId },
      { failed_password_attempts: 0 },
    );
  }

  async remove(
    id: string,
    userId?: string,
    userRole?: string,
    guestId?: string,
  ): Promise<{ success: boolean; message: string }> {
    const url = await this.urlsRepository.findOne({ where: { id } });
    if (!url) {
      throw new NotFoundException(`URL with ID "${id}" not found.`);
    }

    if (userRole !== 'admin') {
      const isOwner = url.user_id
        ? url.user_id === userId
        : Boolean(url.guest_id && guestId && url.guest_id === guestId);
      if (!isOwner) {
        throw new ForbiddenException('You do not have permission to delete this URL.');
      }
    }

    const result = await this.urlsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`URL with ID "${id}" not found.`);
    }
    return { success: true, message: 'URL deleted successfully.' };
  }

  async claimGuestUrls(
    guestId: string,
    userId: string,
  ): Promise<{ claimed: number }> {
    if (!guestId || !userId) return { claimed: 0 };
    // VULN-17 FIX: Validate guestId format strictly (prevent arbitrary / wildcards)
    if (!/^guest_[a-zA-Z0-9_-]{8,64}$/.test(guestId)) {
      return { claimed: 0 };
    }
    // When a guest registers or logs in, claim the links AND upgrade them to permanent (expires_at = null)
    const result = await this.urlsRepository
      .createQueryBuilder()
      .update(Url)
      .set({ user_id: userId, guest_id: null, expires_at: null })
      .where('guest_id = :guestId AND user_id IS NULL', { guestId })
      .execute();

    if (result.affected && result.affected > 0) {
      this.logger.log(`Transferred and converted ${result.affected} guest links to permanent user links for "${userId}"`);
    }

    return { claimed: result.affected || 0 };
  }

  async generateQrCode(shortUrl: string): Promise<string> {
    try {
      return await QRCode.toDataURL(shortUrl, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 300,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
    } catch {
      return '';
    }
  }

  private async toResponseDto(
    url: Url,
    includeQr = false,
  ): Promise<UrlResponseDto> {
    let baseUrlToUse = this.baseUrl;
    // VULN-05 FIX: Safely parse and restrict domain protocol to http/https
    if (url.domain) {
      const cleanDomain = url.domain.trim().replace(/[\r\n\t]/g, '');
      try {
        const parsed = cleanDomain.startsWith('http://') || cleanDomain.startsWith('https://')
          ? new URL(cleanDomain)
          : new URL(`https://${cleanDomain}`);
        if (['http:', 'https:'].includes(parsed.protocol)) {
          baseUrlToUse = `${parsed.protocol}//${parsed.host}`;
        }
      } catch {
        baseUrlToUse = this.baseUrl;
      }
    }
    const short_url = `${baseUrlToUse}/${url.short_code}`;
    const is_expired =
      (url.expires_at !== null && new Date() > url.expires_at) ||
      (url.max_clicks !== null && url.clicks_count >= url.max_clicks);

    let qr_code: string | undefined;
    if (includeQr) {
      qr_code = await this.generateQrCode(short_url);
    }

    return {
      id: url.id,
      original_url: url.original_url,
      short_code: url.short_code,
      domain: url.domain,
      tags: url.tags || [],
      short_url,
      title: url.title,
      favicon: url.favicon,
      is_custom_alias: url.is_custom_alias,
      is_active: url.is_active,
      clicks_count: url.clicks_count,
      max_clicks: url.max_clicks,
      expires_at: url.expires_at,
      is_expired,
      has_password: Boolean(url.password_hash),
      failed_password_attempts: url.failed_password_attempts || 0,
      qr_code,
      created_at: url.created_at,
      updated_at: url.updated_at,
    };
  }
}

