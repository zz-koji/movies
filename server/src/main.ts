import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { ZodExceptionFilter } from './filters/zod-exception.filter';
import { DatabaseExceptionFilter } from './filters/database-exception.filter';

async function bootstrap() {
	const app = await NestFactory.create(AppModule);
	app.enableCors()
	app.useGlobalFilters(new DatabaseExceptionFilter(), new ZodExceptionFilter(), new HttpExceptionFilter());
	await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
