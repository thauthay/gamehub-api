import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@mikro-orm/nestjs';
import { EntityManager } from '@mikro-orm/postgresql';
import { GamesService } from './games.service';
import { GamesGateway } from './games.gateway';
import { Game, GameStatus } from './game.entity';
import { DomainError } from '../common/domain.error';

describe('GamesService', () => {
  let service: GamesService;

  const repo = { findOne: jest.fn(), findAndCount: jest.fn(), create: jest.fn() };
  const em = { persist: jest.fn(), flush: jest.fn(), assign: jest.fn(), remove: jest.fn() };
  const gateway = { emitStatusChanged: jest.fn() };

  const makeGame = (status = GameStatus.ACTIVE) =>
    Object.assign(new Game(), {
      id: 1,
      name: 'Space Slots',
      genre: 'slot',
      provider: 'Acme',
      status,
    });

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        GamesService,
        { provide: getRepositoryToken(Game), useValue: repo },
        { provide: EntityManager, useValue: em },
        { provide: GamesGateway, useValue: gateway },
      ],
    }).compile();
    service = moduleRef.get(GamesService);
  });

  describe('create', () => {
    it('persiste e salva o jogo', async () => {
      const game = makeGame();
      repo.create.mockReturnValue(game);

      const result = await service.create({ name: 'Space Slots', genre: 'slot', provider: 'Acme' });

      expect(em.persist).toHaveBeenCalledWith(game);
      expect(em.flush).toHaveBeenCalled();
      expect(result).toBe(game);
    });

    it('propaga o erro quando a persistência falha', async () => {
      repo.create.mockReturnValue(makeGame());
      em.flush.mockRejectedValue(new Error('db down'));

      await expect(
        service.create({ name: 'Space Slots', genre: 'slot', provider: 'Acme' }),
      ).rejects.toThrow('db down');
    });
  });

  describe('findAll', () => {
    it('aplica filtro de status e paginação', async () => {
      repo.findAndCount.mockResolvedValue([[makeGame()], 1]);

      const result = await service.findAll({ status: GameStatus.ACTIVE, page: 2, limit: 10 });

      expect(repo.findAndCount).toHaveBeenCalledWith(
        { status: GameStatus.ACTIVE },
        expect.objectContaining({ limit: 10, offset: 10 }),
      );
      expect(result).toEqual({ items: [expect.any(Game)], total: 1, page: 2, limit: 10 });
    });

    it('filtra por provedor', async () => {
      repo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ provider: 'Acme', page: 1, limit: 20 });

      expect(repo.findAndCount).toHaveBeenCalledWith(
        { provider: 'Acme' },
        expect.objectContaining({ limit: 20, offset: 0 }),
      );
    });

    it('sem filtros, consulta tudo', async () => {
      repo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ page: 1, limit: 20 });

      expect(repo.findAndCount).toHaveBeenCalledWith({}, expect.any(Object));
    });
  });

  describe('findOne', () => {
    it('retorna o jogo quando existe', async () => {
      const game = makeGame();
      repo.findOne.mockResolvedValue(game);

      await expect(service.findOne(1)).resolves.toBe(game);
    });

    it('lança NotFoundException quando o jogo não existe', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('aplica as alterações e salva', async () => {
      const game = makeGame();
      repo.findOne.mockResolvedValue(game);

      const result = await service.update(1, { genre: 'crash' });

      expect(em.assign).toHaveBeenCalledWith(game, { genre: 'crash' });
      expect(em.flush).toHaveBeenCalled();
      expect(result).toBe(game);
    });

    it('lança NotFoundException e não salva quando o jogo não existe', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.update(99, { genre: 'crash' })).rejects.toThrow(NotFoundException);
      expect(em.flush).not.toHaveBeenCalled();
    });
  });

  describe('changeStatus', () => {
    it('salva e emite o evento de WebSocket', async () => {
      const game = makeGame(GameStatus.ACTIVE);
      repo.findOne.mockResolvedValue(game);

      await service.changeStatus(1, GameStatus.INACTIVE);

      expect(game.status).toBe(GameStatus.INACTIVE);
      expect(em.flush).toHaveBeenCalled();
      expect(gateway.emitStatusChanged).toHaveBeenCalledWith(game);
    });

    it('com o mesmo status, lança erro e NÃO emite evento', async () => {
      repo.findOne.mockResolvedValue(makeGame(GameStatus.ACTIVE));

      await expect(service.changeStatus(1, GameStatus.ACTIVE)).rejects.toThrow(DomainError);
      expect(gateway.emitStatusChanged).not.toHaveBeenCalled();
    });

    it('se o flush falhar, NÃO emite evento', async () => {
      repo.findOne.mockResolvedValue(makeGame(GameStatus.ACTIVE));
      em.flush.mockRejectedValue(new Error('db down'));

      await expect(service.changeStatus(1, GameStatus.INACTIVE)).rejects.toThrow('db down');
      expect(gateway.emitStatusChanged).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('remove o jogo existente', async () => {
      const game = makeGame();
      repo.findOne.mockResolvedValue(game);

      await service.remove(1);

      expect(em.remove).toHaveBeenCalledWith(game);
      expect(em.flush).toHaveBeenCalled();
    });

    it('lança NotFoundException e não remove quando o jogo não existe', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.remove(99)).rejects.toThrow(NotFoundException);
      expect(em.remove).not.toHaveBeenCalled();
    });
  });
});
