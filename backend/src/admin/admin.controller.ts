import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Controller('api/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // Public endpoint for frontend to check limits (e.g. is guest password allowed, free click limits)
  @Get('public-limits')
  async getPublicLimits() {
    return this.adminService.getPublicLimits();
  }

  // All endpoints below require Admin privileges (AdminGuard)
  @Get('overview')
  @UseGuards(AdminGuard)
  async getOverview() {
    return this.adminService.getOverviewStats();
  }

  @Get('settings')
  @UseGuards(AdminGuard)
  async getSettings() {
    return this.adminService.getSettings();
  }

  @Patch('settings')
  @UseGuards(AdminGuard)
  async updateSettings(@Body() dto: UpdateSettingsDto) {
    return this.adminService.updateSettings(dto);
  }

  @Get('urls')
  @UseGuards(AdminGuard)
  async getUrls(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search?: string,
    @Query('filter') filter?: string,
  ) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    return this.adminService.getAllUrls(pageNum, limitNum, search, filter);
  }

  @Patch('urls/:id/toggle')
  @UseGuards(AdminGuard)
  async toggleUrl(@Param('id') id: string) {
    return this.adminService.toggleUrl(id);
  }

  @Post('urls/:id/unlock')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  async unlockUrl(@Param('id') id: string) {
    return this.adminService.unlockUrl(id);
  }

  @Delete('urls/:id')
  @UseGuards(AdminGuard)
  async deleteUrl(@Param('id') id: string) {
    return this.adminService.deleteUrl(id);
  }

  @Get('users')
  @UseGuards(AdminGuard)
  async getUsers(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search?: string,
  ) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    return this.adminService.getAllUsers(pageNum, limitNum, search);
  }

  @Patch('users/:id/role')
  @UseGuards(AdminGuard)
  async updateUserRole(
    @Param('id') id: string,
    @Body('role') role: 'admin' | 'user',
  ) {
    return this.adminService.updateUserRole(id, role);
  }

  @Patch('users/:id/plan')
  @UseGuards(AdminGuard)
  async updateUserPlan(
    @Param('id') id: string,
    @Body('plan') plan: 'free' | 'pro' | 'enterprise',
  ) {
    return this.adminService.updateUserPlan(id, plan);
  }

  @Patch('users/:id/status')
  @UseGuards(AdminGuard)
  async updateUserStatus(
    @Param('id') id: string,
    @Body('is_active') isActive: boolean,
  ) {
    return this.adminService.updateUserStatus(id, isActive);
  }
}

