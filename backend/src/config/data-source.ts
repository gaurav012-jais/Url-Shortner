import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { Url } from '../urls/entities/url.entity';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { Click } from '../analytics/entities/click.entity';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const databaseUrl = process.env.DATABASE_URL;
const dbSsl = process.env.DB_SSL;
const useSsl = dbSsl === 'true' || (isProduction && dbSsl !== 'false');

export const AppDataSource = new DataSource(
  databaseUrl
    ? {
        type: 'postgres',
        url: databaseUrl,
        entities: [Url, User, RefreshToken, Click],
        migrations: [__dirname + '/../migrations/*{.ts,.js}'],
        ssl: useSsl ? { rejectUnauthorized: false } : false,
      }
    : {
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5435', 10),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgrespassword',
        database: process.env.DB_NAME || 'url_shortener',
        entities: [Url, User, RefreshToken, Click],
        migrations: [__dirname + '/../migrations/*{.ts,.js}'],
        ssl: useSsl ? { rejectUnauthorized: false } : false,
      },
);

