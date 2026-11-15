import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';

@Controller('health')
export class HealthController {
  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  async checkHealth(@Res() res: Response) {
    const isDbConnected = this.dataSource.isInitialized;
    const uptime = process.uptime();
    const env = this.configService.get<string>('NODE_ENV', 'development');

    let dbPing = false;
    try {
      if (isDbConnected) {
        await this.dataSource.query('SELECT 1');
        dbPing = true;
      }
    } catch {
      dbPing = false;
    }

    const isHealthy = isDbConnected && dbPing;

    if (env === 'production') {
      return res
        .status(isHealthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE)
        .json({ status: isHealthy ? 'ok' : 'degraded' });
    }

    return res.status(isHealthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).json({
      status: isHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(uptime),
      environment: env,
      database: {
        initialized: isDbConnected,
        ping: dbPing ? 'pong' : 'failed',
      },
    });
  }
}

