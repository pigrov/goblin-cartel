# 0033 Pixi Surface Platform Blocks

## Цель

Продолжить дробление `MinePixiScene.tsx` по зонам ответственности и улучшить верх шахты с прозрачной игровой шапкой.

## Сделано

- Вынесена отрисовка блоков в `minePixiBlocks.ts`.
- Вынесена отрисовка платформы и drag preview в `minePixiPlatform.ts`.
- Вынесена поверхность шахты и верхний подъемный механизм в `minePixiSurface.ts`.
- Убран темный коричневый rounded-прямоугольник над шахтой.
- Верх шахты стал светлее: небо, солнце, облака, птицы, поляна, деревья и более читаемый верхний механизм.
- Шапка ресурсов стала прозрачным overlay поверх игры.
- Ресурсные блоки и burger-кнопка получили стеклянный стиль.
- Игровой контент теперь скроллится под шапкой, а видимые scrollbars скрыты.
- Добавлен unit-тест для вынесенного block module.

## Проверки

- `pnpm --filter @goblin-cartel/game-client typecheck`
- `pnpm --filter @goblin-cartel/game-client test`
- `pnpm lint`
- Визуальная проверка Pixi canvas на мобильном viewport:
  - поверхность светлая и без старого темного входа;
  - resource bar абсолютный overlay;
  - playfield начинается с `top: 0`;
  - `scrollbar-width: none`.

## Открытые вопросы

- Следующим шагом стоит вынести depth markers/background/input из `MinePixiScene.tsx`.
- После этого можно перейти к отдельному визуальному сценарию offline final hit.
