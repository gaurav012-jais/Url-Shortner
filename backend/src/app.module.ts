import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { getDatabaseConfig } from './config/database.config';
import { UrlsModule } from './urls/urls.module';
import { RedirectsModule } from './redirects/redirects.module';
import { AuthModule } from './auth/auth.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AdminModule } from './admin/admin.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getDatabaseConfig,
    }),
    // VULN-06 FIX: Global rate limiting — 100 requests per 60 seconds per IP by default
    // Auth routes will override with stricter limits via @Throttle() decorator
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,   // 60 seconds window
        limit: 100,   // max 100 requests per window (global default)
      },
    ]),
    UrlsModule,
    RedirectsModule,
    AuthModule,
    AnalyticsModule,
    AdminModule,
    SubscriptionModule,
  ],
  controllers: [HealthController],
  providers: [
    // Apply ThrottlerGuard globally — individual routes can override with @Throttle()
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

