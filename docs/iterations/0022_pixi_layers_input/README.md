# 0022 Pixi Layers Input

## Цель

Укрепить Pixi-слой после первого переноса шахты: отделить математику сцены от рендера и привести управление гоблинами к более явной модели.

## Сделано

- Вынесены layout и hit-test функции в `minePixiLayout.ts`.
- Добавлены чистые функции:
  - `createMinePixiLayout`
  - `pointToMineCell`
  - `pointToPlatformCell`
  - `cellKey`
- `MinePixiScene` теперь собирает отдельные Pixi-слои:
  - background
  - surface
  - mine
  - markers
  - platform
  - effects
- Перетаскивание гоблина переведено с простого `draggingGoblinId` на `DragState`: id гоблина, текущая точка указателя и валидная target-cell.
- Добавлен drag-preview гоблина под указателем.
- Подсветка ячейки платформы теперь показывает конкретную валидную цель.
- Добавлены unit-тесты для расчета layout и попаданий в ячейки шахты/платформы.
- `apps/game-client` теперь участвует в общем `pnpm test`.

## Важные решения

- Hit-test остается чистой логикой без Pixi-зависимостей. Это нужно для будущих тестов culling, drag/drop и кликов босса.
- Слои пока пересобираются целиком при изменении сцены. Следующая оптимизация - разделить статичный рендер и drag/effects обновления.
- Игровые правила по-прежнему остаются за `game-core` и `App`, Pixi отвечает только за визуал и input.

## Проверки

- `pnpm --filter @goblin-cartel/game-client typecheck` - passed.
- `pnpm --filter @goblin-cartel/game-client test` - passed.
- `pnpm --filter @goblin-cartel/game-client build` - passed.
- `pnpm lint` - passed.
- `pnpm test` - passed.
- `pnpm typecheck` - passed.
- `pnpm build` - passed.
- `pnpm encoding:check` - passed.
- `pnpm --filter @goblin-cartel/backend db:check` - passed.
- Headless Chrome screenshot: canvas rendered, non-empty pixel sample passed.

## Следующее

- Разделить пересборку сцены: статичные блоки отдельно, drag-preview и эффекты отдельно.
- Сделать Pixi-анимации удара босса, удара гоблина и разрушения блока.
- Подготовить culling для шахты на 50+ рядов.
