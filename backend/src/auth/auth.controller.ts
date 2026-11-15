import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { memoryStorage } from 'multer';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Rate limit on register: 5 attempts per 60s
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  // Rate limit on login: 5 attempts per 60s
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshTokens(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshTokens(refreshTokenDto);
  }

  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser('id') userId: string) {
    return this.authService.logout(userId);
  }

  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@CurrentUser('id') userId: string) {
    return this.authService.getProfile(userId);
  }

  /**
   * POST /api/auth/profile-picture
   * Upload a profile picture (multipart/form-data, field name: "avatar")
   * Security:
   *  - Requires JWT authentication
   *  - Multer enforces 2MB size limit and image MIME type filter
   *  - Additional server-side MIME check in AuthService
   *  - File is stored in memory buffer (never written to disk on the server)
   *  - Uploaded to Cloudinary with EXIF-stripping transform
   */
  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  @Post('profile-picture')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: memoryStorage(), // Store in RAM buffer — never on disk
      limits: {
        fileSize: 2 * 1024 * 1024, // 2MB max
        files: 1,
      },
      fileFilter: (_req, file, callback) => {
        // Whitelist image MIME types — reject everything else
        const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowed.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(
            new BadRequestException('Only JPEG, PNG, GIF, and WebP images are allowed.'),
            false,
          );
        }
      },
    }),
  )
  async uploadProfilePicture(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded. Send the image as a multipart field named "avatar".');
    }
    return this.authService.updateProfilePicture(userId, file.buffer, file.mimetype);
  }
}

