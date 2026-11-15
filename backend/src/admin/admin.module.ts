import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { SystemSetting } from './entities/system-setting.entity';
import { Url } from '../urls/entities/url.entity';
import { User } from '../users/entities/user.entity';
import { Click } from '../analytics/entities/click.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SystemSetting, Url, User, Click])],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}

