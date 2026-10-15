import { Migration } from '@mikro-orm/migrations';

export class Migration20261013000000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `create table "game" (
        "id" serial primary key,
        "name" varchar(255) not null,
        "genre" varchar(255) not null,
        "provider" varchar(255) not null,
        "status" text check ("status" in ('active', 'inactive')) not null default 'active',
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null
      );`,
    );
    this.addSql(`alter table "game" add constraint "game_name_unique" unique ("name");`);
    this.addSql(`create index "game_status_index" on "game" ("status");`);
  }

  async down(): Promise<void> {
    this.addSql(`drop table if exists "game" cascade;`);
  }
}
