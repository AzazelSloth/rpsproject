import 'dotenv/config';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const apiPrefix = 'api';
  const swaggerPath = process.env.SWAGGER_PATH ?? 'api-docs';

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

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
}
void bootstrap();
