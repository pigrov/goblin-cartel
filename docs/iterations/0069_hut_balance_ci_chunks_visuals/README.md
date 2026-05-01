# 0069 Hut Balance CI Chunks Visuals

## Цель

Закрыть технические предупреждения релиза и улучшить экран Хижины: убрать warning Vite по большому client chunk, подготовить GitHub Actions к Node 24, сгладить баланс уровней Хижины и добавить визуальное состояние Хижины по уровню.

## Сделано

- `actions/checkout` и `actions/setup-node` обновлены до `v5` в `ci.yml` и `deploy.yml`.
- Pixi-сцена переведена на `React.lazy`, чтобы тяжелая сцена не попадала в стартовый chunk приложения.
- В game-client Vite config добавлены Rolldown chunk groups для React, Pixi, иконок и прочего vendor-кода.
- Starter content Хижины перебалансирован:
  - уровень 2: лимит 3, дешевле вход, открывает строителей после первого рудника;
  - уровень 3: лимит 5, открывает сборщиков после первой построенной шахты;
  - уровень 4: лимит 8, открывает бригадира после второй шахты и второго рудника.
- В карточку прогресса Хижины добавлен компактный визуал, который меняется по уровню.
- Добавлен helper `createGoblinHutVisualStage` и unit-test на маппинг уровней в визуальные стадии.

## Проверки

Выполнены:

- `pnpm --filter @goblin-cartel/game-client typecheck`
- `pnpm --filter @goblin-cartel/content-schemas test`
- `pnpm --filter @goblin-cartel/game-client test -- goblinHutClientState.test.ts`
- `pnpm --filter @goblin-cartel/game-client build`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm encoding:check`
- `git diff --check`
- `pnpm --filter @goblin-cartel/backend db:check`

## Открытые вопросы

- Визуал Хижины пока CSS-процедурный. Когда появятся ассеты, нужно перевести его на content asset id.
