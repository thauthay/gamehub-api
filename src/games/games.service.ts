import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityManager } from '@mikro-orm/postgresql';
import { EntityRepository, FilterQuery } from '@mikro-orm/core';
import { Game, GameStatus } from './game.entity';
import { CreateGameDto } from './dto/create-game.dto';
import { UpdateGameDto } from './dto/update-game.dto';
import { ListGamesQueryDto } from './dto/list-games.query.dto';
import { GamesGateway } from './games.gateway';

@Injectable()
export class GamesService {
  constructor(
    @InjectRepository(Game) private readonly repo: EntityRepository<Game>,
    private readonly em: EntityManager,
    private readonly gateway: GamesGateway,
  ) {}

  async create(dto: CreateGameDto): Promise<Game> {
    const game = this.repo.create(dto);
    this.em.persist(game);
    await this.em.flush();
    return game;
  }

  async findAll(query: ListGamesQueryDto) {
    const where: FilterQuery<Game> = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.provider ? { provider: query.provider } : {}),
    };

    const [items, total] = await this.repo.findAndCount(where, {
      orderBy: { createdAt: 'DESC' },
      limit: query.limit,
      offset: (query.page - 1) * query.limit,
    });
    return { items, total, page: query.page, limit: query.limit };
  }

  async findOne(id: number): Promise<Game> {
    const game = await this.repo.findOne({ id });
    if (!game) throw new NotFoundException(`Game ${id} not found`);
    return game;
  }

  async update(id: number, dto: UpdateGameDto): Promise<Game> {
    const game = await this.findOne(id);
    this.em.assign(game, dto);
    await this.em.flush();
    return game;
  }

  async changeStatus(id: number, status: GameStatus): Promise<Game> {
    const game = await this.findOne(id);
    game.changeStatus(status);
    await this.em.flush();
    this.gateway.emitStatusChanged(game);
    return game;
  }

  async remove(id: number): Promise<void> {
    const game = await this.findOne(id);
    this.em.remove(game);
    await this.em.flush();
  }
}
