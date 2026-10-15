import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Game } from './game.entity';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';
import { GamesGateway } from './games.gateway';

@Module({
  imports: [MikroOrmModule.forFeature([Game])],
  controllers: [GamesController],
  providers: [GamesService, GamesGateway],
})
export class GamesModule {}
