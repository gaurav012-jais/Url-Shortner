import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
const cookieParser = require('cookie-parser');

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  // Trust first proxy (Render, Cloudflare, AWS ALB) for accurate client IP resolution
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 5000);
  const frontendUrl = configService.get<string>('FRONTEND_URL', 'http://localhost:5173,http://localhost:3000');
  const isProd = configService.get<string>('NODE_ENV') === 'production';

  // HTTP security headers
  app.use(
    helmet({
      contentSecurityPolicy: isProd
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", 'data:', 'https:'],
              connectSrc: ["'self'"],
              fontSrc: ["'self'"],
              objectSrc: ["'none'"],
              frameSrc: ["'none'"],
            },
          }
        : false, // Disable CSP in development to avoid blocking HMR/dev tools
      crossOriginEmbedderPolicy: false, // Allow embedding for redirect pages
    }),
  );

  // Secure CORS Configuration (Supports Web & Capacitor Mobile Apps)
  const configuredOrigins = frontendUrl.split(',').map((u) => u.trim());
  const allowedOrigins: (string | RegExp)[] = isProd
    ? [
        ...configuredOrigins,
        'https://localhost',
        'capacitor://localhost',
        'http://localhost',
      ]
    : [
        ...configuredOrigins,
        'http://localhost:5173',
        'http://localhost:3000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:3000',
        'https://localhost',
        'capacitor://localhost',
        'http://localhost',
        /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/,
        /^http:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/,
      ];

  app.enableCors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global Validation Pipe for strict DTO checking
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  await app.listen(port);
  logger.log(`🚀 URL Shortener Backend running on: http://localhost:${port}`);
  logger.log(`🔗 API Base: http://localhost:${port}/api/urls`);
}

bootstrap();

