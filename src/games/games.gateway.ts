import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Game } from './game.entity';

const allowedOrigins = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

@WebSocketGateway({
  cors: { origin: allowedOrigins.length > 0 ? allowedOrigins : false },
})
export class GamesGateway {
  @WebSocketServer()
  server!: Server;

  emitStatusChanged(game: Game): void {
    this.server.emit('game.status.changed', {
      id: game.id,
      name: game.name,
      status: game.status,
    });
  }
}
