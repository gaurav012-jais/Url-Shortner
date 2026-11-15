import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { User } from '../users/entities/user.entity';
import { Url } from '../urls/entities/url.entity';
import { SystemSetting } from '../admin/entities/system-setting.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Url, SystemSetting])],
  controllers: [SubscriptionController],
  providers: [SubscriptionService],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}

