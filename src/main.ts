import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { MikroORM } from '@mikro-orm/postgresql';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  app.enableShutdownHooks();

  if (process.env.RUN_MIGRATIONS !== 'false') {
    await app.get(MikroORM).getMigrator().up();
  }

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
