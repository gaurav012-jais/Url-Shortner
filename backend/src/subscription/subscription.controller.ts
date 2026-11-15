import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { UpgradePlanDto } from './dto/upgrade-plan.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('plans')
  async getPlans() {
    return this.subscriptionService.getPlans();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMySubscription(@Req() req: any) {
    return this.subscriptionService.getUserSubscription(req.user.id);
  }

  @Post('upgrade')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async upgradePlan(@Req() req: any, @Body() dto: UpgradePlanDto) {
    return this.subscriptionService.upgradePlan(req.user.id, dto);
  }

  @Post('cancel')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async cancelSubscription(@Req() req: any) {
    return this.subscriptionService.cancelSubscription(req.user.id);
  }
}

