# 0007 game client content loop

**Дата:** 2026-04-29
**Статус:** задеплоено

## Цель

Подключить игровой клиент к опубликованному content bundle и сделать первый playable mining loop, который работает на опубликованном контенте или fallback-данных.

## Входной контекст

- Backend уже выдает опубликованный контент через `GET /api/content/current`.
- До первой публикации endpoint возвращает `404`.
- В `packages/content-schemas` есть `starterContentBundle`.
- В `packages/game-core` уже есть генерация шахты и формулы HP.

## Решения

1. Загружать `/api/content/current` при старте game-client.
2. Если опубликованного контента нет, использовать `starterContentBundle`.
3. Логику состояния шахты, удара и наград держать в `game-core`, а не в React.
4. UI рудника показывает HP блоков, награды, ресурсы и текущий источник контента.

## Сделано

- В `packages/game-core` добавлен `mining-session`:
  - создание игровой сессии из `GeneratedMine` и block types;
  - HP блоков через существующую формулу `calculateBlockHp`;
  - удар по блоку;
  - разрушение блока;
  - начисление наград из `rewardTable`;
  - защита от повторного начисления наград за уже разрушенный блок.
- Добавлены unit tests для mining session.
- `apps/game-client` теперь зависит от `@goblin-cartel/content-schemas`.
- Game-client при старте запрашивает `/api/content/current`.
- Если опубликованного контента нет или запрос не прошел, используется `starterContentBundle`.
- Рудник генерируется через `generateMine` из первого `mineTemplate`.
- UI рудника стал интерактивным:
  - клик по блоку наносит урон;
  - кнопка `Удар босса` бьет активный блок;
  - HP блока уменьшается;
  - разрушенный блок скрывается;
  - награды начисляются в верхнюю панель ресурсов;
  - отображается последняя награда и количество разрушенных блоков;
  - есть сброс текущей шахты.
- В UI показан источник контента: опубликованная версия или fallback.
- Коммит `9c04182` задеплоен через GitHub Actions.
- Production game-client отдает новый JS-бандл с mining loop.
- Production `GET /api/content/current` возвращает опубликованный контент.

## Измененные файлы

- `packages/game-core/src/mining-session.ts`
- `packages/game-core/src/mining-session.test.ts`
- `packages/game-core/src/index.ts`
- `apps/game-client/package.json`
- `apps/game-client/src/ui/App.tsx`
- `apps/game-client/src/styles.css`
- `pnpm-lock.yaml`
- `docs/iterations/README.md`
- `docs/iterations/0007_game_client_content_loop/README.md`

## Проверки

Запущено:

```text
pnpm --filter @goblin-cartel/game-core test
pnpm --filter @goblin-cartel/game-core typecheck
pnpm --filter @goblin-cartel/game-client typecheck
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
https://goblin-cartel.murph.ru/api/content/current -> published
game-client bundle содержит mining loop
```

## UTF-8 и текст

`pnpm encoding:check` пройден.

## CI/CD и миграции

Миграции не нужны.

## Открытые вопросы

Нет.
