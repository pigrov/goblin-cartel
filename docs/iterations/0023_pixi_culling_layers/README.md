# 0023 Pixi Culling Layers

## Цель

Подготовить Pixi-сцену к большим шахтам: перестать пересобирать всю сцену при каждом изменении и начать рисовать только видимые ряды шахты.

## Сделано

- Pixi-слои теперь создаются один раз при инициализации сцены и дальше очищаются/перерисовываются отдельно.
- Разделены обновления:
  - `background` - фон сцены;
  - `surface` - поверхность, шахтный вход и тросы;
  - `mine` - блоки шахты;
  - `markers` - метки глубины;
  - `platform` - платформа и гоблины;
  - `effects` - эффекты ударов;
  - `drag` - preview перетаскивания и подсветка целевой ячейки.
- Добавлен `MinePixiViewport` и расчет `MinePixiVisibleRowRange`.
- `mine`, `markers` и `effects` теперь рисуют только видимые ряды с overscan.
- Drag-preview больше не пересобирает шахту и живет в отдельном `drag`-слое.
- Layout сцены мемоизирован в React, а Pixi renderer обновляется отдельным эффектом.
- Unit-тесты расширены проверками visible row range, overscan и clamp по границам шахты.

## Важные решения

- Canvas остается полной высоты контента, поэтому поведение скролла не меняется.
- Culling пока применяется к блокам, меткам и эффектам. Платформа рисуется отдельно, потому что она является overlay-объектом текущего ряда.
- Следующий шаг по производительности - не пересобирать весь видимый диапазон блоков при каждом ударе, а обновлять конкретные блоки по ключам.

## Проверки

- `pnpm --filter @goblin-cartel/game-client typecheck` - passed.
- `pnpm --filter @goblin-cartel/game-client test` - passed.
- `pnpm lint` - passed.
- `pnpm test` - passed.
- `pnpm typecheck` - passed.
- `pnpm build` - passed.
- `pnpm encoding:check` - passed.
- `pnpm --filter @goblin-cartel/backend db:check` - passed.
- Headless Chrome screenshot: canvas rendered, non-empty pixel sample passed.

## Следующее

- Добавить адресное обновление отдельных блоков вместо пересборки видимого диапазона.
- Перевести эффекты ударов и разрушения в полноценные Pixi-анимации.
- Подготовить тестовую шахту на 50+ рядов для проверки culling и FPS.
