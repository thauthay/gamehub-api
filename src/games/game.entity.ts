import { Entity, Enum, OptionalProps, PrimaryKey, Property } from '@mikro-orm/core';
import { DomainError } from '../common/domain.error';

export enum GameStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity()
export class Game {
  // Campos com valor inicial: o MikroORM não deve exigi-los no create()
  [OptionalProps]?: 'status' | 'createdAt' | 'updatedAt';

  @PrimaryKey()
  id!: number;

  @Property({ unique: true })
  name!: string;

  @Property()
  genre!: string;

  @Property()
  provider!: string;

  @Enum(() => GameStatus)
  status: GameStatus = GameStatus.ACTIVE;

  @Property()
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();

  changeStatus(next: GameStatus): void {
    if (this.status === next) {
      throw new DomainError(`Game is already ${next}`);
    }
    this.status = next;
  }
}
