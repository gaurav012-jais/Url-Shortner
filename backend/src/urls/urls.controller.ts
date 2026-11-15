import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { UrlsService } from './urls.service';
import { CreateUrlDto } from './dto/create-url.dto';
import { BulkCreateUrlDto } from './dto/bulk-create-url.dto';
import { UrlResponseDto } from './dto/url-response.dto';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('api/urls')
@UseGuards(OptionalJwtAuthGuard)
export class UrlsController {
  constructor(private readonly urlsService: UrlsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createUrlDto: CreateUrlDto,
    @CurrentUser() user: User | null,
    @Headers('x-guest-id') guestId?: string,
  ): Promise<UrlResponseDto> {
    return this.urlsService.create(createUrlDto, user?.id, guestId);
  }

  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  async createBulk(
    @Body() bulkDto: BulkCreateUrlDto,
    @CurrentUser() user: User | null,
    @Headers('x-guest-id') guestId?: string,
  ) {
    return this.urlsService.createBulk(bulkDto, user?.id, guestId);
  }

  @Get()
  async findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @CurrentUser() user: User | null,
    @Headers('x-guest-id') guestId?: string,
  ): Promise<{ data: UrlResponseDto[]; total: number; page: number; limit: number }> {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    return this.urlsService.findAll(pageNum, limitNum, user?.id, user?.role, guestId);
  }

  @Get('preview/:code')
  async getPreview(@Param('code') code: string): Promise<UrlResponseDto> {
    return this.urlsService.getPreview(code);
  }

  @Post('claim-guest')
  @UseGuards(JwtAuthGuard)
  async claimGuest(
    @Body('guestId') guestId: string,
    @CurrentUser() user: User,
  ): Promise<{ claimed: number }> {
    return this.urlsService.claimGuestUrls(guestId, user.id);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: User | null,
    @Headers('x-guest-id') guestId?: string,
  ): Promise<UrlResponseDto> {
    return this.urlsService.findOne(id, user?.id, user?.role, guestId);
  }

  @Patch(':id/toggle')
  async toggleActive(
    @Param('id') id: string,
    @CurrentUser() user: User | null,
    @Headers('x-guest-id') guestId?: string,
  ): Promise<UrlResponseDto> {
    return this.urlsService.toggleActive(id, user?.id, user?.role, guestId);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: User | null,
    @Headers('x-guest-id') guestId?: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.urlsService.remove(id, user?.id, user?.role, guestId);
  }
}
