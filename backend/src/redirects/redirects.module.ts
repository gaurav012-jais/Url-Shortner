import { Module } from '@nestjs/common';
import { RedirectsController } from './redirects.controller';
import { UrlsModule } from '../urls/urls.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [UrlsModule, AnalyticsModule, AdminModule],
  controllers: [RedirectsController],
})
export class RedirectsModule {}

