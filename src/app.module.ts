import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import config from './mikro-orm.config';
import { GamesModule } from './games/games.module';

@Module({
  imports: [MikroOrmModule.forRoot(config), GamesModule],
})
export class AppModule {}
