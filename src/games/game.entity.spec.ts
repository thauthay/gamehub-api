import { Game, GameStatus } from './game.entity';
import { DomainError } from '../common/domain.error';

describe('Game (regras de domínio)', () => {
  it('nasce ativo', () => {
    expect(new Game().status).toBe(GameStatus.ACTIVE);
  });

  it('muda de ativo para inativo', () => {
    const game = new Game();
    game.changeStatus(GameStatus.INACTIVE);
    expect(game.status).toBe(GameStatus.INACTIVE);
  });

  it('muda de inativo de volta para ativo', () => {
    const game = new Game();
    game.changeStatus(GameStatus.INACTIVE);
    game.changeStatus(GameStatus.ACTIVE);
    expect(game.status).toBe(GameStatus.ACTIVE);
  });

  it('rejeita mudar para o status em que já está e mantém o estado', () => {
    const game = new Game();
    expect(() => game.changeStatus(GameStatus.ACTIVE)).toThrow(DomainError);
    expect(game.status).toBe(GameStatus.ACTIVE);
  });
});
