import { IsEnum } from 'class-validator';
import { GameStatus } from '../game.entity';

export class ChangeStatusDto {
  @IsEnum(GameStatus)
  status!: GameStatus;
}
