import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { ResponseEnvelopeInterceptor, AllExceptionsFilter } from './common/interceptors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService);

  // Behind Render's proxy: trust X-Forwarded-For so req.ip is the real client.
  // Without this the rate limiter sees one upstream IP for everyone and throttles
  // a whole class of students sharing the same login burst.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  app.use(helmet());
  app.use(cookieParser());
  app.setGlobalPrefix('api/v1');

  app.enableCors({
    origin: config.get<string>('WEB_ORIGIN') ?? 'http://localhost:3000',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  const port = Number(config.get('PORT')) || 4000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Ellixr API listening on http://localhost:${port}/api/v1`);
}

bootstrap();
