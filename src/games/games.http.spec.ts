import { INestApplication, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UniqueConstraintViolationException } from '@mikro-orm/core';
import request from 'supertest';
import { configureApp } from '../app.setup';
import { DomainError } from '../common/domain.error';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';

/**
 * Testa a camada HTTP de verdade (ValidationPipe, filtro de exceções, status codes),
 * com o service simulado. Não toca em banco.
 */
describe('GamesController (HTTP)', () => {
  let app: INestApplication;

  const service = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    changeStatus: jest.fn(),
    remove: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [GamesController],
      providers: [{ provide: GamesService, useValue: service }],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useLogger(false);
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('validação (400)', () => {
    it('POST /games sem campos obrigatórios', async () => {
      await request(app.getHttpServer()).post('/games').send({ name: 'Space Slots' }).expect(400);
      expect(service.create).not.toHaveBeenCalled();
    });

    it('POST /games com campo desconhecido', async () => {
      await request(app.getHttpServer())
        .post('/games')
        .send({ name: 'Space Slots', genre: 'slot', provider: 'Acme', status: 'inactive' })
        .expect(400);
      expect(service.create).not.toHaveBeenCalled();
    });

    it('GET /games com limit acima do máximo', async () => {
      await request(app.getHttpServer()).get('/games?limit=1000').expect(400);
    });

    it('GET /games/:id com id não numérico', async () => {
      await request(app.getHttpServer()).get('/games/abc').expect(400);
    });

    it('PATCH /games/:id/status com status inválido', async () => {
      await request(app.getHttpServer())
        .patch('/games/1/status')
        .send({ status: 'paused' })
        .expect(400);
      expect(service.changeStatus).not.toHaveBeenCalled();
    });
  });

  describe('caminho feliz', () => {
    it('POST /games responde 201 com o jogo criado', async () => {
      const body = { name: 'Space Slots', genre: 'slot', provider: 'Acme' };
      service.create.mockResolvedValue({ id: 1, ...body, status: 'active' });

      const res = await request(app.getHttpServer()).post('/games').send(body).expect(201);

      expect(service.create).toHaveBeenCalledWith(body);
      expect(res.body).toMatchObject({ id: 1, name: 'Space Slots', status: 'active' });
    });

    it('GET /games converte page e limit para número', async () => {
      service.findAll.mockResolvedValue({ items: [], total: 0, page: 2, limit: 5 });

      await request(app.getHttpServer()).get('/games?page=2&limit=5').expect(200);

      expect(service.findAll).toHaveBeenCalledWith(expect.objectContaining({ page: 2, limit: 5 }));
    });

    it('DELETE /games/:id responde 204', async () => {
      service.remove.mockResolvedValue(undefined);

      await request(app.getHttpServer()).delete('/games/1').expect(204);
    });
  });

  describe('erros de negócio e persistência', () => {
    it('GET /games/:id inexistente responde 404', async () => {
      service.findOne.mockRejectedValue(new NotFoundException('Game 99 not found'));

      const res = await request(app.getHttpServer()).get('/games/99').expect(404);

      expect(res.body.message).toBe('Game 99 not found');
    });

    it('PATCH /games/:id/status para o mesmo status responde 409', async () => {
      service.changeStatus.mockRejectedValue(new DomainError('Game is already active'));

      const res = await request(app.getHttpServer())
        .patch('/games/1/status')
        .send({ status: 'active' })
        .expect(409);

      expect(res.body).toEqual({
        statusCode: 409,
        error: 'Conflict',
        message: 'Game is already active',
      });
    });

    it('POST /games com nome duplicado responde 409', async () => {
      service.create.mockRejectedValue(
        new UniqueConstraintViolationException(new Error('duplicate key') as never),
      );

      const res = await request(app.getHttpServer())
        .post('/games')
        .send({ name: 'Space Slots', genre: 'slot', provider: 'Acme' })
        .expect(409);

      expect(res.body.message).toBe('A game with this name already exists');
    });

    it('erro inesperado NÃO vira 409: responde 500', async () => {
      service.findOne.mockRejectedValue(new Error('boom'));

      await request(app.getHttpServer()).get('/games/1').expect(500);
    });
  });
});
