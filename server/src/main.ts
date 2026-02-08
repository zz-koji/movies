import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { ZodExceptionFilter } from './filters/zod-exception.filter';
import { DatabaseExceptionFilter } from './filters/database-exception.filter';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.ORIGIN_URL,
    credentials: true,
  });
  app.useGlobalFilters(new DatabaseExceptionFilter(), new ZodExceptionFilter(), new HttpExceptionFilter());
  app.use(cookieParser());
  await app.listen(process.env.PORT ?? 3000);

  process.on('SIGTERM', async () => {
    await app.close();
  });

  process.on('SIGINT', async () => {
    await app.close();
  });
}
bootstrap();
