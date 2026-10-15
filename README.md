# GameHub API

API REST para gerenciar um catálogo de jogos e controlar a disponibilidade (ativo/inativo) de cada um. Emite um evento em tempo real via WebSocket quando o status de um jogo muda.

**Stack:** Node.js, TypeScript, NestJS, MikroORM, PostgreSQL, Docker, Jest, Socket.IO.

## Como rodar

Pré-requisitos: Node 20+ e Docker.

```bash
cp .env.example .env     # valores de desenvolvimento local
npm install

# Opção A: API local + banco no Docker
docker compose up -d db
npm run start:dev

# Opção B: tudo no Docker
docker compose up --build
```

A API sobe em `http://localhost:3000`. Por padrão as migrações são aplicadas na inicialização (veja [Migrações](#migrações)).

```bash
npm test            # testes (não precisam de banco)
npm run test:cov    # com cobertura
npm run typecheck   # tsc --noEmit
npm run lint
npm run format
```

### Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Conexão com o PostgreSQL. Obrigatórias: a API não sobe sem elas. |
| `DB_PORT` | Padrão `5432`. |
| `PORT` | Padrão `3000`. |
| `CORS_ORIGINS` | Origens de navegador aceitas no WebSocket, separadas por vírgula. Sem valor, nenhuma. |
| `RUN_MIGRATIONS` | `false` desliga a migração automática no boot. Padrão: ligada. |

> As credenciais do `.env.example` e do `docker-compose.yml` são só para desenvolvimento local. O banco fica acessível apenas em `127.0.0.1`.

## Endpoints

| Método | Rota | Descrição |
|---|---|---|
| POST | `/games` | Cria um jogo |
| GET | `/games?status=&provider=&page=&limit=` | Lista com filtros e paginação (`limit` máx. 100, padrão 20) |
| GET | `/games/:id` | Busca um jogo |
| PATCH | `/games/:id` | Atualiza nome, gênero ou provedor |
| PATCH | `/games/:id/status` | Ativa/desativa (regra de domínio) |
| DELETE | `/games/:id` | Remove (204) |

```bash
curl -X POST localhost:3000/games -H 'Content-Type: application/json' \
  -d '{"name":"Space Slots","genre":"slot","provider":"Acme"}'

curl -X PATCH localhost:3000/games/1/status -H 'Content-Type: application/json' \
  -d '{"status":"inactive"}'
```

Resposta da listagem:

```json
{ "items": [ { "id": 1, "name": "Space Slots", "status": "active" } ], "total": 1, "page": 1, "limit": 20 }
```

### Erros

| Status | Quando | Exemplo de corpo |
|---|---|---|
| 400 | Validação: campo ausente, tipo errado, campo desconhecido, `limit` > 100, id não numérico | `{"statusCode":400,"message":["name should not be empty"],"error":"Bad Request"}` |
| 404 | Jogo inexistente | `{"statusCode":404,"message":"Game 99 not found","error":"Not Found"}` |
| 409 | Nome duplicado, ou mudança para o status em que o jogo já está | `{"statusCode":409,"error":"Conflict","message":"Game is already inactive"}` |
| 500 | Qualquer erro inesperado (nunca é mascarado como 409) | |

**WebSocket:** conecte um cliente Socket.IO em `http://localhost:3000` e escute `game.status.changed`, que traz `{ id, name, status }`.

## Arquitetura e decisões

```
Requisição → Controller → Service → Entidade → MikroORM → PostgreSQL
                             └──→ Gateway (WebSocket)
```

- **Controller** só traduz HTTP; **Service** orquestra; **Entidade** guarda a regra de negócio.
- **Regra de domínio na entidade:** `Game.changeStatus()` impede "mudar" para o status atual. Por isso o status não é editável no `PATCH /games/:id` e tem endpoint próprio.
- **Validação** com DTOs + `ValidationPipe` global (`whitelist` e `forbidNonWhitelisted`). A configuração fica em `app.setup.ts` para a aplicação e os testes HTTP usarem exatamente a mesma.
- **Erros centralizados:** o exception filter só captura `DomainError` e violação de unicidade (409). Jogo inexistente vira 404 pelo próprio Nest. O restante cai no handler padrão (500).
- **Evento só após persistir:** o WebSocket é emitido depois do `flush`, para nunca avisar algo que não foi salvo. Há teste cobrindo o caso em que o `flush` falha.
- **Sem credencial padrão no código:** a conexão com o banco exige variáveis de ambiente.
- **Docker:** build em dois estágios, imagem final só com dependências de produção, rodando como usuário `node`.

### Migrações

Por padrão a API aplica as migrações pendentes ao subir, o que é prático para desenvolvimento. Com mais de uma instância, as duas tentariam migrar ao mesmo tempo. Nesse cenário, use `RUN_MIGRATIONS=false` e rode `npm run migration:up` como etapa separada do deploy.

### Testes

- **Entidade:** regra de troca de status isolada.
- **Service:** com repositório, `EntityManager` e gateway simulados; cobre filtros, paginação, 404, falha de persistência e a garantia de não emitir evento quando algo dá errado.
- **HTTP:** `supertest` sobre o controller real, com `ValidationPipe` e filtro reais e o service simulado; cobre 400, 404, 409 e a garantia de que erro inesperado vira 500.
- **Não coberto:** consultas contra um PostgreSQL real e a constraint de unicidade no banco.

## Limitações conhecidas

- Sem autenticação e autorização, tanto no HTTP quanto no WebSocket. O evento é enviado a todos os clientes conectados.
- Duas mudanças de status simultâneas no mesmo jogo não usam lock otimista: a última a gravar vence.
- Nomes únicos diferenciam maiúsculas de minúsculas (`Space Slots` e `space slots` coexistem).

## Próximos passos

- Testes e2e contra um PostgreSQL real (Testcontainers), cobrindo a constraint de unicidade e as migrações.
- Autenticação e autorização no HTTP e no WebSocket.
- Lock otimista na mudança de status (coluna de versão) para evitar sobrescrita em requisições simultâneas.
- Unicidade de nome sem diferenciar maiúsculas de minúsculas (índice em `lower(name)`).
