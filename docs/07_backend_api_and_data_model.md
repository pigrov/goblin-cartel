# Goblin Cartel: backend, API и модель данных

**Версия:** 0.1  
**Дата:** 2026-04-28

## 1. Назначение backend

Backend нужен не для того, чтобы усложнить жизнь. Хотя получится и это. Основные задачи:

- хранить и публиковать версии контента;
- обслуживать админку;
- выдавать клиенту remote config;
- принимать аналитику;
- позже хранить сохранения игроков;
- позже управлять событиями и LiveOps;
- позже интегрировать RuStore SDK-сервисы: платежи, пуши, отзывы, обновления.

## 2. Что можно не делать в самом первом прототипе

Для чистого gameplay prototype можно обойтись без backend:

- конфиги лежат в клиенте;
- сохранения локальные;
- аналитики нет;
- админка отсутствует.

Но как только начинается баланс, генерация уровней и подготовка к публикации, backend и админка становятся почти обязательными.

## 3. Рекомендуемый стек backend

```text
Node.js + TypeScript
Fastify или NestJS
PostgreSQL
Zod / JSON Schema
Drizzle ORM + drizzle-kit
Redis later
```

## 4. Основные домены backend

| Домен | Назначение |
|---|---|
| Auth | пользователи админки, роли |
| Content | ресурсы, блоки, рудники, гоблины, автоматизация |
| Generation | генерация рудников и preview |
| Config | версии конфигов и выдача клиенту |
| Players | игроки и сохранения, после MVP |
| Telemetry | события клиента |
| LiveOps | события, баннеры, remote flags, после MVP |
| RuStore | релизные данные, SDK-интеграции, после MVP |

## 5. Content version

```sql
content_versions
- id uuid
- version text
- status text -- draft / validated / published / archived
- created_by uuid
- created_at timestamptz
- updated_at timestamptz
- published_at timestamptz null
- notes text
```

Правило:

- `draft` можно менять;
- `published` нельзя менять;
- новая правка создаётся через clone.

## 6. Content entity

Можно хранить сущности в отдельных таблицах или как JSONB внутри версии. Для MVP проще:

```sql
content_entities
- id uuid
- content_version_id uuid
- entity_type text
- entity_id text
- data jsonb
- created_at timestamptz
- updated_at timestamptz
```

Плюсы:

- быстро развивать;
- удобно версионировать;
- проще экспортировать JSON.

Минусы:

- меньше строгой SQL-структуры;
- нужны хорошие валидаторы.

## 7. Config manifest

Клиент должен получать манифест:

```json
{
  "activeContentVersion": "0.1.0",
  "minClientVersion": "0.1.0",
  "configUrl": "/config/0.1.0.json",
  "assetBaseUrl": "https://cdn.example.com/goblin-cartel/assets/",
  "featureFlags": {
    "enableTelemetry": true,
    "enableEvents": false,
    "enableProduction": true
  }
}
```

## 8. API для клиента

### MVP

```text
GET /config/manifest
GET /config/:version
POST /telemetry/events
```

### После MVP

```text
POST /players/session/start
GET  /players/:id/save
PUT  /players/:id/save
GET  /liveops/events/active
GET  /liveops/news
POST /payments/rustore/verify
```

## 9. API для админки

```text
POST   /admin/auth/login
GET    /admin/me

GET    /admin/content/versions
POST   /admin/content/versions
POST   /admin/content/versions/:id/clone
POST   /admin/content/versions/:id/validate
POST   /admin/content/versions/:id/simulate
POST   /admin/content/versions/:id/publish

GET    /admin/content/:version/:entityType
POST   /admin/content/:version/:entityType
PUT    /admin/content/:version/:entityType/:entityId
DELETE /admin/content/:version/:entityType/:entityId

POST   /admin/generation/mine-preview
POST   /admin/generation/mine-simulate
```

## 10. Player save

### MVP local save

```json
{
  "saveVersion": 1,
  "contentVersion": "0.1.0",
  "createdAt": 1777370000000,
  "lastSavedAt": 1777370000000,
  "resources": {
    "gold": 1200,
    "stone": 340
  },
  "currentMine": {
    "templateId": "old_well_01",
    "seed": "player-local-001",
    "destroyedBlocks": ["0:0", "0:1"],
    "activeBlock": "1:3"
  },
  "goblins": [
    {
      "goblinId": "gryzz_crooked_tooth",
      "level": 3,
      "assignedTo": "mine"
    }
  ],
  "builtMines": [],
  "automationUnlocked": []
}
```

### Позже server save

```sql
player_saves
- player_id uuid
- save_version int
- content_version text
- data jsonb
- checksum text
- updated_at timestamptz
```

## 11. Telemetry events

### Общий формат

```json
{
  "eventName": "mine_started",
  "clientTime": 1777370000000,
  "sessionId": "session-123",
  "playerId": "local-or-server-id",
  "contentVersion": "0.1.0",
  "clientVersion": "0.1.0",
  "payload": {
    "mineTemplateId": "old_well_01"
  }
}
```

### MVP-события

| Event | Payload |
|---|---|
| `game_start` | clientVersion, platform |
| `mine_started` | mineTemplateId |
| `block_destroyed` | blockTypeId, row, col, rewards |
| `boss_hit_used` | damage, energySpent |
| `vein_found` | veinType |
| `built_mine_started` | builtMineType |
| `built_mine_completed` | builtMineType |
| `resource_collected` | resourceId, amount, source |
| `automation_unlocked` | automationId |
| `goblin_hired` | goblinId |
| `offline_reward_claimed` | offlineMinutes, rewards |

## 12. Админская симуляция

Endpoint:

```text
POST /admin/generation/mine-simulate
```

Body:

```json
{
  "contentVersionId": "draft-123",
  "mineTemplateId": "old_well_01",
  "playerProfile": "new_player",
  "sessionLengthMin": 60,
  "tapRatePerMin": 6,
  "offlineHours": 0
}
```

Response:

```json
{
  "completionTimeMin": 42,
  "resourcesEarned": {
    "gold": 1200,
    "stone": 540
  },
  "manualActions": 32,
  "firstVeinAtMin": 11,
  "firstAutomationAtMin": 37,
  "bottleneckResource": "stone",
  "warnings": [
    "Manual collection count before automation is high: 9"
  ]
}
```

## 13. Валидация контента

Каждый тип сущности должен проходить:

- schema validation;
- ссылочную проверку;
- проверку баланса;
- проверку ассетов;
- проверку локализации.

Примеры ошибок:

```text
BlockType copper_ore references missing icon asset copper_ore_icon
MineTemplate old_well_01 has no guaranteed vein
Automation collector_01 depends on missing node senior_miner
Goblin gryzz_crooked_tooth has abilityId not found
```

## 14. Asset storage

Для MVP ассеты можно хранить в клиенте. Позже:

```text
object storage / CDN
```

В контенте хранить не пути, а `assetId`:

```json
{
  "assetId": "block_copper_ore_v1"
}
```

Манифест ассетов:

```json
{
  "block_copper_ore_v1": {
    "url": "/assets/blocks/copper_ore.png",
    "hash": "abc123",
    "width": 128,
    "height": 128
  }
}
```

## 15. Локализация

Тексты не должны быть в сущностях напрямую. Использовать ключи:

```json
{
  "nameKey": "goblin.gryzz.name",
  "descriptionKey": "goblin.gryzz.description"
}
```

Файлы локализации:

```text
ru.json
en.json later
```

## 16. LiveOps после MVP

LiveOps сущности:

| Сущность | Назначение |
|---|---|
| Event | временное событие |
| EventMineTemplate | временный рудник |
| RewardTrack | награды события |
| Banner | баннер в игре |
| NewsPost | новости |
| PushCampaign | пуши |
| Segment | группа игроков |
| Experiment | A/B тест |

## 17. RuStore-интеграции после MVP

Возможные направления:

- платежи;
- подписки;
- пуши;
- отзывы;
- обновления;
- публикация через RuStore API.

Это нельзя проектировать как “ну потом прикрутим”. Особенно платежи. Магазины приложений и платежные SDK обожают превращать “потом” в “почему ничего не работает в пятницу вечером”.

## 18. Open questions

1. Нужны ли аккаунты игроков в первой публичной версии?
2. Нужна ли web-версия публично или только для тестов?
3. Нужны ли платежи при первом релизе?
4. Где хранить remote config: backend или CDN?
5. Какой уровень аналитики допустим с точки зрения privacy policy?
6. Нужны ли лидерборды, если PvP нет?
7. Нужно ли планировать iOS или только Android/RuStore на ближайший этап?
