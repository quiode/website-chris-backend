import { NestFactory } from '@nestjs/core';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import * as csurf from 'csurf';
import * as fs from 'fs';
import session from 'express-session';

const httpsOptions = {
  key: fs.readFileSync('./secrets/private-key.pem'),
  cert: fs.readFileSync('./secrets/public-certificate.pem'),
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { httpsOptions });
  app.use(helmet());
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
    exposedHeaders: ['uuid', 'position', 'hash'],
  });
  app.setGlobalPrefix('api');
  await app.listen(3000);
}
bootstrap();
