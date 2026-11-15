import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Url } from './entities/url.entity';
import { User } from '../users/entities/user.entity';
import { SystemSetting } from '../admin/entities/system-setting.entity';
import { UrlsService } from './urls.service';
import { UrlsController } from './urls.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Url, SystemSetting, User])],
  controllers: [UrlsController],
  providers: [UrlsService],
  exports: [UrlsService],
})
export class UrlsModule {}

