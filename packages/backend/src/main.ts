import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bodyParser from 'body-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // ✅ CORS
  const corsOriginsRaw = configService.get<string>('CORS_ORIGINS') || '';
  const corsOrigins = corsOriginsRaw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      // allow server-to-server / curl (no origin)
      if (!origin) return callback(null, true);

      // allow exact matches from env list
      if (corsOrigins.includes(origin)) return callback(null, true);

      return callback(new Error(`CORS blocked origin: ${origin}`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Stripe webhook needs raw body for signature verification
  const apiPrefix = configService.get<string>('API_PREFIX') || 'api/v1';
  app.use(`/${apiPrefix}/billing/webhook`, bodyParser.raw({ type: 'application/json' }));

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  // API prefix
  app.setGlobalPrefix(apiPrefix);

  // Elastic Beanstalk uses PORT environment variable
  const port = process.env.PORT || configService.get<number>('PORT') || 3000;
  await app.listen(port, '0.0.0.0'); // ✅ bind properly for EB/proxy

  console.log(`🚀 HandyCall API is running on: http://localhost:${port}/${apiPrefix}`);
  console.log(`📚 Environment: ${configService.get<string>('NODE_ENV')}`);
}

bootstrap();
