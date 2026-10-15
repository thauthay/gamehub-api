import 'dotenv/config';
import { defineConfig } from '@mikro-orm/postgresql';
import { Migrator } from '@mikro-orm/migrations';
import { Game } from './games/game.entity';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variável de ambiente ${name} não definida (veja .env.example)`);
  return value;
}

export default defineConfig({
  entities: [Game],
  host: requireEnv('DB_HOST'),
  port: Number(process.env.DB_PORT ?? 5432),
  user: requireEnv('DB_USER'),
  password: requireEnv('DB_PASSWORD'),
  dbName: requireEnv('DB_NAME'),
  extensions: [Migrator],
  migrations: {
    path: 'dist/migrations',
    pathTs: 'src/migrations',
  },
});
