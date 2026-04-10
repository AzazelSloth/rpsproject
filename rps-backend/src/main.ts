import 'dotenv/config';
import express from 'express';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: true,
  });
  const apiPrefix = 'api';
  const swaggerPath = process.env.SWAGGER_PATH ?? 'api-docs';

  // Augmente les limites de taille pour les uploads CSV volumineux
  app.use(express.json({ limit: '50mb' }));
  app.use(express.text({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  app.setGlobalPrefix(apiPrefix);

  const corsOrigin =
    process.env.CORS_ORIGIN?.split(',') || 'http://localhost:3001';
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  app.use((request, response, next) => {
    if (
      request.originalUrl.startsWith(`/${swaggerPath}`) ||
      request.originalUrl.startsWith(`/${apiPrefix}/${swaggerPath}`)
    ) {
      next();
      return;
    }

    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    next();
  });
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
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

  if (process.env.SWAGGER_ENABLED !== 'false') {
    const config = new DocumentBuilder()
      .setTitle('RPS Backend API')
      .setDescription('Documentation des endpoints du backend NestJS.')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);

    SwaggerModule.setup(swaggerPath, app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  await app.listen(process.env.PORT ?? 3000, () => {
    const server = app.getHttpServer();
    // Augmente les timeouts pour les connexions lentes (Starlink, etc.)
    server.keepAliveTimeout = 90000; // 90s
    server.headersTimeout = 100000; // 100s
    server.requestTimeout = 120000; // 120s
  });
}

bootstrap();
