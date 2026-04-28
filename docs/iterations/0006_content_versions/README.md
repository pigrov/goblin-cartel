# 0006 content versions

**Дата:** 2026-04-29
**Статус:** задеплоено

## Цель

Сделать первый рабочий контур контента: версии, JSON bundle, валидацию, публикацию и выдачу опубликованного конфига клиенту.

## Входной контекст

- Таблицы `content_versions` и `content_entities` уже есть в БД.
- Контент хранится как JSONB-сущности внутри версии.
- Для MVP нужны ресурсы, типы блоков и шаблоны шахт.
- Админка уже имеет auth и раздел credentials.
- Доступ к изменению контента должен быть закрыт до установки пароля.

## Решения

1. Хранить контент в bundle-формате `{ resources, blockTypes, mineTemplates }`.
2. В БД раскладывать bundle в `content_entities` по entity type.
3. Не добавлять новую миграцию в этой итерации: существующие таблицы покрывают MVP.
4. Публикация валидирует bundle и архивирует ранее опубликованные версии.
5. Клиент получает опубликованный bundle через `GET /api/content/current`.

## Сделано

- Расширен `packages/content-schemas`:
  - добавлен `contentBundleSchema`;
  - добавлен стартовый `starterContentBundle`;
  - добавлена `validateContentBundle` со ссылочными проверками.
- В стартовый bundle добавлены ресурсы, типы блоков и шаблон первой шахты.
- Добавлен backend content service:
  - список версий;
  - создание draft-версии;
  - чтение версии;
  - замена bundle-контента;
  - валидация;
  - публикация;
  - получение текущего опубликованного контента.
- Добавлен Drizzle store для `content_versions` и `content_entities`.
- Добавлены admin routes:
  - `GET /admin/content/versions`
  - `POST /admin/content/versions`
  - `GET /admin/content/versions/:id`
  - `PUT /admin/content/versions/:id/content`
  - `POST /admin/content/versions/:id/validate`
  - `POST /admin/content/versions/:id/publish`
- Добавлен public route `GET /content/current`, доступный снаружи как `/api/content/current`.
- Админские content routes требуют валидную сессию и установленный пароль.
- Публикация валидирует bundle и архивирует ранее опубликованные версии.
- Все админские операции пишут audit log.
- Admin UI получил раздел `Content`:
  - создание draft-версии;
  - список версий;
  - JSON-редактор bundle;
  - `Save`, `Validate`, `Publish`;
  - вывод ошибок валидации.
- Добавлены unit tests для schemas, content service и content routes.
- Коммит `ed789ee` задеплоен через GitHub Actions.
- Production endpoint `GET /api/content/current` возвращает `404`, пока первая версия не создана и не опубликована через админку.

## Измененные файлы

- `packages/content-schemas/src/index.ts`
- `packages/content-schemas/src/index.test.ts`
- `apps/backend/src/admin/content.ts`
- `apps/backend/src/admin/content-store.ts`
- `apps/backend/src/admin/content-routes.ts`
- `apps/backend/src/admin/content.test.ts`
- `apps/backend/src/admin/content-routes.test.ts`
- `apps/backend/src/admin/http-auth.ts`
- `apps/backend/src/server.ts`
- `apps/admin/src/ui/App.tsx`
- `apps/admin/src/styles.css`
- `docs/iterations/README.md`
- `docs/iterations/0006_content_versions/README.md`

## Проверки

Запущено:

```text
pnpm --filter @goblin-cartel/content-schemas test
pnpm --filter @goblin-cartel/content-schemas typecheck
pnpm --filter @goblin-cartel/backend typecheck
pnpm --filter @goblin-cartel/backend test
pnpm --filter @goblin-cartel/admin typecheck
pnpm lint
pnpm test
pnpm typecheck
pnpm encoding:check
pnpm --filter @goblin-cartel/backend db:check
pnpm build
```

Результат: пройдено.

CI/CD:

```text
GitHub Actions CI: success
GitHub Actions deploy: success
```

Production smoke:

```text
https://goblin-cartel.murph.ru/ -> 200
https://goblin-cartel.murph.ru/admin/ -> 200
https://goblin-cartel.murph.ru/api/health -> 200
https://goblin-cartel.murph.ru/api/content/current без опубликованной версии -> 404
```

## UTF-8 и текст

`pnpm encoding:check` пройден.

## CI/CD и миграции

Новая миграция не нужна.

## Открытые вопросы

Нет.
