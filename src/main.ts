/* eslint-disable prettier/prettier */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Multiple CORS Origins
  // const allowedOrigins = [
  //   'http://localhost:5173',
  //   'http://localhost:3000',
  //   ...(process.env.FRONTEND_URL
  //     ? process.env.FRONTEND_URL.split(',')
  //     : []),
  // ];

  // app.enableCors({
  //   origin: allowedOrigins,
  //   credentials: true,
  //   methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  //   allowedHeaders: ['Content-Type', 'Authorization'],
  // });

  app.enableCors({
    origin:true,
    credentials: true,
  });

  // Global API prefix
  app.setGlobalPrefix('api/v1');

  // Swagger config with Bearer Auth
  const config = new DocumentBuilder()
    .setTitle('Smart Flow HQ API')
    .setDescription('The API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Server is running on port ${process.env.PORT ?? 3000}`);
}

void bootstrap();
