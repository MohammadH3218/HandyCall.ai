import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bodyParser from 'body-parser';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const corsOriginsRaw = configService.get<string>('CORS_ORIGINS') || '';
  const corsOrigins = corsOriginsRaw.split(',').map((o) => o.trim()).filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (corsOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'x-company-id'],
  });

  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
    if (configService.get<string>('NODE_ENV') === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
    next();
  });

  app.use((req: Request & { requestId?: string }, res: Response, next: NextFunction) => {
    const existingRequestId = req.header('x-request-id') || req.header('x-vercel-id');
    const requestId = existingRequestId || randomUUID();
    req.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    next();
  });

  // HyperPay/Moyasar payment webhooks need raw body for signature verification
  const apiPrefix = configService.get<string>('API_PREFIX') || 'api/v1';
  app.use(`/${apiPrefix}/payments/webhook`, bodyParser.raw({ type: 'application/json', limit: '256kb' }));
  app.use(bodyParser.json({ limit: '20mb' }));
  app.use(bodyParser.urlencoded({ extended: true, limit: '1mb' }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.setGlobalPrefix(apiPrefix);

  const port = process.env['PORT'] || configService.get<number>('PORT') || 3000;
  await app.listen(port, '0.0.0.0');

  console.log(`HandyCall Saudi Marketplace API running on: http://localhost:${port}/${apiPrefix}`);
  console.log(`Region: ${configService.get<string>('AWS_REGION') || 'me-central-1'}`);
  console.log(`Environment: ${configService.get<string>('NODE_ENV')}`);
}

void bootstrap();
