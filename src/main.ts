import { NestFactory } from '@nestjs/core';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import * as csurf from 'csurf';
import * as fs from 'fs';
import session from 'express-session';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { Constants } from './constants';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useStaticAssets(join(__dirname, '..', 'public'), { index: false, prefix: '/public/' });
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [`'self'`],
          styleSrc: [`'self'`, `'unsafe-inline'`, 'cdn.jsdelivr.net', 'fonts.googleapis.com'],
          fontSrc: [`'self'`, 'fonts.gstatic.com'],
          imgSrc: [`'self'`, 'data:', 'cdn.jsdelivr.net'],
          scriptSrc: [`'self'`, `https: 'unsafe-inline'`, `cdn.jsdelivr.net`],
        },
      },
    })
  );
  // app.use(cookieParser());
  // app.use(
  //   session({
  //     secret: 'your-secret',
  //     resave: false,
  //     saveUninitialized: false,
  //   })
  // );
  // app.use(csurf());
  app.enableCors({
    origin: ['http://localhost:4200', 'http://localhost:41743', 'https://christoph-baertsch.ch'],
    exposedHeaders: [
      'uuid',
      'position',
      'hash',
      'Accept-Ranges',
      'Content-Range',
      'Content-Length',
      'Content-Type',
    ],
    allowedHeaders: ['Accept-Ranges', 'Content-Range', 'authorization', 'content-type'],
  });
  app.setGlobalPrefix('api');
  await app.listen(Constants.port);
}
bootstrap();
