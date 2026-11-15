import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('api/analytics')
@UseGuards(OptionalJwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  async getOverview(@CurrentUser() user: User | null) {
    return this.analyticsService.getOverview(user?.id, user?.role);
  }

  @Get(':urlId')
  async getUrlAnalytics(
    @Param('urlId') urlId: string,
    @CurrentUser() user: User | null,
  ) {
    return this.analyticsService.getUrlAnalytics(urlId, user?.id, user?.role);
  }
}

