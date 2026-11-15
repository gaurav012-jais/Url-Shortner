import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { uploadToCloudinary, configureCloudinary } from '../users/utils/cloudinary.util';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokensRepository: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    // Configure Cloudinary for profile picture uploads
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');
    if (cloudName && apiKey && apiSecret) {
      configureCloudinary(cloudName, apiKey, apiSecret);
    }
  }

  async register(registerDto: RegisterDto) {
    const { name, email, password } = registerDto;
    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await this.usersRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new ConflictException('An account with this email address already exists.');
    }

    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const user = this.usersRepository.create({
      name: name.trim(),
      email: normalizedEmail,
      password_hash,
      role: UserRole.USER,
      is_active: true,
    });

    const savedUser = await this.usersRepository.save(user);
    const tokens = await this.generateTokens(savedUser);

    return {
      user: this.sanitizeUser(savedUser),
      ...tokens,
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await this.usersRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (!user.is_active) {
      throw new UnauthorizedException('Your account has been deactivated. Please contact support.');
    }

    const tokens = await this.generateTokens(user);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async refreshTokens(refreshTokenDto: RefreshTokenDto) {
    const { refreshToken } = refreshTokenDto;

    try {
      const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
      if (!refreshSecret) {
        throw new Error('FATAL: JWT_REFRESH_SECRET is not set in environment.');
      }

      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: refreshSecret,
      });

      // Find token record in DB
      const user = await this.usersRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user || !user.is_active) {
        throw new UnauthorizedException('User account no longer active.');
      }

      // Find active refresh token in database
      const storedTokens = await this.refreshTokensRepository.find({
        where: { user_id: user.id, is_revoked: false },
      });

      let matchedTokenRecord: RefreshToken | null = null;
      for (const record of storedTokens) {
        const matches = await bcrypt.compare(refreshToken, record.token_hash);
        if (matches) {
          matchedTokenRecord = record;
          break;
        }
      }

      if (!matchedTokenRecord || new Date() > matchedTokenRecord.expires_at) {
        // Potential token reuse attack: revoke all tokens for this user
        await this.refreshTokensRepository.update(
          { user_id: user.id },
          { is_revoked: true },
        );
        throw new UnauthorizedException('Invalid, expired or reused refresh token.');
      }

      // Revoke the old token (Token Rotation)
      matchedTokenRecord.is_revoked = true;
      await this.refreshTokensRepository.save(matchedTokenRecord);

      // Generate new token pair
      const newTokens = await this.generateTokens(user);

      return {
        user: this.sanitizeUser(user),
        ...newTokens,
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }
  }

  async logout(userId: string) {
    await this.refreshTokensRepository.update(
      { user_id: userId, is_revoked: false },
      { is_revoked: true },
    );
    return { success: true, message: 'Logged out successfully.' };
  }

  async getProfile(userId: string) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User profile not found.');
    }

    return this.sanitizeUser(user);
  }

  private async generateTokens(user: User) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessSecret = this.configService.get<string>('JWT_ACCESS_SECRET');
    if (!accessSecret) {
      throw new Error('FATAL: JWT_ACCESS_SECRET is not set in environment.');
    }
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    if (!refreshSecret) {
      throw new Error('FATAL: JWT_REFRESH_SECRET is not set in environment.');
    }

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRATION', '15m'),
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION', '7d'),
      }),
    ]);

    // Save hashed refresh token in DB
    const tokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const refreshTokenEntity = this.refreshTokensRepository.create({
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
      is_revoked: false,
    });

    await this.refreshTokensRepository.save(refreshTokenEntity);

    return {
      accessToken,
      refreshToken,
    };
  }

  private sanitizeUser(user: User) {
    const { password_hash, ...safeUser } = user;
    return safeUser;
  }

  /**
   * Upload a new profile picture to Cloudinary and save the URL to the user record.
   * Security:
   *  - File MIME type must be image/* (enforced by Multer filter + server-side check)
   *  - File size max 2MB (enforced by Multer limits)
   *  - Cloudinary transforms the image to 256x256 face-crop to strip EXIF/metadata
   */
  async updateProfilePicture(
    userId: string,
    fileBuffer: Buffer,
    mimetype: string,
  ): Promise<{ profile_picture_url: string }> {
    // Server-side MIME validation (defense in depth — Multer filter is first line)
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimeTypes.includes(mimetype)) {
      throw new BadRequestException('Only JPEG, PNG, GIF, and WebP images are allowed.');
    }

    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');
    const cloudinaryUrl = this.configService.get<string>('CLOUDINARY_URL');

    if (!cloudinaryUrl && (!cloudName || !apiKey || !apiSecret)) {
      throw new BadRequestException(
        'Profile picture upload is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env.',
      );
    }

    // Configure Cloudinary for this request (idempotent)
    configureCloudinary(cloudName, apiKey, apiSecret, cloudinaryUrl);

    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');

    let url: string;
    try {
      url = await uploadToCloudinary(fileBuffer, userId);
    } catch (err: any) {
      const msg = err?.message || err?.error?.message || 'Cloudinary upload failed';
      throw new BadRequestException(`Cloudinary Error: ${msg}. Please check your Cloudinary Cloud Name and API keys in backend/.env.`);
    }

    user.profile_picture_url = url;
    await this.usersRepository.save(user);

    return { profile_picture_url: url };
  }
}

