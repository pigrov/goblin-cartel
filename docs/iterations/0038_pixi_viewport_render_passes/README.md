# Итерация 0038: Pixi viewport и render passes

## Цель

Продолжить дробление Pixi-сцены: вынести из `MinePixiScene.tsx` привязку viewport/resize и повторяющиеся Pixi render effects, чтобы React-компонент оставался тонким lifecycle-слоем.

## Сделано

- Добавлен `minePixiViewport.ts`:
  - расчет текущего viewport из playfield host;
  - биндинг `ResizeObserver` и scroll-события;
  - resize Pixi renderer/canvas/hit area по текущему layout.
- Добавлен `minePixiRenderPasses.ts`, который собирает render passes для background, surface, mine/depth, hit effects, platform и drag preview.
- `MinePixiScene.tsx` теперь вызывает профильные render-функции вместо прямой очистки слоев и ручной отрисовки внутри effects.
- Добавлены unit tests для viewport-расчета и resize renderer.

## Проверки

- `pnpm --filter @goblin-cartel/game-client typecheck` - пройдено.
- `pnpm --filter @goblin-cartel/game-client test` - пройдено.
- `pnpm lint` - пройдено.
- `pnpm typecheck` - пройдено.
- `pnpm test` - пройдено.
- `pnpm build` - пройдено.
- `pnpm encoding:check` - пройдено.
- `pnpm --filter @goblin-cartel/backend db:check` - пройдено.
- `git diff --check` - пройдено.
- Локальная визуальная проверка в Chrome 390x844 - Pixi canvas, поверхность, шахта и нижний energy overlay рендерятся после выноса viewport/render-pass логики.

## Открытые вопросы

- Нет.
