import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Url } from '../urls/entities/url.entity';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { Click } from '../analytics/entities/click.entity';
import { SystemSetting } from '../admin/entities/system-setting.entity';

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  const isProduction = configService.get<string>('NODE_ENV') === 'production';
  const databaseUrl = configService.get<string>('DATABASE_URL') || configService.get<string>('DB_URL');
  const dbSsl = configService.get<string>('DB_SSL');
  const isCloudDb = databaseUrl && (databaseUrl.includes('supabase.co') || databaseUrl.includes('neon.tech') || databaseUrl.includes('pooler'));
  const useSsl = dbSsl === 'true' || isCloudDb || (isProduction && dbSsl !== 'false');

  const baseConfig: TypeOrmModuleOptions = {
    type: 'postgres',
    entities: [Url, User, RefreshToken, Click, SystemSetting],
    // NEVER synchronize schema automatically in production — prevents accidental data loss
    synchronize: !isProduction,
    // Automatically run generated migrations on startup in production
    migrationsRun: isProduction,
    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
    logging: configService.get<string>('NODE_ENV') === 'development',
    // Production Connection Pooling to prevent connection exhaust and memory leaks
    extra: {
      max: parseInt(configService.get<string>('DB_POOL_MAX', '20'), 10),
      min: parseInt(configService.get<string>('DB_POOL_MIN', '2'), 10),
      idleTimeoutMillis: parseInt(configService.get<string>('DB_IDLE_TIMEOUT', '30000'), 10),
      connectionTimeoutMillis: parseInt(configService.get<string>('DB_CONN_TIMEOUT', '5000'), 10),
    },
    ssl: useSsl ? { rejectUnauthorized: false } : false,
  };

  // Support single DATABASE_URL connection string (standard on Railway, Render, Supabase, Neon)
  if (databaseUrl) {
    return {
      ...baseConfig,
      url: databaseUrl,
    };
  }

  // Individual parameters for local Docker or custom cluster
  return {
    ...baseConfig,
    host: configService.get<string>('DB_HOST', 'localhost'),
    port: parseInt(configService.get<string>('DB_PORT', '5435'), 10),
    username: configService.get<string>('DB_USERNAME', 'postgres'),
    password: configService.get<string>('DB_PASSWORD', 'postgrespassword'),
    database: configService.get<string>('DB_NAME', 'url_shortener'),
  };
};
