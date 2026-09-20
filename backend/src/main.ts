import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  const port =
    configService.get<number>('PORT') || 4000;

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'https://life-rpg-beige-three.vercel.app',
      'https://localhost',
      'capacitor://localhost',
    ],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // ================================
  // Swagger Configuration
  // ================================

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Life RPG API')
    .setDescription(
      'Life RPG backend API documentation',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const swaggerDocument =
    SwaggerModule.createDocument(
      app,
      swaggerConfig,
    );

  SwaggerModule.setup(
    'api',
    app,
    swaggerDocument,
  );

  // ================================
  // Start Server
  // ================================

  await app.listen(port);

  console.log(
    `🚀 Life RPG API running on http://localhost:${port}`,
  );

  console.log(
    `📚 Swagger Docs available at http://localhost:${port}/api`,
  );
}

bootstrap();